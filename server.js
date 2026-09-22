const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const path = require('path');
const productRoutes = require('./routes/productRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const { serveImage } = require('./controllers/uploadController');
const authRoutes = require('./routes/authRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const offerRoutes = require('./routes/offerRoutes');
const storeInfoRoutes = require('./routes/storeInfoRoutes');
const User = require('./models/User');
const Banner = require('./models/Banner');
const Offer = require('./models/Offer');
const StoreInfo = require('./models/StoreInfo');

// Load environment variables
dotenv.config();

// Initialize Express App
const app = express();

// Trust reverse proxy (Render, Heroku, etc.) for correct protocol (https) and host detection
app.set('trust proxy', 1);

// Default seed banners data
const defaultBanners = [
  {
    eyebrow: 'AUTUMN WEAVES • 2026',
    title: 'Timeless Silks.',
    titleHighlight: 'Tradition in Every Weave.',
    subtitle: 'Discover our exquisite collection of pure silk sarees and traditional wear handcrafted by master artisans.',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'SHOP NOW',
    ctaLink: '#trending',
    isActive: true,
    order: 0
  },
  {
    eyebrow: 'BRIDAL SPECIAL • 2026',
    title: 'Royal Elegance.',
    titleHighlight: 'Crafted For Special Moments.',
    subtitle: 'Explore opulent bridal Kanchipuram silks adorned with authentic pure gold zari craftsmanship.',
    image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'EXPLORE BRIDAL',
    ctaLink: '#lehenga',
    isActive: true,
    order: 1
  }
];

// Default seed offers data
const defaultOffers = [
  {
    badge: 'GRAND FESTIVE SALE',
    title: 'Exclusive Silk Extravaganza',
    subtitle: 'Get up to 35% OFF on pure Kanchipuram & Banarasi silk sarees. Free express shipping across Malaysia.',
    discountText: 'FLAT 35% OFF',
    code: 'SILK35',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'EXPLORE OFFERS',
    ctaLink: '/products?category=Sarees',
    validTill: 'Valid till 30th Sept 2026',
    isActive: true,
    order: 0
  }
];

// Connect to MongoDB & ensure default data exists
connectDB().then(async () => {
  try {
    // 1. Ensure default admin user exists
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      await User.create({
        name: 'Radhika Menon',
        email: 'admin@example.com',
        password: 'Admin@12345',
        role: 'admin'
      });
      console.log('?? Auto-created default admin user (admin@example.com / Admin@12345)');
    }

    // 2. Ensure default hero banners exist
    const bannerCount = await Banner.countDocuments({});
    if (bannerCount === 0) {
      await Banner.insertMany(defaultBanners);
      console.log('?? Auto-seeded default Hero Banners into MongoDB');
    }

    // 3. Ensure default promotional offers exist
    const offerCount = await Offer.countDocuments({});
    if (offerCount === 0) {
      await Offer.insertMany(defaultOffers);
      console.log('??? Auto-seeded default Promotional Offers into MongoDB');
    }

    // 4. Ensure default store & about info document exists
    const storeInfoCount = await StoreInfo.countDocuments({});
    if (storeInfoCount === 0) {
      await StoreInfo.create({});
      console.log('?? Auto-seeded default Store Info & About Us content into MongoDB');
    }
  } catch (err) {
    console.error('Failed auto-seeding defaults:', err.message);
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Persistent image serving: serve from local disk cache, or fetch from MongoDB if container wiped
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), {
  maxAge: '1y',
  immutable: true
}));
app.get('/uploads/:filename', serveImage);
app.get('/uploads/*', serveImage);

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/store-info', storeInfoRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? 'OK' : 'DEGRADED',
    message: isDbConnected
      ? 'Clothing Shop Backend API is running smoothly'
      : 'Backend API is running, but MongoDB connection is offline.',
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API Endpoint Not Found: ${req.method} ${req.originalUrl}`
  });
});

// Start Server with Port Fallback Handling
const DEFAULT_PORT = process.env.PORT || 5000;

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`=================================================`);
    console.log(`?? Clothing Shop Backend Server Running!`);
    console.log(`?? Banners API: http://localhost:${port}/api/banners`);
    console.log(`??? Offers API: http://localhost:${port}/api/offers`);
    console.log(`?? Store Info API: http://localhost:${port}/api/store-info`);
    console.log(`?? Auth API: http://localhost:${port}/api/auth/login`);
    console.log(`?? API Base URL: http://localhost:${port}/api/products`);
    console.log(`?? Health Check: http://localhost:${port}/api/health`);
    console.log(`=================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`?? Port ${port} is in use. Trying port ${Number(port) + 1}...`);
      startServer(Number(port) + 1);
    } else {
      console.error('? Server error:', err);
    }
  });
};

startServer(DEFAULT_PORT);
