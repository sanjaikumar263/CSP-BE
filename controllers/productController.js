const Product = require('../models/Product');

// @desc    Create a new product
// @route   POST /api/products
// @access  Public / Admin
const createProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      price,
      salePrice,
      originalPrice,
      currency,
      category,
      categories,
      description,
      images,
      image,
      inStock,
      stockQuantity,
      status,
      tags,
      color,
      fabric,
      occasion,
      gender,
      isNewProduct,
      isFeatured
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both product name and price.'
      });
    }

    const product = new Product({
      name,
      sku: sku || `CSP-${Date.now().toString().slice(-6)}`,
      price: Number(price),
      salePrice: salePrice ? Number(salePrice) : null,
      originalPrice: originalPrice ? Number(originalPrice) : null,
      currency: currency || 'MYR',
      category: category || 'General Sarees',
      categories: categories || (category ? [category] : ['Sarees']),
      description: description || '',
      images: images && images.length > 0 ? images : (image ? [image] : []),
      image: image || (images && images.length > 0 ? images[0] : ''),
      inStock: inStock !== undefined ? Boolean(inStock) : true,
      stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : 10,
      status: status || 'published',
      tags: tags || [],
      color: color || '',
      fabric: fabric || '',
      occasion: occasion || '',
      gender: gender || 'Women',
      isNewProduct: Boolean(isNewProduct),
      isFeatured: Boolean(isFeatured)
    });

    const createdProduct = await product.save();

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: createdProduct
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    });
  }
};

// @desc    List all products with filtering, search, and sorting
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const { search, category, status, minPrice, maxPrice, sort, gender } = req.query;

    const query = {};

    // Filter by status if provided (e.g. published, draft)
    if (status) {
      query.status = status;
    }

    // Filter by category
    if (category && category.toLowerCase() !== 'all') {
      const categoryRegex = new RegExp(category, 'i');
      query.$or = [
        { category: categoryRegex },
        { categories: { $in: [categoryRegex] } }
      ];
    }

    // Filter by gender
    if (gender && gender.toLowerCase() !== 'all') {
      let genderVal = gender.trim();
      if (genderVal.toLowerCase() === 'male') genderVal = 'Men';
      if (genderVal.toLowerCase() === 'female') genderVal = 'Women';
      query.gender = new RegExp(`^${genderVal}$`, 'i');
    }

    // Search query by name, description, or SKU
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          {
            $or: [
              { name: searchRegex },
              { description: searchRegex },
              { sku: searchRegex },
              { category: searchRegex }
            ]
          }
        ];
        delete query.$or;
      } else {
        query.$or = [
          { name: searchRegex },
          { description: searchRegex },
          { sku: searchRegex },
          { category: searchRegex }
        ];
      }
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Sort order
    let sortOptions = { createdAt: -1 }; // default newest first
    if (sort === 'price-low-high') {
      sortOptions = { price: 1 };
    } else if (sort === 'price-high-low') {
      sortOptions = { price: -1 };
    } else if (sort === 'oldest') {
      sortOptions = { createdAt: 1 };
    }

    const products = await Product.find(query).sort(sortOptions);

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve products',
      error: error.message
    });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Invalid product ID or server error',
      error: error.message
    });
  }
};

// @desc    Update product by ID
// @route   PUT /api/products/:id
// @access  Public / Admin
const updateProduct = async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
};

// @desc    Delete product by ID
// @route   DELETE /api/products/:id
// @access  Public / Admin
const deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: deletedProduct
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
};

// @desc    Get latest products
// @route   GET /api/products/latest
// @access  Public
const getLatestProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const { category, status, gender } = req.query;

    const query = {};

    // Filter by status (default to published unless specified)
    if (status) {
      if (status !== 'all') {
        query.status = status;
      }
    } else {
      query.status = 'published';
    }

    // Filter by category if provided
    if (category && category.toLowerCase() !== 'all') {
      const categoryRegex = new RegExp(category, 'i');
      query.$or = [
        { category: categoryRegex },
        { categories: { $in: [categoryRegex] } }
      ];
    }

    // Filter by gender if provided
    if (gender && gender.toLowerCase() !== 'all') {
      let genderVal = gender.trim();
      if (genderVal.toLowerCase() === 'male') genderVal = 'Men';
      if (genderVal.toLowerCase() === 'female') genderVal = 'Women';
      query.gender = new RegExp(`^${genderVal}$`, 'i');
    }

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: products.length,
      limit,
      data: products
    });
  } catch (error) {
    console.error('Error fetching latest products:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve latest products',
      error: error.message
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getLatestProducts,
  getProductById,
  updateProduct,
  deleteProduct
};

