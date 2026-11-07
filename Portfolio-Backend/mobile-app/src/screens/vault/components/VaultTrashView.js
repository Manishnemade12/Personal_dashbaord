import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../../../utils/tw';
import { vaultApi } from '../../../services/vault/vaultApi';

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1);
  return `${size} ${units[i]}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
    }
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const getMimeIcon = (mimeType) => {
  if (!mimeType) return 'document-outline';
  if (mimeType.startsWith('image/')) return 'image-outline';
  if (mimeType.startsWith('video/')) return 'videocam-outline';
  if (mimeType.startsWith('audio/')) return 'musical-notes-outline';
  if (mimeType.includes('pdf')) return 'document-text-outline';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar'))
    return 'archive-outline';
  if (mimeType.includes('text')) return 'document-text-outline';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
    return 'grid-outline';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
    return 'easel-outline';
  return 'document-outline';
};

const getMimeColor = (mimeType) => {
  if (!mimeType) return '#94a3b8';
  if (mimeType.startsWith('image/')) return '#6366f1';
  if (mimeType.startsWith('video/')) return '#8b5cf6';
  if (mimeType.startsWith('audio/')) return '#f59e0b';
  if (mimeType.includes('pdf')) return '#f43f5e';
  return '#3b82f6';
};

export default function VaultTrashView({ username, onBack }) {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  const loadTrash = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await vaultApi.getTrashItems(username);
      const data = res?.data || res || {};
      setFolders(data.folders || []);
      setFiles(data.files || []);
      setTotalItems(data.totalItems ?? ((data.folders?.length || 0) + (data.files?.length || 0)));
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load trash items.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [username]);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const setItemLoading = (key, value) => {
    setActionLoading((prev) => ({ ...prev, [key]: value }));
  };

  // ── Folder actions ──────────────────────────────────────────────
  const handleRestoreFolder = async (folderId) => {
    const key = `restore-folder-${folderId}`;
    try {
      setItemLoading(key, true);
      await vaultApi.restoreFolder(username, folderId);
      await loadTrash();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to restore folder.');
    } finally {
      setItemLoading(key, false);
    }
  };

  const handleDeleteFolder = (folderId, folderName) => {
    Alert.alert(
      'Permanently Delete',
      `Are you sure you want to permanently delete "${folderName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            const key = `delete-folder-${folderId}`;
            try {
              setItemLoading(key, true);
              await vaultApi.permanentDeleteFolder(username, folderId);
              await loadTrash();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete folder.');
            } finally {
              setItemLoading(key, false);
            }
          },
        },
      ],
    );
  };

  // ── File actions ────────────────────────────────────────────────
  const handleRestoreFile = async (fileId) => {
    const key = `restore-file-${fileId}`;
    try {
      setItemLoading(key, true);
      await vaultApi.restoreFile(username, fileId);
      await loadTrash();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to restore file.');
    } finally {
      setItemLoading(key, false);
    }
  };

  const handleDeleteFile = (fileId, fileName) => {
    Alert.alert(
      'Permanently Delete',
      `Are you sure you want to permanently delete "${fileName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            const key = `delete-file-${fileId}`;
            try {
              setItemLoading(key, true);
              await vaultApi.permanentDeleteFile(username, fileId);
              await loadTrash();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete file.');
            } finally {
              setItemLoading(key, false);
            }
          },
        },
      ],
    );
  };

  // ── Empty state ─────────────────────────────────────────────────
  const renderEmptyState = () => (
    <View style={tw`flex-1 items-center justify-center py-24 px-6`}>
      <View
        style={tw`w-20 h-20 rounded-full bg-vault-card items-center justify-center mb-5`}
      >
        <Ionicons name="trash-outline" size={36} color="#64748b" />
      </View>
      <Text style={tw`text-txt-secondary text-lg font-semibold mb-2`}>
        Trash is Empty
      </Text>
      <Text style={tw`text-txt-dim text-sm text-center`}>
        Items you delete will appear here for recovery.
      </Text>
    </View>
  );

  // ── Folder card ─────────────────────────────────────────────────
  const renderFolderCard = (folder) => {
    const folderId = folder._id || folder.id;
    const restoreKey = `restore-folder-${folderId}`;
    const deleteKey = `delete-folder-${folderId}`;

    return (
      <View
        key={folderId}
        style={tw`bg-vault-card border border-vault-border rounded-xl p-4 mb-3`}
      >
        {/* Top row */}
        <View style={tw`flex-row items-center mb-3`}>
          <View
            style={tw`w-10 h-10 rounded-lg bg-vault-surface items-center justify-center mr-3`}
          >
            <Ionicons name="folder-outline" size={22} color="#f59e0b" />
          </View>
          <View style={tw`flex-1`}>
            <Text
              style={tw`text-txt-primary text-sm font-semibold`}
              numberOfLines={1}
            >
              {folder.name || 'Untitled Folder'}
            </Text>
            <View style={tw`flex-row items-center mt-0.5`}>
              <Ionicons name="documents-outline" size={12} color="#94a3b8" />
              <Text style={tw`text-txt-muted text-xs ml-1`}>
                {folder.fileCount ?? folder.files?.length ?? 0} files
              </Text>
              <Text style={tw`text-txt-dim text-xs mx-1.5`}>•</Text>
              <Ionicons name="time-outline" size={12} color="#94a3b8" />
              <Text style={tw`text-txt-muted text-xs ml-1`}>
                {formatDate(folder.trashedAt || folder.deletedAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View style={tw`flex-row gap-2`}>
          <TouchableOpacity
            style={tw`flex-1 flex-row items-center justify-center bg-accent-primary/15 rounded-lg py-2.5`}
            onPress={() => handleRestoreFolder(folderId)}
            disabled={!!actionLoading[restoreKey]}
          >
            {actionLoading[restoreKey] ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              <>
                <Ionicons name="arrow-undo-outline" size={16} color="#6366f1" />
                <Text style={tw`text-accent-primary text-xs font-semibold ml-1.5`}>
                  Restore
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`flex-1 flex-row items-center justify-center bg-accent-danger/15 rounded-lg py-2.5`}
            onPress={() => handleDeleteFolder(folderId, folder.name)}
            disabled={!!actionLoading[deleteKey]}
          >
            {actionLoading[deleteKey] ? (
              <ActivityIndicator size="small" color="#f43f5e" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={16} color="#f43f5e" />
                <Text style={tw`text-accent-danger text-xs font-semibold ml-1.5`}>
                  Delete Forever
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── File card ───────────────────────────────────────────────────
  const renderFileCard = (file) => {
    const fileId = file._id || file.id;
    const restoreKey = `restore-file-${fileId}`;
    const deleteKey = `delete-file-${fileId}`;
    const mimeIcon = getMimeIcon(file.mimeType || file.contentType);
    const mimeColor = getMimeColor(file.mimeType || file.contentType);

    return (
      <View
        key={fileId}
        style={tw`bg-vault-card border border-vault-border rounded-xl p-4 mb-3`}
      >
        {/* Top row */}
        <View style={tw`flex-row items-center mb-3`}>
          <View
            style={[
              tw`w-10 h-10 rounded-lg items-center justify-center mr-3`,
              { backgroundColor: `${mimeColor}20` },
            ]}
          >
            <Ionicons name={mimeIcon} size={22} color={mimeColor} />
          </View>
          <View style={tw`flex-1`}>
            <Text
              style={tw`text-txt-primary text-sm font-semibold`}
              numberOfLines={1}
            >
              {file.originalName || file.filename || 'Untitled File'}
            </Text>
            <View style={tw`flex-row items-center flex-wrap mt-0.5`}>
              <Text style={tw`text-txt-muted text-xs`}>
                {formatFileSize(file.size || file.fileSize)}
              </Text>
              {(file.folderName || file.parentFolder) ? (
                <>
                  <Text style={tw`text-txt-dim text-xs mx-1.5`}>•</Text>
                  <Ionicons name="folder-outline" size={11} color="#94a3b8" />
                  <Text style={tw`text-txt-muted text-xs ml-0.5`} numberOfLines={1}>
                    {file.folderName || file.parentFolder}
                  </Text>
                </>
              ) : null}
              <Text style={tw`text-txt-dim text-xs mx-1.5`}>•</Text>
              <Ionicons name="time-outline" size={11} color="#94a3b8" />
              <Text style={tw`text-txt-muted text-xs ml-0.5`}>
                {formatDate(file.trashedAt || file.deletedAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View style={tw`flex-row gap-2`}>
          <TouchableOpacity
            style={tw`flex-1 flex-row items-center justify-center bg-accent-primary/15 rounded-lg py-2.5`}
            onPress={() => handleRestoreFile(fileId)}
            disabled={!!actionLoading[restoreKey]}
          >
            {actionLoading[restoreKey] ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              <>
                <Ionicons name="arrow-undo-outline" size={16} color="#6366f1" />
                <Text style={tw`text-accent-primary text-xs font-semibold ml-1.5`}>
                  Restore
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`flex-1 flex-row items-center justify-center bg-accent-danger/15 rounded-lg py-2.5`}
            onPress={() =>
              handleDeleteFile(fileId, file.originalName || file.filename)
            }
            disabled={!!actionLoading[deleteKey]}
          >
            {actionLoading[deleteKey] ? (
              <ActivityIndicator size="small" color="#f43f5e" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={16} color="#f43f5e" />
                <Text style={tw`text-accent-danger text-xs font-semibold ml-1.5`}>
                  Delete Forever
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Main render ─────────────────────────────────────────────────
  const isEmpty = folders.length === 0 && files.length === 0;

  return (
    <View style={tw`flex-1 bg-vault-bg`}>
      {/* Header */}
      <View
        style={tw`flex-row items-center px-4 pt-4 pb-3 border-b border-vault-border`}
      >
        <TouchableOpacity
          onPress={onBack}
          style={tw`w-9 h-9 rounded-full bg-vault-card items-center justify-center mr-3`}
        >
          <Ionicons name="arrow-back" size={20} color="#f8fafc" />
        </TouchableOpacity>

        <View style={tw`flex-1 flex-row items-center`}>
          <Ionicons name="trash-outline" size={20} color="#f43f5e" />
          <Text style={tw`text-txt-primary text-lg font-bold ml-2`}>Trash</Text>
          {totalItems > 0 && (
            <View
              style={tw`bg-accent-danger/20 rounded-full px-2.5 py-0.5 ml-2.5`}
            >
              <Text style={tw`text-accent-danger text-xs font-bold`}>
                {totalItems}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => loadTrash(true)}
          style={tw`w-9 h-9 rounded-full bg-vault-card items-center justify-center`}
        >
          <Ionicons name="refresh-outline" size={18} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={tw`text-txt-muted text-sm mt-3`}>Loading trash…</Text>
        </View>
      ) : isEmpty ? (
        renderEmptyState()
      ) : (
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-4 pt-4 pb-8`}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadTrash(true)}
              tintColor="#6366f1"
              colors={['#6366f1']}
            />
          }
        >
          {/* Trashed Folders */}
          {folders.length > 0 && (
            <View style={tw`mb-5`}>
              <View style={tw`flex-row items-center mb-3`}>
                <Ionicons name="folder-outline" size={16} color="#f59e0b" />
                <Text style={tw`text-txt-secondary text-xs font-bold uppercase tracking-wide ml-1.5`}>
                  Trashed Folders
                </Text>
                <View
                  style={tw`bg-vault-surface rounded-full px-2 py-0.5 ml-2`}
                >
                  <Text style={tw`text-txt-muted text-xs`}>
                    {folders.length}
                  </Text>
                </View>
              </View>
              {folders.map(renderFolderCard)}
            </View>
          )}

          {/* Trashed Files */}
          {files.length > 0 && (
            <View style={tw`mb-5`}>
              <View style={tw`flex-row items-center mb-3`}>
                <Ionicons name="document-outline" size={16} color="#3b82f6" />
                <Text style={tw`text-txt-secondary text-xs font-bold uppercase tracking-wide ml-1.5`}>
                  Trashed Files
                </Text>
                <View
                  style={tw`bg-vault-surface rounded-full px-2 py-0.5 ml-2`}
                >
                  <Text style={tw`text-txt-muted text-xs`}>
                    {files.length}
                  </Text>
                </View>
              </View>
              {files.map(renderFileCard)}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
