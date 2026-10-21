import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../../api/client';
import styles from './aiImportStyles';
import AiImageDropzone from './AiImageDropzone';
import AiHoldingsReviewList from './AiHoldingsReviewList';

export default function AiImportModal({
  visible,
  onClose,
  onImportSuccess,
  isMobile = false,
  // Support legacy props if passed from useInvestments data wrapper:
  data,
}) {
  // Normalize props for either standalone or useInvestments usage
  const isVisible = data ? data.aiModalVisible : visible;
  const isMobileView = data?.isMobile !== undefined ? data.isMobile : isMobile;
  const handleClose = () => {
    if (data?.setAiModalVisible) {
      data.setAiModalVisible(false);
    }
    if (onClose) {
      onClose();
    }
  };

  // Internal state
  const [step, setStep] = useState('upload'); // 'upload' | 'scanning' | 'review'
  const [selectedImages, setSelectedImages] = useState([]);
  const [extractedHoldings, setExtractedHoldings] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Add images to list
  const handleAddImages = (newImages) => {
    setSelectedImages((prev) => [...prev, ...newImages]);
  };

  // Remove single image from list
  const handleRemoveImage = (indexToRemove) => {
    setSelectedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Run AI Extraction via Grok Vision & OCR
  const handleRunScan = async (forceDemo = false) => {
    if (!forceDemo && selectedImages.length === 0) {
      Alert.alert('No Screenshots Selected', 'Please select at least one portfolio screenshot to scan.');
      return;
    }

    setIsScanning(true);
    setStep('scanning');

    try {
      const payload = {
        images: selectedImages.map((img) => img.uri),
        useDemo: forceDemo,
      };

      const res = await api.aiExtractHoldings(payload);

      if (res && res.success && Array.isArray(res.holdings) && res.holdings.length > 0) {
        setExtractedHoldings(res.holdings);
        setStep('review');
      } else {
        Alert.alert(
          'Extraction Result',
          res?.error || 'Could not detect any stock holdings in the uploaded screenshots. Please ensure text is clear.'
        );
        setStep('upload');
      }
    } catch (err) {
      console.error('AI Scan Error:', err);
      Alert.alert('Scan Failed', err.message || 'Error communicating with Grok AI server.');
      setStep('upload');
    } finally {
      setIsScanning(false);
    }
  };

  // Toggle selection checkbox for an extracted holding
  const handleToggleSelect = (id) => {
    setExtractedHoldings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isSelected: !item.isSelected } : item))
    );
  };

  // Update a field (quantity or buyPrice)
  const handleUpdateField = (id, field, value) => {
    setExtractedHoldings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Remove extracted holding row
  const handleRemoveHolding = (id) => {
    setExtractedHoldings((prev) => prev.filter((item) => item.id !== id));
  };

  // Add custom manual holding in review list
  const handleAddCustom = () => {
    const newId = `manual-${Date.now()}`;
    setExtractedHoldings((prev) => [
      ...prev,
      {
        id: newId,
        symbolOrCode: 'NEWSTOCK',
        instrumentName: 'New Asset Ltd',
        assetClass: 'Equity',
        subCategory: 'Stocks',
        quantity: '10',
        buyPrice: '500',
        latestPrice: '500',
        isSelected: true,
        isExisting: false,
        badgeText: '🔵 New Asset',
        badgeNote: 'Manually added in verification review',
      },
    ]);
  };

  // Confirm and save verified holdings to database
  const handleConfirmHoldings = async () => {
    const selected = extractedHoldings.filter((h) => h.isSelected && Number(h.quantity) > 0);
    if (selected.length === 0) {
      Alert.alert('No Holdings Selected', 'Please select at least one holding with valid quantity.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = selected.map((h) => ({
        symbolOrCode: h.symbolOrCode.trim().toUpperCase(),
        instrumentName: h.instrumentName.trim(),
        assetClass: h.assetClass || 'Equity',
        subCategory: h.subCategory || 'Stocks',
        quantity: Number(h.quantity),
        buyPrice: Number(h.buyPrice),
        latestPrice: Number(h.latestPrice || h.buyPrice),
        notes: `AI Imported via Grok Vision (${h.quantity} shares @ ₹${h.buyPrice})`,
      }));

      const res = await api.bulkAddHoldings({ holdings: payload });

      if (res && res.success) {
        Alert.alert(
          'Holdings Saved! 🎉',
          `Successfully verified and added/merged ${res.count} holding(s) into your portfolio.`
        );
        handleClose();
        setStep('upload');
        setSelectedImages([]);
        setExtractedHoldings([]);

        if (onImportSuccess) {
          onImportSuccess();
        } else if (data?.loadData) {
          data.loadData();
        }
      } else {
        throw new Error(res?.error || 'Failed to save confirmed holdings.');
      }
    } catch (err) {
      Alert.alert('Save Failed', err.message || 'Could not save holdings to database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={Boolean(isVisible)} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isMobileView && { width: '96%', maxHeight: '94%' }]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconBadge}>
                <Ionicons name="sparkles" size={20} color="#7e37d8" />
              </View>
              <View>
                <Text style={styles.modalTitle}>
                  {step === 'review'
                    ? 'Verify Extracted Holdings'
                    : 'Import Portfolio with Grok AI'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {step === 'review'
                    ? 'Ensure quantities, buy prices & merge targets before saving'
                    : 'Upload one or multiple broker screenshots (Zerodha, Groww, etc.)'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Modal Body */}
          <View style={{ padding: 16 }}>
            {/* STEP 1: Upload & Select Screenshots */}
            {step === 'upload' && (
              <AiImageDropzone
                selectedImages={selectedImages}
                onAddImages={handleAddImages}
                onRemoveImage={handleRemoveImage}
                onRunScan={() => handleRunScan(false)}
                onUseSample={() => handleRunScan(true)}
              />
            )}

            {/* STEP 2: Scanning In Progress */}
            {step === 'scanning' && (
              <View style={styles.scanningCard}>
                <ActivityIndicator size="large" color="#7e37d8" />
                <Text style={styles.scanningTitle}>Scanning Screenshots with Grok AI...</Text>
                <Text style={styles.scanningSubText}>
                  Extracting stock symbols, quantities, and acquisition buy prices across your screenshots, and checking against existing portfolio holdings...
                </Text>
              </View>
            )}

            {/* STEP 3: Review & Verify */}
            {step === 'review' && (
              <AiHoldingsReviewList
                holdings={extractedHoldings}
                onToggleSelect={handleToggleSelect}
                onUpdateField={handleUpdateField}
                onRemoveHolding={handleRemoveHolding}
                onAddCustom={handleAddCustom}
                onConfirm={handleConfirmHoldings}
                onCancel={() => setStep('upload')}
                isSaving={isSaving}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
