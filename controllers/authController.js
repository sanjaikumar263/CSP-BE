const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'clothing_shop_admin_secret_key_2026', {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// @desc    Admin Login
// @route   POST /api/auth/login
// @access  Public
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email || '',
        mobile: user.mobile || '',
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

// @desc    Customer Registration
// @route   POST /api/auth/customer-register or /api/auth/register
// @access  Public
const registerCustomer = async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    const cleanName = name ? name.trim() : '';
    const cleanEmail = email ? email.toLowerCase().trim() : '';
    const cleanMobile = mobile ? mobile.trim() : '';

    if (!cleanName || (!cleanEmail && !cleanMobile) || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide Name, Email or Mobile Number, and Password.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const queryConditions = [];
    if (cleanEmail) queryConditions.push({ email: cleanEmail });
    if (cleanMobile) queryConditions.push({ mobile: cleanMobile });

    const existingUser = await User.findOne({ $or: queryConditions });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email or mobile number already exists. Please login instead.'
      });
    }

    const userData = {
      name: cleanName,
      password,
      role: 'customer'
    };
    if (cleanEmail) userData.email = cleanEmail;
    if (cleanMobile) userData.mobile = cleanMobile;

    const user = await User.create(userData);
    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email || '',
        mobile: user.mobile || '',
        role: user.role
      }
    });
  } catch (error) {
    console.error('Customer Register Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during customer registration',
      error: error.message
    });
  }
};

// @desc    Customer Login (Supports Email or Mobile)
// @route   POST /api/auth/customer-login
// @access  Public
const loginCustomer = async (req, res) => {
  try {
    const { loginId, email, mobile, password } = req.body;
    const identifier = (loginId || email || mobile || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide Email / Mobile Number and Password'
      });
    }

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { mobile: identifier }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this Email/Mobile number. Please register first.'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Please check your credentials and try again.'
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email || '',
        mobile: user.mobile || '',
        role: user.role
      }
    });
  } catch (error) {
    console.error('Customer Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

// @desc    Get Current Logged in User Profile
// @route   GET /api/auth/me or /api/auth/customer-profile
// @access  Private (Protected by JWT)
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email || '',
        mobile: user.mobile || '',
        role: user.role
      }
    });
  } catch (error) {
    console.error('GetMe Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile'
    });
  }
};

// @desc    Update Customer Profile
// @route   PUT /api/auth/customer-profile
// @access  Private (Protected by JWT)
const updateCustomerProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { name, email, mobile, password } = req.body;
    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (mobile) user.mobile = mobile.trim();
    if (password) user.password = password;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email || '',
        mobile: user.mobile || '',
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

module.exports = {
  loginAdmin,
  registerCustomer,
  loginCustomer,
  getMe,
  getCustomerProfile: getMe,
  updateCustomerProfile
};
