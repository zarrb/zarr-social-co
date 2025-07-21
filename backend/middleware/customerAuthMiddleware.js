// middleware/customerAuthMiddleware.js

const jwt = require('jsonwebtoken');
const Customer = require('../models/customerModel.js');

const protectCustomer = async (req, res, next) => {
    let token;

    // Check for the 'Authorization' header starting with 'Bearer'
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify the token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // IMPORTANT: Find the customer by the ID in the token and attach it to the request.
            // We are attaching it as 'req.customer' to distinguish from the brand admin 'req.user'.
            req.customer = await Customer.findById(decoded.id).select('-password');

            if (!req.customer) {
                return res.status(401).json({ message: 'Not authorized, customer not found' });
            }

            // Move on to the next function (e.g., the likePost controller)
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

module.exports = { protectCustomer };
