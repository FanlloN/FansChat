// Main Script - Initialize all modules

// Firebase Configuration and Initialization
const firebaseConfig = {
    apiKey: "AIzaSyCU-2Oa0zjmzyAnBIrluPQbrf2t-lPiikg",
    authDomain: "chatbyfan-default-rtdb.europe-west1.firebasedatabase.app",
    databaseURL: "https://chatbyfan-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "chatbyfan",
    storageBucket: "chatbyfan.appspot.com",
    messagingSenderId: "844332208537",
    appId: "1:844332208537:web:5b2747debe491ec8610308"
};

// Initialize Firebase
window.app = initializeApp(firebaseConfig);
window.auth = getAuth(window.app);
window.database = getDatabase(window.app);
window.storage = getStorage(window.app);

// Firebase functions
window.dbRef = ref;
window.onValue = onValue;
window.push = push;
window.set = set;
window.update = update;
window.remove = remove;
window.get = get;
window.query = query;
window.orderByChild = orderByChild;
window.limitToLast = limitToLast;

// Auth functions
window.signInWithEmailAndPassword = signInWithEmailAndPassword;
window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
window.signOut = signOut;
window.onAuthStateChanged = onAuthStateChanged;

// Storage functions
window.uploadBytes = uploadBytes;
window.getDownloadURL = getDownloadURL;
window.ref_storage = ref_storage;

// Browser notification
window.showBrowserNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
    }
};

// Current user function
window.currentUser = () => window.auth.currentUser;

console.log('Firebase initialized successfully');

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Chat by Fan initializing...');

    // All initialization is handled by individual modules
    // auth.js handles authentication
    // chat.js handles chat functionality
    // ui.js handles UI enhancements
});

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    // You could send error reports to a service here
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    // You could send error reports to a service here
});

// Service worker for PWA (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Register service worker for offline functionality
        // navigator.serviceWorker.register('/sw.js');
    });
}

// Prevent context menu on mobile
document.addEventListener('contextmenu', (e) => {
    if (window.innerWidth <= 768) {
        e.preventDefault();
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    console.log('Connection restored');
    if (window.showNotification) {
        window.showNotification('Соединение восстановлено', 'success');
    }
});

window.addEventListener('offline', () => {
    console.log('Connection lost');
    if (window.showNotification) {
        window.showNotification('Соединение потеряно', 'error');
    }
});

// Mobile optimizations
if ('visualViewport' in window) {
    window.visualViewport.addEventListener('resize', () => {
        // Handle keyboard appearance on mobile
        const viewport = window.visualViewport;
        document.body.style.height = viewport.height + 'px';
    });
}

// Set CSS custom property for mobile viewport height
function setVH() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

window.addEventListener('load', setVH);
window.addEventListener('resize', setVH);

// Touch event optimizations
let touchStartY = 0;
let touchStartX = 0;

document.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
    if (!e.target.closest('.messages-container, .chats-list, .modal-content')) {
        return;
    }

    const touchY = e.touches[0].clientY;
    const touchX = e.touches[0].clientX;
    const deltaY = touchStartY - touchY;
    const deltaX = touchStartX - touchX;

    // Allow vertical scrolling in scrollable containers
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
        const scrollable = e.target.closest('.messages-container, .chats-list, .modal-content');
        if (scrollable) {
            const atTop = scrollable.scrollTop === 0;
            const atBottom = scrollable.scrollTop >= scrollable.scrollHeight - scrollable.clientHeight;

            if ((atTop && deltaY < 0) || (atBottom && deltaY > 0)) {
                e.preventDefault();
            }
        }
    }
}, { passive: false });

// Performance monitoring (optional)
if ('performance' in window && 'getEntriesByType' in performance) {
    window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0];
        console.log('Page load time:', navigation.loadEventEnd - navigation.fetchStart, 'ms');
    });
}