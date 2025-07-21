// view-analytics/view-analytics.js

document.addEventListener('DOMContentLoaded', function() {
    console.log("View Analytics script loaded.");

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
    const preloader = document.getElementById('preloader');
    const dateRangeButtons = document.querySelectorAll('.date-range-btn');
    const kpiTotalLikesEl = document.getElementById('kpiTotalLikes');
    const kpiTotalCommentsEl = document.getElementById('kpiTotalComments');
    const kpiTotalSharesEl = document.getElementById('kpiTotalShares');
    const kpiTotalPostsEl = document.getElementById('kpiTotalPosts');
    const kpiEngagementRateEl = document.getElementById('kpiEngagementRate');
    const kpiTotalLikesComparisonEl = document.getElementById('kpiTotalLikesComparison');
    const kpiTotalCommentsComparisonEl = document.getElementById('kpiTotalCommentsComparison');
    const kpiTotalSharesComparisonEl = document.getElementById('kpiTotalSharesComparison');
    const kpiTotalPostsComparisonEl = document.getElementById('kpiTotalPostsComparison');
    const kpiEngagementRateComparisonEl = document.getElementById('kpiEngagementRateComparison');
    const topPerformingPostsContainer = document.getElementById('topPerformingPostsContainer');

    const engagementTrendCtx = document.getElementById('engagementTrendChart')?.getContext('2d');
    const contentTypeCtx = document.getElementById('contentTypeChart')?.getContext('2d');
    const contentTypeSummaryEl = document.getElementById('contentTypeSummary');

    let engagementTrendChartInstance;
    let contentTypeChartInstance;
    
    // --- Main Data Fetching Function ---
    const fetchAnalyticsData = async (days = 30) => {
        showPreloader();
        try {
            const { token } = userInfo;
            const summaryUrl = `http://localhost:5001/api/analytics/summary?days=${days}`;
            const chartsUrl = `http://localhost:5001/api/analytics/charts?days=${days}`;

            // Fetch both sets of data concurrently
            const [summaryResponse, chartsResponse] = await Promise.all([
                fetch(summaryUrl, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(chartsUrl, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (!summaryResponse.ok || !chartsResponse.ok) {
                if (summaryResponse.status === 401 || chartsResponse.status === 401) {
                    localStorage.removeItem('userInfo');
                    window.location.href = '../login.html';
                }
                throw new Error('Failed to fetch analytics data');
            }

            const summaryData = await summaryResponse.json();
            const chartsData = await chartsResponse.json();

            updateKpiCards(summaryData);
            updateEngagementTrendChart(chartsData.trendData);
            updateContentTypeChart(chartsData.contentTypeData);
            updateTopPerformingPosts(chartsData.topPosts);

        } catch (error) {
            console.error('Error fetching analytics:', error);
            showCustomMessage("Error: Could not load analytics data.");
        } finally {
            hidePreloader();
        }
    };

    // --- Rendering Functions ---
    function updateKpiCards(data) {
        const { currentPeriod, previousPeriod } = data;
        if(kpiTotalLikesEl) kpiTotalLikesEl.textContent = currentPeriod.totalLikes.toLocaleString();
        if(kpiTotalCommentsEl) kpiTotalCommentsEl.textContent = currentPeriod.totalComments.toLocaleString();
        if(kpiTotalSharesEl) kpiTotalSharesEl.textContent = currentPeriod.totalShares.toLocaleString();
        if(kpiTotalPostsEl) kpiTotalPostsEl.textContent = currentPeriod.totalPosts.toLocaleString();
        if(kpiEngagementRateEl) kpiEngagementRateEl.textContent = `${currentPeriod.engagementRate}%`;
        updateComparisonText(kpiTotalLikesComparisonEl, calculateComparison(currentPeriod.totalLikes, previousPeriod.totalLikes));
        updateComparisonText(kpiTotalCommentsComparisonEl, calculateComparison(currentPeriod.totalComments, previousPeriod.totalComments));
        updateComparisonText(kpiTotalSharesComparisonEl, calculateComparison(currentPeriod.totalShares, previousPeriod.totalShares));
        updateComparisonText(kpiTotalPostsComparisonEl, calculateComparison(currentPeriod.totalPosts, previousPeriod.totalPosts));
    }

    function calculateComparison(current, previous) {
        if (previous === 0) return { text: current > 0 ? "+100%" : "N/A", class: current > 0 ? "positive" : "neutral" };
        const change = ((current - previous) / previous) * 100;
        const sign = change >= 0 ? "+" : "";
        return { text: `${sign}${change.toFixed(1)}%`, class: change > 0 ? "positive" : "negative" };
    }

    function updateComparisonText(element, comparison) {
        if (!element) return;
        element.textContent = comparison.text;
        element.className = `kpi-comparison ${comparison.class}`;
        let iconClass = comparison.class === 'positive' ? 'fas fa-arrow-up' : (comparison.class === 'negative' ? 'fas fa-arrow-down' : '');
        if (iconClass) element.innerHTML = `<i class="${iconClass}"></i> ${comparison.text}`;
    }

    function updateEngagementTrendChart(trendData) {
        if (!engagementTrendCtx) return;
        const labels = trendData.map(d => new Date(d._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        const likesData = trendData.map(d => d.likes);
        const commentsData = trendData.map(d => d.comments);

        if (engagementTrendChartInstance) engagementTrendChartInstance.destroy();
        engagementTrendChartInstance = new Chart(engagementTrendCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Likes', data: likesData, borderColor: '#bb9935', tension: 0.3, fill: false },
                    { label: 'Comments', data: commentsData, borderColor: '#284664', tension: 0.3, fill: false }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }

    function updateContentTypeChart(contentTypeData) {
        if (!contentTypeCtx) return;
        const labels = contentTypeData.map(d => d._id);
        const counts = contentTypeData.map(d => d.count);
        const total = counts.reduce((a, b) => a + b, 0);

        if (contentTypeChartInstance) contentTypeChartInstance.destroy();
        contentTypeChartInstance = new Chart(contentTypeCtx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{ data: counts, backgroundColor: ['#bb9935', '#284664', '#AA7761'], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } }
        });

        if (contentTypeSummaryEl) {
            contentTypeSummaryEl.innerHTML = contentTypeData.map((d, i) => `
                <li>
                    <span class="legend-color-box" style="background-color: ${contentTypeChartInstance.data.datasets[0].backgroundColor[i]};"></span>
                    <span class="label-text">${d._id.charAt(0).toUpperCase() + d._id.slice(1)}s:</span>
                    <span class="value-text">${d.count} (${total > 0 ? (d.count / total * 100).toFixed(0) : 0}%)</span>
                </li>
            `).join('');
        }
    }

    function updateTopPerformingPosts(topPosts) {
        if (!topPerformingPostsContainer) return;
        topPerformingPostsContainer.innerHTML = '';
        if (topPosts.length === 0) {
            topPerformingPostsContainer.innerHTML = '<p class="empty-posts-message">No posts in this period.</p>';
            return;
        }
        topPosts.forEach(post => {
            const postItem = document.createElement('div');
            postItem.classList.add('top-post-item');
            postItem.innerHTML = `
                <img src="http://localhost:5001${post.mediaUrls[0]}" alt="Post thumbnail" onerror="this.src='https://placehold.co/40x40/eeeeee/cccccc?text=Img';">
                <div class="top-post-item-details">
                    <div class="top-post-item-title">${(post.caption || 'No Caption').substring(0, 50)}...</div>
                    <div class="top-post-item-metrics">
                        <span><i class="fas fa-heart"></i> ${post.analytics.likes.toLocaleString()}</span>
                        <span><i class="fas fa-comments"></i> ${post.analytics.comments.toLocaleString()}</span>
                    </div>
                </div>`;
            topPerformingPostsContainer.appendChild(postItem);
        });
    }

    // --- Event Listeners ---
    dateRangeButtons.forEach(button => {
        button.addEventListener('click', function() {
            dateRangeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            const range = parseInt(this.dataset.range);
            fetchAnalyticsData(range);
        });
    });

    // --- Utility Functions ---
    function showPreloader() { if (preloader) preloader.classList.remove('hidden'); }
    function hidePreloader() { if (preloader) preloader.classList.add('hidden'); }
    function showCustomMessage(message) {
        let box = document.getElementById('customMessageBox');
        if (box) box.remove();
        box = document.createElement('div');
        box.id = 'customMessageBox';
        Object.assign(box.style, { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', padding: '12px 25px', backgroundColor: 'var(--zaar-deep-bronze)', color: 'white', borderRadius: '8px', zIndex: '2000' });
        box.textContent = message;
        document.body.appendChild(box);
        setTimeout(() => box.remove(), 3000);
    }

    // --- Initial Load ---
    fetchAnalyticsData(30);
});
