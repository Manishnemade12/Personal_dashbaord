import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator, Image } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import styles from '../styles/investmentStyles';
import { ASSET_CLASSES, ASSET_META } from '../constants/assetOptions';

export default function AiImportModal({
  data: {
    isMobile,
    aiModalVisible,
    setAiModalVisible,
    aiStep,
    setAiStep,
    selectedAiImage,
    aiFileName,
    extractedHoldings,
    isScanningAi,
    isSavingBulkAi,
    resetAiModal,
    handlePickAiImage,
    handleRunAiExtraction,
    handleToggleHoldingSelect,
    handleUpdateHoldingField,
    handleRemoveExtractedHolding,
    handleAddCustomExtractedHolding,
    handleConfirmAiHoldings,
  },
}) {
  return (
<Modal visible={aiModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              isMobile
                ? { width: '96%', maxHeight: '92%', padding: 0 }
                : { width: 720, maxHeight: '88%', padding: 0 },
            ]}
          >
            {/* Modal Header */}
            <View
              style={[
                styles.modalHeader,
                {
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f1f5f9',
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#f3e8ff',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="sparkles" size={20} color="#7c3aed" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>
                    {aiStep === 'review' ? 'Verify Extracted Holdings' : 'Import with Grok AI Vision'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748b' }}>
                    {aiStep === 'review'
                      ? 'Review quantities & prices before saving to portfolio'
                      : 'Upload a screenshot from Zerodha, Groww, AngelOne, etc.'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setAiModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* STEP 1: Upload & Scan */}
            {aiStep === 'upload' && (
              <ScrollView style={{ padding: 18 }} showsVerticalScrollIndicator={false}>
                {/* Grok Info Pill */}
                <View
                  style={{
                    backgroundColor: '#f0fdf4',
                    borderWidth: 1,
                    borderColor: '#bbf7d0',
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Ionicons name="shield-checkmark" size={18} color="#16a34a" />
                  <Text style={{ fontSize: 12, color: '#166534', flex: 1, fontWeight: '600' }}>
                    Powered by <Text style={{ fontWeight: '800' }}>xAI grok-2-vision-1212</Text>. Configured in backend (.env).
                  </Text>
                </View>

                {/* Dropzone / Upload Box */}
                <TouchableOpacity
                  onPress={handlePickAiImage}
                  activeOpacity={0.8}
                  style={{
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderColor: selectedAiImage ? '#8b5cf6' : '#cbd5e1',
                    borderRadius: 14,
                    padding: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selectedAiImage ? '#faf5ff' : '#f8fafc',
                    marginBottom: 16,
                  }}
                >
                  {selectedAiImage ? (
                    <View style={{ alignItems: 'center', gap: 10, width: '100%' }}>
                      <Image
                        source={{ uri: selectedAiImage }}
                        style={{
                          width: '100%',
                          height: 160,
                          borderRadius: 10,
                          resizeMode: 'contain',
                          backgroundColor: '#00000008',
                        }}
                      />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#7c3aed' }}>
                        {aiFileName || 'Screenshot Ready for Extraction'}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748b' }}>
                        Click to select another screenshot
                      </Text>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', gap: 8 }}>
                      <View
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 28,
                          backgroundColor: '#ede9fe',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="image-outline" size={28} color="#7c3aed" />
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b' }}>
                        Select Portfolio Screenshot
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center', maxWidth: 320 }}>
                        Upload screenshot from Zerodha Kite, Groww, AngelOne, Upstox, or IndMoney showing stock holdings & quantities
                      </Text>
                      <View
                        style={{
                          backgroundColor: '#7c3aed',
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 8,
                          marginTop: 4,
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Browse Files</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Primary Action Button */}
                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    { backgroundColor: selectedAiImage ? '#7c3aed' : '#cbd5e1' },
                    !selectedAiImage && { opacity: 0.7 },
                  ]}
                  onPress={() => handleRunAiExtraction(false)}
                  disabled={!selectedAiImage || isScanningAi}
                >
                  <Ionicons name="sparkles" size={18} color="#ffffff" />
                  <Text style={styles.saveBtnText}>
                    {isScanningAi ? 'Scanning Image...' : 'Scan Screenshot with Grok AI'}
                  </Text>
                </TouchableOpacity>

                {/* Fast Sample Button */}
                <View
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTopWidth: 1,
                    borderTopColor: '#f1f5f9',
                    alignItems: 'center',
                  }}
                >
                  <TouchableOpacity
                    onPress={() => handleRunAiExtraction(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                    }}
                  >
                    <Ionicons name="flash-outline" size={14} color="#6366f1" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#6366f1' }}>
                      âš¡ Try with Sample Broker Screenshot Data
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            {/* STEP: SCANNING / ANALYZING */}
            {aiStep === 'scanning' && (
              <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#7c3aed" />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginTop: 16 }}>
                  Grok Vision AI is Analyzing Screenshot...
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: '#64748b',
                    textAlign: 'center',
                    marginTop: 6,
                    maxWidth: 320,
                  }}
                >
                  Extracting stock tickers, quantities, buy prices, and current valuations from your brokerage statement.
                </Text>
              </View>
            )}

            {/* STEP 2: REVIEW & CONFIRMATION MODAL ("pehele mere se conformation lega but") */}
            {aiStep === 'review' && (
              <View style={{ flex: 1 }}>
                {/* Top Confirmation Guidance Banner */}
                <View
                  style={{
                    backgroundColor: '#fffbeb',
                    borderBottomWidth: 1,
                    borderBottomColor: '#fde68a',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <Ionicons name="alert-circle" size={20} color="#d97706" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400e' }}>
                      Confirmation Required Before Saving
                    </Text>
                    <Text style={{ fontSize: 11, color: '#b45309' }}>
                      Review detected quantities and prices below. Edit any value directly or uncheck items you don't wish to add.
                    </Text>
                  </View>
                </View>

                {/* Live Totals summary of selected items */}
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: '#f8fafc',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: '#e2e8f0',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                    Selected:{' '}
                    <Text style={{ color: '#7c3aed', fontWeight: '800' }}>
                      {extractedHoldings.filter((h) => h.isSelected).length} of {extractedHoldings.length}
                    </Text>
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                    Total Est. Value:{' '}
                    <Text style={{ color: '#10b981', fontWeight: '800' }}>
                      ₹
                      {extractedHoldings
                        .filter((h) => h.isSelected)
                        .reduce(
                          (sum, h) =>
                            sum + (Number(h.quantity) || 0) * (Number(h.buyPrice) || 0),
                          0
                        )
                        .toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </Text>
                  </Text>
                </View>

                {/* Holdings Cards List */}
                <ScrollView style={{ padding: 14, flex: 1 }} showsVerticalScrollIndicator={false}>
                  {extractedHoldings.map((item, idx) => (
                    <View
                      key={item.id || idx}
                      style={{
                        backgroundColor: item.isSelected ? '#ffffff' : '#f8fafc',
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: item.isSelected ? '#8b5cf6' : '#e2e8f0',
                        padding: 14,
                        marginBottom: 12,
                        opacity: item.isSelected ? 1 : 0.6,
                      }}
                    >
                      {/* Card Top: Checkbox, Symbol, Confidence, Discard */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 10,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => handleToggleHoldingSelect(item.id)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                        >
                          <View
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 4,
                              borderWidth: 1.5,
                              borderColor: item.isSelected ? '#7c3aed' : '#94a3b8',
                              backgroundColor: item.isSelected ? '#7c3aed' : '#fff',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {item.isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                          </View>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: item.isSelected ? '#7c3aed' : '#64748b',
                            }}
                          >
                            {item.isSelected ? 'Included' : 'Excluded'}
                          </Text>
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View
                            style={{
                              backgroundColor: '#ecfdf5',
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#059669' }}>
                              {Math.round((item.confidence || 0.95) * 100)}% Match
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => handleRemoveExtractedHolding(item.id)}>
                            <Ionicons name="trash-outline" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Row 1: Symbol & Name */}
                      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                        <View style={{ flex: 1.2 }}>
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '700',
                              color: '#64748b',
                              marginBottom: 2,
                            }}
                          >
                            SYMBOL
                          </Text>
                          <TextInput
                            style={{
                              backgroundColor: '#f1f5f9',
                              borderRadius: 8,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              fontSize: 13,
                              fontWeight: '800',
                              color: '#0f172a',
                            }}
                            value={item.symbolOrCode}
                            onChangeText={(val) =>
                              handleUpdateHoldingField(item.id, 'symbolOrCode', val)
                            }
                            placeholder="e.g. TATAMOTORS.NS"
                          />
                        </View>
                        <View style={{ flex: 2 }}>
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '700',
                              color: '#64748b',
                              marginBottom: 2,
                            }}
                          >
                            NAME
                          </Text>
                          <TextInput
                            style={{
                              backgroundColor: '#f1f5f9',
                              borderRadius: 8,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              fontSize: 13,
                              color: '#0f172a',
                            }}
                            value={item.instrumentName}
                            onChangeText={(val) =>
                              handleUpdateHoldingField(item.id, 'instrumentName', val)
                            }
                            placeholder="Company Name"
                          />
                        </View>
                      </View>

                      {/* Row 2: Quantity & Buy Price */}
                      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '700',
                              color: '#64748b',
                              marginBottom: 2,
                            }}
                          >
                            QUANTITY (SHARES)
                          </Text>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: '#f1f5f9',
                              borderRadius: 8,
                            }}
                          >
                            <TouchableOpacity
                              onPress={() => {
                                const q = Math.max(1, (Number(item.quantity) || 1) - 1);
                                handleUpdateHoldingField(item.id, 'quantity', String(q));
                              }}
                              style={{ paddingHorizontal: 8, paddingVertical: 6 }}
                            >
                              <Ionicons name="remove" size={14} color="#475569" />
                            </TouchableOpacity>
                            <TextInput
                              style={{
                                flex: 1,
                                textAlign: 'center',
                                fontSize: 14,
                                fontWeight: '800',
                                color: '#0f172a',
                                paddingVertical: 6,
                              }}
                              value={item.quantity}
                              keyboardType="numeric"
                              onChangeText={(val) =>
                                handleUpdateHoldingField(item.id, 'quantity', val)
                              }
                            />
                            <TouchableOpacity
                              onPress={() => {
                                const q = (Number(item.quantity) || 0) + 1;
                                handleUpdateHoldingField(item.id, 'quantity', String(q));
                              }}
                              style={{ paddingHorizontal: 8, paddingVertical: 6 }}
                            >
                              <Ionicons name="add" size={14} color="#475569" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '700',
                              color: '#64748b',
                              marginBottom: 2,
                            }}
                          >
                            AVG BUY PRICE (â‚¹)
                          </Text>
                          <TextInput
                            style={{
                              backgroundColor: '#f1f5f9',
                              borderRadius: 8,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              fontSize: 14,
                              fontWeight: '800',
                              color: '#0f172a',
                            }}
                            value={item.buyPrice}
                            keyboardType="numeric"
                            onChangeText={(val) =>
                              handleUpdateHoldingField(item.id, 'buyPrice', val)
                            }
                            placeholder="0.00"
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '700',
                              color: '#64748b',
                              marginBottom: 2,
                            }}
                          >
                            CMP / LTP (â‚¹)
                          </Text>
                          <TextInput
                            style={{
                              backgroundColor: '#f1f5f9',
                              borderRadius: 8,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              fontSize: 14,
                              fontWeight: '800',
                              color: '#059669',
                            }}
                            value={item.latestPrice}
                            keyboardType="numeric"
                            onChangeText={(val) =>
                              handleUpdateHoldingField(item.id, 'latestPrice', val)
                            }
                            placeholder="0.00"
                          />
                        </View>
                      </View>

                      {/* Card Bottom: Subtotal */}
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: 6,
                          borderTopWidth: 1,
                          borderTopColor: '#f1f5f9',
                        }}
                      >
                        <Text style={{ fontSize: 11, color: '#64748b' }}>Investment Amount:</Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>
                          ₹
                          {(
                            (Number(item.quantity) || 0) * (Number(item.buyPrice) || 0)
                          ).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </Text>
                      </View>
                    </View>
                  ))}

                  {/* Add Extra Item manually button */}
                  <TouchableOpacity
                    onPress={handleAddCustomExtractedHolding}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 10,
                      borderStyle: 'dashed',
                      borderWidth: 1,
                      borderColor: '#c4b5fd',
                      borderRadius: 10,
                      marginBottom: 16,
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={16} color="#7c3aed" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#7c3aed' }}>
                      + Add Another Stock to Batch
                    </Text>
                  </TouchableOpacity>
                </ScrollView>

                {/* Confirmation Footer Bar */}
                <View
                  style={{
                    padding: 14,
                    borderTopWidth: 1,
                    borderTopColor: '#e2e8f0',
                    backgroundColor: '#ffffff',
                    flexDirection: 'row',
                    gap: 10,
                    alignItems: 'center',
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setAiStep('upload')}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: '#f1f5f9',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.saveBtn,
                      { flex: 1, backgroundColor: '#10b981', marginVertical: 0 },
                      (isSavingBulkAi ||
                        extractedHoldings.filter((h) => h.isSelected).length === 0) && {
                        opacity: 0.6,
                      },
                    ]}
                    onPress={handleConfirmAiHoldings}
                    disabled={
                      isSavingBulkAi ||
                      extractedHoldings.filter((h) => h.isSelected).length === 0
                    }
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                    <Text style={styles.saveBtnText}>
                      {isSavingBulkAi
                        ? 'Saving Holdings...'
                        : `Confirm & Add to Portfolio (${extractedHoldings.filter((h) => h.isSelected).length} Items)`}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
  );
}
