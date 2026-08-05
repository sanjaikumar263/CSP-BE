const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Product = require('./models/Product');
const User = require('./models/User');

dotenv.config();

const sampleProducts = require('./seedData');

const seedDB = async () => {
  try {
    await connectDB();

    // 1. Seed Products
    await Product.deleteMany({});
    console.log('🗑️ Existing products cleared');

    const createdProducts = await Product.insertMany(sampleProducts);
    console.log(`✨ Seeded ${createdProducts.length} products into MongoDB successfully!`);

    // 2. Seed Default Admin User
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (!existingAdmin) {
      await User.create({
        name: 'Radhika Menon',
        email: 'admin@example.com',
        password: 'Admin@12345',
        role: 'admin'
      });
      console.log('🔑 Seeded Default Admin User: admin@example.com / Admin@12345');
    } else {
      console.log('ℹ️ Admin user admin@example.com already exists.');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
};

seedDB();
