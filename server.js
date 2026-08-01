const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const path = require('path');
const productRoutes = require('./routes/productRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

// Load environment variables
dotenv.config();

// Initialize Express App
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);

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
    console.log(`🚀 Clothing Shop Backend Server Running!`);
    console.log(`🌐 API Base URL: http://localhost:${port}/api/products`);
    console.log(`🏥 Health Check: http://localhost:${port}/api/health`);
    console.log(`=================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} is in use. Trying port ${Number(port) + 1}...`);
      startServer(Number(port) + 1);
    } else {
      console.error('❌ Server error:', err);
    }
  });
};

startServer(DEFAULT_PORT);
