// Input Validation Security Module
// Comprehensive input validation and sanitization

class InputValidation {
    constructor(securityCore) {
        this.securityCore = securityCore;
        this.validationRules = new Map();
        this.sanitizationRules = new Map();
        this.threatPatterns = new Map();
        this.initRules();
    }

    // Initialize validation and sanitization rules
    initRules() {
        // Validation rules
        this.validationRules.set('username', {
            minLength: 3,
            maxLength: 30,
            pattern: /^[a-zA-Z0-9_]+$/,
            forbiddenChars: /[а-яё\s]/i,
            forbiddenWords: ['admin', 'root', 'user', 'test', 'guest', 'system', 'null', 'undefined']
        });

        this.validationRules.set('displayName', {
            minLength: 1,
            maxLength: 100,
            allowedChars: /^[\w\s\p{L}\p{M}\p{N}.,!?-]+$/u,
            forbiddenChars: /[<>'"&\\]/g
        });

        this.validationRules.set('password', {
            minLength: 6,
            maxLength: 128,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: false
        });

        this.validationRules.set('message', {
            minLength: 1,
            maxLength: 2000,
            allowedChars: /^[\w\s\p{L}\p{M}\p{N}\p{P}\p{S}]+$/u,
            forbiddenPatterns: [
                /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                /javascript:/gi,
                /on\w+\s*=/gi,
                /eval\s*\(/gi,
                /document\.cookie/gi,
                /localStorage\./gi,
                /sessionStorage\./gi,
                /XMLHttpRequest/gi,
                /fetch\s*\(/gi,
                /WebSocket/gi
            ]
        });

        this.validationRules.set('file', {
            maxSize: 5 * 1024 * 1024, // 5MB
            allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            forbiddenExtensions: ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.vbs', '.js', '.jar'],
            forbiddenMimeTypes: ['application/x-executable', 'application/x-msdownload']
        });

        // Threat patterns for advanced detection
        this.threatPatterns.set('xss', [
            /<script/i,
            /javascript:/i,
            /vbscript:/i,
            /onload\s*=/i,
            /onerror\s*=/i,
            /onclick\s*=/i,
            /<iframe/i,
            /<object/i,
            /<embed/i,
            /expression\s*\(/i,
            /vbscript\s*:/i
        ]);

        this.threatPatterns.set('sql_injection', [
            /('|(\\x27)|(\\x2D\\x2D)|(\\#)|(\%3B)|(\;)|(\\x3B))/i,
            /(union|select|insert|update|delete|drop|create|alter)/i,
            /('|(\\x27)|(\\x2D\\x2D)|(\\#)|(\%3B)|(\;)|(\\x3B))/i
        ]);

        this.threatPatterns.set('command_injection', [
            /(\||\&|\;|\`|\$\(|\$\{)/,
            /(rm\s|del\s|format\s|shutdown\s)/i,
            /(\.\.|\/etc\/passwd|\/etc\/shadow)/i
        ]);

        this.threatPatterns.set('path_traversal', [
            /\.\.\//,
            /\.\\/,
            /%2e%2e%2f/i,
            /%2e%2e\\/i
        ]);
    }

    // Comprehensive input validation
    validate(input, type, context = {}) {
        if (!input && input !== 0) {
            return { valid: false, error: 'Input is required' };
        }

        const rules = this.validationRules.get(type);
        if (!rules) {
            return { valid: false, error: `Unknown validation type: ${type}` };
        }

        // Type-specific validation
        switch (type) {
            case 'username':
                return this.validateUsername(input, rules);
            case 'displayName':
                return this.validateDisplayName(input, rules);
            case 'password':
                return this.validatePassword(input, rules);
            case 'message':
                return this.validateMessage(input, rules, context);
            case 'file':
                return this.validateFile(input, rules);
            default:
                return { valid: true };
        }
    }

    // Username validation
    validateUsername(username, rules) {
        if (typeof username !== 'string') {
            return { valid: false, error: 'Username must be a string' };
        }

        if (username.length < rules.minLength) {
            return { valid: false, error: `Username must be at least ${rules.minLength} characters` };
        }

        if (username.length > rules.maxLength) {
            return { valid: false, error: `Username must be no more than ${rules.maxLength} characters` };
        }

        if (!rules.pattern.test(username)) {
            return { valid: false, error: 'Username can only contain English letters, numbers, and underscores' };
        }

        if (rules.forbiddenChars.test(username)) {
            return { valid: false, error: 'Username cannot contain Russian characters or spaces' };
        }

        if (rules.forbiddenWords.includes(username.toLowerCase())) {
            return { valid: false, error: 'This username is not allowed' };
        }

        // Check for repeated characters
        if (/(.)\1{3,}/.test(username)) {
            return { valid: false, error: 'Username cannot contain repeated characters' };
        }

        return { valid: true };
    }

    // Display name validation
    validateDisplayName(displayName, rules) {
        if (typeof displayName !== 'string') {
            return { valid: false, error: 'Display name must be a string' };
        }

        if (displayName.length < rules.minLength) {
            return { valid: false, error: `Display name cannot be empty` };
        }

        if (displayName.length > rules.maxLength) {
            return { valid: false, error: `Display name must be no more than ${rules.maxLength} characters` };
        }

        if (rules.forbiddenChars.test(displayName)) {
            return { valid: false, error: 'Display name contains invalid characters' };
        }

        return { valid: true };
    }

    // Password validation
    validatePassword(password, rules) {
        if (typeof password !== 'string') {
            return { valid: false, error: 'Password must be a string' };
        }

        if (password.length < rules.minLength) {
            return { valid: false, error: `Password must be at least ${rules.minLength} characters` };
        }

        if (password.length > rules.maxLength) {
            return { valid: false, error: `Password must be no more than ${rules.maxLength} characters` };
        }

        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

        if (rules.requireUppercase && !hasUppercase) {
            return { valid: false, error: 'Password must contain at least one uppercase letter' };
        }

        if (rules.requireLowercase && !hasLowercase) {
            return { valid: false, error: 'Password must contain at least one lowercase letter' };
        }

        if (rules.requireNumbers && !hasNumbers) {
            return { valid: false, error: 'Password must contain at least one number' };
        }

        if (rules.requireSpecialChars && !hasSpecialChars) {
            return { valid: false, error: 'Password must contain at least one special character' };
        }

        // Check for common weak passwords
        const commonPasswords = [
            'password', '123456', 'qwerty', 'admin', 'letmein', 'welcome',
            'monkey', 'dragon', 'password1', 'qwerty123', 'admin123'
        ];

        if (commonPasswords.includes(password.toLowerCase())) {
            return { valid: false, error: 'This password is too common. Please choose a stronger password.' };
        }

        return { valid: true };
    }

    // Message validation
    validateMessage(message, rules, context) {
        if (typeof message !== 'string') {
            return { valid: false, error: 'Message must be a string' };
        }

        if (message.length < rules.minLength) {
            return { valid: false, error: 'Message cannot be empty' };
        }

        if (message.length > rules.maxLength) {
            return { valid: false, error: `Message must be no more than ${rules.maxLength} characters` };
        }

        // Check for forbidden patterns
        for (const pattern of rules.forbiddenPatterns) {
            if (pattern.test(message)) {
                this.securityCore.triggerSecurityAlert('MALICIOUS_CONTENT', {
                    content: message.substring(0, 100),
                    pattern: pattern.toString(),
                    context
                });
                return { valid: false, error: 'Message contains potentially harmful content' };
            }
        }

        // Advanced threat detection
        const threats = this.detectThreats(message);
        if (threats.length > 0) {
            this.securityCore.triggerSecurityAlert('THREAT_DETECTED', {
                content: message.substring(0, 100),
                threats,
                context
            });
            return { valid: false, error: 'Message contains suspicious content' };
        }

        return { valid: true };
    }

    // File validation
    validateFile(file, rules) {
        if (!file || !file.size) {
            return { valid: false, error: 'Invalid file' };
        }

        if (file.size > rules.maxSize) {
            return { valid: false, error: `File size must be no more than ${rules.maxSize / (1024 * 1024)}MB` };
        }

        if (!rules.allowedTypes.includes(file.type)) {
            return { valid: false, error: 'File type not allowed' };
        }

        const fileName = file.name.toLowerCase();
        for (const ext of rules.forbiddenExtensions) {
            if (fileName.endsWith(ext)) {
                this.securityCore.triggerSecurityAlert('MALICIOUS_FILE', { fileName });
                return { valid: false, error: 'File type not allowed' };
            }
        }

        if (rules.forbiddenMimeTypes.includes(file.type)) {
            this.securityCore.triggerSecurityAlert('MALICIOUS_FILE', { mimeType: file.type });
            return { valid: false, error: 'File type not allowed' };
        }

        return { valid: true };
    }

    // Detect various threats in content
    detectThreats(content) {
        const detectedThreats = [];

        for (const [threatType, patterns] of this.threatPatterns) {
            for (const pattern of patterns) {
                if (pattern.test(content)) {
                    detectedThreats.push({
                        type: threatType,
                        pattern: pattern.toString(),
                        match: content.match(pattern)[0]
                    });
                }
            }
        }

        return detectedThreats;
    }

    // Sanitize input based on type
    sanitize(input, type) {
        if (!input && input !== 0) return '';

        switch (type) {
            case 'username':
                return this.sanitizeUsername(input);
            case 'displayName':
                return this.sanitizeDisplayName(input);
            case 'message':
                return this.sanitizeMessage(input);
            case 'html':
                return this.sanitizeHtml(input);
            default:
                return this.basicSanitize(input);
        }
    }

    // Sanitize username
    sanitizeUsername(username) {
        return username
            .replace(/[^a-zA-Z0-9_]/g, '') // Only English letters, numbers, underscores
            .substring(0, 30); // Length limit
    }

    // Sanitize display name
    sanitizeDisplayName(displayName) {
        return displayName
            .replace(/[<>'"&\\]/g, '') // Remove dangerous characters
            .trim()
            .substring(0, 100); // Length limit
    }

    // Sanitize message content
    sanitizeMessage(message) {
        return message
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
            .replace(/javascript:/gi, '') // Remove javascript: URLs
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .replace(/<[^>]*>/g, '') // Remove HTML tags (basic)
            .trim()
            .substring(0, 2000); // Length limit
    }

    // Basic sanitization
    basicSanitize(input) {
        return String(input)
            .replace(/[<>'"&\\]/g, '')
            .trim()
            .substring(0, 1000);
    }

    // Advanced HTML sanitization (for rich content if needed)
    sanitizeHtml(html) {
        // Create a temporary DOM element for safe parsing
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // Remove dangerous elements and attributes
        const dangerousElements = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'];
        const dangerousAttributes = ['onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout', 'onkeydown', 'onkeyup'];

        dangerousElements.forEach(tag => {
            const elements = tempDiv.querySelectorAll(tag);
            elements.forEach(el => el.remove());
        });

        // Remove dangerous attributes
        const allElements = tempDiv.querySelectorAll('*');
        allElements.forEach(el => {
            dangerousAttributes.forEach(attr => {
                el.removeAttribute(attr);
            });
        });

        return tempDiv.innerHTML;
    }

    // Validate and sanitize combined
    validateAndSanitize(input, type, context = {}) {
        const validation = this.validate(input, type, context);
        if (!validation.valid) {
            return validation;
        }

        const sanitized = this.sanitize(input, type);
        return {
            valid: true,
            sanitized,
            original: input
        };
    }

    // Log validation failures for analysis
    logValidationFailure(type, input, error, context = {}) {
        this.securityCore.triggerSecurityAlert('VALIDATION_FAILURE', {
            type,
            input: input.substring(0, 100),
            error,
            context
        });
    }
}

// Initialize input validation
const inputValidation = new InputValidation(window.securityCore);

// Export for use in other modules
window.inputValidation = inputValidation;