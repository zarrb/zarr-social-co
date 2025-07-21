// scripts/seeder.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');

// Load the Mongoose models
const User = require('../models/userModel');
const Product = require('../models/productModel');
const Post = require('../models/postModel');
const Brand = require('../models/brandModel'); // Import the new Brand model

// Load environment variables
dotenv.config({ path: require('path').resolve(__dirname, '../.env') });

// Connect to the database
connectDB();

// --- DEFINE YOUR USERS HERE ---
const usersToImport = [
    {
        name: 'ZARR Super Admin',
        email: 'admin@zarr.com',
        password: 'supersecretpassword',
        brand: 'ZARR', // The super admin belongs to the main ZARR brand
        role: 'ZARR Admin', // Assign the new role
    },
    {
        name: 'Naya Dour Admin',
        email: 'admin@nayadour.com',
        password: 'password123',
        brand: 'naya dour',
        role: 'Brand Admin', // This is the default role
    },
    {
        name: 'Levis Admin',
        email: 'admin@levis.com',
        password: 'password123',
        brand: 'Levis',
        role: 'Brand Admin',
    },
];


// Function to import data
const importData = async () => {
    try {
        // Clear existing data to prevent duplicates
        await User.deleteMany();
        await Brand.deleteMany(); // Also clear brands

        // Create the users
        await User.create(usersToImport);

        console.log('✅ Users Imported Successfully!');
        process.exit();
    } catch (error) {
        console.error(`❌ Error importing data: ${error}`);
        process.exit(1);
    }
};

// Function to destroy data
const destroyData = async () => {
    try {
        // Wipe all data from all collections
        await Post.deleteMany();
        await Product.deleteMany();
        await User.deleteMany();
        await Brand.deleteMany();

        console.log('🔥 Data Destroyed Successfully!');
        process.exit();
    } catch (error) {
        console.error(`❌ Error destroying data: ${error}`);
        process.exit(1);
    }
};

if (process.argv[2] === '-d') {
    destroyData();
} else {
    importData();
}
