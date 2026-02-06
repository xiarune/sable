const {
  generateToken,
  setTokenCookie,
  clearTokenCookie,
  requireAuth,
  optionalAuth,
} = require("./auth");
const errorHandler = require("./errorHandler");

module.exports = {
  generateToken,
  setTokenCookie,
  clearTokenCookie,
  requireAuth,
  optionalAuth,
  errorHandler,
};
