/**
 * Deterministic Keypair Management for Simplified zkLogin
 * 
 * Keypair is derived deterministically from Google sub (user ID).
 * Same Google account = Same Sui address, always.
 * 
 * SECURITY IMPROVEMENTS:
 * - Uses sessionStorage instead of localStorage (data cleared when tab closes)
 * - Auto-expires after configurable duration (default: 1 hour)
 * - Validates keypair integrity on load
 * 
 * NOTE: This is a simplified version. Real zkLogin would involve:
 * - zkProof generation
 * - Salt service from Mysten
 * - Proper zkLogin address derivation
 */

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const KEYPAIR_STORAGE_KEY = 'ephemeral_keypair';
const USER_SUB_STORAGE_KEY = 'current_user_sub';

// Session expiry time in milliseconds (default: 1 hour)
const SESSION_EXPIRY_MS = 60 * 60 * 1000;

export interface StoredKeypair {
  secretKey: string; // Base64 encoded
  publicKey: string; // Base64 encoded
  address: string;   // Sui address derived from keypair
  createdAt: number; // Timestamp
  expiresAt: number; // Expiry timestamp
  userSub: string;   // Google sub this keypair belongs to
}

/**
 * Get storage object (sessionStorage for security, falls back to localStorage)
 */
function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  // Prefer sessionStorage for security - clears when tab/browser closes
  return window.sessionStorage || window.localStorage;
}

/**
 * Clear stored keypair from both storages
 */
export function clearKeypair(): void {
  if (typeof window === 'undefined') return;
  // Clear from both storages to ensure cleanup
  sessionStorage.removeItem(KEYPAIR_STORAGE_KEY);
  sessionStorage.removeItem(USER_SUB_STORAGE_KEY);
  localStorage.removeItem(KEYPAIR_STORAGE_KEY);
  localStorage.removeItem(USER_SUB_STORAGE_KEY);
  console.log('Keypair cleared from storage');
}

/**
 * Hash string using SHA-256 (browser native)
 */
