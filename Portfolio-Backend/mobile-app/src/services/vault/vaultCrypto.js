/**
 * Client-side AES-256-GCM encryption/decryption using Web Crypto API.
 * Compatible with CipherVault (Phylogenetic Analysis) backend blobs.
 */

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function importKey(hexKey) {
  const keyBytes = hexToBytes(hexKey);
  return await window.crypto.subtle.importKey(
    'raw',
    keyBytes.buffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt an ArrayBuffer with AES-256-GCM.
 * Returns { ciphertext: ArrayBuffer, iv: string(hex), authTag: string(hex) }
 */
export async function encryptBuffer(buffer, hexKey) {
  const cryptoKey = await importKey(hexKey);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedData = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    cryptoKey,
    buffer,
  );

  const encryptedBytes = new Uint8Array(encryptedData);
  const cipherLength = encryptedBytes.byteLength - 16;

  const ciphertext = encryptedData.slice(0, cipherLength);
  const authTagBytes = encryptedBytes.slice(cipherLength);

  return {
    ciphertext,
    iv: bytesToHex(iv),
    authTag: bytesToHex(authTagBytes),
  };
}

/**
 * Decrypt an ArrayBuffer that was encrypted with AES-256-GCM.
 */
export async function decryptBuffer(ciphertext, hexKey, ivHex, authTagHex) {
  const cryptoKey = await importKey(hexKey);
  const iv = hexToBytes(ivHex);
  const authTag = hexToBytes(authTagHex);

  const ciphertextBytes = new Uint8Array(ciphertext);
  const combinedData = new Uint8Array(ciphertextBytes.byteLength + authTag.byteLength);
  combinedData.set(ciphertextBytes, 0);
  combinedData.set(authTag, ciphertextBytes.byteLength);

  try {
    return await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer, tagLength: 128 },
      cryptoKey,
      combinedData.buffer,
    );
  } catch (e) {
    console.error('[VaultCrypto] Decryption failed:', e);
    throw new Error('Decryption failed — wrong key or corrupted data');
  }
}

export const vaultCrypto = { hexToBytes, bytesToHex, importKey, encryptBuffer, decryptBuffer };

