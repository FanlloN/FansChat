// Authentication Security Module
// Advanced protection for authentication system

class AuthSecurity {
    constructor(securityCore) {
        this.securityCore = securityCore;
        this.loginAttempts = new Map();
        this.suspiciousIPs = new Set();
        this.bruteForceProtection = new Map();
        this.sessionTokens = new Map();
        this.twoFactorEnabled = false;
    }

    // Secure login with advanced protection
    async secureLogin(credentials) {
        // Validate input
        if (!this.securityCore.validateAction('login', credentials)) {
            return { success: false, error: 'Invalid input' };
        }

        const { username, password } = credentials;
        const clientIP = this.getClientIP();

        // Check brute force protection
        if (this.isBruteForceAttempt(username, clientIP)) {
            this.securityCore.triggerSecurityAlert('BRUTE_FORCE_DETECTED', { username, clientIP });
            return { success: false, error: 'Too many login attempts. Try again later.' };
        }

        // Check for suspicious patterns
        if (this.detectSuspiciousLogin(username, password)) {
            this.securityCore.triggerSecurityAlert('SUSPICIOUS_LOGIN', { username, clientIP });
        }

        try {
            // Attempt login with Firebase
            const email = `${username}@chatbyfan.local`;
            const userCredential = await window.signInWithEmailAndPassword(window.auth, email, password);

            // Record successful login
            this.recordLoginAttempt(username, clientIP, true);

            // Generate session token
            const sessionToken = this.securityCore.generateToken();
            this.sessionTokens.set(userCredential.user.uid, {
                token: sessionToken,
                created: Date.now(),
                ip: clientIP
            });

            // Check for account anomalies
            await this.checkAccountAnomalies(userCredential.user);

            return {
                success: true,
                user: userCredential.user,
                sessionToken
            };

        } catch (error) {
            // Record failed login
            this.recordLoginAttempt(username, clientIP, false);

            // Analyze error for security insights
            this.analyzeLoginError(error, username);

            return {
                success: false,
                error: this.getSecureErrorMessage(error.code)
            };
        }
    }

