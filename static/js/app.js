// State Management
let releases = [];
let filteredReleases = [];
let selectedRelease = null;
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const releasesFeed = document.getElementById('releases-feed');
const btnRefresh = document.getElementById('btn-refresh');
const btnExport = document.getElementById('btn-export');
const refreshIcon = document.getElementById('refresh-icon');
const cacheTimeText = document.getElementById('cache-time-text');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const typeFilters = document.getElementById('type-filters');
const loadingOverlay = document.getElementById('loading-overlay');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');
const btnRetry = document.getElementById('btn-retry');
const emptyContainer = document.getElementById('empty-container');
const btnClearFilters = document.getElementById('btn-clear-filters');

// Stats Elements
const statTotalCount = document.getElementById('stat-total-count');
const statLatestDate = document.getElementById('stat-latest-date');
const countAll = document.getElementById('count-all');
const countFeature = document.getElementById('count-feature');
const countDeprecated = document.getElementById('count-deprecated');
const countChanged = document.getElementById('count-changed');
const countFixed = document.getElementById('count-fixed');
const countOther = document.getElementById('count-other');

// Drawer Elements
const tweetDrawer = document.getElementById('tweet-drawer');
const drawerOverlay = document.getElementById('drawer-overlay');
const btnCloseDrawer = document.getElementById('btn-close-drawer');
const previewDate = document.getElementById('preview-date');
const previewBadge = document.getElementById('preview-badge');
const previewText = document.getElementById('preview-text');
const tweetTextarea = document.getElementById('tweet-textarea');
const charProgress = document.getElementById('char-progress');
const charCount = document.getElementById('char-count');
const btnTweetPost = document.getElementById('btn-tweet-post');
const tagHelperBtns = document.querySelectorAll('.tag-helper-btn');

// Constants
const CHAR_LIMIT = 280;
const CIRCUMFERENCE = 88; // 2 * PI * r (r=14)

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Refresh & Export buttons
    btnRefresh.addEventListener('click', () => fetchReleases(true));
    btnRetry.addEventListener('click', () => fetchReleases(true));
    btnExport.addEventListener('click', exportToCSV);
    
    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = searchQuery.length > 0 ? 'flex' : 'none';
        applyFilters();
    });
    
    // Clear search
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        applyFilters();
        searchInput.focus();
    });
    
    // Category filters
    typeFilters.addEventListener('click', (e) => {
        const button = e.target.closest('.filter-btn');
        if (!button) return;
        
        // Update active class
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        currentFilter = button.dataset.filter;
        applyFilters();
    });
    
    // Reset filters empty state button
    btnClearFilters.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-filter="all"]').classList.add('active');
        
        currentFilter = 'all';
        applyFilters();
    });
    
    // Drawer close mechanisms
    btnCloseDrawer.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);
    
    // Tweet composer input
    tweetTextarea.addEventListener('input', updateCharCounter);
    
    // Hashtag helper buttons
    tagHelperBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.dataset.tag;
            let currentText = tweetTextarea.value;
            
            // Check if hashtag is already in tweet
            if (currentText.includes(tag)) return;
            
            // Append with proper spacing
            if (currentText.endsWith(' ') || currentText === '') {
                tweetTextarea.value = currentText + tag;
            } else {
                tweetTextarea.value = currentText + ' ' + tag;
            }
            
            updateCharCounter();
            tweetTextarea.focus();
        });
    });
    
    // Post to Twitter
    btnTweetPost.addEventListener('click', () => {
        const text = tweetTextarea.value;
        if (text.length > CHAR_LIMIT) {
            alert("Tweet exceeds character limit!");
            return;
        }
        if (text.length === 0) {
            alert("Tweet cannot be empty!");
            return;
        }
        
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=550,height=420');
    });
}

// Fetch releases from the server
async function fetchReleases(forceRefresh = false) {
    showLoading(true);
    errorContainer.classList.add('hidden');
    
    let url = '/api/releases';
    if (forceRefresh) {
        url += '?refresh=true';
        refreshIcon.classList.add('spin');
        btnRefresh.disabled = true;
    }
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        
        if (result.status === 'error') {
            throw new Error(result.message);
        }
        
        releases = result.data;
        cacheTimeText.textContent = `Feed synced: ${formatCacheTime(result.cached_at)}`;
        
        updateStats();
        applyFilters();
        
    } catch (error) {
        console.error('Failed to fetch release notes:', error);
        errorMessage.textContent = error.message || 'An error occurred while connecting to the server.';
        errorContainer.classList.remove('hidden');
        releasesFeed.innerHTML = '';
        emptyContainer.classList.add('hidden');
    } finally {
        showLoading(false);
        refreshIcon.classList.remove('spin');
        btnRefresh.disabled = false;
    }
}

