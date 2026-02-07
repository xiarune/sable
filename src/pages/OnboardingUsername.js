import React from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api";
import "./NewDraft.css"; // Reuse some styles

export default function OnboardingUsername({ onLogin }) {
  const navigate = useNavigate();
  const [username, setUsername] = React.useState("");
  const [error, setError] = React.useState("");
  const [checking, setChecking] = React.useState(false);
  const [available, setAvailable] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Debounced username availability check
  React.useEffect(() => {
    if (!username || username.length < 3) {
      setAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const data = await authApi.checkUsername(username);
        setAvailable(data.available);
      } catch {
        setAvailable(null);
      } finally {
        setChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!username || username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    if (available === false) {
      setError("This username is already taken.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const data = await authApi.setUsername(username);
      onLogin(data.user);
      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to set username. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="nd-page">
      <div className="nd-shell" style={{ maxWidth: 480 }}>
        <h1 className="nd-title">Choose Your Username</h1>
        <p style={{ marginBottom: 24, color: "rgba(0,0,0,0.65)" }}>
          Welcome to Sable! Please choose a unique username to complete your account setup.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
              Username
            </label>
            <input
              className="nd-textarea"
              style={{ minHeight: 44 }}
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="your_username"
              autoFocus
              maxLength={30}
            />
            <div style={{ marginTop: 8, fontSize: 14 }}>
              {checking && <span style={{ color: "#666" }}>Checking availability...</span>}
              {!checking && available === true && (
                <span style={{ color: "green" }}>Username is available!</span>
              )}
              {!checking && available === false && (
                <span style={{ color: "red" }}>Username is already taken.</span>
              )}
            </div>
          </div>

          {error && (
            <div style={{ color: "red", marginBottom: 16 }}>{error}</div>
          )}

          <button
            type="submit"
            className="nd-ornateBtn nd-ornateBtn--primary"
            disabled={submitting || checking || available === false}
            style={{ width: "100%" }}
          >
            {submitting ? "Setting up..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
