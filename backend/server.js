// server.js

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const dns = require('dns');

// This forces Node.js to use a more compatible DNS lookup method.
dns.setDefaultResultOrder('ipv4first');

// --- Route Files ---
const postRoutes = require('./routes/postRoutes');
const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const customerRoutes = require('./routes/customerRoutes');
const adminRoutes = require('./routes/adminRoutes'); // <-- 1. IMPORT

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Use CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// API Routes
app.use('/api/posts', postRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/admin', adminRoutes); // <-- 2. USE THE NEW ADMIN ROUTE

// --- Make 'uploads' folder static ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Add this just before app.listen(...) ---
app.use((err, req, res, next) => {
  console.error('UNHANDLED ERROR:', err.stack);
  res.status(500).json({ message: err.message });
});

// Test Route
app.get('/', (req, res) => {
    res.send('API is running...');
});


// --- Custom Error Handling Middleware ---
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

app.use(notFound);
app.use(errorHandler);
// --- END ---


const PORT = process.env.PORT || 5001;

app.listen(PORT, () => console.log(`Server running in development mode on port ${PORT}`));
