import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { authApi } from "../api";
import "./NewDraft.css";

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = React.useState("verifying"); // "verifying" | "success" | "error"
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    async function verify() {
      if (!token) {
        setStatus("error");
        setError("No verification token provided.");
        return;
      }

      try {
        await authApi.verifyEmail(token);
        setStatus("success");
      } catch (err) {
        setStatus("error");
        setError(err.message || "Invalid or expired verification link.");
      }
    }

    verify();
  }, [token]);

  return (
    <div className="nd-page">
      <div className="nd-shell" style={{ maxWidth: 480, textAlign: "center" }}>
        {status === "verifying" && (
          <>
            <h1 className="nd-title">Verifying Email...</h1>
            <p style={{ color: "rgba(0,0,0,0.65)" }}>Please wait while we verify your email address.</p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="nd-title">Email Verified!</h1>
            <p style={{ marginBottom: 24, color: "rgba(0,0,0,0.65)" }}>
              Your email has been successfully verified. You can now use all features of Sable.
            </p>
            <button
              className="nd-ornateBtn nd-ornateBtn--primary"
              onClick={() => navigate("/")}
              style={{ width: "100%" }}
            >
              Continue to Sable
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="nd-title">Verification Failed</h1>
            <p style={{ marginBottom: 24, color: "rgba(0,0,0,0.65)" }}>{error}</p>
            <p style={{ marginBottom: 24, color: "rgba(0,0,0,0.65)" }}>
              The verification link may have expired. You can request a new verification email from your{" "}
              <Link to="/settings" style={{ color: "#2d2d2d" }}>
                settings
              </Link>
              .
            </p>
            <button
              className="nd-ornateBtn nd-ornateBtn--primary"
              onClick={() => navigate("/")}
              style={{ width: "100%" }}
            >
              Go to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
