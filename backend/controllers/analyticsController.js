// controllers/analyticsController.js

const Post = require('../models/postModel');
const mongoose = require('mongoose');

// @desc    Get aggregated analytics for all of a brand's products
// @route   GET /api/analytics/products
const getProductAnalytics = async (req, res) => {
    try {
        const brand = req.user.brand;

        const productAnalytics = await Post.aggregate([
            // Stage 1: Match only posts from the logged-in brand
            {
                $match: { brand: brand }
            },
            // Stage 2: Deconstruct the linkedProducts array
            {
                $unwind: "$linkedProducts"
            },
            // Stage 3: Group by the product ID and sum the clicks
            {
                $group: {
                    _id: "$linkedProducts.product",
                    totalQuickViewClicks: { $sum: "$linkedProducts.quickViewClicks" },
                    totalWebsiteClicks: { $sum: "$linkedProducts.websiteClicks" }
                }
            },
            // Stage 4: Lookup product details from the 'products' collection
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            // Stage 5: Deconstruct the productDetails array created by $lookup
            {
                $unwind: "$productDetails"
            },
            // Stage 6: Project a clean final structure
            {
                $project: {
                    _id: 0, // Exclude the default _id field
                    productId: "$_id",
                    name: "$productDetails.name",
                    imageUrl: "$productDetails.imageUrl",
                    quickViewClicks: "$totalQuickViewClicks",
                    websiteClicks: "$totalWebsiteClicks"
                }
            },
            // Stage 7: Sort by the most website clicks first
            {
                $sort: { websiteClicks: -1 }
            }
        ]);

        res.json(productAnalytics);

    } catch (error) {
        console.error("Product Analytics Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};


// --- UNCHANGED FUNCTIONS ---

// @desc    Get analytics summary for the brand (KPI Cards)
// @route   GET /api/analytics/summary
const getAnalyticsSummary = async (req, res) => {
    try {
        const days = Number(req.query.days) || 30;
        const brand = req.user.brand;

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const prevEndDate = new Date(startDate);
        prevEndDate.setDate(startDate.getDate() - 1);
        const prevStartDate = new Date(prevEndDate);
        prevStartDate.setDate(prevEndDate.getDate() - days);

        const currentPeriodData = await Post.aggregate([
            { $match: { brand: { $regex: `^${brand}$`, $options: 'i' }, status: 'published', createdAt: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: null, totalPosts: { $sum: 1 }, totalLikes: { $sum: '$analytics.likes' }, totalComments: { $sum: '$analytics.comments' }, totalShares: { $sum: '$analytics.shares' } } }
        ]);

        const previousPeriodData = await Post.aggregate([
            { $match: { brand: { $regex: `^${brand}$`, $options: 'i' }, status: 'published', createdAt: { $gte: prevStartDate, $lte: prevEndDate } } },
            { $group: { _id: null, totalPosts: { $sum: 1 }, totalLikes: { $sum: '$analytics.likes' }, totalComments: { $sum: '$analytics.comments' }, totalShares: { $sum: '$analytics.shares' } } }
        ]);

        const currentStats = currentPeriodData[0] || { totalPosts: 0, totalLikes: 0, totalComments: 0, totalShares: 0 };
        const previousStats = previousPeriodData[0] || { totalPosts: 0, totalLikes: 0, totalComments: 0, totalShares: 0 };

        const totalEngagement = currentStats.totalLikes + currentStats.totalComments + currentStats.totalShares;
        const engagementRate = currentStats.totalPosts > 0 ? (totalEngagement / currentStats.totalPosts) / 100 : 0;

        res.json({
            currentPeriod: {
                totalPosts: currentStats.totalPosts,
                totalLikes: currentStats.totalLikes,
                totalComments: currentStats.totalComments,
                totalShares: currentStats.totalShares,
                engagementRate: engagementRate.toFixed(2)
            },
            previousPeriod: {
                totalPosts: previousStats.totalPosts,
                totalLikes: previousStats.totalLikes,
                totalComments: previousStats.totalComments,
                totalShares: previousStats.totalShares
            }
        });

    } catch (error) {
        console.error("Analytics Summary Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};


// @desc    Get data for analytics charts
// @route   GET /api/analytics/charts
const getAnalyticsCharts = async (req, res) => {
    try {
        const days = Number(req.query.days) || 30;
        const brand = req.user.brand;

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        // --- Trend Data Aggregation ---
        const trendData = await Post.aggregate([
            { $match: { brand: { $regex: `^${brand}$`, $options: 'i' }, status: 'published', createdAt: { $gte: startDate, $lte: endDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    likes: { $sum: "$analytics.likes" },
                    comments: { $sum: "$analytics.comments" },
                    shares: { $sum: "$analytics.shares" },
                }
            },
            { $sort: { _id: 1 } } // Sort by date ascending
        ]);

        // --- Content Type Aggregation ---
        const contentTypeData = await Post.aggregate([
            { $match: { brand: { $regex: `^${brand}$`, $options: 'i' }, status: 'published', createdAt: { $gte: startDate, $lte: endDate } } },
            {
                $group: {
                    _id: "$mediaType",
                    count: { $sum: 1 }
                }
            }
        ]);

        // --- Top Performing Posts ---
        const topPosts = await Post.find({
            brand: { $regex: `^${brand}$`, $options: 'i' },
            status: 'published',
            createdAt: { $gte: startDate, $lte: endDate }
        })
        .sort({ 'analytics.likes': -1 }) // Sort by most likes
        .limit(5)
        .select('caption mediaUrls analytics.likes analytics.comments analytics.shares'); // Select only needed fields

        res.json({
            trendData,
            contentTypeData,
            topPosts,
        });

    } catch (error) {
        console.error("Analytics Chart Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    getAnalyticsSummary,
    getAnalyticsCharts,
    // --- EXPORT THE NEW FUNCTION ---
    getProductAnalytics,
};