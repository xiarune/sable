const express = require("express");
const crypto = require("crypto");
const { requireAuth } = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

// Spotify OAuth config
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "d98f6d7dd1ca495ea14e47ba4954ed0b";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "8c93b168294c4e82b899f33cd20e84f3";
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || "http://localhost:5050/api/spotify/callback";
const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
].join(" ");

// Generate random state for CSRF protection
function generateState() {
  return crypto.randomBytes(16).toString("hex");
}

// GET /spotify/auth - Initiate Spotify OAuth (opens in popup)
router.get("/auth", (req, res, next) => {
  // Custom auth check that shows a proper error page instead of JSON
  const jwt = require("jsonwebtoken");
  const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-me";
  const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

  const token = req.cookies.token;
  if (!token) {
    return res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'spotify-auth-error', error: 'not_authenticated' }, '${clientOrigin}');
              window.close();
            } else {
              document.body.innerHTML = '<p>Please log in first, then try connecting Spotify again.</p>';
            }
          </script>
        </body>
      </html>
    `);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
  } catch (err) {
    return res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'spotify-auth-error', error: 'invalid_token' }, '${clientOrigin}');
              window.close();
            } else {
              document.body.innerHTML = '<p>Session expired. Please log in again.</p>';
            }
          </script>
        </body>
      </html>
    `);
  }

  const state = generateState();

  // Store state in session/cookie for verification
  res.cookie("spotify_auth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 10 * 60 * 1000, // 10 minutes
  });

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: SPOTIFY_SCOPES,
    state,
    show_dialog: "true", // Always show auth dialog
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

