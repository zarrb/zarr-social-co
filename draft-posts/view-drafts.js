// view-drafts/view-drafts.js

document.addEventListener('DOMContentLoaded', function() {
    console.log("View Drafts script loaded.");

    // --- Authentication Check with try...catch for safety ---
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
    const preloader = document.getElementById('preloader');
    const draftsTableBody = document.getElementById('draftsTableBody');
    const noDraftsMessage = document.getElementById('noDraftsMessage');
    const mainPostDetailModal = document.getElementById('postDetailModal');

    // --- Main Data Fetching Function ---
    const fetchDrafts = async () => {
        try {
            const { token } = userInfo;
            const url = `http://51.21.171.18:5001/api/posts?status=draft`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('userInfo');
                    window.location.href = '../login.html';
                }
                throw new Error('Failed to fetch drafts');
            }

            const data = await response.json();
            renderDraftsTable(data.posts);

        } catch (error) {
            console.error('Error fetching drafts:', error);
            if(draftsTableBody) draftsTableBody.innerHTML = '';
            if(noDraftsMessage) noDraftsMessage.style.display = 'block';
        } finally {
            // Hide the preloader after the fetch is complete (success or fail)
            hidePreloader();
        }
    };

    function hidePreloader() {
        if (preloader) {
            preloader.classList.add('hidden');
        }
    }

    // --- Rendering Function ---
    function renderDraftsTable(drafts) {
        if (!draftsTableBody || !noDraftsMessage) return;
        draftsTableBody.innerHTML = '';
        noDraftsMessage.style.display = 'none';

        if (drafts.length === 0) {
            noDraftsMessage.style.display = 'block';
            return;
        }

        drafts.forEach(draft => {
            const row = draftsTableBody.insertRow();
            row.setAttribute('data-draft-id', draft._id);
            row.classList.add('post-table-row');

            row.innerHTML = `
                <td class="col-thumbnail">
                    <img src="http://51.21.171.18:5001${draft.mediaUrls[0]}" alt="Thumbnail" onerror="this.src='https://placehold.co/45x45/eeeeee/cccccc?text=Draft';">
                </td>
                <td class="col-title" title="${draft.caption || ''}">
                    ${(draft.caption || 'No Caption').substring(0, 70)}...
                </td>
                <td class="col-date">
                    ${new Date(draft.createdAt).toLocaleDateString()}
                </td>
                <td class="col-actions">
                    <button class="action-btn publish-draft-btn" title="Publish Draft"><i class="fas fa-paper-plane"></i></button>
                    <button class="action-btn delete-draft-btn" title="Delete Draft"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
        });
        addTableActionListeners();
    }

    // --- Event Listeners for Actions ---
    function addTableActionListeners() {
        document.querySelectorAll('.publish-draft-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                const row = e.target.closest('.post-table-row');
                const postId = row.dataset.draftId;

                if (confirm('Are you sure you want to publish this draft?')) {
                    try {
                        const { token } = userInfo;
                        const response = await fetch(`http://51.21.171.18:5001/api/posts/${postId}/publish`, {
                            method: 'PUT',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const data = await response.json();
                        if (!response.ok) throw new Error(data.message || 'Could not publish post.');
                        
                        showCustomMessage('Draft published successfully!');
                        fetchDrafts(); // Refresh the drafts list
                    } catch (error) {
                        console.error('Publish error:', error);
                        showCustomMessage(`Error: ${error.message}`);
                    }
                }
            });
        });

        document.querySelectorAll('.delete-draft-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                const row = e.target.closest('.post-table-row');
                const postId = row.dataset.draftId;
                
                if (confirm('Are you sure you want to delete this draft?')) {
                    try {
                        const { token } = userInfo;
                        const response = await fetch(`http://51.21.171.18:5001/api/posts/${postId}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const data = await response.json();
                        if (!response.ok) throw new Error(data.message || 'Could not delete post.');

                        showCustomMessage('Draft deleted successfully.');
                        fetchDrafts(); // Refresh the drafts list
                    } catch (error) {
                        console.error('Delete error:', error);
                        showCustomMessage(`Error: ${error.message}`);
                    }
                }
            });
        });

        // Also add click listener to the row itself to open the detail modal
        document.querySelectorAll('.post-table-row').forEach(row => {
            row.addEventListener('click', function(event) {
                if (event.target.closest('.action-btn')) return; // Don't open modal if an action button was clicked
                const postId = this.dataset.draftId;
                openPostDetailModal(postId);
            });
        });
    }

    // --- Post Detail Modal Logic ---
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
        }
    }

    if (mainPostDetailModal) {
        mainPostDetailModal.querySelector('.modal-close-btn').addEventListener('click', () => {
            mainPostDetailModal.classList.remove('active');
            document.body.classList.remove('panel-open');
        });
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
    fetchDrafts();
});
