const { TOTP, generateSecret: genSecret, generateURI } = require("otplib");
const QRCode = require("qrcode");
const crypto = require("crypto");

const APP_NAME = "Sable";

// Create TOTP instance with window for clock drift
const totp = new TOTP({ window: 1 });

/**
 * Generate a new 2FA secret for a user
 * @param {string} username - User's username for the label
 * @returns {Object} Secret and otpauth URL
 */
function generateSecret(username) {
  const secret = genSecret();
  const otpauthUrl = generateURI({
    issuer: APP_NAME,
    label: username,
    secret,
    type: "totp",
  });

  return { secret, otpauthUrl };
}

/**
 * Generate QR code data URL for the otpauth URL
 * @param {string} otpauthUrl - The otpauth:// URL
 * @returns {Promise<string>} Data URL for the QR code image
 */
async function generateQRCode(otpauthUrl) {
  return QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: "M",
    type: "image/png",
    margin: 2,
    width: 200,
  });
}

/**
 * Verify a TOTP token
 * @param {string} token - The 6-digit token from the authenticator app
 * @param {string} secret - The user's 2FA secret
 * @returns {boolean} Whether the token is valid
 */
function verifyToken(token, secret) {
  try {
    return totp.verify({ token, secret });
  } catch {
    return false;
  }
}

/**
 * Generate backup codes
 * @param {number} count - Number of backup codes to generate
 * @returns {string[]} Array of backup codes
 */
function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    // Format as XXXX-XXXX for readability
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

/**
 * Hash a backup code for storage
 * @param {string} code - The backup code
 * @returns {string} Hashed code
 */
function hashBackupCode(code) {
  // Remove formatting and uppercase for comparison
  const normalized = code.replace(/-/g, "").toUpperCase();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Verify a backup code against stored hashes
 * @param {string} code - The backup code to verify
 * @param {string[]} hashedCodes - Array of hashed backup codes
 * @returns {Object} { valid: boolean, index: number } - index of used code if valid
 */
function verifyBackupCode(code, hashedCodes) {
  const hashedInput = hashBackupCode(code);

  for (let i = 0; i < hashedCodes.length; i++) {
    if (hashedCodes[i] === hashedInput) {
      return { valid: true, index: i };
    }
  }

  return { valid: false, index: -1 };
}

module.exports = {
  generateSecret,
  generateQRCode,
  verifyToken,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
};
