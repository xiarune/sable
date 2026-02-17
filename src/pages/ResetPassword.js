import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { authApi } from "../api";
import "./NewDraft.css";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [status, setStatus] = React.useState("checking"); // "checking" | "valid" | "invalid" | "submitting" | "success"
  const [error, setError] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  React.useEffect(() => {
    async function validateToken() {
      if (!token) {
        setStatus("invalid");
        setError("No reset token provided.");
        return;
      }

      try {
        const data = await authApi.validateResetToken(token);
        if (data.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
          setError("This password reset link is invalid or has expired.");
        }
      } catch {
        setStatus("invalid");
        setError("This password reset link is invalid or has expired.");
      }
    }

    validateToken();
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setStatus("submitting");
    setError("");

    try {
      await authApi.resetPassword(token, password);
      setStatus("success");
    } catch (err) {
      setError(err.message || "Failed to reset password. Please try again.");
      setStatus("valid");
    }
  }

  if (status === "checking") {
    return (
      <div className="nd-page">
        <div className="nd-shell" style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 className="nd-title">Validating...</h1>
          <p style={{ color: "rgba(0,0,0,0.65)" }}>Please wait while we validate your reset link.</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="nd-page">
        <div className="nd-shell" style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 className="nd-title">Invalid Link</h1>
          <p style={{ marginBottom: 24, color: "rgba(0,0,0,0.65)" }}>{error}</p>
          <p style={{ marginBottom: 24, color: "rgba(0,0,0,0.65)" }}>
            Please request a new password reset link.
          </p>
          <Link
            to="/forgot-password"
            className="nd-ornateBtn nd-ornateBtn--primary"
            style={{ display: "inline-block", textDecoration: "none" }}
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="nd-page">
        <div className="nd-shell" style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 className="nd-title">Password Reset!</h1>
          <p style={{ marginBottom: 24, color: "rgba(0,0,0,0.65)" }}>
            Your password has been successfully reset. You can now log in with your new password.
          </p>
          <button
            className="nd-ornateBtn nd-ornateBtn--primary"
            onClick={() => {
              navigate("/");
              window.dispatchEvent(new CustomEvent("sable:open-auth"));
            }}
            style={{ width: "100%" }}
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="nd-page">
      <div className="nd-shell" style={{ maxWidth: 480 }}>
        <h1 className="nd-title">Set New Password</h1>
        <p style={{ marginBottom: 24, color: "rgba(0,0,0,0.65)" }}>
          Enter your new password below.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>New Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                className="nd-textarea"
                style={{ minHeight: 44, flex: 1, paddingRight: 44 }}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: 8,
                  width: 32,
                  height: 32,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 6,
                  opacity: 0.7,
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>Confirm Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                className="nd-textarea"
                style={{ minHeight: 44, flex: 1, paddingRight: 44 }}
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: 8,
                  width: 32,
                  height: 32,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 6,
                  opacity: 0.7,
                }}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {error && <div style={{ color: "red", marginBottom: 16 }}>{error}</div>}

          <button
            type="submit"
            className="nd-ornateBtn nd-ornateBtn--primary"
            disabled={status === "submitting"}
            style={{ width: "100%" }}
          >
            {status === "submitting" ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
