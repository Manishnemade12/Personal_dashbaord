import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../../utils/tw';
import {
  vaultApi,
  loadTokens,
  getAuthToken,
  setAuthToken,
  clearAllVaultTokens,
  getBaseUrl,
  setCustomVaultUrl,
} from '../../services/vault/vaultApi';
import VaultAuthView from './components/VaultAuthView';
import VaultFoldersView from './components/VaultFoldersView';
import VaultFolderFilesView from './components/VaultFolderFilesView';
import PasswordVaultView from './components/PasswordVaultView';
import VaultTrashView from './components/VaultTrashView';

export default function VaultScreen({ onExitToDashboard }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking'); // 'online' | 'offline' | 'checking'

  // Sub-view navigation
  const [view, setView] = useState('folders'); // 'auth' | 'folders' | 'folder-files' | 'password-vault' | 'trash'
  const [activeFolderData, setActiveFolderData] = useState(null); // { folder, unlockToken, derivedKey, expiresIn }

  // Custom Endpoint Modal state
  const [endpointModalOpen, setEndpointModalOpen] = useState(false);
  const [endpointInput, setEndpointInput] = useState('');
  const [pingStatus, setPingStatus] = useState(null); // { type: 'success'|'error', msg: string }
  const [testingPing, setTestingPing] = useState(false);

  useEffect(() => {
    bootstrap();
  }, []);

  const bootstrap = async () => {
    setLoading(true);
    await loadTokens();
    setEndpointInput(getBaseUrl());

    // Check connection to vault backend
    try {
      const statusRes = await vaultApi.getStatus();
      if (statusRes.ok) {
        setConnectionStatus('online');
      } else {
        setConnectionStatus('offline');
      }
    } catch {
      setConnectionStatus('offline');
    }

    // Check if we have a valid auth token
    const token = getAuthToken();
    if (token) {
      const meRes = await vaultApi.getMe();
      if (meRes.ok && meRes.data?.user) {
        setUser(meRes.data.user);
        setView('folders');
      } else {
        await setAuthToken(null);
        setView('auth');
      }
    } else {
      setView('auth');
    }
    setLoading(false);
  };

  const handleLoginSuccess = useCallback(async (data) => {
    // After login, fetch the user profile
    const meRes = await vaultApi.getMe();
    if (meRes.ok && meRes.data?.user) {
      setUser(meRes.data.user);
    } else {
      setUser({ email: data.email || 'User' });
    }
    setView('folders');
  }, []);

  const handleLogout = useCallback(async () => {
    await clearAllVaultTokens();
    setUser(null);
    setView('auth');
  }, []);

  const handleTestPing = async (targetUrl) => {
    setTestingPing(true);
    setPingStatus(null);
    const url = (targetUrl || endpointInput || '').trim().replace(/\/+$/, '');
    try {
      const res = await fetch(`${url}/api/status`, { method: 'GET' });
      if (res.ok) {
        setPingStatus({ type: 'success', msg: 'Connected successfully (HTTP 200 OK)' });
        setConnectionStatus('online');
      } else {
        setPingStatus({ type: 'error', msg: `Server replied with HTTP ${res.status}` });
        setConnectionStatus('offline');
      }
    } catch (e) {
      setPingStatus({ type: 'error', msg: e.message || 'Cannot reach endpoint' });
      setConnectionStatus('offline');
    } finally {
      setTestingPing(false);
    }
  };

  const handleSaveEndpoint = async () => {
    const trimmed = endpointInput.trim().replace(/\/+$/, '');
    await setCustomVaultUrl(trimmed || null);
    setEndpointModalOpen(false);
    bootstrap();
  };

  const handleFolderUnlocked = useCallback((data) => {
    setActiveFolderData(data);
    setView('folder-files');
  }, []);

  const handleFolderLocked = useCallback(() => {
    setActiveFolderData(null);
    setView('folders');
  }, []);

  if (loading) {
    return (
      <View style={tw`flex-1 bg-vault-bg items-center justify-center`}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={tw`text-txt-muted mt-4 text-sm font-semibold`}>
          Connecting to CipherVault…
        </Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-vault-bg w-full max-w-full`}>
      {/* Top navigation bar */}
      <View
        style={[
          tw`flex-row items-center px-3 border-b border-vault-border`,
          { height: 52, backgroundColor: '#0d1117' },
        ]}
      >
        <TouchableOpacity
          onPress={onExitToDashboard}
          style={tw`flex-row items-center mr-3 py-2 px-2`}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color="#94a3b8" />
          <Text style={tw`text-txt-muted text-xs font-semibold ml-1`}>Exit</Text>
        </TouchableOpacity>

        <View style={tw`flex-row items-center flex-1 justify-center`}>
          <Ionicons name="shield-checkmark" size={18} color="#6366f1" />
          <Text style={tw`text-txt-primary text-sm font-bold ml-1.5`}>
            CipherVault
          </Text>
        </View>

        {/* Interactive connection status & config pill */}
        <TouchableOpacity
          onPress={() => {
            setEndpointInput(getBaseUrl());
            setPingStatus(null);
            setEndpointModalOpen(true);
          }}
          activeOpacity={0.7}
          style={tw`flex-row items-center px-2.5 py-1 rounded-full border border-vault-border ${
            connectionStatus === 'online'
              ? 'bg-green-900/30'
              : connectionStatus === 'offline'
              ? 'bg-red-900/30'
              : 'bg-yellow-900/30'
          }`}
        >
          <View
            style={[
              tw`w-2 h-2 rounded-full mr-1.5`,
              {
                backgroundColor:
                  connectionStatus === 'online'
                    ? '#10b981'
                    : connectionStatus === 'offline'
                    ? '#f43f5e'
                    : '#f59e0b',
              },
            ]}
          />
          <Text
            style={tw`text-xs font-semibold mr-1.5 ${
              connectionStatus === 'online'
                ? 'text-green-400'
                : connectionStatus === 'offline'
                ? 'text-red-400'
                : 'text-yellow-400'
            }`}
          >
            {connectionStatus === 'online'
              ? 'Online'
              : connectionStatus === 'offline'
              ? 'Offline'
              : '…'}
          </Text>
          <Ionicons name="settings-outline" size={12} color="#94a3b8" />
        </TouchableOpacity>

        {/* User & Logout */}
        {user && (
          <TouchableOpacity
            onPress={handleLogout}
            style={tw`ml-3 py-1 px-2`}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color="#f43f5e" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content area */}
      <View style={tw`flex-1 w-full max-w-full overflow-hidden`}>
        {view === 'auth' && <VaultAuthView onLoginSuccess={handleLoginSuccess} />}

        {view === 'folders' && (
          <VaultFoldersView
            onFolderUnlocked={handleFolderUnlocked}
            onOpenPasswordVault={() => setView('password-vault')}
            onOpenTrash={() => setView('trash')}
          />
        )}

        {view === 'folder-files' && activeFolderData && (
          <VaultFolderFilesView
            folder={activeFolderData.folder}
            unlockToken={activeFolderData.unlockToken}
            derivedKey={activeFolderData.derivedKey}
            expiresIn={activeFolderData.expiresIn}
            onBack={() => setView('folders')}
            onLock={handleFolderLocked}
          />
        )}

        {view === 'password-vault' && (
          <PasswordVaultView onBack={() => setView('folders')} />
        )}

        {view === 'trash' && (
          <VaultTrashView
            username={user?.email || user?.id || 'admin'}
            onBack={() => setView('folders')}
          />
        )}
      </View>

      {/* Backend Endpoint Settings Modal */}
      <Modal
        visible={endpointModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEndpointModalOpen(false)}
      >
        <View style={tw`flex-1 bg-black/75 items-center justify-center p-4`}>
          <View style={tw`bg-vault-card border border-vault-border rounded-2xl w-full max-w-md p-5 shadow-2xl`}>
            {/* Modal Header */}
            <View style={tw`flex-row items-center justify-between pb-3 border-b border-vault-border mb-4`}>
              <View style={tw`flex-row items-center gap-2`}>
                <Ionicons name="server-outline" size={20} color="#6366f1" />
                <Text style={tw`text-txt-primary text-base font-bold`}>
                  Vault Backend Host
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setEndpointModalOpen(false)}
                style={tw`p-1 rounded-lg bg-vault-surface`}
              >
                <Ionicons name="close" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Instruction description */}
            <Text style={tw`text-txt-muted text-xs mb-3 leading-5`}>
              Enter your standalone CipherVault backend URL (e.g. hosted on Vercel, Railway, Render, or localhost:3000).
            </Text>

            {/* Input field */}
            <View style={tw`bg-vault-surface border border-vault-border-light rounded-xl px-3 py-2.5 mb-3 flex-row items-center gap-2`}>
              <Ionicons name="link-outline" size={16} color="#64748b" />
              <TextInput
                value={endpointInput}
                onChangeText={setEndpointInput}
                placeholder="http://localhost:3000"
                placeholderTextColor="#64748b"
                style={tw`flex-1 text-txt-primary text-sm font-mono`}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Ping Feedback */}
            {pingStatus && (
              <View
                style={tw`p-2.5 rounded-xl mb-3 flex-row items-center gap-2 ${
                  pingStatus.type === 'success' ? 'bg-green-950/40 border border-green-800' : 'bg-red-950/40 border border-red-800'
                }`}
              >
                <Ionicons
                  name={pingStatus.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={pingStatus.type === 'success' ? '#10b981' : '#f43f5e'}
                />
                <Text
                  style={tw`text-xs flex-1 ${
                    pingStatus.type === 'success' ? 'text-green-300 font-semibold' : 'text-red-300 font-semibold'
                  }`}
                >
                  {pingStatus.msg}
                </Text>
              </View>
            )}

            {/* Action buttons */}
            <View style={tw`flex-row gap-2 mt-2`}>
              <TouchableOpacity
                onPress={() => handleTestPing(endpointInput)}
                disabled={testingPing}
                style={tw`flex-1 py-2.5 px-3 rounded-xl bg-vault-surface border border-vault-border items-center justify-center flex-row gap-1.5`}
              >
                {testingPing ? (
                  <ActivityIndicator size="small" color="#818cf8" />
                ) : (
                  <>
                    <Ionicons name="flash-outline" size={14} color="#818cf8" />
                    <Text style={tw`text-indigo-400 text-xs font-semibold`}>Test Ping</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveEndpoint}
                style={tw`flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 items-center justify-center`}
              >
                <Text style={tw`text-white text-xs font-bold`}>Save & Apply</Text>
              </TouchableOpacity>
            </View>

            {/* Reset to env option */}
            <TouchableOpacity
              onPress={() => {
                const defaultUrl = (typeof process !== 'undefined' && (process.env?.EXPO_PUBLIC_VAULT_API_URL || process.env?.VAULT_API_URL)) || 'http://localhost:3000';
                setEndpointInput(defaultUrl);
                handleTestPing(defaultUrl);
              }}
              style={tw`mt-3 py-1.5 items-center`}
            >
              <Text style={tw`text-txt-dim text-xs underline`}>
                Reset to .env default
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

