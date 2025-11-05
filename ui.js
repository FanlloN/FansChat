// UI Module - Handles UI enhancements and interactions

// DOM Elements
const settingsBtn = document.getElementById('settingsBtn');
const userAvatar = document.getElementById('userAvatar');
const userDisplayName = document.getElementById('userDisplayName');

// Initialize UI
function initUI() {
    console.log('Initializing UI module...');
    setupUIEventListeners();
    updateUserProfile();
    console.log('UI module initialized successfully');
}

// Setup UI Event Listeners
function setupUIEventListeners() {
    console.log('Setting up UI event listeners...');

    // Settings button
    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            console.log('Settings button clicked');
            showSettings();
        });
        console.log('Settings button listener added');
    } else {
        console.error('Settings button not found!');
    }

    // User avatar click
    if (userAvatar) {
        userAvatar.addEventListener('click', (e) => {
            console.log('User avatar clicked');
            handleAvatarClick();
        });
        console.log('User avatar listener added');
    }

    // FAQ button
    const faqBtn = document.getElementById('faqBtn');
    const faqModal = document.getElementById('faqModal');
    const closeFaqModal = document.getElementById('closeFaqModal');

    console.log('FAQ elements found:', {
        faqBtn: !!faqBtn,
        faqModal: !!faqModal,
        closeFaqModal: !!closeFaqModal
    });

    if (faqBtn) {
        faqBtn.addEventListener('click', () => {
            console.log('FAQ button clicked');
            if (faqModal) {
                faqModal.style.display = 'flex';
            }
        });
        console.log('FAQ button listener added');
    }

    if (closeFaqModal) {
        closeFaqModal.addEventListener('click', () => {
            console.log('Close FAQ modal clicked');
            if (faqModal) {
                faqModal.style.display = 'none';
            }
        });
        console.log('Close FAQ modal listener added');
    }

    if (faqModal) {
        faqModal.addEventListener('click', (e) => {
            if (e.target === faqModal) {
                console.log('FAQ modal background clicked');
                faqModal.style.display = 'none';
            }
        });
        console.log('FAQ modal background listener added');
    }

    // Handle window resize for responsive design
    window.addEventListener('resize', handleResize);

    // Handle mobile sidebar
    setupMobileSidebar();

    console.log('UI event listeners setup complete');
}

// Update User Profile in UI
function updateUserProfile() {
    if (!window.getCurrentUser()) return;

    const user = window.getCurrentUser();
    const userData = getUserData(user.uid);

    if (userDisplayName) {
        userDisplayName.textContent = userData?.displayName || userData?.username || 'Пользователь';
    }

    if (userAvatar) {
        const avatarUrl = userData?.avatar || getDefaultAvatar(userData?.displayName || userData?.username || 'U');
        userAvatar.src = avatarUrl;
    }
}

// Get User Data from Cache
function getUserData(userId) {
    // This would be implemented to get user data from the users Map in chat.js
    // For now, return basic user info
    return {
        uid: userId,
        displayName: window.getCurrentUser()?.displayName || 'Пользователь',
        avatar: null
    };
}

// Generate Default Avatar
function getDefaultAvatar(username) {
    const initial = username.charAt(0).toUpperCase();
    return `data:image/svg+xml;base64,${btoa(`
        <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="50" fill="#667eea"/>
            <text x="50" y="65" text-anchor="middle" fill="white" font-size="40" font-family="Arial, sans-serif">${initial}</text>
        </svg>
    `)}`;
}

// Handle Avatar Click
function handleAvatarClick() {
    // Create file input for avatar upload
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = handleAvatarUpload;
    input.click();
}

// Handle Avatar Upload
async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        window.showNotification('Пожалуйста, выберите изображение', 'error');
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        window.showNotification('Размер файла не должен превышать 5MB', 'error');
        return;
    }

    try {
        const user = window.getCurrentUser();
        if (!user) return;

        // Show loading
        window.showNotification('Загрузка аватара...', 'info');

        // Upload to Firebase Storage
        const storageRef = window.storageRef(window.storage, `avatars/${user.uid}`);
        const snapshot = await window.uploadBytes(storageRef, file);
        const downloadURL = await window.getDownloadURL(snapshot.ref);

        // Update user profile
        await window.update(window.dbRef(window.database, `users/${user.uid}`), {
            avatar: downloadURL
        });

        // Update UI
        userAvatar.src = downloadURL;

        window.showNotification('Аватар обновлен', 'success');

    } catch (error) {
        console.error('Avatar upload error:', error);
        window.showNotification('Ошибка загрузки аватара', 'error');
    }
}

