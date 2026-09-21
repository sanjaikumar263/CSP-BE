const Banner = require('../models/Banner');
const { getBaseUrl, normalizeImageUrl, cleanStoredImageUrl } = require('../utils/urlHelper');

// @desc    Get active public banners for homepage
// @route   GET /api/banners
// @access  Public
const getPublicBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
    const baseUrl = getBaseUrl(req);
    const normalizedBanners = banners.map(b => {
      const item = b.toObject ? b.toObject() : { ...b };
      if (item.image) item.image = normalizeImageUrl(item.image, baseUrl);
      return item;
    });

    return res.status(200).json({
      success: true,
      count: normalizedBanners.length,
      data: normalizedBanners
    });
  } catch (error) {
    console.error('Error fetching public banners:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch banners',
      error: error.message
    });
  }
};

// @desc    Get all banners for admin panel
// @route   GET /api/banners/admin
// @access  Private (Admin)
const getAllBannersAdmin = async (req, res) => {
  try {
    const banners = await Banner.find({}).sort({ order: 1, createdAt: -1 });
    const baseUrl = getBaseUrl(req);
    const normalizedBanners = banners.map(b => {
      const item = b.toObject ? b.toObject() : { ...b };
      if (item.image) item.image = normalizeImageUrl(item.image, baseUrl);
      return item;
    });

    return res.status(200).json({
      success: true,
      count: normalizedBanners.length,
      data: normalizedBanners
    });
  } catch (error) {
    console.error('Error fetching admin banners:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin banners',
      error: error.message
    });
  }
};

// @desc    Create new banner slide
// @route   POST /api/banners
// @access  Private (Admin)
const createBanner = async (req, res) => {
  try {
    const { eyebrow, title, titleHighlight, subtitle, image, ctaText, ctaLink, isActive, order } = req.body;

    if (!title || !image) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least a title and an image URL'
      });
    }

    const banner = await Banner.create({
      eyebrow: eyebrow || 'AUTUMN WEAVES · 2026',
      title,
      titleHighlight: titleHighlight || '',
      subtitle: subtitle || '',
      image,
      ctaText: ctaText || 'SHOP NOW',
      ctaLink: ctaLink || '#trending',
      isActive: isActive !== undefined ? isActive : true,
      order: order !== undefined ? Number(order) : 0
    });

    return res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      data: banner
    });
  } catch (error) {
    console.error('Error creating banner:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create banner',
      error: error.message
    });
  }
};

// @desc    Update existing banner
// @route   PUT /api/banners/:id
// @access  Private (Admin)
const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    let banner = await Banner.findById(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    banner = await Banner.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });

    return res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      data: banner
    });
  } catch (error) {
    console.error('Error updating banner:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update banner',
      error: error.message
    });
  }
};

// @desc    Delete banner
// @route   DELETE /api/banners/:id
// @access  Private (Admin)
const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findById(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    await banner.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Banner deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting banner:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete banner',
      error: error.message
    });
  }
};

module.exports = {
  getPublicBanners,
  getAllBannersAdmin,
  createBanner,
  updateBanner,
  deleteBanner
};