// Helper to format date nicely
function formatCacheTime(timeStr) {
    if (!timeStr) return 'Unknown';
    try {
        const date = new Date(timeStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return timeStr;
    }
}

// Toggle loading state UI
function showLoading(isLoading) {
    if (isLoading) {
        loadingOverlay.style.opacity = '1';
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            if (loadingOverlay.style.opacity === '0') {
                loadingOverlay.classList.add('hidden');
            }
        }, 300);
    }
}

// Determine internal category mapping from update type string
function getCategoryGroup(type) {
    const t = type.toLowerCase();
    if (t.includes('feature')) return 'Feature';
    if (t.includes('deprecated') || t.includes('deprecation')) return 'Deprecated';
    if (t.includes('change') || t.includes('changed')) return 'Changed';
    if (t.includes('fix') || t.includes('fixed') || t.includes('bug')) return 'Fixed';
    return 'other';
}

// Calculate and update Sidebar stats
function updateStats() {
    statTotalCount.textContent = releases.length;
    
    if (releases.length > 0) {
        statLatestDate.textContent = releases[0].date;
        statLatestDate.title = releases[0].date;
    } else {
        statLatestDate.textContent = '-';
    }
    
    // Category Counts
    let counts = { all: releases.length, Feature: 0, Deprecated: 0, Changed: 0, Fixed: 0, other: 0 };
    
    releases.forEach(item => {
        const cat = getCategoryGroup(item.type);
        counts[cat]++;
    });
    
    countAll.textContent = counts.all;
    countFeature.textContent = counts.Feature;
    countDeprecated.textContent = counts.Deprecated;
    countChanged.textContent = counts.Changed;
    countFixed.textContent = counts.Fixed;
    countOther.textContent = counts.other;
}

// Filter and search logic
function applyFilters() {
    filteredReleases = releases.filter(item => {
        // 1. Category Filter
        if (currentFilter !== 'all') {
            const cat = getCategoryGroup(item.type);
            if (cat !== currentFilter) return false;
        }
        
        // 2. Search Keyword Filter
        if (searchQuery) {
            const matchesType = item.type.toLowerCase().includes(searchQuery);
            const matchesDate = item.date.toLowerCase().includes(searchQuery);
            const matchesText = item.plain_text.toLowerCase().includes(searchQuery);
            
            if (!matchesType && !matchesDate && !matchesText) return false;
        }
        
        return true;
    });
    
    renderFeed();
}

