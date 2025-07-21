// routes/adminRoutes.js

const express = require('express');
const router = express.Router();

// Import the controller functions
const { 
    registerBrand, 
    getAllBrands, 
    updateBrand,
    getUnregisteredVendors // Import the new function
} = require('../controllers/adminController');

// Import both protection middlewares
const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/adminMiddleware');

// --- BRAND MANAGEMENT ROUTES ---
router.post('/brands', protect, isAdmin, registerBrand);
router.get('/brands', protect, isAdmin, getAllBrands);
router.put('/brands/:id', protect, isAdmin, updateBrand);

// --- VENDOR ROUTES ---
router.get('/unregistered-vendors', protect, isAdmin, getUnregisteredVendors);


module.exports = router;
