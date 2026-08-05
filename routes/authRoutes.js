const express = require('express');
const router = express.Router();
const { loginAdmin, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public route: Login
router.post('/login', loginAdmin);

// Protected route: Current user details
router.get('/me', protect, getMe);

module.exports = router;
