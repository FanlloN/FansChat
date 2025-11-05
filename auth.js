// Authentication Module
let currentUser = null;

// DOM Elements
const authScreen = document.getElementById('authScreen');
const app = document.getElementById('app');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const registerUsername = document.getElementById('registerUsername');
const registerPassword = document.getElementById('registerPassword');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const userDisplayName = document.getElementById('userDisplayName');
const userAvatar = document.getElementById('userAvatar');

// Initialize Auth
function initAuth() {
    console.log('Initializing Firebase Auth...');

    // Check if user is already logged in
    window.onAuthStateChanged(window.auth, (user) => {
        console.log('Auth state changed:', user ? `User ${user.uid} logged in` : 'No user logged in');

        if (user) {
            currentUser = user;
            showApp();
            loadUserProfile();
        } else {
            showAuth();
        }
    });
}

// Show Auth Screen
function showAuth() {
    authScreen.style.display = 'flex';
    app.style.display = 'none';
}

// Show Main App
function showApp() {
    authScreen.style.display = 'none';
    app.style.display = 'flex';
    initChat();
}

// Login User
async function loginUser() {
    const username = loginUsername.value.trim().toLowerCase();
    const password = loginPassword.value.trim();

    // Validate input with security module
    const usernameValidation = window.inputValidation.validate(username, 'username');
    const passwordValidation = window.inputValidation.validate(password, 'password');

    if (!usernameValidation.valid) {
        alert(usernameValidation.error);
        return;
    }

    if (!passwordValidation.valid) {
        alert(passwordValidation.error);
        return;
    }

    // Sanitize inputs
    const sanitizedUsername = window.inputValidation.sanitize(username, 'username');
    const sanitizedPassword = window.inputValidation.sanitize(password, 'password');

    try {
        loginBtn.innerHTML = '<div class="loading"></div>';
        loginBtn.disabled = true;

        // Use secure authentication
        const result = await window.authSecurity.secureLogin({
            username: sanitizedUsername,
            password: sanitizedPassword
        });

        if (!result.success) {
            alert(result.error);
            loginBtn.innerHTML = 'Войти';
            loginBtn.disabled = false;
            return;
        }

        // Success - user will be handled by onAuthStateChanged

    } catch (error) {
        console.error('Login error:', error);
        alert('Произошла ошибка при входе. Попробуйте еще раз.');
        loginBtn.innerHTML = 'Войти';
        loginBtn.disabled = false;
    }
}

// Register User
async function registerUser() {
    const username = registerUsername.value.trim();
    const password = registerPassword.value.trim();

    // Validate inputs with security module
    const usernameValidation = window.inputValidation.validate(username, 'username');
    const passwordValidation = window.inputValidation.validate(password, 'password');

    if (!usernameValidation.valid) {
        alert(usernameValidation.error);
        return;
    }

    if (!passwordValidation.valid) {
        alert(passwordValidation.error);
        return;
    }

    // Sanitize inputs
    const sanitizedUsername = window.inputValidation.sanitize(username, 'username');
    const sanitizedPassword = window.inputValidation.sanitize(password, 'password');

    try {
        registerBtn.innerHTML = '<div class="loading"></div>';
        registerBtn.disabled = true;

        // Use secure registration
        const result = await window.authSecurity.secureRegister({
            username: sanitizedUsername,
            password: sanitizedPassword
        });

        if (!result.success) {
            alert(result.error);
            registerBtn.innerHTML = 'Создать аккаунт';
            registerBtn.disabled = false;
            return;
        }

        // Success - user will be handled by onAuthStateChanged

    } catch (error) {
        console.error('Registration error:', error);
        alert('Произошла ошибка при регистрации. Попробуйте еще раз.');
        registerBtn.innerHTML = 'Создать аккаунт';
        registerBtn.disabled = false;
    }
}

// Logout User
async function logoutUser() {
    try {
        // Update online status
        if (currentUser) {
            await window.update(window.dbRef(window.database, `users/${currentUser.uid}`), {
                online: false,
                lastSeen: Date.now()
            });
        }

        await window.signOut(window.auth);
        currentUser = null;
        // Force show auth screen immediately
        showAuth();
    } catch (error) {
        console.error('Logout error:', error);
        alert('Ошибка при выходе из аккаунта');
    }
}

// Load User Profile
async function loadUserProfile() {
    if (!currentUser) return;

    try {
        const userRef = window.dbRef(window.database, `users/${currentUser.uid}`);
        window.onValue(userRef, (snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                userDisplayName.textContent = userData.displayName || userData.username;
                if (userData.avatar) {
                    userAvatar.src = userData.avatar;
                } else {
                    userAvatar.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iNDAiPkDwn5iKPC90ZXh0Pgo8L3N2Zz4=';
                }
                // Update online status styling
                updateOnlineStatusDisplay(userData.online);
            }
        });
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Update Online Status Display
function updateOnlineStatusDisplay(isOnline) {
    const userStatus = document.getElementById('userStatus');
    if (userStatus) {
        if (isOnline) {
            userStatus.textContent = 'онлайн';
            userStatus.classList.add('online');
        } else {
            userStatus.textContent = 'был(а) недавно';
            userStatus.classList.remove('online');
        }
    }
}

// Update User Online Status
function updateOnlineStatus(online) {
    if (!currentUser) return;

    window.update(window.dbRef(window.database, `users/${currentUser.uid}`), {
        online: online,
        lastSeen: online ? null : Date.now()
    }).catch(error => {
        console.error('Error updating online status:', error);
    });
}

// Get Auth Error Message
function getAuthErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/invalid-email':
            return 'Неверный формат email';
        case 'auth/user-disabled':
            return 'Аккаунт заблокирован';
        case 'auth/user-not-found':
            return 'Пользователь с таким никнеймом не найден';
        case 'auth/wrong-password':
            return 'Неверный пароль';
        case 'auth/invalid-login-credentials':
            return 'Неверный никнейм или пароль';
        case 'auth/email-already-in-use':
            return 'Email уже используется';
        case 'auth/weak-password':
            return 'Пароль должен содержать минимум 6 символов';
        case 'auth/operation-not-allowed':
            return 'Регистрация временно недоступна';
        case 'auth/network-request-failed':
            return 'Ошибка сети. Проверьте подключение к интернету';
        case 'auth/too-many-requests':
            return 'Слишком много попыток. Попробуйте позже';
        default:
            return 'Произошла ошибка. Попробуйте еще раз.';
    }
}

// Event Listeners
loginBtn.addEventListener('click', loginUser);
registerBtn.addEventListener('click', registerUser);

loginUsername.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginUser();
});

loginPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginUser();
});

registerUsername.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') registerUser();
});

registerPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') registerUser();
});

showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
});

// Update online status when page visibility changes
document.addEventListener('visibilitychange', () => {
    updateOnlineStatus(!document.hidden);
});

// Update online status on page unload
window.addEventListener('beforeunload', () => {
    updateOnlineStatus(false);
});

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', initAuth);

// Export functions for use in other modules
window.logoutUser = logoutUser;
window.currentUser = () => currentUser;