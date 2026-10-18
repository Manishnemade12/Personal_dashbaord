import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import styles from '../styles/financeStyles';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_MODES } from '../constants/financeOptions';

export default function FinanceModals(props) {
  const {
    monthName, isMobile,
    txModalVisible, setTxModalVisible, editingTx, txType, setTxType,
    txCategory, setTxCategory, txAmount, setTxAmount, txDateStr, setTxDateStr,
    txPaymentMode, setTxPaymentMode, txNotes, setTxNotes, savingTx,
    subItems, newSubName, setNewSubName, newSubAmount, setNewSubAmount,
    handleAddSubItem, handleRemoveSubItem, handleSaveTransaction, handleDeleteTransaction,
    budgetModalVisible, setBudgetModalVisible, budgetIncome, setBudgetIncome,
    budgetLimit, setBudgetLimit, budgetInvestmentTarget, setBudgetInvestmentTarget,
    savingBudget, handleSaveBudget, bulkRemoveModalVisible, setBulkRemoveModalVisible,
    selectedTxIds, transactions, toggleSelectAllTx, toggleSelectTx,
    handleConfirmBulkRemove, isDeletingBulk, categoryDetailModalVisible,
    setCategoryDetailModalVisible, detailCategoryName, summary, getCategoryMeta,
    formatDateTime, openAddTxForCategory, openTxModal, investmentDetailModalVisible,
    setInvestmentDetailModalVisible, onNavigate,
  } = props;
  return (
    <>
      {/* MODAL 1: ADD / EDIT TRANSACTION WITH SUB-ITEMS            */}
      {/* ========================================================= */}
      <Modal visible={txModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isMobile && { padding: 12, borderRadius: 14, maxHeight: '94%', width: '96%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                <Text style={[styles.modalTitle, isMobile && { fontSize: 15 }]} numberOfLines={1}>
                  {editingTx ? 'Edit Transaction' : 'Record Transaction'}
                </Text>
                <Text style={[styles.modalSubtitle, isMobile && { fontSize: 11 }]} numberOfLines={1}>Track expenses with itemized sub-details</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setTxModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
              {/* Type Switcher: Expense vs Income */}
              <View style={styles.typeSwitcher}>
                <TouchableOpacity
                  style={[
                    styles.typeTab,
                    txType === 'expense' && styles.typeTabExpenseActive,
                  ]}
                  onPress={() => {
                    setTxType('expense');
                    setTxCategory('Food & Dining');
                  }}
                >
                  <Text
                    style={[
                      styles.typeTabText,
                      txType === 'expense' && styles.typeTabTextActive,
                    ]}
                  >
                    Expense (-)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeTab,
                    txType === 'income' && styles.typeTabIncomeActive,
                  ]}
                  onPress={() => {
                    setTxType('income');
                    setTxCategory('Salary');
                  }}
                >
                  <Text
                    style={[
                      styles.typeTabText,
                      txType === 'income' && styles.typeTabTextActive,
                    ]}
                  >
                    Income (+)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Total Amount Input */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Total Amount (₹) *</Text>
                  {subItems.length > 0 && (
                    <Text style={styles.autoCalculatedBadge}>Auto-summed from items</Text>
                  )}
                </View>
                <TextInput
                  style={[styles.textInput, styles.amountInputBig]}
                  placeholder="e.g. 1500"
                  keyboardType="numeric"
                  value={txAmount}
                  onChangeText={setTxAmount}
                />
              </View>

              {/* Category Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category *</Text>
                <View style={styles.categoryGrid}>
                  {(txType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => {
                    const isSelected = txCategory === cat.name;
                    return (
                      <TouchableOpacity
                        key={cat.name}
                        style={[
                          styles.catPill,
                          isSelected && {
                            borderColor: cat.color,
                            backgroundColor: `${cat.color}18`,
                          },
                        ]}
                        onPress={() => setTxCategory(cat.name)}
                      >
                        <Ionicons
                          name={cat.icon}
                          size={15}
                          color={isSelected ? cat.color : '#64748b'}
                        />
                        <Text
                          style={[
                            styles.catPillText,
                            isSelected && { color: cat.color, fontWeight: '700' },
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* ========================================================= */}
              {/* ITEMIZATION / SUB-ITEMS SECTION (What did you spend on?) */}
              {/* ========================================================= */}
              <View style={styles.subItemSectionCard}>
                <View style={styles.subSectionHeader}>
                  <View style={styles.subSectionTitleWrap}>
                    <Ionicons name="cart-outline" size={16} color="#7e37d8" />
                    <Text style={styles.subSectionTitle}>
                      Itemized Breakdown / Sub-items (Optional)
                    </Text>
                  </View>
                  <Text style={styles.subSectionHint}>
                    e.g. In Food: Pizza ₹450, Coffee ₹150
                  </Text>
                </View>

                {/* Sub-items Add Bar */}
                <View style={styles.addSubItemRow}>
                  <TextInput
                    style={[styles.textInput, styles.subNameInput]}
                    placeholder="Item name (e.g. Pizza, Uber, Milk)"
                    value={newSubName}
                    onChangeText={setNewSubName}
                  />
                  <TextInput
                    style={[styles.textInput, styles.subAmountInput]}
                    placeholder="₹ Amount"
                    keyboardType="numeric"
                    value={newSubAmount}
                    onChangeText={setNewSubAmount}
                  />
                  <TouchableOpacity
                    style={styles.addSubItemBtn}
                    onPress={handleAddSubItem}
                  >
                    <Ionicons name="add" size={18} color="#ffffff" />
                    <Text style={styles.addSubItemBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>

                {/* List of Entered Sub-items */}
                {subItems.length > 0 && (
                  <View style={styles.addedSubItemsList}>
                    {subItems.map((item) => (
                      <View key={item.id} style={styles.addedSubItemRow}>
                        <View style={styles.addedSubItemLeft}>
                          <Ionicons name="ellipse" size={7} color="#7e37d8" style={{ marginRight: 6 }} />
                          <Text style={styles.addedSubItemName}>{item.name}</Text>
                        </View>
                        <View style={styles.addedSubItemRight}>
                          <Text style={styles.addedSubItemAmt}>₹{Number(item.amount).toLocaleString('en-IN')}</Text>
                          <TouchableOpacity
                            style={styles.removeSubItemBtn}
                            onPress={() => handleRemoveSubItem(item.id)}
                          >
                            <Feather name="x" size={14} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}

                    <View style={styles.subItemsTotalBar}>
                      <Text style={styles.subItemsTotalLabel}>Total of Items:</Text>
                      <Text style={styles.subItemsTotalValue}>
                        ₹{subItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Date Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="2026-10-15"
                  value={txDateStr}
                  onChangeText={setTxDateStr}
                />
              </View>

              {/* Payment Mode */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payment Mode</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.payModeRow}>
                  {PAYMENT_MODES.map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.payModePill,
                        txPaymentMode === mode && styles.payModePillActive,
                      ]}
                      onPress={() => setTxPaymentMode(mode)}
                    >
                      <Text
                        style={[
                          styles.payModePillText,
                          txPaymentMode === mode && styles.payModePillTextActive,
                        ]}
                      >
                        {mode}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Description / Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Overall Notes / Location</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Dinner with friends at Bistro"
                  value={txNotes}
                  onChangeText={setTxNotes}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setTxModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText} numberOfLines={1}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { flex: 1.5, marginTop: 0 }]}
                onPress={handleSaveTransaction}
                disabled={savingTx}
                activeOpacity={0.8}
              >
                <Text style={styles.saveBtnText} numberOfLines={1} ellipsizeMode="tail">
                  {savingTx ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: BUDGET & FINANCIAL TARGETS                       */}
      {/* ========================================================= */}
      <Modal visible={budgetModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isMobile && { padding: 12, borderRadius: 14, maxHeight: '94%', width: '96%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                <Text style={[styles.modalTitle, isMobile && { fontSize: 15 }]} numberOfLines={1}>Monthly Budget & Goals</Text>
                <Text style={[styles.modalSubtitle, isMobile && { fontSize: 11 }]} numberOfLines={1}>Targets for {monthName}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setBudgetModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 10 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Expected Monthly Salary / Income (₹)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="100000"
                  keyboardType="numeric"
                  value={budgetIncome}
                  onChangeText={setBudgetIncome}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Monthly Spending Budget Limit (₹)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="45000"
                  keyboardType="numeric"
                  value={budgetLimit}
                  onChangeText={setBudgetLimit}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Monthly Savings / Investment Target (₹)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="35000"
                  keyboardType="numeric"
                  value={budgetInvestmentTarget}
                  onChangeText={setBudgetInvestmentTarget}
                />
              </View>
            </View>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setBudgetModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText} numberOfLines={1}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { flex: 1.5, marginTop: 0 }]}
                onPress={handleSaveBudget}
                disabled={savingBudget}
                activeOpacity={0.8}
              >
                <Text style={styles.saveBtnText} numberOfLines={1} ellipsizeMode="tail">
                  {savingBudget ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 3: BULK / SELECTIVE REMOVE TRANSACTIONS MODAL       */}
      {/* ========================================================= */}
      <Modal visible={bulkRemoveModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.bulkRemoveCard, isMobile && { padding: 12, borderRadius: 14, maxHeight: '94%', width: '96%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                <Text style={[styles.modalHeading, isMobile && { fontSize: 15 }]} numberOfLines={1}>Remove Transactions</Text>
                <Text style={[styles.modalSubheading, isMobile && { fontSize: 11 }]} numberOfLines={1}>
                  Select transactions to delete, or use Select All
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setBulkRemoveModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Select All Bar */}
            <View style={styles.selectAllBar}>
              <TouchableOpacity
                style={styles.selectAllToggle}
                onPress={toggleSelectAllTx}
              >
                <Ionicons
                  name={
                    transactions.length > 0 && selectedTxIds.length === transactions.length
                      ? 'checkbox'
                      : selectedTxIds.length > 0
                      ? 'remove-circle-outline'
                      : 'square-outline'
                  }
                  size={20}
                  color="#7e37d8"
                />
                <Text style={styles.selectAllText}>
                  {selectedTxIds.length === transactions.length && transactions.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </Text>
              </TouchableOpacity>
              <View style={styles.selectedCountBadge}>
                <Text style={styles.selectedCountText}>
                  {selectedTxIds.length} of {transactions.length} selected
                </Text>
              </View>
            </View>

            {/* Transactions List */}
            <ScrollView style={styles.bulkListScroll} showsVerticalScrollIndicator={false}>
              {transactions.length === 0 ? (
                <View style={styles.emptyBulkBox}>
                  <Ionicons name="receipt-outline" size={36} color="#cbd5e1" />
                  <Text style={styles.emptyBulkText}>No transactions found for this month</Text>
                </View>
              ) : (
                transactions.map((tx) => {
                  const isChecked = selectedTxIds.includes(tx._id);
                  const isExpense = tx.type === 'expense';
                  return (
                    <TouchableOpacity
                      key={tx._id}
                      style={[
                        styles.bulkItemRow,
                        isChecked && styles.bulkItemRowActive,
                      ]}
                      onPress={() => toggleSelectTx(tx._id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isChecked ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={isChecked ? '#7e37d8' : '#94a3b8'}
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={styles.flexRowSb}>
                          <Text style={styles.bulkItemCat}>{tx.category}</Text>
                          <Text
                            style={[
                              styles.bulkItemAmt,
                              { color: isExpense ? '#ef4444' : '#10b981' },
                            ]}
                          >
                            {isExpense ? '-' : '+'}₹{Number(tx.amount).toLocaleString('en-IN')}
                          </Text>
                        </View>
                        <Text style={styles.bulkItemDate}>
                          {new Date(tx.date).toLocaleDateString()} • {tx.paymentMode || 'Online'}
                          {tx.notes ? ` • ${tx.notes}` : ''}
                        </Text>
                        {Array.isArray(tx.subItems) && tx.subItems.length > 0 && (
                          <Text style={styles.bulkItemSubText} numberOfLines={1}>
                            Items: {tx.subItems.map((s) => `${s.name} (₹${s.amount})`).join(', ')}
                          </Text>
                        )}
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
                  selectedTxIds.length === 0 && styles.btnDisabled,
                ]}
                onPress={handleConfirmBulkRemove}
                disabled={selectedTxIds.length === 0 || isDeletingBulk}
              >
                <Ionicons name="trash-outline" size={16} color="#ffffff" />
                <Text style={styles.confirmBulkDeleteBtnText}>
                  {isDeletingBulk
                    ? 'Deleting...'
                    : `Remove (${selectedTxIds.length})`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
    </>
  );
}
