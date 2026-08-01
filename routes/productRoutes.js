const express = require('express');
const router = express.Router();
const {
  createProduct,
  getProducts,
  getLatestProducts,
  getProductById,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');

// @route   POST /api/products - Create product
// @route   GET /api/products - List all products
router.route('/')
  .post(createProduct)
  .get(getProducts);

// @route   GET /api/products/latest - Get latest products (placed BEFORE /:id)
router.get('/latest', getLatestProducts);

// @route   GET /api/products/:id - Get product by ID
// @route   PUT /api/products/:id - Update product by ID
// @route   DELETE /api/products/:id - Delete product by ID
router.route('/:id')
  .get(getProductById)
  .put(updateProduct)
  .delete(deleteProduct);

module.exports = router;
