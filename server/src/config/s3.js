const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Generate unique filename
function generateKey(folder, originalName) {
  const ext = originalName.split(".").pop() || "bin";
  const hash = crypto.randomBytes(16).toString("hex");
  const timestamp = Date.now();
  return `${folder}/${timestamp}-${hash}.${ext}`;
}

// Upload file to S3
async function uploadToS3(file, folder = "uploads") {
  const key = generateKey(folder, file.originalname);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3Client.send(command);

  // Return the public URL
  const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  return { key, url };
}

// Delete file from S3
async function deleteFromS3(key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

// Extract key from S3 URL
function getKeyFromUrl(url) {
  const bucketUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
  if (url.startsWith(bucketUrl)) {
    return url.replace(bucketUrl, "");
  }
  return null;
}

module.exports = {
  s3Client,
  uploadToS3,
  deleteFromS3,
  getKeyFromUrl,
  BUCKET_NAME,
};
