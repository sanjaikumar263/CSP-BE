const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { uploadImage, editImage, deleteImage, serveImage } = require('../controllers/uploadController');

const router = express.Router();

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer memory storage configuration (images are held in memory buffer and compressed with sharp before saving)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // Allow up to 25MB raw image upload
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// @route   POST /api/upload - Upload new image to local storage with compression
router.post('/', upload.single('image'), uploadImage);

// @route   PUT /api/upload OR PUT /api/upload/* - Edit / Replace image in local storage with compression
router.put('/', upload.single('image'), editImage);
router.put('/*', upload.single('image'), editImage);

// @route   DELETE /api/upload OR DELETE /api/upload/* - Delete image from local storage
router.delete('/', deleteImage);
router.delete('/*', deleteImage);

// @route   GET /api/upload/:filename - Retrieve image from local cache or MongoDB
router.get('/:filename', serveImage);
router.get('/*', serveImage);

module.exports = router;
