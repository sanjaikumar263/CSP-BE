const express = require('express');
const router = express.Router();
const {
  loginAdmin,
  loginCustomer,
  registerCustomer,
  getMe,
  getCustomerProfile,
  updateCustomerProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public Admin & Customer Auth Routes
router.post('/login', loginAdmin);
router.post('/customer-login', loginCustomer);
router.post('/customer-register', registerCustomer);
router.post('/register', registerCustomer);

// Protected Customer & Admin Routes
router.get('/me', protect, getMe);
router.get('/customer-profile', protect, getCustomerProfile);
router.put('/customer-profile', protect, updateCustomerProfile);

module.exports = router;
