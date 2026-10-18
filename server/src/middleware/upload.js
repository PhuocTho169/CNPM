const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config');

const ALLOWED = {
  images: {
    mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    exts: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  },
  audio: {
    mimes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac'],
    exts: ['.mp3', '.wav', '.m4a', '.aac'],
  },
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function makeStorage(subfolder) {
  return multer.diskStorage({
    destination(req, file, cb) {
      const dir = path.join(config.uploadDir, subfolder);
      ensureDir(dir);
      cb(null, dir);
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
  });
}

function fileFilter(kind) {
  const rules = ALLOWED[kind];
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (rules.mimes.includes(file.mimetype) && rules.exts.includes(ext)) return cb(null, true);
    return cb(new Error(`INVALID_FILE_TYPE: allowed ${rules.exts.join(', ')}`));
  };
}

const uploadImage = multer({
  storage: makeStorage('images'),
  fileFilter: fileFilter('images'),
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('image');

const uploadAudio = multer({
  storage: makeStorage('audio'),
  fileFilter: fileFilter('audio'),
  limits: { fileSize: 25 * 1024 * 1024 },
}).single('audio');

function runUpload(kind) {
  const handler = kind === 'audio' ? uploadAudio : uploadImage;
  return (req, res, next) => {
    handler(req, res, (err) => {
      if (err) {
        const message = err.message || 'File upload failed.';
        return res.status(400).json({
          success: false,
          code: message.startsWith('INVALID_FILE_TYPE') ? 'INVALID_FILE_TYPE' : 'UPLOAD_ERROR',
          message: message.startsWith('INVALID_FILE_TYPE')
            ? 'File type not allowed. Images: jpg/png/webp/gif. Audio: mp3/wav/m4a/aac.'
            : message,
        });
      }
      return next();
    });
  };
}

module.exports = { runUpload, ensureDir };
