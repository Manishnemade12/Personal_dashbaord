import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import styles from '../styles/investmentStyles';

export default function HoldingHistorySection({
  holding,
  transactions,
  isLoading,
  onAddMore,
  onSell,
}) {
  const isProfit = (holding.pnl || 0) >= 0;
  const currentPrice = holding.latestPrice || holding.averageBuyPrice || 0;
  const investedVal = holding.investedValue || holding.quantity * holding.averageBuyPrice || 0;
  const currentVal = holding.currentValue || holding.quantity * currentPrice || 0;

  return (
    <View style={styles.historySectionContainer}>
      {/* 1. Instrument Deep-Dive Metrics Banner */}
      <View style={styles.historyMetricsBanner}>
        <View style={styles.historyBannerRow}>
          <View style={styles.historyBannerCol}>
            <Text style={styles.historyBannerLabel}>Asset Category</Text>
            <Text style={styles.historyBannerVal}>{holding.subCategory || holding.assetClass}</Text>
          </View>
          <View style={styles.historyBannerCol}>
            <Text style={styles.historyBannerLabel}>Total Units</Text>
            <Text style={styles.historyBannerVal}>{holding.quantity}</Text>
          </View>
          <View style={styles.historyBannerCol}>
            <Text style={styles.historyBannerLabel}>Average Buy</Text>
            <Text style={styles.historyBannerVal}>
              ₹{(holding.averageBuyPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        <View style={[styles.historyBannerRow, { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' }]}>
          <View style={styles.historyBannerCol}>
            <Text style={styles.historyBannerLabel}>Total Invested</Text>
            <Text style={styles.historyBannerVal}>
              ₹{investedVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
          <View style={styles.historyBannerCol}>
            <Text style={styles.historyBannerLabel}>Current Valuation</Text>
            <Text style={styles.historyBannerVal}>
              ₹{currentVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
          <View style={styles.historyBannerCol}>
            <Text style={styles.historyBannerLabel}>Overall Return</Text>
            <Text
              style={[
                styles.historyBannerVal,
                { color: isProfit ? '#059669' : '#dc2626', fontWeight: '800' },
              ]}
            >
              {isProfit ? '+' : ''}₹{(holding.pnl || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({isProfit ? '+' : ''}
              {holding.pnlPercent || 0}%)
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Transaction History Timeline Header */}
      <View style={styles.historyTimelineHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="time-outline" size={16} color="#475569" />
          <Text style={styles.historyTimelineTitle}>Transaction History (Buy & Sell Ledger)</Text>
        </View>
        <Text style={styles.historyTimelineCount}>
          {transactions ? `${transactions.length} record(s)` : 'Loading...'}
        </Text>
      </View>

      {/* 3. Transaction Timeline Items */}
      {isLoading ? (
        <View style={styles.historyLoadingBox}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.historyLoadingText}>Fetching verified transaction ledger...</Text>
        </View>
      ) : !transactions || transactions.length === 0 ? (
        <View style={styles.historyEmptyBox}>
          <Ionicons name="receipt-outline" size={28} color="#cbd5e1" />
          <Text style={styles.historyEmptyText}>No recorded buy/sell transactions yet.</Text>
        </View>
      ) : (
        <View style={styles.historyList}>
          {transactions.map((tx, idx) => {
            const isBuy = tx.type === 'BUY';
            const txDate = tx.date ? new Date(tx.date) : new Date();
            const dateStr = txDate.toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });
            const timeStr = txDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const pnl = tx.realizedGain || 0;
            const pnlPositive = pnl >= 0;

            return (
              <View key={tx._id || idx} style={styles.historyItemCard}>
                {/* Left: Type Badge & Date */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={[
                      styles.txBadge,
                      isBuy ? styles.txBadgeBuy : styles.txBadgeSell,
                    ]}
                  >
                    <Feather
                      name={isBuy ? 'arrow-down-left' : 'arrow-up-right'}
                      size={12}
                      color={isBuy ? '#059669' : '#d97706'}
                    />
                    <Text
                      style={[
                        styles.txBadgeText,
                        { color: isBuy ? '#059669' : '#d97706' },
                      ]}
                    >
                      {tx.type}
                    </Text>
                  </View>

                  <View>
                    <Text style={styles.txDateText}>{dateStr}</Text>
                    <Text style={styles.txTimeText}>{timeStr}</Text>
                  </View>
                </View>

                {/* Middle: Units & Price */}
                <View style={{ alignItems: 'flex-start', flex: 1, paddingHorizontal: 10 }}>
                  <Text style={styles.txUnitsText}>
                    {tx.units} units @ ₹{(tx.pricePerUnit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                  {tx.notes ? (
                    <Text style={styles.txNotesText} numberOfLines={1}>
                      {tx.notes}
                    </Text>
                  ) : null}
                </View>

                {/* Right: Total Amount & Realized P&L if Sell */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.txTotalAmountText}>
                    ₹{(tx.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                  {!isBuy && tx.realizedGain !== undefined ? (
                    <Text
                      style={[
                        styles.txRealizedPnlText,
                        { color: pnlPositive ? '#059669' : '#dc2626' },
                      ]}
                    >
                      P&L: {pnlPositive ? '+' : ''}₹{pnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* 4. Quick Action Strip inside History Accordion */}
      <View style={styles.historyQuickActions}>
        <TouchableOpacity style={styles.historyActionBtnBuy} onPress={() => onAddMore(holding)}>
          <Ionicons name="add-circle-outline" size={15} color="#059669" />
          <Text style={styles.historyActionBtnBuyText}>Buy More Units</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.historyActionBtnSell} onPress={() => onSell(holding)}>
          <Feather name="trending-down" size={14} color="#d97706" />
          <Text style={styles.historyActionBtnSellText}>Sell / Exit Position</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
