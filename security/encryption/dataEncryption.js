// Data Encryption Security Module
// Advanced encryption for sensitive data

class DataEncryption {
    constructor(securityCore) {
        this.securityCore = securityCore;
        this.encryptionKey = null;
        this.initEncryption();
    }

    // Initialize encryption system
    async initEncryption() {
        // Generate or retrieve encryption key
        this.encryptionKey = await this.getOrCreateKey();

        // Initialize Web Crypto API if available
        if (window.crypto && window.crypto.subtle) {
            this.webCryptoAvailable = true;
        } else {
            this.webCryptoAvailable = false;
            console.warn('Web Crypto API not available, falling back to basic encryption');
        }
    }

    // Get or create encryption key
    async getOrCreateKey() {
        // Try to get from localStorage first
        const storedKey = localStorage.getItem('encryption_key');
        if (storedKey) {
            return storedKey;
        }

        // Generate new key
        const newKey = this.securityCore.generateToken(32);
        localStorage.setItem('encryption_key', newKey);
        return newKey;
    }

    // Advanced encryption using Web Crypto API
    async encrypt(data) {
        if (this.webCryptoAvailable) {
            return await this.webCryptoEncrypt(data);
        } else {
            return this.fallbackEncrypt(data);
        }
    }

    // Advanced decryption using Web Crypto API
    async decrypt(encryptedData) {
        if (this.webCryptoAvailable) {
            return await this.webCryptoDecrypt(encryptedData);
        } else {
            return this.fallbackDecrypt(encryptedData);
        }
    }

