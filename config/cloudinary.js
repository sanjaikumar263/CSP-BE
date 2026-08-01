const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

dotenv.config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

let isCloudinaryConfigured = false;

if (cloudName && apiKey && apiSecret && !cloudName.includes('your_') && !apiKey.includes('your_')) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
  });
  isCloudinaryConfigured = true;
  console.log('⚡ Cloudinary Client Initialized');
} else {
  console.log('ℹ️ Cloudinary credentials pending configuration in .env');
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured
};
