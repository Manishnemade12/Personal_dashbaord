import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../../../utils/tw';
import { vaultApi } from '../../../services/vault/vaultApi';

const VaultFoldersView = ({ onFolderUnlocked, onOpenTrash, onOpenPasswordVault, onForceLogout }) => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [unlockModalVisible, setUnlockModalVisible] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);

  // Create folder form state
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderPassword, setNewFolderPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // Unlock folder form state
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await vaultApi.getFolders();
      if (Array.isArray(res)) {
        setFolders(res);
      } else {
        setFolders(res?.data?.folders || res?.folders || res?.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch folders:', err);
      Alert.alert('Error', 'Failed to load folders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFolders();
  }, [fetchFolders]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // ── Create Folder ──
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('Validation', 'Please enter a folder name.');
      return;
    }
    if (newFolderPassword.length < 6) {
      Alert.alert('Validation', 'Password must be at least 6 characters.');
      return;
    }

    setCreating(true);
    try {
      const res = await vaultApi.createFolder(newFolderName.trim(), newFolderPassword);
      if (!res.ok) {
        throw new Error(res.data?.error || res.data?.message || 'Failed to create folder.');
      }
      setCreateModalVisible(false);
      setNewFolderName('');
      setNewFolderPassword('');
      fetchFolders();
    } catch (err) {
      console.error('Failed to create folder:', err);
      Alert.alert('Error', err?.message || 'Failed to create folder.');
    } finally {
      setCreating(false);
    }
  };

  // ── Unlock Folder ──
  const handleUnlockFolder = async () => {
    if (!unlockPassword) {
      Alert.alert('Validation', 'Please enter the folder password.');
      return;
    }

    setUnlocking(true);
    try {
      const res = await vaultApi.unlockFolder(selectedFolder._id || selectedFolder.id, unlockPassword);
      if (!res.ok) {
        throw new Error(res.data?.error || res.data?.message || 'Incorrect password or unlock failed.');
      }
      const data = res.data || res;
      setUnlockModalVisible(false);
      setUnlockPassword('');
      if (onFolderUnlocked) {
        onFolderUnlocked({
          folder: selectedFolder,
          unlockToken: data.unlockToken || data.token,
          derivedKey: data.derivedKey || data.key,
          expiresIn: data.expiresIn,
        });
      }
    } catch (err) {
      console.error('Failed to unlock folder:', err);
      setUnlockModalVisible(false);
      setUnlockPassword('');
      Alert.alert(
        'Security Alert - Incorrect Password',
        'Galat password daalne ki wajah se security protocol ke taht session terminate kar diya gaya hai. Kripya dobara login karein.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (onForceLogout) {
                onForceLogout();
              }
            },
          },
        ]
      );
      // Also immediately trigger logout so user cannot stay logged in
      if (onForceLogout) {
        onForceLogout();
      }
    } finally {
      setUnlocking(false);
    }
  };

  // ── Delete Folder ──
  const handleDeleteFolder = (folder) => {
    Alert.alert(
      'Delete Folder',
      `Are you sure you want to delete "${folder.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await vaultApi.deleteFolder(folder._id || folder.id);
              fetchFolders();
            } catch (err) {
              console.error('Failed to delete folder:', err);
              Alert.alert('Error', 'Failed to delete folder.');
            }
          },
        },
      ]
    );
  };

  // ── Open unlock modal ──
  const openUnlockModal = (folder) => {
    setSelectedFolder(folder);
    setUnlockPassword('');
    setUnlockModalVisible(true);
  };

  // ── Render a single folder card ──
  const renderFolderCard = (folder, index) => {
    const fileCount = folder.fileCount ?? folder.files?.length ?? 0;

    return (
      <TouchableOpacity
        key={folder._id || folder.id || index}
        style={tw`bg-vault-card rounded-2xl p-4 mb-3 border border-vault-border`}
        onPress={() => openUnlockModal(folder)}
        onLongPress={() => handleDeleteFolder(folder)}
        activeOpacity={0.7}
      >
        <View style={tw`flex-row items-center justify-between`}>
          <View style={tw`flex-row items-center flex-1 mr-3`}>
            <View style={tw`w-11 h-11 rounded-xl bg-accent-primary/15 items-center justify-center mr-3`}>
              <Ionicons name="folder-open" size={22} color={tw.color('accent-primary')} />
            </View>
            <View style={tw`flex-1`}>
              <Text style={tw`text-txt-primary font-bold text-base`} numberOfLines={1}>
                {folder.name}
              </Text>
              <View style={tw`flex-row items-center mt-1`}>
                <View style={tw`bg-vault-surface px-2 py-0.5 rounded-full mr-2`}>
                  <Text style={tw`text-txt-muted text-xs`}>
                    {fileCount} {fileCount === 1 ? 'file' : 'files'}
                  </Text>
                </View>
                {folder.createdAt && (
                  <Text style={tw`text-txt-dim text-xs`}>
                    {formatDate(folder.createdAt)}
                  </Text>
                )}
              </View>
            </View>
          </View>

          <View style={tw`flex-row items-center`}>
            <Ionicons
              name="lock-closed"
              size={16}
              color={tw.color('accent-success')}
              style={tw`mr-2`}
            />
            <TouchableOpacity
              onPress={() => handleDeleteFolder(folder)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={tw`p-1`}
            >
              <Ionicons name="trash-outline" size={18} color={tw.color('accent-danger')} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Empty state ──
  const renderEmptyState = () => (
    <View style={tw`items-center justify-center py-20 px-6`}>
      <View style={tw`w-20 h-20 rounded-full bg-vault-card items-center justify-center mb-5 border border-vault-border`}>
        <Ionicons name="shield-checkmark" size={40} color={tw.color('accent-primary')} />
      </View>
      <Text style={tw`text-txt-primary text-lg font-bold text-center mb-2`}>
        No folders yet
      </Text>
      <Text style={tw`text-txt-muted text-sm text-center leading-5`}>
        Create your first encrypted folder to securely store your files.
      </Text>
      <TouchableOpacity
        style={tw`mt-6 bg-accent-primary px-6 py-3 rounded-xl flex-row items-center`}
        onPress={() => setCreateModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={tw`text-white font-semibold ml-2`}>Create Folder</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Loading state ──
  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-vault-bg`}>
        <ActivityIndicator size="large" color={tw.color('accent-primary')} />
        <Text style={tw`text-txt-muted mt-3 text-sm`}>Loading folders...</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-vault-bg`}>
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-4 pb-6`}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={tw.color('accent-primary')}
          />
        }
      >
        {/* Quick Action Buttons */}
        <View style={tw`flex-row mb-5 mt-2`}>
          <TouchableOpacity
            style={tw`flex-1 bg-vault-card border border-vault-border rounded-xl py-3 px-4 flex-row items-center justify-center mr-2`}
            onPress={onOpenPasswordVault}
            activeOpacity={0.7}
          >
            <Text style={tw`text-base mr-1.5`}>🔐</Text>
            <Text style={tw`text-txt-primary font-semibold text-sm`}>Password Vault</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={tw`flex-1 bg-vault-card border border-vault-border rounded-xl py-3 px-4 flex-row items-center justify-center ml-2`}
            onPress={onOpenTrash}
            activeOpacity={0.7}
          >
            <Text style={tw`text-base mr-1.5`}>🗑</Text>
            <Text style={tw`text-txt-primary font-semibold text-sm`}>Trash</Text>
          </TouchableOpacity>
        </View>

        {/* Header Bar */}
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <View style={tw`flex-row items-center`}>
            <Text style={tw`text-txt-primary text-xl font-bold`}>Encrypted Folders</Text>
            {folders.length > 0 && (
              <View style={tw`ml-2 bg-accent-primary/20 px-2.5 py-0.5 rounded-full`}>
                <Text style={tw`text-accent-primary text-xs font-bold`}>{folders.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={tw`bg-accent-primary px-4 py-2 rounded-xl flex-row items-center`}
            onPress={() => {
              setNewFolderName('');
              setNewFolderPassword('');
              setCreateModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={tw`text-white font-semibold text-sm ml-1`}>New Folder</Text>
          </TouchableOpacity>
        </View>

        {/* Folder List or Empty State */}
        {folders.length === 0 ? renderEmptyState() : folders.map(renderFolderCard)}
      </ScrollView>

      {/* ── Create Folder Modal ── */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={tw`flex-1 bg-black/60 items-center justify-center px-5`}>
          <View style={tw`bg-vault-card w-full max-w-md rounded-2xl p-6 border border-vault-border`}>
            {/* Modal Header */}
            <View style={tw`flex-row items-center justify-between mb-5`}>
              <View style={tw`flex-row items-center`}>
                <View style={tw`w-9 h-9 rounded-xl bg-accent-primary/15 items-center justify-center mr-3`}>
                  <Ionicons name="folder-open-outline" size={20} color={tw.color('accent-primary')} />
                </View>
                <Text style={tw`text-txt-primary text-lg font-bold`}>New Folder</Text>
              </View>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color={tw.color('txt-muted')} />
              </TouchableOpacity>
            </View>

            {/* Folder Name Input */}
            <Text style={tw`text-txt-secondary text-sm font-medium mb-1.5`}>Folder Name</Text>
            <TextInput
              style={tw`bg-vault-surface border border-vault-border rounded-xl px-4 py-3 text-txt-primary text-base mb-4`}
              placeholder="Enter folder name"
              placeholderTextColor={tw.color('txt-dim')}
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />

            {/* Password Input */}
            <Text style={tw`text-txt-secondary text-sm font-medium mb-1.5`}>Encryption Password</Text>
            <TextInput
              style={tw`bg-vault-surface border border-vault-border rounded-xl px-4 py-3 text-txt-primary text-base mb-1`}
              placeholder="Min 6 characters"
              placeholderTextColor={tw.color('txt-dim')}
              value={newFolderPassword}
              onChangeText={setNewFolderPassword}
              secureTextEntry
            />
            <Text style={tw`text-txt-dim text-xs mb-5`}>
              This password encrypts your folder. Don't forget it — it cannot be recovered.
            </Text>

            {/* Create Button */}
            <TouchableOpacity
              style={tw`bg-accent-primary py-3.5 rounded-xl items-center flex-row justify-center ${
                creating ? 'opacity-60' : ''
              }`}
              onPress={handleCreateFolder}
              disabled={creating}
              activeOpacity={0.8}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={18} color="#fff" />
                  <Text style={tw`text-white font-bold text-base ml-2`}>Create Folder</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Unlock Folder Modal ── */}
      <Modal
        visible={unlockModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUnlockModalVisible(false)}
      >
        <View style={tw`flex-1 bg-black/60 items-center justify-center px-5`}>
          <View style={tw`bg-vault-card w-full max-w-md rounded-2xl p-6 border border-vault-border`}>
            {/* Modal Header */}
            <View style={tw`flex-row items-center justify-between mb-5`}>
              <View style={tw`flex-row items-center`}>
                <View style={tw`w-9 h-9 rounded-xl bg-accent-warning/15 items-center justify-center mr-3`}>
                  <Ionicons name="lock-open-outline" size={20} color={tw.color('accent-warning')} />
                </View>
                <Text style={tw`text-txt-primary text-lg font-bold`}>Unlock Folder</Text>
              </View>
              <TouchableOpacity onPress={() => setUnlockModalVisible(false)}>
                <Ionicons name="close" size={24} color={tw.color('txt-muted')} />
              </TouchableOpacity>
            </View>

            {/* Folder Name */}
            {selectedFolder && (
              <View style={tw`bg-vault-surface rounded-xl px-4 py-3 mb-4 flex-row items-center border border-vault-border`}>
                <Ionicons name="folder" size={20} color={tw.color('accent-primary')} />
                <Text style={tw`text-txt-primary font-semibold text-base ml-2`} numberOfLines={1}>
                  {selectedFolder.name}
                </Text>
              </View>
            )}

            {/* Password Input */}
            <Text style={tw`text-txt-secondary text-sm font-medium mb-1.5`}>Password</Text>
            <TextInput
              style={tw`bg-vault-surface border border-vault-border rounded-xl px-4 py-3 text-txt-primary text-base mb-5`}
              placeholder="Enter folder password"
              placeholderTextColor={tw.color('txt-dim')}
              value={unlockPassword}
              onChangeText={setUnlockPassword}
              secureTextEntry
              autoFocus
            />

            {/* Unlock Button */}
            <TouchableOpacity
              style={tw`bg-accent-warning py-3.5 rounded-xl items-center flex-row justify-center ${
                unlocking ? 'opacity-60' : ''
              }`}
              onPress={handleUnlockFolder}
              disabled={unlocking}
              activeOpacity={0.8}
            >
              {unlocking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="lock-open" size={18} color="#fff" />
                  <Text style={tw`text-white font-bold text-base ml-2`}>Unlock</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default VaultFoldersView;
