/**
 * CipherVault API client — talks to the Phylogenetic Analysis backend.
 * Base URL comes from EXPO_PUBLIC_VAULT_API_URL (defaults to http://localhost:3000).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const AUTH_TOKEN_KEY = 'cv_auth_token';
const VAULT_SESSION_KEY = 'cv_pwd_vault_token';

function getBaseUrl() {
  // Expo public env vars are inlined at build time
  const envUrl =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_VAULT_API_URL;
  return (envUrl || 'http://localhost:3000').replace(/\/+$/, '');
}

/* ───────── Token helpers ───────── */

let _authToken = null;
let _vaultSessionToken = null;

export async function loadTokens() {
  _authToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  _vaultSessionToken = await AsyncStorage.getItem(VAULT_SESSION_KEY);
}

export async function setAuthToken(token) {
  _authToken = token;
  if (token) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export function getAuthToken() {
  return _authToken;
}

export async function setVaultSessionToken(token) {
  _vaultSessionToken = token;
  if (token) {
    await AsyncStorage.setItem(VAULT_SESSION_KEY, token);
  } else {
    await AsyncStorage.removeItem(VAULT_SESSION_KEY);
  }
}

export function getVaultSessionToken() {
  return _vaultSessionToken;
}

export async function clearAllVaultTokens() {
  _authToken = null;
  _vaultSessionToken = null;
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, VAULT_SESSION_KEY]);
}

/* ───────── Generic request helper ───────── */

async function request(endpoint, opts = {}) {
  const base = getBaseUrl();
  const url = `${base}${endpoint}`;
  const headers = { ...(opts.headers || {}) };

  if (_authToken) {
    headers['Authorization'] = `Bearer ${_authToken}`;
  }
  if (opts.folderToken) {
    headers['x-folder-token'] = opts.folderToken;
  }
  if (opts.vaultSession || _vaultSessionToken) {
    headers['x-vault-session-token'] = opts.vaultSession || _vaultSessionToken;
  }
  if (!opts.isFormData && !opts.isRawBuffer && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let body = opts.body;
  if (!opts.isFormData && !opts.isRawBuffer && body && typeof body === 'object') {
    body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, {
      method: opts.method || 'GET',
      headers,
      body,
    });

    // Handle expired auth
    if (
      res.status === 401 &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/register')
    ) {
      await setAuthToken(null);
      return { ok: false, status: 401, data: { error: 'Session expired' } };
    }

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.warn('[VaultAPI]', err.message);
    return { ok: false, status: 0, data: { error: err.message || 'Network error' } };
  }
}

/* ───────── Auth ───────── */

export const vaultApi = {
  // System
  async getStatus() {
    return request('/api/status');
  },

  // Auth
  async register(email, password) {
    return request('/auth/register', { method: 'POST', body: { email, password } });
  },
  async login(email, password) {
    return request('/auth/login', { method: 'POST', body: { email, password } });
  },
  async getMe() {
    return request('/auth/me');
  },

  // Folders
  async getFolders() {
    const res = await request('/folders');
    return res.ok ? (res.data.folders || []) : [];
  },
  async createFolder(name, password) {
    return request('/folders', { method: 'POST', body: { name, password } });
  },
  async unlockFolder(id, password) {
    return request(`/folders/${id}/unlock`, { method: 'POST', body: { password } });
  },
  async lockFolder(id, unlockToken) {
    return request(`/folders/${id}/lock`, {
      method: 'POST',
      body: { unlockToken },
      folderToken: unlockToken,
    });
  },
  async deleteFolder(id) {
    return request(`/folders/${id}`, { method: 'DELETE' });
  },

  // Files inside folder
  async getFilesInFolder(folderId, unlockToken) {
    return request(`/folders/${folderId}/files`, { folderToken: unlockToken });
  },
  async uploadFileFormData(folderId, formData, unlockToken) {
    return request(`/folders/${folderId}/files`, {
      method: 'POST',
      body: formData,
      isFormData: true,
      folderToken: unlockToken,
    });
  },
  async localUpload(folderId, headersMeta, encryptedBuffer, unlockToken) {
    return request(`/folders/${folderId}/files/local-upload`, {
      method: 'POST',
      body: encryptedBuffer,
      isRawBuffer: true,
      folderToken: unlockToken,
      headers: {
        'Content-Type': 'application/octet-stream',
        ...headersMeta,
      },
    });
  },
  async getDownloadToken(folderId, fileId, unlockToken) {
    return request(`/folders/${folderId}/files/${fileId}/download-token`, {
      folderToken: unlockToken,
    });
  },
  async deleteFile(fileId, unlockToken) {
    return request(`/files/${fileId}`, {
      method: 'DELETE',
      folderToken: unlockToken,
    });
  },

  // Trash
  async getTrashItems(username) {
    return request(`/api/trash/${username}`);
  },
  async restoreFolder(username, folderId) {
    return request(`/api/trash/${username}/restore/folder/${folderId}`, { method: 'POST' });
  },
  async restoreFile(username, fileId) {
    return request(`/api/trash/${username}/restore/file/${fileId}`, { method: 'POST' });
  },
  async permanentDeleteFolder(username, folderId) {
    return request(`/api/trash/${username}/folder/${folderId}`, { method: 'DELETE' });
  },
  async permanentDeleteFile(username, fileId) {
    return request(`/api/trash/${username}/file/${fileId}`, { method: 'DELETE' });
  },

  // Password Vault
  async getPasswordVaultStatus() {
    return request('/api/password-vault/status');
  },
  async setupPasswordVault(vaultPassword) {
    return request('/api/password-vault/setup', {
      method: 'POST',
      body: { vaultPassword },
    });
  },
  async verifyPasswordVaultSetup(code) {
    return request('/api/password-vault/verify-setup', {
      method: 'POST',
      body: { code },
    });
  },
  async unlockPasswordVault(vaultPassword, code) {
    return request('/api/password-vault/unlock', {
      method: 'POST',
      body: { vaultPassword, code },
    });
  },
  async getPasswordVaultEntries(sessionToken) {
    return request('/api/password-vault/entries', {
      vaultSession: sessionToken,
    });
  },
  async verifyPasswordVaultOtp(code, sessionToken) {
    return request('/api/password-vault/entries/verify-otp', {
      method: 'POST',
      vaultSession: sessionToken,
      body: { code },
    });
  },
  async createPasswordVaultEntry(folderId, password, notes, sessionToken) {
    return request('/api/password-vault/entries', {
      method: 'POST',
      vaultSession: sessionToken,
      body: { folderId, password, notes },
    });
  },
  async updatePasswordVaultEntry(entryId, password, notes, sessionToken) {
    return request(`/api/password-vault/entries/${entryId}`, {
      method: 'PUT',
      vaultSession: sessionToken,
      body: { password, notes },
    });
  },
  async deletePasswordVaultEntry(entryId, sessionToken) {
    return request(`/api/password-vault/entries/${entryId}`, {
      method: 'DELETE',
      vaultSession: sessionToken,
    });
  },
  async recoverForgottenPassword(folderId, email, password, code) {
    return request('/api/password-vault/forget', {
      method: 'POST',
      body: { folderId, email, password, code },
    });
  },
};

