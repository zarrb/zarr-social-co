// view-posts/view-posts.js

document.addEventListener('DOMContentLoaded', function() {
    console.log("View All Posts script loaded.");

    // --- Authentication Check ---
    let userInfo;
    try {
        userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (!userInfo || !userInfo.token) {
            window.location.href = '../login.html';
            return;
        }
    } catch (error) {
        localStorage.removeItem('userInfo');
        window.location.href = '../login.html';
        return;
    }

    // --- DOM Elements ---
    const postsTableBody = document.getElementById('postsTableBody');
    const paginationControlsTable = document.getElementById('paginationControlsTable');
    const noPostsMessage = document.getElementById('noPostsMessage');
    const postSearchInputTable = document.getElementById('postSearchInputTable');
    const postStatusFilterTable = document.getElementById('postStatusFilterTable');
    const clearFiltersBtnTable = document.getElementById('clearFiltersBtnTable');
    // NEW: Add elements for the post detail modal
    const postDetailModal = document.getElementById('postDetailModal');
    const detailModalMediaContainer = postDetailModal?.querySelector('.modal-media-container');
    const detailModalPostCaption = postDetailModal?.querySelector('#modalPostCaption');
    const detailModalPostProducts = postDetailModal?.querySelector('#modalPostProducts');
    const detailModalCloseBtn = postDetailModal?.querySelector('.modal-close-btn');

    // --- State Management ---
    let currentPage = 1;
    let totalPages = 1;
    let currentKeyword = '';
    let currentStatus = 'all';

    // --- Main Data Fetching Function ---
    const fetchPosts = async () => {
        try {
            const { token } = userInfo;
            const statusParam = currentStatus === 'all' ? '' : `&status=${currentStatus}`;
            const keywordParam = currentKeyword ? `&keyword=${encodeURIComponent(currentKeyword)}` : '';
            const url = `http://51.21.171.18:5001/api/posts?pageNumber=${currentPage}${statusParam}${keywordParam}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('userInfo');
                    window.location.href = '../login.html';
                }
                throw new Error('Failed to fetch posts');
            }
            const data = await response.json();
            renderPostsTable(data.posts);
            renderPagination(data.page, data.pages);
        } catch (error) {
            console.error('Error fetching posts:', error);
            if(postsTableBody) postsTableBody.innerHTML = '';
            if(noPostsMessage) noPostsMessage.style.display = 'block';
        }
    };

    // --- Rendering Functions ---
    function renderPostsTable(posts) {
        if (!postsTableBody || !noPostsMessage) return;
        postsTableBody.innerHTML = '';
        noPostsMessage.style.display = 'none';

        if (posts.length === 0) {
            noPostsMessage.style.display = 'block';
            return;
        }

        posts.forEach(post => {
            const row = postsTableBody.insertRow();
            row.setAttribute('data-post-id', post._id);
            row.classList.add('post-table-row');
            const statusClass = (post.status || 'draft').toLowerCase();
            row.innerHTML = `
                <td class="col-thumbnail">
                    <img src="http://51.21.171.18:5001${post.mediaUrls[0]}" alt="Thumbnail" onerror="this.src='https://placehold.co/45x45/eeeeee/cccccc?text=Img';">
                </td>
                <td class="col-title" title="${post.caption || ''}">
                    ${(post.caption || 'No Caption').substring(0, 70)}...
                </td>
                <td class="col-status">
                    <span class="post-status ${statusClass}">${post.status || 'draft'}</span>
                </td>
                <td class="col-date">
                    ${new Date(post.createdAt).toLocaleDateString()}
                </td>
                <td class="metric-col col-likes">${(post.analytics?.likes || 0).toLocaleString()}</td>
                <td class="metric-col col-shares">${(post.analytics?.shares || 0).toLocaleString()}</td>
                <td class="metric-col col-comments">${(post.analytics?.comments || 0).toLocaleString()}</td>
                <td class="col-actions">
                    <button class="action-btn view-post-btn-table" title="View/Edit Post"><i class="fas fa-eye"></i></button>
                    <button class="action-btn delete-post-btn-table" title="Delete Post"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
        });
        addTableActionListeners();
    }

    function renderPagination(page, pages) {
        if (!paginationControlsTable) return;
        paginationControlsTable.innerHTML = '';
        totalPages = pages;
        currentPage = page;
        if (totalPages <= 1) return;

        const prevButton = document.createElement('button');
        prevButton.classList.add('page-btn');
        prevButton.innerHTML = '&laquo; Prev';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                fetchPosts();
            }
        });
        paginationControlsTable.appendChild(prevButton);

        const pageInfo = document.createElement('span');
        pageInfo.classList.add('page-info');
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        paginationControlsTable.appendChild(pageInfo);

        const nextButton = document.createElement('button');
        nextButton.classList.add('page-btn');
        nextButton.innerHTML = 'Next &raquo;';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                fetchPosts();
            }
        });
        paginationControlsTable.appendChild(nextButton);
    }

    // --- NEW: Post Detail Modal Logic ---
    async function openPostDetailModal(postId) {
        if (!postDetailModal) return;

        // Show loading state
        detailModalMediaContainer.innerHTML = `<div class="spinner"></div>`;
        detailModalPostCaption.textContent = 'Loading...';
        detailModalPostProducts.innerHTML = '';
        postDetailModal.classList.add('active');
        document.body.classList.add('panel-open');

        try {
            const { token } = userInfo;
            const response = await fetch(`http://51.21.171.18:5001/api/posts/${postId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Could not fetch post details.');
            const postData = await response.json();

            // Populate modal with fetched data
            detailModalMediaContainer.innerHTML = `<img src="http://51.21.171.18:5001${postData.mediaUrls[0]}" onerror="this.src='https://placehold.co/400x400/eeeeee/cccccc?text=Media';">`;
            detailModalPostCaption.textContent = postData.caption || 'No caption provided.';

            if (postData.linkedProducts && postData.linkedProducts.length > 0) {
                detailModalPostProducts.innerHTML = postData.linkedProducts.map(product => {
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
                detailModalPostProducts.innerHTML = `<p>No products linked to this post.</p>`;
            }
        } catch (error) {
            console.error("Error fetching post details:", error);
            showCustomMessage("Error: Could not load post details.");
            detailModalMediaContainer.innerHTML = `<p>Error loading content.</p>`;
            detailModalPostCaption.textContent = '';
        }
    }

    function closePostDetailModal() {
        if (postDetailModal) {
            postDetailModal.classList.remove('active');
            document.body.classList.remove('panel-open');
        }
    }

    // --- Event Listeners ---
    function addTableActionListeners() {
        // Event listener for the delete button
        document.querySelectorAll('.delete-post-btn-table').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                const row = e.target.closest('.post-table-row');
                const postId = row.dataset.postId;
                if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
                    try {
                        const { token } = userInfo;
                        const response = await fetch(`http://51.21.171.18:5001/api/posts/${postId}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const data = await response.json();
                        if (!response.ok) throw new Error(data.message || 'Could not delete post.');
                        showCustomMessage('Post deleted successfully.');
                        fetchPosts();
                    } catch (error) {
                        console.error('Delete error:', error);
                        showCustomMessage(`Error: ${error.message}`);
                    }
                }
            });
        });

        // NEW: Event listener for the view button
        document.querySelectorAll('.view-post-btn-table').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const row = e.target.closest('.post-table-row');
                const postId = row.dataset.postId;
                openPostDetailModal(postId);
            });
        });
    }

    if (postSearchInputTable) {
        let searchTimeout;
        postSearchInputTable.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            currentKeyword = e.target.value;
            searchTimeout = setTimeout(() => {
                currentPage = 1;
                fetchPosts();
            }, 500);
        });
    }

    if (postStatusFilterTable) {
        postStatusFilterTable.addEventListener('change', (e) => {
            currentStatus = e.target.value;
            currentPage = 1;
            fetchPosts();
        });
    }
    
    if (clearFiltersBtnTable) {
        clearFiltersBtnTable.addEventListener('click', () => {
            if(postSearchInputTable) postSearchInputTable.value = '';
            if(postStatusFilterTable) postStatusFilterTable.value = 'all';
            currentKeyword = '';
            currentStatus = 'all';
            currentPage = 1;
            fetchPosts();
        });
    }

    // Add listener for the modal close button
    if (detailModalCloseBtn) {
        detailModalCloseBtn.addEventListener('click', closePostDetailModal);
    }

    // --- Utility Function ---
    function showCustomMessage(message) {
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
        }, 3000);
    }

    // --- Initial Load ---
    fetchPosts();
});