// Show Settings Modal
function showSettings() {
    // Create settings modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>Настройки</h3>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="setting-item">
                    <label>Отображаемое имя:</label>
                    <input type="text" id="displayNameInput" class="modal-input" placeholder="Ваше имя">
                </div>
                <div class="setting-item" style="margin-top: 20px;">
                    <button id="saveSettingsBtn" class="modal-btn">Сохранить</button>
                </div>
                <div class="setting-item" style="margin-top: 20px;">
                    <button id="logoutBtn" class="modal-btn" style="background: #f44336;">Выйти</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Fill current values
    const displayNameInput = modal.querySelector('#displayNameInput');
    const userData = getUserData(window.getCurrentUser().uid);
    displayNameInput.value = userData?.displayName || '';

    // Save settings
    modal.querySelector('#saveSettingsBtn').addEventListener('click', async () => {
        const newDisplayName = displayNameInput.value.trim();
        if (!newDisplayName) {
            window.showNotification('Введите имя', 'error');
            return;
        }

        try {
            await window.update(window.dbRef(window.database, `users/${window.getCurrentUser().uid}`), {
                displayName: newDisplayName
            });

            updateUserProfile();
            modal.remove();
            window.showNotification('Настройки сохранены', 'success');

        } catch (error) {
            console.error('Settings save error:', error);
            window.showNotification('Ошибка сохранения', 'error');
        }
    });

    // Logout
    modal.querySelector('#logoutBtn').addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите выйти?')) {
            window.handleLogout();
            modal.remove();
        }
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Handle Window Resize
function handleResize() {
    // Handle responsive design changes
    const sidebar = document.querySelector('.sidebar');
    const chatArea = document.querySelector('.chat-area');

    if (window.innerWidth <= 768) {
        // Mobile layout
        if (sidebar && chatArea) {
            sidebar.style.position = 'absolute';
            sidebar.style.left = '-100%';
            sidebar.style.transition = 'left 0.3s';
        }
    } else {
        // Desktop layout
        if (sidebar) {
            sidebar.style.position = 'static';
            sidebar.style.left = 'auto';
        }
    }
}

// Setup Mobile Sidebar
function setupMobileSidebar() {
    if (window.innerWidth > 768) return;

    const sidebar = document.querySelector('.sidebar');
    const chatArea = document.querySelector('.chat-area');

    if (!sidebar || !chatArea) return;

    // Add mobile toggle button to chat area
    const mobileToggle = document.createElement('button');
    mobileToggle.className = 'mobile-sidebar-toggle';
    mobileToggle.innerHTML = '☰';
    mobileToggle.style.cssText = `
        position: absolute;
        top: 10px;
        left: 10px;
        z-index: 1001;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        font-size: 18px;
        cursor: pointer;
        display: none;
    `;

    // Show toggle button on mobile
    if (window.innerWidth <= 768) {
        mobileToggle.style.display = 'block';
        chatArea.appendChild(mobileToggle);
    }

    // Toggle sidebar
    mobileToggle.addEventListener('click', () => {
        const isOpen = sidebar.style.left === '0px';
        sidebar.style.left = isOpen ? '-100%' : '0px';
    });

    // Close sidebar when clicking on chat area
    chatArea.addEventListener('click', (e) => {
        if (e.target === chatArea && sidebar.style.left === '0px') {
            sidebar.style.left = '-100%';
        }
    });
}

// Show Loading State
function showLoading(element, text = 'Загрузка...') {
    if (!element) return;

    element.classList.add('loading');
    element.style.position = 'relative';

    const loader = document.createElement('div');
    loader.className = 'loader';
    loader.innerHTML = `
        <div class="spinner"></div>
        <div class="loader-text">${text}</div>
    `;

    loader.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 10;
        border-radius: 10px;
    `;

    element.appendChild(loader);
}

// Hide Loading State
function hideLoading(element) {
    if (!element) return;

    element.classList.remove('loading');
    const loader = element.querySelector('.loader');
    if (loader) {
        loader.remove();
    }
}

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export functions
window.initUI = initUI;
window.updateUserProfile = updateUserProfile;
window.showLoading = showLoading;
window.hideLoading = hideLoading;