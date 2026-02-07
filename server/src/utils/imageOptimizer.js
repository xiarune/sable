const sharp = require("sharp");

// Image size presets
const IMAGE_PRESETS = {
  // Avatar sizes
  avatar: {
    small: { width: 48, height: 48 },
    medium: { width: 128, height: 128 },
    large: { width: 256, height: 256 },
  },
  // Banner/cover images
  banner: {
    width: 1200,
    height: 400,
  },
  // Work cover images
  cover: {
    small: { width: 200, height: 300 },
    medium: { width: 400, height: 600 },
    large: { width: 800, height: 1200 },
  },
  // Content images (in chapters)
  content: {
    maxWidth: 1200,
    maxHeight: 2000,
  },
};

/**
 * Optimize an image buffer
 * @param {Buffer} buffer - Image buffer
 * @param {Object} options - Optimization options
 * @returns {Promise<Buffer>} Optimized image buffer
 */
async function optimizeImage(buffer, options = {}) {
  const {
    width = null,
    height = null,
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 80,
    format = "webp", // webp provides best compression
    fit = "inside", // 'cover', 'contain', 'fill', 'inside', 'outside'
  } = options;

  let pipeline = sharp(buffer);

  // Get image metadata
  const metadata = await pipeline.metadata();

  // Determine resize dimensions
  let resizeOptions = {};

  if (width && height) {
    // Exact dimensions specified
    resizeOptions = { width, height, fit };
  } else if (width || height) {
    // Only one dimension specified
    resizeOptions = { width, height, fit: "inside" };
  } else if (metadata.width > maxWidth || metadata.height > maxHeight) {
    // Resize to fit within max dimensions
    resizeOptions = {
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    };
  }

  if (Object.keys(resizeOptions).length > 0) {
    pipeline = pipeline.resize(resizeOptions);
  }

  // Convert to specified format with quality
  switch (format) {
    case "webp":
      pipeline = pipeline.webp({ quality });
      break;
    case "jpeg":
    case "jpg":
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case "png":
      pipeline = pipeline.png({ quality, compressionLevel: 9 });
      break;
    case "avif":
      pipeline = pipeline.avif({ quality });
      break;
    default:
      pipeline = pipeline.webp({ quality });
  }

  return pipeline.toBuffer();
}

/**
 * Create multiple sizes of an image
 * @param {Buffer} buffer - Original image buffer
 * @param {string} preset - Preset name ('avatar', 'cover', etc.)
 * @returns {Promise<Object>} Object with size names as keys and buffers as values
 */
async function createImageVariants(buffer, preset) {
  const presetConfig = IMAGE_PRESETS[preset];
  if (!presetConfig) {
    throw new Error(`Unknown image preset: ${preset}`);
  }

  // Check if preset has multiple sizes
  const sizes = presetConfig.small ? Object.keys(presetConfig) : null;

  if (sizes) {
    // Multiple size variants
    const variants = {};
    for (const size of sizes) {
      const config = presetConfig[size];
      variants[size] = await optimizeImage(buffer, {
        width: config.width,
        height: config.height,
        fit: "cover",
      });
    }
    return variants;
  } else {
    // Single size
    return {
      default: await optimizeImage(buffer, {
        width: presetConfig.width || presetConfig.maxWidth,
        height: presetConfig.height || presetConfig.maxHeight,
        maxWidth: presetConfig.maxWidth,
        maxHeight: presetConfig.maxHeight,
        fit: presetConfig.width && presetConfig.height ? "cover" : "inside",
      }),
    };
  }
}

/**
 * Get image metadata
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<Object>} Image metadata
 */
async function getImageMetadata(buffer) {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    size: buffer.length,
    hasAlpha: metadata.hasAlpha,
  };
}

/**
 * Validate image dimensions and size
 * @param {Buffer} buffer - Image buffer
 * @param {Object} constraints - Validation constraints
 * @returns {Promise<Object>} Validation result
 */
async function validateImage(buffer, constraints = {}) {
  const {
    maxWidth = 4096,
    maxHeight = 4096,
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedFormats = ["jpeg", "png", "webp", "gif"],
  } = constraints;

  const metadata = await getImageMetadata(buffer);

  const errors = [];

  if (metadata.width > maxWidth) {
    errors.push(`Image width (${metadata.width}px) exceeds maximum (${maxWidth}px)`);
  }

  if (metadata.height > maxHeight) {
    errors.push(`Image height (${metadata.height}px) exceeds maximum (${maxHeight}px)`);
  }

  if (buffer.length > maxSize) {
    errors.push(`Image size (${(buffer.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum (${(maxSize / 1024 / 1024).toFixed(2)}MB)`);
  }

  if (!allowedFormats.includes(metadata.format)) {
    errors.push(`Image format (${metadata.format}) not allowed. Allowed: ${allowedFormats.join(", ")}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    metadata,
  };
}

module.exports = {
  optimizeImage,
  createImageVariants,
  getImageMetadata,
  validateImage,
  IMAGE_PRESETS,
};
