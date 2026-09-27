const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    eyebrow: {
      type: String,
      default: '',
      trim: true
    },
    title: {
      type: String,
      default: '',
      trim: true
    },
    titleHighlight: {
      type: String,
      default: '',
      trim: true
    },
    subtitle: {
      type: String,
      default: '',
      trim: true
    },
    image: {
      type: String,
      required: [true, 'Banner image URL is required'],
      trim: true
    },
    mobileImage: {
      type: String,
      default: '',
      trim: true
    },
    ctaText: {
      type: String,
      default: '',
      trim: true
    },
    ctaLink: {
      type: String,
      default: '/products',
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

module.exports = mongoose.model('Banner', bannerSchema);
