/**
 * crypto.js — Void Vault Encryption Utilities
 * ─────────────────────────────────────────────
 * Uses PBKDF2 key derivation + AES-GCM 256-bit encryption.
 * All helpers are pure async functions with no React dependencies.
 */

const deriveKey = async (passphrase, salt) => {
  const encoder = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    'raw', encoder.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' },
    baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
};

export const encryptData = async (text, passphrase) => {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const saltB64 = btoa(String.fromCharCode(...salt));
  const key = await deriveKey(passphrase, saltB64);
  const encodedText = new TextEncoder().encode(text);
  const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encodedText);
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: saltB64
  };
};

export const decryptData = async (ciphertextB64, ivB64, saltB64, passphrase) => {
  try {
    const key = await deriveKey(passphrase, saltB64);
    const iv = new Uint8Array(atob(ivB64).split('').map(c => c.charCodeAt(0)));
    const ciphertext = new Uint8Array(atob(ciphertextB64).split('').map(c => c.charCodeAt(0)));
    const decodedText = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(decodedText);
  } catch {
    throw new Error('Invalid Passphrase');
  }
};
