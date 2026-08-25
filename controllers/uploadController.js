const path = require('path');
const fs = require('fs');

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Helper to extract clean filename from URL, relative path, or filename
const extractFilename = (target) => {
  if (!target || typeof target !== 'string') return '';
  let str = target.trim();
  try {
    str = decodeURIComponent(str);
  } catch (e) {
    // Ignore decode errors
  }
  // Remove query parameters or hash fragments
  str = str.split('?')[0].split('#')[0];
  return path.basename(str);
};

// Helper to delete local file from public/uploads
const deleteLocalFile = (filenameOrPath) => {
  if (!filenameOrPath) return false;
  const basename = extractFilename(filenameOrPath);
  if (!basename) return false;

  const localFilePath = path.join(uploadsDir, basename);
  if (fs.existsSync(localFilePath)) {
    try {
      fs.unlinkSync(localFilePath);
      console.log(`📁 Deleted local image: ${localFilePath}`);
      return true;
    } catch (err) {
      console.error(`Failed to delete local image ${localFilePath}:`, err.message);
      return false;
    }
  }
  return false;
};

// @desc    Upload image to local server storage
// @route   POST /api/upload
// @access  Public / Admin
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const filename = req.file.filename;
    const reqHost = req.get('host') || 'localhost:5000';
    const protocol = req.protocol || 'http';
    const imageUrl = `${protocol}://${reqHost}/uploads/${filename}`;
    const filePath = `/uploads/${filename}`;

    console.log(`✅ Uploaded image locally via Multer: ${imageUrl}`);

    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      url: imageUrl,
      filePath: filePath,
      public_id: filename,
      filename: filename
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return res.status(500).json({
      success: false,
      message: 'Image upload failed',
      error: error.message
    });
  }
};

// @desc    Edit/Replace image in local server storage
// @route   PUT /api/upload OR PUT /api/upload/*
// @access  Public / Admin
const editImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No new image file uploaded for edit'
      });
    }

    let oldTarget = req.body.old_public_id || req.body.oldPublicId || req.body.public_id || req.body.publicId || req.body.url || req.query.old_public_id || req.query.public_id;
    if (!oldTarget && req.params && req.params[0]) {
      oldTarget = req.params[0];
    } else if (!oldTarget && req.params && req.params.public_id) {
      oldTarget = req.params.public_id;
    }

    const filename = req.file.filename;
    const reqHost = req.get('host') || 'localhost:5000';
    const protocol = req.protocol || 'http';
    const imageUrl = `${protocol}://${reqHost}/uploads/${filename}`;
    const filePath = `/uploads/${filename}`;

    console.log(`✅ Replacement image uploaded locally: ${imageUrl}`);

    let oldDeleted = false;
    if (oldTarget) {
      oldDeleted = deleteLocalFile(oldTarget);
    }

    return res.status(200).json({
      success: true,
      message: 'Image edited and replaced successfully',
      url: imageUrl,
      filePath: filePath,
      public_id: filename,
      filename: filename,
      old_public_id: oldTarget ? extractFilename(oldTarget) : null,
      previous_deleted: oldDeleted
    });
  } catch (error) {
    console.error('Error editing image:', error);
    return res.status(500).json({
      success: false,
      message: 'Image edit failed',
      error: error.message
    });
  }
};

// @desc    Delete image from local server storage
// @route   DELETE /api/upload OR DELETE /api/upload/*
// @access  Public / Admin
const deleteImage = async (req, res) => {
  try {
    let target = req.body.public_id || req.body.publicId || req.body.url || req.query.public_id || req.query.url;

    if (!target && req.params && req.params[0]) {
      target = req.params[0];
    } else if (!target && req.params && req.params.public_id) {
      target = req.params.public_id;
    }

    if (!target) {
      return res.status(400).json({
        success: false,
        message: 'Please provide public_id, url, or image path to delete'
      });
    }

    const filename = extractFilename(target);
    const deleted = deleteLocalFile(target);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `Image file '${filename}' not found in local storage`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Image deleted successfully from local storage',
      public_id: filename,
      filename: filename
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error.message
    });
  }
};

module.exports = {
  uploadImage,
  editImage,
  deleteImage,
  extractFilename
};
