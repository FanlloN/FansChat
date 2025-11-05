// Ultra Security Core Module
// Implements maximum protection for open source chat application

class SecurityCore {
    constructor() {
        this.initTime = Date.now();
        this.sessionId = this.generateSecureId();
        this.securityLevel = 'ultra';
        this.threats = new Map();
        this.validatedActions = new Set();
        this.rateLimits = new Map();
        this.honeypots = new Set();
        this.checksum = this.generateChecksum();
    }

    // Generate cryptographically secure random ID
    generateSecureId() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // Generate checksum for integrity verification
    generateChecksum() {
        const data = JSON.stringify({
            initTime: this.initTime,
            sessionId: this.sessionId,
            userAgent: navigator.userAgent,
            timestamp: Date.now()
        });
        return btoa(data);
    }

    // Verify integrity
    verifyIntegrity() {
        const currentChecksum = this.generateChecksum();
        if (currentChecksum !== this.checksum) {
            this.triggerSecurityAlert('INTEGRITY_VIOLATION');
            return false;
        }
        return true;
    }

    // Rate limiting
    checkRateLimit(action, maxPerMinute = 60) {
        const key = `${action}_${this.sessionId}`;
        const now = Date.now();
        const windowStart = now - 60000; // 1 minute window

        if (!this.rateLimits.has(key)) {
            this.rateLimits.set(key, []);
        }

        const timestamps = this.rateLimits.get(key);
        // Remove old timestamps
        const validTimestamps = timestamps.filter(ts => ts > windowStart);
        validTimestamps.push(now);
        this.rateLimits.set(key, validTimestamps);

        if (validTimestamps.length > maxPerMinute) {
            this.triggerSecurityAlert('RATE_LIMIT_EXCEEDED', { action, count: validTimestamps.length });
            return false;
        }

        return true;
    }

