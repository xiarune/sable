import api from "./client";

/**
 * Import API - Import content from URLs and text
 */
const importApi = {
  // Import from URL (Google Docs, web pages, etc.)
  fromUrl: (url, format = "html") => api.post("/import/url", { url, format }),

  // Import from pasted text/HTML
  fromText: (text, format = "text") => api.post("/import/text", { text, format }),
};

export default importApi;
