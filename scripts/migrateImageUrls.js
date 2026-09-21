const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const cleanUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('http://localhost:5000/uploads/')) {
    return url.replace('http://localhost:5000', '');
  }
  return url;
};

const migrate = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment.');
      process.exit(1);
    }

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // 1. Products
    const products = await db.collection('products').find({}).toArray();
    let updatedProducts = 0;

    for (const p of products) {
      let needsUpdate = false;
      let newImage = p.image;
      let newImages = p.images;

      if (p.image && p.image.includes('localhost:5000')) {
        newImage = cleanUrl(p.image);
        needsUpdate = true;
      }

      if (Array.isArray(p.images) && p.images.some(img => img && img.includes('localhost:5000'))) {
        newImages = p.images.map(img => cleanUrl(img));
        needsUpdate = true;
      }

      if (needsUpdate) {
        await db.collection('products').updateOne(
          { _id: p._id },
          { $set: { image: newImage, images: newImages } }
        );
        console.log(`Updated Product "${p.name}" (_id: ${p._id}):`);
        console.log(`  Before: image = ${p.image}`);
        console.log(`  After:  image = ${newImage}`);
        updatedProducts++;
      }
    }
    console.log(`Total products updated: ${updatedProducts}`);

    // 2. Banners
    const banners = await db.collection('banners').find({}).toArray();
    let updatedBanners = 0;
    for (const b of banners) {
      if (b.image && b.image.includes('localhost:5000')) {
        const newImg = cleanUrl(b.image);
        await db.collection('banners').updateOne({ _id: b._id }, { $set: { image: newImg } });
        console.log(`Updated Banner "${b.title}": ${newImg}`);
        updatedBanners++;
      }
    }
    console.log(`Total banners updated: ${updatedBanners}`);

    // 3. Offers
    const offers = await db.collection('offers').find({}).toArray();
    let updatedOffers = 0;
    for (const o of offers) {
      if (o.image && o.image.includes('localhost:5000')) {
        const newImg = cleanUrl(o.image);
        await db.collection('offers').updateOne({ _id: o._id }, { $set: { image: newImg } });
        console.log(`Updated Offer "${o.title}": ${newImg}`);
        updatedOffers++;
      }
    }
    console.log(`Total offers updated: ${updatedOffers}`);

    // 4. Store Info
    const storeInfos = await db.collection('storeinfos').find({}).toArray();
    let updatedStoreInfos = 0;
    for (const s of storeInfos) {
      if (s.directorImage && s.directorImage.includes('localhost:5000')) {
        const newImg = cleanUrl(s.directorImage);
        await db.collection('storeinfos').updateOne({ _id: s._id }, { $set: { directorImage: newImg } });
        console.log(`Updated StoreInfo directorImage: ${newImg}`);
        updatedStoreInfos++;
      }
    }
    console.log(`Total storeInfos updated: ${updatedStoreInfos}`);

    console.log(' Migration complete!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

migrate();
