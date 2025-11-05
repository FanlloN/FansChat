// Main Script - Initialize all modules

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Chat by Fan initializing...');

    // All initialization is handled by individual modules
    // auth.js handles authentication
    // chat.js handles chat functionality
    // ui.js handles UI enhancements
});

// Security: Prevent eval and other dangerous functions
window.eval = null;
window.Function = null;
window.setTimeout = null;
window.setInterval = null;

// Security: Disable console methods in production to prevent information leakage
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const methods = ['log', 'debug', 'info', 'warn', 'error', 'table', 'trace'];
    methods.forEach(method => {
        console[method] = () => {};
    });
}

// Security: Obfuscate sensitive data in memory
function secureData(data) {
    // In production, this would encrypt sensitive data
    return btoa(JSON.stringify(data));
}

function unsecureData(secureData) {
    try {
        return JSON.parse(atob(secureData));
    } catch {
        return null;
    }
}

// Security: Clear sensitive data from memory when not needed
function clearSensitiveData() {
    // Clear any cached sensitive information
    if (window.currentUser && window.currentUser()) {
        // Don't clear current user data while logged in
        return;
    }

    // Clear any other sensitive cached data
    localStorage.clear();
    sessionStorage.clear();
}

// Security: Monitor for developer tools
let devtoolsOpen = false;
const threshold = 160;

const detectDevTools = () => {
    if (window.outerHeight - window.innerHeight > threshold || window.outerWidth - window.innerWidth > threshold) {
        if (!devtoolsOpen) {
            devtoolsOpen = true;
            reportSuspiciousActivity('devtools_opened');
        }
    } else {
        devtoolsOpen = false;
    }
};

// Only monitor in production
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    setInterval(detectDevTools, 500);
}

// Security: Rate limiting for API calls
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 100;

function checkRateLimit(identifier) {
    const now = Date.now();
    const userRequests = rateLimitMap.get(identifier) || [];

    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);

    if (validRequests.length >= MAX_REQUESTS) {
        return false;
    }

    validRequests.push(now);
    rateLimitMap.set(identifier, validRequests);
    return true;
}

// Security: Input sanitization
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '')
                .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
                .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
                .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
}

// Security: XSS protection for DOM manipulation
const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
Object.defineProperty(Element.prototype, 'innerHTML', {
    set: function(value) {
        if (typeof value === 'string') {
            value = sanitizeInput(value);
        }
        return originalInnerHTML.set.call(this, value);
    }
});

// Security: Prevent prototype pollution
Object.freeze(Object.prototype);
Object.freeze(Array.prototype);
Object.freeze(String.prototype);

// Global error handler with security logging
window.addEventListener('error', (e) => {
    // Only log safe information
    const safeError = {
        message: e.message.substring(0, 100), // Limit message length
        filename: e.filename ? e.filename.split('/').pop() : 'unknown', // Only filename, not full path
        lineno: e.lineno,
        colno: e.colno
    };
    console.error('Global error:', safeError);
    // You could send error reports to a service here (without sensitive data)
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (e) => {
    // Only log safe information
    const safeReason = typeof e.reason === 'string' ? e.reason.substring(0, 100) : 'Unknown error';
    console.error('Unhandled promise rejection:', safeReason);
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
    window.showNotification('Соединение восстановлено', 'success');
});

window.addEventListener('offline', () => {
    console.log('Connection lost');
    window.showNotification('Соединение потеряно', 'error');
});

// Performance monitoring (optional)
if ('performance' in window && 'getEntriesByType' in performance) {
    window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0];
        console.log('Page load time:', navigation.loadEventEnd - navigation.fetchStart, 'ms');
    });
}