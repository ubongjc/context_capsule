/**
 * Client-side encryption utilities using Web Crypto API
 * All encryption happens in the browser before data is sent to the server
 *
 * ⚠️ SECURITY WARNING ⚠️
 * This implementation stores encryption keys in localStorage, which is vulnerable to XSS attacks.
 * An attacker who can execute JavaScript on the page can steal all encryption keys and decrypt all data.
 *
 * For production use, consider:
 * 1. Migrating to IndexedDB with non-extractable CryptoKey objects
 * 2. Implementing key derivation from user passphrase (PBKDF2)
 * 3. Using Web Authentication API for hardware-backed keys
 * 4. Enforcing strict Content Security Policy to prevent XSS
 *
 * Current mitigations:
 * - CSP headers reduce XSS attack surface
 * - Input sanitization prevents stored XSS
 * - Regular security audits
 */

// Key management
const KEY_STORAGE_KEY = 'context_capsule_encryption_key'

/**
 * Generate a new encryption key
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  )
}

/**
 * Export key to base64 string for storage
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key)
  return btoa(String.fromCharCode(...new Uint8Array(exported)))
}

/**
 * Import key from base64 string
 */
export async function importKey(keyString: string): Promise<CryptoKey> {
  const keyData = Uint8Array.from(atob(keyString), c => c.charCodeAt(0))
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * Store encryption key in localStorage (in production, consider more secure storage)
 * WARNING: localStorage is vulnerable to XSS attacks
 * Consider using IndexedDB with additional protections in production
 */
export async function storeEncryptionKey(key: CryptoKey): Promise<void> {
  const exported = await exportKey(key)
  localStorage.setItem(KEY_STORAGE_KEY, exported)
}

/**
 * Retrieve encryption key from storage
 */
export async function getStoredEncryptionKey(): Promise<CryptoKey | null> {
  const stored = localStorage.getItem(KEY_STORAGE_KEY)
  if (!stored) {
    return null
  }

  try {
    return await importKey(stored)
  } catch (error) {
    console.error('Failed to import stored key:', error)
    return null
  }
}

/**
 * Get or create encryption key
 */
export async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  let key = await getStoredEncryptionKey()

  if (!key) {
    key = await generateEncryptionKey()
    await storeEncryptionKey(key)
  }

  return key
}

/**
 * Encrypt data using AES-GCM
 * Returns base64-encoded string: IV + encrypted data + auth tag
 */
export async function encrypt(data: string, key?: CryptoKey): Promise<string> {
  const encryptionKey = key || await getOrCreateEncryptionKey()

  // Generate random IV (12 bytes for AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Encode data to bytes
  const encoder = new TextEncoder()
  const dataBytes = encoder.encode(data)

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    encryptionKey,
    dataBytes
  )

  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)

  // Convert to base64
  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt data using AES-GCM
 * Expects base64-encoded string: IV + encrypted data + auth tag
 */
export async function decrypt(encryptedData: string, key?: CryptoKey): Promise<string> {
  const decryptionKey = key || await getOrCreateEncryptionKey()

  // Decode from base64
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))

  // Extract IV (first 12 bytes)
  const iv = combined.slice(0, 12)

  // Extract encrypted data (rest)
  const data = combined.slice(12)

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    decryptionKey,
    data
  )

  // Decode to string
  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

/**
 * Encrypt artifact blob
 */
export async function encryptArtifactBlob(blob: string): Promise<string> {
  return await encrypt(blob)
}

/**
 * Decrypt artifact blob
 */
export async function decryptArtifactBlob(encryptedBlob: string): Promise<string> {
  return await decrypt(encryptedBlob)
}

/**
 * Hash data using SHA-256
 */
export async function hash(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBytes = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Clear stored encryption key
 */
export function clearEncryptionKey(): void {
  localStorage.removeItem(KEY_STORAGE_KEY)
}

/**
 * Check if encryption key exists
 */
export function hasStoredKey(): boolean {
  return localStorage.getItem(KEY_STORAGE_KEY) !== null
}
