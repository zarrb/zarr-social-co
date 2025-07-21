// zarr-social-commerce-dashboard/script/script.js

document.addEventListener('DOMContentLoaded', function() {
    console.log("Zaar Admin Dashboard script loaded.");

    // --- User Authentication Check ---
    let userInfo;
    try {
        userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (!userInfo || !userInfo.token) {
            window.location.href = 'login.html';
            return;
        }
    } catch (error) {
        localStorage.removeItem('userInfo');
        window.location.href = 'login.html';
        return;
    }

    // --- Global State ---
    let allProducts = [];
    let allPosts = [];
    let tempSelectedProductIdsInModal = [];
    let finalSelectedProductIdsForPost = [];
    let uploadedFilesStore = [];

    // --- DOM Elements ---
    const preloader = document.getElementById('preloader');
    const partnerLogoImg = document.querySelector('.partner-logo img');
    const productSelectModal = document.getElementById('selectProductsModal');
    const productListContainer = document.getElementById('productListContainer');
    const productSearchInput = document.getElementById('productSearchInput');
    const confirmProductSelectionBtn = document.getElementById('confirmProductSelectionBtn');
    const selectedProductCountEl = document.getElementById('selectedProductCount');
    const selectProductsBtn = document.getElementById('selectProductsBtn');
    const selectedProductsPreview = document.getElementById('selectedProductsPreview');
    const uploadPostForm = document.getElementById('uploadPostForm');
    const postMediaFile = document.getElementById('postMediaFile');
    const mediaPreviewGrid = document.getElementById('mediaPreviewGrid');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fabContainer = document.querySelector('.fab-container');
    const fabMainBtn = document.getElementById('fabMainBtn');
    const uploadPostPanel = document.getElementById('uploadPostPanel');
    const panelOverlay = document.getElementById('uploadPostPanelOverlay');
    const closeUploadPanelBtn = document.getElementById('closeUploadPanelBtn');
    const cancelUploadBtnPanel = document.getElementById('cancelUploadBtnPanel');
    const mainPostDetailModal = document.getElementById('postDetailModal');
    const productModalCloseBtn = productSelectModal?.querySelector('.product-modal-close-btn');
    const productModalCancelBtn = productSelectModal?.querySelector('.product-modal-cancel-btn');
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const mediaTypeButtons = document.querySelectorAll('.media-type-btn');
    const selectedMediaTypeInput = document.getElementById('selectedMediaType');

    // --- API & DATA FETCHING FUNCTIONS ---
    const fetchMyBrandDetails = async () => {
        try {
            const { token } = userInfo;
            const response = await fetch('http://51.21.171.18:5001/api/users/mybrand', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Could not fetch brand details.');
            const brandData = await response.json();
            if (partnerLogoImg && brandData.logoUrl) {
                partnerLogoImg.src = brandData.logoUrl;
            }
        } catch (error) {
            console.error("Error fetching brand details:", error);
        }
    };

    const fetchPostsForBrand = async () => {
        try {
            const { token } = userInfo;
            const cacheBust = `t=${new Date().getTime()}`;
            const response = await fetch(`http://51.21.171.18:5001/api/posts?${cacheBust}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('userInfo');
                    window.location.href = 'login.html';
                }
                throw new Error('Could not fetch posts.');
            }
            const data = await response.json();
            allPosts = data.posts;
            return data;
        } catch (error) {
            console.error("Error fetching posts:", error);
            showCustomMessage("Error: Could not load post data.");
            return { posts: [], page: 1, pages: 1 };
        }
    };

    const fetchProductsFromAPI = async (searchTerm = '') => {
        try {
            const { token } = userInfo;
            let apiUrl = 'http://51.21.171.18:5001/api/products';
            if (searchTerm) {
                apiUrl += `?search=${encodeURIComponent(searchTerm)}`;
            }
            const response = await fetch(apiUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('userInfo');
                    window.location.href = 'login.html';
                }
                throw new Error('Failed to fetch products');
            }
            const products = await response.json();
            allProducts = products;
            renderProductList(allProducts);
        } catch (error) {
            console.error('Error fetching products:', error);
            if (productListContainer) productListContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">Could not load products.</p>';
        }
    };

    const uploadFileHandler = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const { token } = userInfo;
            const response = await fetch('http://51.21.171.18:5001/api/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'File upload failed');
            return data.path;
        } catch (error) {
            console.error('Upload error:', error);
            showCustomMessage(`Upload Error: ${error.message}`);
            return null;
        }
    };

    const handleSyncProducts = async () => {
        const syncButton = document.querySelector('.fab-action-item[data-action="sync-products"]');
        const syncIcon = syncButton?.querySelector('i');
        if (!syncButton || !syncIcon) return;
        syncButton.disabled = true;
        syncIcon.className = 'fas fa-spinner fa-spin';
        showCustomMessage("Syncing products from Shopify... Please wait.", 10000);
        try {
            const { token } = userInfo;
            const response = await fetch('http://51.21.171.18:5001/api/products/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Product sync failed.');
            showCustomMessage(`${data.count} products were synced for your brand.`);
        } catch (error) {
            console.error("Sync Error:", error);
            showCustomMessage(`Error: ${error.message}`);
        } finally {
            syncButton.disabled = false;
            syncIcon.className = 'fas fa-sync-alt';
        }
    };

    // --- DASHBOARD INITIALIZATION & RENDERING ---
    async function initializeDashboard() {
        console.log("Initializing dashboard data...");
        const [postData] = await Promise.all([
            fetchPostsForBrand(),
            fetchMyBrandDetails()
        ]);
        const posts = postData.posts;
        displayDashboardAnalytics(posts);
        displayRecentPostsTable(posts);
        displaySpotlightCategories(posts);
        hidePreloader();
    }

    function hidePreloader() {
        if (preloader) preloader.classList.add('hidden');
    }

    function displayDashboardAnalytics(posts) {
        const totalPostsEl = document.getElementById('total-posts');
        const totalLikesEl = document.getElementById('total-likes');
        const totalSharesEl = document.getElementById('total-shares');
        const totalCommentsEl = document.getElementById('total-comments');
        if (!totalPostsEl || !Array.isArray(posts)) return;
        totalPostsEl.textContent = posts.length;
        totalLikesEl.textContent = posts.reduce((sum, post) => sum + (post.analytics?.likes || 0), 0).toLocaleString();
        totalSharesEl.textContent = posts.reduce((sum, post) => sum + (post.analytics?.shares || 0), 0).toLocaleString();
        totalCommentsEl.textContent = posts.reduce((sum, post) => sum + (post.analytics?.comments || 0), 0).toLocaleString();
    }

    function displayRecentPostsTable(posts) {
        const container = document.querySelector('.recent-posts-body');
        if (!container) return;
        const recentPosts = posts.filter(p => p.status === 'published').slice(0, 5);
        if (recentPosts.length === 0) {
            container.innerHTML = `<div class="empty-posts-message">No recent posts to display.</div>`;
            return;
        }
        container.innerHTML = recentPosts.map(post => `
            <div class="recent-post-row" data-post-id="${post._id}">
                <div class="post-cell post-info-cell">
                    <img src="http://51.21.171.18:5001${post.mediaUrls[0]}" class="post-thumbnail-table" onerror="this.src='https://placehold.co/45x45/eeeeee/cccccc?text=Img';">
                    <span class="post-title-table">${(post.caption || 'No Caption').substring(0, 50)}...</span>
                </div>
                <div class="post-cell metric-cell">${(post.analytics?.likes || 0).toLocaleString()}</div>
                <div class="post-cell metric-cell">${(post.analytics?.shares || 0).toLocaleString()}</div>
                <div class="post-cell metric-cell">${(post.analytics?.comments || 0).toLocaleString()}</div>
            </div>
        `).join('');
        addPostClickListeners();
    }

    function displaySpotlightCategories(posts) {
        const container = document.getElementById('spotlightCategoriesContainer');
        const publishedPosts = posts.filter(p => p.status === 'published');
        if (!container || publishedPosts.length === 0) {
            if(container) container.innerHTML = `<p class="empty-posts-message">Not enough post data for spotlight.</p>`;
            return;
        }
        const topLikedPost = [...publishedPosts].sort((a, b) => (b.analytics?.likes || 0) - (a.analytics?.likes || 0))[0];
        if (!topLikedPost) return;
        container.innerHTML = `
            <div class="spotlight-category">
                <h3 class="spotlight-category-title">Most Liked Post</h3>
                <div class="spotlight-posts-list">
                    <div class="spotlight-card" data-post-id="${topLikedPost._id}">
                        <div class="spotlight-post-info">
                            <img src="http://51.21.171.18:5001${topLikedPost.mediaUrls[0]}" onerror="this.src='https://placehold.co/40x40/eeeeee/cccccc?text=Img';">
                            <span class="spotlight-post-title">${(topLikedPost.caption || 'No Caption').substring(0, 50)}...</span>
                        </div>
                        <div class="spotlight-metric">
                            <i class="fas fa-heart"></i> ${(topLikedPost.analytics?.likes || 0).toLocaleString()} Likes
                        </div>
                    </div>
                </div>
            </div>`;
        addPostClickListeners();
    }

    // --- POST CREATION & FORM LOGIC ---
    const handlePostSubmit = async (status) => {
        const activeFiles = uploadedFilesStore.filter(file => file !== null);
        if (activeFiles.length === 0) {
            showCustomMessage("Please select a file to upload.");
            return;
        }
        if (finalSelectedProductIdsForPost.length === 0) {
            showCustomMessage("Please link at least one product to the post.");
            return;
        }
        const uploadedFilePath = await uploadFileHandler(activeFiles[0]);
        if (!uploadedFilePath) {
            showCustomMessage("Could not upload file. Please try again.");
            return;
        }
        const postData = {
            mediaType: selectedMediaTypeInput.value,
            mediaUrls: [uploadedFilePath],
            caption: document.getElementById('postCaption').value,
            linkedProducts: finalSelectedProductIdsForPost,
            status: status
        };
        try {
            const { token } = userInfo;
            const response = await fetch('http://51.21.171.18:5001/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(postData)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to save ${status}`);
            }
            showCustomMessage(`Post saved as ${status} successfully!`);
            closeUploadPanel();
            if (status === 'published') {
                initializeDashboard();
            }
        } catch (error) {
            console.error('Post creation error:', error);
            showCustomMessage(`Error: ${error.message}`);
        }
    };

    if (uploadPostForm) {
        uploadPostForm.addEventListener('submit', (event) => {
            event.preventDefault();
            handlePostSubmit('published');
        });
    }

    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', () => {
            handlePostSubmit('draft');
        });
    }

    function handleMediaFiles(files) {
        if (!mediaPreviewGrid) return;
        mediaPreviewGrid.innerHTML = ''; 
        uploadedFilesStore = [];
        const file = files[0];
        if (!file) return;
        uploadedFilesStore.push(file);
        const previewItem = document.createElement('div');
        previewItem.classList.add('media-preview-item');
        const reader = new FileReader();
        if (file.type.startsWith('image/')) {
            reader.onload = e => {
                const img = document.createElement('img');
                img.src = e.target.result;
                previewItem.appendChild(img);
            };
        } else if (file.type.startsWith('video/')) {
            reader.onload = e => {
                const video = document.createElement('video');
                video.src = e.target.result;
                video.muted = true;
                video.playsinline = true;
                video.autoplay = true;
                video.loop = true;
                previewItem.appendChild(video);
            };
        }
        reader.readAsDataURL(file);
        const removeBtn = document.createElement('button');
        removeBtn.classList.add('remove-media-btn');
        removeBtn.innerHTML = '&times;';
        removeBtn.type = 'button';
        removeBtn.onclick = () => {
            uploadedFilesStore = [];
            previewItem.remove();
            postMediaFile.value = '';
        };
        previewItem.appendChild(removeBtn);
        mediaPreviewGrid.appendChild(previewItem);
    }

    // --- PRODUCT MODAL LOGIC ---
    function renderProductList(productsToRender) {
        if (!productListContainer) return;
        productListContainer.innerHTML = '';
        if (productsToRender.length === 0) {
            productListContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">No products found.</p>';
            return;
        }
        productsToRender.forEach(product => {
            const item = document.createElement('div');
            item.classList.add('product-list-item');
            item.setAttribute('data-product-id', product._id);
            if (tempSelectedProductIdsInModal.includes(product._id)) {
                item.classList.add('selected');
            }
            item.innerHTML = `
                <img src="${product.imageUrl}" alt="${product.name}" class="item-thumbnail" onerror="this.src='https://placehold.co/50x50/eeeeee/cccccc?text=Prd'; this.onerror=null;">
                <div class="item-info">
                    <div class="item-brand">${product.brand || 'ZAAR'}</div>
                    <div class="item-name">${product.name}</div>
                    <div class="item-price">PKR ${product.price.current.toLocaleString()}</div>
                </div>
                <div class="selection-checkmark"><i class="fas fa-check"></i></div>
            `;
            item.addEventListener('click', () => toggleProductSelectionInModal(product._id, item));
            productListContainer.appendChild(item);
        });
    }

    function toggleProductSelectionInModal(productId, element) {
        element.classList.toggle('selected');
        if (tempSelectedProductIdsInModal.includes(productId)) {
            tempSelectedProductIdsInModal = tempSelectedProductIdsInModal.filter(id => id !== productId);
        } else {
            tempSelectedProductIdsInModal.push(productId);
        }
        if(selectedProductCountEl) selectedProductCountEl.textContent = tempSelectedProductIdsInModal.length;
    }

    async function openProductSelectModal() {
        if (!productSelectModal) return;
        tempSelectedProductIdsInModal = [...finalSelectedProductIdsForPost]; 
        if(selectedProductCountEl) selectedProductCountEl.textContent = tempSelectedProductIdsInModal.length;
        productSelectModal.classList.add('active');
        document.body.classList.add('panel-open');
        await fetchProductsFromAPI();
    }

    function closeProductSelectModal() {
        if (productSelectModal) productSelectModal.classList.remove('active');
    }
    
    function confirmSelection() {
        finalSelectedProductIdsForPost = [...tempSelectedProductIdsInModal]; 
        if(selectedProductsPreview) {
            selectedProductsPreview.innerHTML = ''; 
            if (finalSelectedProductIdsForPost.length === 0) {
                selectedProductsPreview.innerHTML = '<p class="no-products-message">No products linked yet.</p>';
            } else {
                finalSelectedProductIdsForPost.forEach(productId => {
                    const productData = allProducts.find(p => p._id === productId);
                    if (productData) {
                        const productMiniCard = document.createElement('div');
                        productMiniCard.classList.add('selected-product-item');
                        productMiniCard.innerHTML = `
                            <img src="${productData.imageUrl}" alt="${productData.name}" onerror="this.src='https://placehold.co/30x30/eeeeee/cccccc?text=Prd'; this.onerror=null;">
                            <span class="selected-product-name">${productData.name}</span>
                            <button type="button" class="remove-selected-product" data-id="${productData._id}">&times;</button>
                        `;
                        productMiniCard.querySelector('.remove-selected-product').addEventListener('click', function() {
                            const idToRemove = this.dataset.id;
                            finalSelectedProductIdsForPost = finalSelectedProductIdsForPost.filter(id => id !== idToRemove);
                            tempSelectedProductIdsInModal = tempSelectedProductIdsInModal.filter(id => id !== idToRemove);
                            if(selectedProductCountEl) selectedProductCountEl.textContent = tempSelectedProductIdsInModal.length;
                            confirmSelection();
                        });
                        selectedProductsPreview.appendChild(productMiniCard);
                    }
                });
            }
        }
        closeProductSelectModal();
    }

    // --- MODAL & UI INTERACTION LOGIC ---
    function addPostClickListeners() {
        document.querySelectorAll('.recent-post-row, .spotlight-card').forEach(item => {
            item.addEventListener('click', function() {
                const postId = this.dataset.postId;
                if (postId) {
                    openPostDetailModal(postId);
                }
            });
        });
    }

    async function openPostDetailModal(postId) {
        if (!mainPostDetailModal) return;
        const mediaContainer = mainPostDetailModal.querySelector('.modal-media-container');
        const captionEl = mainPostDetailModal.querySelector('#modalPostCaption');
        const productsGrid = mainPostDetailModal.querySelector('#modalPostProducts');
        mediaContainer.innerHTML = `<div class="spinner"></div>`;
        captionEl.textContent = 'Loading...';
        productsGrid.innerHTML = '';
        mainPostDetailModal.classList.add('active');
        document.body.classList.add('panel-open');
        try {
            const { token } = userInfo;
            const response = await fetch(`http://51.21.171.18:5001/api/posts/${postId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Could not fetch post details.');
            const postData = await response.json();
            mediaContainer.innerHTML = `<img src="http://51.21.171.18:5001${postData.mediaUrls[0]}" onerror="this.src='https://placehold.co/400x400/eeeeee/cccccc?text=Media';">`;
            captionEl.textContent = postData.caption || 'No caption provided.';
            if (postData.linkedProducts && postData.linkedProducts.length > 0) {
                productsGrid.innerHTML = postData.linkedProducts.map(product => {
                    let priceHTML = `<div class="product-current-price">PKR ${product.price.current.toLocaleString()}</div>`;
                    if (product.price.original) priceHTML += `<div class="product-original-price">PKR ${product.price.original.toLocaleString()}</div>`;
                    if (product.price.discountPercentage) priceHTML += `<div class="product-discount">${product.price.discountPercentage}% OFF</div>`;
                    return `
                        <div class="modal-product-card">
                            <div class="product-image-wrapper"><img src="${product.imageUrl}" alt="${product.name}" onerror="this.src='https://placehold.co/120x120/eeeeee/cccccc?text=Prd';"></div>
                            <div class="product-details-content">
                                <div class="product-brand">${product.brand}</div>
                                <div class="product-name" title="${product.name}">${product.name}</div>
                                <div class="product-price-container">${priceHTML}</div>
                                <a href="${product.productUrl}" class="product-link" target="_blank" rel="noopener noreferrer">View Product</a>
                            </div>
                        </div>`;
                }).join('');
            } else {
                productsGrid.innerHTML = `<p>No products linked to this post.</p>`;
            }
        } catch (error) {
            console.error("Error fetching post details:", error);
            showCustomMessage("Error: Could not load post details.");
            mediaContainer.innerHTML = `<p>Error loading content.</p>`;
            captionEl.textContent = '';
        }
    }
    
    if (mainPostDetailModal) {
        mainPostDetailModal.querySelector('.modal-close-btn').addEventListener('click', () => {
            mainPostDetailModal.classList.remove('active');
            if (!document.querySelector('.upload-panel.active')) {
                document.body.classList.remove('panel-open');
            }
        });
    }

    function openUploadPanel() {
        if (uploadPostPanel && panelOverlay) {
            uploadPostPanel.classList.add('active');
            panelOverlay.classList.add('active');
            document.body.classList.add('panel-open');
        }
    }

    function closeUploadPanel() {
        if (uploadPostPanel && panelOverlay) {
            uploadPostPanel.classList.remove('active');
            panelOverlay.classList.remove('active');
            if (!document.querySelector('.modal.active')) {
                document.body.classList.remove('panel-open');
            }
        }
    }

    if (fabMainBtn && fabContainer) {
        fabMainBtn.addEventListener('click', () => {
            fabContainer.classList.toggle('active');
            const icon = fabMainBtn.querySelector('i');
            icon.className = fabContainer.classList.contains('active') ? 'fas fa-times' : 'fas fa-plus';
        });
    }

    // --- EVENT LISTENERS ---
    document.querySelectorAll('.fab-action-item').forEach(item => {
        item.addEventListener('click', (event) => {
            const action = event.currentTarget.dataset.action;
            if (action === 'upload-post') openUploadPanel();
            else if (action === 'sync-products') handleSyncProducts();
        });
    });

    if (closeUploadPanelBtn) closeUploadPanelBtn.addEventListener('click', closeUploadPanel);
    if (cancelUploadBtnPanel) cancelUploadBtnPanel.addEventListener('click', closeUploadPanel);
    if (panelOverlay) {
        panelOverlay.addEventListener('click', (event) => {
            if (event.target === panelOverlay) {
                closeUploadPanel();
                if(productSelectModal) productSelectModal.classList.remove('active');
                if(mainPostDetailModal) mainPostDetailModal.classList.remove('active');
            }
        });
    }
    if (selectProductsBtn) selectProductsBtn.addEventListener('click', openProductSelectModal);
    if (confirmProductSelectionBtn) confirmProductSelectionBtn.addEventListener('click', confirmSelection);
    if (productModalCloseBtn) productModalCloseBtn.addEventListener('click', closeProductSelectModal);
    if (productModalCancelBtn) productModalCancelBtn.addEventListener('click', closeProductSelectModal);

    if (postMediaFile) postMediaFile.addEventListener('change', (e) => handleMediaFiles(e.target.files));
    if (fileUploadArea) {
        fileUploadArea.addEventListener('click', () => postMediaFile.click());
        fileUploadArea.addEventListener('dragover', e => { e.preventDefault(); fileUploadArea.classList.add('dragover'); });
        fileUploadArea.addEventListener('dragleave', () => fileUploadArea.classList.remove('dragover'));
        fileUploadArea.addEventListener('drop', e => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) handleMediaFiles(e.dataTransfer.files);
        });
    }

    if (mediaTypeButtons) {
        mediaTypeButtons.forEach(button => {
            button.addEventListener('click', function() {
                mediaTypeButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                const selectedType = this.dataset.type;
                selectedMediaTypeInput.value = selectedType;
                if (selectedType === 'image') {
                    postMediaFile.accept = 'image/*';
                    postMediaFile.multiple = true;
                } else if (selectedType === 'video') {
                    postMediaFile.accept = 'video/*';
                    postMediaFile.multiple = false;
                }
                if(mediaPreviewGrid) mediaPreviewGrid.innerHTML = '';
                uploadedFilesStore = [];
                postMediaFile.value = '';
            });
        });
    }

    // --- UTILITY FUNCTION ---
    function showCustomMessage(message, duration = 3000) {
        let messageBox = document.getElementById('customMessageBox');
        if (messageBox) messageBox.remove();
        messageBox = document.createElement('div');
        messageBox.id = 'customMessageBox';
        Object.assign(messageBox.style, {
            position: 'fixed', bottom: '-50px', left: '50%', transform: 'translateX(-50%)',
            padding: '12px 25px', backgroundColor: 'var(--zaar-deep-bronze)', color: 'white',
            borderRadius: '8px', boxShadow: 'var(--shadow-fab)', zIndex: '2000',
            opacity: '0', transition: 'opacity 0.3s ease, bottom 0.3s ease'
        });
        messageBox.textContent = message;
        document.body.appendChild(messageBox);
        setTimeout(() => {
            messageBox.style.opacity = '1';
            messageBox.style.bottom = '20px';
        }, 10);
        setTimeout(() => {
            messageBox.style.opacity = '0';
            messageBox.style.bottom = '10px';
            setTimeout(() => messageBox.remove(), 300);
        }, duration);
    }
    
    // --- INITIALIZATION ---
    initializeDashboard();
});
