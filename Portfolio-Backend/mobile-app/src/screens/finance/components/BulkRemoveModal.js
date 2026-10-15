import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator, Image } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import styles from '../styles/investmentStyles';
import { ASSET_CLASSES, ASSET_META } from '../constants/assetOptions';

export default function BulkRemoveModal({ data: { bulkRemoveModalVisible, setBulkRemoveModalVisible, selectedHoldingIds, holdings, toggleSelectAllHoldings, toggleSelectHolding, handleConfirmBulkRemoveHoldings, isDeletingBulk } }) {
  return (
<Modal visible={bulkRemoveModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.bulkRemoveCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeading}>Remove Holdings</Text>
                <Text style={styles.modalSubheading}>
                  Select assets to remove from your tracker, or use Select All
                </Text>
              </View>
              <TouchableOpacity onPress={() => setBulkRemoveModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Select All Bar */}
            <View style={styles.selectAllBar}>
              <TouchableOpacity
                style={styles.selectAllToggle}
                onPress={toggleSelectAllHoldings}
              >
                <Ionicons
                  name={
                    holdings.length > 0 && selectedHoldingIds.length === holdings.length
                      ? 'checkbox'
                      : selectedHoldingIds.length > 0
                      ? 'remove-circle-outline'
                      : 'square-outline'
                  }
                  size={20}
                  color="#3b82f6"
                />
                <Text style={styles.selectAllText}>
                  {selectedHoldingIds.length === holdings.length && holdings.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </Text>
              </TouchableOpacity>
              <View style={styles.selectedCountBadge}>
                <Text style={styles.selectedCountText}>
                  {selectedHoldingIds.length} of {holdings.length} selected
                </Text>
              </View>
            </View>

            {/* Holdings List */}
            <ScrollView style={styles.bulkListScroll} showsVerticalScrollIndicator={false}>
              {holdings.length === 0 ? (
                <View style={styles.emptyBulkBox}>
                  <Ionicons name="layers-outline" size={36} color="#cbd5e1" />
                  <Text style={styles.emptyBulkText}>No assets currently in portfolio</Text>
                </View>
              ) : (
                holdings.map((h) => {
                  const isChecked = selectedHoldingIds.includes(h._id);
                  return (
                    <TouchableOpacity
                      key={h._id}
                      style={[
                        styles.bulkItemRow,
                        isChecked && styles.bulkItemRowActive,
                      ]}
                      onPress={() => toggleSelectHolding(h._id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isChecked ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={isChecked ? '#3b82f6' : '#94a3b8'}
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={styles.flexRowSb}>
                          <Text style={styles.bulkItemCat}>{h.instrumentName}</Text>
                          <Text style={styles.bulkItemAmt}>
                            ₹{Number(h.investedValue || (h.quantity * (h.averageBuyPrice || 0))).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </Text>
                        </View>
                        <Text style={styles.bulkItemDate}>
                          {h.symbolOrCode} • {h.assetClass} ({h.subCategory || 'Asset'})
                        </Text>
                        <Text style={styles.bulkItemSubText}>
                          Qty: {h.quantity} • Buy: ₹{h.averageBuyPrice} • Live: ₹{h.latestPrice}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Footer Actions */}
            <View style={styles.bulkModalFooter}>
              <TouchableOpacity
                style={styles.cancelBulkBtn}
                onPress={() => setBulkRemoveModalVisible(false)}
              >
                <Text style={styles.cancelBulkBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmBulkDeleteBtn,
                  selectedHoldingIds.length === 0 && styles.btnDisabled,
                ]}
                onPress={handleConfirmBulkRemoveHoldings}
                disabled={selectedHoldingIds.length === 0 || isDeletingBulk}
              >
                <Ionicons name="trash-outline" size={16} color="#ffffff" />
                <Text style={styles.confirmBulkDeleteBtnText}>
                  {isDeletingBulk
                    ? 'Removing...'
                    : `Remove (${selectedHoldingIds.length})`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
  );
}
