import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Platform,
  Image,
  Dimensions,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../../../utils/tw';
import { vaultApi, getAuthToken, getBaseUrl } from '../../../services/vault/vaultApi';
import { vaultCrypto } from '../../../services/vault/vaultCrypto';

function formatBytes(bytes) {
  if (bytes == null || isNaN(bytes)) return '0 B';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const idx = Math.min(i, units.length - 1);
  const value = bytes / Math.pow(1024, idx);
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[idx]}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function isImageFile(file) {
  const name = file?.originalName || '';
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const mime = (file?.mimeType || '').toLowerCase();
  return (
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext) ||
    mime.startsWith('image/')
  );
}

function isVideoFile(file) {
  const name = file?.originalName || '';
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const mime = (file?.mimeType || '').toLowerCase();
  return ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext) || mime.startsWith('video/');
}

function getFileBadge(file) {
  const ext = (file?.originalName || '').split('.').pop()?.toUpperCase() || 'FILE';
  if (isImageFile(file)) return { label: ext, color: '#6366f1', bg: 'rgba(99,102,241,0.15)' };
  if (isVideoFile(file)) return { label: ext, color: '#f43f5e', bg: 'rgba(244,63,94,0.15)' };
  if (file?.mimeType?.includes('pdf')) return { label: 'PDF', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
  if (file?.mimeType?.includes('zip') || file?.mimeType?.includes('archive'))
    return { label: 'ZIP', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
  return { label: ext.slice(0, 4), color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' };
}

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
  const [countdown, setCountdown] = useState(expiresIn || 900);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Decrypted thumbnails cache: { [fileId]: objectUrl }
  const [thumbnails, setThumbnails] = useState({});
  const [loadingThumbs, setLoadingThumbs] = useState({});

  // Lightbox / Image Viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });

  // Upload & Delete
  const [uploading, setUploading] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const fileInputRef = useRef(null);
  const countdownRef = useRef(null);
  const thumbnailsRef = useRef({});

  // Synchronize ref for cleanup
  useEffect(() => {
    thumbnailsRef.current = thumbnails;
  }, [thumbnails]);

  useEffect(() => {
    return () => {
      Object.values(thumbnailsRef.current).forEach((url) => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(url);
          } catch (_) {}
        }
      });
    };
  }, []);

  /* ── Load files ── */
  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await vaultApi.getFilesInFolder(folder.id || folder._id, unlockToken);
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
  }, [folder.id, folder._id, unlockToken]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  /* ── Auto-lock timer ── */
  useEffect(() => {
    setCountdown(expiresIn || 300); // 5 minutes default
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
  }, [expiresIn]);

  const handleLock = async () => {
    try {
      await vaultApi.lockFolder(folder.id || folder._id, unlockToken);
    } catch (_) {}
    clearInterval(countdownRef.current);
    onLock?.();
  };

  /* ── Background Concurrent Decrypt Thumbnails for Images ── */
  useEffect(() => {
    if (!files || files.length === 0 || !unlockToken || !derivedKey) return;
    if (Platform.OS !== 'web') return;

    let cancelled = false;
    const authToken = getAuthToken();
    const baseUrl = getBaseUrl();
    const folderId = folder.id || folder._id;

    const decryptSingleImage = async (file) => {
      const fid = file.id || file._id;
      if (thumbnailsRef.current[fid]) return; // already decrypted

      try {
        setLoadingThumbs((prev) => ({ ...prev, [fid]: true }));
        const url = `${baseUrl}/folders/${folderId}/files/${fid}/raw`;
        const resp = await fetch(url, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'x-folder-token': unlockToken,
          },
        });

        if (!resp.ok) {
          setLoadingThumbs((prev) => ({ ...prev, [fid]: false }));
          return;
        }

        const encBuffer = await resp.arrayBuffer();
        if (cancelled) return;

        const plainBuffer = await vaultCrypto.decryptBuffer(
          encBuffer,
          derivedKey,
          file.iv,
          file.authTag,
        );

        if (cancelled) return;

        const blob = new Blob([plainBuffer], { type: file.mimeType || 'image/jpeg' });
        const blobUrl = URL.createObjectURL(blob);

        setThumbnails((prev) => ({ ...prev, [fid]: blobUrl }));
      } catch (e) {
        // Ignore single image failure
      } finally {
        setLoadingThumbs((prev) => ({ ...prev, [fid]: false }));
      }
    };

    const decryptAllThumbnails = async () => {
      const imageFilesList = files.filter((f) => isImageFile(f) && !thumbnailsRef.current[f.id || f._id]);
      if (imageFilesList.length === 0) return;

      // Parallel batch execution with chunk size of 6 concurrent requests
      const CHUNK_SIZE = 6;
      for (let i = 0; i < imageFilesList.length; i += CHUNK_SIZE) {
        if (cancelled) break;
        const chunk = imageFilesList.slice(i, i + CHUNK_SIZE);
        await Promise.allSettled(chunk.map((f) => decryptSingleImage(f)));
      }
    };

    decryptAllThumbnails();

    return () => {
      cancelled = true;
    };
  }, [files, unlockToken, derivedKey, folder.id, folder._id]);

  /* ── Filter images for viewer ── */
  const imageFiles = useMemo(() => files.filter(isImageFile), [files]);

  const openLightbox = (file) => {
    const idx = imageFiles.findIndex((f) => (f.id || f._id) === (file.id || file._id));
    if (idx !== -1) {
      setViewerIndex(idx);
      setZoomScale(1);
      setPanPosition({ x: 0, y: 0 });
      setViewerOpen(true);
    }
  };

  // Keyboard navigation & Esc in Lightbox
  useEffect(() => {
    if (!viewerOpen || Platform.OS !== 'web') return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        setViewerIndex((prev) => Math.min(imageFiles.length - 1, prev + 1));
        setZoomScale(1);
        setPanPosition({ x: 0, y: 0 });
      } else if (e.key === 'ArrowLeft') {
        setViewerIndex((prev) => Math.max(0, prev - 1));
        setZoomScale(1);
        setPanPosition({ x: 0, y: 0 });
      } else if (e.key === 'Escape') {
        setViewerOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewerOpen, imageFiles.length]);

  // Touch Swipe & Drag PanResponder for Lightbox
  const panResponder = useMemo(() => {
    let startX = 0;
    let startY = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: (_, gestureState) => {
        startX = gestureState.x0;
        startY = gestureState.y0;
      },
      onPanResponderMove: (_, gestureState) => {
        if (zoomScale > 1) {
          // Pan when zoomed in
          setPanPosition((prev) => ({
            x: prev.x + gestureState.vx * 15,
            y: prev.y + gestureState.vy * 15,
          }));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (zoomScale <= 1) {
          // Horizontal swipe threshold: 40px
          if (gestureState.dx < -40) {
            // Swipe Left -> Next
            setViewerIndex((prev) => Math.min(imageFiles.length - 1, prev + 1));
            setZoomScale(1);
            setPanPosition({ x: 0, y: 0 });
          } else if (gestureState.dx > 40) {
            // Swipe Right -> Prev
            setViewerIndex((prev) => Math.max(0, prev - 1));
            setZoomScale(1);
            setPanPosition({ x: 0, y: 0 });
          }
        }
      },
    });
  }, [zoomScale, imageFiles.length]);

  /* ── Download ── */
  const handleDownload = async (file) => {
    const fid = file.id || file._id;
    const folderId = folder.id || folder._id;
    setDownloadingId(fid);
    try {
      const thumbUrl = thumbnails[fid];
      if (Platform.OS === 'web' && thumbUrl) {
        const a = document.createElement('a');
        a.href = thumbUrl;
        a.download = file.originalName || 'file';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      // Download via token
      const res = await vaultApi.getDownloadToken(folderId, fid, unlockToken);
      if (res.ok) {
        const token = res.data?.downloadToken || res.data?.token || unlockToken;
        const baseUrl = getBaseUrl();
        const url = `${baseUrl}/folders/${folderId}/files/${fid}/download?token=${token}&download=1`;
        if (Platform.OS === 'web') {
          window.open(url, '_blank');
        }
      }
    } catch (_) {
      setError('Download failed.');
    } finally {
      setDownloadingId(null);
    }
  };

  /* ── Delete ── */
  const confirmDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    const fid = deleteModal.id || deleteModal._id;
    try {
      const res = await vaultApi.deleteFile(fid, unlockToken);
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => (f.id || f._id) !== fid));
        setDeleteModal(null);
      } else {
        setError(res.data?.error || 'Failed to delete file.');
      }
    } catch (e) {
      setError(e.message || 'Error deleting file.');
    } finally {
      setDeleting(false);
    }
  };

  /* ── Upload ── */
  const handleUploadPress = () => {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const picked = e?.target?.files?.[0];
    if (!picked) return;
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', picked);

      const res = await vaultApi.uploadFileFormData(folder.id || folder._id, formData, unlockToken);
      if (res.ok) {
        await loadFiles();
      } else {
        setError(res.data?.error || res.data?.message || 'Upload failed.');
      }
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const currentViewerImage = imageFiles[viewerIndex] || null;
  const currentViewerUrl = currentViewerImage ? thumbnails[currentViewerImage.id || currentViewerImage._id] : null;

  return (
    <View style={tw`flex-1 bg-vault-bg`}>
      {/* Hidden file input for web */}
      {Platform.OS === 'web' && (
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      )}

      {/* ── Top Bar ── */}
      <View style={tw`flex-row items-center justify-between px-4 py-3 border-b border-vault-border bg-vault-card`}>
        <View style={tw`flex-row items-center flex-1 mr-2`}>
          <TouchableOpacity
            onPress={onBack}
            style={tw`p-1.5 rounded-lg bg-vault-surface border border-vault-border mr-2.5`}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color="#94a3b8" />
          </TouchableOpacity>
          <View>
            <Text style={tw`text-txt-primary text-base font-bold`} numberOfLines={1}>
              {folder.name || 'Folder'}
            </Text>
            <View style={tw`flex-row items-center gap-1.5 mt-0.5`}>
              <Ionicons name="time-outline" size={12} color="#10b981" />
              <Text style={tw`text-green-400 text-xs font-mono font-medium`}>
                {formatCountdown(countdown)} remaining
              </Text>
            </View>
          </View>
        </View>

        {/* View Toggle & Actions */}
        <View style={tw`flex-row items-center gap-2`}>
          {/* Grid / List toggle */}
          <View style={tw`flex-row bg-vault-surface rounded-lg border border-vault-border p-0.5`}>
            <TouchableOpacity
              onPress={() => setViewMode('grid')}
              style={tw`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-indigo-600' : ''}`}
            >
              <Ionicons name="grid-outline" size={14} color={viewMode === 'grid' ? '#ffffff' : '#94a3b8'} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode('list')}
              style={tw`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-indigo-600' : ''}`}
            >
              <Ionicons name="list-outline" size={14} color={viewMode === 'list' ? '#ffffff' : '#94a3b8'} />
            </TouchableOpacity>
          </View>

          {/* Upload Button */}
          <TouchableOpacity
            onPress={handleUploadPress}
            disabled={uploading}
            style={tw`flex-row items-center bg-indigo-600 px-3 py-1.5 rounded-lg gap-1.5`}
            activeOpacity={0.7}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={14} color="#ffffff" />
                <Text style={tw`text-white text-xs font-bold`}>Upload</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Lock Button */}
          <TouchableOpacity
            onPress={handleLock}
            style={tw`p-2 rounded-lg bg-red-950/40 border border-red-800/60`}
            activeOpacity={0.7}
            title="Lock Folder"
          >
            <Ionicons name="lock-closed" size={14} color="#f43f5e" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Error Banner ── */}
      {error ? (
        <View style={tw`mx-4 mt-3 p-3 rounded-xl bg-red-950/40 border border-red-800/80 flex-row items-center gap-2`}>
          <Ionicons name="alert-circle" size={16} color="#f43f5e" />
          <Text style={tw`text-red-300 text-xs flex-1`}>{error}</Text>
          <TouchableOpacity onPress={() => setError('')}>
            <Ionicons name="close" size={14} color="#f43f5e" />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── Content View ── */}
      {loading ? (
        <View style={tw`flex-1 items-center justify-center p-8`}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={tw`text-txt-muted text-xs mt-3`}>Decrypting folder contents...</Text>
        </View>
      ) : files.length === 0 ? (
        <View style={tw`flex-1 items-center justify-center p-8`}>
          <View style={tw`w-16 h-16 rounded-2xl bg-vault-card border border-vault-border items-center justify-center mb-3`}>
            <Ionicons name="images-outline" size={28} color="#64748b" />
          </View>
          <Text style={tw`text-txt-primary text-base font-bold mb-1`}>No files in this vault</Text>
          <Text style={tw`text-txt-muted text-xs text-center max-w-xs mb-4`}>
            Upload photos, documents, or media to protect them with end-to-end encryption.
          </Text>
          <TouchableOpacity
            onPress={handleUploadPress}
            style={tw`bg-indigo-600 px-4 py-2.5 rounded-xl flex-row items-center gap-2`}
          >
            <Ionicons name="cloud-upload" size={16} color="#ffffff" />
            <Text style={tw`text-white text-xs font-bold`}>Upload Files</Text>
          </TouchableOpacity>
        </View>
      ) : viewMode === 'grid' ? (
        /* ══════════════════════════════════════════════════════════════ */
        /* GALLERY / PHOTO GRID VIEW                                     */
        /* ══════════════════════════════════════════════════════════════ */
        <ScrollView contentContainerStyle={tw`p-3.5 pb-24`} showsVerticalScrollIndicator={false}>
          <View style={tw`flex-row flex-wrap -mx-1.5`}>
            {files.map((file) => {
              const fid = file.id || file._id;
              const isImg = isImageFile(file);
              const thumb = thumbnails[fid];
              const isThumbLoading = loadingThumbs[fid];
              const badge = getFileBadge(file);

              return (
                <View
                  key={fid}
                  style={[
                    tw`p-1.5`,
                    {
                      width:
                        Platform.OS === 'web' && typeof window !== 'undefined' && window.innerWidth >= 900
                          ? '25%'
                          : Platform.OS === 'web' && typeof window !== 'undefined' && window.innerWidth >= 600
                          ? '33.33%'
                          : '50%',
                    },
                  ]}
                >
                  <View
                    style={tw`bg-vault-card border border-vault-border rounded-xl overflow-hidden shadow-lg`}
                  >
                    {/* Thumbnail / Image Container */}
                    <TouchableOpacity
                      activeOpacity={isImg ? 0.85 : 0.95}
                      onPress={() => (isImg ? openLightbox(file) : handleDownload(file))}
                      style={[tw`w-full bg-vault-surface relative items-center justify-center`, { height: 135 }]}
                    >
                      {/* Badge in top left */}
                      <View
                        style={[
                          tw`absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded-md`,
                          { backgroundColor: badge.bg },
                        ]}
                      >
                        <Text style={[tw`text-[10px] font-bold`, { color: badge.color }]}>{badge.label}</Text>
                      </View>

                      {/* Image Preview / Icon fallback */}
                      {isImg && thumb ? (
                        <Image
                          source={{ uri: thumb }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      ) : isThumbLoading ? (
                        <View style={tw`items-center justify-center gap-1`}>
                          <ActivityIndicator size="small" color="#6366f1" />
                          <Text style={tw`text-txt-dim text-[10px]`}>Decrypting...</Text>
                        </View>
                      ) : (
                        <View style={tw`items-center justify-center p-4`}>
                          <Ionicons
                            name={isImg ? 'image-outline' : isVideoFile(file) ? 'videocam-outline' : 'document-outline'}
                            size={36}
                            color="#64748b"
                          />
                        </View>
                      )}

                      {/* Preview Overlay Icon for Images */}
                      {isImg && thumb ? (
                        <View style={tw`absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 items-center justify-center`}>
                          <View style={tw`p-2 rounded-full bg-black/60`}>
                            <Ionicons name="expand-outline" size={16} color="#ffffff" />
                          </View>
                        </View>
                      ) : null}
                    </TouchableOpacity>

                    {/* Metadata & Actions row */}
                    <View style={tw`p-2.5 bg-vault-card`}>
                      <Text
                        style={tw`text-txt-primary text-xs font-semibold`}
                        numberOfLines={1}
                        title={file.originalName}
                      >
                        {file.originalName}
                      </Text>

                      <View style={tw`flex-row items-center justify-between mt-1`}>
                        <Text style={tw`text-txt-dim text-[11px]`}>{formatBytes(file.sizeBytes)}</Text>
                        <Text style={tw`text-txt-dim text-[11px]`}>{formatDate(file.uploadedAt)}</Text>
                      </View>

                      {/* Action buttons (Clean, compact icon buttons) */}
                      <View style={tw`flex-row items-center justify-end gap-1.5 mt-2 pt-2 border-t border-vault-border`}>
                        {isImg ? (
                          <TouchableOpacity
                            onPress={() => openLightbox(file)}
                            style={tw`p-1.5 rounded-lg bg-vault-surface border border-vault-border`}
                            title="Preview"
                          >
                            <Ionicons name="eye-outline" size={13} color="#94a3b8" />
                          </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                          onPress={() => handleDownload(file)}
                          disabled={downloadingId === fid}
                          style={tw`p-1.5 rounded-lg bg-vault-surface border border-vault-border`}
                          title="Download"
                        >
                          {downloadingId === fid ? (
                            <ActivityIndicator size="small" color="#6366f1" />
                          ) : (
                            <Ionicons name="download-outline" size={13} color="#94a3b8" />
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => setDeleteModal(file)}
                          style={tw`p-1.5 rounded-lg bg-red-950/30 border border-red-900/50`}
                          title="Delete"
                        >
                          <Ionicons name="trash-outline" size={13} color="#f43f5e" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        /* ══════════════════════════════════════════════════════════════ */
        /* COMPACT LIST VIEW                                             */
        /* ══════════════════════════════════════════════════════════════ */
        <ScrollView contentContainerStyle={tw`p-4 pb-24`} showsVerticalScrollIndicator={false}>
          <View style={tw`bg-vault-card border border-vault-border rounded-xl divide-y divide-vault-border overflow-hidden`}>
            {files.map((file) => {
              const fid = file.id || file._id;
              const isImg = isImageFile(file);
              const thumb = thumbnails[fid];
              const badge = getFileBadge(file);

              return (
                <View key={fid} style={tw`flex-row items-center p-3 gap-3`}>
                  {/* Small 44x44 thumbnail or icon */}
                  <TouchableOpacity
                    onPress={() => (isImg ? openLightbox(file) : handleDownload(file))}
                    style={tw`w-11 h-11 rounded-lg bg-vault-surface border border-vault-border overflow-hidden items-center justify-center`}
                  >
                    {isImg && thumb ? (
                      <Image source={{ uri: thumb }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <Ionicons
                        name={isImg ? 'image' : isVideoFile(file) ? 'videocam' : 'document'}
                        size={20}
                        color={badge.color}
                      />
                    )}
                  </TouchableOpacity>

                  {/* Title and details */}
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-txt-primary text-xs font-semibold`} numberOfLines={1}>
                      {file.originalName}
                    </Text>
                    <View style={tw`flex-row items-center gap-2 mt-0.5`}>
                      <Text style={tw`text-txt-dim text-[11px]`}>{formatBytes(file.sizeBytes)}</Text>
                      <Text style={tw`text-txt-dim text-[11px]`}>•</Text>
                      <Text style={tw`text-txt-dim text-[11px]`}>{formatDate(file.uploadedAt)}</Text>
                    </View>
                  </View>

                  {/* Compact action buttons */}
                  <View style={tw`flex-row items-center gap-1.5`}>
                    {isImg ? (
                      <TouchableOpacity
                        onPress={() => openLightbox(file)}
                        style={tw`p-2 rounded-lg bg-vault-surface border border-vault-border`}
                      >
                        <Ionicons name="eye-outline" size={14} color="#94a3b8" />
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                      onPress={() => handleDownload(file)}
                      disabled={downloadingId === fid}
                      style={tw`p-2 rounded-lg bg-vault-surface border border-vault-border`}
                    >
                      {downloadingId === fid ? (
                        <ActivityIndicator size="small" color="#6366f1" />
                      ) : (
                        <Ionicons name="download-outline" size={14} color="#94a3b8" />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setDeleteModal(file)}
                      style={tw`p-2 rounded-lg bg-red-950/40 border border-red-900/60`}
                    >
                      <Ionicons name="trash-outline" size={14} color="#f43f5e" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* FULL-SCREEN IMAGE VIEWER / LIGHTBOX MODAL                      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => setViewerOpen(false)}>
        <View style={tw`flex-1 bg-black/95 justify-between`}>
          {/* Top Bar of Viewer */}
          <View style={tw`flex-row items-center justify-between p-4 z-20`}>
            <View style={tw`flex-1 mr-3`}>
              <Text style={tw`text-white text-sm font-bold`} numberOfLines={1}>
                {currentViewerImage?.originalName || 'Image'}
              </Text>
              <Text style={tw`text-gray-400 text-xs`}>
                {viewerIndex + 1} of {imageFiles.length} • {formatBytes(currentViewerImage?.sizeBytes)}
              </Text>
            </View>

            {/* Viewer action controls: Zoom in/out, Download, Close */}
            <View style={tw`flex-row items-center gap-2`}>
              <TouchableOpacity
                onPress={() => {
                  setZoomScale((prev) => Math.max(1, prev - 0.5));
                  if (zoomScale <= 1.5) setPanPosition({ x: 0, y: 0 });
                }}
                style={tw`p-2 rounded-lg bg-white/10`}
                title="Zoom Out"
              >
                <Ionicons name="remove-circle-outline" size={18} color="#ffffff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setZoomScale((prev) => (prev === 1 ? 2 : 1));
                  setPanPosition({ x: 0, y: 0 });
                }}
                style={tw`px-2.5 py-1.5 rounded-lg bg-white/10`}
                title="Toggle Zoom"
              >
                <Text style={tw`text-white text-xs font-bold`}>{zoomScale.toFixed(1)}x</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setZoomScale((prev) => Math.min(3.5, prev + 0.5));
                }}
                style={tw`p-2 rounded-lg bg-white/10`}
                title="Zoom In"
              >
                <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
              </TouchableOpacity>

              {currentViewerImage ? (
                <TouchableOpacity
                  onPress={() => handleDownload(currentViewerImage)}
                  style={tw`p-2 rounded-lg bg-white/10 ml-1`}
                  title="Download"
                >
                  <Ionicons name="download-outline" size={18} color="#ffffff" />
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                onPress={() => {
                  setViewerOpen(false);
                  setZoomScale(1);
                  setPanPosition({ x: 0, y: 0 });
                }}
                style={tw`p-2 rounded-lg bg-white/10`}
                title="Close"
              >
                <Ionicons name="close" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Central Image with PanResponder Swipe & Zoom Container */}
          <View
            style={tw`flex-1 items-center justify-center relative p-2 overflow-hidden`}
            {...panResponder.panHandlers}
          >
            {/* Prev button */}
            {imageFiles.length > 1 && viewerIndex > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setViewerIndex((prev) => Math.max(0, prev - 1));
                  setZoomScale(1);
                  setPanPosition({ x: 0, y: 0 });
                }}
                style={tw`absolute left-3 z-30 p-2.5 rounded-full bg-black/60 border border-white/20`}
              >
                <Ionicons name="chevron-back" size={22} color="#ffffff" />
              </TouchableOpacity>
            ) : null}

            {/* The Image with dynamic scale & pan */}
            {currentViewerUrl ? (
              <View
                style={{
                  width: '95%',
                  height: '85%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [
                    { scale: zoomScale },
                    { translateX: panPosition.x },
                    { translateY: panPosition.y },
                  ],
                }}
              >
                <Image
                  source={{ uri: currentViewerUrl }}
                  style={{
                    width: '100%',
                    height: '100%',
                    maxWidth: 1000,
                    maxHeight: Dimensions.get('window').height * 0.8,
                  }}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={tw`items-center justify-center p-8`}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={tw`text-gray-400 text-xs mt-3`}>Decrypting image...</Text>
              </View>
            )}

            {/* Next button */}
            {imageFiles.length > 1 && viewerIndex < imageFiles.length - 1 ? (
              <TouchableOpacity
                onPress={() => {
                  setViewerIndex((prev) => Math.min(imageFiles.length - 1, prev + 1));
                  setZoomScale(1);
                  setPanPosition({ x: 0, y: 0 });
                }}
                style={tw`absolute right-3 z-30 p-2.5 rounded-full bg-black/60 border border-white/20`}
              >
                <Ionicons name="chevron-forward" size={22} color="#ffffff" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Bottom metadata */}
          <View style={tw`p-3 items-center flex-row justify-between px-5`}>
            <Text style={tw`text-gray-400 text-xs`}>
              Swipe left / right to change • Pinch or tap zoom to inspect
            </Text>
            <Text style={tw`text-gray-500 text-xs`}>
              Uploaded {formatDate(currentViewerImage?.uploadedAt)}
            </Text>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* DELETE CONFIRMATION MODAL                                      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Modal visible={Boolean(deleteModal)} transparent animationType="fade" onRequestClose={() => setDeleteModal(null)}>
        <View style={tw`flex-1 bg-black/75 items-center justify-center p-4`}>
          <View style={tw`bg-vault-card border border-vault-border rounded-2xl w-full max-w-sm p-5`}>
            <View style={tw`w-12 h-12 rounded-xl bg-red-950/40 border border-red-900/60 items-center justify-center mb-3 self-center`}>
              <Ionicons name="trash-outline" size={22} color="#f43f5e" />
            </View>

            <Text style={tw`text-txt-primary text-base font-bold text-center mb-1`}>Delete File?</Text>
            <Text style={tw`text-txt-muted text-xs text-center mb-4`}>
              "{deleteModal?.originalName}" will be moved to the Trash bin.
            </Text>

            <View style={tw`flex-row gap-2`}>
              <TouchableOpacity
                onPress={() => setDeleteModal(null)}
                style={tw`flex-1 py-2.5 rounded-xl bg-vault-surface border border-vault-border items-center`}
              >
                <Text style={tw`text-txt-secondary text-xs font-semibold`}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={confirmDelete}
                disabled={deleting}
                style={tw`flex-1 py-2.5 rounded-xl bg-red-600 items-center justify-center`}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={tw`text-white text-xs font-bold`}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