    // Secure registration
    async secureRegister(credentials) {
        if (!this.securityCore.validateAction('register', credentials)) {
            return { success: false, error: 'Invalid input' };
        }

        const { username, password } = credentials;
        const clientIP = this.getClientIP();

        // Check registration rate limits
        if (!this.securityCore.checkRateLimit(`register_${clientIP}`, 3)) {
            return { success: false, error: 'Too many registration attempts' };
        }

        // Validate username security
        if (!this.validateUsernameSecurity(username)) {
            return { success: false, error: 'Username contains invalid characters' };
        }

        // Check password strength
        if (!this.validatePasswordStrength(password)) {
            return { success: false, error: 'Password is too weak' };
        }

        try {
            const email = `${username}@chatbyfan.local`;
            const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password);

            // Create secure user profile
            await this.createSecureUserProfile(userCredential.user, { username, email });

            return { success: true, user: userCredential.user };

        } catch (error) {
            this.analyzeRegistrationError(error, username);
            return {
                success: false,
                error: this.getSecureErrorMessage(error.code)
            };
        }
    }

    // Password change security
    async securePasswordChange(user, oldPassword, newPassword) {
        if (!this.securityCore.validateAction('changePassword', { oldPassword, newPassword })) {
            return { success: false, error: 'Invalid password change request' };
        }

        // Verify old password
        try {
            const email = `${user.email.split('@')[0]}@chatbyfan.local`;
            await window.signInWithEmailAndPassword(window.auth, email, oldPassword);
        } catch (error) {
            this.securityCore.triggerSecurityAlert('PASSWORD_CHANGE_FAILED', { userId: user.uid });
            return { success: false, error: 'Current password is incorrect' };
        }

        // Validate new password
        if (!this.validatePasswordStrength(newPassword)) {
            return { success: false, error: 'New password is too weak' };
        }

        // Check password history (prevent reuse of recent passwords)
        if (await this.checkPasswordHistory(user.uid, newPassword)) {
            return { success: false, error: 'Cannot reuse recent passwords' };
        }

        try {
            await user.updatePassword(newPassword);

            // Log password change
            await this.logPasswordChange(user.uid);

            return { success: true };

        } catch (error) {
            this.securityCore.triggerSecurityAlert('PASSWORD_CHANGE_ERROR', { userId: user.uid, error: error.code });
            return { success: false, error: 'Failed to change password' };
        }
    }

    // Brute force protection
    isBruteForceAttempt(identifier, ip) {
        const key = `${identifier}_${ip}`;
        const now = Date.now();
        const windowStart = now - 900000; // 15 minutes

        if (!this.bruteForceProtection.has(key)) {
            this.bruteForceProtection.set(key, []);
        }

        const attempts = this.bruteForceProtection.get(key);
        const recentAttempts = attempts.filter(time => time > windowStart);

        // Clean old attempts
        this.bruteForceProtection.set(key, recentAttempts);

        // Block after 5 failed attempts in 15 minutes
        return recentAttempts.length >= 5;
    }

    // Record login attempt
    recordLoginAttempt(identifier, ip, success) {
        const key = `${identifier}_${ip}`;

        if (!this.loginAttempts.has(key)) {
            this.loginAttempts.set(key, []);
        }

        const attempts = this.loginAttempts.get(key);
        attempts.push({
            timestamp: Date.now(),
            success,
            ip
        });

        // Keep only last 10 attempts
        if (attempts.length > 10) {
            attempts.shift();
        }

        this.loginAttempts.set(key, attempts);

        // Update brute force protection
        if (!success) {
            if (!this.bruteForceProtection.has(key)) {
                this.bruteForceProtection.set(key, []);
            }
            this.bruteForceProtection.get(key).push(Date.now());
        }
    }

    // Validate username security
    validateUsernameSecurity(username) {
        // No Russian characters
        if (/[а-яё]/i.test(username)) {
            return false;
        }

        // Only English letters, numbers, underscores
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return false;
        }

        // Length check
        if (username.length < 3 || username.length > 30) {
            return false;
        }

        // No common weak usernames
        const weakUsernames = ['admin', 'root', 'user', 'test', 'guest'];
        if (weakUsernames.includes(username.toLowerCase())) {
            return false;
        }

        return true;
    }

    // Validate password strength
    validatePasswordStrength(password) {
        if (password.length < 6) return false;

        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

        // Require at least 3 of the 4 character types
        const criteria = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar];
        const metCriteria = criteria.filter(Boolean).length;

        return metCriteria >= 3;
    }

    // Check password history
    async checkPasswordHistory(userId, newPassword) {
        // In a real implementation, you'd check against stored password hashes
        // For now, just prevent immediate reuse
        try {
            const userRef = window.dbRef(window.database, `users/${userId}`);
            const snapshot = await window.get(userRef);
            const userData = snapshot.val();

            if (userData.lastPasswordChange) {
                const timeSinceChange = Date.now() - userData.lastPasswordChange;
                // Prevent password changes more often than once per hour
                if (timeSinceChange < 3600000) {
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error('Error checking password history:', error);
            return false;
        }
    }

    // Create secure user profile
    async createSecureUserProfile(user, profileData) {
        const secureProfile = {
            uid: user.uid,
            username: this.securityCore.sanitizeInput(profileData.username, 'username'),
            email: profileData.email,
            displayName: profileData.username,
            avatar: null,
            createdAt: Date.now(),
            lastSeen: Date.now(),
            online: true,
            securityLevel: 'standard',
            loginAttempts: 0,
            lastPasswordChange: Date.now(),
            accountStatus: 'active'
        };

        await window.set(window.dbRef(window.database, `users/${user.uid}`), secureProfile);
        await window.set(window.dbRef(window.database, `usernames/${profileData.username.toLowerCase()}`), { uid: user.uid });
    }

    // Log password change
    async logPasswordChange(userId) {
        const changeLog = {
            timestamp: Date.now(),
            action: 'password_changed',
            ip: this.getClientIP()
        };

        await window.update(window.dbRef(window.database, `users/${userId}`), {
            lastPasswordChange: Date.now()
        });
    }

    // Get secure error messages (don't reveal too much info)
    getSecureErrorMessage(errorCode) {
        const secureMessages = {
            'auth/user-not-found': 'Invalid username or password',
            'auth/wrong-password': 'Invalid username or password',
            'auth/invalid-email': 'Invalid credentials',
            'auth/user-disabled': 'Account is disabled',
            'auth/email-already-in-use': 'Username already taken',
            'auth/weak-password': 'Password is too weak',
            'auth/operation-not-allowed': 'Registration is currently disabled'
        };

        return secureMessages[errorCode] || 'Authentication failed';
    }

    // Analyze login errors for security insights
    analyzeLoginError(error, username) {
        switch (error.code) {
            case 'auth/user-not-found':
                // Could be username enumeration attempt
                this.securityCore.triggerSecurityAlert('USERNAME_ENUMERATION', { username });
                break;
            case 'auth/too-many-requests':
                this.securityCore.triggerSecurityAlert('RATE_LIMIT_TRIGGERED', { username });
                break;
        }
    }

    // Analyze registration errors
    analyzeRegistrationError(error, username) {
        if (error.code === 'auth/email-already-in-use') {
            // Could be registration spam
            this.securityCore.triggerSecurityAlert('REGISTRATION_SPAM', { username });
        }
    }

    // Check for account anomalies
    async checkAccountAnomalies(user) {
        try {
            const userRef = window.dbRef(window.database, `users/${user.uid}`);
            const snapshot = await window.get(userRef);
            const userData = snapshot.val();

            if (userData) {
                const currentIP = this.getClientIP();

                // Check for unusual login location/time
                if (userData.lastLoginIP && userData.lastLoginIP !== currentIP) {
                    this.securityCore.triggerSecurityAlert('UNUSUAL_LOGIN_LOCATION', {
                        userId: user.uid,
                        previousIP: userData.lastLoginIP,
                        currentIP
                    });
                }

                // Update login tracking
                await window.update(userRef, {
                    lastLoginIP: currentIP,
                    lastLoginTime: Date.now(),
                    loginCount: (userData.loginCount || 0) + 1
                });
            }
        } catch (error) {
            console.error('Error checking account anomalies:', error);
        }
    }

    // Get client IP (simplified - in production use server-side detection)
    getClientIP() {
        // This is a simplified version. In production, you'd get the real IP from the server
        return 'unknown';
    }

    // Detect suspicious login patterns
    detectSuspiciousLogin(username, password) {
        // Check for common weak passwords
        const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
        if (commonPasswords.includes(password.toLowerCase())) {
            return true;
        }

        // Check for SQL injection attempts
        if (/'|;|--|\/\*|\*\//.test(username) || /'|;|--|\/\*|\*\//.test(password)) {
            return true;
        }

        return false;
    }
}

// Initialize auth security
const authSecurity = new AuthSecurity(window.securityCore);

// Export for use in other modules
window.authSecurity = authSecurity;