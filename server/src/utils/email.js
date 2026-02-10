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
      console.log("Text:", options.text);
      console.log("=======================================\n");
      return { messageId: "dev-mode" };
    },
  };
}

// SendGrid tracking settings (disable click tracking to preserve original URLs)
const sendGridHeaders = {
  "X-SMTPAPI": JSON.stringify({
    filters: {
      clicktrack: { settings: { enable: 0 } },
      opentrack: { settings: { enable: 0 } },
    },
  }),
};

const fromAddress = process.env.EMAIL_FROM || "Sable <noreply@sable.app>";
const clientUrl = process.env.CLIENT_ORIGIN || "http://localhost:3000";

// Brand colors (matching site)
const colors = {
  primary: "#0b3f87",      // Sable blue (topbar)
  accent: "#244b2b",       // Sable green
  text: "#1b1b1b",         // Main text
  textLight: "#5a5a5a",    // Muted text
  background: "#f3efe6",   // Parchment background
  cardBg: "#ffffff",       // Card background
  border: "#e0ddd5",       // Border color
};

/**
 * Base email template wrapper
 */
function baseTemplate({ preheader, content }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Sable</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.background}; font-family: Georgia, 'Times New Roman', serif;">
  <!-- Preheader text (hidden preview text) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${preheader}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Email wrapper -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${colors.background};">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <!-- Main container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: ${colors.cardBg}; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);">

          <!-- Header -->
          <tr>
            <td align="center" style="padding: 36px 40px; background-color: ${colors.primary}; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; font-size: 28px; font-weight: normal; color: #ffffff; letter-spacing: 4px; font-family: Georgia, serif;">
                SABLE
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: ${colors.background}; border-radius: 0 0 12px 12px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 12px 0; font-size: 12px; color: ${colors.textLight}; line-height: 1.5; font-style: italic;">
                      Emails may take up to 2 minutes to arrive. Please check your spam folder if you don't see it in your inbox.
                    </p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: ${colors.textLight}; line-height: 1.6;">
                      This email was sent by Sable. If you have questions,<br>
                      please contact us at <a href="mailto:support@sable.app" style="color: ${colors.primary}; text-decoration: none;">support@sable.app</a>
                    </p>
                    <p style="margin: 0; font-size: 12px; color: ${colors.textLight};">
                      &copy; ${new Date().getFullYear()} Sable. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- End main container -->

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate a styled button
 */
