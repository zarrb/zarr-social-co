// models/userModel.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    brand: {
        type: String,
        required: true,
    },
    // NEW: Add a 'role' field to differentiate user types
    role: {
        type: String,
        required: true,
        enum: ['Brand Admin', 'ZARR Admin'], // Only these two values are allowed
        default: 'Brand Admin',
    },
}, {
    timestamps: true
});

// This function will run BEFORE a user document is saved.
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// This adds a method to our user model to compare an entered password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
