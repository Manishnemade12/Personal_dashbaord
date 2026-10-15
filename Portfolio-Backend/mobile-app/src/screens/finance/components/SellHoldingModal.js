import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import styles from '../styles/investmentStyles';

export default function SellHoldingModal({
  data: {
    sellModalVisible,
    setSellModalVisible,
    sellHolding,
    sellQty,
    setSellQty,
    sellPrice,
    setSellPrice,
    sellLivePrice,
    loadingSellQuote,
    savingSell,
    sellNotes,
    setSellNotes,
    handleExecuteSell,
  },
}) {
  const currentQty = sellHolding?.quantity || 0;
  const avgBuyPrice = sellHolding?.averageBuyPrice || 0;
  const unitLabel = sellHolding?.assetClass === 'Mutual Fund' ? 'Units' : 'Shares';

  const enteredQty = Number(sellQty) || 0;
  const enteredPrice = Number(sellPrice) || 0;
  const saleProceeds = enteredQty * enteredPrice;
  const costBasis = enteredQty * avgBuyPrice;
  const realizedPnL = saleProceeds - costBasis;
  const realizedPnLPct = costBasis > 0 ? (realizedPnL / costBasis) * 100 : 0;
  const isProfit = realizedPnL >= 0;

  const handleSetPercent = (pct) => {
    if (!currentQty) return;
    const calcQty = Number((currentQty * pct).toFixed(2));
    setSellQty(String(calcQty));
  };

  return (
    <Modal visible={sellModalVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.sellHeaderIconBadge, { backgroundColor: '#fef3c7' }]}>
                  <Feather name="trending-down" size={16} color="#d97706" />
                </View>
                <Text style={styles.modalTitle}>Sell Holding / Exit</Text>
              </View>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                {sellHolding?.instrumentName} ({sellHolding?.symbolOrCode})
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSellModalVisible(false)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
            {/* Current Position Overview */}
            <View style={[styles.addMoreExistingCard, { borderColor: '#fef3c7', backgroundColor: '#fffdf5' }]}>
              <Text style={[styles.addMoreSectionLabel, { color: '#92400e' }]}>Current Position</Text>
              <View style={styles.addMoreInfoGrid}>
                <View style={styles.addMoreInfoItem}>
                  <Text style={styles.addMoreInfoLabel}>Available {unitLabel}</Text>
                  <Text style={[styles.addMoreInfoValue, { color: '#0f172a' }]}>{currentQty}</Text>
                </View>
                <View style={styles.addMoreInfoItem}>
                  <Text style={styles.addMoreInfoLabel}>Avg Buy Price</Text>
                  <Text style={styles.addMoreInfoValue}>
                    ₹{avgBuyPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.addMoreInfoItem}>
                  <Text style={styles.addMoreInfoLabel}>Current LTP</Text>
                  <Text style={[styles.addMoreInfoValue, { color: '#2563eb' }]}>
                    {loadingSellQuote
                      ? '...'
                      : `₹${(sellLivePrice || sellHolding?.latestPrice || avgBuyPrice).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}`}
                  </Text>
                </View>
                <View style={styles.addMoreInfoItem}>
                  <Text style={styles.addMoreInfoLabel}>Total Valuation</Text>
                  <Text style={styles.addMoreInfoValue}>
                    ₹{(currentQty * (sellLivePrice || sellHolding?.latestPrice || avgBuyPrice)).toLocaleString(
                      'en-IN',
                      { maximumFractionDigits: 0 }
                    )}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Percentage Chips */}
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.inputLabel}>Quick Quantity Selection</Text>
              <View style={styles.sellQuickPctRow}>
                {[
                  { label: '25%', value: 0.25 },
                  { label: '50%', value: 0.5 },
                  { label: '75%', value: 0.75 },
                  { label: '100% (All)', value: 1.0 },
                ].map((chip) => (
                  <TouchableOpacity
                    key={chip.label}
                    style={styles.sellQuickPctBtn}
                    onPress={() => handleSetPercent(chip.value)}
                  >
                    <Text style={styles.sellQuickPctText}>{chip.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quantity and Selling Price Inputs */}
            <View style={styles.twoColInputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Quantity to Sell *</Text>
                <TextInput
                  style={[styles.textInput, styles.highlightInput]}
                  placeholder={`Max: ${currentQty}`}
                  keyboardType="numeric"
                  value={sellQty}
                  onChangeText={setSellQty}
                />
                {enteredQty > currentQty ? (
                  <Text style={{ color: '#ef4444', fontSize: 11, marginTop: 4, fontWeight: '600' }}>
                    Cannot exceed available {currentQty} {unitLabel}
                  </Text>
                ) : null}
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Selling Price per Unit (₹) *</Text>
                <TextInput
                  style={[styles.textInput, styles.highlightInput]}
                  placeholder="e.g. 1500"
                  keyboardType="numeric"
                  value={sellPrice}
                  onChangeText={setSellPrice}
                />
              </View>
            </View>

            {/* Real-time Profit / Loss and Proceeds Preview */}
            {enteredQty > 0 && enteredPrice > 0 ? (
              <View
                style={[
                  styles.sellPnlPreviewCard,
                  {
                    backgroundColor: isProfit ? '#ecfdf5' : '#fef2f2',
                    borderColor: isProfit ? '#a7f3d0' : '#fecaca',
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '500' }}>Estimated Proceeds:</Text>
                  <Text style={{ fontSize: 14, color: '#0f172a', fontWeight: '700' }}>
                    ₹{saleProceeds.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '500' }}>Realized Gain / Loss:</Text>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color: isProfit ? '#059669' : '#dc2626',
                    }}
                  >
                    {isProfit ? '+' : ''}₹{realizedPnL.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ({isProfit ? '+' : ''}
                    {realizedPnLPct.toFixed(2)}%)
                  </Text>
                </View>

                <View style={{ height: 1, backgroundColor: isProfit ? '#d1fae5' : '#fee2e2', marginVertical: 8 }} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748b' }}>Remaining Balance:</Text>
                  <Text style={{ fontSize: 12, color: '#334155', fontWeight: '600' }}>
                    {Math.max(0, currentQty - enteredQty).toFixed(2)} {unitLabel}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Optional Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Transaction Notes (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Profit booking, rebalancing portfolio..."
                value={sellNotes}
                onChangeText={setSellNotes}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => setSellModalVisible(false)}
                disabled={savingSell}
              >
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  { backgroundColor: '#d97706' },
                  (savingSell || enteredQty <= 0 || enteredQty > currentQty) && { opacity: 0.6 },
                ]}
                onPress={handleExecuteSell}
                disabled={savingSell || enteredQty <= 0 || enteredQty > currentQty}
              >
                {savingSell ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Feather name="check-circle" size={16} color="#fff" />
                    <Text style={styles.btnPrimaryText}>Confirm & Sell</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
