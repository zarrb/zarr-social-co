// scripts/syncProducts.js

const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { shopifyApi, LATEST_API_VERSION, Session } = require('@shopify/shopify-api');
require('@shopify/shopify-api/adapters/node');
const dns = require('dns'); // Import the dns module

// =================================================================================
// NETWORK FIX: Force Node.js to use a reliable public DNS resolver.
// This is a workaround for local environment DNS issues like ENOTFOUND.
// =================================================================================
dns.setDefaultResultOrder('ipv4first');
console.log('DNS resolver configured to prioritize IPv4.');
// =================================================================================


// --- IMPORTANT: Manually import your Mongoose models here ---
const Product = require('../models/productModel'); 
const connectDB = require('../config/db');

// Load environment variables from your .env file
dotenv.config({ path: require('path').resolve(__dirname, '../.env') });


// =================================================================================
// DEBUGGING BLOCK: Let's check if all variables are loaded correctly
// =================================================================================
console.log('--- Checking Shopify Credentials ---');
console.log(`Shopify Store URL: ${process.env.SHOPIFY_STORE_URL}`);
console.log(`Shopify API Key: ${process.env.SHOPIFY_API_KEY}`);
const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
console.log(`Shopify Admin Access Token: ${accessToken ? `Loaded, length: ${accessToken.length}` : '*** MISSING ***'}`);
if (accessToken && accessToken.includes(' ')) {
    console.warn('⚠️ WARNING: Your access token appears to have spaces in it. Please check your .env file for extra characters.');
}
console.log('------------------------------------');
// =================================================================================


/**
 * =================================================================================
 * SHOPIFY API CLIENT SETUP
 * =================================================================================
 */
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET_KEY,
  adminApiAccessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
  hostName: process.env.SHOPIFY_STORE_URL.replace('https://', ''),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: false,
});

/**
 * =================================================================================
 * SCRIPT CONFIGURATION
 * =================================================================================
 */
const BATCH_SIZE = 250;

/**
 * =================================================================================
 * MAIN SYNC FUNCTION
 * =================================================================================
 */
const syncProducts = async () => {
  // Check for missing credentials before starting
  if (!process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || !process.env.SHOPIFY_STORE_URL || !process.env.SHOPIFY_API_KEY) {
      console.error('❌ Critical Error: One or more Shopify environment variables are missing. Please check your .env file.');
      return; // Exit the function early
  }

  console.log('🚀 Starting Shopify product synchronization...');

  try {
    // 1. Connect to our MongoDB database
    await connectDB();
    console.log('✅ MongoDB connection successful.');

    // 2. Manually create a session object with the access token
    const session = new Session({
        id: `offline_${process.env.SHOPIFY_STORE_URL}`, // A unique ID for the session
        shop: process.env.SHOPIFY_STORE_URL,
        state: 'state', // A placeholder state is required
        isOnline: false,
        accessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    });
    console.log('✅ Shopify API session created manually.');
    
    // 3. Create a GraphQL client to make API requests
    const client = new shopify.clients.Graphql({ session });
    console.log('✅ Shopify GraphQL client initialized.');

    let hasNextPage = true;
    let cursor = null;
    let totalSynced = 0;

    console.log('--------------------------------------------------');
    console.log('⬇️  Fetching products from Shopify...');
    console.log('--------------------------------------------------');

    // 4. Loop through all pages of products from the Shopify API
    while (hasNextPage) {
      const query = `
        query getProducts($first: Int!, $after: String) {
          products(first: $first, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                title
                vendor
                handle
                onlineStoreUrl
                tags
                images(first: 5) {
                  edges {
                    node {
                      url
                    }
                  }
                }
                variants(first: 1) {
                  edges {
                    node {
                      price
                      compareAtPrice
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await client.query({
        data: {
          query,
          variables: {
            first: BATCH_SIZE,
            after: cursor,
          },
        },
      });

      // Check for errors in the GraphQL response
      if (response.body.errors) {
        console.error('❌ GraphQL API Error:', response.body.errors);
        throw new Error('Failed to fetch products from Shopify GraphQL API.');
      }

      const productsData = response.body.data.products;
      const productEdges = productsData.edges;

      if (productEdges.length === 0) {
        console.log('No more products to fetch.');
        hasNextPage = false;
        continue;
      }
      
      console.log(`📦 Fetched ${productEdges.length} products. Processing batch...`);

      // 5. Process each product in the fetched batch
      for (const edge of productEdges) {
        const shopifyProduct = edge.node;

        const priceNode = shopifyProduct.variants.edges[0]?.node;
        const discount = priceNode?.compareAtPrice && priceNode?.price 
          ? Math.round(((priceNode.compareAtPrice - priceNode.price) / priceNode.compareAtPrice) * 100)
          : 0;

        const productPayload = {
          shopifyId: shopifyProduct.id,
          name: shopifyProduct.title,
          brand: shopifyProduct.vendor,
          tags: shopifyProduct.tags,
          imageUrl: shopifyProduct.images.edges[0]?.node.url || 'https://placehold.co/300x300?text=No+Image',
          productUrl: shopifyProduct.onlineStoreUrl || `https://${process.env.SHOPIFY_STORE_URL}/products/${shopifyProduct.handle}`,
          price: {
            current: parseFloat(priceNode?.price || 0),
            original: parseFloat(priceNode?.compareAtPrice || 0),
            discountPercentage: discount > 0 ? discount : 0,
          },
        };

        await Product.updateOne(
          { shopifyId: productPayload.shopifyId },
          { $set: productPayload },
          { upsert: true }
        );
      }

      totalSynced += productEdges.length;
      console.log(`💾 Batch processed. Total products synced so far: ${totalSynced}`);

      hasNextPage = productsData.pageInfo.hasNextPage;
      cursor = productsData.pageInfo.endCursor;
    }

    console.log('--------------------------------------------------');
    console.log(`🎉 Synchronization complete! A total of ${totalSynced} products have been synced.`);
    console.log('--------------------------------------------------');

  } catch (error) {
    console.error('❌ An error occurred during synchronization:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB connection closed.');
  }
};

// Run the main function
syncProducts();
