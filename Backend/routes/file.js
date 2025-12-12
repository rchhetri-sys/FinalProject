import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import auth from '../middleware/auth.js';
import FileMeta from '../models/file.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedExt = ['.pdf', '.mp4'];
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(safeName)}`;
    cb(null, unique);
  },
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExt.includes(ext)) {
    return cb(new Error('Unsupported file type. Only .pdf and .mp4 allowed.'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter,
});

// POST /api/upload (auth)
router.post('/upload', auth, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Upload error' });
    }

    const { privacy } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!['public', 'private'].includes(privacy)) {
      return res.status(400).json({ message: 'Privacy must be public or private' });
    }

    try {
      const shareable =
        privacy === 'private' ? crypto.randomBytes(12).toString('hex') : null;

      const doc = new FileMeta({
        filename: req.file.filename,
        originalname: req.file.originalname,
        path: path.join(uploadDir, req.file.filename),
        size: req.file.size,
        privacy,
        uploaded_by: req.user.id,
        shareable_token: shareable,
      });

      await doc.save();
      res.json({ message: 'Uploaded', file: doc });
    } catch (saveErr) {
      console.error(saveErr);
      res.status(500).json({ message: 'Upload failed' });
    }
  });
});

// GET /api/public-files
router.get('/public-files', async (_req, res) => {
  const files = await FileMeta.find({ privacy: 'public' }).select('-__v');
  res.json(files);
});

// GET /api/my-files (auth)
router.get('/my-files', auth, async (req, res) => {
  const files = await FileMeta.find({ uploaded_by: req.user.id }).select('-__v');
  res.json(files);
});

// GET /api/files/:id/download
router.get('/files/:id/download', authOptional, async (req, res) => {
  const { id } = req.params;
  const shareToken = req.query.token;

  const file = await FileMeta.findById(id);
  if (!file) return res.status(404).json({ message: 'File not found' });

  const isOwner =
    req.user && file.uploaded_by.toString() === req.user.id.toString();

  if (file.privacy === 'private' && !isOwner) {
    if (!shareToken || shareToken !== file.shareable_token) {
      return res.status(403).json({ message: 'Access denied' });
    }
  }

  return res.download(path.resolve(file.path), file.originalname);
});

// DELETE /api/files/:id (auth, owner only)
router.delete('/files/:id', auth, async (req, res) => {
  const { id } = req.params;
  const file = await FileMeta.findById(id);
  if (!file) return res.status(404).json({ message: 'File not found' });
  if (file.uploaded_by.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  try {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(path.resolve(file.path));
    }
    await file.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Delete failed' });
  }
});

// Lightweight optional auth middleware for download route
function authOptional(req, _res, next) {
  const header = req.header('Authorization');
  if (!header) return next();
  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return next();

  try {
    const decoded = jwt.verify(parts[1], process.env.JWT_SECRET);
    req.user = { id: decoded.user.id };
  } catch (err) {
    // ignore invalid token on optional flow
  }
  next();
}

export default router;