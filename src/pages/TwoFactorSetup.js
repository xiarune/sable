import React from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api";
import "./NewDraft.css";

export default function TwoFactorSetup() {
  const navigate = useNavigate();

  const [step, setStep] = React.useState("loading"); // "loading" | "setup" | "verify" | "backup" | "done"
  const [qrCode, setQrCode] = React.useState("");
  const [secret, setSecret] = React.useState("");
  const [token, setToken] = React.useState("");
  const [backupCodes, setBackupCodes] = React.useState([]);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showSecret, setShowSecret] = React.useState(false);

  // Check current 2FA status
  React.useEffect(() => {
    async function checkStatus() {
      try {
        const data = await authApi.get2FAStatus();
        if (data.enabled) {
          setStep("done");
        } else {
          setStep("setup");
        }
      } catch {
        setStep("setup");
      }
    }
    checkStatus();
  }, []);

  async function handleStartSetup() {
    setLoading(true);
    setError("");

    try {
      const data = await authApi.setup2FA();
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep("verify");
    } catch (err) {
      setError(err.message || "Failed to start 2FA setup");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();

    if (!token || token.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await authApi.verify2FA(token);
      setBackupCodes(data.backupCodes);
      setStep("backup");
    } catch (err) {
      setError(err.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopyBackupCodes() {
    const codesText = backupCodes.join("\n");
    navigator.clipboard.writeText(codesText);
    alert("Backup codes copied to clipboard!");
  }

  function handleDownloadBackupCodes() {
    const codesText = `Sable 2FA Backup Codes\n${"=".repeat(30)}\n\n${backupCodes.join("\n")}\n\nKeep these codes safe. Each code can only be used once.`;
    const blob = new Blob([codesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sable-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (step === "loading") {
    return (
      <div className="nd-page">
        <div className="nd-shell" style={{ maxWidth: 480, textAlign: "center" }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="nd-page">
        <div className="nd-shell" style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 className="nd-title">2FA is Enabled</h1>
          <p style={{ marginBottom: 24, color: "rgba(0,0,0,0.65)" }}>
            Two-factor authentication is already enabled on your account.
          </p>
          <button
            className="nd-ornateBtn nd-ornateBtn--primary"
            onClick={() => navigate("/settings")}
            style={{ width: "100%" }}
          >
            Back to Settings
          </button>
        </div>
      </div>
    );
  }

  if (step === "setup") {
    return (
      <div className="nd-page">
        <div className="nd-shell" style={{ maxWidth: 480 }}>
          <h1 className="nd-title">Set Up Two-Factor Authentication</h1>
          <p style={{ marginBottom: 24, color: "rgba(0,0,0,0.65)" }}>
            Add an extra layer of security to your account by requiring a code from your authenticator app when you log in.
          </p>

          <div style={{ marginBottom: 24, padding: 16, background: "rgba(0,0,0,0.05)", borderRadius: 8 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>You'll need:</h3>
            <ul style={{ margin: 0, paddingLeft: 20, color: "rgba(0,0,0,0.65)" }}>
              <li>An authenticator app (Google Authenticator, Authy, 1Password, etc.)</li>
              <li>Your phone or device with the app installed</li>
            </ul>
          </div>

          {error && <div style={{ color: "red", marginBottom: 16 }}>{error}</div>}

          <button
            className="nd-ornateBtn nd-ornateBtn--primary"
            onClick={handleStartSetup}
            disabled={loading}
            style={{ width: "100%", marginBottom: 12 }}
          >
            {loading ? "Setting up..." : "Start Setup"}
          </button>

          <button
            className="nd-ornateBtn"
            onClick={() => navigate("/settings")}
            style={{ width: "100%" }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className="nd-page">
        <div className="nd-shell" style={{ maxWidth: 480 }}>
          <h1 className="nd-title">Scan QR Code</h1>
          <p style={{ marginBottom: 16, color: "rgba(0,0,0,0.65)" }}>
            Scan this QR code with your authenticator app, then enter the 6-digit code below.
          </p>

          {qrCode && (
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <img src={qrCode} alt="2FA QR Code" style={{ maxWidth: 200 }} />
            </div>
          )}

          <div style={{ marginBottom: 16, textAlign: "center" }}>
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              style={{ background: "none", border: "none", color: "#0b3f87", cursor: "pointer", textDecoration: "underline" }}
            >
              {showSecret ? "Hide manual entry key" : "Can't scan? Enter key manually"}
            </button>
            {showSecret && (
              <div style={{ marginTop: 8, padding: 12, background: "rgba(0,0,0,0.05)", borderRadius: 8, fontFamily: "monospace", wordBreak: "break-all" }}>
                {secret}
              </div>
            )}
          </div>

          <form onSubmit={handleVerify}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                Enter 6-digit code
              </label>
              <input
                className="nd-textarea"
                style={{ minHeight: 44, textAlign: "center", fontSize: 24, letterSpacing: 8 }}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                autoFocus
                maxLength={6}
              />
            </div>

            {error && <div style={{ color: "red", marginBottom: 16 }}>{error}</div>}

            <button
              type="submit"
              className="nd-ornateBtn nd-ornateBtn--primary"
              disabled={loading || token.length !== 6}
              style={{ width: "100%", marginBottom: 12 }}
            >
              {loading ? "Verifying..." : "Verify & Enable 2FA"}
            </button>

            <button
              type="button"
              className="nd-ornateBtn"
              onClick={() => navigate("/settings")}
              style={{ width: "100%" }}
            >
              Cancel
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === "backup") {
    return (
      <div className="nd-page">
        <div className="nd-shell" style={{ maxWidth: 480 }}>
          <h1 className="nd-title">Save Your Backup Codes</h1>
          <p style={{ marginBottom: 16, color: "rgba(0,0,0,0.65)" }}>
            Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device. Each code can only be used once.
          </p>

          <div style={{ marginBottom: 16, padding: 16, background: "rgba(0,0,0,0.05)", borderRadius: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontFamily: "monospace", fontSize: 14 }}>
              {backupCodes.map((code, i) => (
                <div key={i} style={{ padding: 8, background: "white", borderRadius: 4, textAlign: "center" }}>
                  {code}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              className="nd-ornateBtn"
              onClick={handleCopyBackupCodes}
              style={{ flex: 1 }}
            >
              Copy Codes
            </button>
            <button
              className="nd-ornateBtn"
              onClick={handleDownloadBackupCodes}
              style={{ flex: 1 }}
            >
              Download
            </button>
          </div>

          <button
            className="nd-ornateBtn nd-ornateBtn--primary"
            onClick={() => navigate("/settings")}
            style={{ width: "100%" }}
          >
            I've Saved My Codes
          </button>
        </div>
      </div>
    );
  }

  return null;
}
