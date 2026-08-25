const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { uploadImage, editImage, deleteImage } = require('../controllers/uploadController');

const router = express.Router();

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname).toLowerCase() || '.png';
    const uniqueFilename = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${fileExt}`;
    cb(null, uniqueFilename);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// @route   POST /api/upload - Upload new image to local storage
router.post('/', upload.single('image'), uploadImage);

// @route   PUT /api/upload OR PUT /api/upload/* - Edit / Replace image in local storage
router.put('/', upload.single('image'), editImage);
router.put('/*', upload.single('image'), editImage);

// @route   DELETE /api/upload OR DELETE /api/upload/* - Delete image from local storage
router.delete('/', deleteImage);
router.delete('/*', deleteImage);

module.exports = router;
