// controllers/userController.js

const User = require('../models/userModel');
const Brand = require('../models/brandModel'); // Import the Brand model
const jwt = require('jsonwebtoken');

// Helper function to generate a JWT
const generateToken = (id, brand, role) => {
    return jwt.sign({ id, brand, role }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Auth user & get token
// @route   POST /api/users/login
const authUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email: { $regex: `^${email}$`, $options: 'i' } });
        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                brand: user.brand,
                role: user.role,
                token: generateToken(user._id, user.brand, user.role),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get the brand details for the logged-in user
// @route   GET /api/users/mybrand
// @access  Private (Brand Admin or ZARR Admin)
const getMyBrandDetails = async (req, res) => {
    try {
        // The 'protect' middleware gives us req.user
        // The user's 'brand' field stores the shopifyVendorName
        const brand = await Brand.findOne({ shopifyVendorName: req.user.brand });

        if (brand) {
            res.json(brand);
        } else {
            res.status(404).json({ message: 'Brand details not found for this user.' });
        }
    } catch (error) {
        console.error("Get My Brand Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { 
    authUser,
    getMyBrandDetails, // Export the new function
};
