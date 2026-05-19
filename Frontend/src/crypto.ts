/**
 * E2EE Crypto Utilities — Client-Side End-to-End Encryption
 *
 * Uses the Web Crypto API to implement:
 *   - ECDH P-256 key pair generation
 *   - ECDH key agreement → shared secret
 *   - HKDF-SHA256 key derivation (shared secret + salt → AES key)
 *   - AES-256-GCM file encryption/decryption
 *   - JWK key export/import for server storage
 *   - IndexedDB key persistence
 *
 * The server NEVER sees private keys or derived symmetric keys.
 */

// ─── Constants ────────────────────────────────────────────────────────────────
const ECDH_CURVE = 'P-256';
const AES_KEY_LENGTH = 256;
const AES_ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;     // 96-bit IV for AES-GCM (NIST recommendation)
const SALT_LENGTH = 16;   // 128-bit salt for HKDF
const HKDF_INFO = new TextEncoder().encode('ehealth-e2ee-v1');

const DB_NAME = 'ehealth-e2ee-keys';
const DB_VERSION = 1;
const STORE_NAME = 'keypairs';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface E2EEKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface EncryptedPayload {
  ciphertext: ArrayBuffer;
  iv: Uint8Array;
  salt: Uint8Array;
}

export interface ExportedEncryptedPayload {
  ciphertext_b64: string;
  iv_b64: string;
  salt_b64: string;
}

// ─── IndexedDB Key Persistence ────────────────────────────────────────────────

function openKeyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Persist a key pair to IndexedDB for the given user ID.
 * Keys are stored as non-extractable CryptoKey references.
 */
export async function storeKeyPair(userId: number, keyPair: E2EEKeyPair): Promise<void> {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({
      userId,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieve a stored key pair from IndexedDB.
 * Returns null if no key pair exists for this user.
 */
export async function loadKeyPair(userId: number): Promise<E2EEKeyPair | null> {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(userId);
    request.onsuccess = () => {
      const result = request.result;
      if (result) {
        resolve({ publicKey: result.publicKey, privateKey: result.privateKey });
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// ─── Key Generation ───────────────────────────────────────────────────────────

/**
 * Generate a new ECDH P-256 key pair.
 * The private key is marked as non-extractable for security.
 */
export async function generateKeyPair(): Promise<E2EEKeyPair> {
  const keyPair = await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: ECDH_CURVE },
    false, // private key is NOT extractable
    ['deriveKey', 'deriveBits']
  );
  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

/**
 * Export a public key to JWK format for server storage.
 * Only the public key is ever exported — the private key stays in the browser.
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const jwk = await window.crypto.subtle.exportKey('jwk', publicKey);
  return JSON.stringify(jwk);
}

/**
 * Import a JWK public key received from the server.
 */
export async function importPublicKey(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString);
  return window.crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: ECDH_CURVE },
    true,  // public keys can be extractable
    []     // public keys don't need usages
  );
}

// ─── Key Derivation ───────────────────────────────────────────────────────────

/**
 * Derive an AES-256-GCM key from an ECDH shared secret using HKDF.
 *
 * @param privateKey  - Our ECDH private key
 * @param publicKey   - The other party's ECDH public key
 * @param salt        - Random 16-byte salt (unique per file)
 * @returns AES-256-GCM CryptoKey
 */
export async function deriveSharedKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Step 1: ECDH key agreement → raw shared secret bits
  const sharedBits = await window.crypto.subtle.deriveBits(
    { name: 'ECDH', public: publicKey },
    privateKey,
    256  // 256 bits of shared secret
  );

  // Step 2: Import the shared bits as raw key material for HKDF
  const hkdfKey = await window.crypto.subtle.importKey(
    'raw',
    sharedBits,
    'HKDF',
    false,
    ['deriveKey']
  );

  // Step 3: HKDF → AES-256-GCM key
  return window.crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt as BufferSource,
      info: HKDF_INFO,
    },
    hkdfKey,
    { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
    false,  // derived key is not extractable
    ['encrypt', 'decrypt']
  );
}

// ─── File Encryption ──────────────────────────────────────────────────────────

