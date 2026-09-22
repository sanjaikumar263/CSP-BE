const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const Image = require('../models/Image');

// Ensure local uploads cache directory exists
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
  str = str.split('?')[0].split('#')[0];
  return path.basename(str);
};

// Helper to delete local cache file from public/uploads
const deleteLocalFile = (filenameOrPath) => {
  if (!filenameOrPath) return false;
  const basename = extractFilename(filenameOrPath);
  if (!basename) return false;

  const localFilePath = path.join(uploadsDir, basename);
  if (fs.existsSync(localFilePath)) {
    try {
      fs.unlinkSync(localFilePath);
      console.log(`📁 Deleted local cache image: ${localFilePath}`);
      return true;
    } catch (err) {
      console.error(`Failed to delete local cache image ${localFilePath}:`, err.message);
      return false;
    }
  }
  return false;
};

// Core Image Compression Pipeline using Sharp
const compressImageBuffer = async (fileBuffer) => {
  return await sharp(fileBuffer)
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
};

// Save compressed buffer to both MongoDB (permanent) and local disk (fast cache)
const saveImagePermanently = async (compressedBuffer, filename) => {
  // 1. Save permanently to MongoDB
  await Image.findOneAndUpdate(
    { filename },
    {
      filename,
      contentType: 'image/webp',
      data: compressedBuffer,
      size: compressedBuffer.length
    },
    { upsert: true, new: true }
  );

  // 2. Write to local disk cache
  const localFilePath = path.join(uploadsDir, filename);
  try {
    await fs.promises.writeFile(localFilePath, compressedBuffer);
  } catch (fsErr) {
    console.warn(`Local disk cache write failed (safe to ignore on serverless): ${fsErr.message}`);
  }
};

// Backward-compatible helper
const compressAndSaveImage = async (fileBuffer, originalFilename = '') => {
  const originalSize = fileBuffer.length;
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const filename = `prod-${uniqueId}.webp`;

  const compressedBuffer = await compressImageBuffer(fileBuffer);
  await saveImagePermanently(compressedBuffer, filename);

  const compressedSize = compressedBuffer.length;
  const savedBytes = Math.max(0, originalSize - compressedSize);
  const compressionRatio = originalSize > 0 
    ? `${((savedBytes / originalSize) * 100).toFixed(1)}%`
    : '0%';

  console.log(`📸 Compressed & Stored in MongoDB: ${formatBytes(originalSize)} -> ${formatBytes(compressedSize)} (${compressionRatio} saved) [${filename}]`);

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

// @desc    Upload image to MongoDB Atlas with compression
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

    const originalSize = req.file.buffer.length;
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const filename = `prod-${uniqueId}.webp`;

    // 1. Compress with Sharp
    const compressedBuffer = await compressImageBuffer(req.file.buffer);

    // 2. Save permanently to MongoDB Atlas & local cache
    await saveImagePermanently(compressedBuffer, filename);

    const compressedSize = compressedBuffer.length;
    const savedBytes = Math.max(0, originalSize - compressedSize);
    const compressionRatio = originalSize > 0 
      ? `${((savedBytes / originalSize) * 100).toFixed(1)}%`
      : '0%';

    const baseUrl = getBaseUrl(req);
    const imageUrl = `${baseUrl}/uploads/${filename}`;
    const filePath = `/uploads/${filename}`;

    console.log(`💾 Image saved to MongoDB: ${filename} (${formatBytes(compressedSize)})`);

    return res.status(200).json({
      success: true,
      message: 'Image compressed and stored permanently in database',
      url: imageUrl,
      filePath: filePath,
      public_id: filename,
      filename: filename,
      stats: {
        originalSize: formatBytes(originalSize),
        compressedSize: formatBytes(compressedSize),
        compressionRatio,
        savedBytes: formatBytes(savedBytes)
      }
    });
  } catch (error) {
    console.error('Error uploading and storing image:', error);
    return res.status(500).json({
      success: false,
      message: 'Image upload and database storage failed',
      error: error.message
    });
  }
};

