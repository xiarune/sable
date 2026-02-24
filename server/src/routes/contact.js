const express = require("express");
const { z } = require("zod");
const { sendEmail } = require("../utils/email");
const Contact = require("../models/Contact");
const { optionalAuth } = require("../middleware/auth");

const router = express.Router();

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
});

// POST /api/contact - Send a contact form message
router.post("/", optionalAuth, async (req, res, next) => {
  try {
    const data = contactSchema.parse(req.body);

    // Save to database for admin dashboard
    const contact = new Contact({
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
      status: "new",
      // Link to user if logged in (so we can notify them of response)
      userId: req.user?._id || null,
    });
    await contact.save();

    // Email to support
    const supportEmail = process.env.SUPPORT_EMAIL || "cecboo2@gmail.com";

    const htmlContent = `
      <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: normal; color: #0b3f87;">
        New Contact Form Submission
      </h2>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e0ddd5;">
            <strong style="color: #1b1b1b;">From:</strong>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e0ddd5; color: #1b1b1b;">
            ${data.name} &lt;${data.email}&gt;
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e0ddd5;">
            <strong style="color: #1b1b1b;">Subject:</strong>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e0ddd5; color: #1b1b1b;">
            ${data.subject}
          </td>
        </tr>
      </table>

      <div style="background-color: #f3efe6; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #5a5a5a;">Message:</h3>
        <p style="margin: 0; font-size: 15px; color: #1b1b1b; line-height: 1.7; white-space: pre-wrap;">${data.message}</p>
      </div>

      <p style="margin: 0; font-size: 13px; color: #5a5a5a;">
        Reply directly to this email to respond to ${data.name}.
      </p>
    `;

    const plainText = `
New Contact Form Submission

From: ${data.name} <${data.email}>
Subject: ${data.subject}

Message:
${data.message}

---
Reply directly to this email to respond to ${data.name}.
    `.trim();

    await sendEmail({
      to: supportEmail,
      subject: `[Sable Contact] ${data.subject}`,
      text: plainText,
      html: htmlContent,
      preheader: `Message from ${data.name}: ${data.subject}`,
    });

    res.json({ success: true, message: "Your message has been sent. We'll get back to you soon!" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

module.exports = router;