function emailButton(text, url) {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
      <tr>
        <td align="center" style="border-radius: 8px; background-color: ${colors.primary};">
          <a href="${url}" target="_blank" style="display: inline-block; padding: 16px 36px; font-family: Georgia, serif; font-size: 15px; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: normal; letter-spacing: 0.5px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Send email verification email
 */
async function sendVerificationEmail(user, token) {
  const verifyUrl = `${clientUrl}/verify-email/${token}`;
  const username = user.username || "there";

  const content = `
    <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: normal; color: ${colors.primary}; text-align: center;">
      Welcome to Sable
    </h2>

    <p style="margin: 0 0 16px 0; font-size: 16px; color: ${colors.text}; line-height: 1.7; text-align: center;">
      Hi ${username},
    </p>

    <p style="margin: 0 0 32px 0; font-size: 16px; color: ${colors.text}; line-height: 1.7; text-align: center;">
      Thank you for joining Sable. To complete your registration and start discovering stories, please verify your email address.
    </p>

    <div style="text-align: center; margin-bottom: 32px;">
      ${emailButton("Verify Email Address", verifyUrl)}
    </div>

    <p style="margin: 0 0 24px 0; font-size: 14px; color: ${colors.textLight}; line-height: 1.6; text-align: center;">
      Or copy and paste this link into your browser:
    </p>

    <p style="margin: 0 0 32px 0; font-size: 13px; color: ${colors.primary}; line-height: 1.6; text-align: center; word-break: break-all; background-color: ${colors.background}; padding: 16px; border-radius: 6px;">
      <a href="${verifyUrl}" style="color: ${colors.primary}; text-decoration: none;">${verifyUrl}</a>
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top: 1px solid ${colors.border}; padding-top: 24px;">
      <tr>
        <td>
          <p style="margin: 0; font-size: 13px; color: ${colors.textLight}; line-height: 1.6;">
            <strong style="color: ${colors.text};">This link expires in 24 hours.</strong><br><br>
            If you didn't create an account on Sable, you can safely ignore this email.
          </p>
        </td>
      </tr>
    </table>
  `;

  const plainText = `
Welcome to Sable!

Hi ${username},

Thank you for joining Sable. To complete your registration, please verify your email address by visiting:

${verifyUrl}

This link expires in 24 hours.

If you didn't create an account on Sable, you can safely ignore this email.

- The Sable Team

---
Note: This email may take up to 2 minutes to arrive. Please check your spam or junk folder if you don't see it in your inbox.
  `.trim();

  await transporter.sendMail({
    from: fromAddress,
    to: user.email,
    subject: "Verify your Sable account",
    text: plainText,
    html: baseTemplate({
      preheader: "Please verify your email address to get started on Sable.",
      content,
    }),
    headers: sendGridHeaders,
  });
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(user, token) {
  const resetUrl = `${clientUrl}/reset-password/${token}`;
  const username = user.username || "there";

  const content = `
    <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: normal; color: ${colors.primary}; text-align: center;">
      Reset Your Password
    </h2>

    <p style="margin: 0 0 16px 0; font-size: 16px; color: ${colors.text}; line-height: 1.7; text-align: center;">
      Hi ${username},
    </p>

    <p style="margin: 0 0 32px 0; font-size: 16px; color: ${colors.text}; line-height: 1.7; text-align: center;">
      We received a request to reset the password for your Sable account. Click the button below to choose a new password.
    </p>

    <div style="text-align: center; margin-bottom: 32px;">
      ${emailButton("Reset Password", resetUrl)}
    </div>

    <p style="margin: 0 0 24px 0; font-size: 14px; color: ${colors.textLight}; line-height: 1.6; text-align: center;">
      Or copy and paste this link into your browser:
    </p>

    <p style="margin: 0 0 32px 0; font-size: 13px; color: ${colors.primary}; line-height: 1.6; text-align: center; word-break: break-all; background-color: ${colors.background}; padding: 16px; border-radius: 6px;">
      <a href="${resetUrl}" style="color: ${colors.primary}; text-decoration: none;">${resetUrl}</a>
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top: 1px solid ${colors.border}; padding-top: 24px;">
      <tr>
        <td>
          <p style="margin: 0; font-size: 13px; color: ${colors.textLight}; line-height: 1.6;">
            <strong style="color: ${colors.text};">This link expires in 1 hour.</strong><br><br>
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </td>
      </tr>
    </table>
  `;

  const plainText = `
Reset Your Password

Hi ${username},

We received a request to reset the password for your Sable account.

Click the link below to choose a new password:

${resetUrl}

This link expires in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

- The Sable Team

---
Note: This email may take up to 2 minutes to arrive. Please check your spam or junk folder if you don't see it in your inbox.
  `.trim();

  await transporter.sendMail({
    from: fromAddress,
    to: user.email,
    subject: "Reset your Sable password",
    text: plainText,
    html: baseTemplate({
      preheader: "You requested a password reset for your Sable account.",
      content,
    }),
    headers: sendGridHeaders,
  });
}

/**
 * Send email change verification email
 */
async function sendEmailChangeEmail(user, newEmail, token) {
  const confirmUrl = `${clientUrl}/verify-email-change/${token}`;
  const username = user.username || "there";

  const content = `
    <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: normal; color: ${colors.primary}; text-align: center;">
      Confirm Email Change
    </h2>

    <p style="margin: 0 0 16px 0; font-size: 16px; color: ${colors.text}; line-height: 1.7; text-align: center;">
      Hi ${username},
    </p>

    <p style="margin: 0 0 32px 0; font-size: 16px; color: ${colors.text}; line-height: 1.7; text-align: center;">
      You requested to change your email address to <strong>${newEmail}</strong>. Please confirm this change by clicking the button below.
    </p>

    <div style="text-align: center; margin-bottom: 32px;">
      ${emailButton("Confirm Email Change", confirmUrl)}
    </div>

    <p style="margin: 0 0 24px 0; font-size: 14px; color: ${colors.textLight}; line-height: 1.6; text-align: center;">
      Or copy and paste this link into your browser:
    </p>

    <p style="margin: 0 0 32px 0; font-size: 13px; color: ${colors.primary}; line-height: 1.6; text-align: center; word-break: break-all; background-color: ${colors.background}; padding: 16px; border-radius: 6px;">
      <a href="${confirmUrl}" style="color: ${colors.primary}; text-decoration: none;">${confirmUrl}</a>
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top: 1px solid ${colors.border}; padding-top: 24px;">
      <tr>
        <td>
          <p style="margin: 0; font-size: 13px; color: ${colors.textLight}; line-height: 1.6;">
            <strong style="color: ${colors.text};">This link expires in 1 hour.</strong><br><br>
            If you didn't request this change, please secure your account by changing your password immediately.
          </p>
        </td>
      </tr>
    </table>
  `;

  const plainText = `
Confirm Email Change

Hi ${username},

You requested to change your email address to ${newEmail}.

Please confirm this change by visiting:

${confirmUrl}

This link expires in 1 hour.

If you didn't request this change, please secure your account by changing your password immediately.

- The Sable Team

---
Note: This email may take up to 2 minutes to arrive. Please check your spam or junk folder if you don't see it in your inbox.
  `.trim();

  await transporter.sendMail({
    from: fromAddress,
    to: newEmail,
    subject: "Confirm your new email address",
    text: plainText,
    html: baseTemplate({
      preheader: "Please confirm your new email address for your Sable account.",
      content,
    }),
    headers: sendGridHeaders,
  });
}

/**
 * Send welcome email after verification
 */
async function sendWelcomeEmail(user) {
  const username = user.username || "there";
  const exploreUrl = `${clientUrl}/browse`;
  const profileUrl = `${clientUrl}/settings/profile`;

  const content = `
    <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: normal; color: ${colors.primary}; text-align: center;">
      You're All Set!
    </h2>

    <p style="margin: 0 0 16px 0; font-size: 16px; color: ${colors.text}; line-height: 1.7; text-align: center;">
      Hi ${username},
    </p>

    <p style="margin: 0 0 32px 0; font-size: 16px; color: ${colors.text}; line-height: 1.7; text-align: center;">
      Your email has been verified and your Sable account is ready. Welcome to a community of readers and storytellers.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 32px;">
      <tr>
        <td style="background-color: ${colors.background}; padding: 24px; border-radius: 8px;">
          <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: bold; color: ${colors.primary};">
            Get Started
          </h3>
          <ul style="margin: 0; padding: 0 0 0 20px; font-size: 15px; color: ${colors.text}; line-height: 2;">
            <li>Browse stories by genre or fandom</li>
            <li>Follow your favorite authors</li>
            <li>Create your first collection</li>
            <li>Start writing your own story</li>
          </ul>
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin-bottom: 16px;">
      ${emailButton("Start Exploring", exploreUrl)}
    </div>

    <p style="margin: 0; font-size: 14px; color: ${colors.textLight}; line-height: 1.6; text-align: center;">
      <a href="${profileUrl}" style="color: ${colors.primary}; text-decoration: none;">Complete your profile</a> to help others find you.
    </p>
  `;

  const plainText = `
You're All Set!

Hi ${username},

Your email has been verified and your Sable account is ready. Welcome to a community of readers and storytellers.

Get Started:
- Browse stories by genre or fandom
- Follow your favorite authors
- Create your first collection
- Start writing your own story

Start exploring: ${exploreUrl}
Complete your profile: ${profileUrl}

- The Sable Team
  `.trim();

  await transporter.sendMail({
    from: fromAddress,
    to: user.email,
    subject: "Welcome to Sable - Let's get started!",
    text: plainText,
    html: baseTemplate({
      preheader: "Your account is verified. Start discovering stories on Sable.",
      content,
    }),
    headers: sendGridHeaders,
  });
}

/**
 * Generic send email function
 */
async function sendEmail({ to, subject, text, html, preheader }) {
  const htmlContent = html
    ? baseTemplate({ preheader: preheader || subject, content: html })
    : undefined;

  await transporter.sendMail({
    from: fromAddress,
    to,
    subject,
    text,
    html: htmlContent,
    headers: sendGridHeaders,
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendEmailChangeEmail,
  sendWelcomeEmail,
  sendEmail,
};
