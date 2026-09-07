const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const env = require('../config/env');
const logger = require('../config/logger');

// Served by app.js at GET /uploads/<filename> - the fallback used when no
// Cloudinary/S3 credentials are configured. NOTE: Render's filesystem is
// ephemeral, so these files are lost on every redeploy/restart - fine for a
// live demo, not for real persistence. Swap in real credentials for that.
const LOCAL_UPLOAD_DIR = path.join(__dirname, '../../uploads');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|mp4/i;
    const ok = allowed.test(path.extname(file.originalname)) && allowed.test(file.mimetype);
    cb(ok ? null : new Error('Only JPEG/PNG/WEBP images or MP4 video are allowed'), ok);
  }
});

/**
 * Uploads a buffer to the configured media provider and returns a public URL.
 * Falls back to a local data-URL style placeholder when no provider is
 * configured, so the report/survey flow works end-to-end in a bare dev setup.
 */
async function uploadMedia(file) {
  if (env.media.provider === 'cloudinary' && env.media.cloudinary.cloudName) {
    // eslint-disable-next-line global-require
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: env.media.cloudinary.cloudName,
      api_key: env.media.cloudinary.apiKey,
      api_secret: env.media.cloudinary.apiSecret
    });
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: 'rakshanet' }, (err, res) => (
        err ? reject(err) : resolve(res)
      ));
      stream.end(file.buffer);
    });
    return { url: result.secure_url, thumbnailUrl: result.secure_url, sizeBytes: file.size, mimeType: file.mimetype };
  }

  if (env.media.provider === 's3' && env.media.aws.bucket) {
    // eslint-disable-next-line global-require
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({ region: env.media.aws.region });
    const key = `rakshanet/${crypto.randomUUID()}-${file.originalname}`;
    await s3.send(new PutObjectCommand({
      Bucket: env.media.aws.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    }));
    const url = `https://${env.media.aws.bucket}.s3.${env.media.aws.region}.amazonaws.com/${key}`;
    return { url, thumbnailUrl: url, sizeBytes: file.size, mimeType: file.mimetype };
  }

  // No cloud provider configured - write to local disk and serve it back via
  // GET /uploads/<filename> (see app.js). Actually renders in an <img>,
  // unlike the truncated base64 placeholder this replaces, which was never
  // valid image data.
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
  const ext = path.extname(file.originalname) || '.jpg';
  const filename = `${crypto.randomUUID()}${ext}`;
  fs.writeFileSync(path.join(LOCAL_UPLOAD_DIR, filename), file.buffer);
  logger.warn(`No media storage provider configured - saved '${filename}' to local disk (lost on next redeploy/restart)`);
  const url = `${env.apiBaseUrl}/uploads/${filename}`;
  return { url, thumbnailUrl: url, sizeBytes: file.size, mimeType: file.mimetype };
}

module.exports = { upload, uploadMedia };
