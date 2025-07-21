// middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../models/userModel.js');

const protect = async (req, res, next) => {
    let token;

    // Check if the request has an Authorization header, and if it starts with 'Bearer'
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get the token from the header (e.g., "Bearer eyJhbGciOi...")
            token = req.headers.authorization.split(' ')[1];

            // Verify the token using our secret key
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Find the user from the token's ID and attach it to the request object.
            // We exclude the password from being attached.
            req.user = await User.findById(decoded.id).select('-password');

            // If user is not found (e.g., deleted), block the request
            if (!req.user) {
                 return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            // Move on to the next function (the actual controller)
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };
