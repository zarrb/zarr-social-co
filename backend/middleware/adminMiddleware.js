
const jwt = require('jsonwebtoken');
const User = require('../models/userModel.js');

const protect = async (req, res, next) => {
    let token;

    // --- NEW DEBUGGING BLOCK ---
    console.log('--- Inside Protect Middleware ---');
    console.log('Request Headers:', req.headers.authorization);
    // --- END DEBUGGING BLOCK ---

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            
            console.log('Token found:', token); // Log the token
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            console.log('Token decoded. User ID:', decoded.id); // Log the decoded ID

            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                console.error('User not found in database for this ID.');
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            console.log('User found and attached to request:', req.user.email);
            console.log('---------------------------------');
            next();
        } catch (error) {
            console.error('Token verification failed:', error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        console.error('No token found in headers.');
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};


// This middleware assumes the 'protect' middleware has already run.
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'ZARR Admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, isAdmin };
