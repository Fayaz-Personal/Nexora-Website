'use client';

export const dynamic = 'force-dynamic';
 
import { useRouter } from 'next/navigation';
import { useState, useActionState, useEffect } from 'react';
import Script from 'next/script';
import { GraduationCap, Lock, Mail, User, UserCheck, KeyRound, CheckCircle, X, Sparkles, BookOpen, Compass, Award, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { loginUser, registerUser, verifyUserOtp, verifyAndRegisterUser, requestPasswordReset, resetUserPassword, loginWithGoogle } from '../actions/auth';
 
export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [showOtp, setShowOtp] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [pendingToken, setPendingToken] = useState('');
 
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [role, setRole] = useState<'student' | 'uni_admin' | 'business'>('student');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [sendingReset, setSendingReset] = useState(false);
  const [showResetPasswords, setShowResetPasswords] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [emailInputVal, setEmailInputVal] = useState('');

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showMockGoogleModal, setShowMockGoogleModal] = useState(false);
  const [mockGoogleEmail, setMockGoogleEmail] = useState('');
  const [mockGoogleName, setMockGoogleName] = useState('');
  const [mockGoogleError, setMockGoogleError] = useState<string | null>(null);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const initGoogleSignIn = () => {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.initialize({
        client_id: googleClientId || '',
        callback: async (response: any) => {
          setIsGoogleLoading(true);
          const res = await loginWithGoogle(response.credential);
          setIsGoogleLoading(false);
          if (res.success) {
            router.refresh();
            if (res.role === 'business') {
              router.push('/business/dashboard');
            } else if (res.role === 'platform_admin') {
              router.push('/platform-admin/dashboard');
            } else if (res.role === 'uni_admin') {
              router.push('/uni-admin/dashboard');
            } else if (res.isNewUser || !res.onboardingCompleted) {
              router.push('/student/onboarding');
            } else {
              router.push('/student/dashboard');
            }
          } else {
            alert(res.error || 'Failed to sign in with Google');
          }
        }
      });
      (window as any).google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        { 
          theme: 'outline', 
          size: 'large', 
          width: 350,
          text: isLogin ? 'signin_with' : 'signup_with'
        }
      );
    }
  };


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'register') {
        setIsLogin(false);
      }
    }
  }, []);
 
  useEffect(() => {
    // If the Google script is already loaded and cached (e.g., when navigating back and forth),
    // initialize Google Sign-In immediately without waiting for onLoad to fire.
    if (googleClientId && typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      initGoogleSignIn();
    }
  }, [googleClientId, isLogin]);

  const [loginState, loginAction, isLoginPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      setSuccessMessage(null);
      const res = await loginUser(prevState, formData);
      if (res.success) {
        router.refresh();
        if (res.role === 'platform_admin') {
          router.push('/platform-admin/dashboard');
        } else if (res.role === 'uni_admin') {
          router.push('/uni-admin/dashboard');
        } else if (res.role === 'business') {
          router.push('/business/dashboard');
        } else {
          if (!res.onboardingCompleted) {
            router.push('/student/onboarding');
          } else {
            router.push('/student/dashboard');
          }
        }
      } else if (res.unverified) {
        setOtpEmail(res.email || '');
        setShowOtp(true);
      }
      return res;
    },
    null
  );

  const [registerState, registerAction, isRegisterPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      setSuccessMessage(null);
      const res = await registerUser(prevState, formData);
      if (res.success && res.needsVerification) {
        setOtpEmail(res.email || '');
        setPendingToken(res.pendingToken || '');
        setShowOtp(true);
      } else if (res.success) {
        setIsLogin(true);
        setSuccessMessage('Registered successfully! Please login.');
      }
      return res;
    },
    null
  );

  const error = isLogin ? loginState?.error : registerState?.error;
  const isPending = isLogin ? isLoginPending : isRegisterPending;

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    setVerifyingOtp(true);
    
    let res;
    if (pendingToken) {
      res = await verifyAndRegisterUser(pendingToken, otpInput);
    } else {
      res = await verifyUserOtp(otpEmail, otpInput);
    }
    
    setVerifyingOtp(false);
    if (res.success) {
      setShowOtp(false);
      setIsLogin(true);
      setSuccessMessage('Email verified successfully! Please sign in.');
      setOtpInput('');
      setPendingToken('');
    } else {
      setOtpError(res.error || 'Failed to verify OTP.');
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setSendingReset(true);

    if (recoveryStep === 1) {
      const res = await requestPasswordReset(forgotEmail);
      setSendingReset(false);
      if (res.success) {
        setRecoveryStep(2);
      } else {
        setRecoveryError(res.error || 'Failed to request password reset.');
      }
    } else {
      if (recoveryPassword !== recoveryConfirmPassword) {
        setRecoveryError('Passwords do not match.');
        setSendingReset(false);
        return;
      }
      if (recoveryPassword.length < 6) {
        setRecoveryError('Password must be at least 6 characters long.');
        setSendingReset(false);
        return;
      }

      const res = await resetUserPassword(forgotEmail, recoveryOtp, recoveryPassword);
      setSendingReset(false);
      if (res.success) {
        setShowForgotPassword(false);
        setSuccessMessage('Password reset successfully! Please sign in with your new credentials.');
        setEmailInputVal(forgotEmail);
      } else {
        setRecoveryError(res.error || 'Failed to reset password.');
      }
    }
  };

  return (
    <div className="relative min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 overflow-hidden">
      {/* Decorative background grid and shapes */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 left-10 w-[300px] h-[300px] bg-teal-bright/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-[300px] h-[300px] bg-teal-dark/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* Left Side: Brand features & highlights */}
        <div className="lg:col-span-7 space-y-6 text-left hidden lg:block pr-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-dark/10 px-3 py-1 text-xs font-bold text-teal-dark">
            <Sparkles className="h-4 w-4" />
            <span>AI-Powered Education Roadmap</span>
          </div>
          
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Empower your global education journey with <span className="text-gradient-teal-sunrise">Nexora AI</span>
          </h1>
          
          <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
            Join thousands of students applying to world-class universities in Germany, USA, UK, and Canada. Create a profile to receive personalized course fits, scholarship advice, and visa milestones.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-start gap-3">
              <div className="rounded-lg bg-teal-dark/10 p-2 text-teal-dark">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">AI Course Finder</h4>
                <p className="text-xs text-slate-600 mt-1">Get custom program matches aligned with your CGPA and target budgets.</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-start gap-3">
              <div className="rounded-lg bg-teal-dark/10 p-2 text-teal-dark">
                <Award className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Scholarship Matches</h4>
                <p className="text-xs text-slate-600 mt-1">Access university fellowships and government funding matched to your background.</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-start gap-3">
              <div className="rounded-lg bg-teal-dark/10 p-2 text-teal-dark">
                <Compass className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Visa & Flight Guides</h4>
                <p className="text-xs text-slate-600 mt-1">Track checklist timelines, embassy processes, and flight fare estimates.</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-start gap-3">
              <div className="rounded-lg bg-teal-dark/10 p-2 text-teal-dark">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Admission Predictor</h4>
                <p className="text-xs text-slate-600 mt-1">Evaluate your admission probability (Safe, Moderate, Dream) in real-time.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Form Card */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl relative overflow-hidden">
            {/* Top accent glow bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-right bg-teal-dark" />

            {showOtp ? (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <div className="inline-flex rounded-xl bg-teal-dark/10 p-2 text-teal-dark mb-3">
                    <KeyRound className="h-6 w-6 text-teal-dark" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    Verify Your Account
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    We have generated a 6-digit OTP code to verify your email.
                  </p>
                </div>



                {otpError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-650 text-center">
                    {otpError}
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Enter 6-Digit OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="e.g. 123456"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center tracking-widest bg-white border border-slate-200 rounded-xl text-slate-800 p-3 text-lg font-bold focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark placeholder-slate-350 shadow-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={verifyingOtp}
                    className="w-full bg-gradient-teal-sunrise text-slate-900 font-extrabold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  >
                    {verifyingOtp ? (
                      <span className="animate-pulse">Verifying...</span>
                    ) : (
                      <>
                        <span>Verify & Activate Account</span>
                        <CheckCircle className="h-4 w-4 text-slate-900" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowOtp(false);
                      setOtpInput('');
                      setOtpError(null);
                      setPendingToken('');
                    }}
                    className="w-full py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-600 rounded-xl transition-all cursor-pointer text-center"
                  >
                    Back to Sign In
                  </button>
                </form>
              </div>
            ) : (
              <>
                {/* Logo and Intro */}
                <div className="text-center mb-6">
              <div className="inline-flex rounded-xl bg-teal-dark/10 p-2 text-teal-dark mb-3">
                <GraduationCap className="h-6 w-6 text-teal-dark" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isLogin 
                  ? 'Access your student dashboard and continue your roadmap' 
                  : 'Start your student profile and unlock AI advising'}
              </p>
            </div>

            {/* Form Success/Error Feedback */}
            {successMessage && !error && (
              <div className="mb-5 p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-800 text-center">
                {successMessage}
              </div>
            )}

            {error && (
              <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-650 text-center">
                {error}
              </div>
            )}

            {/* Auth Forms */}
            <form 
              action={isLogin ? loginAction : registerAction} 
              onChange={() => setSuccessMessage(null)}
              className="space-y-4"
            >
              
              {/* Sign Up Fields */}
              {!isLogin && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                      Register As
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-3 text-sm focus:outline-none focus:border-teal-dark transition-all"
                    >
                      <option value="student">Student User (Explore & Plan Studies)</option>
                      <option value="uni_admin">University User (Advertise Courses & Scholarships)</option>
                      <option value="business">Business User (Travel, Accommodation, Loans, Visa)</option>
                    </select>
                  </div>

                  <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </span>
                    <input
                      name="name"
                      type="text"
                      placeholder="e.g. John Doe"
                      className="w-full pl-10 bg-white border border-slate-200 rounded-xl text-slate-800 p-3.5 text-sm focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark placeholder-slate-400 shadow-sm"
                      required={!isLogin}
                    />
                  </div>
                </div>
              </div>
            )}

              {/* Hidden inputs to pass states */}
              {!isLogin && <input type="hidden" name="role" value={role} />}

              {/* Email field */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={emailInputVal}
                    onChange={(e) => setEmailInputVal(e.target.value)}
                    className="w-full pl-10 bg-white border border-slate-200 rounded-xl text-slate-800 p-3.5 text-sm focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark placeholder-slate-400 shadow-sm"
                    required
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail('');
                        setRecoveryStep(1);
                        setRecoveryOtp('');
                        setRecoveryPassword('');
                        setRecoveryConfirmPassword('');
                        setRecoveryError(null);
                        setShowForgotPassword(true);
                      }}
                      className="text-xs font-bold text-teal-dark hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    className="w-full pl-10 bg-white border border-slate-200 rounded-xl text-slate-800 p-3.5 text-sm focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark placeholder-slate-400 shadow-sm"
                    required
                  />
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-gradient-teal-sunrise text-slate-900 font-extrabold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 mt-6 cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {isPending ? (
                  <span className="animate-pulse">Processing...</span>
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <UserCheck className="h-4 w-4 text-slate-900" />
                  </>
                )}
              </button>
            </form>
 
            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-500 font-bold">Or continue with</span>
              </div>
            </div>
 
            {/* Google Button */}
            {googleClientId ? (
              <div className="flex flex-col items-center gap-2">
                <Script
                  src="https://accounts.google.com/gsi/client"
                  onLoad={initGoogleSignIn}
                  strategy="lazyOnload"
                />
                <div id="google-signin-button" className="w-full flex justify-center"></div>
                {isGoogleLoading && <p className="text-xs text-teal-dark animate-pulse">Connecting to Google...</p>}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setShowMockGoogleModal(true)}
                  className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm active:scale-[0.99] bg-white"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <g transform="matrix(1, 0, 0, 1, 0, 0)">
                      <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.57h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.4C21.68,11.83 21.57,11.43 21.35,11.1z" fill="#4285F4" />
                      <path d="M12,20.6c2.43,0 4.47,-0.8 5.96,-2.2l-3.3,-2.57c-0.9,0.6 -2.07,0.97 -3.3,0.97 -2.34,0 -4.33,-1.58 -5.04,-3.7H2.9v2.66c1.5,2.97 4.56,5.04 8.1,5.04z" fill="#34A853" />
                      <path d="M6.96,13.1c-0.18,-0.54 -0.28,-1.11 -0.28,-1.7s0.1,-1.16 0.28,-1.7V7.04H2.9C2.3,8.24 2,9.58 2,11s0.3,2.76 0.9,3.96l4.06,-3.2L6.96,13.1z" fill="#FBBC05" />
                      <path d="M12,6.13c1.32,0 2.5,0.45 3.44,1.35l2.58,-2.58C16.46,3.43 14.42,2.6 12,2.6c-3.54,0 -6.6,2.07 -8.1,5.04l4.06,3.2C8.67,7.7 10.66,6.13 12,6.13z" fill="#EA4335" />
                    </g>
                  </svg>
                  <span>{isLogin ? 'Sign In with Google' : 'Sign Up with Google'}</span>
                </button>
              </div>
            )}

            {/* Toggle link */}
            <div className="mt-6 text-center text-sm text-slate-600">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setSuccessMessage(null);
                  setIsLogin(!isLogin);
                }}
                className="text-teal-dark font-bold hover:underline transition-colors ml-1 cursor-pointer"
              >
                {isLogin ? 'Register Here' : 'Login Here'}
              </button>
            </div>
            </>
            )}
          </div>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white/95 rounded-2xl p-6 border border-slate-200/80 shadow-2xl relative backdrop-blur-md">
            {/* Top Teal Glow Border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-teal-sunrise rounded-t-2xl" />
            
            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center mb-5">
              <div className="inline-flex rounded-xl bg-teal-dark/10 p-2.5 text-teal-dark font-bold mb-3">
                <KeyRound className="h-5 w-5" />
              </div>
              <h3 className="text-md font-bold text-slate-900">
                Password Recovery
              </h3>
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${recoveryStep === 1 ? 'bg-teal-dark text-white' : 'bg-slate-100 text-slate-500'}`}>
                  Step 1: Email
                </span>
                <div className="w-4 h-0.5 bg-slate-200" />
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${recoveryStep === 2 ? 'bg-teal-dark text-white' : 'bg-slate-100 text-slate-500'}`}>
                  Step 2: Reset
                </span>
              </div>
            </div>

            {recoveryError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-650 text-center">
                {recoveryError}
              </div>
            )}

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              {recoveryStep === 1 ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed text-center">
                    Enter your registered email address below. We'll send you a 6-digit verification code to reset your password.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-slate-400" />
                      </span>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-9 bg-white border border-slate-200 rounded-xl text-slate-800 p-2.5 text-xs focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark placeholder-slate-400 shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={sendingReset}
                    className="w-full bg-gradient-teal-sunrise text-slate-900 font-extrabold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-md disabled:opacity-50"
                  >
                    {sendingReset ? 'Sending Verification OTP...' : 'Send Recovery OTP'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 leading-relaxed text-center">
                    We sent a verification code to <span className="font-bold text-slate-800">{forgotEmail}</span>. Enter the code and your new credentials.
                  </p>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                      6-Digit Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={recoveryOtp}
                      onChange={(e) => setRecoveryOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 123456"
                      className="w-full text-center tracking-widest bg-white border border-slate-200 rounded-xl text-slate-800 p-2 text-sm font-bold focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark placeholder-slate-350 shadow-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                      New Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-slate-400" />
                      </span>
                      <input
                        type={showResetPasswords ? 'text' : 'password'}
                        value={recoveryPassword}
                        onChange={(e) => setRecoveryPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full pl-9 pr-8 bg-white border border-slate-200 rounded-xl text-slate-800 p-2.5 text-xs focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark placeholder-slate-400 shadow-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPasswords(!showResetPasswords)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-650 cursor-pointer"
                      >
                        {showResetPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-slate-400" />
                      </span>
                      <input
                        type={showResetPasswords ? 'text' : 'password'}
                        value={recoveryConfirmPassword}
                        onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full pl-9 pr-8 bg-white border border-slate-200 rounded-xl text-slate-800 p-2.5 text-xs focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark placeholder-slate-400 shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={sendingReset}
                    className="w-full bg-gradient-teal-sunrise text-slate-900 font-extrabold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-md disabled:opacity-50 mt-2"
                  >
                    {sendingReset ? 'Updating Password...' : 'Reset Password'}
                  </button>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <button
                      type="button"
                      onClick={() => setRecoveryStep(1)}
                      className="text-slate-550 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      <span>Back to Step 1</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setRecoveryError(null);
                        setSendingReset(true);
                        const res = await requestPasswordReset(forgotEmail);
                        setSendingReset(false);
                        if (res.success) {
                          setRecoveryError(null);
                          alert('Reset code resent successfully!');
                        } else {
                          setRecoveryError(res.error || 'Failed to resend code.');
                        }
                      }}
                      className="text-teal-dark font-bold hover:underline cursor-pointer"
                    >
                      Resend Code
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
 
      {/* Mock Google Login Modal */}
      {showMockGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xl relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-red-500 to-yellow-500 rounded-t-2xl" />
            
            <button
              type="button"
              onClick={() => {
                setShowMockGoogleModal(false);
                setMockGoogleError(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
 
            <div className="text-center mb-5">
              <div className="inline-flex rounded-xl bg-blue-50 p-2.5 text-blue-600 mb-3">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.25.61 4.47 1.73l2.42-2.42C17.38 1.83 14.94 1 12.24 1c-5.523 0-10 4.477-10 10s4.477 10 10 10c5.787 0 9.63-4.068 9.63-9.8 0-.66-.06-1.29-.17-1.915H12.24z"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Google Identity Sandbox
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Simulate OAuth 2.0 flow. Enter mock credentials to {isLogin ? 'log in' : 'register'}.
              </p>
            </div>
 
            {mockGoogleError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-650 text-center">
                {mockGoogleError}
              </div>
            )}
 
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setMockGoogleError(null);
                setIsGoogleLoading(true);
 
                if (!mockGoogleEmail || !mockGoogleName) {
                  setMockGoogleError('Please enter both name and email.');
                  setIsGoogleLoading(false);
                  return;
                }
 
                // Send mock request
                const res = await loginWithGoogle(`mock_token_${Date.now()}`, {
                  email: mockGoogleEmail,
                  name: mockGoogleName
                });
 
                setIsGoogleLoading(false);
                if (res.success) {
                  setShowMockGoogleModal(false);
                  router.refresh();
                  if (res.isNewUser || !res.onboardingCompleted) {
                    router.push('/student/onboarding');
                  } else {
                    router.push('/student/dashboard');
                  }
                } else {
                  setMockGoogleError(res.error || 'Failed to authenticate.');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Full Name (from Google account)
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={mockGoogleName}
                  onChange={(e) => setMockGoogleName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl text-slate-800 p-3 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                  required
                />
              </div>
 
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Email Address (from Google account)
                </label>
                <input
                  type="email"
                  placeholder="johndoe@gmail.com"
                  value={mockGoogleEmail}
                  onChange={(e) => setMockGoogleEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl text-slate-800 p-3 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                  required
                />
              </div>
 
              <button
                type="submit"
                disabled={isGoogleLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
              >
                {isGoogleLoading ? 'Authenticating...' : isLogin ? 'Sign In as Verified Google User' : 'Sign Up as Verified Google User'}
              </button>
 
              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMockGoogleName('Ashwin Kumar');
                    setMockGoogleEmail('ashwinkumar@gmail.com');
                  }}
                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 py-1 px-2.5 rounded-md font-bold transition-all cursor-pointer"
                >
                  Fill Ashwin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMockGoogleName('Sarah Jenkins');
                    setMockGoogleEmail('sarah@nexora.com');
                  }}
                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 py-1 px-2.5 rounded-md font-bold transition-all cursor-pointer"
                >
                  Fill Sarah (Existing)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