    // Web Crypto API encryption
    async webCryptoEncrypt(data) {
        try {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(JSON.stringify(data));

            const key = await window.crypto.subtle.importKey(
                'raw',
                encoder.encode(this.encryptionKey),
                { name: 'AES-GCM' },
                false,
                ['encrypt']
            );

            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                dataBuffer
            );

            // Combine IV and encrypted data
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encrypted), iv.length);

            return btoa(String.fromCharCode(...combined));
        } catch (error) {
            console.error('Web Crypto encryption failed:', error);
            return this.fallbackEncrypt(data);
        }
    }

    // Web Crypto API decryption
    async webCryptoDecrypt(encryptedData) {
        try {
            const encrypted = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

            const iv = encrypted.slice(0, 12);
            const data = encrypted.slice(12);

            const key = await window.crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(this.encryptionKey),
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );

            const decrypted = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                data
            );

            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decrypted));
        } catch (error) {
            console.error('Web Crypto decryption failed:', error);
            return this.fallbackDecrypt(encryptedData);
        }
    }

    // Fallback encryption for older browsers
    fallbackEncrypt(data) {
        const text = JSON.stringify(data);
        const key = this.encryptionKey;

        // Simple XOR encryption with key rotation
        let encrypted = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            encrypted += String.fromCharCode(charCode);
        }

        return btoa(encrypted);
    }

    // Fallback decryption
    fallbackDecrypt(encryptedData) {
        try {
            const encrypted = atob(encryptedData);
            const key = this.encryptionKey;

            let decrypted = '';
            for (let i = 0; i < encrypted.length; i++) {
                const charCode = encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                decrypted += String.fromCharCode(charCode);
            }

            return JSON.parse(decrypted);
        } catch (error) {
            throw new Error('Decryption failed');
        }
    }

    // Hash sensitive data (one-way)
    async hash(data) {
        if (this.webCryptoAvailable) {
            return await this.webCryptoHash(data);
        } else {
            return this.fallbackHash(data);
        }
    }

    // Web Crypto API hashing
    async webCryptoHash(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);

        const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));

        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback hashing
    fallbackHash(data) {
        // Simple hash function for fallback
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }

    // Generate secure token
    generateSecureToken(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';

        // Use crypto.getRandomValues if available
        if (window.crypto && window.crypto.getRandomValues) {
            const array = new Uint8Array(length);
            window.crypto.getRandomValues(array);

            for (let i = 0; i < length; i++) {
                token += chars.charAt(array[i] % chars.length);
            }
        } else {
            // Fallback to Math.random
            for (let i = 0; i < length; i++) {
                token += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        }

        return token;
    }

    // Encrypt sensitive user data before storage
    async encryptUserData(userData) {
        const sensitiveFields = ['email', 'lastLoginIP', 'phoneNumber'];
        const encryptedData = { ...userData };

        for (const field of sensitiveFields) {
            if (encryptedData[field]) {
                encryptedData[field] = await this.encrypt(encryptedData[field]);
            }
        }

        return encryptedData;
    }

    // Decrypt sensitive user data after retrieval
    async decryptUserData(encryptedData) {
        const sensitiveFields = ['email', 'lastLoginIP', 'phoneNumber'];
        const decryptedData = { ...encryptedData };

        for (const field of sensitiveFields) {
            if (decryptedData[field]) {
                try {
                    decryptedData[field] = await this.decrypt(decryptedData[field]);
                } catch (error) {
                    console.error(`Failed to decrypt ${field}:`, error);
                    // Keep encrypted value if decryption fails
                }
            }
        }

        return decryptedData;
    }

    // Secure local storage
    async secureSetItem(key, value) {
        const encrypted = await this.encrypt(value);
        localStorage.setItem(`secure_${key}`, encrypted);
    }

    // Secure local storage retrieval
    async secureGetItem(key) {
        const encrypted = localStorage.getItem(`secure_${key}`);
        if (!encrypted) return null;

        try {
            return await this.decrypt(encrypted);
        } catch (error) {
            console.error('Failed to decrypt localStorage item:', error);
            return null;
        }
    }

    // Generate password hash (for future use)
    async hashPassword(password, salt = null) {
        if (!salt) {
            salt = this.generateSecureToken(16);
        }

        const saltedPassword = password + salt;
        const hash = await this.hash(saltedPassword);

        return {
            hash,
            salt,
            algorithm: 'SHA-256'
        };
    }

    // Verify password hash
    async verifyPassword(password, storedHash, salt) {
        const computedHash = await this.hash(password + salt);
        return computedHash === storedHash;
    }

    // Generate HMAC for data integrity
    async generateHMAC(data, key = null) {
        if (!key) {
            key = this.encryptionKey;
        }

        if (this.webCryptoAvailable) {
            return await this.webCryptoHMAC(data, key);
        } else {
            return this.fallbackHMAC(data, key);
        }
    }

    // Web Crypto API HMAC
    async webCryptoHMAC(data, key) {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(key);

        const cryptoKey = await window.crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
        return btoa(String.fromCharCode(...new Uint8Array(signature)));
    }

    // Fallback HMAC
    fallbackHMAC(data, key) {
        // Simple HMAC implementation for fallback
        const blockSize = 64;
        let ipadKey = '';
        let opadKey = '';

        // Prepare keys
        if (key.length > blockSize) {
            key = this.fallbackHash(key);
        }

        for (let i = 0; i < blockSize; i++) {
            const keyChar = key.charCodeAt(i) || 0;
            ipadKey += String.fromCharCode(keyChar ^ 0x36);
            opadKey += String.fromCharCode(keyChar ^ 0x5C);
        }

        const innerHash = this.fallbackHash(ipadKey + data);
        const outerHash = this.fallbackHash(opadKey + innerHash);

        return btoa(outerHash);
    }

    // Verify data integrity with HMAC
    async verifyHMAC(data, hmac, key = null) {
        const computedHMAC = await this.generateHMAC(data, key);
        return computedHMAC === hmac;
    }

    // Secure random number generation
    generateSecureRandom(min = 0, max = 1) {
        if (window.crypto && window.crypto.getRandomValues) {
            const array = new Uint32Array(1);
            window.crypto.getRandomValues(array);
            return min + (array[0] / (0xFFFFFFFF + 1)) * (max - min);
        } else {
            return Math.random() * (max - min) + min;
        }
    }

    // Generate secure random bytes
    generateSecureRandomBytes(length) {
        if (window.crypto && window.crypto.getRandomValues) {
            const array = new Uint8Array(length);
            window.crypto.getRandomValues(array);
            return array;
        } else {
            const array = new Uint8Array(length);
            for (let i = 0; i < length; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
            return array;
        }
    }
}

// Initialize data encryption
const dataEncryption = new DataEncryption(window.securityCore);

// Export for use in other modules
window.dataEncryption = dataEncryption;