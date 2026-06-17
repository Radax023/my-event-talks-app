// Application State
const state = {
    releases: [],
    filteredReleases: [],
    filters: {
        search: '',
        category: 'all',
        sort: 'newest'
    },
    activeTweet: {
        text: '',
        url: ''
    }
};

// DOM Elements
const elements = {
    refreshBtn: document.getElementById('refresh-btn'),
    refreshIcon: document.getElementById('refresh-icon'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    statusDot: document.getElementById('status-dot'),
    statusText: document.getElementById('status-text'),
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    categoryFilters: document.getElementById('category-filters-container'),
    sortRadios: document.getElementsByName('sort-order'),
    notesList: document.getElementById('notes-list'),
    loadingState: document.getElementById('loading-state'),
    errorState: document.getElementById('error-state'),
    errorMsg: document.getElementById('error-msg'),
    emptyState: document.getElementById('empty-state'),
    retryBtn: document.getElementById('retry-btn'),
    clearFiltersBtn: document.getElementById('clear-filters-btn'),
    activeFiltersBar: document.getElementById('active-filters-bar'),
    filterTagsList: document.getElementById('filter-tags-list'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    
    // Modal
    tweetModal: document.getElementById('tweet-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    charProgressCircle: document.getElementById('char-progress-circle'),
    charCountText: document.getElementById('char-count-text'),
    copyTweetBtn: document.getElementById('copy-tweet-btn'),
    postTweetBtn: document.getElementById('post-tweet-btn'),
    previewCardTitle: document.getElementById('preview-card-title'),
    
    // Toast
    toast: document.getElementById('toast'),
    toastIcon: document.getElementById('toast-icon'),
    toastMessage: document.getElementById('toast-message')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Refresh & Export buttons
    elements.refreshBtn.addEventListener('click', () => fetchReleases(true));
    elements.retryBtn.addEventListener('click', () => fetchReleases(true));
    elements.exportCsvBtn.addEventListener('click', exportToCSV);
    
    // Search
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.clearSearchBtn.addEventListener('click', clearSearch);
    
    // Categories
    elements.categoryFilters.addEventListener('click', handleCategoryClick);
    
    // Sort
    elements.sortRadios.forEach(radio => {
        radio.addEventListener('change', handleSortChange);
    });
    
    // Reset filters
    elements.clearFiltersBtn.addEventListener('click', resetAllFilters);
    elements.resetFiltersBtn.addEventListener('click', resetAllFilters);
    
    // Modal events
    elements.closeModalBtn.addEventListener('click', closeComposer);
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) closeComposer();
    });
    elements.tweetTextarea.addEventListener('input', handleTweetTextareaInput);
    elements.copyTweetBtn.addEventListener('click', copyTweetText);
    elements.postTweetBtn.addEventListener('click', postTweet);
}