// GET /spotify/callback - Handle OAuth callback
router.get("/callback", async (req, res) => {
  const { code, state, error } = req.query;
  const storedState = req.cookies.spotify_auth_state;
  const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

  // Helper to send error to popup
  const sendError = (errorMsg) => {
    return res.send(`
      <html>
        <body>
          <p>Error: ${errorMsg}</p>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({ type: 'spotify-auth-error', error: '${errorMsg}' }, '${clientOrigin}');
                window.close();
              }
            } catch (e) {}
          </script>
        </body>
      </html>
    `);
  };

  // Verify user is authenticated
  const jwt = require("jsonwebtoken");
  const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-me";
  const token = req.cookies.token;

  if (!token) {
    console.error("Spotify callback: No auth token cookie");
    return sendError("not_authenticated");
  }

  let userId;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    userId = decoded.userId;
  } catch (err) {
    console.error("Spotify callback: Invalid token", err.message);
    return sendError("invalid_token");
  }

  // Clear the state cookie
  res.clearCookie("spotify_auth_state");

  // Check for errors from Spotify
  if (error) {
    return sendError(error);
  }

  // Verify state to prevent CSRF
  if (!state || state !== storedState) {
    return sendError("state_mismatch");
  }

  try {
    // Log what we're using (mask secrets)
    console.log("Spotify token exchange attempt:");
    console.log("  Client ID:", SPOTIFY_CLIENT_ID ? SPOTIFY_CLIENT_ID.slice(0, 8) + "..." : "NOT SET");
    console.log("  Redirect URI:", SPOTIFY_REDIRECT_URI);

    // Exchange code for tokens
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
      }),
    });

    // Get response as text first to see what Spotify returns
    const responseText = await tokenResponse.text();

    if (!tokenResponse.ok) {
      console.error("Spotify token exchange failed. Status:", tokenResponse.status);
      console.error("Response:", responseText.slice(0, 500));
      throw new Error("Token exchange failed: " + tokenResponse.status);
    }

    // Parse the successful response
    let tokens;
    try {
      tokens = JSON.parse(responseText);
      console.log("Token exchange successful, got access token:", tokens.access_token ? "yes" : "no");
    } catch (e) {
      console.error("Failed to parse Spotify response as JSON:", responseText.slice(0, 500));
      throw new Error("Invalid response from Spotify");
    }

    // Get user profile to check Premium status
    console.log("Fetching Spotify user profile...");
    const profileResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        "Authorization": `Bearer ${tokens.access_token}`,
      },
    });

    const profileText = await profileResponse.text();
    console.log("Profile response status:", profileResponse.status);

    let profile;
    try {
      profile = JSON.parse(profileText);
    } catch (e) {
      console.error("Failed to parse profile response:", profileText.slice(0, 500));
      throw new Error("Failed to get Spotify profile");
    }

    // Store tokens in user document
    await User.findByIdAndUpdate(userId, {
      "providers.spotify": {
        spotifyId: profile.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        displayName: profile.display_name,
        email: profile.email,
        isPremium: profile.product === "premium",
        connectedAt: new Date(),
      },
    });

    // Send success message to opener and close popup
    const safeDisplayName = (profile.display_name || "").replace(/['"\\<>]/g, "");
    res.send(`
      <html>
        <body>
          <p>Connected to Spotify! This window should close automatically.</p>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'spotify-auth-success',
                  isPremium: ${profile.product === "premium"},
                  displayName: '${safeDisplayName}'
                }, '${clientOrigin}');
                window.close();
              } else {
                document.body.innerHTML = '<p>Success! You can close this window and return to the app.</p>';
              }
            } catch (e) {
              document.body.innerHTML = '<p>Success! You can close this window and return to the app.</p>';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("Spotify OAuth error:", err);
    return sendError("token_exchange_failed");
  }
});

// GET /spotify/token - Get current access token (auto-refreshes if needed)
router.get("/token", requireAuth, async (req, res) => {
  const spotify = req.user.providers?.spotify;

  if (!spotify?.refreshToken) {
    return res.status(404).json({ error: "Spotify not connected" });
  }

  // Check if token is expired or will expire in next 5 minutes
  const bufferMs = 5 * 60 * 1000;
  const isExpired = !spotify.tokenExpiresAt || spotify.tokenExpiresAt < new Date(Date.now() + bufferMs);

  if (isExpired) {
    try {
      // Refresh the token
      const refreshResponse = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64"),
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: spotify.refreshToken,
        }),
      });

      if (!refreshResponse.ok) {
        // Refresh token is invalid, user needs to reconnect
        await User.findByIdAndUpdate(req.user._id, {
          $unset: { "providers.spotify": 1 },
        });
        return res.status(401).json({ error: "Spotify session expired. Please reconnect." });
      }

      const tokens = await refreshResponse.json();

      // Update tokens in database
      const updateData = {
        "providers.spotify.accessToken": tokens.access_token,
        "providers.spotify.tokenExpiresAt": new Date(Date.now() + tokens.expires_in * 1000),
      };

      // Spotify may return a new refresh token
      if (tokens.refresh_token) {
        updateData["providers.spotify.refreshToken"] = tokens.refresh_token;
      }

      await User.findByIdAndUpdate(req.user._id, updateData);

      return res.json({ accessToken: tokens.access_token });
    } catch (err) {
      console.error("Spotify token refresh error:", err);
      return res.status(500).json({ error: "Failed to refresh Spotify token" });
    }
  }

  return res.json({ accessToken: spotify.accessToken });
});

// GET /spotify/status - Check Spotify connection status
router.get("/status", requireAuth, (req, res) => {
  const spotify = req.user.providers?.spotify;

  if (!spotify?.refreshToken) {
    return res.json({ connected: false });
  }

  return res.json({
    connected: true,
    displayName: spotify.displayName,
    isPremium: spotify.isPremium,
    connectedAt: spotify.connectedAt,
  });
});

// POST /spotify/disconnect - Remove Spotify connection
router.post("/disconnect", requireAuth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $unset: { "providers.spotify": 1 },
    });

    res.json({ message: "Spotify disconnected successfully" });
  } catch (err) {
    console.error("Spotify disconnect error:", err);
    res.status(500).json({ error: "Failed to disconnect Spotify" });
  }
});

module.exports = router;
