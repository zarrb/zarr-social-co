// routes/postRoutes.js

const express = require('express');
const router = express.Router();
const { 
    getAllPosts, 
    createPost, 
    getPostById, 
    deletePost, 
    publishPost,
    getPublishedPosts,
    likePost,
    createPostComment,
    incrementPostShare,
    getPostComments,
    // --- IMPORT NEW TRACKING CONTROLLERS ---
    trackQuickViewClick,
    trackWebsiteClick
} = require('../controllers/postController');

// Import both middleware files
const { protect } = require('../middleware/authMiddleware'); // For Brand Admins
const { protectCustomer } = require('../middleware/customerAuthMiddleware'); // For Customers

// --- PUBLIC ROUTES ---
router.get('/feed', getPublishedPosts);
router.put('/:id/share', incrementPostShare);
router.get('/:id/comments', getPostComments);

// --- NEW: ROUTES FOR PRODUCT CLICK TRACKING ---
router.put('/:postId/products/:productId/quickview', trackQuickViewClick);
router.put('/:postId/products/:productId/website', trackWebsiteClick);


// --- CUSTOMER-PROTECTED ROUTES ---
router.put('/:id/like', protectCustomer, likePost);
router.post('/:id/comments', protectCustomer, createPostComment);

// --- PROTECTED ADMIN ROUTES ---
router.get('/', protect, getAllPosts);
router.get('/:id', protect, getPostById);
router.post('/', protect, createPost);
router.delete('/:id', protect, deletePost);
router.put('/:id/publish', protect, publishPost);

module.exports = router;