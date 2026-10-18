import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../../styles/theme';
import { api } from '../../api/client';

export default function ImageUploader({
  label = 'Image',
  value = '',
  onChange,
  folder = 'portfolio',
  aspectRatio = 'wide', // 'square' | 'wide'
  placeholder = 'https://res.cloudinary.com/...',
  multiple = false,
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualUrlInput, setManualUrlInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Normalize image list for multiple or single mode
  const imageList = Array.isArray(value)
    ? value.filter((v) => typeof v === 'string' && v.trim().length > 0)
    : typeof value === 'string' && value.trim().length > 0
    ? value.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const handlePickAndUpload = () => {
    setErrorMsg('');
    if (typeof document === 'undefined') {
      Alert.alert('Notice', 'File upload is supported in web and mobile browser.');
      return;
    }

    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (multiple) {
        input.multiple = true;
      }

      input.onchange = async (e) => {
        const files = Array.from(e.target?.files || []);
        if (files.length === 0) return;

        // Check if any file exceeds 15MB
        const oversized = files.find((f) => f.size > 15 * 1024 * 1024);
        if (oversized) {
          Alert.alert('File Too Large', `"${oversized.name}" exceeds 15MB. Please choose smaller images.`);
          return;
        }

        setUploading(true);
        setErrorMsg('');

        try {
          const uploadedUrls = [];
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setUploadProgressText(
              files.length > 1
                ? `Uploading ${i + 1} of ${files.length} to Cloudinary...`
                : 'Uploading to Cloudinary...'
            );

            // Read as data URL
            const base64Data = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (event) => resolve(event.target.result);
              reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
              reader.readAsDataURL(file);
            });

            // Upload via API
            const res = await api.uploadImage(base64Data, folder);
            const url = res?.secure_url || res?.url;
            if (url) {
              uploadedUrls.push(url);
            } else {
              throw new Error(`Cloudinary did not return a valid URL for ${file.name}`);
            }
          }

          if (multiple) {
            const updated = [...imageList, ...uploadedUrls];
            if (onChange) onChange(updated);
          } else {
            const singleUrl = uploadedUrls[0] || '';
            if (onChange) onChange(singleUrl);
          }
        } catch (err) {
          console.error('Upload failed:', err);
          setErrorMsg(err.message || 'Upload failed. Please try again.');
          Alert.alert('Upload Failed', err.message || 'Failed to upload image(s) to Cloudinary.');
        } finally {
          setUploading(false);
          setUploadProgressText('');
        }
      };

      input.click();
    } catch (err) {
      console.error('Trigger picker error:', err);
      Alert.alert('Error', 'Could not open file picker on this device.');
    }
  };

  // Actions for multiple mode
  const handleSetCover = (index) => {
    if (index === 0 || !multiple) return;
    const target = imageList[index];
    const rest = imageList.filter((_, idx) => idx !== index);
    const updated = [target, ...rest];
    if (onChange) onChange(updated);
  };

  const handleMove = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= imageList.length) return;
    const updated = [...imageList];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    if (onChange) onChange(updated);
  };

  const handleRemoveIndex = (index) => {
    const updated = imageList.filter((_, idx) => idx !== index);
    if (onChange) {
      if (multiple) {
        onChange(updated);
      } else {
        onChange('');
      }
    }
  };

  const handleAddManualUrl = () => {
    const trimmed = manualUrlInput.trim();
    if (!trimmed) return;
    if (multiple) {
      const updated = [...imageList, trimmed];
      if (onChange) onChange(updated);
    } else {
      if (onChange) onChange(trimmed);
    }
    setManualUrlInput('');
  };

  const isSquare = aspectRatio === 'square';
  const hasImages = imageList.length > 0;
  const coverImage = imageList[0] || '';

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.label}>{label}</Text>
          {multiple && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{imageList.length} {imageList.length === 1 ? 'image' : 'images'}</Text>
            </View>
          )}
        </View>

        {hasImages && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => onChange && onChange(multiple ? [] : '')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={13} color={colors.danger} />
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ============================================================ */}
      {/* MULTIPLE IMAGES MODE                                         */}
      {/* ============================================================ */}
      {multiple ? (
        <View style={styles.multipleContainer}>
          {hasImages ? (
            <>
              {/* Primary Cover Image Preview Card */}
              <View style={styles.coverCard}>
                <View style={[styles.previewContainer, styles.previewWide]}>
                  <Image
                    source={{ uri: coverImage }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />

                  {/* Badges */}
                  <View style={styles.coverBadgeWrap}>
                    <View style={styles.coverTag}>
                      <Ionicons name="star" size={11} color="#ffffff" style={{ marginRight: 3 }} />
                      <Text style={styles.coverTagText}>Cover Image (Primary)</Text>
                    </View>
                  </View>

                  <View style={styles.imgIndexTag}>
                    <Text style={styles.imgIndexText}>1 of {imageList.length}</Text>
                  </View>

                  {/* Overlay Action Buttons */}
                  <View style={styles.previewOverlay}>
                    <TouchableOpacity
                      style={styles.changeOverlayBtn}
                      onPress={handlePickAndUpload}
                      disabled={uploading}
                      activeOpacity={0.8}
                    >
                      {uploading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Ionicons name="add-circle-outline" size={13} color="#ffffff" />
                          <Text style={styles.changeOverlayText}>+ Add More Photos</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.coverHint}>
                  ★ This first image is displayed on project/blog cards. Tap any image below to make it the cover.
                </Text>
              </View>

              {/* Gallery Thumbnails List */}
              <View style={styles.galleryStripHeader}>
                <Text style={styles.galleryStripTitle}>All Uploaded Photos ({imageList.length})</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailsScroll}>
                {imageList.map((url, idx) => {
                  const isCover = idx === 0;
                  return (
                    <View key={`${url}-${idx}`} style={[styles.thumbCard, isCover && styles.thumbCardCover]}>
                      <Image source={{ uri: url }} style={styles.thumbImage} resizeMode="cover" />

                      {/* Cover Badge on Thumbnail */}
                      {isCover ? (
                        <View style={styles.thumbCoverBadge}>
                          <Ionicons name="star" size={9} color="#ffffff" />
                          <Text style={styles.thumbCoverBadgeText}>Cover</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.setCoverBtn}
                          onPress={() => handleSetCover(idx)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="star-outline" size={10} color="#ffffff" />
                          <Text style={styles.setCoverBtnText}>Make Cover</Text>
                        </TouchableOpacity>
                      )}

                      {/* Actions Row */}
                      <View style={styles.thumbActionsRow}>
                        {idx > 0 && (
                          <TouchableOpacity
                            style={styles.thumbMiniBtn}
                            onPress={() => handleMove(idx, idx - 1)}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          >
                            <Ionicons name="chevron-back" size={11} color="#ffffff" />
                          </TouchableOpacity>
                        )}
                        {idx < imageList.length - 1 && (
                          <TouchableOpacity
                            style={styles.thumbMiniBtn}
                            onPress={() => handleMove(idx, idx + 1)}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          >
                            <Ionicons name="chevron-forward" size={11} color="#ffffff" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.thumbMiniBtn, { backgroundColor: 'rgba(239, 68, 68, 0.85)' }]}
                          onPress={() => handleRemoveIndex(idx)}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        >
                          <Ionicons name="trash-outline" size={11} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                {/* Quick Add More Card in ScrollView */}
                <TouchableOpacity
                  style={styles.addMoreCard}
                  onPress={handlePickAndUpload}
                  disabled={uploading}
                  activeOpacity={0.8}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <View style={styles.addMoreIconWrap}>
                        <Ionicons name="add" size={18} color={colors.primary} />
                      </View>
                      <Text style={styles.addMoreText}>+ Add Photos</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </>
          ) : (
            /* Empty Multi Dropzone */
            <TouchableOpacity
              style={[styles.dropZone, uploading && styles.dropZoneActive]}
              onPress={handlePickAndUpload}
              disabled={uploading}
              activeOpacity={0.75}
            >
              {uploading ? (
                <View style={styles.uploadingBox}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.uploadingText}>{uploadProgressText || 'Uploading to Cloudinary...'}</Text>
                </View>
              ) : (
                <View style={styles.dropZoneContent}>
                  <View style={styles.uploadIconBadge}>
                    <Ionicons name="images-outline" size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.dropZoneTitle}>Upload Photos from Device</Text>
                  <Text style={styles.dropZoneSubtitle}>
                    Select 1 or multiple images • First image becomes the Cover Image
                  </Text>
                  <View style={styles.selectBtnPill}>
                    <Ionicons name="folder-open-outline" size={13} color="#ffffff" style={{ marginRight: 4 }} />
                    <Text style={styles.selectBtnPillText}>Choose Files</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      ) : (
        /* ============================================================ */
        /* SINGLE IMAGE MODE                                            */
        /* ============================================================ */
        <>
          {hasImages ? (
            <View style={[styles.previewContainer, isSquare ? styles.previewSquare : styles.previewWide]}>
              <Image
                source={{ uri: coverImage }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <View style={styles.previewOverlay}>
                <TouchableOpacity
                  style={styles.changeOverlayBtn}
                  onPress={handlePickAndUpload}
                  disabled={uploading}
                  activeOpacity={0.8}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="camera-reverse-outline" size={14} color="#ffffff" />
                      <Text style={styles.changeOverlayText}>Change Image</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.dropZone, isSquare && styles.dropZoneSquare, uploading && styles.dropZoneActive]}
              onPress={handlePickAndUpload}
              disabled={uploading}
              activeOpacity={0.75}
            >
              {uploading ? (
                <View style={styles.uploadingBox}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.uploadingText}>{uploadProgressText || 'Uploading to Cloudinary...'}</Text>
                </View>
              ) : (
                <View style={styles.dropZoneContent}>
                  <View style={styles.uploadIconBadge}>
                    <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.dropZoneTitle}>Upload Image from Device</Text>
                  <Text style={styles.dropZoneSubtitle}>
                    Tap to pick JPG, PNG, WebP • Auto-uploads to Cloudinary
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </>
      )}

      {errorMsg ? (
        <Text style={styles.errorText}>{errorMsg}</Text>
      ) : null}

      {/* Quick link & manual input toggle */}
      <View style={styles.footerRow}>
        <TouchableOpacity
          style={styles.toggleManualBtn}
          onPress={() => setShowManualInput((prev) => !prev)}
        >
          <Ionicons
            name={showManualInput ? 'chevron-up-outline' : 'link-outline'}
            size={13}
            color={colors.textSecondary}
          />
          <Text style={styles.toggleManualText}>
            {showManualInput ? 'Hide manual URL' : (hasImages ? 'View or add direct image URLs' : 'Or paste direct URL')}
          </Text>
        </TouchableOpacity>

        {hasImages && coverImage.includes('cloudinary.com') && (
          <View style={styles.cloudinaryBadge}>
            <Ionicons name="checkmark-circle" size={11} color={colors.success} />
            <Text style={styles.cloudinaryBadgeText}>Cloudinary Active</Text>
          </View>
        )}
      </View>

      {/* Collapsible Manual Input */}
      {showManualInput && (
        <View style={styles.manualInputWrap}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TextInput
              style={[styles.manualInput, { flex: 1 }]}
              value={manualUrlInput}
              onChangeText={setManualUrlInput}
              placeholder={placeholder}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.addUrlBtn}
              onPress={handleAddManualUrl}
              activeOpacity={0.8}
            >
              <Text style={styles.addUrlBtnText}>Add URL</Text>
            </TouchableOpacity>
          </View>
          {multiple && imageList.length > 0 && (
            <Text style={styles.urlListNote}>
              Current URLs ({imageList.length}): {imageList.join(', ')}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  countBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7e37d8',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  clearText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.danger,
  },
  multipleContainer: {
    width: '100%',
  },
  coverCard: {
    marginBottom: 8,
  },
  coverBadgeWrap: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  coverTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7e37d8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  coverTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  imgIndexTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  imgIndexText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  coverHint: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  galleryStripHeader: {
    marginTop: 6,
    marginBottom: 4,
  },
  galleryStripTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  thumbnailsScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  thumbCard: {
    width: 90,
    height: 75,
    borderRadius: radii.md,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f1f5f9',
  },
  thumbCardCover: {
    borderColor: '#7e37d8',
    borderWidth: 2,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbCoverBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    backgroundColor: '#7e37d8',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  thumbCoverBadgeText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  setCoverBtn: {
    position: 'absolute',
    top: 3,
    left: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  setCoverBtnText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#ffffff',
  },
  thumbActionsRow: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  thumbMiniBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    width: 18,
    height: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreCard: {
    width: 80,
    height: 75,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
    borderStyle: 'dashed',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  addMoreIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.primary,
  },
  dropZone: {
    borderWidth: 1.5,
    borderColor: colors.primaryBorder || '#c7d2fe',
    borderStyle: 'dashed',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt || '#f8fafc',
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  dropZoneSquare: {
    aspectRatio: 1,
    maxHeight: 180,
  },
  dropZoneActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg || 'rgba(99, 102, 241, 0.08)',
  },
  dropZoneContent: {
    alignItems: 'center',
    gap: 6,
  },
  uploadIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryBg || 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: colors.primaryBorder || 'rgba(99, 102, 241, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  dropZoneTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dropZoneSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  selectBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    marginTop: 4,
  },
  selectBtnPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  uploadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadingText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  previewContainer: {
    borderRadius: radii.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewWide: {
    width: '100%',
    height: 160,
  },
  previewSquare: {
    width: 140,
    height: 140,
    alignSelf: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  changeOverlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  changeOverlayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  toggleManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  toggleManualText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  cloudinaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radii.full,
  },
  cloudinaryBadgeText: {
    fontSize: 10,
    color: colors.successText || colors.success,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  manualInputWrap: {
    marginTop: 6,
    gap: 4,
  },
  manualInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    color: colors.textPrimary,
    fontSize: 11,
  },
  addUrlBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addUrlBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  urlListNote: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 4,
  },
});
