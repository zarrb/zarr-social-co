// models/brandModel.js

const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    logoUrl: {
        type: String,
        required: true,
    },
    // --- NEW FIELD ---
    // A smaller, square logo specifically for the social feed avatar.
    avatarUrl: {
        type: String,
        // Not required, so we can have a fallback for older brands.
    },
    // This is the crucial field for syncing products correctly.
    // It must exactly match the 'vendor' field in the client's Shopify store.
    shopifyVendorName: {
        type: String,
        required: true,
        unique: true,
    },
    // This field can track if a brand is active on the platform.
    isActive: {
        type: Boolean,
        required: true,
        default: true,
    },
}, {
    timestamps: true
});

const Brand = mongoose.model('Brand', brandSchema);

module.exports = Brand;
