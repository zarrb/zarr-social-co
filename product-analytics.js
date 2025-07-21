document.addEventListener('DOMContentLoaded', function() {
    console.log("Product Analytics script loaded.");

    // --- Authentication Check ---
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

    // --- DOM Elements ---
    const preloader = document.getElementById('preloader');
    const tableBody = document.getElementById('productAnalyticsTableBody');
    const noProductsMessage = document.getElementById('noProductsMessage');
    const partnerLogoImg = document.querySelector('.partner-logo img');
    const signOutBtn = document.getElementById('signOutBtn');

    // --- API & DATA FETCHING ---

    const fetchMyBrandDetails = async () => {
        try {
            const { token } = userInfo;
            const response = await fetch('http://localhost:5001/api/users/mybrand', {
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

    const fetchProductAnalytics = async () => {
        if (preloader) preloader.style.display = 'flex';
        try {
            const { token } = userInfo;
            const response = await fetch('http://localhost:5001/api/analytics/products', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('userInfo');
                    window.location.href = 'login.html';
                }
                throw new Error('Failed to fetch product analytics');
            }
            const data = await response.json();
            renderProductAnalyticsTable(data);
        } catch (error) {
            console.error('Error fetching product analytics:', error);
            if (noProductsMessage) noProductsMessage.style.display = 'block';
        } finally {
            if (preloader) preloader.style.display = 'none';
        }
    };

    // --- RENDERING ---

    function renderProductAnalyticsTable(products) {
        if (!tableBody || !noProductsMessage) return;

        tableBody.innerHTML = ''; // Clear previous content

        if (!products || products.length === 0) {
            noProductsMessage.style.display = 'block';
            return;
        }
        noProductsMessage.style.display = 'none';

        products.forEach(product => {
            const row = tableBody.insertRow();
            
            // Calculate Click-Through Rate (CTR)
            const ctr = product.quickViewClicks > 0 
                ? ((product.websiteClicks / product.quickViewClicks) * 100).toFixed(2)
                : '0.00';

            row.innerHTML = `
                <td class="product-info-cell">
                    <img src="${product.imageUrl}" alt="${product.name}" class="product-thumbnail-table" onerror="this.src='https://placehold.co/50x50/eeeeee/cccccc?text=Img';">
                    <span class="product-name-table">${product.name}</span>
                </td>
                <td class="metric-col">${(product.quickViewClicks || 0).toLocaleString()}</td>
                <td class="metric-col">${(product.websiteClicks || 0).toLocaleString()}</td>
                <td class="metric-col">${ctr}%</td>
            `;
        });
    }

    // --- EVENT LISTENERS & INITIALIZATION ---

    if (signOutBtn) {
        signOutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('userInfo');
            window.location.href = 'login.html';
        });
    }
    
    // --- Initial Load ---
    function initializePage() {
        fetchProductAnalytics();
        fetchMyBrandDetails();
    }

    initializePage();
});