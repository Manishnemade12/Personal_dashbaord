import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator, Image } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import styles from '../styles/investmentStyles';
import { ASSET_CLASSES, ASSET_META } from '../constants/assetOptions';

export default function AddMoreModal({ data: { isMobile, addMoreModalVisible, setAddMoreModalVisible, addMoreHolding, addMoreQty, setAddMoreQty, addMorePrice, setAddMorePrice, addMoreLivePrice, loadingAddMoreQuote, savingAddMore, handleSaveAddMore } }) {
  return (
<Modal visible={addMoreModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isMobile && { padding: 12, borderRadius: 14, maxHeight: '94%', width: '96%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                <Text style={[styles.modalTitle, isMobile && { fontSize: 15 }]} numberOfLines={1}>Add More Units</Text>
                <Text style={[styles.modalSubtitle, isMobile && { fontSize: 11 }]} numberOfLines={1}>
                  {addMoreHolding?.instrumentName} ({addMoreHolding?.symbolOrCode})
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setAddMoreModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
              {/* Existing Holding Summary */}
              <View style={styles.addMoreExistingCard}>
                <Text style={styles.addMoreSectionLabel}>Current Holding</Text>
                <View style={styles.addMoreInfoGrid}>
                  <View style={styles.addMoreInfoItem}>
                    <Text style={styles.addMoreInfoLabel}>Quantity</Text>
                    <Text style={styles.addMoreInfoValue}>{addMoreHolding?.quantity || 0}</Text>
                  </View>
                  <View style={styles.addMoreInfoItem}>
                    <Text style={styles.addMoreInfoLabel}>Avg Buy Price</Text>
                    <Text style={styles.addMoreInfoValue}>
                      ₹{(addMoreHolding?.averageBuyPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <View style={styles.addMoreInfoItem}>
                    <Text style={styles.addMoreInfoLabel}>Invested</Text>
                    <Text style={styles.addMoreInfoValue}>
                      ₹{((addMoreHolding?.quantity || 0) * (addMoreHolding?.averageBuyPrice || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </Text>
                  </View>
                  <View style={styles.addMoreInfoItem}>
                    <Text style={styles.addMoreInfoLabel}>Live Price</Text>
                    <Text style={[styles.addMoreInfoValue, { color: '#059669' }]}>
                      {loadingAddMoreQuote ? '...' : `₹${(addMoreLivePrice || addMoreHolding?.latestPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                    </Text>
                  </View>
                </View>
              </View>

              {/* New Purchase Inputs */}
              <Text style={styles.addMoreSectionLabel}>New Purchase</Text>
              <View style={styles.twoColInputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>
                    {addMoreHolding?.assetClass === 'Mutual Fund' ? 'Additional Units *' : 'Additional Shares *'}
                  </Text>
                  <TextInput
                    style={[styles.textInput, styles.highlightInput]}
                    placeholder="e.g. 10"
                    keyboardType="numeric"
                    value={addMoreQty}
                    onChangeText={setAddMoreQty}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>
                    Buy Price per {addMoreHolding?.assetClass === 'Mutual Fund' ? 'Unit' : 'Share'} (₹) *
                  </Text>
                  <TextInput
                    style={[styles.textInput, styles.highlightInput]}
                    placeholder="e.g. 1500"
                    keyboardType="numeric"
                    value={addMorePrice}
                    onChangeText={setAddMorePrice}
                  />
                </View>
              </View>

              {/* Weighted Average Preview */}
              {Number(addMoreQty) > 0 && Number(addMorePrice) > 0 && addMoreHolding && (
                <View style={styles.addMorePreviewCard}>
                  <Text style={styles.addMorePreviewTitle}>ðŸ“Š Weighted Average Preview</Text>

                  {(() => {
                    const oldQty = addMoreHolding.quantity || 0;
                    const oldAvg = addMoreHolding.averageBuyPrice || 0;
                    const newQty = Number(addMoreQty);
                    const newPrice = Number(addMorePrice);
                    const totalQty = oldQty + newQty;
                    const newAvg = totalQty > 0 ? ((oldQty * oldAvg) + (newQty * newPrice)) / totalQty : 0;
                    const totalInvested = totalQty * newAvg;
                    const liveP = addMoreLivePrice || addMoreHolding.latestPrice || newPrice;
                    const totalCurrentVal = totalQty * liveP;
                    const pnl = totalCurrentVal - totalInvested;
                    const pnlPct = totalInvested > 0 ? ((pnl / totalInvested) * 100).toFixed(2) : 0;
                    const isProfit = pnl >= 0;

                    return (
                      <View>
                        <View style={styles.calcRow}>
                          <Text style={styles.calcLabel}>Old: {oldQty} × ₹{oldAvg.toFixed(2)}</Text>
                          <Text style={styles.calcVal}>₹{(oldQty * oldAvg).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                        </View>
                        <View style={styles.calcRow}>
                          <Text style={styles.calcLabel}>New: {newQty} × ₹{newPrice.toFixed(2)}</Text>
                          <Text style={styles.calcVal}>₹{(newQty * newPrice).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                        </View>
                        <View style={[styles.calcRow, styles.calcBorderTop]}>
                          <Text style={[styles.calcLabel, { fontWeight: '700' }]}>New Total Qty</Text>
                          <Text style={[styles.calcVal, { fontWeight: '800' }]}>{totalQty}</Text>
                        </View>
                        <View style={styles.calcRow}>
                          <Text style={[styles.calcLabel, { fontWeight: '700', color: '#7e37d8' }]}>New Avg Buy Price</Text>
                          <Text style={[styles.calcVal, { fontWeight: '800', color: '#7e37d8' }]}>₹{newAvg.toFixed(2)}</Text>
                        </View>
                        <View style={styles.calcRow}>
                          <Text style={styles.calcLabel}>Total Invested</Text>
                          <Text style={styles.calcVal}>₹{totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                        </View>
                        <View style={styles.calcRow}>
                          <Text style={styles.calcLabel}>Current Mkt Value</Text>
                          <Text style={styles.calcVal}>₹{totalCurrentVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                        </View>
                        <View style={[styles.calcRow, styles.calcBorderTop]}>
                          <Text style={styles.calcLabel}>Expected P&L</Text>
                          <Text style={[styles.calcVal, { color: isProfit ? '#059669' : '#dc2626', fontWeight: '800' }]}>
                            {isProfit ? '+' : ''}₹{pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({isProfit ? '+' : ''}{pnlPct}%)
                          </Text>
                        </View>
                      </View>
                    );
                  })()}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                styles.addMoreSaveBtn,
                (!addMoreQty || !addMorePrice) && { opacity: 0.6 },
              ]}
              onPress={handleSaveAddMore}
              disabled={savingAddMore || !addMoreQty || !addMorePrice}
            >
              <Ionicons name="add-circle" size={16} color="#fff" />
              <Text style={styles.saveBtnText} numberOfLines={1}>
                {savingAddMore ? 'Adding...' : 'Add More'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
  );
}
