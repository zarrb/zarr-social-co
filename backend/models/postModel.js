// models/postModel.js

const mongoose = require('mongoose');

// Define a schema for a single comment
const commentSchema = mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Customer',
        },
        name: { type: String, required: true }, // Store name to avoid extra lookups
        text: { type: String, required: true },
    },
    {
        timestamps: true,
    }
);

const postSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User' // Reference to the Brand Admin User model
    },
    brand: {
        type: String,
        required: true,
    },
    mediaType: { 
        type: String, 
        enum: ['image', 'video'], 
        required: true 
    },
    mediaUrls: [{ 
        type: String, 
        required: true 
    }],
    caption: { 
        type: String, 
        default: '' 
    },
    status: { 
        type: String, 
        enum: ['published', 'draft'], 
        default: 'draft' 
    },
    // --- MODIFIED FOR PRODUCT ANALYTICS ---
    linkedProducts: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quickViewClicks: { // Click to open the product modal
            type: Number,
            default: 0
        },
        websiteClicks: { // Click on "View on Website"
            type: Number,
            default: 0
        }
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    }],
    comments: [commentSchema],
    analytics: {
        likes: { type: Number, default: 0 },
        comments: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
    }
}, { 
    timestamps: true 
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;