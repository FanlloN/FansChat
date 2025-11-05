// UI Module - Additional UI functionality

// DOM Elements
const settingsBtn = document.getElementById('settingsBtn');
const searchInput = document.getElementById('searchInput');
const faqBtn = document.getElementById('faqBtn');
const faqModal = document.getElementById('faqModal');
const closeFaqModal = document.getElementById('closeFaqModal');

// Notification system for messages
let notificationsEnabled = true;
let callsEnabled = false;

// Check notification permission and enable notifications
async function initNotifications() {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            notificationsEnabled = localStorage.getItem('notifications') !== 'false';
        }
    }
}

// Show browser notification
function showBrowserNotification(title, body, icon = '/favicon.ico') {
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification(title, {
            body: body,
            icon: icon,
            tag: 'chat-message'
        });
    }
}

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

// Settings Modal
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

    // Remove existing event listeners to prevent duplicates
    const newModal = modal.cloneNode(true);
    modal.parentNode.replaceChild(newModal, modal);

    // Get fresh references
    const freshModal = document.getElementById('settingsModal');
    const freshCloseBtn = document.getElementById('closeSettingsModal');

    // Tab switching
    const tabs = freshModal.querySelectorAll('.settings-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab);
        });
    });

    // Close modal
    freshCloseBtn.addEventListener('click', () => {
        freshModal.style.display = 'none';
    });

    freshModal.addEventListener('click', (e) => {
        if (e.target === freshModal) {
            freshModal.style.display = 'none';
        }
    });

    // Avatar selection
    setupAvatarSelection();

    // Display name
    setupDisplayName();

    // Password change
    setupPasswordChange();

    // Privacy settings
    setupPrivacySettings();
}

// Load Settings
function loadSettings() {
    // Theme
    const themeToggle = document.getElementById('themeToggle');
    const isDark = document.body.classList.contains('dark-theme');
    themeToggle.checked = isDark;

    // Display name
    const displayNameInput = document.getElementById('displayNameInput');
    const currentUser = window.currentUser();
    if (currentUser && users.has(currentUser.uid)) {
        const userData = users.get(currentUser.uid);
        displayNameInput.value = userData.displayName || '';
    }

    // Notifications (stored in localStorage)
    const notificationsToggle = document.getElementById('notificationsToggle');
    const notificationsEnabled = localStorage.getItem('notifications') !== 'false';
    notificationsToggle.checked = notificationsEnabled;

    // Calls (stored in localStorage)
    const callsToggle = document.getElementById('callsToggle');
    const callsEnabled = localStorage.getItem('calls') === 'true';
    callsToggle.checked = callsEnabled;
}

// Switch Tab
function switchTab(tabName) {
    const tabs = document.querySelectorAll('.settings-tab');
    const contents = document.querySelectorAll('.settings-tab-content');

    tabs.forEach(tab => {
        tab.classList.remove('active');
    });

    contents.forEach(content => {
        content.classList.remove('active');
    });

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Setup Avatar Selection
function setupAvatarSelection() {
    // Use event delegation for emoji buttons
    const avatarTab = document.getElementById('avatarTab');
    if (avatarTab) {
        // Remove existing listeners first
        const newAvatarTab = avatarTab.cloneNode(true);
        avatarTab.parentNode.replaceChild(newAvatarTab, avatarTab);

        // Add fresh listener
        newAvatarTab.addEventListener('click', async (e) => {
            if (e.target.classList.contains('emoji-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const emoji = e.target.dataset.emoji;
                console.log('Emoji clicked:', emoji);
                await setEmojiAvatar(emoji);
            }
        });
    }

    // Upload button - recreate each time to avoid duplicate listeners
    const uploadBtn = document.getElementById('uploadAvatarBtn');
    if (uploadBtn) {
        // Remove existing listeners
        const newUploadBtn = uploadBtn.cloneNode(true);
        uploadBtn.parentNode.replaceChild(newUploadBtn, uploadBtn);

        newUploadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.style.display = 'none';

            input.onchange = async (event) => {
                const file = event.target.files[0];
                if (file) {
                    try {
                        await uploadAvatar(file);
                        showNotification('Аватар успешно обновлен!', 'success');
                    } catch (error) {
                        console.error('Avatar upload failed:', error);
                        showNotification('Ошибка загрузки аватарки', 'error');
                    }
                }
                input.remove();
            };

            document.body.appendChild(input);
            setTimeout(() => {
                input.click();
            }, 10);
        });
    }
}

