const Offer = require('../models/Offer');
const { getBaseUrl, normalizeImageUrl, cleanStoredImageUrl } = require('../utils/urlHelper');

// @desc    Get all active public offers for storefront
// @route   GET /api/offers
// @access  Public
const getPublicOffers = async (req, res) => {
  try {
    const offers = await Offer.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
    const baseUrl = getBaseUrl(req);
    const normalizedOffers = offers.map(o => {
      const item = o.toObject ? o.toObject() : { ...o };
      if (item.image) item.image = normalizeImageUrl(item.image, baseUrl);
      return item;
    });

    res.status(200).json({
      success: true,
      count: normalizedOffers.length,
      data: normalizedOffers
    });
  } catch (error) {
    console.error('Error fetching public offers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching offers'
    });
  }
};

// @desc    Get all offers for admin dashboard
// @route   GET /api/offers/admin
// @access  Private/Admin
const getAllOffersAdmin = async (req, res) => {
  try {
    const offers = await Offer.find({}).sort({ order: 1, createdAt: -1 });
    const baseUrl = getBaseUrl(req);
    const normalizedOffers = offers.map(o => {
      const item = o.toObject ? o.toObject() : { ...o };
      if (item.image) item.image = normalizeImageUrl(item.image, baseUrl);
      return item;
    });

    res.status(200).json({
      success: true,
      count: normalizedOffers.length,
      data: normalizedOffers
    });
  } catch (error) {
    console.error('Error fetching admin offers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching admin offers'
    });
  }
};

// @desc    Create new offer
// @route   POST /api/offers
// @access  Private/Admin
const createOffer = async (req, res) => {
  try {
    const {
      badge,
      title,
      subtitle,
      discountText,
      code,
      image,
      ctaText,
      ctaLink,
      validTill,
      isActive,
      order
    } = req.body;

    if (!title || !image) {
      return res.status(400).json({
        success: false,
        message: 'Offer title and image URL are required'
      });
    }

    const offer = await Offer.create({
      badge: badge || 'FESTIVE SPECIAL',
      title,
      subtitle: subtitle || '',
      discountText: discountText || '30% OFF',
      code: code || 'SILK30',
      image,
      ctaText: ctaText || 'SHOP THE OFFER',
      ctaLink: ctaLink || '/products?category=Sarees',
      validTill: validTill || 'Valid till 30th Sept 2026',
      isActive: isActive !== undefined ? isActive : true,
      order: order !== undefined ? Number(order) : 0
    });

    res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      data: offer
    });
  } catch (error) {
    console.error('Error creating offer:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error creating offer'
    });
  }
};

// @desc    Update an existing offer
// @route   PUT /api/offers/:id
// @access  Private/Admin
const updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    let offer = await Offer.findById(id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    offer = await Offer.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Offer updated successfully',
      data: offer
    });
  } catch (error) {
    console.error('Error updating offer:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating offer'
    });
  }
};

// @desc    Toggle offer active status (ON/OFF)
// @route   PATCH /api/offers/:id/toggle
// @access  Private/Admin
const toggleOfferStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findById(id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    offer.isActive = !offer.isActive;
    await offer.save();

    res.status(200).json({
      success: true,
      message: `Offer status changed to ${offer.isActive ? 'Active (ON)' : 'Inactive (OFF)'}`,
      data: offer
    });
  } catch (error) {
    console.error('Error toggling offer status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error toggling offer status'
    });
  }
};

// @desc    Delete an offer
// @route   DELETE /api/offers/:id
// @access  Private/Admin
const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findById(id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    await offer.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Offer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting offer:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting offer'
    });
  }
};

module.exports = {
  getPublicOffers,
  getAllOffersAdmin,
  createOffer,
  updateOffer,
  toggleOfferStatus,
  deleteOffer
};
