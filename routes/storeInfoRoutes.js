const express = require('express');
const router = express.Router();
const { getStoreInfo, updateStoreInfo } = require('../controllers/storeInfoController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public route for fetching store & about info
router.get('/', getStoreInfo);

// Protected admin route for updating store & about info
router.put('/', protect, adminOnly, updateStoreInfo);

module.exports = router;
