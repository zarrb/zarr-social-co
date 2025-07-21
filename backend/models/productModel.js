// models/productModel.js

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    shopifyId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    brand: {
        type: String,
        required: true,
        trim: true,
    },
    tags: [String],
    imageUrl: {
        type: String,
        required: true,
    },
    productUrl: {
        type: String,
        required: true,
    },
    price: {
        current: { type: Number, required: true, default: 0 },
        original: { type: Number, default: 0 },
        discountPercentage: { type: Number, default: 0 },
    },
    // NEW: Add fields to track product clicks
    quickViewClicks: {
        type: Number,
        default: 0,
    },
    websiteClicks: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
