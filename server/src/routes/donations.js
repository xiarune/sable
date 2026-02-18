const express = require("express");
const { z } = require("zod");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const { notifyDonation } = require("../services/notificationService");
const User = require("../models/User");

const router = express.Router();

// Validation schema
const donationSchema = z.object({
  recipientId: z.string().min(1, "Recipient is required"),
  amount: z.number().positive("Amount must be positive").max(5000, "Maximum donation is $5,000"),
  note: z.string().max(500, "Note must be 500 characters or less").optional(),
  paymentId: z.string().optional(), // PayPal transaction ID
});

/**
 * POST /donations
 * Record a donation and notify the recipient
 */
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const result = donationSchema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => e.message);
      return res.status(400).json({ error: errors[0], errors });
    }

    const { recipientId, amount, note, paymentId } = result.data;

    // Find the recipient
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    // Don't allow donating to yourself
    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({ error: "Cannot donate to yourself" });
    }

    // In production, you would:
    // 1. Verify the PayPal payment was successful
    // 2. Store the donation in a Donation model
    // 3. Handle any platform fees

    // Send notification to recipient
    await notifyDonation(recipient._id, req.user._id, amount, note);

    res.status(201).json({
      message: "Donation recorded successfully",
      donation: {
        recipientId,
        recipientUsername: recipient.username,
        amount,
        note,
        paymentId,
        donorId: req.user._id,
        donorUsername: req.user.username,
        createdAt: new Date(),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /donations/sable
 * Record a donation to Sable (platform donation)
 */
router.post("/sable", optionalAuth, async (req, res, next) => {
  try {
    const { amount, paymentId } = req.body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    // In production, verify the PayPal payment and store the record
    // For now, just acknowledge the donation

    res.status(201).json({
      message: "Thank you for supporting Sable!",
      donation: {
        amount,
        paymentId,
        donorId: req.user?._id || null,
        donorUsername: req.user?.username || "anonymous",
        createdAt: new Date(),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
