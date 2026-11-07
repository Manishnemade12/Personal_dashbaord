import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../../../utils/tw';
import { vaultApi } from '../../../services/vault/vaultApi';

/* ───── Helpers ───── */

function formatBytes(bytes) {
  if (bytes == null || isNaN(bytes)) return '0 B';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const idx = Math.min(i, units.length - 1);
  const value = bytes / Math.pow(1024, idx);
  return `${value < 10 ? value.toFixed(2) : value < 100 ? value.toFixed(1) : Math.round(value)} ${units[idx]}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${month} ${day}, ${year} · ${h12}:${mins} ${ampm}`;
}

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getFileIcon(mimeType) {
  if (!mimeType) return { name: 'document-outline', color: '#94a3b8' };
  if (mimeType.startsWith('image/')) return { name: 'image-outline', color: '#6366f1' };
  if (mimeType.startsWith('video/')) return { name: 'videocam-outline', color: '#f43f5e' };
  if (mimeType.startsWith('audio/')) return { name: 'musical-notes-outline', color: '#f59e0b' };
  if (mimeType.includes('pdf')) return { name: 'document-text-outline', color: '#ef4444' };
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('gzip') || mimeType.includes('compress') || mimeType.includes('archive'))
    return { name: 'archive-outline', color: '#f59e0b' };
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv'))
    return { name: 'grid-outline', color: '#10b981' };
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
    return { name: 'easel-outline', color: '#f97316' };
  if (mimeType.includes('word') || mimeType.includes('document') || mimeType.startsWith('text/'))
    return { name: 'document-text-outline', color: '#3b82f6' };
  if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('xml'))
    return { name: 'code-slash-outline', color: '#8b5cf6' };
  return { name: 'document-outline', color: '#94a3b8' };
}

/* ───── Component ───── */

