const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const logger = require('../config/logger');

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

  logger.warn('No media storage provider configured - returning inline placeholder URL');
  return {
    url: `data:${file.mimetype};base64,${file.buffer.toString('base64').slice(0, 100)}...(local-dev-placeholder)`,
    thumbnailUrl: null,
    sizeBytes: file.size,
    mimeType: file.mimetype
  };
}

module.exports = { upload, uploadMedia };
