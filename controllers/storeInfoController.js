const StoreInfo = require('../models/StoreInfo');
const { getBaseUrl, normalizeImageUrl } = require('../utils/urlHelper');

// @desc    Get store info & about us content
// @route   GET /api/store-info
// @access  Public
const getStoreInfo = async (req, res) => {
  try {
    let storeInfo = await StoreInfo.findOne({});
    if (!storeInfo) {
      storeInfo = await StoreInfo.create({});
    }
    const baseUrl = getBaseUrl(req);
    const item = storeInfo.toObject ? storeInfo.toObject() : { ...storeInfo };
    if (!item.tiktok) {
      item.tiktok = storeInfo.tiktok || 'https://www.tiktok.com/@chennaisilkpalace.klang';
    }

    // Normalize images in customSections
    if (Array.isArray(item.customSections) && item.customSections.length > 0) {
      item.customSections = item.customSections.map(sec => ({
        ...sec,
        cards: Array.isArray(sec.cards)
          ? sec.cards.map(card => ({
              ...card,
              image: card.image ? normalizeImageUrl(card.image, baseUrl) : ''
            }))
          : []
      }));
    } else if (Array.isArray(item.achievements) && item.achievements.length > 0) {
      // Synthesize customSections for backward compatibility if empty
      item.customSections = [
        {
          eyebrow: item.achievementsEyebrow || 'OUR LEADERSHIP & FAMILY',
          title: item.achievementsHeading || 'Behind the Legacy of Chennai Silk Palace',
          subtitle: item.achievementsSubtitle || 'Guided by Mr. Thanasekaran Vellaikkoothan, our dedicated team upholds decades of commitment to excellence and authentic craftsmanship.',
          cards: item.achievements.map(ach => ({
            ...ach,
            image: ach.image ? normalizeImageUrl(ach.image, baseUrl) : ''
          }))
        }
      ];
    }

    if (Array.isArray(item.achievements)) {
      item.achievements = item.achievements.map(ach => ({
        ...ach,
        image: ach.image ? normalizeImageUrl(ach.image, baseUrl) : ''
      }));
    }

    if (item.directorImage) {
      item.directorImage = normalizeImageUrl(item.directorImage, baseUrl);
    }

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error fetching store info:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching store info'
    });
  }
};

// @desc    Update store info & about us content
// @route   PUT /api/store-info
// @access  Private/Admin
const updateStoreInfo = async (req, res) => {
  try {
    let storeInfo = await StoreInfo.findOne({});
    if (!storeInfo) {
      storeInfo = await StoreInfo.create(req.body);
    } else {
      storeInfo = await StoreInfo.findByIdAndUpdate(storeInfo._id, req.body, {
        new: true,
        runValidators: true
      });
    }

    res.status(200).json({
      success: true,
      message: 'Store information & About Us content updated successfully',
      data: storeInfo
    });
  } catch (error) {
    console.error('Error updating store info:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating store info'
    });
  }
};

module.exports = {
  getStoreInfo,
  updateStoreInfo
};
