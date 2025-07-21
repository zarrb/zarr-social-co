// routes/userRoutes.js

const express = require('express');
const router = express.Router();
const { authUser, getMyBrandDetails } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// Route for user login
router.post('/login', authUser);

// NEW: Route to get the logged-in user's brand details (like the logo)
// This route is protected, so only a logged-in user can access it.
router.get('/mybrand', protect, getMyBrandDetails);

module.exports = router;
