import React from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../../api";
import "./AdminLogin.css";

export default function AdminLogin({ onLogin }) {
  const navigate = useNavigate();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }

    setLoading(true);
    try {
      const data = await adminApi.login(username.trim(), password);
      if (data.admin) {
        if (onLogin) onLogin(data.admin);
        navigate("/admin");
      }
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="adl">
      <div className="adl-container">
        <div className="adl-card">
          <div className="adl-header">
            <h1 className="adl-title">Sable Admin</h1>
            <p className="adl-subtitle">Sign in to access the admin dashboard</p>
          </div>

          <form className="adl-form" onSubmit={handleSubmit}>
            {error && (
              <div className="adl-error" role="alert">
                {error}
              </div>
            )}

            <div className="adl-field">
              <label className="adl-label" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                className="adl-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your admin username"
                autoComplete="username"
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="adl-field">
              <label className="adl-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="adl-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="adl-submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="adl-footer">
            <p className="adl-footerText">
              This is a restricted area for Sable administrators only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
