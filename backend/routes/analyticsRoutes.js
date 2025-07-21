// routes/analyticsRoutes.js

const express = require('express');
const router = express.Router();
const { 
    getAnalyticsSummary, 
    getAnalyticsCharts,
    // --- IMPORT NEW CONTROLLER ---
    getProductAnalytics 
} = require('../controllers/analyticsController');

const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/analytics/summary
// This route gets the data for the KPI cards.
router.get('/summary', protect, getAnalyticsSummary);

// @route   GET /api/analytics/charts
// This route gets the data for the trend and doughnut charts.
router.get('/charts', protect, getAnalyticsCharts);

// --- NEW ROUTE FOR PRODUCT ANALYTICS ---
// @route   GET /api/analytics/products
// This route gets the aggregated click data for all of a brand's products.
router.get('/products', protect, getProductAnalytics);

module.exports = router;