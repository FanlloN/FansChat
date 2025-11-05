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
        <div class="settings-item" id="changeAvatarBtn">
            <span>📷 Изменить аватарку</span>
        </div>
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
    const changeAvatarBtn = menu.querySelector('#changeAvatarBtn');
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

    // Change Avatar
    changeAvatarBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log('Avatar button clicked');

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        input.multiple = false;

        input.onchange = async (event) => {
            console.log('File selected:', event.target.files[0]);
            const file = event.target.files[0];
            if (file) {
                try {
                    await uploadAvatar(file);
                } catch (error) {
                    console.error('Avatar upload failed:', error);
                    showNotification('Ошибка загрузки аватарки', 'error');
                }
            }
            if (input.parentNode) {
                input.parentNode.removeChild(input);
            }
        };

        // Add to body and trigger
        document.body.appendChild(input);
        setTimeout(() => {
            input.click();
        }, 10);

        menu.remove();
    });

    themeSwitch.addEventListener('change', toggleTheme);

    // Logout
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (confirm('Вы уверены, что хотите выйти?')) {
            window.logoutUser().then(() => {
                // Force redirect to auth screen
                const authScreen = document.getElementById('authScreen');
                const app = document.getElementById('app');
                if (authScreen && app) {
                    authScreen.style.display = 'flex';
                    app.style.display = 'none';
                }
            }).catch((error) => {
                console.error('Logout error:', error);
                showNotification('Ошибка при выходе', 'error');
            });
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
    // Prevent zoom on input focus for iOS
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            if (window.innerWidth <= 768) {
                // Small delay to ensure viewport is set
                setTimeout(() => {
                    const viewport = document.querySelector('meta[name=viewport]');
                    if (viewport) {
                        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
                    }
                }, 100);
            }
        });

        input.addEventListener('blur', () => {
            if (window.innerWidth <= 768) {
                const viewport = document.querySelector('meta[name=viewport]');
                if (viewport) {
                    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
                }
            }
        });
    });

    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            // Recalculate heights after orientation change
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        }, 100);
    });

    // Set CSS custom property for mobile height
    function setMobileHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    setMobileHeight();
    window.addEventListener('resize', setMobileHeight);

    // Improve touch interactions
    const chatItems = document.querySelectorAll('.chat-item');
    chatItems.forEach(item => {
        item.addEventListener('touchstart', () => {
            item.style.background = 'rgba(99, 102, 241, 0.1)';
        });

        item.addEventListener('touchend', () => {
            setTimeout(() => {
                item.style.background = '';
            }, 150);
        });
    });

    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
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

// Upload Avatar
async function uploadAvatar(file) {
    if (!window.currentUser()) {
        showNotification('Сначала войдите в аккаунт', 'error');
        return;
    }

    // Validate file
    if (!file.type.startsWith('image/')) {
        showNotification('Пожалуйста, выберите изображение', 'error');
        return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showNotification('Файл слишком большой. Максимальный размер: 5MB', 'error');
        return;
    }

    try {
        showNotification('Загрузка аватарки...', 'info');

        // Convert file to base64 for local storage (since Firebase Storage has CORS issues on GitHub Pages)
        const base64String = await fileToBase64(file);

        // Update user profile in database with base64 data
        await window.update(window.dbRef(window.database, `users/${window.currentUser().uid}`), {
            avatar: base64String
        });

        // Update local avatar display immediately
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar) {
            userAvatar.src = base64String;
        }

        showNotification('Аватарка успешно обновлена!', 'success');

    } catch (error) {
        console.error('Error uploading avatar:', error);
        showNotification('Ошибка загрузки аватарки', 'error');
    }
}

// Helper function to convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Export functions
window.showTypingIndicator = showTypingIndicator;
window.hideTypingIndicator = hideTypingIndicator;
window.showNotification = showNotification;
window.showLoading = showLoading;
window.hideLoading = hideLoading;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initUI);