export default function VaultFolderFilesView({
  folder,
  unlockToken,
  derivedKey,
  expiresIn,
  onBack,
  onLock,
}) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(expiresIn || 300);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteModal, setDeleteModal] = useState(null); // file obj or null
  const [deleting, setDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [lockingFolder, setLockingFolder] = useState(false);

  const fileInputRef = useRef(null);
  const countdownRef = useRef(null);

  const folderId = folder?.id || folder?._id;

  /* ── Load files ── */
  const loadFiles = useCallback(async () => {
    if (!folderId) return;
    setLoading(true);
    setError('');
    try {
      const res = await vaultApi.getFilesInFolder(folderId, unlockToken);
      if (res.ok) {
        setFiles(res.data?.files || res.data || []);
      } else {
        setError(res.data?.error || 'Failed to load files');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [folderId, unlockToken]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  /* ── Countdown timer ── */
  useEffect(() => {
    setCountdown(expiresIn || 300);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          handleLock(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresIn]);

  /* ── Lock folder ── */
  const handleLock = async (isAuto = false) => {
    setLockingFolder(true);
    try {
      if (folderId) await vaultApi.lockFolder(folderId, unlockToken);
    } catch (_) {
      // silent – folder may already be locked
    } finally {
      setLockingFolder(false);
      clearInterval(countdownRef.current);
      onLock?.();
    }
  };

  /* ── Upload (web) ── */
  const handleUploadPress = () => {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file || !folderId) return;

    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress since fetch doesn't support progress natively
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const res = await vaultApi.uploadFileFormData(folderId, formData, unlockToken);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (res.ok) {
        await loadFiles();
      } else {
        setError(res.data?.error || 'Upload failed');
      }
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset the file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /* ── Download ── */
  const handleDownload = async (file) => {
    const fileId = file.id || file._id;
    if (!folderId || !fileId) return;
    setDownloadingId(fileId);
    setError('');
    try {
      const res = await vaultApi.getDownloadToken(folderId, fileId, unlockToken);
      if (!res.ok) {
        setError(res.data?.error || 'Failed to get download token');
        return;
      }

      const downloadToken = res.data.downloadToken || res.data.token || unlockToken;
      const baseUrl = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_VAULT_API_URL) || 'http://localhost:3000';
      const downloadUrl = `${baseUrl.replace(/\/+$/, '')}/folders/${folderId}/files/${fileId}/download?token=${downloadToken}`;

      if (Platform.OS === 'web') {
        window.open(downloadUrl, '_blank');
      }
    } catch (err) {
      setError(err.message || 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    setError('');
    try {
      const fileId = deleteModal.id || deleteModal._id;
      const res = await vaultApi.deleteFile(fileId, unlockToken);
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => (f.id || f._id) !== fileId));
        setDeleteModal(null);
      } else {
        setError(res.data?.error || 'Delete failed');
      }
    } catch (err) {
      setError(err.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  /* ── Countdown color ── */
  const countdownColor =
    countdown <= 30 ? '#f43f5e' : countdown <= 60 ? '#f59e0b' : '#10b981';

  /* ──────────── Render ──────────── */
  return (
    <View style={tw`flex-1 bg-vault-bg`}>
      {/* ── Header ── */}
      <View style={tw`flex-row items-center justify-between px-4 pt-4 pb-3`}>
        <View style={tw`flex-row items-center flex-1 mr-3`}>
          <TouchableOpacity
            onPress={onBack}
            style={tw`p-2 rounded-full bg-vault-card mr-3`}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color="#f8fafc" />
          </TouchableOpacity>
          <View style={tw`flex-1`}>
            <Text
              style={tw`text-txt-primary text-lg font-bold`}
              numberOfLines={1}
            >
              {folder.name || 'Folder'}
            </Text>
            <View style={tw`flex-row items-center mt-0.5`}>
              <Ionicons name="time-outline" size={13} color={countdownColor} />
              <Text style={[tw`text-xs ml-1 font-medium`, { color: countdownColor }]}>
                {formatCountdown(countdown)}
              </Text>
              <Text style={tw`text-txt-dim text-xs ml-1`}>remaining</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => handleLock(false)}
          disabled={lockingFolder}
          style={tw`flex-row items-center px-3 py-2 rounded-lg bg-accent-danger/15`}
        >
          {lockingFolder ? (
            <ActivityIndicator size="small" color="#f43f5e" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={16} color="#f43f5e" />
              <Text style={tw`text-accent-danger text-sm font-semibold ml-1.5`}>
                Lock
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Error banner ── */}
      {error ? (
        <View style={tw`mx-4 mb-2 p-3 rounded-lg bg-accent-danger/15 flex-row items-center`}>
          <Ionicons name="alert-circle" size={18} color="#f43f5e" />
          <Text style={tw`text-accent-danger text-sm ml-2 flex-1`}>{error}</Text>
          <TouchableOpacity onPress={() => setError('')}>
            <Ionicons name="close" size={18} color="#f43f5e" />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── Upload progress ── */}
      {uploading && (
        <View style={tw`mx-4 mb-2 p-3 rounded-lg bg-vault-card`}>
          <View style={tw`flex-row items-center mb-2`}>
            <ActivityIndicator size="small" color="#6366f1" />
            <Text style={tw`text-txt-secondary text-sm ml-2`}>
              Uploading… {uploadProgress}%
            </Text>
          </View>
          <View style={tw`h-1.5 rounded-full bg-vault-border overflow-hidden`}>
            <View
              style={[
                tw`h-1.5 rounded-full bg-accent-primary`,
                { width: `${uploadProgress}%` },
              ]}
            />
          </View>
        </View>
      )}

      {/* ── File list ── */}
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-4 pb-28`}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={tw`items-center justify-center py-20`}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={tw`text-txt-muted text-sm mt-3`}>Loading files…</Text>
          </View>
        ) : files.length === 0 ? (
          /* ── Empty state ── */
          <View style={tw`items-center justify-center py-20 px-6`}>
            <View style={tw`w-20 h-20 rounded-full bg-vault-card items-center justify-center mb-4`}>
              <Ionicons name="cloud-upload-outline" size={40} color="#64748b" />
            </View>
            <Text style={tw`text-txt-secondary text-base font-semibold text-center mb-2`}>
              No files in this folder
            </Text>
            <Text style={tw`text-txt-dim text-sm text-center`}>
              Upload your first encrypted file.
            </Text>
          </View>
        ) : (
          files.map((file) => {
            const fid = file.id || file._id;
            const icon = getFileIcon(file.mimeType || file.contentType);
            const isDownloading = downloadingId === fid;
            return (
              <View
                key={fid}
                style={tw`bg-vault-card rounded-xl p-4 mb-3 border border-vault-border`}
              >
                <View style={tw`flex-row items-center`}>
                  {/* Icon */}
                  <View
                    style={[
                      tw`w-11 h-11 rounded-lg items-center justify-center mr-3`,
                      { backgroundColor: icon.color + '20' },
                    ]}
                  >
                    <Ionicons name={icon.name} size={22} color={icon.color} />
                  </View>

                  {/* File info */}
                  <View style={tw`flex-1 mr-2`}>
                    <Text
                      style={tw`text-txt-primary text-sm font-semibold`}
                      numberOfLines={1}
                    >
                      {file.originalName || file.filename || 'Untitled'}
                    </Text>
                    <View style={tw`flex-row items-center mt-1`}>
                      <Text style={tw`text-txt-dim text-xs`}>
                        {formatBytes(file.size || file.fileSize)}
                      </Text>
                      {(file.createdAt || file.uploadedAt) ? (
                        <>
                          <Text style={tw`text-txt-dim text-xs mx-1`}>·</Text>
                          <Text style={tw`text-txt-dim text-xs`}>
                            {formatDate(file.createdAt || file.uploadedAt)}
                          </Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* Action buttons */}
                <View style={tw`flex-row mt-3 pt-3 border-t border-vault-border`}>
                  <TouchableOpacity
                    onPress={() => handleDownload(file)}
                    disabled={isDownloading}
                    style={tw`flex-row items-center flex-1 justify-center py-2 rounded-lg bg-accent-primary/15 mr-2`}
                  >
                    {isDownloading ? (
                      <ActivityIndicator size="small" color="#6366f1" />
                    ) : (
                      <>
                        <Ionicons name="download-outline" size={16} color="#6366f1" />
                        <Text style={tw`text-accent-primary text-sm font-medium ml-1.5`}>
                          Download
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setDeleteModal(file)}
                    style={tw`flex-row items-center flex-1 justify-center py-2 rounded-lg bg-accent-danger/15`}
                  >
                    <Ionicons name="trash-outline" size={16} color="#f43f5e" />
                    <Text style={tw`text-accent-danger text-sm font-medium ml-1.5`}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Upload FAB ── */}
      <View style={tw`absolute bottom-6 right-5`}>
        <TouchableOpacity
          onPress={handleUploadPress}
          disabled={uploading}
          style={tw`w-14 h-14 rounded-full bg-accent-primary items-center justify-center shadow-lg`}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="add" size={28} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Hidden file input (web only) ── */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileSelected}
        />
      )}

      {/* ── Delete confirmation modal ── */}
      <Modal
        visible={!!deleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setDeleteModal(null)}
      >
        <View style={tw`flex-1 bg-black/60 items-center justify-center px-6`}>
          <View style={tw`bg-vault-card rounded-2xl p-6 w-full max-w-sm border border-vault-border`}>
            <View style={tw`w-14 h-14 rounded-full bg-accent-danger/15 items-center justify-center self-center mb-4`}>
              <Ionicons name="trash" size={28} color="#f43f5e" />
            </View>
            <Text style={tw`text-txt-primary text-lg font-bold text-center mb-2`}>
              Delete File?
            </Text>
            <Text style={tw`text-txt-secondary text-sm text-center mb-1`}>
              This will permanently delete
            </Text>
            <Text
              style={tw`text-txt-primary text-sm font-semibold text-center mb-5`}
              numberOfLines={2}
            >
              "{deleteModal?.originalName || deleteModal?.filename || 'this file'}"
            </Text>

            <View style={tw`flex-row`}>
              <TouchableOpacity
                onPress={() => setDeleteModal(null)}
                disabled={deleting}
                style={tw`flex-1 py-3 rounded-xl bg-vault-surface items-center mr-2`}
              >
                <Text style={tw`text-txt-secondary text-sm font-semibold`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                disabled={deleting}
                style={tw`flex-1 py-3 rounded-xl bg-accent-danger items-center ml-2`}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={tw`text-white text-sm font-semibold`}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
