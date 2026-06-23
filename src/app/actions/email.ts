import nodemailer from 'nodemailer';

export async function sendOtpEmail(toEmail: string, otpCode: string) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log(`\n======================================================`);
  console.log(`[OTP EMAIL GATEWAY] Attempting to send OTP to: ${toEmail}`);
  console.log(`Verification Code: ${otpCode}`);

  if (host && port && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port),
        secure: parseInt(port) === 465, // true for 465, false for other ports
        auth: {
          user,
          pass,
        },
      });

      const mailOptions = {
        from: `"Nexora Security" <${user}>`,
        to: toEmail,
        subject: `Your Nexora Verification Code: ${otpCode}`,
        text: `Hello,\n\nThank you for choosing Nexora. To verify your identity, please enter the following 6-digit verification code on the authentication screen:\n\n${otpCode}\n\nThis code will expire shortly. If you did not request this verification, please ignore this email.\n\nBest regards,\nThe Nexora Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 15px; margin-bottom: 20px;">
              <h2 style="color: #0d9488; margin: 0;">Nexora Account Security</h2>
            </div>
            <p style="font-size: 16px; color: #334155; line-height: 1.5;">Hello,</p>
            <p style="font-size: 16px; color: #334155; line-height: 1.5;">Thank you for registering on Nexora. To verify your identity and complete your login or registration, please enter the 6-digit verification code below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #0d9488; background-color: #f0fdfa; padding: 12px 30px; border-radius: 8px; border: 1px dashed #0d9488; display: inline-block;">${otpCode}</span>
            </div>
            <p style="font-size: 14px; color: #64748b; line-height: 1.5;">This code will expire shortly. If you did not request this code, you can safely ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">&copy; ${new Date().getFullYear()} Nexora. All rights reserved.</p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[SMTP SUCCESS] Message sent. MessageId: ${info.messageId}`);
      console.log(`======================================================\n`);
      return { success: true };
    } catch (error) {
      console.error('[SMTP ERROR] Failed to send email via SMTP:', error);
      console.log(`======================================================\n`);
      return { success: false, error };
    }
  } else {
    console.log(`[EMAIL SIMULATION] Real SMTP environment variables are not fully configured.`);
    console.log(`Please configure the following in your .env.local file:`);
    console.log(`  SMTP_HOST=your-smtp-host.com`);
    console.log(`  SMTP_PORT=587`);
    console.log(`  SMTP_USER=your-email@example.com`);
    console.log(`  SMTP_PASS=your-email-password-or-api-key`);
    console.log(`======================================================\n`);
    return { success: true, simulated: true };
  }
}

export async function sendPasswordResetEmail(toEmail: string, otpCode: string) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log(`\n======================================================`);
  console.log(`[PASSWORD RESET EMAIL] Attempting to send OTP to: ${toEmail}`);
  console.log(`Verification Code: ${otpCode}`);

  if (host && port && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port),
        secure: parseInt(port) === 465,
        auth: {
          user,
          pass,
        },
      });

      const mailOptions = {
        from: `"Nexora Security" <${user}>`,
        to: toEmail,
        subject: `Reset Your Nexora Password: ${otpCode}`,
        text: `Hello,\n\nYou requested to reset your password. Please enter the following 6-digit OTP code to verify your request:\n\n${otpCode}\n\nThis code will expire shortly. If you did not request a password reset, please ignore this email.\n\nBest regards,\nThe Nexora Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 15px; margin-bottom: 20px;">
              <h2 style="color: #0d9488; margin: 0;">Nexora Password Recovery</h2>
            </div>
            <p style="font-size: 16px; color: #334155; line-height: 1.5;">Hello,</p>
            <p style="font-size: 16px; color: #334155; line-height: 1.5;">We received a request to reset your Nexora account password. Please enter the verification code below on the password reset screen:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #0d9488; background-color: #f0fdfa; padding: 12px 30px; border-radius: 8px; border: 1px dashed #0d9488; display: inline-block;">${otpCode}</span>
            </div>
            <p style="font-size: 14px; color: #64748b; line-height: 1.5;">This code will expire shortly. If you did not request a password reset, you can safely ignore this email and your password will remain unchanged.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">&copy; ${new Date().getFullYear()} Nexora. All rights reserved.</p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[SMTP SUCCESS] Message sent. MessageId: ${info.messageId}`);
      console.log(`======================================================\n`);
      return { success: true };
    } catch (error) {
      console.error('[SMTP ERROR] Failed to send password reset email via SMTP:', error);
      console.log(`======================================================\n`);
      return { success: false, error };
    }
  } else {
    console.log(`[EMAIL SIMULATION] Real SMTP environment variables are not fully configured.`);
    console.log(`Please configure the following in your .env.local file:`);
    console.log(`  SMTP_HOST=your-smtp-host.com`);
    console.log(`  SMTP_PORT=587`);
    console.log(`  SMTP_USER=your-email@example.com`);
    console.log(`  SMTP_PASS=your-email-password-or-api-key`);
    console.log(`======================================================\n`);
    return { success: true, simulated: true };
  }
}

