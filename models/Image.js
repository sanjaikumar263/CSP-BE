const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: [true, 'Image filename is required'],
      unique: true,
      index: true,
      trim: true
    },
    contentType: {
      type: String,
      required: true,
      default: 'image/webp'
    },
    data: {
      type: Buffer,
      required: [true, 'Binary image buffer is required']
    },
    size: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Image', imageSchema);