// Render the list of release cards in the feed
function renderFeed() {
    releasesFeed.innerHTML = '';
    
    if (filteredReleases.length === 0) {
        emptyContainer.classList.remove('hidden');
        return;
    }
    
    emptyContainer.classList.add('hidden');
    
    let currentDateHeader = '';
    
    filteredReleases.forEach(item => {
        // Add a Date Divider if the date changes
        if (item.date !== currentDateHeader) {
            currentDateHeader = item.date;
            const divider = document.createElement('div');
            divider.className = 'date-divider';
            divider.textContent = currentDateHeader;
            releasesFeed.appendChild(divider);
        }
        
        const card = document.createElement('div');
        card.className = `release-card ${selectedRelease && selectedRelease.id === item.id ? 'selected' : ''}`;
        card.dataset.id = item.id;
        
        const catGroup = getCategoryGroup(item.type).toLowerCase();
        const badgeClass = `badge-${catGroup}-item`;
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta">
                    <span class="badge ${badgeClass}">${item.type}</span>
                    <span class="card-date">${item.date}</span>
                </div>
                <button class="btn-card-tweet" aria-label="Select to Tweet this update">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>Tweet</span>
                </button>
            </div>
            <div class="card-body">
                ${item.description}
            </div>
            <div class="card-footer">
                <button class="btn-card-copy" onclick="event.stopPropagation();" aria-label="Copy note to clipboard">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-copy">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copy</span>
                </button>
                <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="btn-card-link" onclick="event.stopPropagation();">
                    <span>View Docs</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </a>
            </div>
        `;
        
        // Add card interaction
        card.addEventListener('click', () => selectReleaseNote(item));
        
        // Add specific tweet button inside card interaction
        const tweetBtn = card.querySelector('.btn-card-tweet');
        tweetBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent duplicate calls
            selectReleaseNote(item);
        });

        // Add Copy button interaction
        const copyBtn = card.querySelector('.btn-card-copy');
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const copyText = `BigQuery Release Note (${item.date} - ${item.type}):\n${item.plain_text}\n\nDocs: ${item.link}`;
            navigator.clipboard.writeText(copyText).then(() => {
                const btnText = copyBtn.querySelector('span');
                copyBtn.classList.add('copied');
                btnText.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.classList.remove('copied');
                    btnText.textContent = 'Copy';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });
        
        releasesFeed.appendChild(card);
    });
}

// Select an update note and open composer drawer
function selectReleaseNote(item) {
    selectedRelease = item;
    
    // Highlight in the UI
    document.querySelectorAll('.release-card').forEach(card => {
        if (card.dataset.id === item.id) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
    
    // Populate drawer preview
    previewDate.textContent = item.date;
    previewBadge.textContent = item.type;
    previewBadge.className = `badge badge-${getCategoryGroup(item.type).toLowerCase()}-item`;
    previewText.textContent = item.plain_text;
    
    // Draft the Tweet
    draftTweet(item);
    
    // Open drawer
    openDrawer();
}

// Draft a tweet draft with character limits in mind
function draftTweet(item) {
    const header = `BigQuery Update (${item.date}): `;
    const link = `\n\nDocs: ${item.link}`;
    const hashtags = ` #BigQuery #GoogleCloud`;
    
    // Calculate space remaining for description text
    const fixedLength = header.length + link.length + hashtags.length;
    const descSpace = CHAR_LIMIT - fixedLength;
    
    let description = item.plain_text;
    if (description.length > descSpace) {
        description = description.substring(0, descSpace - 3) + '...';
    }
    
    tweetTextarea.value = `${header}${description}${link}${hashtags}`;
    updateCharCounter();
}

// Update character counting ring
function updateCharCounter() {
    const textLength = tweetTextarea.value.length;
    const remaining = CHAR_LIMIT - textLength;
    
    // Update counter text
    charCount.textContent = remaining;
    
    // Calculate radial percentage
    const ratio = Math.min(textLength / CHAR_LIMIT, 1);
    const strokeDashoffset = CIRCUMFERENCE - (CIRCUMFERENCE * ratio);
    
    // Set SVG attributes
    charProgress.style.strokeDashoffset = strokeDashoffset;
    
    // Colour and warn styling
    charCount.classList.remove('warn', 'danger');
    if (remaining < 0) {
        charCount.classList.add('danger');
        charProgress.style.stroke = '#ef4444'; // Red
    } else if (remaining <= 20) {
        charCount.classList.add('warn');
        charProgress.style.stroke = 'var(--color-deprecated)'; // Amber
    } else {
        charProgress.style.stroke = 'var(--primary)'; // Cyan
    }
    
    // Enable/disable post button based on validity
    btnTweetPost.disabled = textLength === 0 || textLength > CHAR_LIMIT;
}

// Open Drawer
function openDrawer() {
    tweetDrawer.classList.add('active');
    drawerOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Stop background scrolling
}

// Close Drawer
function closeDrawer() {
    tweetDrawer.classList.remove('active');
    drawerOverlay.classList.remove('active');
    document.body.style.overflow = ''; // Resume scrolling
}

// Export current filtered releases to CSV
function exportToCSV() {
    if (filteredReleases.length === 0) {
        alert('No release notes to export!');
        return;
    }
    
    const headers = ['ID', 'Date', 'Type', 'Description', 'Link'];
    const csvRows = [headers.map(val => `"${val.replace(/"/g, '""')}"`).join(',')];
    
    filteredReleases.forEach(item => {
        const row = [
            item.id,
            item.date,
            item.type,
            item.plain_text,
            item.link
        ];
        csvRows.push(row.map(val => `"${val.replace(/"/g, '""')}"`).join(','));
    });
    
    const csvString = csvRows.join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_releases_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
