import { api } from "./client";
import API_BASE_URL from "./config";

/**
 * Spotify API client
 */
const spotifyApi = {
  /**
   * Get current access token (auto-refreshes if needed)
   */
  getToken: () => api.get("/spotify/token"),

  /**
   * Get Spotify connection status
   */
  getStatus: () => api.get("/spotify/status"),

  /**
   * Disconnect Spotify
   */
  disconnect: () => api.post("/spotify/disconnect"),

  /**
   * Open Spotify auth popup
   * Returns a promise that resolves when auth completes
   */
  connectWithPopup: () => {
    return new Promise((resolve, reject) => {
      // Calculate popup position (center of screen)
      const width = 450;
      const height = 730;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        `${API_BASE_URL}/spotify/auth`,
        "spotify-auth",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        reject(new Error("Popup blocked. Please allow popups for this site."));
        return;
      }

      let checkClosed;

      // Listen for messages from popup
      const handleMessage = (event) => {
        // Accept messages from our API server or the current origin
        const allowedHosts = ["localhost:5050", "localhost:3000"];
        const apiUrl = process.env.REACT_APP_API_URL;
        if (apiUrl) {
          try {
            allowedHosts.push(new URL(apiUrl).host);
          } catch (e) {
            // ignore invalid URL
          }
        }

        let eventHost;
        try {
          eventHost = new URL(event.origin).host;
        } catch (e) {
          return;
        }

        if (!allowedHosts.includes(eventHost)) {
          return;
        }

        const { type, error, isPremium, displayName } = event.data || {};

        if (type === "spotify-auth-success") {
          window.removeEventListener("message", handleMessage);
          if (checkClosed) clearInterval(checkClosed);
          resolve({ isPremium, displayName });
        } else if (type === "spotify-auth-error") {
          window.removeEventListener("message", handleMessage);
          if (checkClosed) clearInterval(checkClosed);
          reject(new Error(error || "Spotify authentication failed"));
        }
      };

      window.addEventListener("message", handleMessage);

      // Check if popup was closed without completing auth
      checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", handleMessage);
          reject(new Error("Authentication cancelled"));
        }
      }, 500);
    });
  },
};

export default spotifyApi;
