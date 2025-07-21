// controllers/postController.js

const Post = require('../models/postModel');
const Product = require('../models/productModel');
const Brand = require('../models/brandModel');

// @desc    Get all published posts for the public feed
// @route   GET /api/posts/feed
const getPublishedPosts = async (req, res) => {
    try {
        // --- START: SEARCH LOGIC MODIFICATION ---
        const keyword = req.query.keyword;

        let searchFilter = {};
        if (keyword) {
            searchFilter = {
                $or: [
                    { brand: { $regex: keyword, $options: 'i' } },   // Search in brand name
                    { caption: { $regex: keyword, $options: 'i' } } // Search in post caption
                ]
            };
        }
        
        // Combine the status filter with the search filter
        const queryConditions = { status: 'published', ...searchFilter };
        // --- END: SEARCH LOGIC MODIFICATION ---

        const allBrands = await Brand.find({});
        const brandLogoMap = allBrands.reduce((map, brand) => {
            map[brand.shopifyVendorName] = brand.logoUrl;
            return map;
        }, {});

        // Use the combined queryConditions in the find method
        const posts = await Post.find(queryConditions)
            .sort({ createdAt: -1 })
            .populate({
                path: 'linkedProducts.product',
                model: 'Product'
            });

        const postsWithLogos = posts.map(post => {
            const postObject = post.toObject();
            postObject.brandLogoUrl = brandLogoMap[post.brand] || 'assets/images/brand-logo.png';
            
            postObject.linkedProducts = postObject.linkedProducts
                .filter(lp => lp.product)
                .map(lp => lp.product);
            
            return postObject;
        });

        res.json(postsWithLogos);
    } catch (error) {
        console.error("Feed Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Create a new post
// @route   POST /api/posts
const createPost = async (req, res) => {
    try {
        const { mediaType, mediaUrls, caption, status, linkedProducts } = req.body;
        if (!req.user || !req.user.brand) return res.status(401).json({ message: 'Not authorized, user data missing.' });
        if (!mediaUrls || mediaUrls.length === 0) return res.status(400).json({ message: 'Media URL is required' });

        const formattedLinkedProducts = linkedProducts.map(productId => ({
            product: productId,
            quickViewClicks: 0,
            websiteClicks: 0
        }));

        const post = new Post({
            user: req.user._id,
            brand: req.user.brand,
            mediaType,
            mediaUrls,
            caption,
            status,
            linkedProducts: formattedLinkedProducts
        });
        const createdPost = await post.save();
        res.status(201).json(createdPost);
    } catch (error) {
        console.error("Create Post Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get a single post by ID
// @route   GET /api/posts/:id
const getPostById = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate('linkedProducts.product');
        if (post) {
            if (req.user.role === 'Brand Admin' && post.brand.toLowerCase() !== req.user.brand.toLowerCase()) {
                return res.status(401).json({ message: 'Not authorized' });
            }
            res.json(post);
        } else {
            res.status(404).json({ message: 'Post not found' });
        }
    } catch (error) {
        res.status(404).json({ message: 'Post not found' });
    }
};


// --- TRACKING FUNCTIONS ---

// @desc    Track a quick view click on a product within a post
// @route   PUT /api/posts/:postId/products/:productId/quickview
const trackQuickViewClick = async (req, res) => {
    try {
        const { postId, productId } = req.params;
        const result = await Post.updateOne(
            { _id: postId, "linkedProducts.product": productId },
            { $inc: { "linkedProducts.$.quickViewClicks": 1 } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Post or Product in post not found' });
        }
        res.status(200).json({ message: 'Quick view click tracked successfully' });
    } catch (error) {
        console.error("Track Quick View Click Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Track a website click on a product within a post
// @route   PUT /api/posts/:postId/products/:productId/website
const trackWebsiteClick = async (req, res) => {
    try {
        const { postId, productId } = req.params;
        const result = await Post.updateOne(
            { _id: postId, "linkedProducts.product": productId },
            { $inc: { "linkedProducts.$.websiteClicks": 1 } }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Post or Product in post not found' });
        }
        res.status(200).json({ message: 'Website click tracked successfully' });
    } catch (error) {
        console.error("Track Website Click Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- OTHER FUNCTIONS ---
const getAllPosts = async (req, res) => {
    try {
        const pageSize = 10;
        const page = Number(req.query.pageNumber) || 1;
        const keyword = req.query.keyword ? { caption: { $regex: req.query.keyword, $options: 'i' } } : {};
        const statusFilter = req.query.status && req.query.status !== 'all' ? { status: req.query.status } : {};
        let brandFilter = {};
        if (req.user.role === 'ZARR Admin') {
            if (req.query.brand && req.query.brand !== 'all') {
                brandFilter = { brand: { $regex: `^${req.query.brand}$`, $options: 'i' } };
            }
        } else if (req.user.role === 'Brand Admin') {
            brandFilter = { brand: { $regex: `^${req.user.brand}$`, $options: 'i' } };
        }
        const query = { ...brandFilter, ...keyword, ...statusFilter };
        const count = await Post.countDocuments(query);
        const posts = await Post.find(query).limit(pageSize).skip(pageSize * (page - 1)).sort({ createdAt: -1 });
        res.json({ posts, page, pages: Math.ceil(count / pageSize) });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (post) {
            if (req.user.role === 'Brand Admin' && post.brand !== req.user.brand) {
                return res.status(401).json({ message: 'Not authorized' });
            }
            await post.deleteOne();
            res.json({ message: 'Post removed' });
        } else {
            res.status(404).json({ message: 'Post not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const publishPost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (post) {
            if (req.user.role === 'Brand Admin' && post.brand !== req.user.brand) {
                return res.status(401).json({ message: 'Not authorized' });
            }
            post.status = 'published';
            const updatedPost = await post.save();
            res.json(updatedPost);
        } else {
            res.status(404).json({ message: 'Post not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const createPostComment = async (req, res) => {
    try {
        const { text } = req.body;
        const post = await Post.findById(req.params.id);
        if (post) {
            const comment = { text: text, name: req.customer.name, customer: req.customer._id };
            post.comments.push(comment);
            post.analytics.comments = post.comments.length;
            await post.save();
            res.status(201).json({ message: 'Comment added' });
        } else {
            res.status(404).json({ message: 'Post not found' });
        }
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

const incrementPostShare = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (post) {
            post.analytics.shares = (post.analytics.shares || 0) + 1;
            await post.save();
            res.json({ shares: post.analytics.shares });
        } else {
            res.status(404).json({ message: 'Post not found' });
        }
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

const likePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        const customerId = req.customer._id;
        const alreadyLiked = post.likes.some(like => like.equals(customerId));
        if (alreadyLiked) {
            post.likes = post.likes.filter(like => !like.equals(customerId));
        } else {
            post.likes.push(customerId);
        }
        post.analytics.likes = post.likes.length;
        await post.save();
        res.json({ message: 'Post like status updated', likes: post.analytics.likes });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

const getPostComments = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (post) {
            const sortedComments = post.comments.sort((a, b) => b.createdAt - a.createdAt);
            res.json({ comments: sortedComments });
        } else {
            res.status(404).json({ message: 'Post not found' });
        }
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};


module.exports = {
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
    trackQuickViewClick,
    trackWebsiteClick,
};