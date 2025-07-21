// controllers/productController.js

const Product = require('../models/productModel');
const { shopifyApi, LATEST_API_VERSION, Session } = require('@shopify/shopify-api');
require('@shopify/shopify-api/adapters/node');

// @desc    Fetch products for the logged-in user's brand
// @route   GET /api/products
const getAllProducts = async (req, res) => {
    try {
        const loggedInUserBrand = req.user.brand;
        const query = {
            brand: { $regex: `^${loggedInUserBrand}$`, $options: 'i' }
        };
        if (req.query.search) {
            query.name = { $regex: req.query.search, $options: 'i' };
        }
        const products = await Product.find(query);
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Trigger a manual sync of products from Shopify for the user's brand
// @route   POST /api/products/sync
const syncProductsFromShopify = async (req, res) => {
    try {
        const brandToSync = req.user.brand;
        if (!brandToSync) {
            return res.status(400).json({ message: 'Brand information not found for user.' });
        }
        
        console.log(`🚀 Starting Shopify product synchronization for brand: ${brandToSync}...`);

        const shopify = shopifyApi({
            apiKey: process.env.SHOPIFY_API_KEY,
            apiSecretKey: process.env.SHOPIFY_API_SECRET_KEY,
            adminApiAccessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
            hostName: process.env.SHOPIFY_STORE_URL.replace('https://', ''),
            apiVersion: LATEST_API_VERSION,
            isEmbeddedApp: false,
        });

        const session = new Session({
            id: `sync-session-${Date.now()}`,
            shop: process.env.SHOPIFY_STORE_URL,
            state: 'state',
            isOnline: false,
            accessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
        });

        const client = new shopify.clients.Graphql({ session });

        let hasNextPage = true;
        let cursor = null;
        let totalSyncedForBrand = 0;

        while (hasNextPage) {
            const query = `
              query getProducts($first: Int!, $after: String, $query: String) {
                products(first: $first, after: $after, query: $query) {
                  pageInfo { hasNextPage, endCursor }
                  edges {
                    node {
                      id, title, vendor, handle, onlineStoreUrl, tags,
                      images(first: 1) { edges { node { url } } },
                      variants(first: 1) { edges { node { price, compareAtPrice } } }
                    }
                  }
                }
              }
            `;

            const response = await client.query({
                data: {
                    query,
                    variables: {
                        first: 250,
                        after: cursor,
                        query: `vendor:'${brandToSync}'`
                    },
                },
            });

            const productsData = response.body.data.products;
            const productEdges = productsData.edges;

            if (productEdges.length === 0) {
                hasNextPage = false;
                continue;
            }

            for (const edge of productEdges) {
                const shopifyProduct = edge.node;
                const priceNode = shopifyProduct.variants.edges[0]?.node;
                const discount = priceNode?.compareAtPrice && priceNode?.price ? Math.round(((priceNode.compareAtPrice - priceNode.price) / priceNode.compareAtPrice) * 100) : 0;
                const productPayload = {
                    shopifyId: shopifyProduct.id,
                    name: shopifyProduct.title,
                    brand: shopifyProduct.vendor,
                    tags: shopifyProduct.tags,
                    imageUrl: shopifyProduct.images.edges[0]?.node.url || '',
                    productUrl: shopifyProduct.onlineStoreUrl || `https://${process.env.SHOPIFY_STORE_URL}/products/${shopifyProduct.handle}`,
                    price: {
                        current: parseFloat(priceNode?.price || 0),
                        original: parseFloat(priceNode?.compareAtPrice || 0),
                        discountPercentage: discount > 0 ? discount : 0,
                    },
                };
                await Product.updateOne({ shopifyId: productPayload.shopifyId }, { $set: productPayload }, { upsert: true });
            }
            totalSyncedForBrand += productEdges.length;
            hasNextPage = productsData.pageInfo.hasNextPage;
            cursor = productsData.pageInfo.endCursor;
        }
        
        console.log(`✅ Sync complete for ${brandToSync}. Synced ${totalSyncedForBrand} products.`);
        res.json({ message: 'Sync complete', count: totalSyncedForBrand });

    } catch (error) {
        console.error('❌ An error occurred during manual synchronization:', error);
        res.status(500).json({ message: 'Server Error during sync' });
    }
};

const trackQuickViewClick = async (req, res) => {
    try {
        // Use $inc to atomically increment the counter in the database
        const product = await Product.findByIdAndUpdate(req.params.id, { $inc: { quickViewClicks: 1 } });
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.status(200).json({ message: 'Quick view click tracked' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const trackWebsiteClick = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, { $inc: { websiteClicks: 1 } });
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.status(200).json({ message: 'Website click tracked' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getAllProducts,
    syncProductsFromShopify,
    trackQuickViewClick,
    trackWebsiteClick,
};
