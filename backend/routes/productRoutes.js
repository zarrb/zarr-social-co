// routes/productRoutes.js

const express = require('express');
const router = express.Router();
const { 
    getAllProducts, 
    syncProductsFromShopify,
    trackQuickViewClick,
    trackWebsiteClick
} = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');

// Admin routes
router.get('/', protect, getAllProducts);
router.post('/sync', protect, syncProductsFromShopify);

// NEW: Public routes for tracking clicks
router.put('/:id/click/quickview', trackQuickViewClick);
router.put('/:id/click/website', trackWebsiteClick);

module.exports = router;
