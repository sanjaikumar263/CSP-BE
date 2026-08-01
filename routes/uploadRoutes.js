const express = require('express');
const multer = require('multer');
const { uploadImage, editImage, deleteImage } = require('../controllers/uploadController');

const router = express.Router();

// Multer memory storage configuration (in-memory buffer for Cloudinary upload)
const storage = multer.memoryStorage();
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

// @route   POST /api/upload - Upload new image to Cloudinary
router.post('/', upload.single('image'), uploadImage);

// @route   PUT /api/upload OR PUT /api/upload/* - Edit / Replace image in Cloudinary
router.put('/', upload.single('image'), editImage);
router.put('/*', upload.single('image'), editImage);

// @route   DELETE /api/upload OR DELETE /api/upload/* - Delete image from Cloudinary
router.delete('/', deleteImage);
router.delete('/*', deleteImage);

module.exports = router;
