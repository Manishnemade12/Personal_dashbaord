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
      {/* MODAL 4: CATEGORY END-TO-END DETAIL DRILLDOWN             */}
      {/* ========================================================= */}
      <Modal visible={categoryDetailModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.categoryDrilldownCard}>
            {(() => {
              const catMeta = getCategoryMeta(detailCategoryName, 'expense');
              const catSummary = summary?.categoryBreakdown?.find((c) => c.category === detailCategoryName);
              const categoryTxs = transactions.filter((tx) => tx.category === detailCategoryName);
              const totalCatAmount = catSummary?.amount || categoryTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

              return (
                <>
                  {/* Modal Header */}
                  <View style={styles.modalHeader}>
                    <View style={styles.catDrillHeaderLeft}>
                      <View style={[styles.catDrillIconBadge, { backgroundColor: `${catMeta.color || '#64748b'}20` }]}>
                        <Ionicons name={catMeta.icon || 'pricetag'} size={24} color={catMeta.color || '#64748b'} />
                      </View>
                      <View>
                        <Text style={styles.catDrillTitle}>{detailCategoryName}</Text>
                        <Text style={styles.catDrillSubtitle}>End-to-End Itemized Activity & Breakdown</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setCategoryDetailModalVisible(false)}>
                      <Ionicons name="close" size={24} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  {/* Category Summary Stats Banner */}
                  <View style={styles.catDrillStatsBanner}>
                    <View style={styles.catDrillStatItem}>
                      <Text style={styles.catDrillStatLabel}>Total Spent</Text>
                      <Text style={[styles.catDrillStatVal, { color: catMeta.color || '#0f172a' }]}>
                        ₹{totalCatAmount.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <View style={styles.catDrillStatDivider} />
                    <View style={styles.catDrillStatItem}>
                      <Text style={styles.catDrillStatLabel}>Share of Expenses</Text>
                      <Text style={styles.catDrillStatVal}>
                        {catSummary?.percent || 0}%
                      </Text>
                    </View>
                    <View style={styles.catDrillStatDivider} />
                    <View style={styles.catDrillStatItem}>
                      <Text style={styles.catDrillStatLabel}>Transactions</Text>
                      <Text style={styles.catDrillStatVal}>
                        {categoryTxs.length} entries
                      </Text>
                    </View>
                  </View>

                  {/* Chronological Itemized List */}
                  <ScrollView style={styles.catDrillScroll} showsVerticalScrollIndicator={false}>
                    {categoryTxs.length === 0 ? (
                      <View style={styles.emptyDrillWrap}>
                        <Ionicons name="receipt-outline" size={42} color="#cbd5e1" />
                        <Text style={styles.emptyDrillTitle}>No recorded transactions</Text>
                        <Text style={styles.emptyDrillSub}>Tap below to add an expense under {detailCategoryName}</Text>
                      </View>
                    ) : (
                      categoryTxs.map((tx) => {
                        const hasSubItems = Array.isArray(tx.subItems) && tx.subItems.length > 0;
                        return (
                          <View key={tx._id} style={styles.drillTxCard}>
                            {/* Header: Kab (When) + Kitna (How much) */}
                            <View style={styles.drillTxTopRow}>
                              <View style={styles.drillTxWhenRow}>
                                <Ionicons name="time-outline" size={14} color="#64748b" />
                                <Text style={styles.drillTxDateText}>
                                  {formatDateTime(tx.date)}
                                </Text>
                                <View style={styles.drillPaymentTag}>
                                  <Text style={styles.drillPaymentTagText}>{tx.paymentMode || 'UPI'}</Text>
                                </View>
                              </View>
                              <Text style={styles.drillTxAmount}>
                                ₹{(tx.amount || 0).toLocaleString('en-IN')}
                              </Text>
                            </View>

                            {/* Kya: Notes / Description */}
                            <View style={styles.drillTxNotesRow}>
                              <Text style={styles.drillTxNoteLabel}>Item / Description:</Text>
                              <Text style={styles.drillTxNoteText}>
                                {tx.notes || `${tx.category} Expense`}
                              </Text>
                            </View>

                            {/* Itemized Sub-Items Bill Breakdown */}
                            {hasSubItems && (
                              <View style={styles.drillSubItemsCard}>
                                <View style={styles.drillSubHeader}>
                                  <Ionicons name="receipt-outline" size={13} color="#7e37d8" />
                                  <Text style={styles.drillSubTitle}>Itemized Details & Bill Breakdown:</Text>
                                </View>
                                {tx.subItems.map((sub, idx) => (
                                  <View key={sub._id || idx} style={styles.drillSubRow}>
                                    <View style={styles.drillSubDot} />
                                    <Text style={styles.drillSubName}>{sub.name}</Text>
                                    <Text style={styles.drillSubAmount}>
                                      ₹{Number(sub.amount || 0).toLocaleString('en-IN')}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            )}

                            {/* Action Buttons: Edit / Delete */}
                            <View style={styles.drillActionsRow}>
                              <TouchableOpacity
                                style={styles.drillEditBtn}
                                onPress={() => {
                                  setCategoryDetailModalVisible(false);
                                  openTxModal(tx);
                                }}
                              >
                                <Feather name="edit-2" size={13} color="#3b82f6" />
                                <Text style={styles.drillEditBtnText}>Edit</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.drillDeleteBtn}
                                onPress={() => {
                                  handleDeleteTransaction(tx._id, tx.category, tx.amount);
                                }}
                              >
                                <Feather name="trash-2" size={13} color="#ef4444" />
                                <Text style={styles.drillDeleteBtnText}>Delete</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </ScrollView>

                  {/* Modal Footer: Quick Add under this Category */}
                  <View style={styles.catDrillFooter}>
                    <TouchableOpacity
                      style={styles.drillAddBtn}
                      onPress={() => openAddTxForCategory(detailCategoryName)}
                    >
                      <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
                      <Text style={styles.drillAddBtnText}>
                        + Add Expense under {detailCategoryName}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 5: MONTHLY INVESTMENTS & WEALTH DRILLDOWN           */}
      {/* ========================================================= */}
      <Modal visible={investmentDetailModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.investmentsDrilldownCard}>
            <View style={styles.modalHeader}>
              <View style={styles.invDrillHeaderLeft}>
                <View style={styles.invDrillIconBadge}>
                  <Ionicons name="trending-up" size={24} color="#7e37d8" />
                </View>
                <View>
                  <Text style={styles.invDrillTitle}>Monthly Wealth Deployments</Text>
                  <Text style={styles.invDrillSubtitle}>
                    Kisme kitna paisa invest kiya • {monthName}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setInvestmentDetailModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Investment Target vs Real Deployment Banner */}
            <View style={styles.invDrillStatsBanner}>
              <View style={styles.invDrillStatItem}>
                <Text style={styles.invDrillStatLabel}>Invested This Month</Text>
                <Text style={[styles.invDrillStatVal, { color: '#7e37d8' }]}>
                  ₹{(summary?.monthlyInvested || 0).toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.invDrillStatDivider} />
              <View style={styles.invDrillStatItem}>
                <Text style={styles.invDrillStatLabel}>Target Goal</Text>
                <Text style={styles.invDrillStatVal}>
                  ₹{(summary?.investmentTarget || 0).toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.invDrillStatDivider} />
              <View style={styles.invDrillStatItem}>
                <Text style={styles.invDrillStatLabel}>Target Status</Text>
                <Text style={[styles.invDrillStatVal, { color: summary?.investmentTargetProgress >= 100 ? '#10b981' : '#7e37d8' }]}>
                  {summary?.investmentTargetProgress || 0}%
                </Text>
              </View>
            </View>

            {/* Asset Class Distribution */}
            {Array.isArray(summary?.investedByAssetClass) && summary.investedByAssetClass.length > 0 && (
              <View style={styles.invDrillAssetClassWrap}>
                <Text style={styles.invDrillAssetSectionTitle}>Asset Allocation this Month:</Text>
                <View style={styles.invDrillAssetPills}>
                  {summary.investedByAssetClass.map((ac) => (
                    <View key={ac.assetClass} style={styles.invDrillAssetPill}>
                      <Text style={styles.invDrillAssetPillName}>{ac.assetClass}:</Text>
                      <Text style={styles.invDrillAssetPillAmt}>₹{ac.amount.toLocaleString('en-IN')} ({ac.percent}%)</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Transactions Feed */}
            <ScrollView style={styles.invDrillScroll} showsVerticalScrollIndicator={false}>
              {(!summary?.investmentTransactionsThisMonth || summary.investmentTransactionsThisMonth.length === 0) ? (
                <View style={styles.emptyDrillWrap}>
                  <Ionicons name="bar-chart-outline" size={42} color="#cbd5e1" />
                  <Text style={styles.emptyDrillTitle}>No investment purchases this month</Text>
                  <Text style={styles.emptyDrillSub}>
                    Buy stocks or mutual funds in the Investment Tracker to automatically record investments here.
                  </Text>
                </View>
              ) : (
                summary.investmentTransactionsThisMonth.map((itx) => (
                  <View key={itx._id} style={styles.invTxCard}>
                    <View style={styles.invTxTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.invTxName} numberOfLines={1}>{itx.instrumentName}</Text>
                        <View style={styles.invTxMetaRow}>
                          <Text style={styles.invTxSymbol}>{itx.symbolOrCode}</Text>
                          <View style={styles.invTxClassTag}>
                            <Text style={styles.invTxClassText}>{itx.assetClass}</Text>
                          </View>
                        </View>
                      </View>
                      <Text style={styles.invTxAmount}>
                        ₹{Number(itx.totalAmount || 0).toLocaleString('en-IN')}
                      </Text>
                    </View>

                    <View style={styles.invTxDetailsRow}>
                      <View style={styles.invTxDetailBadge}>
                        <Text style={styles.invTxDetailText}>
                          {itx.units} units @ ₹{itx.pricePerUnit} / unit
                        </Text>
                      </View>
                      <Text style={styles.invTxDate}>
                        {formatDateTime(itx.date)}
                      </Text>
                    </View>

                    {itx.notes ? (
                      <Text style={styles.invTxNote} numberOfLines={2}>
                        {itx.notes}
                      </Text>
                    ) : null}
                  </View>
                ))
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.invDrillFooter}>
              {onNavigate && (
                <TouchableOpacity
                  style={styles.invGoToPortfolioBtn}
                  onPress={() => {
                    setInvestmentDetailModalVisible(false);
                    onNavigate('Investments');
                  }}
                >
                  <Ionicons name="pie-chart" size={16} color="#ffffff" />
                  <Text style={styles.invGoToPortfolioBtnText}>
                    Open Wealth & Portfolio Tracker
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
