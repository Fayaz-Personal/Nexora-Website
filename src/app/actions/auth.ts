'use server';

import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '@/db';
import { sendOtpEmail, sendPasswordResetEmail } from './email';
import { logSecurityEvent } from '@/lib/audit';

const JWT_SECRET = process.env.JWT_SECRET || 'nexora-super-secret-key-987654321';
const COOKIE_NAME = 'nexora_session';

export interface UserSession {
  id: number;
  email: string;
  role: 'student' | 'uni_admin' | 'platform_admin' | 'business';
  name?: string;
  profileId?: number;
}

export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as UserSession;
    
    // Fetch profile id if user is student
    if (decoded.role === 'student') {
      const profileRes = await query(
        'SELECT id, name FROM student_profiles WHERE user_id = $1',
        [decoded.id]
      );
      if (profileRes.rows.length > 0) {
        decoded.profileId = profileRes.rows[0].id;
        decoded.name = profileRes.rows[0].name;
      }
    } else {
      decoded.name = decoded.email.split('@')[0];
    }
    
    return decoded;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function loginUser(prevState: any, formData: FormData) {
  let email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    await logSecurityEvent('failed_login', null, 'Login attempt with missing email or password');
    return { error: 'Email and password are required.' };
  }

  email = email.trim().toLowerCase();
  console.log(`[Auth] Login attempt for: "${email}"`);

  try {
    const userRes = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      console.log(`[Auth] User not found: "${email}"`);
      await logSecurityEvent('failed_login', null, `Failed login: User not found for email ${email}`);
      return { error: 'Invalid email or password.' };
    }

    const user = userRes.rows[0];
    const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordCorrect) {
      console.log(`[Auth] Password incorrect for: "${email}"`);
      await logSecurityEvent('failed_login', user.id, `Failed login: Incorrect password for user ${email}`);
      return { error: 'Invalid email or password.' };
    }

    // Check if suspended
    if (user.is_active === false) {
      console.log(`[Auth] Login blocked for suspended user: "${email}"`);
      await logSecurityEvent('failed_login', user.id, `Failed login: Blocked suspended user account ${email}`);
      return { error: 'Your account has been suspended by the platform administrator.' };
    }

    console.log(`[Auth] Login successful for: "${email}" (role: ${user.role})`);

    // Check verification status
    if (!user.is_verified) {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      await query('UPDATE users SET otp_code = $1 WHERE id = $2', [otpCode, user.id]);
      await sendOtpEmail(user.email, otpCode);
      await logSecurityEvent('login_attempt', user.id, `Login attempt: OTP verification sent to ${email}`);
      return {
        error: 'Your email is not verified. Please verify your identity.',
        unverified: true,
        email: user.email
      };
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    await logSecurityEvent('login_attempt', user.id, `User ${email} successfully logged in`);

    let onboardingCompleted = false;
    if (user.role === 'student') {
      const profileRes = await query('SELECT onboarding_completed FROM student_profiles WHERE user_id = $1', [user.id]);
      if (profileRes.rows.length > 0) {
        onboardingCompleted = !!profileRes.rows[0].onboarding_completed;
      }
    }

    return { success: true, role: user.role, onboardingCompleted };
  } catch (error: any) {
    console.error('Login error:', error);
    return { error: 'An error occurred during login. Please try again.' };
  }
}

