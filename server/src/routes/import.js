const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const logger = require("../utils/logger");

const router = express.Router();

// All import routes require authentication
router.use(requireAuth);

// URL validation
const importUrlSchema = z.object({
  url: z.string().url(),
  format: z.enum(["html", "text", "markdown"]).optional().default("html"),
});

// Helper to clean HTML to text
function htmlToText(html) {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  // Replace common block elements with newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n\n");

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // Clean up whitespace
  text = text.replace(/\r\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();

  return text;
}

// Helper to extract content from Google Docs published URL
async function fetchGoogleDocsContent(url) {
  // Convert edit URL to published HTML export if needed
  const docIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!docIdMatch) {
    throw new Error("Could not parse Google Docs URL");
  }

  const docId = docIdMatch[1];
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=html`;

  const response = await fetch(exportUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Sable/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Google Doc. Make sure it's publicly accessible.");
  }

  return await response.text();
}

// POST /import/url - Import content from URL
router.post("/url", async (req, res, next) => {
  try {
    const validation = importUrlSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.errors[0].message,
      });
    }

    const { url, format } = validation.data;
    let content = "";
    let title = "";

    // Handle different URL types
    if (url.includes("docs.google.com")) {
      // Google Docs
      const html = await fetchGoogleDocsContent(url);
      content = htmlToText(html);

      // Try to extract title from first line
      const lines = content.split("\n").filter((l) => l.trim());
      if (lines.length > 0) {
        title = lines[0].substring(0, 200);
      }
    } else {
      // Generic URL fetch
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Sable/1.0)",
          Accept: "text/html,text/plain,*/*",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";
      const text = await response.text();

      if (contentType.includes("text/html") || format === "html") {
        content = htmlToText(text);
      } else {
        content = text;
      }

      // Try to extract title
      const titleMatch = text.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        title = titleMatch[1].trim().substring(0, 200);
      }
    }

    logger.info("Content imported from URL", {
      userId: req.user._id,
      url: url.substring(0, 100),
      contentLength: content.length,
    });

    res.json({
      message: "Content imported successfully",
      content,
      title,
      wordCount: content.trim().split(/\s+/).filter(Boolean).length,
    });
  } catch (err) {
    logger.error("Import failed", { error: err.message });
    res.status(400).json({
      error: err.message || "Failed to import content",
    });
  }
});

// POST /import/text - Import from pasted text
router.post("/text", async (req, res, next) => {
  try {
    const { text, format = "text" } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text content is required" });
    }

    let content = text;

    if (format === "html") {
      content = htmlToText(text);
    }

    // Try to extract title from first line
    const lines = content.split("\n").filter((l) => l.trim());
    const title = lines.length > 0 ? lines[0].substring(0, 200) : "";

    res.json({
      message: "Content processed successfully",
      content,
      title,
      wordCount: content.trim().split(/\s+/).filter(Boolean).length,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
