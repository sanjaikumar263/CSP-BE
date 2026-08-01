const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Product = require('./models/Product');

dotenv.config();

const sampleProducts = require('./seedData');

const seedDB = async () => {
  try {
    await connectDB();
    await Product.deleteMany({});
    console.log('🗑️ Existing products cleared');

    const created = await Product.insertMany(sampleProducts);
    console.log(`✨ Seeded ${created.length} products into MongoDB successfully!`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
};

seedDB();
