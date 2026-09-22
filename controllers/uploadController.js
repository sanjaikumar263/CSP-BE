const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const cloudinary = require('cloudinary').v2;

// Check if Cloudinary credentials are fully provided
const isCloudinaryConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

// Initialize Cloudinary if credentials are present
const initCloudinary = () => {
  if (isCloudinaryConfigured()) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
      api_key: process.env.CLOUDINARY_API_KEY.trim(),
      api_secret: process.env.CLOUDINARY_API_SECRET.trim()
    });
    return true;
  }
  return false;
};
initCloudinary();

// Ensure local uploads directory exists (for fallback or local development)
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Helper to get base URL for local uploads fallback
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

// Helper to extract clean filename from local URL, relative path, or filename
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

// Helper to extract Cloudinary public ID from URL or public_id string
const extractCloudinaryPublicId = (target) => {
  if (!target || typeof target !== 'string') return '';
  const trimmed = target.trim();

  // If it's a URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // Matches: /image/upload/(v<version>/)?(clothing-shop/sample_id).webp
    const match = trimmed.match(/\/image\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?(?:\?.*)?$/);
    if (match && match[1]) {
      return match[1];
    }
  }

  // If it's already a public_id with or without folder
  // Remove file extension if present (e.g. clothing-shop/img.webp -> clothing-shop/img)
  return trimmed.replace(/\.[^/.]+$/, '');
};

