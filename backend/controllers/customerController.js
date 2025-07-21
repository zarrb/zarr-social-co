// controllers/customerController.js

const Customer = require('../models/customerModel');
const jwt = require('jsonwebtoken');

// Helper function to generate a token for a customer
const generateToken = (id) => {
    return jwt.sign({ id, type: 'customer' }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new customer
// @route   POST /api/customers/register
const registerCustomer = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const customerExists = await Customer.findOne({ email });

        if (customerExists) {
            return res.status(400).json({ message: 'A customer with this email already exists.' });
        }

        const customer = await Customer.create({
            name,
            email,
            password,
        });

        if (customer) {
            res.status(201).json({
                _id: customer._id,
                name: customer.name,
                email: customer.email,
                token: generateToken(customer._id),
                wishlist: [], // Send an empty wishlist for new users
            });
        } else {
            res.status(400).json({ message: 'Invalid customer data provided.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Auth customer & get token
// @route   POST /api/customers/login
const authCustomer = async (req, res) => {
    const { email, password } = req.body;

    try {
        // MODIFIED: Populate the wishlist on login
        const customer = await Customer.findOne({ email }).populate('wishlist');

        if (customer && (await customer.matchPassword(password))) {
            res.json({
                _id: customer._id,
                name: customer.name,
                email: customer.email,
                token: generateToken(customer._id),
                wishlist: customer.wishlist.map(item => item._id), // Send back an array of product IDs
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- NEW WISHLIST FUNCTIONS ---

// @desc    Add or remove a product from the customer's wishlist
// @route   PUT /api/customers/wishlist
const toggleWishlist = async (req, res) => {
    const { productId } = req.body;
    const customerId = req.customer._id; // from protectCustomer middleware

    try {
        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const alreadyInWishlist = customer.wishlist.includes(productId);
        let updatedCustomer;
        let message;

        if (alreadyInWishlist) {
            // Remove from wishlist
            updatedCustomer = await Customer.findByIdAndUpdate(
                customerId,
                { $pull: { wishlist: productId } },
                { new: true }
            );
            message = 'Removed from wishlist';
        } else {
            // Add to wishlist (using $addToSet to prevent duplicates)
            updatedCustomer = await Customer.findByIdAndUpdate(
                customerId,
                { $addToSet: { wishlist: productId } },
                { new: true }
            );
            message = 'Added to wishlist';
        }

        res.json({ 
            message,
            wishlist: updatedCustomer.wishlist 
        });

    } catch (error) {
        console.error('Wishlist toggle error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get the customer's wishlist
// @route   GET /api/customers/wishlist
const getWishlist = async (req, res) => {
    const customerId = req.customer._id;

    try {
        const customer = await Customer.findById(customerId).populate({
            path: 'wishlist',
            model: 'Product' // Make sure to populate with Product details
        });
        
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        res.json(customer.wishlist);

    } catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};


module.exports = { 
    registerCustomer, 
    authCustomer,
    // --- EXPORT NEW FUNCTIONS ---
    toggleWishlist,
    getWishlist
};