// @desc    Edit/Replace image in MongoDB storage with compression
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

    const originalSize = req.file.buffer.length;
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const filename = `prod-${uniqueId}.webp`;

    // 1. Compress with Sharp
    const compressedBuffer = await compressImageBuffer(req.file.buffer);

    // 2. Save new image to MongoDB & local cache
    await saveImagePermanently(compressedBuffer, filename);

    // 3. Delete old image from MongoDB and local cache
    let oldDeleted = false;
    if (oldTarget) {
      const oldFilename = extractFilename(oldTarget);
      if (oldFilename) {
        const dbDel = await Image.deleteOne({ filename: oldFilename });
        const localDel = deleteLocalFile(oldFilename);
        oldDeleted = dbDel.deletedCount > 0 || localDel;
        if (oldDeleted) {
          console.log(`🗑️ Replaced & deleted old image from MongoDB: ${oldFilename}`);
        }
      }
    }

    const compressedSize = compressedBuffer.length;
    const savedBytes = Math.max(0, originalSize - compressedSize);
    const compressionRatio = originalSize > 0 
      ? `${((savedBytes / originalSize) * 100).toFixed(1)}%`
      : '0%';

    const baseUrl = getBaseUrl(req);
    const imageUrl = `${baseUrl}/uploads/${filename}`;
    const filePath = `/uploads/${filename}`;

    return res.status(200).json({
      success: true,
      message: 'Image compressed, edited and stored permanently in database',
      url: imageUrl,
      filePath: filePath,
      public_id: filename,
      filename: filename,
      old_public_id: oldTarget ? extractFilename(oldTarget) : null,
      previous_deleted: oldDeleted,
      stats: {
        originalSize: formatBytes(originalSize),
        compressedSize: formatBytes(compressedSize),
        compressionRatio,
        savedBytes: formatBytes(savedBytes)
      }
    });
  } catch (error) {
    console.error('Error editing and replacing image:', error);
    return res.status(500).json({
      success: false,
      message: 'Image edit and replacement failed',
      error: error.message
    });
  }
};

// @desc    Delete image from MongoDB storage and local cache
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
    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image identifier'
      });
    }

    // 1. Delete from MongoDB
    const dbResult = await Image.deleteOne({ filename });

    // 2. Delete from local cache
    const localDeleted = deleteLocalFile(filename);

    if (dbResult.deletedCount === 0 && !localDeleted) {
      return res.status(404).json({
        success: false,
        message: `Image '${filename}' not found in database or local storage`
      });
    }

    console.log(`🗑️ Deleted image from database & cache: ${filename}`);

    return res.status(200).json({
      success: true,
      message: 'Image deleted successfully from database storage',
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

// @desc    Serve image from local disk cache or retrieve from MongoDB if wiped (fixes Render 404)
// @route   GET /uploads/:filename
// @access  Public
const serveImage = async (req, res) => {
  try {
    const filename = extractFilename(req.params.filename || req.params[0] || req.path);
    if (!filename) {
      return res.status(400).send('Invalid image request');
    }

    const localFilePath = path.join(uploadsDir, filename);

    // 1. If file exists in local cache, stream it directly
    if (fs.existsSync(localFilePath)) {
      return res.sendFile(localFilePath, {
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    }

    // 2. If missing on disk (Render restarted or container wiped), fetch from MongoDB Atlas!
    const imageDoc = await Image.findOne({ filename });
    if (!imageDoc || !imageDoc.data) {
      return res.status(404).send('Image Not Found');
    }

    // 3. Write back to local cache asynchronously so subsequent requests are instant
    fs.writeFile(localFilePath, imageDoc.data, (writeErr) => {
      if (writeErr) {
        // Non-fatal if local disk is read-only
      }
    });

    // 4. Send image buffer with proper headers
    res.set({
      'Content-Type': imageDoc.contentType || 'image/webp',
      'Content-Length': imageDoc.data.length,
      'Cache-Control': 'public, max-age=31536000, immutable'
    });

    return res.send(imageDoc.data);
  } catch (error) {
    console.error(`Error serving image '${req.params.filename}':`, error);
    return res.status(500).send('Error serving image');
  }
};

module.exports = {
  uploadImage,
  editImage,
  deleteImage,
  serveImage,
  extractFilename,
  compressAndSaveImage,
  compressImageBuffer,
  saveImagePermanently
};
