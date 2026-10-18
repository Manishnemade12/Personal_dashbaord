import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { api } from '../../api/client';
import { Ionicons, Feather } from '@expo/vector-icons';
import styles from './styles/financeStyles';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_MODES } from './constants/financeOptions.js';
import FinanceHeader from './components/FinanceHeader';
import FinanceSummarySection from './components/FinanceSummarySection';
import FinanceModals from './components/FinanceModals';

export default function FinanceScreen({ onNavigate }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'expense', 'income'
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTxId, setExpandedTxId] = useState(null);

  // Modals
  const [txModalVisible, setTxModalVisible] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [bulkRemoveModalVisible, setBulkRemoveModalVisible] = useState(false);
  const [selectedTxIds, setSelectedTxIds] = useState([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Drilldown Modals (Category Deep-Dive & Coupled Monthly Investments)
  const [categoryDetailModalVisible, setCategoryDetailModalVisible] = useState(false);
  const [detailCategoryName, setDetailCategoryName] = useState(null);
  const [investmentDetailModalVisible, setInvestmentDetailModalVisible] = useState(false);

  // Transaction Form States
  const [txType, setTxType] = useState('expense');
  const [txCategory, setTxCategory] = useState('Food & Dining');
  const [txAmount, setTxAmount] = useState('');
  const [txDateStr, setTxDateStr] = useState('');
  const [txPaymentMode, setTxPaymentMode] = useState('UPI');
  const [txNotes, setTxNotes] = useState('');
  const [savingTx, setSavingTx] = useState(false);

  // Sub-items breakdown state: [{ id: string, name: string, amount: string }]
  const [subItems, setSubItems] = useState([]);
  const [newSubName, setNewSubName] = useState('');
  const [newSubAmount, setNewSubAmount] = useState('');

  // Budget Form States
  const [budgetIncome, setBudgetIncome] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [budgetInvestmentTarget, setBudgetInvestmentTarget] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  // Format month string YYYY-MM
  const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  useEffect(() => {
    loadData();
  }, [monthStr]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, txsRes] = await Promise.all([
        api.getFinanceSummary(monthStr),
        api.getFinanceTransactions({ month: monthStr }),
      ]);
      setSummary(sumRes);
      setTransactions(Array.isArray(txsRes) ? txsRes : []);

      if (sumRes) {
        setBudgetIncome(String(sumRes.monthlyIncome || ''));
        setBudgetLimit(String(sumRes.spendingLimit || ''));
        setBudgetInvestmentTarget(String(sumRes.investmentTarget || ''));
      }
    } catch (err) {
      console.log('Error loading finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (delta) => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + delta);
    setCurrentDate(next);
  };

  const formatDateTime = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const dateStr = d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeStr = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${dateStr} • ${timeStr}`;
  };

  const openCategoryDetail = (catName) => {
    setDetailCategoryName(catName);
    setCategoryDetailModalVisible(true);
  };

  const openInvestmentDetail = () => {
    setInvestmentDetailModalVisible(true);
  };

  const openAddTxForCategory = (catName) => {
    setCategoryDetailModalVisible(false);
    openTxModal();
    setTxType('expense');
    setTxCategory(catName);
  };

  const openTxModal = (tx = null) => {
    setEditingTx(tx);
    if (tx) {
      setTxType(tx.type || 'expense');
      setTxCategory(tx.category || (tx.type === 'income' ? 'Salary' : 'Food & Dining'));
      setTxAmount(String(tx.amount || ''));
      const d = new Date(tx.date || Date.now());
      setTxDateStr(d.toISOString().split('T')[0]);
      setTxPaymentMode(tx.paymentMode || 'UPI');
      setTxNotes(tx.notes || '');
      setSubItems(
        Array.isArray(tx.subItems)
          ? tx.subItems.map((s, i) => ({ id: s._id || String(i), name: s.name, amount: String(s.amount) }))
          : []
      );
    } else {
      setTxType('expense');
      setTxCategory('Food & Dining');
      setTxAmount('');
      setTxDateStr(new Date().toISOString().split('T')[0]);
      setTxPaymentMode('UPI');
      setTxNotes('');
      setSubItems([]);
    }
    setNewSubName('');
    setNewSubAmount('');
    setTxModalVisible(true);
  };

  // Add a sub-item to the transaction breakdown list
  const handleAddSubItem = () => {
    if (!newSubName.trim()) {
      Alert.alert('Item Name Required', 'Please enter what you spent on (e.g. Pizza, Coffee, Bread)');
      return;
    }
    const parsedAmt = Number(newSubAmount);
    if (!newSubAmount || isNaN(parsedAmt) || parsedAmt <= 0) {
      Alert.alert('Amount Required', 'Please enter a valid amount for this item');
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      name: newSubName.trim(),
      amount: String(parsedAmt),
    };

    const updated = [...subItems, newItem];
    setSubItems(updated);
    setNewSubName('');
    setNewSubAmount('');

    // Automatically recalculate total transaction amount if user wants
    const totalSubSum = updated.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    if (totalSubSum > 0) {
      setTxAmount(String(totalSubSum));
    }
  };

  const handleRemoveSubItem = (id) => {
    const updated = subItems.filter((item) => item.id !== id);
    setSubItems(updated);
    if (updated.length > 0) {
      const totalSubSum = updated.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      setTxAmount(String(totalSubSum));
    }
  };

  const handleSaveTransaction = async () => {
    if (!txAmount || isNaN(Number(txAmount)) || Number(txAmount) <= 0) {
      Alert.alert('Required', 'Please enter a valid amount');
      return;
    }
    if (!txCategory) {
      Alert.alert('Required', 'Please choose a category');
      return;
    }

    setSavingTx(true);
    try {
      // Format subItems for backend
      const formattedSubItems = subItems
        .filter((s) => s.name.trim() && Number(s.amount) > 0)
        .map((s) => ({ name: s.name.trim(), amount: Number(s.amount) }));

      const payload = {
        type: txType,
        category: txCategory,
        amount: Number(txAmount),
        date: txDateStr ? new Date(txDateStr) : new Date(),
        paymentMode: txPaymentMode,
        notes: txNotes.trim(),
        subItems: formattedSubItems,
      };

      if (editingTx?._id) {
        await api.updateFinanceTransaction(editingTx._id, payload);
        Alert.alert('Updated', 'Transaction updated successfully');
      } else {
        await api.createFinanceTransaction(payload);
        Alert.alert('Added', 'Transaction added successfully');
      }

      setTxModalVisible(false);
      loadData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save transaction');
    } finally {
      setSavingTx(false);
    }
  };

  const handleDeleteTransaction = (id, cat, amt) => {
    Alert.alert('Delete Transaction', `Delete this ${cat} entry of ₹${amt}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteFinanceTransaction(id);
            loadData();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete transaction');
          }
        },
      },
    ]);
  };

  const handleSaveBudget = async () => {
    setSavingBudget(true);
    try {
      await api.saveFinanceBudget({
        month: monthStr,
        monthlyIncome: Number(budgetIncome) || 0,
        spendingLimit: Number(budgetLimit) || 0,
        investmentTarget: Number(budgetInvestmentTarget) || 0,
      });
      Alert.alert('Success', 'Monthly budget targets updated');
      setBudgetModalVisible(false);
      loadData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save budget');
    } finally {
      setSavingBudget(false);
    }
  };

  // Open selective / bulk remove modal
  const openBulkRemoveModal = () => {
    setSelectedTxIds([]);
    setBulkRemoveModalVisible(true);
  };

  const toggleSelectTx = (id) => {
    setSelectedTxIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllTx = () => {
    if (selectedTxIds.length === transactions.length) {
      setSelectedTxIds([]);
    } else {
      setSelectedTxIds(transactions.map((t) => t._id));
    }
  };

  const handleConfirmBulkRemove = async () => {
    if (selectedTxIds.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one transaction to remove.');
      return;
    }

    Alert.alert(
      'Remove Selected Transactions',
      `Are you sure you want to delete ${selectedTxIds.length} transaction(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Delete (${selectedTxIds.length})`,
          style: 'destructive',
          onPress: async () => {
            setIsDeletingBulk(true);
            try {
              if (selectedTxIds.length === transactions.length) {
                await api.clearAllFinance();
              } else {
                await Promise.all(selectedTxIds.map((id) => api.deleteFinanceTransaction(id)));
              }
              Alert.alert('Removed', `${selectedTxIds.length} transaction(s) removed successfully.`);
              setBulkRemoveModalVisible(false);
              setSelectedTxIds([]);
              loadData();
            } catch (e) {
              Alert.alert('Error', 'Failed to remove selected transactions');
            } finally {
              setIsDeletingBulk(false);
            }
          },
        },
      ]
    );
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    if (selectedCategoryFilter !== 'all' && tx.category !== selectedCategoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inNotes = tx.notes?.toLowerCase().includes(q);
      const inCat = tx.category?.toLowerCase().includes(q);
      const inSubItems = Array.isArray(tx.subItems) && tx.subItems.some((s) => s.name?.toLowerCase().includes(q));
      if (!inNotes && !inCat && !inSubItems) return false;
    }
    return true;
  });

  const getCategoryMeta = (catName, type) => {
    const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    return list.find((c) => c.name === catName) || { icon: 'pricetag-outline', color: '#64748b' };
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={{ flex: 1 }}>
          <FinanceHeader
            isMobile={isMobile}
            monthName={monthName}
            changeMonth={changeMonth}
            onOpenBudget={() => setBudgetModalVisible(true)}
            onOpenBulkRemove={openBulkRemoveModal}
            onAddTransaction={() => openTxModal()}
          />
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color="#7e37d8" />
            <Text style={styles.loadingText}>Loading financial overview...</Text>
          </View>
        </View>
      ) : (
        <ScrollView
          style={[styles.contentScroll, isMobile && { padding: 8 }]}
          showsVerticalScrollIndicator={false}
        >
          <FinanceHeader
            isMobile={isMobile}
            monthName={monthName}
            changeMonth={changeMonth}
            onOpenBudget={() => setBudgetModalVisible(true)}
            onOpenBulkRemove={openBulkRemoveModal}
            onAddTransaction={() => openTxModal()}
          />
          <FinanceSummarySection
            summary={summary}
            isMobile={isMobile}
            onOpenInvestmentDetail={openInvestmentDetail}
            onNavigate={onNavigate}
          />

          {/* 4. Category Breakdown & Spending Trends Grid */}
          <View style={[styles.breakdownRow, isMobile && { flexDirection: 'column' }]}>
            {/* Left: Category Breakdown Bars (Click to open full end-to-end breakdown!) */}
            <View style={[styles.categoryCard, isMobile && { minWidth: '100%', width: '100%', padding: 12 }]}>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={[styles.sectionHeaderTitle, isMobile && { fontSize: 15 }]}>Spending by Category</Text>
                  <Text style={styles.sectionHeaderSub}>Tap any category to view itemized breakdown</Text>
                </View>
              </View>
              {summary?.categoryBreakdown?.length === 0 ? (
                <Text style={styles.emptyNotice}>No expense records for this month yet</Text>
              ) : (
                summary?.categoryBreakdown?.map((cat) => {
                  const meta = getCategoryMeta(cat.category, 'expense');
                  const isFiltered = selectedCategoryFilter === cat.category;
                  return (
                    <TouchableOpacity
                      key={cat.category}
                      style={[styles.catBarItem, isFiltered && styles.catBarItemActive]}
                      onPress={() => openCategoryDetail(cat.category)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.catBarHeader}>
                        <View style={styles.catNameWrap}>
                          <View
                            style={[
                              styles.catDot,
                              { backgroundColor: meta.color || '#64748b' },
                            ]}
                          />
                          <Text style={styles.catNameText} numberOfLines={1}>{cat.category}</Text>
                          {cat.count > 0 && (
                            <View style={styles.catCountBadge}>
                              <Text style={styles.catCountText}>{cat.count}</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.catRightCol}>
                          <Text style={styles.catAmountText}>
                            ₹{(cat.amount || 0).toLocaleString('en-IN')} ({cat.percent || 0}%)
                          </Text>
                          <Text style={styles.catClickHint}>Inspect details →</Text>
                        </View>
                      </View>
                      <View style={styles.catBarTrack}>
                        <View
                          style={[
                            styles.catBarFill,
                            {
                              width: `${Math.min(100, cat.percent)}%`,
                              backgroundColor: meta.color || '#64748b',
                            },
                          ]}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* Right: Daily Spending Trends Bar Chart */}
            <View style={[styles.trendsCard, isMobile && { minWidth: '100%', width: '100%' }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>Daily Expense Trend</Text>
                <Text style={styles.sectionHeaderSub}>Spending distribution across {monthName}</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
                <View style={styles.chartBarsContainer}>
                  {summary?.dailySpending?.map((item) => {
                    const maxVal = Math.max(
                      ...summary.dailySpending.map((d) => d.amount),
                      1000
                    );
                    const barHeight = Math.max(4, (item.amount / maxVal) * 110);
                    const hasSpend = item.amount > 0;

                    return (
                      <View key={item.day} style={styles.trendCol}>
                        <View style={styles.barWrap}>
                          <View
                            style={[
                              styles.trendBar,
                              {
                                height: barHeight,
                                backgroundColor: hasSpend ? '#7e37d8' : '#e2e8f0',
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.dayLabel, hasSpend && { color: '#7e37d8', fontWeight: '700' }]}>
                          {item.day}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>

          {/* 5. Transaction History & Filter Section */}
          <View style={[styles.txListCard, isMobile && { padding: 12 }]}>
            <View style={[styles.txListHeader, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.sectionHeaderTitle, isMobile && { fontSize: 15 }]}>Transactions & Itemized Records</Text>
                <Text style={[styles.sectionHeaderSub, isMobile && { fontSize: 11 }]}>
                  Showing {filteredTransactions.length} of {transactions.length} entries
                </Text>
              </View>
              <View style={[styles.txFilterRow, isMobile && { width: '100%', justifyContent: 'space-between', padding: 2 }]}>
                {['all', 'expense', 'income'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.txFilterPill,
                      isMobile && { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 5 },
                      typeFilter === type && styles.txFilterPillActive,
                    ]}
                    onPress={() => setTypeFilter(type)}
                  >
                    <Text
                      style={[
                        styles.txFilterPillText,
                        isMobile && { fontSize: 11 },
                        typeFilter === type && styles.txFilterPillTextActive,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Search and Active Filter Indicator */}
            <View style={[styles.txSearchRow, isMobile && { gap: 6, marginBottom: 10 }]}>
              <View style={[styles.searchInputWrap, isMobile && { height: 36, paddingHorizontal: 10 }]}>
                <Ionicons name="search-outline" size={15} color="#94a3b8" />
                <TextInput
                  style={[styles.searchField, isMobile && { fontSize: 12, height: 34 }]}
                  placeholder="Search item name, notes, or category..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={15} color="#94a3b8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {selectedCategoryFilter !== 'all' && (
                <TouchableOpacity
                  style={[styles.categoryFilterClearTag, isMobile && { paddingVertical: 6, paddingHorizontal: 8 }]}
                  onPress={() => setSelectedCategoryFilter('all')}
                >
                  <Text style={[styles.categoryFilterClearText, isMobile && { fontSize: 10 }]}>
                    Filter: {selectedCategoryFilter} ✕
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Transaction Items */}
            {filteredTransactions.length === 0 ? (
              <View style={styles.emptyTxWrap}>
                <Ionicons name="receipt-outline" size={44} color="#cbd5e1" />
                <Text style={styles.emptyTxText}>No transactions found for this filter</Text>
              </View>
            ) : (
              filteredTransactions.map((tx) => {
                const isIncome = tx.type === 'income';
                const meta = getCategoryMeta(tx.category, tx.type);
                const isExpanded = expandedTxId === tx._id;
                const hasSubItems = Array.isArray(tx.subItems) && tx.subItems.length > 0;

                return (
                  <View key={tx._id} style={styles.txRow}>
                    <TouchableOpacity
                      style={styles.txMainContentRow}
                      onPress={() => openCategoryDetail(tx.category)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.txCatIcon,
                          { backgroundColor: `${meta.color || '#64748b'}18` },
                          isMobile && { width: 34, height: 34, borderRadius: 8, marginRight: 8 },
                        ]}
                      >
                        <Ionicons
                          name={meta.icon || 'pricetag-outline'}
                          size={isMobile ? 16 : 20}
                          color={meta.color || '#64748b'}
                        />
                      </View>

                      <View style={[styles.txInfoCol, { flex: 1, minWidth: 0, marginRight: 8 }]}>
                        <View style={styles.txTitleRow}>
                          <Text style={[styles.txCategoryName, isMobile && { fontSize: 13 }]} numberOfLines={1}>{tx.category}</Text>
                          <View style={styles.paymentBadge}>
                            <Text style={[styles.paymentBadgeText, isMobile && { fontSize: 9 }]}>{tx.paymentMode || 'UPI'}</Text>
                          </View>
                          {hasSubItems && (
                            <TouchableOpacity
                              style={[styles.subItemBadge, isMobile && { paddingHorizontal: 6, paddingVertical: 1 }]}
                              onPress={() => setExpandedTxId(isExpanded ? null : tx._id)}
                            >
                              <Ionicons name="list-outline" size={11} color="#7e37d8" />
                              <Text style={[styles.subItemBadgeText, isMobile && { fontSize: 9 }]}>
                                {tx.subItems.length} items {isExpanded ? '▲' : '▼'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <Text style={[styles.txNotes, isMobile && { fontSize: 11 }]} numberOfLines={1}>
                          {tx.notes ? `${tx.notes} • ` : ''}
                          {formatDateTime(tx.date)}
                        </Text>
                      </View>

                      <View style={[styles.txAmountCol, { alignItems: 'flex-end', flexShrink: 0 }]}>
                        <Text
                          style={[
                            styles.txAmountText,
                            isIncome ? styles.textIncome : styles.textExpense,
                            isMobile && { fontSize: 13, marginBottom: 2 },
                          ]}
                        >
                          {isIncome ? '+' : '-'}₹{(tx.amount || 0).toLocaleString('en-IN')}
                        </Text>
                        <View style={[styles.txActionBtns, isMobile && { gap: 6 }]}>
                          <TouchableOpacity
                            style={styles.actionIconBtn}
                            onPress={() => openTxModal(tx)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Feather name="edit-2" size={13} color="#64748b" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionIconBtn}
                            onPress={() =>
                              handleDeleteTransaction(tx._id, tx.category, tx.amount)
                            }
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Feather name="trash-2" size={13} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Expandable Sub-items Breakdown */}
                    {hasSubItems && (isExpanded || subItems.length > 0) && (
                      <View style={[styles.subItemsBreakdownCard, isMobile && { marginLeft: 0, marginTop: 8, padding: 8 }]}>
                        <View style={styles.subItemBreakdownHeader}>
                          <Ionicons name="receipt-outline" size={13} color="#7e37d8" />
                          <Text style={[styles.subItemBreakdownTitle, isMobile && { fontSize: 11 }]}>Itemized Details & Bill Breakdown:</Text>
                        </View>
                        <View style={styles.subItemChipsWrap}>
                          {tx.subItems.map((sub, idx) => (
                            <View key={sub._id || idx} style={styles.subItemChip}>
                              <Text style={styles.subItemChipName}>{sub.name}</Text>
                              <Text style={styles.subItemChipAmount}>₹{Number(sub.amount || 0).toLocaleString('en-IN')}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ========================================================= */}
      <FinanceModals
        monthName={monthName}
        isMobile={isMobile}
        txModalVisible={txModalVisible} setTxModalVisible={setTxModalVisible}
        editingTx={editingTx} txType={txType} setTxType={setTxType}
        txCategory={txCategory} setTxCategory={setTxCategory}
        txAmount={txAmount} setTxAmount={setTxAmount} txDateStr={txDateStr} setTxDateStr={setTxDateStr}
        txPaymentMode={txPaymentMode} setTxPaymentMode={setTxPaymentMode}
        txNotes={txNotes} setTxNotes={setTxNotes} savingTx={savingTx}
        subItems={subItems} newSubName={newSubName} setNewSubName={setNewSubName}
        newSubAmount={newSubAmount} setNewSubAmount={setNewSubAmount}
        handleAddSubItem={handleAddSubItem} handleRemoveSubItem={handleRemoveSubItem}
        handleSaveTransaction={handleSaveTransaction} handleDeleteTransaction={handleDeleteTransaction}
        budgetModalVisible={budgetModalVisible} setBudgetModalVisible={setBudgetModalVisible}
        budgetIncome={budgetIncome} setBudgetIncome={setBudgetIncome}
        budgetLimit={budgetLimit} setBudgetLimit={setBudgetLimit}
        budgetInvestmentTarget={budgetInvestmentTarget} setBudgetInvestmentTarget={setBudgetInvestmentTarget}
        savingBudget={savingBudget} handleSaveBudget={handleSaveBudget}
        bulkRemoveModalVisible={bulkRemoveModalVisible} setBulkRemoveModalVisible={setBulkRemoveModalVisible}
        selectedTxIds={selectedTxIds} transactions={transactions} toggleSelectAllTx={toggleSelectAllTx}
        toggleSelectTx={toggleSelectTx} handleConfirmBulkRemove={handleConfirmBulkRemove}
        isDeletingBulk={isDeletingBulk} categoryDetailModalVisible={categoryDetailModalVisible}
        setCategoryDetailModalVisible={setCategoryDetailModalVisible} detailCategoryName={detailCategoryName}
        summary={summary} getCategoryMeta={getCategoryMeta} formatDateTime={formatDateTime}
        openAddTxForCategory={openAddTxForCategory} openTxModal={openTxModal}
        investmentDetailModalVisible={investmentDetailModalVisible}
        setInvestmentDetailModalVisible={setInvestmentDetailModalVisible} onNavigate={onNavigate}
      />
    </View>
  );
}
