const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Helper to get base URL for uploads
const getBaseUrl = (req) => {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.replace(/\/+$/, '');
  }
  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:5000';
  return `${protocol}://${host}`;
};

// Helper to format file sizes nicely (bytes -> KB/MB)
const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

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

// Core Image Compression Pipeline using Sharp
const compressAndSaveImage = async (fileBuffer, originalFilename = '') => {
  const originalSize = fileBuffer.length;
  
  // Unique WebP filename
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const filename = `prod-${uniqueId}.webp`;
  const destinationPath = path.join(uploadsDir, filename);

  // Sharp compression pipeline:
  // 1. rotate() uses EXIF metadata so smartphone photos are properly oriented
  // 2. resize() restricts maximum width/height to 1600px without upscaling
  // 3. webp() compresses image with quality 80 and effort 4
  const compressedBuffer = await sharp(fileBuffer)
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({
      quality: 80,
      effort: 4
    })
    .toBuffer();

  await fs.promises.writeFile(destinationPath, compressedBuffer);

  const compressedSize = compressedBuffer.length;
  const savedBytes = Math.max(0, originalSize - compressedSize);
  const compressionRatio = originalSize > 0 
    ? `${((savedBytes / originalSize) * 100).toFixed(1)}%`
    : '0%';

  console.log(`📸 Compressed & Stored: ${formatBytes(originalSize)} -> ${formatBytes(compressedSize)} (${compressionRatio} saved) [${filename}]`);

  return {
    filename,
    originalSize: formatBytes(originalSize),
    compressedSize: formatBytes(compressedSize),
    originalSizeBytes: originalSize,
    compressedSizeBytes: compressedSize,
    savedBytes: formatBytes(savedBytes),
    compressionRatio
  };
};

// @desc    Upload image to local server storage with compression
// @route   POST /api/upload
// @access  Public / Admin
const uploadImage = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded'
      });
    }

    const compressionResult = await compressAndSaveImage(req.file.buffer, req.file.originalname);
    const filename = compressionResult.filename;

    const baseUrl = getBaseUrl(req);
    const imageUrl = `${baseUrl}/uploads/${filename}`;
    const filePath = `/uploads/${filename}`;

    return res.status(200).json({
      success: true,
      message: 'Image compressed and stored successfully',
      url: imageUrl,
      filePath: filePath,
      public_id: filename,
      filename: filename,
      stats: {
        originalSize: compressionResult.originalSize,
        compressedSize: compressionResult.compressedSize,
        compressionRatio: compressionResult.compressionRatio,
        savedBytes: compressionResult.savedBytes
      }
    });
  } catch (error) {
    console.error('Error uploading and compressing image:', error);
    return res.status(500).json({
      success: false,
      message: 'Image compression and upload failed',
      error: error.message
    });
  }
};

// @desc    Edit/Replace image in local server storage with compression
// @route   PUT /api/upload OR PUT /api/upload/*
// @access  Public / Admin
const editImage = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
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

    const compressionResult = await compressAndSaveImage(req.file.buffer, req.file.originalname);
    const filename = compressionResult.filename;

    const baseUrl = getBaseUrl(req);
    const imageUrl = `${baseUrl}/uploads/${filename}`;
    const filePath = `/uploads/${filename}`;

    let oldDeleted = false;
    if (oldTarget) {
      oldDeleted = deleteLocalFile(oldTarget);
    }

    return res.status(200).json({
      success: true,
      message: 'Image compressed, edited and replaced successfully',
      url: imageUrl,
      filePath: filePath,
      public_id: filename,
      filename: filename,
      old_public_id: oldTarget ? extractFilename(oldTarget) : null,
      previous_deleted: oldDeleted,
      stats: {
        originalSize: compressionResult.originalSize,
        compressedSize: compressionResult.compressedSize,
        compressionRatio: compressionResult.compressionRatio,
        savedBytes: compressionResult.savedBytes
      }
    });
  } catch (error) {
    console.error('Error editing and compressing image:', error);
    return res.status(500).json({
      success: false,
      message: 'Image edit and compression failed',
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
  extractFilename,
  compressAndSaveImage
};
