import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../../utils/tw';
import {
  vaultApi,
  loadTokens,
  getAuthToken,
  setAuthToken,
  clearAllVaultTokens,
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

  useEffect(() => {
    bootstrap();
  }, []);

  const bootstrap = async () => {
    setLoading(true);
    await loadTokens();

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

        {/* Connection status pill */}
        <View
          style={tw`flex-row items-center px-2.5 py-1 rounded-full ${
            connectionStatus === 'online'
              ? 'bg-green-900/40'
              : connectionStatus === 'offline'
              ? 'bg-red-900/40'
              : 'bg-yellow-900/40'
          }`}
        >
          <View
            style={[
              tw`w-1.5 h-1.5 rounded-full mr-1.5`,
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
            style={tw`text-xs font-semibold ${
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
        </View>

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
    </View>
  );
}

