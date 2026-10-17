import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import styles from './styles/investmentStyles';
import { ASSET_CLASSES, ASSET_META } from './constants/assetOptions';
import InvestmentHeader from './components/InvestmentHeader';
import InvestmentModals from './components/InvestmentModals';
import HoldingHistoryModal from './components/HoldingHistoryModal';
import useInvestments from './hooks/useInvestments';

export default function InvestmentScreen({ onNavigate }) {
  // =========================================================================
  // HOOK-BASED ARCHITECTURE: ALL BUSINESS & TRANSACTION LOGIC DECOUPLED
  // =========================================================================
  const {
    isMobile,
    holdings,
    summary,
    loading,
    refreshing,
    selectedAssetClass,
    setSelectedAssetClass,
    searchQuery,
    setSearchQuery,
    filteredHoldings,
    handleRefreshPrices,
    openAddHoldingModal,
    openEditModal,
    openAddMoreModal,
    openSellModal,
    openBulkRemoveModal,
    openAiImportModal,
    handleDeleteHolding,
    historyModalVisible,
    selectedHistoryHolding,
    openHistoryModal,
    closeHistoryModal,
    holdingTransactionsMap,
    loadingHistoryId,
    modalData,
  } = useInvestments();

  return (
    <View style={styles.container}>
      {/* 1. Header Toolbar */}
      <InvestmentHeader
        isMobile={isMobile}
        refreshing={refreshing}
        onNavigate={onNavigate}
        onRefresh={handleRefreshPrices}
        onBulkRemove={openBulkRemoveModal}
        onAiImport={openAiImportModal}
        onAddHolding={openAddHoldingModal}
      />

      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Fetching live market quotes & portfolio values...</Text>
        </View>
      ) : (
        <ScrollView
          style={[styles.contentScroll, isMobile && { padding: 12 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* 2. Portfolio KPI Summary */}
          <View style={[styles.kpiGrid, isMobile && styles.kpiGridMobile]}>
            {/* Total Portfolio Value (100% full width on mobile) */}
            <View
              style={[
                styles.kpiCard,
                isMobile ? styles.kpiCardMobileFull : styles.kpiCardDesktop,
                { borderLeftColor: '#7e37d8' },
              ]}
            >
              <View style={styles.kpiHeaderRow}>
                <Text style={styles.kpiLabel}>Current Portfolio Value</Text>
                <View style={[styles.kpiIconWrap, { backgroundColor: '#f3e8ff' }]}>
                  <Ionicons name="cash-outline" size={16} color="#7e37d8" />
                </View>
              </View>
              <Text style={[styles.kpiValue, { color: '#0f172a' }]}>
                ₹{(summary?.totalPortfolioValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
              <Text style={styles.kpiSub}>Real-time value at current market prices</Text>
            </View>

            {/* Total Invested Capital (50% grid card on mobile) */}
            <View
              style={[
                styles.kpiCard,
                isMobile ? styles.kpiCardMobileHalf : styles.kpiCardDesktop,
                { borderLeftColor: '#3b82f6' },
              ]}
            >
              <View style={styles.kpiHeaderRow}>
                <Text style={styles.kpiLabel}>Total Invested</Text>
                <View style={[styles.kpiIconWrap, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="card-outline" size={16} color="#3b82f6" />
                </View>
              </View>
              <Text style={[styles.kpiValue, { color: '#1e40af' }]}>
                ₹{(summary?.totalInvested || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
              <Text style={styles.kpiSub} numberOfLines={1}>
                Across {summary?.holdingsCount || 0} holdings
              </Text>
            </View>

            {/* Overall Returns / P&L (50% grid card on mobile) */}
            <View
              style={[
                styles.kpiCard,
                isMobile ? styles.kpiCardMobileHalf : styles.kpiCardDesktop,
                { borderLeftColor: (summary?.totalPnL || 0) >= 0 ? '#10b981' : '#ef4444' },
              ]}
            >
              <View style={styles.kpiHeaderRow}>
                <Text style={styles.kpiLabel}>Total Returns</Text>
                <View
                  style={[
                    styles.kpiIconWrap,
                    {
                      backgroundColor:
                        (summary?.totalPnL || 0) >= 0 ? '#ecfdf5' : '#fef2f2',
                    },
                  ]}
                >
                  <Ionicons
                    name={(summary?.totalPnL || 0) >= 0 ? 'arrow-up' : 'arrow-down'}
                    size={16}
                    color={(summary?.totalPnL || 0) >= 0 ? '#10b981' : '#ef4444'}
                  />
                </View>
              </View>
              <Text
                style={[
                  styles.kpiValue,
                  { color: (summary?.totalPnL || 0) >= 0 ? '#059669' : '#dc2626' },
                ]}
              >
                {(summary?.totalPnL || 0) >= 0 ? '+' : ''}₹
                {(summary?.totalPnL || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
              <View
                style={[
                  styles.pnlPill,
                  {
                    backgroundColor:
                      (summary?.totalPnL || 0) >= 0 ? '#ecfdf5' : '#fef2f2',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pnlPillText,
                    { color: (summary?.totalPnL || 0) >= 0 ? '#059669' : '#dc2626' },
                  ]}
                >
                  {(summary?.totalPnLPercent || 0) >= 0 ? '▲ +' : '▼ '}
                  {summary?.totalPnLPercent || 0}% Return
                </Text>
              </View>
            </View>
          </View>

          {/* 3. Asset Allocation Breakdown Bar */}
          <View style={styles.allocationCard}>
            <View style={styles.allocHeader}>
              <View>
                <Text style={styles.sectionHeaderTitle}>Asset Class Allocation</Text>
                <Text style={styles.allocSubText}>Diversification across Stocks, Funds, ETFs & Gold</Text>
              </View>
              <Text style={styles.allocHoldingsBadge}>{holdings.length} Assets Tracked</Text>
            </View>

            {/* Combined Strip */}
            <View style={styles.allocStrip}>
              {summary?.assetAllocation?.map((item) => {
                const meta = ASSET_META[item.assetClass] || { color: '#64748b' };
                return (
                  <View
                    key={item.assetClass}
                    style={{
                      width: `${item.percent}%`,
                      backgroundColor: meta.color,
                      height: '100%',
                    }}
                  />
                );
              })}
            </View>

            {/* Legend */}
            <View style={styles.allocLegendRow}>
              {summary?.assetAllocation?.map((item) => {
                const meta = ASSET_META[item.assetClass] || { color: '#64748b' };
                return (
                  <View key={item.assetClass} style={styles.allocLegendItem}>
                    <View style={[styles.legendDot, { backgroundColor: meta.color }]} />
                    <Text style={styles.legendName}>{item.assetClass}</Text>
                    <Text style={styles.legendPercent}>{item.percent}%</Text>
                    <Text style={styles.legendVal}>
                      (₹{(item.value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })})
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* 4. Asset Class Filters & Search */}
          <View style={[styles.filterBarRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classPillsScroll}>
              {ASSET_CLASSES.map((cls) => {
                const isSelected = selectedAssetClass === cls;
                return (
                  <TouchableOpacity
                    key={cls}
                    style={[styles.classPill, isSelected && styles.classPillActive]}
                    onPress={() => setSelectedAssetClass(cls)}
                  >
                    <Text style={[styles.classPillText, isSelected && styles.classPillTextActive]}>
                      {cls}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={[styles.searchBox, isMobile && { width: '100%', minWidth: 0, marginTop: 4 }]}>
              <Ionicons name="search-outline" size={15} color="#94a3b8" />
              <TextInput
                style={styles.searchField}
                placeholder="Search stocks, mutual funds..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={15} color="#94a3b8" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* 5. Holdings Cards List */}
          <View style={styles.holdingsSection}>
            <View style={styles.holdingsSectionHeader}>
              <Text style={styles.holdingsHeaderTitle}>Tracked Assets & Live Valuation</Text>
              <Text style={styles.holdingsHeaderSub}>
                Showing {filteredHoldings.length} assets with auto-calculated P&L • Click card to view history
              </Text>
            </View>

            {filteredHoldings.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="briefcase-outline" size={44} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No investments found</Text>
                <Text style={styles.emptySub}>
                  Click "+ Add Holding" to add stocks, mutual funds, or ETFs with your purchase price
                </Text>
              </View>
            ) : (
              filteredHoldings.map((h) => {
                const meta = ASSET_META[h.assetClass] || {
                  icon: 'layers-outline',
                  color: '#64748b',
                  bg: '#f1f5f9',
                  unit: 'Units',
                };
                const isProfit = (h.pnl || 0) >= 0;

                return (
                  <View key={h._id} style={styles.holdingCard}>
                    {/* Top Row: Symbol, Category, Units, Live Valuation & P&L */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => openHistoryModal(h)}
                      style={styles.holdingHeader}
                    >
                      <View style={[styles.assetIconBox, { backgroundColor: meta.bg }]}>
                        <Ionicons name={meta.icon} size={17} color={meta.color} />
                      </View>

                      <View style={styles.holdingNameCol}>
                        <View style={styles.holdingSymbolRow}>
                          <Text style={styles.holdingSymbol} numberOfLines={1}>{h.symbolOrCode}</Text>
                          <View style={styles.subCatBadge}>
                            <Text style={styles.subCatBadgeText}>{h.subCategory || h.assetClass}</Text>
                          </View>
                        </View>
                        <Text style={styles.instrumentFullName} numberOfLines={1}>
                          {h.instrumentName} • {h.quantity} {meta.unit}
                        </Text>
                      </View>

                      <View style={styles.holdingValueCol}>
                        <Text style={styles.holdingCurVal}>
                          ₹{(h.currentValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                        </Text>
                        <Text style={[styles.holdingPnlText, { color: isProfit ? '#059669' : '#dc2626' }]}>
                          {isProfit ? '▲ +' : '▼ '}₹{Math.abs(h.pnl || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({isProfit ? '+' : ''}{h.pnlPercent || 0}%)
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Middle Metrics: Clean 2x2 Grid (Avg Buy, Live LTP, Invested, Return) */}
                    <View style={styles.holdingMetricsGrid}>
                      {/* Box 1: Avg Buy Price */}
                      <View style={styles.metricBox}>
                        <Text style={styles.metricLabel}>AVG BUY</Text>
                        <Text style={styles.metricVal}>
                          ₹{(h.averageBuyPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      </View>

                      {/* Box 2: Current Live Price */}
                      <View style={styles.metricBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={styles.metricLabel}>LIVE LTP</Text>
                          <View style={styles.liveTagRow}>
                            <View style={styles.liveDotSmall} />
                            <Text style={styles.liveTagText}>Live</Text>
                          </View>
                        </View>
                        <Text style={[styles.metricVal, { color: '#0f172a' }]}>
                          ₹{(h.latestPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      </View>

                      {/* Box 3: Total Invested */}
                      <View style={styles.metricBox}>
                        <Text style={styles.metricLabel}>INVESTED</Text>
                        <Text style={styles.metricVal}>
                          ₹{(h.investedValue || h.quantity * h.averageBuyPrice || 0).toLocaleString('en-IN', {
                            maximumFractionDigits: 0,
                          })}
                        </Text>
                      </View>

                      {/* Box 4: Current Return */}
                      <View style={styles.metricBox}>
                        <Text style={styles.metricLabel}>PORTFOLIO SHARE</Text>
                        <Text style={[styles.metricVal, { color: '#3b82f6' }]}>
                          {h.allocationPercent || 0}%
                        </Text>
                      </View>
                    </View>

                    {/* Bottom Action Strip: History, Buy More, Sell, Edit, Remove (Zero Overflow!) */}
                    <View style={styles.holdingFooter}>
                      <View style={styles.holdingActionBtns}>
                        {/* 1. History Modal Button */}
                        <TouchableOpacity
                          style={styles.historyToggleBtn}
                          onPress={() => openHistoryModal(h)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="time-outline" size={13} color="#2563eb" />
                          <Text style={styles.historyToggleText}>History</Text>
                        </TouchableOpacity>

                        {/* 2. Buy More Units Button */}
                        <TouchableOpacity
                          style={styles.addMoreHoldingBtn}
                          onPress={() => openAddMoreModal(h)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="add" size={14} color="#10b981" />
                          <Text style={styles.addMoreHoldingBtnText}>Buy</Text>
                        </TouchableOpacity>

                        {/* 3. Sell Units Button */}
                        <TouchableOpacity
                          style={styles.sellHoldingBtn}
                          onPress={() => openSellModal(h)}
                          activeOpacity={0.7}
                        >
                          <Feather name="trending-down" size={12} color="#d97706" />
                          <Text style={styles.sellHoldingBtnText}>Sell</Text>
                        </TouchableOpacity>

                        {/* 4. Edit Holding Button */}
                        <TouchableOpacity
                          style={styles.editHoldingBtn}
                          onPress={() => openEditModal(h)}
                          activeOpacity={0.7}
                        >
                          <Feather name="edit-2" size={13} color="#3b82f6" />
                        </TouchableOpacity>

                        {/* 5. Remove Holding Button */}
                        <TouchableOpacity
                          style={styles.deleteHoldingIconBtn}
                          onPress={() => handleDeleteHolding(h)}
                          activeOpacity={0.7}
                        >
                          <Feather name="trash-2" size={13} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Dedicated Holding History Modal (With Prominent Close Button, Summary Grid, & Chronological Ledger) */}
      <HoldingHistoryModal
        visible={historyModalVisible}
        holding={selectedHistoryHolding}
        transactions={selectedHistoryHolding ? holdingTransactionsMap[selectedHistoryHolding._id] : []}
        isLoading={selectedHistoryHolding ? loadingHistoryId === selectedHistoryHolding._id : false}
        onClose={closeHistoryModal}
        onAddMore={openAddMoreModal}
        onSell={openSellModal}
      />

      {/* Unified Modals: Add, Edit, Add More, Sell, Bulk Remove, and AI Vision Import */}
      <InvestmentModals data={modalData} />
    </View>
  );
}
