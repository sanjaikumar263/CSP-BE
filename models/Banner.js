const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    eyebrow: {
      type: String,
      default: 'AUTUMN WEAVES · 2026',
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Banner title is required'],
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
      required: [true, 'Banner image URL is required']
    },
    ctaText: {
      type: String,
      default: 'SHOP NOW',
      trim: true
    },
    ctaLink: {
      type: String,
      default: '#trending',
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
