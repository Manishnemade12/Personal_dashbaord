import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { ASSET_META } from '../constants/assetOptions';

export default function HoldingHistoryModal({
  visible,
  holding,
  transactions,
  isLoading,
  onClose,
  onAddMore,
  onSell,
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  if (!holding) return null;

  const meta = ASSET_META[holding.assetClass] || {
    icon: 'layers-outline',
    color: '#64748b',
    bg: '#f1f5f9',
    unit: 'Units',
  };

  const isProfit = (holding.pnl || 0) >= 0;
  const currentPrice = holding.latestPrice || holding.averageBuyPrice || 0;
  const investedVal = holding.investedValue || holding.quantity * holding.averageBuyPrice || 0;
  const currentVal = holding.currentValue || holding.quantity * currentPrice || 0;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={modalStyles.backdrop}>
        <TouchableOpacity
          style={modalStyles.backdropDismiss}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[modalStyles.modalContainer, isMobile && modalStyles.modalContainerMobile]}>
          {/* 1. Header with Title & Prominent Close Button */}
          <View style={modalStyles.modalHeader}>
            <View style={modalStyles.headerTitleRow}>
              <View style={[modalStyles.assetIconBox, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon} size={20} color={meta.color} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={modalStyles.symbolBadgeRow}>
                  <Text style={modalStyles.symbolText} numberOfLines={1}>{holding.symbolOrCode}</Text>
                  <View style={modalStyles.categoryBadge}>
                    <Text style={modalStyles.categoryBadgeText}>
                      {holding.subCategory || holding.assetClass}
                    </Text>
                  </View>
                </View>
                <Text style={modalStyles.instrumentName} numberOfLines={1}>
                  {holding.instrumentName}
                </Text>
              </View>
            </View>

            {/* Prominent Close Button */}
            <TouchableOpacity
              style={modalStyles.closeIconBtn}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* 2. Scrollable Modal Content */}
          <ScrollView
            style={modalStyles.scrollBody}
            contentContainerStyle={modalStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Summary Metrics Grid */}
            <View style={modalStyles.summaryGrid}>
              {/* Total Units */}
              <View style={modalStyles.summaryCard}>
                <Text style={modalStyles.summaryLabel}>Total Units</Text>
                <Text style={modalStyles.summaryVal}>{holding.quantity} {meta.unit}</Text>
                <Text style={modalStyles.summarySub}>Currently held</Text>
              </View>

              {/* Avg Buy Price */}
              <View style={modalStyles.summaryCard}>
                <Text style={modalStyles.summaryLabel}>Average Buy</Text>
                <Text style={modalStyles.summaryVal}>
                  ₹{(holding.averageBuyPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={modalStyles.summarySub}>Per unit cost</Text>
              </View>

              {/* Current Live Price */}
              <View style={modalStyles.summaryCard}>
                <Text style={modalStyles.summaryLabel}>Live Price</Text>
                <Text style={[modalStyles.summaryVal, { color: '#0f172a' }]}>
                  ₹{(holding.latestPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
                <View style={modalStyles.liveTagRow}>
                  <View style={modalStyles.liveDot} />
                  <Text style={modalStyles.liveTagText}>Market Feed</Text>
                </View>
              </View>

              {/* Total Invested */}
              <View style={modalStyles.summaryCard}>
                <Text style={modalStyles.summaryLabel}>Total Invested</Text>
                <Text style={modalStyles.summaryVal}>
                  ₹{Math.round(investedVal).toLocaleString('en-IN')}
                </Text>
                <Text style={modalStyles.summarySub}>Capital deployed</Text>
              </View>

              {/* Current Valuation */}
              <View style={modalStyles.summaryCard}>
                <Text style={modalStyles.summaryLabel}>Current Valuation</Text>
                <Text style={[modalStyles.summaryVal, { color: '#1e40af' }]}>
                  ₹{Math.round(currentVal).toLocaleString('en-IN')}
                </Text>
                <Text style={modalStyles.summarySub}>At market price</Text>
              </View>

              {/* Total Returns */}
              <View style={[modalStyles.summaryCard, { backgroundColor: isProfit ? '#f0fdf4' : '#fef2f2', borderColor: isProfit ? '#bbf7d0' : '#fecaca' }]}>
                <Text style={[modalStyles.summaryLabel, { color: isProfit ? '#166534' : '#991b1b' }]}>Overall Return</Text>
                <Text style={[modalStyles.summaryVal, { color: isProfit ? '#059669' : '#dc2626' }]}>
                  {isProfit ? '+' : ''}₹{Math.round(holding.pnl || 0).toLocaleString('en-IN')}
                </Text>
                <Text style={[modalStyles.summarySub, { color: isProfit ? '#059669' : '#dc2626', fontWeight: '700' }]}>
                  {isProfit ? '▲ +' : '▼ '}{holding.pnlPercent || 0}%
                </Text>
              </View>
            </View>

            {/* 3. Transaction History Section */}
            <View style={modalStyles.timelineSection}>
              <View style={modalStyles.timelineSectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="time-outline" size={16} color="#475569" />
                  <Text style={modalStyles.timelineTitle}>Transaction History</Text>
                </View>
                <Text style={modalStyles.timelineBadge}>
                  {transactions ? `${transactions.length} record(s)` : 'Loading...'}
                </Text>
              </View>

              {isLoading ? (
                <View style={modalStyles.loadingBox}>
                  <ActivityIndicator size="small" color="#3b82f6" />
                  <Text style={modalStyles.loadingText}>Fetching transaction records...</Text>
                </View>
              ) : !transactions || transactions.length === 0 ? (
                <View style={modalStyles.emptyBox}>
                  <Ionicons name="receipt-outline" size={32} color="#cbd5e1" />
                  <Text style={modalStyles.emptyTitle}>No Recorded Transactions</Text>
                  <Text style={modalStyles.emptySubtitle}>
                    Past buy and sell records for this holding will be listed here.
                  </Text>
                </View>
              ) : (
                <View style={modalStyles.txList}>
                  {transactions.map((tx) => {
                    const isBuy = tx.type === 'BUY';
                    const txDate = tx.date ? new Date(tx.date) : new Date();
                    const dateStr = txDate.toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    });
                    const timeStr = txDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const pnl = tx.realizedGain || 0;

                    return (
                      <View key={tx._id} style={modalStyles.txCard}>
                        <View style={modalStyles.txTopRow}>
                          <View style={modalStyles.txTypeDateWrap}>
                            <View
                              style={[
                                modalStyles.txTypeBadge,
                                { backgroundColor: isBuy ? '#ecfdf5' : '#fffbeb' },
                              ]}
                            >
                              <Ionicons
                                name={isBuy ? 'arrow-down-circle' : 'arrow-up-circle'}
                                size={14}
                                color={isBuy ? '#059669' : '#d97706'}
                              />
                              <Text
                                style={[
                                  modalStyles.txTypeText,
                                  { color: isBuy ? '#059669' : '#d97706' },
                                ]}
                              >
                                {isBuy ? 'BOUGHT' : 'SOLD'}
                              </Text>
                            </View>

                            <Text style={modalStyles.txDateText}>
                              {dateStr} • {timeStr}
                            </Text>
                          </View>

                          <Text
                            style={[
                              modalStyles.txAmountVal,
                              { color: isBuy ? '#0f172a' : '#d97706' },
                            ]}
                          >
                            ₹{(tx.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </Text>
                        </View>

                        <View style={modalStyles.txDetailRow}>
                          <Text style={modalStyles.txUnitsText}>
                            {tx.units} units @ ₹{(tx.pricePerUnit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </Text>

                          {!isBuy && pnl !== 0 && (
                            <View
                              style={[
                                modalStyles.pnlBadge,
                                { backgroundColor: pnl >= 0 ? '#ecfdf5' : '#fef2f2' },
                              ]}
                            >
                              <Text
                                style={[
                                  modalStyles.pnlBadgeText,
                                  { color: pnl >= 0 ? '#059669' : '#dc2626' },
                                ]}
                              >
                                Realized {pnl >= 0 ? '+' : ''}₹{Math.round(pnl).toLocaleString('en-IN')}
                              </Text>
                            </View>
                          )}
                        </View>

                        {tx.notes ? (
                          <Text style={modalStyles.txNotesText}>"{tx.notes}"</Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>

          {/* 4. Bottom Actions Toolbar */}
          <View style={[modalStyles.modalFooter, isMobile && modalStyles.modalFooterMobile]}>
            <View style={[modalStyles.footerActionGroup, isMobile && modalStyles.footerActionGroupMobile]}>
              {onAddMore && (
                <TouchableOpacity
                  style={[modalStyles.footerAddMoreBtn, isMobile && { flex: 1, justifyContent: 'center' }]}
                  onPress={() => {
                    onClose();
                    onAddMore(holding);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={15} color="#10b981" />
                  <Text style={modalStyles.footerAddMoreText}>Buy More</Text>
                </TouchableOpacity>
              )}

              {onSell && (
                <TouchableOpacity
                  style={[modalStyles.footerSellBtn, isMobile && { flex: 1, justifyContent: 'center' }]}
                  onPress={() => {
                    onClose();
                    onSell(holding);
                  }}
                  activeOpacity={0.8}
                >
                  <Feather name="trending-down" size={14} color="#d97706" />
                  <Text style={modalStyles.footerSellText}>Sell Units</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[modalStyles.closeFooterBtn, isMobile && modalStyles.closeFooterBtnMobile]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={modalStyles.closeFooterBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  backdropDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 8,
  },
  modalContainerMobile: {
    maxWidth: '100%',
    borderRadius: 16,
    maxHeight: '94%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  assetIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  symbolBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  symbolText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  categoryBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  instrumentName: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  summaryVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  summarySub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 3,
  },
  liveTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  liveTagText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '700',
  },
  timelineSection: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  timelineSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
    marginBottom: 12,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  timelineBadge: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  txList: {
    gap: 10,
  },
  txCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  txTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  txTypeDateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  txTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  txTypeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  txDateText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  txAmountVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  txDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    flexWrap: 'wrap',
    gap: 6,
  },
  txUnitsText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  pnlBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pnlBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  txNotesText: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    gap: 10,
  },
  modalFooterMobile: {
    flexDirection: 'column',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
  },
  footerActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  footerActionGroupMobile: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeFooterBtnMobile: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  footerAddMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  footerAddMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  footerSellBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  footerSellText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d97706',
  },
  closeFooterBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeFooterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
});