// Fetch Releases from API
async function fetchReleases(force = false) {
    showLoading();
    elements.refreshIcon.classList.add('rotating');
    elements.refreshBtn.disabled = true;
    
    try {
        const url = `/api/releases${force ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            state.releases = result.data;
            updateStatusIndicator(result.source, result.last_updated);
            applyFilters();
            updateCategoryCounts();
        } else {
            showError(result.error || 'Server error occurred while parsing release notes.');
        }
    } catch (error) {
        showError('Network error: Unable to reach the backend service.');
        console.error('Fetch error:', error);
    } finally {
        elements.refreshIcon.classList.remove('rotating');
        elements.refreshBtn.disabled = false;
    }
}

// UI State Toggles
function showLoading() {
    elements.loadingState.style.display = 'flex';
    elements.notesList.style.display = 'none';
    elements.errorState.style.display = 'none';
    elements.emptyState.style.display = 'none';
}

function showError(msg) {
    elements.errorMsg.textContent = msg;
    elements.loadingState.style.display = 'none';
    elements.notesList.style.display = 'none';
    elements.errorState.style.display = 'flex';
    elements.emptyState.style.display = 'none';
    
    elements.statusDot.className = 'status-dot error';
    elements.statusText.textContent = 'Fetch failed';
}

function updateStatusIndicator(source, timeStr) {
    elements.statusDot.className = `status-dot ${source.startsWith('cache') ? 'cached' : 'live'}`;
    const sourceLabel = source === 'live' ? 'Live' : 'Cached';
    elements.statusText.textContent = `${sourceLabel} (Updated: ${timeStr})`;
}

// Search and Filter Handlers
function handleSearchInput(e) {
    state.filters.search = e.target.value.trim();
    elements.clearSearchBtn.style.display = state.filters.search ? 'block' : 'none';
    applyFilters();
}

function clearSearch() {
    elements.searchInput.value = '';
    state.filters.search = '';
    elements.clearSearchBtn.style.display = 'none';
    applyFilters();
}

function handleCategoryClick(e) {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    
    // Update active pill UI
    elements.categoryFilters.querySelectorAll('.filter-pill').forEach(btn => {
        btn.classList.remove('active');
    });
    pill.classList.add('active');
    
    state.filters.category = pill.dataset.category;
    applyFilters();
}

function handleSortChange(e) {
    state.filters.sort = e.target.value;
    applyFilters();
}

function resetAllFilters() {
    elements.searchInput.value = '';
    state.filters.search = '';
    elements.clearSearchBtn.style.display = 'none';
    
    elements.categoryFilters.querySelectorAll('.filter-pill').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === 'all') btn.classList.add('active');
    });
    state.filters.category = 'all';
    
    elements.sortRadios.forEach(radio => {
        radio.checked = radio.value === 'newest';
    });
    state.filters.sort = 'newest';
    
    applyFilters();
}

// Filter and Sort Engine
function applyFilters() {
    const { search, category, sort } = state.filters;
    
    // 1. Filter
    state.filteredReleases = state.releases.filter(release => {
        // Category Filter
        const matchesCategory = category === 'all' || release.type.toLowerCase() === category.toLowerCase();
        
        // Search Filter
        const query = search.toLowerCase();
        const matchesSearch = !query || 
            release.date.toLowerCase().includes(query) ||
            release.type.toLowerCase().includes(query) ||
            release.text_content.toLowerCase().includes(query);
            
        return matchesCategory && matchesSearch;
    });
    
    // 2. Sort
    state.filteredReleases.sort((a, b) => {
        const dateA = new Date(a.updated || a.date);
        const dateB = new Date(b.updated || b.date);
        return sort === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    // 3. Render
    renderActiveFiltersBar();
    renderReleases();
}

// Update counts on Category Pills
function updateCategoryCounts() {
    const counts = {
        all: state.releases.length,
        Feature: 0,
        Issue: 0,
        Change: 0,
        Announcement: 0,
        Deprecation: 0,
        General: 0
    };
    
    state.releases.forEach(release => {
        if (counts[release.type] !== undefined) {
            counts[release.type]++;
        } else {
            counts.General++;
        }
    });
    
    document.getElementById('count-all').textContent = counts.all;
    document.getElementById('count-feature').textContent = counts.Feature;
    document.getElementById('count-issue').textContent = counts.Issue;
    document.getElementById('count-change').textContent = counts.Change;
    document.getElementById('count-announcement').textContent = counts.Announcement;
    document.getElementById('count-deprecation').textContent = counts.Deprecation;
    document.getElementById('count-general').textContent = counts.General;
}

// Render Active Filters Tags
function renderActiveFiltersBar() {
    const { search, category } = state.filters;
    elements.filterTagsList.innerHTML = '';
    
    const showBar = search || category !== 'all';
    elements.activeFiltersBar.style.display = showBar ? 'flex' : 'none';
    
    if (!showBar) return;
    
    if (category !== 'all') {
        createFilterTag(`Category: ${category}`, () => {
            state.filters.category = 'all';
            elements.categoryFilters.querySelectorAll('.filter-pill').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.category === 'all') btn.classList.add('active');
            });
            applyFilters();
        });
    }
    
    if (search) {
        createFilterTag(`Search: "${search}"`, clearSearch);
    }
}

function createFilterTag(label, onRemove) {
    const tag = document.createElement('div');
    tag.className = 'filter-tag';
    tag.innerHTML = `
        <span>${escapeHTML(label)}</span>
        <button class="filter-tag-close"><i class="fa-solid fa-xmark"></i></button>
    `;
    tag.querySelector('button').addEventListener('click', onRemove);
    elements.filterTagsList.appendChild(tag);
}

// Render Release Cards List
function renderReleases() {
    elements.loadingState.style.display = 'none';
    
    if (state.filteredReleases.length === 0) {
        elements.notesList.style.display = 'none';
        elements.emptyState.style.display = 'flex';
        return;
    }
    
    elements.emptyState.style.display = 'none';
    elements.notesList.innerHTML = '';
    elements.notesList.style.display = 'flex';
    
    state.filteredReleases.forEach(release => {
        const card = document.createElement('article');
        card.className = `update-card glass-panel ${release.type.toLowerCase()}-card`;
        card.id = `card-${release.id}`;
        
        // Render card header
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header';
        
        const badgeContainer = document.createElement('div');
        badgeContainer.className = 'card-badge-container';
        
        const typeBadge = document.createElement('span');
        typeBadge.className = `type-badge ${release.type.toLowerCase()}`;
        typeBadge.innerHTML = `${getCategoryIcon(release.type)} ${release.type}`;
        badgeContainer.appendChild(typeBadge);
        
        const dateSpan = document.createElement('span');
        dateSpan.className = 'card-date';
        dateSpan.innerHTML = `<i class="fa-regular fa-calendar"></i> ${release.date}`;
        badgeContainer.appendChild(dateSpan);
        
        cardHeader.appendChild(badgeContainer);
        
        if (release.url) {
            const externalLink = document.createElement('a');
            externalLink.className = 'card-external-link';
            externalLink.href = release.url;
            externalLink.target = '_blank';
            externalLink.title = 'View Official Documentation';
            externalLink.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square"></i>';
            cardHeader.appendChild(externalLink);
        }
        
        card.appendChild(cardHeader);
        
        // Render card body
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        // HTML content comes pre-parsed from the backend
        cardBody.innerHTML = release.content;
        card.appendChild(cardBody);
        
        // Render card actions
        const cardActions = document.createElement('div');
        cardActions.className = 'card-actions';
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-secondary';
        copyBtn.style.marginRight = 'auto'; // pushes the tweet button to the right end
        copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy Text';
        copyBtn.addEventListener('click', () => copyCardText(release.text_content));
        cardActions.appendChild(copyBtn);
        
        const tweetBtn = document.createElement('button');
        tweetBtn.className = 'btn btn-tweet';
        tweetBtn.innerHTML = '<i class="fa-brands fa-x-twitter"></i> Select & Tweet';
        tweetBtn.addEventListener('click', () => openComposer(release));
        cardActions.appendChild(tweetBtn);
        
        card.appendChild(cardActions);
        
        elements.notesList.appendChild(card);
    });
}

// Helpers
function getCategoryIcon(type) {
    switch (type) {
        case 'Feature': return '<i class="fa-solid fa-cube"></i>';
        case 'Issue': return '<i class="fa-solid fa-bug"></i>';
        case 'Change': return '<i class="fa-solid fa-code-compare"></i>';
        case 'Announcement': return '<i class="fa-solid fa-bullhorn"></i>';
        case 'Deprecation': return '<i class="fa-solid fa-ban"></i>';
        default: return '<i class="fa-solid fa-info-circle"></i>';
    }
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// Tweet Composer Logic
function openComposer(release) {
    state.activeTweet.url = release.url;
    
    // Auto-generate beautiful tweet text
    // E.g.: "BigQuery Update (June 15, 2026): [Feature] Gemini Cloud Assist queries..."
    const dateStr = release.date;
    const typeStr = release.type;
    const cleanText = release.text_content;
    
    // Hashtags we want to append
    const hashtags = ' #BigQuery #GoogleCloud';
    
    // Max characters = 280
    // URL takes exactly 23 characters on X/Twitter
    const urlPlaceholderLength = 23;
    const staticTextLength = `BigQuery Update (${dateStr}): [${typeStr}] "... " ${hashtags}`.length + urlPlaceholderLength;
    const maxTextContentLength = 280 - staticTextLength;
    
    let tweetTextContent = cleanText;
    if (cleanText.length > maxTextContentLength) {
        tweetTextContent = cleanText.substring(0, maxTextContentLength - 3).trim() + '...';
    }
    
    // Set initial text
    const initialTweet = `BigQuery Update (${dateStr}): [${typeStr}] "${tweetTextContent}"\n\nRead more: ${release.url}${hashtags}`;
    
    elements.tweetTextarea.value = initialTweet;
    elements.previewCardTitle.textContent = `BigQuery Update - ${dateStr}`;
    
    // Show Modal
    elements.tweetModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Trigger input calculations
    handleTweetTextareaInput();
}

function closeComposer() {
    elements.tweetModal.style.display = 'none';
    document.body.style.overflow = '';
}

// Calculates exact tweet character count, simulating Twitter's URL parser (each URL counts as 23 characters)
function calculateTweetLength(text) {
    const urlRegex = /https?:\/\/[^\s]+/g;
    let length = text.length;
    let match;
    let urlCount = 0;
    let urlLengthSum = 0;
    
    while ((match = urlRegex.exec(text)) !== null) {
        urlCount++;
        urlLengthSum += match[0].length;
    }
    
    return length - urlLengthSum + (urlCount * 23);
}

function handleTweetTextareaInput() {
    const text = elements.tweetTextarea.value;
    const count = calculateTweetLength(text);
    const limit = 280;
    const remaining = limit - count;
    
    // Update Text
    elements.charCountText.textContent = remaining;
    
    // SVG Circular Progress Ring calculations
    const circle = elements.charProgressCircle;
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    
    // Progress percent (clamped between 0 and 100)
    let percent = Math.min((count / limit) * 100, 100);
    if (count > limit) percent = 100;
    
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    
    // Coloring & styling warning
    if (remaining < 0) {
        circle.style.stroke = '#f43f5e'; // red
        elements.charCountText.className = 'counter-text warning';
        elements.postTweetBtn.disabled = true;
    } else if (remaining <= 20) {
        circle.style.stroke = '#f59e0b'; // orange
        elements.charCountText.className = 'counter-text warning';
        elements.postTweetBtn.disabled = false;
    } else {
        circle.style.stroke = '#1d9bf0'; // standard twitter blue
        elements.charCountText.className = 'counter-text';
        elements.postTweetBtn.disabled = count === 0;
    }
}

async function copyTweetText() {
    const text = elements.tweetTextarea.value;
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
    } catch (err) {
        // Fallback copy for older browsers
        try {
            elements.tweetTextarea.select();
            document.execCommand('copy');
            showToast('Copied to clipboard!', 'success');
        } catch (e) {
            showToast('Failed to copy text.', 'error');
        }
    }
}

function postTweet() {
    const text = elements.tweetTextarea.value;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank');
    closeComposer();
    showToast('Redirecting to X (Twitter)...', 'info');
}

// Toast System
let toastTimeout;
function showToast(message, type = 'success') {
    clearTimeout(toastTimeout);
    
    elements.toastMessage.textContent = message;
    elements.toast.className = `toast-notification show ${type}`;
    
    // Update icon based on type
    const icon = elements.toastIcon;
    if (type === 'success') {
        icon.className = 'fa-solid fa-circle-check toast-icon';
    } else if (type === 'info') {
        icon.className = 'fa-solid fa-circle-info toast-icon';
    } else {
        icon.className = 'fa-solid fa-circle-exclamation toast-icon';
    }
    
    toastTimeout = setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3500);
}

// Copy Card Text Utility
async function copyCardText(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Update copied to clipboard!', 'success');
    } catch (err) {
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('Update copied to clipboard!', 'success');
        } catch (e) {
            showToast('Failed to copy text.', 'error');
        }
    }
}

// Export Filtered Releases to CSV
function exportToCSV() {
    const dataToExport = state.filteredReleases;
    if (dataToExport.length === 0) {
        showToast('No updates to export.', 'error');
        return;
    }
    
    // Construct CSV file
    const headers = ['Date', 'Category', 'URL', 'Content'];
    const rows = dataToExport.map(release => {
        // Clean and escape cell text (double double-quotes for CSV, replace newlines)
        const escapedContent = release.text_content
            .replace(/"/g, '""')
            .replace(/\r?\n|\r/g, ' ');
            
        return [
            `"${release.date}"`,
            `"${release.type}"`,
            `"${release.url}"`,
            `"${escapedContent}"`
        ];
    });
    
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    // Trigger download
    try {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `bigquery_releases_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('CSV Exported Successfully!', 'success');
    } catch (err) {
        showToast('CSV export failed.', 'error');
        console.error('CSV Export Error:', err);
    }
}
