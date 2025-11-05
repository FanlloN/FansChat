// UI Module - Additional UI functionality

// DOM Elements
const settingsBtn = document.getElementById('settingsBtn');
const searchInput = document.getElementById('searchInput');
const faqBtn = document.getElementById('faqBtn');
const faqModal = document.getElementById('faqModal');
const closeFaqModal = document.getElementById('closeFaqModal');

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
    settingsBtn.addEventListener('click', showSettingsModal);
}

// FAQ Functionality
function initFAQ() {
    faqBtn.addEventListener('click', showFAQModal);
    closeFaqModal.addEventListener('click', hideFAQModal);

    // Close modal when clicking outside
    faqModal.addEventListener('click', (e) => {
        if (e.target === faqModal) {
            hideFAQModal();
        }
    });
}

function showFAQModal() {
    faqModal.style.display = 'flex';
}

function hideFAQModal() {
    faqModal.style.display = 'none';
}

// Show Settings Modal
function showSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'flex';

    // Load current settings
    loadSettings();

    // Setup event listeners
    setupSettingsModal();
}

// Setup Settings Modal
function setupSettingsModal() {
    const modal = document.getElementById('settingsModal');
    const closeBtn = document.getElementById('closeSettingsModal');

    // Close modal
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Tab switching
    const tabBtns = modal.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;

            // Remove active class from all tabs
            tabBtns.forEach(b => b.classList.remove('active'));
            modal.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

            // Add active class to clicked tab
            btn.classList.add('active');
            document.getElementById(tabName + '-tab').classList.add('active');
        });
    });

    // Theme selection
    const themeOptions = modal.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const theme = option.dataset.theme;
            setTheme(theme);
            themeOptions.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
        });
    });

    // Avatar selection
    const emojiBtns = modal.querySelectorAll('.emoji-btn');
    emojiBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const emoji = btn.dataset.emoji;
            setAvatarEmoji(emoji);
            emojiBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });

    // Custom avatar upload
    const uploadBtn = document.getElementById('uploadAvatarBtn');
    const fileInput = document.getElementById('avatarFileInput');

    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                await uploadAvatar(file);
                showNotification('Аватар обновлен!', 'success');
            } catch (error) {
                showNotification('Ошибка загрузки аватара', 'error');
            }
        }
    });

    // Password change
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    changePasswordBtn.addEventListener('click', async () => {
        const oldPassword = document.getElementById('oldPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!oldPassword || !newPassword || !confirmPassword) {
            showNotification('Заполните все поля', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showNotification('Пароли не совпадают', 'error');
            return;
        }

        try {
            await changePassword(oldPassword, newPassword);
            showNotification('Пароль изменен!', 'success');
            document.getElementById('oldPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } catch (error) {
            showNotification('Ошибка изменения пароля', 'error');
        }
    });

    // Privacy settings
    const notificationsToggle = document.getElementById('notificationsToggle');
    const callsToggle = document.getElementById('callsToggle');

    notificationsToggle.addEventListener('change', () => {
        const enabled = notificationsToggle.checked;
        localStorage.setItem('notificationsEnabled', enabled);
        if (enabled) {
            requestNotificationPermission();
        }
    });

    callsToggle.addEventListener('change', () => {
        const enabled = callsToggle.checked;
        localStorage.setItem('callsEnabled', enabled);
    });
}

// Load Settings
function loadSettings() {
    // Load theme
    const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        if (option.dataset.theme === currentTheme) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });

    // Load privacy settings
    const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
    const callsEnabled = localStorage.getItem('callsEnabled') === 'true';

    document.getElementById('notificationsToggle').checked = notificationsEnabled;
    document.getElementById('callsToggle').checked = callsEnabled;
}

// Set Theme
function setTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('theme', theme);
}

// Set Avatar Emoji
function setAvatarEmoji(emoji) {
    const userAvatar = document.getElementById('userAvatar');
    userAvatar.src = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="70" font-size="60" text-anchor="middle">${emoji}</text></svg>`)}`;

    // Save to localStorage and database
    const emojiData = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="70" font-size="60" text-anchor="middle">${emoji}</text></svg>`)}`;
    localStorage.setItem('userAvatar', emojiData);

    if (window.currentUser()) {
        window.update(window.dbRef(window.database, `users/${window.currentUser().uid}`), {
            avatar: emojiData
        });
    }
}

// Change Password
async function changePassword(oldPassword, newPassword) {
    const user = window.auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Reauthenticate user
    const credential = window.EmailAuthProvider.credential(user.email, oldPassword);
    await window.reauthenticateWithCredential(user, credential);

    // Update password
    await window.updatePassword(user, newPassword);
}

// Request Notification Permission
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showNotification('Уведомления включены!', 'success');
            }
        });
    }
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
    initFAQ();
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