const express = require('express');
const router = express.Router();
const {
  getPublicBanners,
  getAllBannersAdmin,
  createBanner,
  updateBanner,
  deleteBanner
} = require('../controllers/bannerController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public route for storefront
router.get('/', getPublicBanners);

// Protected admin routes
router.get('/admin', protect, adminOnly, getAllBannersAdmin);
router.post('/', protect, adminOnly, createBanner);
router.put('/:id', protect, adminOnly, updateBanner);
router.delete('/:id', protect, adminOnly, deleteBanner);

module.exports = router;