/**
 * Encrypt a file (ArrayBuffer) using AES-256-GCM.
 *
 * @param data       - Raw file data to encrypt
 * @param privateKey - Our ECDH private key
 * @param publicKey  - Recipient's ECDH public key
 * @returns EncryptedPayload with ciphertext, IV, and salt
 */
export async function encryptFile(
  data: ArrayBuffer,
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<EncryptedPayload> {
  // Generate random IV and salt for this specific file
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  // Derive the AES key
  const aesKey = await deriveSharedKey(privateKey, publicKey, salt);

  // Encrypt
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv },
    aesKey,
    data
  );

  return { ciphertext, iv, salt };
}

/**
 * Decrypt a file (ArrayBuffer) using AES-256-GCM.
 *
 * @param ciphertext - Encrypted data
 * @param iv         - The 12-byte IV used during encryption
 * @param salt       - The 16-byte salt used during key derivation
 * @param privateKey - Our ECDH private key
 * @param publicKey  - Sender's ECDH public key
 * @returns Decrypted ArrayBuffer
 */
export async function decryptFile(
  ciphertext: ArrayBuffer,
  iv: Uint8Array,
  salt: Uint8Array,
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<ArrayBuffer> {
  // Derive the same AES key (ECDH is symmetric in key agreement)
  const aesKey = await deriveSharedKey(privateKey, publicKey, salt);

  // Decrypt
  return window.crypto.subtle.decrypt(
    { name: AES_ALGORITHM, iv: iv as BufferSource },
    aesKey,
    ciphertext
  );
}

// ─── Base64 Utilities ─────────────────────────────────────────────────────────

// FIX: Changed parameter type from ArrayBuffer to ArrayBufferLike to support typed array buffer properties safely
export function arrayBufferToBase64(buffer: ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer; // FIX: Assert explicit clean ArrayBuffer return type
}

export function base64ToUint8Array(base64: string): Uint8Array {
  return new Uint8Array(base64ToArrayBuffer(base64));
}

// ─── High-Level Convenience Functions ─────────────────────────────────────────

/**
 * Encrypt a File/Blob and return a base64-encoded payload ready for upload.
 */
export async function encryptFileForUpload(
  file: File | Blob,
  privateKey: CryptoKey,
  recipientPublicKey: CryptoKey
): Promise<ExportedEncryptedPayload> {
  const data = await file.arrayBuffer();
  const { ciphertext, iv, salt } = await encryptFile(data, privateKey, recipientPublicKey);

  return {
    ciphertext_b64: arrayBufferToBase64(ciphertext),
    iv_b64: arrayBufferToBase64(iv.buffer),
    salt_b64: arrayBufferToBase64(salt.buffer),
  };
}

/**
 * Decrypt a base64-encoded payload back into a Blob.
 */
export async function decryptDownloadedFile(
  payload: ExportedEncryptedPayload,
  privateKey: CryptoKey,
  senderPublicKey: CryptoKey,
  mimeType: string = 'application/pdf'
): Promise<Blob> {
  const ciphertext = base64ToArrayBuffer(payload.ciphertext_b64);
  const iv = base64ToUint8Array(payload.iv_b64);
  const salt = base64ToUint8Array(payload.salt_b64);

  const plaintext = await decryptFile(ciphertext, iv, salt, privateKey, senderPublicKey);
  return new Blob([plaintext], { type: mimeType });
}

/**
 * Initialize E2EE for a user: generate keys, persist locally, register with server.
 * Safe to call multiple times — will skip if keys already exist.
 *
 * @param userId - Current user's ID
 * @param registerKeyFn - Function to call the backend's POST /e2ee/register-key
 * @returns The user's key pair
 */
export async function initializeE2EE(
  userId: number,
  registerKeyFn: (publicKeyJwk: string) => Promise<void>
): Promise<E2EEKeyPair> {
  // Check for existing keys
  let keyPair = await loadKeyPair(userId);

  if (!keyPair) {
    // Generate new key pair
    keyPair = await generateKeyPair();

    // Persist to IndexedDB
    await storeKeyPair(userId, keyPair);

    // Register public key with the server
    const publicKeyJwk = await exportPublicKey(keyPair.publicKey);
    await registerKeyFn(publicKeyJwk);

    console.log('[E2EE] Key pair generated and registered.');
  } else {
    console.log('[E2EE] Existing key pair loaded from IndexedDB.');
  }

  return keyPair;
}