const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    badge: {
      type: String,
      default: 'FESTIVE SPECIAL',
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Offer title is required'],
      trim: true
    },
    subtitle: {
      type: String,
      default: '',
      trim: true
    },
    discountText: {
      type: String,
      default: '30% OFF',
      trim: true
    },
    code: {
      type: String,
      default: 'SILK30',
      trim: true
    },
    image: {
      type: String,
      required: [true, 'Offer image URL is required']
    },
    ctaText: {
      type: String,
      default: 'SHOP THE OFFER',
      trim: true
    },
    ctaLink: {
      type: String,
      default: '/products?category=Sarees',
      trim: true
    },
    validTill: {
      type: String,
      default: 'Valid till 30th Sept 2026',
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Offer', offerSchema);