async function hashString(input: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

/**
 * Generate deterministic keypair from Google sub
 * Same sub = Same keypair = Same address
 */
export async function generateDeterministicKeypair(googleSub: string): Promise<Ed25519Keypair> {
  // Create a deterministic seed from Google sub
  // Add a salt to make it unique to this app
  const salt = 'money-race-sui-wallet-v1';
  const seedInput = `${salt}:${googleSub}`;
  
  // Hash to get 32 bytes for Ed25519 seed
  const seed = await hashString(seedInput);
  
  // Create keypair from seed
  const keypair = Ed25519Keypair.fromSecretKey(seed);
  
  console.log('Generated deterministic keypair for sub:', googleSub.slice(0, 8) + '...');
  return keypair;
}

/**
 * Generate a new ephemeral keypair (random - legacy)
 */
export function generateEphemeralKeypair(): Ed25519Keypair {
  return new Ed25519Keypair();
}

/**
 * Save keypair to sessionStorage with user sub and expiry
 */
export function saveKeypair(keypair: Ed25519Keypair, userSub?: string, expiryMs: number = SESSION_EXPIRY_MS): void {
  const storage = getStorage();
  if (!storage) return;
  
  // getSecretKey() returns base64 string in SDK v2
  const secretKeyBase64 = keypair.getSecretKey();
  const now = Date.now();
  
  const stored: StoredKeypair = {
    secretKey: secretKeyBase64,
    publicKey: keypair.getPublicKey().toBase64(),
    address: keypair.getPublicKey().toSuiAddress(),
    createdAt: now,
    expiresAt: now + expiryMs,
    userSub: userSub || '',
  };
  
  storage.setItem(KEYPAIR_STORAGE_KEY, JSON.stringify(stored));
  if (userSub) {
    storage.setItem(USER_SUB_STORAGE_KEY, userSub);
  }
  console.log('Keypair saved securely (expires in', Math.round(expiryMs / 60000), 'minutes), address:', stored.address);
}

/**
 * Check if stored keypair has expired
 */
function isKeypairExpired(data: StoredKeypair): boolean {
  // If no expiresAt field (old format), check createdAt + default expiry
  const expiresAt = data.expiresAt || (data.createdAt + SESSION_EXPIRY_MS);
  return Date.now() > expiresAt;
}

/**
 * Load keypair from sessionStorage with expiry check
 */
export function loadKeypair(): Ed25519Keypair | null {
  const storage = getStorage();
  if (!storage) return null;
  
  const stored = storage.getItem(KEYPAIR_STORAGE_KEY);
  if (!stored) return null;
  
  try {
    const data: StoredKeypair = JSON.parse(stored);
    
    // Check if keypair has expired
    if (isKeypairExpired(data)) {
      console.warn('Keypair expired, clearing...');
      clearKeypair();
      return null;
    }
    
    // In SDK v2, getSecretKey() returns base64 string
    // fromSecretKey expects the base64 string directly
    const keypair = Ed25519Keypair.fromSecretKey(data.secretKey);
    
    // Verify the keypair matches stored address
    const derivedAddress = keypair.getPublicKey().toSuiAddress();
    if (derivedAddress !== data.address) {
      console.warn('Keypair address mismatch, clearing...');
      clearKeypair();
      return null;
    }
    
    // Log remaining time
    const remainingMs = (data.expiresAt || (data.createdAt + SESSION_EXPIRY_MS)) - Date.now();
    console.log('Keypair loaded, expires in', Math.round(remainingMs / 60000), 'minutes');
    
    return keypair;
  } catch (error) {
    console.error('Failed to load keypair, clearing corrupted data:', error);
    // Clear corrupted keypair data
    clearKeypair();
    return null;
  }
}

/**
 * Get stored keypair info without loading full keypair
 */
export function getStoredKeypairInfo(): StoredKeypair | null {
  const storage = getStorage();
  if (!storage) return null;
  
  const stored = storage.getItem(KEYPAIR_STORAGE_KEY);
  if (!stored) return null;
  
  try {
    const data = JSON.parse(stored);
    // Check expiry even for info
    if (isKeypairExpired(data)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Get stored user sub
 */
export function getStoredUserSub(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  return storage.getItem(USER_SUB_STORAGE_KEY);
}

/**
 * Get or create deterministic keypair for a Google user
 * If user changed (different sub), generate new keypair
 */
export async function getOrCreateKeypairForUser(googleSub: string): Promise<Ed25519Keypair> {
  const storedInfo = getStoredKeypairInfo();
  const storedSub = getStoredUserSub();
  
  // Check if we have a keypair for this user
  if (storedInfo && storedSub === googleSub) {
    const keypair = loadKeypair();
    if (keypair) {
      console.log('Loaded existing keypair for user');
      return keypair;
    }
  }
  
  // Different user or no keypair - generate new deterministic one
  console.log('Generating new deterministic keypair for user');
  const keypair = await generateDeterministicKeypair(googleSub);
  saveKeypair(keypair, googleSub);
  return keypair;
}

/**
 * Get or create ephemeral keypair (legacy - random)
 * Returns existing keypair if available, otherwise creates new one
 */
export function getOrCreateKeypair(): Ed25519Keypair {
  let keypair = loadKeypair();
  
  if (!keypair) {
    keypair = generateEphemeralKeypair();
    saveKeypair(keypair);
    console.log('Created new ephemeral keypair');
  } else {
    console.log('Loaded existing ephemeral keypair');
  }
  
  return keypair;
}

/**
 * Get the Sui address from stored keypair
 */
export function getKeypairAddress(): string | null {
  const info = getStoredKeypairInfo();
  return info?.address ?? null;
}
/**
 * Check if session is valid (keypair exists and not expired)
 */
export function isSessionValid(): boolean {
  const info = getStoredKeypairInfo();
  return info !== null;
}

/**
 * Get session expiry info
 */
export function getSessionExpiryInfo(): { isValid: boolean; expiresAt: number | null; remainingMs: number | null } {
  const storage = getStorage();
  if (!storage) return { isValid: false, expiresAt: null, remainingMs: null };
  
  const stored = storage.getItem(KEYPAIR_STORAGE_KEY);
  if (!stored) return { isValid: false, expiresAt: null, remainingMs: null };
  
  try {
    const data: StoredKeypair = JSON.parse(stored);
    const expiresAt = data.expiresAt || (data.createdAt + SESSION_EXPIRY_MS);
    const remainingMs = expiresAt - Date.now();
    
    return {
      isValid: remainingMs > 0,
      expiresAt,
      remainingMs: remainingMs > 0 ? remainingMs : 0,
    };
  } catch {
    return { isValid: false, expiresAt: null, remainingMs: null };
  }
}

/**
 * Refresh session expiry (extend the session)
 */
export function refreshSession(extensionMs: number = SESSION_EXPIRY_MS): boolean {
  const storage = getStorage();
  if (!storage) return false;
  
  const stored = storage.getItem(KEYPAIR_STORAGE_KEY);
  if (!stored) return false;
  
  try {
    const data: StoredKeypair = JSON.parse(stored);
    
    // Check if already expired
    if (isKeypairExpired(data)) {
      clearKeypair();
      return false;
    }
    
    // Extend expiry
    data.expiresAt = Date.now() + extensionMs;
    storage.setItem(KEYPAIR_STORAGE_KEY, JSON.stringify(data));
    console.log('Session refreshed, new expiry in', Math.round(extensionMs / 60000), 'minutes');
    return true;
  } catch {
    return false;
  }
}