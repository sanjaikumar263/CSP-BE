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
    const existingAdmin = await User.findOne({ email: 'admin@csp.com' });
    if (!existingAdmin) {
      await User.create({
        name: 'Radhika Menon',
        email: 'admin@csp.com',
        password: 'cspadmin@123',
        role: 'admin'
      });
      console.log('🔑 Seeded Default Admin User: admin@csp.com / cspadmin@123');
    } else {
      console.log('ℹ️ Admin user admin@csp.com already exists.');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
};

seedDB();
