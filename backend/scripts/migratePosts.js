const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Post = require('../models/postModel'); // Adjust path if needed
const connectDB = require('../config/db'); // Adjust path if needed

// THE FIX IS HERE: We remove the incorrect path.
// This tells dotenv to look for the .env file in the current directory (backend), which is correct.
dotenv.config();

connectDB();

const migratePosts = async () => {
    try {
        console.log('Fetching posts with old linkedProducts format...');

        // Find posts where linkedProducts is an array of ObjectIDs, not objects
        const postsToMigrate = await Post.find({
            "linkedProducts.0": { "$type": "objectId" }
        });

        if (postsToMigrate.length === 0) {
            console.log('No posts found with the old format. Migration not needed.');
            process.exit();
        }

        console.log(`Found ${postsToMigrate.length} posts to migrate.`);
        let updatedCount = 0;

        for (const post of postsToMigrate) {
            const newLinkedProducts = post.linkedProducts.map(productId => ({
                product: productId,
                quickViewClicks: 0,
                websiteClicks: 0
            }));
            
            post.linkedProducts = newLinkedProducts;
            await post.save();
            updatedCount++;
            console.log(`Updated post ${post._id}`);
        }

        console.log(`Migration complete. Successfully updated ${updatedCount} posts.`);
        process.exit();

    } catch (error) {
        console.error('Error during migration:', error);
        process.exit(1);
    }
};

migratePosts();