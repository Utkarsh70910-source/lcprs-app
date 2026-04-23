const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Detect any placeholder value in Cloudinary config
const isCloudinaryConfigured = (() => {
  const name = process.env.CLOUDINARY_CLOUD_NAME || '';
  const key  = process.env.CLOUDINARY_API_KEY    || '';
  const sec  = process.env.CLOUDINARY_API_SECRET  || '';
  return (
    name && key && sec &&
    !name.startsWith('your_') &&
    !key.startsWith('your_') &&
    !sec.startsWith('your_')
  );
})();

// Storage configuration — disk when Cloudinary is not set up
const storage = isCloudinaryConfigured
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/reports');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        cb(null, `${unique}${path.extname(file.originalname)}`);
      },
    });

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }, // 10MB, max 5 files
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Helper: upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `lcprs/${folder}`, resource_type: 'image' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });

// POST /api/upload
router.post('/', authenticate, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No images provided' });
    }

    let images;
    if (isCloudinaryConfigured) {
      const uploadPromises = req.files.map((file) =>
        uploadToCloudinary(file.buffer, 'reports')
      );
      const results = await Promise.all(uploadPromises);
      images = results.map((r) => ({ url: r.secure_url, publicId: r.public_id }));
    } else {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      images = req.files.map((file) => ({
        url: `${baseUrl}/uploads/reports/${file.filename}`,
        publicId: file.filename,
      }));
      console.log(`📁 Local storage upload: ${req.files.length} file(s) saved`);
    }

    res.json({ success: true, images });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: err.message || 'Upload failed' });
  }
});

// DELETE /api/upload/:publicId
router.delete('/:publicId', authenticate, async (req, res) => {
  try {
    const publicId = decodeURIComponent(req.params.publicId);
    
    if (isCloudinaryConfigured) {
      await cloudinary.uploader.destroy(publicId);
    } else {
      const filePath = path.join(__dirname, '../uploads/reports', publicId);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    
    res.json({ success: true, message: 'Image deleted' });
  } catch (err) {
    console.error('Delete upload error:', err);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

module.exports = router;
