const nodemailer = require("nodemailer");

// Create transporter based on environment
let transporter;

if (process.env.SMTP_HOST) {
  // Production: Use real SMTP
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} else {
  // Development: Log emails to console
  transporter = {
    sendMail: async (options) => {
      console.log("\n========== EMAIL (dev mode) ==========");
      console.log("To:", options.to);
      console.log("Subject:", options.subject);
      console.log("Body:", options.text || options.html);
      console.log("=======================================\n");
      return { messageId: "dev-mode" };
    },
  };
}

const fromAddress = process.env.EMAIL_FROM || "Sable <noreply@sable.app>";
const clientUrl = process.env.CLIENT_ORIGIN || "http://localhost:3000";

/**
 * Send email verification email
 */
async function sendVerificationEmail(user, token) {
  const verifyUrl = `${clientUrl}/verify-email/${token}`;

  await transporter.sendMail({
    from: fromAddress,
    to: user.email,
    subject: "Verify your Sable account",
    text: `
Welcome to Sable!

Please verify your email address by clicking the link below:

${verifyUrl}

This link will expire in 24 hours.

If you didn't create an account on Sable, you can safely ignore this email.

- The Sable Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Georgia, serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background: #2d2d2d; color: white; text-decoration: none; border-radius: 6px; }
    .footer { margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to Sable!</h1>
    <p>Please verify your email address by clicking the button below:</p>
    <p><a href="${verifyUrl}" class="button">Verify Email</a></p>
    <p>Or copy and paste this link into your browser:</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    <p>This link will expire in 24 hours.</p>
    <div class="footer">
      <p>If you didn't create an account on Sable, you can safely ignore this email.</p>
      <p>- The Sable Team</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  });
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(user, token) {
  const resetUrl = `${clientUrl}/reset-password/${token}`;

  await transporter.sendMail({
    from: fromAddress,
    to: user.email,
    subject: "Reset your Sable password",
    text: `
You requested a password reset for your Sable account.

Click the link below to reset your password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.

- The Sable Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Georgia, serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background: #2d2d2d; color: white; text-decoration: none; border-radius: 6px; }
    .footer { margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Reset Your Password</h1>
    <p>You requested a password reset for your Sable account.</p>
    <p>Click the button below to reset your password:</p>
    <p><a href="${resetUrl}" class="button">Reset Password</a></p>
    <p>Or copy and paste this link into your browser:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>This link will expire in 1 hour.</p>
    <div class="footer">
      <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
      <p>- The Sable Team</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