// Helper to check if string looks like a Cloudinary URL or ID
const isCloudinaryTarget = (target) => {
  if (!target || typeof target !== 'string') return false;
  return target.includes('cloudinary.com') || target.includes('clothing-shop/');
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

// Helper to delete image from Cloudinary
const deleteCloudinaryImage = async (target) => {
  const publicId = extractCloudinaryPublicId(target);
  if (!publicId) return false;

  try {
    initCloudinary();
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`☁️ Cloudinary destroy [${publicId}]:`, result);
    return result.result === 'ok' || result.result === 'not found';
  } catch (err) {
    console.error(`Failed to destroy Cloudinary image (${publicId}):`, err.message);
    return false;
  }
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

// Stream buffer upload to Cloudinary
const uploadToCloudinary = (compressedBuffer) => {
  return new Promise((resolve, reject) => {
    initCloudinary();
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'clothing-shop',
        resource_type: 'image',
        format: 'webp'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(compressedBuffer);
  });
};

// Local storage fallback for saving compressed image
const compressAndSaveImage = async (fileBuffer, originalFilename = '') => {
  const originalSize = fileBuffer.length;
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const filename = `prod-${uniqueId}.webp`;
  const destinationPath = path.join(uploadsDir, filename);

  const compressedBuffer = await compressImageBuffer(fileBuffer);
  await fs.promises.writeFile(destinationPath, compressedBuffer);

  const compressedSize = compressedBuffer.length;
  const savedBytes = Math.max(0, originalSize - compressedSize);
  const compressionRatio = originalSize > 0 
    ? `${((savedBytes / originalSize) * 100).toFixed(1)}%`
    : '0%';

  console.log(`📸 Compressed & Stored locally: ${formatBytes(originalSize)} -> ${formatBytes(compressedSize)} (${compressionRatio} saved) [${filename}]`);

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

// @desc    Upload image to Cloudinary (with Sharp compression) or local fallback
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
    const compressedBuffer = await compressImageBuffer(req.file.buffer);
    const compressedSize = compressedBuffer.length;
    const savedBytes = Math.max(0, originalSize - compressedSize);
    const compressionRatio = originalSize > 0 
      ? `${((savedBytes / originalSize) * 100).toFixed(1)}%`
      : '0%';

    const stats = {
      originalSize: formatBytes(originalSize),
      compressedSize: formatBytes(compressedSize),
      originalSizeBytes: originalSize,
      compressedSizeBytes: compressedSize,
      savedBytes: formatBytes(savedBytes),
      compressionRatio
    };

    // 1. Cloudinary Storage (Primary for Render / Production)
    if (isCloudinaryConfigured()) {
      const cloudinaryResult = await uploadToCloudinary(compressedBuffer);
      console.log(`☁️ Cloudinary upload successful: ${cloudinaryResult.secure_url} [${cloudinaryResult.public_id}]`);

      return res.status(200).json({
        success: true,
        message: 'Image compressed and stored in Cloudinary',
        url: cloudinaryResult.secure_url,
        filePath: cloudinaryResult.secure_url,
        public_id: cloudinaryResult.public_id,
        filename: cloudinaryResult.public_id,
        provider: 'cloudinary',
        stats
      });
    }

    // 2. Local Storage Fallback (Warning logged for ephemeral environments)
    console.warn('⚠️ Cloudinary not configured in .env. Saving image to local disk (note: files on Render free tier will be wiped upon restart).');
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const filename = `prod-${uniqueId}.webp`;
    const destinationPath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(destinationPath, compressedBuffer);

    const baseUrl = getBaseUrl(req);
    const imageUrl = `${baseUrl}/uploads/${filename}`;
    const filePath = `/uploads/${filename}`;

    return res.status(200).json({
      success: true,
      message: 'Image compressed and stored in local storage (Cloudinary not configured)',
      url: imageUrl,
      filePath: filePath,
      public_id: filename,
      filename: filename,
      provider: 'local',
      stats
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

// @desc    Edit/Replace image in Cloudinary or local storage with compression
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
    const compressedBuffer = await compressImageBuffer(req.file.buffer);
    const compressedSize = compressedBuffer.length;
    const savedBytes = Math.max(0, originalSize - compressedSize);
    const compressionRatio = originalSize > 0 
      ? `${((savedBytes / originalSize) * 100).toFixed(1)}%`
      : '0%';

    const stats = {
      originalSize: formatBytes(originalSize),
      compressedSize: formatBytes(compressedSize),
      originalSizeBytes: originalSize,
      compressedSizeBytes: compressedSize,
      savedBytes: formatBytes(savedBytes),
      compressionRatio
    };

    // 1. Cloudinary Storage
    if (isCloudinaryConfigured()) {
      const cloudinaryResult = await uploadToCloudinary(compressedBuffer);

      // Clean up previous image if old target was provided
      let previousDeleted = false;
      if (oldTarget) {
        if (isCloudinaryTarget(oldTarget)) {
          previousDeleted = await deleteCloudinaryImage(oldTarget);
        } else {
          // If previous image was local (legacy), clean it up locally
          previousDeleted = deleteLocalFile(oldTarget);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Image compressed, edited and uploaded to Cloudinary',
        url: cloudinaryResult.secure_url,
        filePath: cloudinaryResult.secure_url,
        public_id: cloudinaryResult.public_id,
        filename: cloudinaryResult.public_id,
        old_public_id: oldTarget || null,
        previous_deleted: previousDeleted,
        provider: 'cloudinary',
        stats
      });
    }

    // 2. Local Storage Fallback
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const filename = `prod-${uniqueId}.webp`;
    const destinationPath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(destinationPath, compressedBuffer);

    const baseUrl = getBaseUrl(req);
    const imageUrl = `${baseUrl}/uploads/${filename}`;
    const filePath = `/uploads/${filename}`;

    let oldDeleted = false;
    if (oldTarget) {
      oldDeleted = deleteLocalFile(oldTarget);
    }

    return res.status(200).json({
      success: true,
      message: 'Image compressed, edited and replaced in local storage',
      url: imageUrl,
      filePath: filePath,
      public_id: filename,
      filename: filename,
      old_public_id: oldTarget ? extractFilename(oldTarget) : null,
      previous_deleted: oldDeleted,
      provider: 'local',
      stats
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

// @desc    Delete image from Cloudinary or local storage
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

    let deleted = false;
    let provider = 'unknown';

    // 1. Try Cloudinary if target is Cloudinary or if Cloudinary is configured
    if (isCloudinaryTarget(target) || isCloudinaryConfigured()) {
      deleted = await deleteCloudinaryImage(target);
      if (deleted) {
        provider = 'cloudinary';
      }
    }

    // 2. If not deleted from Cloudinary, try deleting from local disk (legacy files)
    if (!deleted) {
      deleted = deleteLocalFile(target);
      if (deleted) {
        provider = 'local';
      }
    }

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `Image '${target}' not found or already deleted`
      });
    }

    return res.status(200).json({
      success: true,
      message: `Image deleted successfully from ${provider} storage`,
      public_id: target,
      provider
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
  extractCloudinaryPublicId,
  compressAndSaveImage,
  compressImageBuffer,
  isCloudinaryConfigured
};