export async function registerUser(prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as 'student' | 'uni_admin' | 'platform_admin' | 'business';

  if (!email || !password || !role || (role === 'student' && !name)) {
    return { error: 'All fields are required.' };
  }

  try {
    // Check if user already exists
    const checkRes = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (checkRes.rows.length > 0) {
      return { error: 'Email already registered.' };
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    if (role === 'student') {
      // Generate Verification OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Send the email first
      await sendOtpEmail(email, otpCode);

      // Sign a temporary token containing all the registration details (expires in 15 mins)
      const pendingToken = jwt.sign(
        { name, email, passwordHash, role, otpCode },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      return { success: true, needsVerification: true, email, pendingToken };
    } else {
      // Direct registration for university and business partners (no OTP!)
      await query(
        'INSERT INTO users (email, password_hash, role, is_verified) VALUES ($1, $2, $3, TRUE)',
        [email, passwordHash, role]
      );

      return { success: true, needsVerification: false };
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    return { error: 'An error occurred during registration. Please try again.' };
  }
}

export async function verifyAndRegisterUser(pendingToken: string, otp: string) {
  try {
    if (!otp || typeof otp !== 'string' || otp.trim().length !== 6) {
      return { error: 'Invalid verification OTP. Please try again.' };
    }

    // Decode and verify the pending registration token
    let payload: any;
    try {
      payload = jwt.verify(pendingToken, JWT_SECRET);
    } catch (err) {
      return { error: 'Verification session expired. Please register again.' };
    }

    const { name, email, passwordHash, role, otpCode } = payload;

    if (otpCode !== otp) {
      return { error: 'Invalid verification OTP. Please try again.' };
    }

    // Check if the user was registered in the meantime
    const checkRes = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (checkRes.rows.length > 0) {
      return { error: 'Email already registered.' };
    }

    // Now execute SQL insert into users (is_verified = TRUE)
    const userRes = await query(
      'INSERT INTO users (email, password_hash, role, is_verified) VALUES ($1, $2, $3, TRUE) RETURNING id, email, role',
      [email, passwordHash, role]
    );
    const newUser = userRes.rows[0];

    // If student, create student profile
    if (role === 'student') {
      await query(
        'INSERT INTO student_profiles (user_id, name, degree, department, cgpa, skills, interests, budget, preferred_countries, career_goals, eligibility_score) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
        [
          newUser.id,
          name,
          'MS',
          'Computer Science',
          3.0,
          [],
          [],
          30000.00,
          ['Germany'],
          ['Software Engineering'],
          50
        ]
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Verification and registration error:', error);
    return { error: 'Failed to verify and register account.' };
  }
}

export async function verifyUserOtp(email: string, otp: string) {
  try {
    if (!otp || typeof otp !== 'string' || otp.trim().length !== 6) {
      return { error: 'Invalid verification OTP. Please try again.' };
    }

    const userRes = await query('SELECT id, otp_code, is_verified FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return { error: 'User account not found.' };
    }
    
    const user = userRes.rows[0];
    if (user.is_verified) {
      return { error: 'Account is already verified. Please sign in.' };
    }

    if (!user.otp_code || user.otp_code !== otp) {
      return { error: 'Invalid verification OTP. Please try again.' };
    }

    await query('UPDATE users SET is_verified = TRUE, otp_code = NULL WHERE id = $1', [user.id]);
    return { success: true };
  } catch (error) {
    console.error('OTP verification error:', error);
    return { error: 'Failed to verify OTP. Please try again.' };
  }
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return { success: true };
}

export async function requestPasswordReset(email: string) {
  if (!email) {
    return { error: 'Email address is required.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  console.log(`[Auth] Password reset requested for: "${cleanEmail}"`);

  try {
    const userRes = await query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (userRes.rows.length === 0) {
      console.log(`[Auth] Password reset failed: "${cleanEmail}" not registered.`);
      return { error: 'No user registered with this email address.' };
    }

    const user = userRes.rows[0];
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    await query('UPDATE users SET otp_code = $1 WHERE id = $2', [otpCode, user.id]);
    await sendPasswordResetEmail(cleanEmail, otpCode);

    return { success: true, email: cleanEmail };
  } catch (error) {
    console.error('Request password reset error:', error);
    return { error: 'An error occurred while initiating password recovery. Please try again.' };
  }
}

export async function resetUserPassword(email: string, otpCode: string, newPassword: string) {
  if (!email || !otpCode || !newPassword) {
    return { error: 'All fields are required.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otpCode.trim();

  if (cleanOtp.length !== 6) {
    return { error: 'Invalid OTP code format. Must be 6 digits.' };
  }

  if (newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters long.' };
  }

  try {
    const userRes = await query('SELECT id, otp_code FROM users WHERE email = $1', [cleanEmail]);
    if (userRes.rows.length === 0) {
      return { error: 'User account not found.' };
    }

    const user = userRes.rows[0];

    if (!user.otp_code || user.otp_code !== cleanOtp) {
      console.log(`[Auth] Password reset verification failed for "${cleanEmail}": incorrect OTP.`);
      return { error: 'Invalid or expired verification OTP. Please try again.' };
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await query('UPDATE users SET password_hash = $1, otp_code = NULL WHERE id = $2', [passwordHash, user.id]);
    console.log(`[Auth] Password successfully updated/reset for: "${cleanEmail}"`);

    return { success: true };
  } catch (error) {
    console.error('Reset user password error:', error);
    return { error: 'An error occurred while resetting your password. Please try again.' };
  }
}

export async function loginWithGoogle(idToken: string, mockData?: { email: string; name: string }) {
  try {
    let email: string;
    let name: string;

    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    // Check if we are simulating / using mock data
    if (idToken.startsWith('mock_token_') || !googleClientId) {
      console.log('[Auth] Google Login: Operating in simulated/mock mode.');
      if (mockData) {
        email = mockData.email.trim().toLowerCase();
        name = mockData.name;
      } else {
        email = 'google-demo@nexora.com';
        name = 'Demo Google User';
      }
    } else {
      // Validate the token via Google's tokeninfo endpoint
      console.log('[Auth] Verifying Google token with Google API...');
      const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      if (!verifyRes.ok) {
        const errorText = await verifyRes.text();
        console.error('[Auth] Google Token verification failed:', errorText);
        return { error: 'Failed to verify Google Sign-In credentials.' };
      }

      const payload = await verifyRes.json();
      
      // Basic validation
      if (!payload.email_verified) {
        return { error: 'Google account email is not verified.' };
      }

      // Check client ID / aud to prevent replay attacks
      if (payload.aud !== googleClientId) {
        console.error(`[Auth] Google Client ID mismatch. Expected: ${googleClientId}, Got: ${payload.aud}`);
        return { error: 'Invalid authentication client ID.' };
      }

      email = payload.email.trim().toLowerCase();
      name = payload.name || payload.given_name || email.split('@')[0];
    }

    console.log(`[Auth] Google login attempt for email: "${email}"`);

    // Check if user exists
    const userRes = await query('SELECT * FROM users WHERE email = $1', [email]);
    let user;
    let isNewUser = false;

    if (userRes.rows.length === 0) {
      console.log(`[Auth] User "${email}" not found. Auto-registering as student...`);
      isNewUser = true;

      // Hash a random password (just to occupy the column safely)
      const randomPassword = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(randomPassword, salt);

      // Insert user as student, verified
      const insertUserRes = await query(
        'INSERT INTO users (email, password_hash, role, is_verified) VALUES ($1, $2, $3, TRUE) RETURNING id, email, role',
        [email, passwordHash, 'student']
      );
      user = insertUserRes.rows[0];

      // Create student profile
      await query(
        'INSERT INTO student_profiles (user_id, name, degree, department, cgpa, skills, interests, budget, preferred_countries, career_goals, eligibility_score) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
        [
          user.id,
          name,
          'MS',
          'Computer Science',
          3.0,
          [],
          [],
          30000.00,
          ['Germany'],
          ['Software Engineering'],
          50
        ]
      );
      console.log(`[Auth] Created student profile for user ID: ${user.id}`);
    } else {
      user = userRes.rows[0];
      if (user.is_active === false) {
        return { error: 'Your account has been suspended by the platform administrator.' };
      }
      // Check if user is verified. If not, auto-verify since they authenticated with Google
      if (!user.is_verified) {
        await query('UPDATE users SET is_verified = TRUE WHERE id = $1', [user.id]);
        user.is_verified = true;
        console.log(`[Auth] Verified existing user "${email}" via Google Sign-In.`);
      }
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    let onboardingCompleted = false;
    if (user.role === 'student') {
      const profileRes = await query('SELECT onboarding_completed FROM student_profiles WHERE user_id = $1', [user.id]);
      if (profileRes.rows.length > 0) {
        onboardingCompleted = !!profileRes.rows[0].onboarding_completed;
      }
    }

    console.log(`[Auth] Google login successful for: "${email}" (role: ${user.role}, onboardingCompleted: ${onboardingCompleted})`);

    return { success: true, role: user.role, onboardingCompleted, isNewUser };
  } catch (error: any) {
    console.error('Google Login error:', error);
    return { error: 'An error occurred during Google Login. Please try again.' };
  }
}


