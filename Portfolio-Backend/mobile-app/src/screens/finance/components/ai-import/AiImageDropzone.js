import React from 'react';
import { View, Text, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from './aiImportStyles';

export default function AiImageDropzone({
  selectedImages = [],
  onAddImages,
  onRemoveImage,
  onRunScan,
  onUseSample,
}) {
  const handleOpenPicker = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true; // Support multiple images!
      input.onchange = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const readPromises = files.map(
          (file) =>
            new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (event) => {
                resolve({
                  name: file.name,
                  uri: event.target.result,
                  size: file.size,
                });
              };
              reader.readAsDataURL(file);
            })
        );

        Promise.all(readPromises).then((newImgs) => {
          onAddImages(newImgs);
        });
      };
      input.click();
    } else {
      // Native fallback or sample
      onUseSample();
    }
  };

  const hasImages = selectedImages.length > 0;

  return (
    <View>
      {/* Grok Info Pill */}
      <View style={styles.infoBanner}>
        <Ionicons name="sparkles" size={17} color="#16a34a" />
        <Text style={styles.infoBannerText}>
          Upload single or <Text style={{ fontWeight: '800' }}>multiple brokerage screenshots</Text> (Zerodha Kite, Groww, Angel One, Upstox). Grok AI extracts stock names, quantities & prices.
        </Text>
      </View>

      {/* Dropzone Box */}
      {!hasImages && (
        <TouchableOpacity
          style={styles.dropzoneBox}
          onPress={handleOpenPicker}
          activeOpacity={0.8}
        >
          <View style={styles.dropzoneIconWrap}>
            <Ionicons name="cloud-upload-outline" size={28} color="#7e37d8" />
          </View>
          <Text style={styles.dropzoneMainText}>Select Brokerage Portfolio Screenshots</Text>
          <Text style={styles.dropzoneSubText}>
            Click to browse multiple screenshots (JPG, PNG) from your device
          </Text>

          <View style={styles.supportedBrokersPill}>
            <Text style={styles.supportedBrokersText}>
              ✓ Multi-image upload • Zerodha • Groww • Angel One • Upstox
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Multi-Image Thumbnails Grid */}
      {hasImages && (
        <View style={styles.thumbsContainer}>
          <Text style={styles.thumbsTitle}>
            Selected Screenshots ({selectedImages.length})
          </Text>
          <View style={styles.thumbsGrid}>
            {selectedImages.map((img, idx) => (
              <View key={idx} style={styles.thumbCard}>
                <Image source={{ uri: img.uri }} style={styles.thumbImage} />
                <View style={styles.thumbFooter}>
                  <Text style={styles.thumbName} numberOfLines={1}>
                    {img.name || `Screenshot ${idx + 1}`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.thumbRemoveBtn}
                  onPress={() => onRemoveImage(idx)}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <Ionicons name="close" size={14} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ))}

            {/* Add More Button */}
            <TouchableOpacity
              style={styles.thumbAddMoreBtn}
              onPress={handleOpenPicker}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={24} color="#7e37d8" />
              <Text style={styles.thumbAddMoreText}>+ Add More</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Scan Action Button */}
      {hasImages && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={onRunScan}
          activeOpacity={0.8}
        >
          <Ionicons name="scan" size={17} color="#ffffff" />
          <Text style={styles.primaryBtnText}>
            Scan {selectedImages.length} Screenshot{selectedImages.length > 1 ? 's' : ''} with Grok AI
          </Text>
        </TouchableOpacity>
      )}

      {/* Sample broker data button */}
      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={onUseSample}
        activeOpacity={0.7}
      >
        <Ionicons name="flash-outline" size={15} color="#475569" />
        <Text style={styles.secondaryBtnText}>
          {hasImages ? 'Or Test with Sample Broker Data' : 'Test Extraction with Sample Broker Screenshot'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
