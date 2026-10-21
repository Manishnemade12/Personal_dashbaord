import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from './aiImportStyles';

export default function AiHoldingsReviewList({
  holdings = [],
  onToggleSelect,
  onUpdateField,
  onRemoveHolding,
  onAddCustom,
  onConfirm,
  onCancel,
  isSaving = false,
}) {
  const selectedHoldings = holdings.filter((h) => h.isSelected);
  const totalAmount = selectedHoldings.reduce(
    (sum, h) => sum + (Number(h.quantity) || 0) * (Number(h.buyPrice) || 0),
    0
  );
  const mergeCount = selectedHoldings.filter((h) => h.isExisting).length;
  const newCount = selectedHoldings.filter((h) => !h.isExisting).length;

  const handleSwapBuyAndLtp = (id) => {
    const item = holdings.find((h) => h.id === id);
    if (!item) return;
    const oldBuy = item.buyPrice;
    const oldLtp = item.latestPrice || item.buyPrice;
    onUpdateField(id, 'buyPrice', String(oldLtp));
    onUpdateField(id, 'latestPrice', String(oldBuy));
  };

  return (
    <View style={styles.reviewContainer}>
      {/* Review Summary Banner (Fixed Top) */}
      <View style={styles.reviewSummaryBanner}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.reviewSummaryTitle}>
            Review Holdings ({selectedHoldings.length}/{holdings.length})
          </Text>
          <Text style={styles.reviewSummaryNote}>
            {mergeCount} will merge (weighted avg) • {newCount} new assets
          </Text>
        </View>

        <View style={styles.reviewTotalsBadge}>
          <Text style={{ fontSize: 9.5, color: '#6b21a8', fontWeight: '800' }}>TOTAL CAPITAL</Text>
          <Text style={styles.reviewTotalsText}>₹{Math.round(totalAmount).toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* Middle Scrollable Holdings List */}
      <ScrollView
        style={styles.reviewScrollList}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        {holdings.map((item) => {
          const qty = Number(item.quantity) || 0;
          const buy = Number(item.buyPrice) || 0;
          const rowTotal = Math.round(qty * buy);

          // Calculate preview weighted average if existing
          let dynamicNote = item.badgeNote;
          if (item.isExisting && item.existingQuantity) {
            const oldQty = Number(item.existingQuantity);
            const oldAvg = Number(item.existingAverageBuyPrice);
            const newQty = oldQty + qty;
            const newAvg = newQty > 0 ? (oldQty * oldAvg + qty * buy) / newQty : buy;
            dynamicNote = `Currently hold ${oldQty} @ ₹${oldAvg}. Adding ${qty} @ ₹${buy} → New Avg ₹${newAvg.toFixed(2)}`;
          }

          return (
            <View
              key={item.id}
              style={[styles.holdingCard, item.isSelected && styles.holdingCardSelected]}
            >
              {/* Header: Checkbox + Symbol + Name + Delete */}
              <View style={styles.holdingHeaderRow}>
                <TouchableOpacity
                  style={styles.holdingLeftInfo}
                  onPress={() => onToggleSelect(item.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.holdingCheckbox,
                      item.isSelected && styles.holdingCheckboxSelected,
                    ]}
                  >
                    {item.isSelected && <Ionicons name="checkmark" size={13} color="#ffffff" />}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.holdingSymbol} numberOfLines={1}>
                      {item.symbolOrCode}
                    </Text>
                    <Text style={styles.holdingName} numberOfLines={1}>
                      {item.instrumentName || item.symbolOrCode}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteHoldingBtn}
                  onPress={() => onRemoveHolding(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Status Badge Row with Swap Option */}
              <View style={styles.statusBadgeRow}>
                <View style={item.isExisting ? styles.statusBadgeMerge : styles.statusBadgeNew}>
                  <Text style={item.isExisting ? styles.statusTextMerge : styles.statusTextNew}>
                    {item.badgeText || (item.isExisting ? '🟢 Merge With Existing' : '🔵 New Asset')}
                  </Text>
                </View>

                {/* Quick Swap Button if LTP was detected */}
                {Boolean(item.latestPrice) && Number(item.latestPrice) !== Number(item.buyPrice) && (
                  <TouchableOpacity
                    style={styles.swapBtn}
                    onPress={() => handleSwapBuyAndLtp(item.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="swap-horizontal" size={11} color="#64748b" />
                    <Text style={styles.swapBtnText}>Swap with LTP (₹{item.latestPrice})</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Merge Calculation Note */}
              {dynamicNote ? (
                <Text style={styles.mergeCalculationNote}>{dynamicNote}</Text>
              ) : null}

              {/* Editable Fields: Quantity, Buy Price (Avg Cost), and Row Total */}
              <View style={styles.fieldsRow}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Shares (Qty)</Text>
                  <TextInput
                    style={styles.numericInput}
                    value={String(item.quantity || '')}
                    onChangeText={(val) => onUpdateField(item.id, 'quantity', val)}
                    keyboardType="numeric"
                    placeholder="Qty"
                  />
                </View>

                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Buy Price (₹)</Text>
                  <TextInput
                    style={styles.numericInput}
                    value={String(item.buyPrice || '')}
                    onChangeText={(val) => onUpdateField(item.id, 'buyPrice', val)}
                    keyboardType="numeric"
                    placeholder="Avg Buy Price"
                  />
                </View>

                <View style={styles.totalCol}>
                  <Text style={styles.totalLabel}>Total (₹)</Text>
                  <Text style={styles.totalAmountText}>₹{rowTotal.toLocaleString('en-IN')}</Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Add custom holding button */}
        <TouchableOpacity style={styles.addCustomBtn} onPress={onAddCustom} activeOpacity={0.7}>
          <Ionicons name="add-circle-outline" size={15} color="#7e37d8" />
          <Text style={styles.addCustomText}>+ Add Another Asset Manually</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sticky Bottom Review Footer Bar (Always Visible!) */}
      <View style={styles.reviewFooterBar}>
        <TouchableOpacity
          style={[styles.compactSecondaryBtn, { flex: 1 }]}
          onPress={onCancel}
          disabled={isSaving}
          activeOpacity={0.7}
        >
          <Ionicons name="cloud-upload-outline" size={14} color="#334155" />
          <Text style={styles.compactSecondaryBtnText}>Upload</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.compactPrimaryBtn,
            { flex: 1.5 },
            (selectedHoldings.length === 0 || isSaving) && styles.primaryBtnDisabled,
          ]}
          onPress={onConfirm}
          disabled={selectedHoldings.length === 0 || isSaving}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={14} color="#ffffff" />
          <Text style={styles.compactPrimaryBtnText}>
            {isSaving ? 'Adding...' : 'Add'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
