const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000 // Timeout after 3 seconds instead of hanging for 10s
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error (${mongoURI}): ${error.message}`);
    
    // Check if MongoMemoryServer is available as fallback
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      console.log('🔄 Attempting fallback to in-memory MongoDB instance...');
      const memServer = await MongoMemoryServer.create();
      const fallbackUri = memServer.getUri();
      
      const conn = await mongoose.connect(fallbackUri);
      console.log(`✅ In-Memory MongoDB Connected: ${conn.connection.host}`);
      
      const Product = require('../models/Product');
      const sampleProducts = require('../seedData');
      const count = await Product.countDocuments();
      if (count === 0) {
        await Product.insertMany(sampleProducts);
        console.log(`✨ Auto-seeded ${sampleProducts.length} sample products into in-memory database!`);
      }
    } catch (fallbackError) {
      if (fallbackError.code !== 'MODULE_NOT_FOUND') {
        console.error(`⚠️ Fallback error: ${fallbackError.message}`);
      }
      console.log(`\n=================================================`);
      console.log(`💡 HOW TO FIX MONGODB CONNECTION ISSUE:`);
      console.log(`1. If using local MongoDB: Ensure MongoDB service is started (e.g. net start MongoDB or mongod).`);
      console.log(`2. If using MongoDB Atlas (Cloud): Update MONGODB_URI in .env with your Atlas connection string:`);
      console.log(`   MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/clothing_shop`);
      console.log(`=================================================\n`);
    }
  }
};

module.exports = connectDB;