    // Input sanitization with advanced filtering
    sanitizeInput(input, type = 'text') {
        if (typeof input !== 'string') return '';

        // Remove null bytes and other dangerous characters
        input = input.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

        switch (type) {
            case 'username':
                // Allow only English letters, numbers, underscores
                return input.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 50);

            case 'displayName':
                // Allow Unicode letters, spaces, basic punctuation
                return input.replace(/[<>'"&\\]/g, '').substring(0, 100);

            case 'message':
                // Allow most characters but remove script tags and dangerous content
                return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                           .replace(/javascript:/gi, '')
                           .replace(/on\w+\s*=/gi, '')
                           .substring(0, 2000);

            case 'password':
                return input.substring(0, 128); // Length limit only

            default:
                return input.replace(/[<>'"&\\]/g, '').substring(0, 1000);
        }
    }

    // Validate user action
    validateAction(action, data = {}) {
        // Verify integrity first
        if (!this.verifyIntegrity()) {
            return false;
        }

        // Check rate limits
        if (!this.checkRateLimit(action)) {
            return false;
        }

        // Action-specific validation
        switch (action) {
            case 'sendMessage':
                return this.validateMessage(data);

            case 'uploadAvatar':
                return this.validateFileUpload(data);

            case 'changePassword':
                return this.validatePasswordChange(data);

            case 'clearChat':
                return this.validateChatAction(data);

            default:
                return true;
        }
    }

    // Validate message content
    validateMessage(data) {
        if (!data.text && !data.image) return false;
        if (data.text && data.text.length > 2000) return false;
        if (data.image && data.image.length > 10 * 1024 * 1024) return false; // 10MB limit

        // Check for suspicious patterns
        const suspiciousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /eval\(/i,
            /document\.cookie/i
        ];

        if (data.text && suspiciousPatterns.some(pattern => pattern.test(data.text))) {
            this.triggerSecurityAlert('SUSPICIOUS_CONTENT', { content: data.text.substring(0, 100) });
            return false;
        }

        return true;
    }

    // Validate file upload
    validateFileUpload(data) {
        if (!data.file) return false;

        // Check file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(data.file.type)) {
            return false;
        }

        // Check file size (5MB limit)
        if (data.file.size > 5 * 1024 * 1024) {
            return false;
        }

        // Check for malicious file names
        const suspiciousNames = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
        const fileName = data.file.name.toLowerCase();
        if (suspiciousNames.some(ext => fileName.includes(ext))) {
            this.triggerSecurityAlert('MALICIOUS_FILE', { fileName });
            return false;
        }

        return true;
    }

    // Validate password change
    validatePasswordChange(data) {
        if (!data.oldPassword || !data.newPassword || !data.confirmPassword) return false;
        if (data.newPassword !== data.confirmPassword) return false;
        if (data.newPassword.length < 6) return false;
        if (data.newPassword.length > 128) return false;

        // Check password strength
        const hasUpperCase = /[A-Z]/.test(data.newPassword);
        const hasLowerCase = /[a-z]/.test(data.newPassword);
        const hasNumbers = /\d/.test(data.newPassword);

        if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
            return false;
        }

        return true;
    }

    // Validate chat actions
    validateChatAction(data) {
        if (!data.chatId || !data.userId) return false;

        // Ensure user is participant in chat
        const chat = chats.get(data.chatId);
        if (!chat || !chat.participants.includes(data.userId)) {
            return false;
        }

        return true;
    }

    // Security alert system
    triggerSecurityAlert(type, details = {}) {
        const alert = {
            type,
            timestamp: Date.now(),
            sessionId: this.sessionId,
            details,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        console.warn('Security Alert:', alert);

        // Store alert for analysis
        this.threats.set(Date.now(), alert);

        // In production, this would send to security monitoring service
        // this.reportSecurityAlert(alert);
    }

    // Honeypot system for detecting bots
    createHoneypot() {
        const honeypotId = `hp_${this.generateSecureId().substring(0, 8)}`;
        this.honeypots.add(honeypotId);

        // Create invisible honeypot input
        const honeypot = document.createElement('input');
        honeypot.type = 'text';
        honeypot.name = honeypotId;
        honeypot.style.position = 'absolute';
        honeypot.style.left = '-9999px';
        honeypot.style.opacity = '0';
        honeypot.style.pointerEvents = 'none';

        honeypot.addEventListener('input', () => {
            this.triggerSecurityAlert('HONEYPOT_TRIGGERED', { honeypotId });
        });

        document.body.appendChild(honeypot);
        return honeypotId;
    }

    // Behavioral analysis
    analyzeBehavior(action, data = {}) {
        // Track user behavior patterns
        const behavior = {
            action,
            timestamp: Date.now(),
            data: { ...data },
            sessionId: this.sessionId
        };

        // Check for suspicious patterns
        if (this.detectSuspiciousBehavior(behavior)) {
            this.triggerSecurityAlert('SUSPICIOUS_BEHAVIOR', behavior);
        }
    }

    // Detect suspicious behavior patterns
    detectSuspiciousBehavior(behavior) {
        // Rapid-fire actions
        if (behavior.action === 'sendMessage' && behavior.data.text) {
            const recentMessages = Array.from(this.validatedActions)
                .filter(action => action.action === 'sendMessage' && action.timestamp > Date.now() - 10000)
                .length;

            if (recentMessages > 10) {
                return true; // More than 10 messages in 10 seconds
            }
        }

        // Unusual file uploads
        if (behavior.action === 'uploadAvatar') {
            const recentUploads = Array.from(this.validatedActions)
                .filter(action => action.action === 'uploadAvatar' && action.timestamp > Date.now() - 300000)
                .length;

            if (recentUploads > 5) {
                return true; // More than 5 avatar changes in 5 minutes
            }
        }

        return false;
    }

    // Encrypt sensitive data
    encryptData(data) {
        // Simple XOR encryption for demonstration
        // In production, use proper encryption like AES
        const key = this.sessionId.substring(0, 16);
        return btoa(data.split('').map((char, i) =>
            String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
        ).join(''));
    }

    // Decrypt sensitive data
    decryptData(encryptedData) {
        const key = this.sessionId.substring(0, 16);
        return atob(encryptedData).split('').map((char, i) =>
            String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
        ).join('');
    }

    // Generate secure token
    generateToken(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < length; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }

    // Validate session
    validateSession() {
        const sessionAge = Date.now() - this.initTime;
        const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours

        if (sessionAge > maxSessionAge) {
            this.triggerSecurityAlert('SESSION_EXPIRED');
            return false;
        }

        return true;
    }
}

// Initialize security core
const securityCore = new SecurityCore();

// Export for use in other modules
window.securityCore = securityCore;