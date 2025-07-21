// models/customerModel.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true, // Each customer's email must be unique
    },
    password: {
        type: String,
        required: true,
    },
    // --- NEW: WISHLIST FIELD ---
    // This will store an array of product IDs that the customer has liked.
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    // We can add fields for social logins later
    // googleId: { type: String },
    // facebookId: { type: String },
}, {
    timestamps: true
});

// This function automatically hashes the password before saving a new customer
customerSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// This adds a helper method to compare an entered password with the hashed one
customerSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;