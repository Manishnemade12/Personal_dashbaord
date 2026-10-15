import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator, Image } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import styles from '../styles/investmentStyles';
import { ASSET_CLASSES, ASSET_META } from '../constants/assetOptions';

export default function EditHoldingModal({ data: { editModalVisible, setEditModalVisible, editingHolding, editQuantity, setEditQuantity, editBuyPrice, setEditBuyPrice, editSubCategory, setEditSubCategory, savingEdit, handleSaveEditHolding, handleDeleteHolding } }) {
  return (
<Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Holding</Text>
                <Text style={styles.modalSubtitle}>{editingHolding?.instrumentName}</Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 14 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {editingHolding?.assetClass === 'Mutual Fund' ? 'Units Held' : 'Number of Shares'} *
                </Text>
                <TextInput
                  style={[styles.textInput, styles.highlightInput]}
                  keyboardType="numeric"
                  value={editQuantity}
                  onChangeText={setEditQuantity}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Average Buy Price per Share / Unit (₹) *</Text>
                <TextInput
                  style={[styles.textInput, styles.highlightInput]}
                  keyboardType="numeric"
                  value={editBuyPrice}
                  onChangeText={setEditBuyPrice}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Sub-Category / Notes</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Large Cap, Long Term, Bluechip"
                  value={editSubCategory}
                  onChangeText={setEditSubCategory}
                />
              </View>

              {Number(editQuantity) > 0 && Number(editBuyPrice) > 0 && (
                <View style={styles.calcPreviewCard}>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Updated Invested Value:</Text>
                    <Text style={styles.calcVal}>
                      ₹{(Number(editQuantity) * Number(editBuyPrice)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Current Valuation (Live):</Text>
                    <Text style={styles.calcVal}>
                      ₹{(Number(editQuantity) * (editingHolding?.latestPrice || Number(editBuyPrice))).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSaveEditHolding}
              disabled={savingEdit}
            >
              <Text style={styles.saveBtnText}>
                {savingEdit ? 'Saving...' : 'Update Holding'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
  );
}
