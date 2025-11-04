// UI Module - Additional UI functionality

// DOM Elements
const settingsBtn = document.getElementById('settingsBtn');
const searchInput = document.getElementById('searchInput');

// Search Functionality
function initSearch() {
    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = e.target.value.toLowerCase().trim();
            filterChats(query);
        }, 300);
    });
}

// Filter Chats
function filterChats(query) {
    const chatItems = document.querySelectorAll('.chat-item');

    if (!query) {
        chatItems.forEach(item => {
            item.style.display = 'flex';
        });
        return;
    }

    chatItems.forEach(item => {
        const chatName = item.querySelector('.chat-name').textContent.toLowerCase();
        const lastMessage = item.querySelector('.chat-last-message').textContent.toLowerCase();

        if (chatName.includes(query) || lastMessage.includes(query)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Settings Menu
function initSettings() {
    settingsBtn.addEventListener('click', showSettingsMenu);
}

// Show Settings Menu
function showSettingsMenu() {
    // Create settings menu
    const settingsMenu = document.createElement('div');
    settingsMenu.className = 'settings-menu';
    settingsMenu.innerHTML = `
        <div class="settings-item" id="themeToggle">
            <span>🌙 Темная тема</span>
            <label class="switch">
                <input type="checkbox" id="themeSwitch">
                <span class="slider"></span>
            </label>
        </div>
        <div class="settings-item" id="logoutBtn">
            <span>🚪 Выйти</span>
        </div>
    `;

    // Position menu
    const rect = settingsBtn.getBoundingClientRect();
    settingsMenu.style.position = 'absolute';
    settingsMenu.style.top = rect.bottom + 10 + 'px';
    settingsMenu.style.right = '15px';
    settingsMenu.style.zIndex = '1000';

    // Add to DOM
    document.body.appendChild(settingsMenu);

    // Setup event listeners
    setupSettingsMenu(settingsMenu);

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) {
                settingsMenu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 100);
}

// Setup Settings Menu
function setupSettingsMenu(menu) {
    const themeToggle = menu.querySelector('#themeToggle');
    const themeSwitch = menu.querySelector('#themeSwitch');
    const logoutBtn = menu.querySelector('#logoutBtn');

    // Load current theme
    const isDark = document.body.classList.contains('dark-theme');
    themeSwitch.checked = isDark;

    // Theme toggle
    themeToggle.addEventListener('click', (e) => {
        if (e.target === themeSwitch) return; // Don't toggle twice
        themeSwitch.checked = !themeSwitch.checked;
        toggleTheme();
    });

    themeSwitch.addEventListener('change', toggleTheme);

    // Logout
    logoutBtn.addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите выйти?')) {
            window.logoutUser();
        }
        menu.remove();
    });
}

// Toggle Theme
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');

    // Save theme preference
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    // Update theme switch if exists
    const themeSwitch = document.getElementById('themeSwitch');
    if (themeSwitch) {
        themeSwitch.checked = isDark;
    }
}

// Load Saved Theme
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}

// Mobile Responsiveness
function initMobile() {
    const sidebar = document.querySelector('.sidebar');
    const chatArea = document.querySelector('.chat-area');

    // Toggle sidebar on mobile
    function toggleSidebar() {
        sidebar.classList.toggle('open');
    }

    // Close sidebar when clicking on chat area
    chatArea.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
    });

    // Add mobile menu button to chat header
    const chatHeader = document.getElementById('chatHeader');
    if (chatHeader && window.innerWidth <= 768) {
        const mobileMenuBtn = document.createElement('button');
        mobileMenuBtn.className = 'mobile-menu-btn';
        mobileMenuBtn.innerHTML = '☰';
        mobileMenuBtn.addEventListener('click', toggleSidebar);

        chatHeader.insertBefore(mobileMenuBtn, chatHeader.firstChild);
    }
}

// Typing Indicator
function showTypingIndicator(chatId) {
    const existingIndicator = document.querySelector('.typing-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = `
        <span>печатает</span>
        <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;

    document.getElementById('messagesContainer').appendChild(indicator);
    scrollToBottom();
}

function hideTypingIndicator() {
    const indicator = document.querySelector('.typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Scroll to Bottom
function scrollToBottom() {
    const messagesContainer = document.getElementById('messagesContainer');
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Auto remove
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Loading State
function showLoading(element, text = 'Загрузка...') {
    element.innerHTML = `<div class="loading"></div> <span>${text}</span>`;
    element.disabled = true;
}

function hideLoading(element, originalText) {
    element.innerHTML = originalText;
    element.disabled = false;
}

// Initialize UI
function initUI() {
    initSearch();
    initSettings();
    initMobile();
    loadSavedTheme();
}

// Export functions
window.showTypingIndicator = showTypingIndicator;
window.hideTypingIndicator = hideTypingIndicator;
window.showNotification = showNotification;
window.showLoading = showLoading;
window.hideLoading = hideLoading;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initUI);