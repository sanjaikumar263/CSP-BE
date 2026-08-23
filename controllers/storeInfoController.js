const StoreInfo = require('../models/StoreInfo');

// @desc    Get store info & about us content
// @route   GET /api/store-info
// @access  Public
const getStoreInfo = async (req, res) => {
  try {
    let storeInfo = await StoreInfo.findOne({});
    if (!storeInfo) {
      storeInfo = await StoreInfo.create({});
    }
    res.status(200).json({
      success: true,
      data: storeInfo
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
