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
}) {
  const [uploading, setUploading] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

      input.onchange = async (e) => {
        const file = e.target?.files?.[0];
        if (!file) return;

        // Size limit check (15MB)
        if (file.size > 15 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please choose an image under 15MB.');
          return;
        }

        setUploading(true);
        setErrorMsg('');

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const base64Data = event.target.result;
            const res = await api.uploadImage(base64Data, folder);
            if (res && res.secure_url) {
              if (onChange) onChange(res.secure_url);
            } else if (res && res.url) {
              if (onChange) onChange(res.url);
            } else {
              throw new Error('No URL returned from upload server');
            }
          } catch (err) {
            console.error('Upload failed:', err);
            setErrorMsg(err.message || 'Upload failed. Please try again.');
            Alert.alert('Upload Failed', err.message || 'Failed to upload image to Cloudinary.');
          } finally {
            setUploading(false);
          }
        };

        reader.onerror = () => {
          setUploading(false);
          setErrorMsg('Failed to read selected file.');
          Alert.alert('Error', 'Failed to read selected file from device.');
        };

        reader.readAsDataURL(file);
      };

      input.click();
    } catch (err) {
      console.error('Trigger picker error:', err);
      Alert.alert('Error', 'Could not open file picker on this device.');
    }
  };

  const isSquare = aspectRatio === 'square';
  const hasImage = Boolean(value && typeof value === 'string' && value.trim().length > 0);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        {hasImage && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => onChange && onChange('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={13} color={colors.danger} />
            <Text style={styles.clearText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Preview Card */}
      {hasImage ? (
        <View style={[styles.previewContainer, isSquare ? styles.previewSquare : styles.previewWide]}>
          <Image
            source={{ uri: value }}
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
        /* Empty Upload Zone */
        <TouchableOpacity
          style={[styles.dropZone, isSquare && styles.dropZoneSquare, uploading && styles.dropZoneActive]}
          onPress={handlePickAndUpload}
          disabled={uploading}
          activeOpacity={0.75}
        >
          {uploading ? (
            <View style={styles.uploadingBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.uploadingText}>Uploading to Cloudinary...</Text>
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
            {showManualInput ? 'Hide URL link' : (hasImage ? 'View or edit direct URL' : 'Or paste direct URL')}
          </Text>
        </TouchableOpacity>

        {hasImage && value.includes('cloudinary.com') && (
          <View style={styles.cloudinaryBadge}>
            <Ionicons name="checkmark-circle" size={12} color={colors.success} />
            <Text style={styles.cloudinaryBadgeText}>Cloudinary</Text>
          </View>
        )}
      </View>

      {/* Collapsible Manual Input */}
      {showManualInput && (
        <View style={styles.manualInputWrap}>
          <TextInput
            style={styles.manualInput}
            value={value}
            onChangeText={(txt) => onChange && onChange(txt)}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
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
  },
  manualInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 12,
  },
  errorText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 4,
  },

});
