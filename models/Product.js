const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price must be non-negative']
    },
    salePrice: {
      type: Number,
      default: null
    },
    originalPrice: {
      type: Number,
      default: null
    },
    currency: {
      type: String,
      default: 'MYR'
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true
    },
    categories: [
      {
        type: String,
        trim: true
      }
    ],
    description: {
      type: String,
      default: ''
    },
    images: [
      {
        type: String
      }
    ],
    image: {
      type: String,
      default: ''
    },
    inStock: {
      type: Boolean,
      default: true
    },
    stockQuantity: {
      type: Number,
      default: 10
    },
    status: {
      type: String,
      enum: ['published', 'draft', 'archived'],
      default: 'published'
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5
    },
    reviewsCount: {
      type: Number,
      default: 0
    },
    tags: [
      {
        type: String,
        trim: true
      }
    ],
    color: {
      type: String,
      default: ''
    },
    fabric: {
      type: String,
      default: ''
    },
    occasion: {
      type: String,
      default: ''
    },
    gender: {
      type: String,
      enum: ['Women', 'Men', 'Unisex'],
      default: 'Women',
      trim: true
    },
    isNewProduct: {
      type: Boolean,
      default: false
    },
    isFeatured: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to ensure image array and main image are synced and clean of localhost:5000
productSchema.pre('save', function (next) {
  if (this.image && typeof this.image === 'string' && this.image.startsWith('http://localhost:5000/uploads/')) {
    this.image = this.image.replace('http://localhost:5000', '');
  }
  if (Array.isArray(this.images)) {
    this.images = this.images.map(img => (typeof img === 'string' && img.startsWith('http://localhost:5000/uploads/') ? img.replace('http://localhost:5000', '') : img));
  }
  if (this.images && this.images.length > 0 && !this.image) {
    this.image = this.images[0];
  } else if (this.image && (!this.images || this.images.length === 0)) {
    this.images = [this.image];
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
