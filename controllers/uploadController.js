const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const path = require('path');
const fs = require('fs');

// Ensure local uploads fallback directory exists
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Helper to extract Cloudinary public_id or local filename from a string or full URL
const extractPublicId = (publicIdOrUrl) => {
  if (!publicIdOrUrl || typeof publicIdOrUrl !== 'string') return '';
  let str = publicIdOrUrl.trim();
  try {
    str = decodeURIComponent(str);
  } catch (e) {
    // Ignore decode errors
  }

  // Remove query parameters or hash fragments
  str = str.split('?')[0].split('#')[0];

  // If it's a full Cloudinary URL
  if (str.includes('res.cloudinary.com')) {
    const uploadSplit = str.split('/upload/');
    if (uploadSplit.length > 1) {
      let pathAfterUpload = uploadSplit[1];
      const segments = pathAfterUpload.split('/');
      // Filter out transformation segments (e.g. w_500, c_fill) and version segment (v12345)
      const cleanSegments = segments.filter(seg => {
        if (/^v\d+$/.test(seg)) return false;
        if (seg.includes(',') || /^[a-z]_[a-z0-9]+/i.test(seg)) return false;
        return true;
      });

      let publicIdWithExt = cleanSegments.join('/');
      const lastDotIndex = publicIdWithExt.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        return publicIdWithExt.substring(0, lastDotIndex);
      }
      return publicIdWithExt;
    }
  }

  // If relative local URL or path
  if (str.includes('/uploads/')) {
    return path.basename(str);
  }

  // If raw string has extension (e.g., clothing-shop/products/sample.jpg or sample.jpg)
  const lastDotIndex = str.lastIndexOf('.');
  if (lastDotIndex !== -1 && (str.includes('/') || str.endsWith('.png') || str.endsWith('.jpg') || str.endsWith('.jpeg') || str.endsWith('.webp'))) {
    return str.substring(0, lastDotIndex);
  }

  return str;
};

// Helper to upload buffer stream to Cloudinary
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'clothing-shop/products', ...options },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

// Helper to delete an asset from Cloudinary with fallbacks & CDN cache invalidation
const deleteFromCloudinary = async (rawTarget) => {
  if (!rawTarget) return { result: 'not found' };

  const candidates = [];
  const extracted = extractPublicId(rawTarget);
  if (extracted) candidates.push(extracted);
  if (rawTarget && rawTarget !== extracted) candidates.push(rawTarget);

  // If folder prefix is missing, add candidate with folder prefix
  if (extracted && !extracted.startsWith('clothing-shop/products/')) {
    candidates.push(`clothing-shop/products/${extracted}`);
  }

  // Deduplicate candidates
  const uniqueCandidates = [...new Set(candidates)];

  for (const pid of uniqueCandidates) {
    try {
      const res = await new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(
          pid,
          { invalidate: true, resource_type: 'image' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
      });

      console.log(`Cloudinary destroy attempt for '${pid}':`, res);
      if (res && res.result === 'ok') {
        return res;
      }
    } catch (err) {
      console.warn(`Cloudinary destroy error for '${pid}':`, err.message || err);
    }
  }

  return { result: 'not found' };
};

// Helper to delete local fallback file
const deleteLocalFile = (filenameOrPath) => {
  if (!filenameOrPath) return false;
  const basename = path.basename(filenameOrPath);
  const localFilePath = path.join(uploadsDir, basename);
  if (fs.existsSync(localFilePath)) {
    fs.unlinkSync(localFilePath);
    console.log(`📁 Deleted local fallback image: ${localFilePath}`);
    return true;
  }
  return false;
};

