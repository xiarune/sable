import React from "react";
import { Link } from "react-router-dom";
import { authApi } from "../api";
import "./NewDraft.css";

export default function ForgotPassword() {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState("idle"); // "idle" | "submitting" | "sent"
  const [error, setError] = React.useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    setStatus("submitting");
    setError("");

    try {
      await authApi.forgotPassword(trimmedEmail);
      setStatus("sent");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      <div className="nd-page">
        <div className="nd-shell" style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 className="nd-title">Check Your Email</h1>
          <p style={{ marginBottom: 24, color: "rgba(0,0,0,0.65)" }}>
            If an account exists with that email address, we've sent a password reset link. Please check your inbox
            (and spam folder) for the reset email.
          </p>
          <p style={{ color: "rgba(0,0,0,0.65)" }}>
            <Link to="/" style={{ color: "#2d2d2d" }}>
              Return to Home
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="nd-page">
      <div className="nd-shell" style={{ maxWidth: 480 }}>
        <h1 className="nd-title">Reset Your Password</h1>
        <p style={{ marginBottom: 24, color: "rgba(0,0,0,0.65)" }}>
          Enter the email address associated with your account and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>Email</label>
            <input
              className="nd-textarea"
              style={{ minHeight: 44 }}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
            />
          </div>

          {error && <div style={{ color: "red", marginBottom: 16 }}>{error}</div>}

          <button
            type="submit"
            className="nd-ornateBtn nd-ornateBtn--primary"
            disabled={status === "submitting"}
            style={{ width: "100%", marginBottom: 16 }}
          >
            {status === "submitting" ? "Sending..." : "Send Reset Link"}
          </button>

          <p style={{ textAlign: "center", color: "rgba(0,0,0,0.65)" }}>
            Remember your password?{" "}
            <Link to="/" style={{ color: "#2d2d2d" }}>
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
