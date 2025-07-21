// controllers/adminController.js

const Brand = require('../models/brandModel');
const User = require('../models/userModel');
const Product = require('../models/productModel'); // We need the Product model to find vendors

// @desc    Register a new brand and its first admin user
const registerBrand = async (req, res) => {
    const { name, logoUrl, email, password, shopifyVendorName } = req.body;
    try {
        const brandExists = await Brand.findOne({ $or: [{ name }, { shopifyVendorName }] });
        if (brandExists) {
            return res.status(400).json({ message: 'Brand with this name or Shopify vendor name already exists.' });
        }
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'A user with this email already exists.' });
        }
        const brand = await Brand.create({ name, logoUrl, shopifyVendorName });
        if (brand) {
            const user = await User.create({
                name: `${name} Admin`,
                email,
                password,
                brand: shopifyVendorName,
                role: 'Brand Admin',
            });
            res.status(201).json({ message: 'Brand and admin user created successfully', brand });
        } else {
            res.status(400).json({ message: 'Invalid brand data' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all registered brands
const getAllBrands = async (req, res) => {
    try {
        const brands = await Brand.find({}).sort({ name: 1 });
        const users = await User.find({ role: 'Brand Admin' }).select('email brand');
        const brandsWithUsers = brands.map(brand => {
            const adminUser = users.find(u => u.brand === brand.shopifyVendorName);
            return {
                ...brand.toObject(),
                adminEmail: adminUser ? adminUser.email : 'N/A'
            };
        });
        res.json(brandsWithUsers);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get a list of Shopify vendors that are not yet registered as brands
const getUnregisteredVendors = async (req, res) => {
    try {
        // 1. Get a unique list of all vendor names from the products collection
        const allVendorsInProducts = await Product.distinct('brand');

        // 2. Get a list of all vendor names that are already registered as brands
        const registeredBrands = await Brand.find({}).select('shopifyVendorName');
        const registeredVendorNames = registeredBrands.map(b => b.shopifyVendorName);

        // 3. Find the vendors that are in the first list but not in the second
        const unregisteredVendors = allVendorsInProducts.filter(
            vendor => !registeredVendorNames.includes(vendor)
        );

        res.json(unregisteredVendors);
    } catch (error) {
        console.error("Get Unregistered Vendors Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a brand and its admin user
const updateBrand = async (req, res) => {
    const { name, logoUrl, email, password, shopifyVendorName } = req.body;
    try {
        const brand = await Brand.findById(req.params.id);
        if (!brand) return res.status(404).json({ message: 'Brand not found' });
        
        const user = await User.findOne({ brand: brand.shopifyVendorName });
        if (!user) return res.status(404).json({ message: 'Associated admin user not found' });

        brand.name = name || brand.name;
        brand.logoUrl = logoUrl || brand.logoUrl;
        brand.shopifyVendorName = shopifyVendorName || brand.shopifyVendorName;
        
        user.email = email || user.email;
        user.brand = shopifyVendorName || user.brand;
        if (password) {
            user.password = password;
        }

        await brand.save();
        await user.save();
        res.json({ message: 'Brand updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    registerBrand,
    getAllBrands,
    updateBrand,
    getUnregisteredVendors, // Export the new function
};