// @desc    Upload image to Cloudinary (or local fallback)
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

    const file = req.file;
    const fileExt = path.extname(file.originalname).toLowerCase() || '.png';
    const filename = `products/prod-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${fileExt}`;

    let imageUrl = '';
    let publicId = '';
    let uploadedToCloudinary = false;

    // Upload to Cloudinary if configured
    if (isCloudinaryConfigured) {
      try {
        const result = await uploadToCloudinary(file.buffer);
        imageUrl = result.secure_url;
        publicId = result.public_id;
        uploadedToCloudinary = true;
        console.log(`✅ Uploaded image to Cloudinary: ${imageUrl}`);
      } catch (cloudinaryError) {
        console.warn(`⚠️ Cloudinary upload failed (${cloudinaryError.message || cloudinaryError}). Falling back to local storage.`);
      }
    }

    if (!uploadedToCloudinary) {
      // Local fallback if Cloudinary credentials are not configured or failed
      const localFilePath = path.join(uploadsDir, path.basename(filename));
      fs.writeFileSync(localFilePath, file.buffer);

      const reqHost = req.get('host') || 'localhost:5000';
      const protocol = req.protocol || 'http';
      imageUrl = `${protocol}://${reqHost}/uploads/${path.basename(filename)}`;

      console.log(`📁 Saved image locally (Cloudinary fallback): ${imageUrl}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      url: imageUrl,
      public_id: publicId || filename
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

// @desc    Edit/Replace image in Cloudinary (or local fallback)
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

    const file = req.file;
    const fileExt = path.extname(file.originalname).toLowerCase() || '.png';
    const filename = `products/prod-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${fileExt}`;

    let imageUrl = '';
    let publicId = '';
    let uploadedToCloudinary = false;

    // Upload new image to Cloudinary if configured
    if (isCloudinaryConfigured) {
      try {
        const uploadResult = await uploadToCloudinary(file.buffer);
        imageUrl = uploadResult.secure_url;
        publicId = uploadResult.public_id;
        uploadedToCloudinary = true;
        console.log(`✅ Uploaded replacement image to Cloudinary: ${imageUrl}`);
      } catch (cloudinaryError) {
        console.warn(`⚠️ Cloudinary upload failed (${cloudinaryError.message || cloudinaryError}). Falling back to local storage.`);
      }
    }

    if (!uploadedToCloudinary) {
      // Local fallback
      const localFilePath = path.join(uploadsDir, path.basename(filename));
      fs.writeFileSync(localFilePath, file.buffer);

      const reqHost = req.get('host') || 'localhost:5000';
      const protocol = req.protocol || 'http';
      imageUrl = `${protocol}://${reqHost}/uploads/${path.basename(filename)}`;

      console.log(`📁 Saved replacement image locally (Cloudinary fallback): ${imageUrl}`);
    }

    // Delete old image if oldTarget provided
    let oldDeleted = false;
    if (oldTarget) {
      if (isCloudinaryConfigured) {
        const delRes = await deleteFromCloudinary(oldTarget);
        if (delRes && delRes.result === 'ok') {
          oldDeleted = true;
          console.log(`🗑️ Deleted previous Cloudinary image '${oldTarget}' during edit`);
        }
      }
      const localDel = deleteLocalFile(oldTarget) || deleteLocalFile(extractPublicId(oldTarget));
      if (localDel) oldDeleted = true;
    }

    return res.status(200).json({
      success: true,
      message: 'Image edited and replaced successfully',
      url: imageUrl,
      public_id: publicId || filename,
      old_public_id: oldTarget ? extractPublicId(oldTarget) : null,
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

// @desc    Delete image from Cloudinary (or local fallback)
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

    let cloudinaryDeleted = false;
    let localDeleted = false;
    let result = null;

    if (isCloudinaryConfigured) {
      result = await deleteFromCloudinary(target);
      if (result && result.result === 'ok') {
        cloudinaryDeleted = true;
        console.log(`🗑️ Successfully deleted from Cloudinary: '${target}'`);
      }
    }

    // Try deleting local fallback file if exists
    localDeleted = deleteLocalFile(target) || deleteLocalFile(extractPublicId(target));

    if (!cloudinaryDeleted && !localDeleted) {
      return res.status(404).json({
        success: false,
        message: `Image '${target}' not found in Cloudinary or local storage`,
        result: result || { result: 'not found' }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Image deleted successfully from Cloudinary',
      public_id: extractPublicId(target) || target,
      result: result || { result: 'ok' }
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
  extractPublicId
};
