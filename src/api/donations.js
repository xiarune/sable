import client from "./client";

/**
 * Record a donation to a user
 * @param {string} recipientId - The user ID receiving the donation
 * @param {number} amount - Donation amount
 * @param {string} note - Optional note
 * @param {string} paymentId - Optional PayPal transaction ID
 */
export async function donateToUser(recipientId, amount, note = "", paymentId = null) {
  return client("/donations", {
    method: "POST",
    body: JSON.stringify({
      recipientId,
      amount,
      note,
      paymentId,
    }),
  });
}

/**
 * Record a donation to Sable (platform)
 * @param {number} amount - Donation amount
 * @param {string} paymentId - Optional PayPal transaction ID
 */
export async function donateToSable(amount, paymentId = null) {
  return client("/donations/sable", {
    method: "POST",
    body: JSON.stringify({
      amount,
      paymentId,
    }),
  });
}

export default {
  donateToUser,
  donateToSable,
};
