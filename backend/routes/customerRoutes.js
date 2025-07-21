// routes/customerRoutes.js

const express = require('express');
const router = express.Router();
const { 
    registerCustomer, 
    authCustomer,
    // --- IMPORT NEW CONTROLLERS ---
    toggleWishlist,
    getWishlist
} = require('../controllers/customerController');
const { protectCustomer } = require('../middleware/customerAuthMiddleware');

// --- PUBLIC ROUTES ---
router.post('/register', registerCustomer);
router.post('/login', authCustomer);

// --- PROTECTED WISHLIST ROUTES ---
router.route('/wishlist')
    .get(protectCustomer, getWishlist)       // Get the user's wishlist
    .put(protectCustomer, toggleWishlist);    // Add/remove an item from the wishlist

module.exports = router;