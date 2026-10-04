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
    colors: [
      {
        name: { type: String, trim: true },
        code: { type: String, default: '#0A305D', trim: true }
      }
    ],
    sizes: [
      {
        type: String,
        trim: true
      }
    ],
    variants: [
      {
        id: { type: String },
        color: { type: String, trim: true },
        colorCode: { type: String, default: '#0A305D', trim: true },
        size: { type: String, trim: true },
        stockQuantity: { type: Number, default: 0, min: 0 },
        sku: { type: String, trim: true },
        inStock: { type: Boolean, default: true },
        image: { type: String, default: '' }
      }
    ],
    colorImages: [
      {
        color: { type: String, trim: true },
        colorCode: { type: String, default: '#0A305D', trim: true },
        images: [{ type: String }]
      }
    ],
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
    },
    sizeChart: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to ensure image array, color-based images, and main image are synced and clean of localhost:5000
productSchema.pre('save', function (next) {
  if (this.image && typeof this.image === 'string' && this.image.startsWith('http://localhost:5000/uploads/')) {
    this.image = this.image.replace('http://localhost:5000', '');
  }
  if (Array.isArray(this.images)) {
    this.images = this.images.map(img => (typeof img === 'string' && img.startsWith('http://localhost:5000/uploads/') ? img.replace('http://localhost:5000', '') : img));
  }
  if (Array.isArray(this.colorImages)) {
    this.colorImages = this.colorImages.map(ci => ({
      color: ci.color,
      colorCode: ci.colorCode || '#0A305D',
      images: Array.isArray(ci.images)
        ? ci.images.map(img => (typeof img === 'string' && img.startsWith('http://localhost:5000/uploads/') ? img.replace('http://localhost:5000', '') : img))
        : []
    }));
  }
  if (Array.isArray(this.variants)) {
    this.variants = this.variants.map(v => ({
      ...v,
      image: typeof v.image === 'string' && v.image.startsWith('http://localhost:5000/uploads/') ? v.image.replace('http://localhost:5000', '') : (v.image || '')
    }));
  }

  // Ensure main image exists if images array or colorImages has images
  if (this.images && this.images.length > 0 && !this.image) {
    this.image = this.images[0];
  } else if (this.image && (!this.images || this.images.length === 0)) {
    this.images = [this.image];
  }

  // If colorImages exist, make sure all unique color images are in this.images as well
  if (Array.isArray(this.colorImages) && this.colorImages.length > 0) {
    const allImages = Array.isArray(this.images) ? [...this.images] : [];
    this.colorImages.forEach(ci => {
      if (Array.isArray(ci.images)) {
        ci.images.forEach(img => {
          if (img && !allImages.includes(img)) {
            allImages.push(img);
          }
        });
      }
    });
    this.images = allImages;
    if (!this.image && this.images.length > 0) {
      this.image = this.images[0];
    }
  }

  // Sync color field if colors array has entries
  if (Array.isArray(this.colors) && this.colors.length > 0 && !this.color) {
    this.color = typeof this.colors[0] === 'string' ? this.colors[0] : (this.colors[0].name || '');
  }

  // Sync stock quantity from variants if variants exist
  if (Array.isArray(this.variants) && this.variants.length > 0) {
    this.stockQuantity = this.variants.reduce((sum, v) => sum + (parseInt(v.stockQuantity, 10) || 0), 0);
    this.inStock = this.stockQuantity > 0;
  }

  next();
});

module.exports = mongoose.model('Product', productSchema);
