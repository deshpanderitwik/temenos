// Migration utilities for transitioning from old to new encryption format
import { decrypt as newDecrypt, encrypt as newEncrypt, decryptClientSide, encryptClientSide } from './encryption';

const OLD_ALGORITHM = 'AES-GCM';
const OLD_KEY_LENGTH = 256;
const OLD_IV_LENGTH = 12;
const OLD_SALT_LENGTH = 0; // Old format had no salt

/**
 * Legacy key derivation function (for backward compatibility)
 */
async function deriveKeyLegacy(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('temenos-salt'), // Old fixed salt
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    {
      name: OLD_ALGORITHM,
      length: OLD_KEY_LENGTH
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Legacy base64 validation
 */
function isValidBase64Legacy(str: string): boolean {
  try {
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(str)) {
      return false;
    }
    atob(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Legacy base64 to array buffer
 */
function base64ToArrayBufferLegacy(base64: string): Uint8Array {
  if (!isValidBase64Legacy(base64)) {
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
 * Decrypt data using the old format (for migration)
 */
export async function decryptLegacy(encryptedText: string, password: string): Promise<string> {
  try {
    const key = await deriveKeyLegacy(password);
    
    const combined = base64ToArrayBufferLegacy(encryptedText);

    // Old format: [iv (12 bytes)] + [encrypted data]
    const iv = combined.slice(0, OLD_IV_LENGTH);
    const encrypted = combined.slice(OLD_IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: OLD_ALGORITHM,
        iv: iv
      },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    throw new Error('Failed to decrypt legacy data');
  }
}

/**
 * Detect if encrypted data is in old format
 */
export function isLegacyFormat(encryptedText: string): boolean {
  try {
    if (!isValidBase64Legacy(encryptedText)) {
      return false;
    }
    
    const combined = base64ToArrayBufferLegacy(encryptedText);
    
    // Old format: minimum 12 bytes (IV only)
    // New format: minimum 28 bytes (16 bytes salt + 12 bytes IV)
    // Client format: minimum 12 bytes (IV only, but different key derivation)
    return combined.length >= OLD_IV_LENGTH && combined.length < 28;
  } catch {
    return false;
  }
}

/**
 * Detect if encrypted data is in client-side format
 */
export function isClientSideFormat(encryptedText: string): boolean {
  try {
    if (!isValidBase64Legacy(encryptedText)) {
      return false;
    }
    
    const combined = base64ToArrayBufferLegacy(encryptedText);
    
    // Client format: exactly 12 bytes (IV only) or more (IV + encrypted data)
    // But we can't distinguish from legacy format by length alone
    // We'll need to try decryption to determine format
    return combined.length >= OLD_IV_LENGTH;
  } catch {
    return false;
  }
}

/**
 * Migrate data from old format to new format
 */
export async function migrateEncryptedData(
  encryptedText: string, 
  password: string
): Promise<string> {
  try {
    // Decrypt using old format
    const decryptedData = await decryptLegacy(encryptedText, password);
    
    // Re-encrypt using new format
    const newEncryptedData = await newEncrypt(decryptedData, password);
    
    return newEncryptedData;
  } catch (error) {
    throw new Error('Failed to migrate encrypted data');
  }
}

/**
 * Smart decrypt function that handles both old and new formats
 */
export async function smartDecrypt(encryptedText: string, password: string): Promise<string> {
  try {
    // First try new format
    return await newDecrypt(encryptedText, password);
  } catch (error) {
    // If new format fails, try legacy format
    if (isLegacyFormat(encryptedText)) {
      return await decryptLegacy(encryptedText, password);
    }
    throw error;
  }
}

/**
 * Smart client-side decrypt function that handles multiple formats
 */
export async function smartDecryptClientSide(encryptedText: string, key: string): Promise<string> {
  try {
    // First try client-side format
    return await decryptClientSide(encryptedText, key);
  } catch (error) {
    // If client-side format fails, try legacy format
    if (isLegacyFormat(encryptedText)) {
      return await decryptLegacy(encryptedText, key);
    }
    throw error;
  }
}

/**
 * Test migration functionality
 */
export async function testMigration(testKey: string): Promise<boolean> {
  try {
    const testMessage = 'Migration test message';
    
    // Create legacy format data (simulate old encryption)
    const encoder = new TextEncoder();
    const key = await deriveKeyLegacy(testKey);
    const iv = crypto.getRandomValues(new Uint8Array(OLD_IV_LENGTH));
    const data = encoder.encode(testMessage);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: OLD_ALGORITHM, iv: iv },
      key,
      data
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    let binary = '';
    for (let i = 0; i < combined.byteLength; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    const legacyEncrypted = btoa(binary);
    
    // Test migration
    const migrated = await migrateEncryptedData(legacyEncrypted, testKey);
    const decrypted = await newDecrypt(migrated, testKey);
    
    return testMessage === decrypted;
  } catch (error) {
    return false;
  }
} 