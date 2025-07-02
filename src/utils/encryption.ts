// Encryption utilities using Web Crypto API with AES-GCM
// Secure implementation with random salts and proper validation

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16; // 128 bits for salt

/**
 * Validate password strength
 */
function validatePassword(password: string): void {
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required and must be a string');
  }
  
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  
  // Additional strength checks can be added here
  // For example: require uppercase, lowercase, numbers, special characters
}

/**
 * Convert a string encryption key to a CryptoKey object with random salt
 */
async function deriveKey(password: string, salt?: Uint8Array): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  validatePassword(password);
  
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Generate random salt if not provided
  const finalSalt = salt || crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: finalSalt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    {
      name: ALGORITHM,
      length: KEY_LENGTH
    },
    false,
    ['encrypt', 'decrypt']
  );

  return { key, salt: finalSalt };
}

/**
 * Check if a string is valid base64
 */
function isValidBase64(str: string): boolean {
  try {
    if (typeof str !== 'string') {
      return false;
    }
    
    // Check if string contains only valid base64 characters
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(str)) {
      return false;
    }
    
    // Try to decode it
    atob(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert Uint8Array to base64 string (proper binary handling)
 */
function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array (proper binary handling)
 */
function base64ToArrayBuffer(base64: string): Uint8Array {
  // Validate base64 string first
  if (!isValidBase64(base64)) {
    throw new Error(`Invalid base64 string: ${base64.substring(0, 50)}...`);
  }
  
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encrypt a text string with random salt (for server-side storage)
 */
export async function encrypt(text: string, password: string): Promise<string> {
  try {
    if (typeof text !== 'string') {
      throw new Error('Text to encrypt must be a string');
    }
    
    const encoder = new TextEncoder();
    const { key, salt } = await deriveKey(password);
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const data = encoder.encode(text);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv
      },
      key,
      data
    );

    // Combine salt, IV, and encrypted data
    // Format: [salt (16 bytes)] + [iv (12 bytes)] + [encrypted data]
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    // Convert to base64 using proper binary handling
    const result = arrayBufferToBase64(combined);
    return result;
  } catch (error) {
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt an encrypted text string (for server-side storage)
 */
export async function decrypt(encryptedText: string, password: string): Promise<string> {
  try {
    if (typeof encryptedText !== 'string') {
      throw new Error('Encrypted text must be a string');
    }
    
    validatePassword(password);
    
    // Convert from base64 using proper binary handling
    const combined = base64ToArrayBuffer(encryptedText);

    // Check minimum length (salt + iv)
    if (combined.length < SALT_LENGTH + IV_LENGTH) {
      throw new Error('Invalid encrypted data: too short');
    }

    // Split salt, IV, and encrypted data
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH);

    const { key } = await deriveKey(password, salt);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv
      },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    const result = decoder.decode(decrypted);
    return result;
  } catch (error) {
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Client-side encryption for chat messages (simplified for browser compatibility)
 * This uses a simpler approach that doesn't require password validation
 */
export async function encryptClientSide(text: string, key: string): Promise<string> {
  try {
    if (typeof text !== 'string') {
      throw new Error('Text to encrypt must be a string');
    }
    
    if (!key || typeof key !== 'string') {
      throw new Error('Encryption key is required');
    }
    
    const encoder = new TextEncoder();
    
    // For client-side, we'll use a simpler key derivation
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(key),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Use a fixed salt for client-side (less secure but necessary for compatibility)
    const salt = encoder.encode('client-salt');
    
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 10000, // Lower iterations for client-side performance
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: ALGORITHM,
        length: KEY_LENGTH
      },
      false,
      ['encrypt', 'decrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const data = encoder.encode(text);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv
      },
      derivedKey,
      data
    );

    // Combine IV and encrypted data (no salt for client-side)
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64
    const result = arrayBufferToBase64(combined);
    return result;
  } catch (error) {
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Client-side decryption for chat messages
 */
export async function decryptClientSide(encryptedText: string, key: string): Promise<string> {
  try {
    if (typeof encryptedText !== 'string') {
      throw new Error('Encrypted text must be a string');
    }
    
    if (!key || typeof key !== 'string') {
      throw new Error('Encryption key is required');
    }
    
    const encoder = new TextEncoder();
    
    // Convert from base64
    const combined = base64ToArrayBuffer(encryptedText);

    // Check minimum length (iv only for client-side)
    if (combined.length < IV_LENGTH) {
      throw new Error('Invalid encrypted data: too short');
    }

    // Split IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);

    // Use the same key derivation as encryption
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(key),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const salt = encoder.encode('client-salt');
    
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 10000,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: ALGORITHM,
        length: KEY_LENGTH
      },
      false,
      ['encrypt', 'decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv
      },
      derivedKey,
      encrypted
    );

    const decoder = new TextDecoder();
    const result = decoder.decode(decrypted);
    return result;
  } catch (error) {
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Test the encryption/decryption functions
 */
export async function testEncryption(testKey: string): Promise<boolean> {
  try {
    const testMessage = 'Hello, Temenos!';
    const encrypted = await encrypt(testMessage, testKey);
    const decrypted = await decrypt(encrypted, testKey);
    
    return testMessage === decrypted;
  } catch (error) {
    return false;
  }
}

/**
 * Generate a secure random encryption key
 */
export function generateEncryptionKey(): string {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  return arrayBufferToBase64(keyBytes);
}

/**
 * Validate encryption key format
 */
export function validateEncryptionKey(key: string): boolean {
  try {
    if (!key || typeof key !== 'string') {
      return false;
    }
    
    // Check if it's valid base64
    if (!isValidBase64(key)) {
      return false;
    }
    
    // Decode and check length (should be 32 bytes for 256-bit key)
    const decoded = base64ToArrayBuffer(key);
    return decoded.length === 32;
  } catch {
    return false;
  }
} 