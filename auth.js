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
    // Check if user is already logged in
    window.onAuthStateChanged(window.auth, (user) => {
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
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();

    if (!username || !password) {
        alert('Пожалуйста, заполните все поля');
        return;
    }

    try {
        loginBtn.innerHTML = '<div class="loading"></div>';
        loginBtn.disabled = true;

        // For now, use a simple approach - try to login with generated email pattern
        // This is a temporary solution until proper user lookup is implemented
        const possibleEmails = [
            `${username}@chatbyfan.local`,
            `${username}_${Date.now()}@chatbyfan.local`
        ];

        let loginSuccess = false;
        for (const email of possibleEmails) {
            try {
                await window.signInWithEmailAndPassword(window.auth, email, password);
                loginSuccess = true;
                break;
            } catch (error) {
                // Continue trying other emails
                continue;
            }
        }

        if (!loginSuccess) {
            throw new Error('Неверный никнейм или пароль');
        }

        // User will be handled by onAuthStateChanged
    } catch (error) {
        console.error('Login error:', error);
        alert(error.message || getAuthErrorMessage(error.code));
        loginBtn.innerHTML = 'Войти';
        loginBtn.disabled = false;
    }
}

// Register User
async function registerUser() {
    const username = registerUsername.value.trim();
    const password = registerPassword.value.trim();

    if (!username || !password) {
        alert('Пожалуйста, заполните все поля');
        return;
    }

    if (username.length < 3) {
        alert('Никнейм должен содержать минимум 3 символа');
        return;
    }

    if (password.length < 6) {
        alert('Пароль должен содержать минимум 6 символов');
        return;
    }

    try {
        registerBtn.innerHTML = '<div class="loading"></div>';
        registerBtn.disabled = true;

        // Generate a unique email for Firebase Auth (since we use username for login)
        const uniqueEmail = `${username}@chatbyfan.local`;

        // Create user account
        const userCredential = await window.createUserWithEmailAndPassword(window.auth, uniqueEmail, password);
        const user = userCredential.user;

        // Save user profile to database
        await window.set(window.dbRef(window.database, `users/${user.uid}`), {
            uid: user.uid,
            username: username,
            email: uniqueEmail,
            displayName: username,
            avatar: null,
            createdAt: Date.now(),
            lastSeen: Date.now(),
            online: true
        });

        // User will be handled by onAuthStateChanged
    } catch (error) {
        console.error('Registration error:', error);
        alert(error.message || getAuthErrorMessage(error.code));
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
                    userAvatar.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23666666"/><text x="50" y="65" text-anchor="middle" fill="white" font-size="40">👤</text></svg>';
                }
            }
        });
    } catch (error) {
        console.error('Error loading user profile:', error);
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
            return 'Пользователь не найден';
        case 'auth/wrong-password':
            return 'Неверный пароль';
        case 'auth/email-already-in-use':
            return 'Email уже используется';
        case 'auth/weak-password':
            return 'Пароль слишком слабый';
        case 'auth/operation-not-allowed':
            return 'Операция не разрешена';
        case 'auth/network-request-failed':
            return 'Ошибка сети';
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