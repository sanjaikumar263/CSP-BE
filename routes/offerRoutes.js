const express = require('express');
const router = express.Router();
const {
  getPublicOffers,
  getAllOffersAdmin,
  createOffer,
  updateOffer,
  toggleOfferStatus,
  deleteOffer
} = require('../controllers/offerController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public route for storefront
router.get('/', getPublicOffers);

// Protected admin routes
router.get('/admin', protect, adminOnly, getAllOffersAdmin);
router.post('/', protect, adminOnly, createOffer);
router.put('/:id', protect, adminOnly, updateOffer);
router.patch('/:id/toggle', protect, adminOnly, toggleOfferStatus);
router.delete('/:id', protect, adminOnly, deleteOffer);

module.exports = router;