// Setup Display Name
function setupDisplayName() {
    const saveBtn = document.getElementById('saveDisplayNameBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const displayNameInput = document.getElementById('displayNameInput');
            const newDisplayName = displayNameInput.value.trim();

            if (!window.currentUser()) {
                showNotification('Сначала войдите в аккаунт', 'error');
                return;
            }

            if (newDisplayName.length > 50) {
                showNotification('Имя не может быть длиннее 50 символов', 'error');
                return;
            }

            try {
                showLoading(saveBtn, 'Сохранение...');

                await window.update(window.dbRef(window.database, `users/${window.currentUser().uid}`), {
                    displayName: newDisplayName || null
                });

                // Update local user data
                if (users.has(window.currentUser().uid)) {
                    users.get(window.currentUser().uid).displayName = newDisplayName || null;
                }

                // Update UI
                const userDisplayName = document.getElementById('userDisplayName');
                if (userDisplayName) {
                    userDisplayName.textContent = newDisplayName || users.get(window.currentUser().uid)?.username || 'Пользователь';
                }

                showNotification('Отображаемое имя сохранено!', 'success');
            } catch (error) {
                console.error('Error saving display name:', error);
                showNotification('Ошибка сохранения имени', 'error');
            } finally {
                hideLoading(saveBtn, 'Сохранить имя');
            }
        });
    }
}

// Set Emoji Avatar
async function setEmojiAvatar(emoji) {
    if (!window.currentUser()) {
        showNotification('Сначала войдите в аккаунт', 'error');
        return;
    }

    // Validate emoji input
    if (!window.inputValidation.validate(emoji, 'message').valid) {
        showNotification('Недопустимый аватар', 'error');
        return;
    }

    try {
        console.log('Setting emoji avatar:', emoji);

        // Create SVG with emoji
        const svgData = `<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#666666"/><text x="50" y="65" text-anchor="middle" fill="white" font-size="40">${emoji}</text></svg>`;
        const base64Svg = btoa(svgData);
        const avatarUrl = `data:image/svg+xml;base64,${base64Svg}`;

        console.log('Avatar URL:', avatarUrl);

        // Update user profile in database
        await window.update(window.dbRef(window.database, `users/${window.currentUser().uid}`), {
            avatar: avatarUrl
        });

        console.log('Database updated');

        // Update local avatar display immediately
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar) {
            userAvatar.src = avatarUrl;
            console.log('User avatar updated');
        }

        // Also update chat avatars if they exist
        const chatAvatar = document.getElementById('chatAvatar');
        if (chatAvatar && currentChat) {
            // Check if current chat is with the user themselves
            const otherParticipantId = currentChat.data.participants.find(id => id !== window.currentUser().uid);
            if (!otherParticipantId) { // This means it's a self-chat or similar
                chatAvatar.src = avatarUrl;
            }
        }

        showNotification('Аватар успешно обновлен!', 'success');
        console.log('Emoji avatar set successfully');
    } catch (error) {
        console.error('Error setting emoji avatar:', error);
        showNotification('Ошибка обновления аватара', 'error');
    }
}

// Setup Password Change
function setupPasswordChange() {
    const changeBtn = document.getElementById('changePasswordBtn');
    changeBtn.addEventListener('click', async () => {
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

        if (newPassword.length < 6) {
            showNotification('Пароль должен содержать минимум 6 символов', 'error');
            return;
        }

        try {
            showLoading(changeBtn, 'Изменение...');

            // Verify old password by attempting to sign in
            const user = window.currentUser();
            const email = `${user.email.split('@')[0]}@chatbyfan.local`;

            try {
                await window.signInWithEmailAndPassword(window.auth, email, oldPassword);
            } catch (error) {
                showNotification('Неверный старый пароль', 'error');
                hideLoading(changeBtn, 'Изменить пароль');
                return;
            }

            // Update password
            await user.updatePassword(newPassword);

            // Clear form
            document.getElementById('oldPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';

            showNotification('Пароль успешно изменен!', 'success');
        } catch (error) {
            console.error('Password change error:', error);
            showNotification('Ошибка изменения пароля', 'error');
        } finally {
            hideLoading(changeBtn, 'Изменить пароль');
        }
    });
}

// Setup Privacy Settings
function setupPrivacySettings() {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('change', toggleTheme);

    // Notifications toggle
    const notificationsToggle = document.getElementById('notificationsToggle');
    notificationsToggle.addEventListener('change', (e) => {
        localStorage.setItem('notifications', e.target.checked);
        showNotification(e.target.checked ? 'Уведомления включены' : 'Уведомления отключены', 'info');
    });

    // Calls toggle
    const callsToggle = document.getElementById('callsToggle');
    callsToggle.addEventListener('change', (e) => {
        localStorage.setItem('calls', e.target.checked);
        showNotification(e.target.checked ? 'Звонки включены' : 'Звонки отключены', 'info');
    });

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', () => {
        if (confirm('Вы точно хотите выйти из аккаунта?')) {
            window.logoutUser().then(() => {
                // Force redirect to auth screen
                const authScreen = document.getElementById('authScreen');
                const app = document.getElementById('app');
                if (authScreen && app) {
                    authScreen.style.display = 'flex';
                    app.style.display = 'none';
                }
                document.getElementById('settingsModal').style.display = 'none';
            }).catch((error) => {
                console.error('Logout error:', error);
                showNotification('Ошибка при выходе', 'error');
            });
        }
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
    initFAQ();
    initMobile();
    initNotifications();
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
window.showBrowserNotification = showBrowserNotification;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initUI);