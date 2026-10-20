import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from './styles/portfolioInsightsStyles';
import { api } from '../../api/client';

export default function PortfolioInsightsScreen({ onNavigate }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insightsData, setInsightsData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedRange, setSelectedRange] = useState('1M'); // '1W', '1M', '1Y', 'ALL'
  const [selectedPointIndex, setSelectedPointIndex] = useState(null);
  const [capturingSnapshot, setCapturingSnapshot] = useState(false);

  // Filter & Sort State
  const [sortBy, setSortBy] = useState('today_best');
  const [selectedAssetClass, setSelectedAssetClass] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Insights & Stock Performance
  const fetchInsights = async () => {
    try {
      const res = await api.getInvestmentInsights({
        sortBy,
        assetClass: selectedAssetClass,
        search: searchQuery,
      });
      setInsightsData(res);
    } catch (err) {
      console.warn('[PortfolioInsights] Failed to fetch insights:', err.message);
    }
  };

  // Fetch Net Worth History
  const fetchNetWorthHistory = async (range = selectedRange) => {
    try {
      setHistoryLoading(true);
      const res = await api.getNetWorthHistory(range);
      setHistoryData(res);
      // Default selected point to latest snapshot
      if (res?.snapshots?.length > 0) {
        setSelectedPointIndex(res.snapshots.length - 1);
      } else {
        setSelectedPointIndex(null);
      }
    } catch (err) {
      console.warn('[PortfolioInsights] Failed to fetch net worth history:', err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Initial Load
  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchInsights(), fetchNetWorthHistory(selectedRange)]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Refetch when filters or sorting change
  useEffect(() => {
    if (!loading) {
      fetchInsights();
    }
  }, [sortBy, selectedAssetClass, searchQuery]);

  // Handle Range Switch
  const handleRangeChange = (range) => {
    setSelectedRange(range);
    fetchNetWorthHistory(range);
  };

  // Handle Pull to Refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchInsights(), fetchNetWorthHistory(selectedRange)]);
    setRefreshing(false);
  };

  // Manual Snapshot Capture
  const handleCaptureSnapshot = async () => {
    try {
      setCapturingSnapshot(true);
      await api.capturePortfolioSnapshot({ forceUpdate: true });
      await Promise.all([fetchInsights(), fetchNetWorthHistory(selectedRange)]);
    } catch (err) {
      console.warn('[PortfolioInsights] Snapshot capture error:', err.message);
    } finally {
      setCapturingSnapshot(false);
    }
  };

  // Format INR Helper
  const formatINR = (val, maxDecimals = 0) => {
    if (val === null || val === undefined || isNaN(val)) return '₹0';
    return '₹' + Number(val).toLocaleString('en-IN', {
      maximumFractionDigits: maxDecimals,
      minimumFractionDigits: maxDecimals,
    });
  };

  const summary = insightsData?.summary || {};
  const highlights = insightsData?.highlights || {};
  const stocks = insightsData?.stocks || [];
  const snapshots = historyData?.snapshots || [];
  const rangeSummary = historyData?.rangeSummary;

  // Selected Snapshot Point for Interactive Tooltip
  const activeSnapshot =
    selectedPointIndex !== null && snapshots[selectedPointIndex]
      ? snapshots[selectedPointIndex]
      : snapshots[snapshots.length - 1] || null;

  return (
    <View style={styles.container}>
      {/* 1. Header Toolbar */}
      <View style={[styles.headerToolbar, isDesktop && styles.headerToolbarDesktop]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => onNavigate && onNavigate('Investments')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={15} color="#0f172a" />
            <Text style={styles.backBtnText}>Investments</Text>
          </TouchableOpacity>

          <View style={styles.titleDivider} />

          <View style={styles.titleGroup}>
            <View style={styles.titleBadge}>
              <Ionicons name="analytics" size={18} color="#7e37d8" />
            </View>
            <View>
              <Text style={styles.screenTitle}>Portfolio Insights</Text>
              <Text style={styles.screenSubtitle}>
                Stock performance analytics & net worth tracking
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.navPill}
            onPress={() => onNavigate && onNavigate('Investments')}
            activeOpacity={0.7}
          >
            <Ionicons name="layers-outline" size={13} color="#475569" />
            <Text style={styles.navPillText}>Holdings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navPill}
            onPress={() => onNavigate && onNavigate('InvestmentAnalytics')}
            activeOpacity={0.7}
          >
            <Ionicons name="pie-chart-outline" size={13} color="#475569" />
            <Text style={styles.navPillText}>Visualisation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={onRefresh}
            activeOpacity={0.8}
            disabled={refreshing || capturingSnapshot}
          >
            <Ionicons
              name={refreshing || capturingSnapshot ? 'sync' : 'reload'}
              size={13}
              color="#ffffff"
            />
            <Text style={styles.refreshBtnText}>
              {refreshing || capturingSnapshot ? 'Updating...' : 'Live Refresh'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Scroll Content */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7e37d8']} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7e37d8" />
            <Text style={styles.loadingText}>Loading stock performance insights...</Text>
          </View>
        ) : (
          <>
            {/* 2. Hero Net Worth Card */}
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View>
                  <View style={styles.heroLabelRow}>
                    <Text style={styles.heroLabel}>Total Portfolio Net Worth</Text>
                    <View style={styles.livePill}>
                      <View style={styles.livePillDot} />
                      <Text style={styles.livePillText}>LIVE FEED</Text>
                    </View>
                  </View>
                  <Text style={styles.heroNetWorth}>
                    {formatINR(summary.totalNetWorth || 0)}
                  </Text>
                </View>

                {/* Return Badges */}
                <View style={styles.heroReturnsRow}>
                  {/* Today's Return */}
                  <View
                    style={[
                      styles.returnBadge,
                      (summary.todayPnl || 0) >= 0
                        ? styles.returnBadgePositive
                        : styles.returnBadgeNegative,
                    ]}
                  >
                    <Ionicons
                      name={(summary.todayPnl || 0) >= 0 ? 'arrow-up' : 'arrow-down'}
                      size={13}
                      color={(summary.todayPnl || 0) >= 0 ? '#047857' : '#b91c1c'}
                    />
                    <Text
                      style={[
                        styles.returnBadgeText,
                        (summary.todayPnl || 0) >= 0
                          ? styles.returnTextPositive
                          : styles.returnTextNegative,
                      ]}
                    >
                      {(summary.todayPnl || 0) >= 0 ? '+' : ''}
                      {formatINR(summary.todayPnl || 0, 2)} ({summary.todayPnlPercent || 0}%) Today
                    </Text>
                  </View>

                  {/* Overall Return */}
                  <View
                    style={[
                      styles.returnBadge,
                      (summary.overallPnl || 0) >= 0
                        ? styles.returnBadgePositive
                        : styles.returnBadgeNegative,
                    ]}
                  >
                    <Ionicons
                      name={(summary.overallPnl || 0) >= 0 ? 'trending-up' : 'trending-down'}
                      size={13}
                      color={(summary.overallPnl || 0) >= 0 ? '#047857' : '#b91c1c'}
                    />
                    <Text
                      style={[
                        styles.returnBadgeText,
                        (summary.overallPnl || 0) >= 0
                          ? styles.returnTextPositive
                          : styles.returnTextNegative,
                      ]}
                    >
                      {(summary.overallPnl || 0) >= 0 ? '+' : ''}
                      {formatINR(summary.overallPnl || 0)} ({summary.overallPnlPercent || 0}%) Overall
                    </Text>
                  </View>
                </View>
              </View>

              {/* Secondary Metrics Grid */}
              <View style={styles.heroMetricsGrid}>
                <View style={styles.heroMetricCol}>
                  <Text style={styles.heroMetricLabel}>Total Invested</Text>
                  <Text style={styles.heroMetricVal}>{formatINR(summary.totalInvested || 0)}</Text>
                </View>
                <View style={styles.heroMetricCol}>
                  <Text style={styles.heroMetricLabel}>Current Asset Value</Text>
                  <Text style={styles.heroMetricVal}>{formatINR(summary.totalCurrentValue || 0)}</Text>
                </View>
                <View style={styles.heroMetricCol}>
                  <Text style={styles.heroMetricLabel}>Available Cash</Text>
                  <Text style={styles.heroMetricVal}>{formatINR(summary.cashBalance || 0)}</Text>
                </View>
                <View style={styles.heroMetricCol}>
                  <Text style={styles.heroMetricLabel}>Total Holdings</Text>
                  <Text style={styles.heroMetricVal}>
                    {summary.holdingsCount || 0} Assets ({summary.stocksCount || 0} Stocks,{' '}
                    {summary.mutualFundsCount || 0} MF)
                  </Text>
                </View>
              </View>
            </View>

            {/* 3. Historical Net Worth Graph Card */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeaderRow}>
                <View style={styles.chartHeaderLeft}>
                  <Text style={styles.chartTitle}>Historical Net Worth Growth</Text>
                  <Text style={styles.chartSubtitle}>
                    Persistent daily portfolio tracking over time
                  </Text>
                </View>

                {/* Range Selectors: 1W, 1M, 1Y, ALL */}
                <View style={styles.rangeTabsRow}>
                  {[
                    { key: '1W', label: 'Weekly' },
                    { key: '1M', label: 'Monthly' },
                    { key: '1Y', label: 'Yearly' },
                    { key: 'ALL', label: 'All Time' },
                  ].map((tab) => {
                    const isActive = selectedRange === tab.key;
                    return (
                      <TouchableOpacity
                        key={tab.key}
                        style={[styles.rangeTab, isActive && styles.rangeTabActive]}
                        onPress={() => handleRangeChange(tab.key)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[styles.rangeTabText, isActive && styles.rangeTabTextActive]}
                        >
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Range Summary Bar */}
              {rangeSummary && (
                <View style={styles.rangeSummaryBar}>
                  <View style={styles.rangeSummaryItem}>
                    <Text style={styles.rangeSummaryLabel}>Period Return:</Text>
                    <Text
                      style={[
                        styles.rangeSummaryVal,
                        {
                          color: rangeSummary.periodChange >= 0 ? '#059669' : '#dc2626',
                        },
                      ]}
                    >
                      {rangeSummary.periodChange >= 0 ? '+' : ''}
                      {formatINR(rangeSummary.periodChange)} ({rangeSummary.periodChangePercent}%)
                    </Text>
                  </View>
                  <View style={styles.rangeSummaryItem}>
                    <Text style={styles.rangeSummaryLabel}>Peak Net Worth:</Text>
                    <Text style={styles.rangeSummaryVal}>
                      {formatINR(rangeSummary.highestValue)} ({rangeSummary.highestDate})
                    </Text>
                  </View>
                  <View style={styles.rangeSummaryItem}>
                    <Text style={styles.rangeSummaryLabel}>Lowest Point:</Text>
                    <Text style={styles.rangeSummaryVal}>
                      {formatINR(rangeSummary.lowestValue)} ({rangeSummary.lowestDate})
                    </Text>
                  </View>
                </View>
              )}

              {/* Interactive Tooltip Card */}
              {activeSnapshot && (
                <View style={styles.tooltipCard}>
                  <View style={styles.tooltipHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="calendar-outline" size={13} color="#94a3b8" />
                      <Text style={styles.tooltipDate}>{activeSnapshot.label}</Text>
                    </View>
                    <Text style={styles.tooltipNetWorth}>
                      {formatINR(activeSnapshot.netWorth)}
                    </Text>
                  </View>
                  <View style={styles.tooltipGrid}>
                    <View style={styles.tooltipCol}>
                      <Text style={styles.tooltipLabel}>Daily Change</Text>
                      <Text
                        style={[
                          styles.tooltipVal,
                          { color: activeSnapshot.dailyPnl >= 0 ? '#34d399' : '#f87171' },
                        ]}
                      >
                        {activeSnapshot.dailyPnl >= 0 ? '+' : ''}
                        {formatINR(activeSnapshot.dailyPnl, 2)} ({activeSnapshot.dailyPnlPercent}%)
                      </Text>
                    </View>
                    <View style={styles.tooltipCol}>
                      <Text style={styles.tooltipLabel}>Invested Capital</Text>
                      <Text style={styles.tooltipVal}>
                        {formatINR(activeSnapshot.investedValue)}
                      </Text>
                    </View>
                    <View style={styles.tooltipCol}>
                      <Text style={styles.tooltipLabel}>Overall Return</Text>
                      <Text
                        style={[
                          styles.tooltipVal,
                          { color: activeSnapshot.overallPnl >= 0 ? '#34d399' : '#f87171' },
                        ]}
                      >
                        {activeSnapshot.overallPnl >= 0 ? '+' : ''}
                        {formatINR(activeSnapshot.overallPnl)} ({activeSnapshot.overallPnlPercent}%)
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Chart Canvas */}
              {historyLoading ? (
                <View style={[styles.chartCanvas, { justifyContent: 'center', alignItems: 'center' }]}>
                  <ActivityIndicator size="small" color="#7e37d8" />
                </View>
              ) : snapshots.length === 0 ? (
                <View style={styles.emptyChartBox}>
                  <Ionicons name="bar-chart-outline" size={32} color="#cbd5e1" />
                  <Text style={styles.emptyChartTitle}>Daily Snapshot Tracking Active</Text>
                  <Text style={styles.emptyChartSub}>
                    Automatic snapshots are captured daily at market close. Tap below to capture
                    today's snapshot right now!
                  </Text>
                  <TouchableOpacity
                    style={styles.snapshotNowBtn}
                    onPress={handleCaptureSnapshot}
                    disabled={capturingSnapshot}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera-outline" size={14} color="#ffffff" />
                    <Text style={styles.snapshotNowBtnText}>
                      {capturingSnapshot ? 'Capturing...' : 'Capture Snapshot Now'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={styles.chartCanvas}>
                    {/* Background Grid Lines */}
                    <View style={[styles.gridLine, { bottom: '25%' }]} />
                    <View style={[styles.gridLine, { bottom: '50%' }]} />
                    <View style={[styles.gridLine, { bottom: '75%' }]} />

                    {/* Interactive Columns & Points */}
                    {(() => {
                      const netValues = snapshots.map((s) => s.netWorth);
                      const minVal = Math.min(...netValues);
                      const maxVal = Math.max(...netValues);
                      const rangeSpan = Math.max(maxVal - minVal, 100);

                      return (
                        <View style={styles.chartColumnsRow}>
                          {snapshots.map((s, idx) => {
                            const isSelected =
                              selectedPointIndex === idx ||
                              (selectedPointIndex === null && idx === snapshots.length - 1);
                            const heightPct = Math.max(
                              15,
                              Math.min(95, Math.round(((s.netWorth - minVal) / rangeSpan) * 75 + 15))
                            );

                            return (
                              <TouchableOpacity
                                key={s.id || s.dateStr || idx}
                                style={[styles.chartColumn, { flex: 1 }]}
                                onPress={() => setSelectedPointIndex(idx)}
                                activeOpacity={0.7}
                              >
                                {isSelected && <View style={styles.chartCrosshair} />}

                                {/* Point Marker */}
                                <View
                                  style={[
                                    styles.chartPoint,
                                    isSelected && styles.chartPointActive,
                                    { marginBottom: 4 },
                                  ]}
                                />

                                {/* Area Pillar Bar */}
                                <View
                                  style={[
                                    styles.chartAreaBar,
                                    { height: `${heightPct}%` },
                                    isSelected && styles.chartAreaBarActive,
                                  ]}
                                />
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      );
                    })()}
                  </View>

                  {/* X-Axis Date Labels */}
                  <View style={styles.xAxisLabelsRow}>
                    {snapshots.length > 0 && (
                      <Text style={styles.xAxisLabelText}>{snapshots[0].label}</Text>
                    )}
                    {snapshots.length > 2 && (
                      <Text style={styles.xAxisLabelText}>
                        {snapshots[Math.floor(snapshots.length / 2)].label}
                      </Text>
                    )}
                    {snapshots.length > 1 && (
                      <Text style={styles.xAxisLabelText}>
                        {snapshots[snapshots.length - 1].label}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* 4. Highlight Summary Cards (4 Extremes) */}
            <View style={styles.highlightsGrid}>
              {/* Card 1: Top Gainer Today */}
              <View style={styles.highlightCard}>
                <View style={styles.highlightTopRow}>
                  <View style={[styles.highlightTag, { backgroundColor: '#ecfdf5' }]}>
                    <Ionicons name="arrow-up" size={11} color="#047857" />
                    <Text style={[styles.highlightTagText, { color: '#047857' }]}>
                      Top Gainer Today
                    </Text>
                  </View>
                  <Ionicons name="sparkles" size={14} color="#10b981" />
                </View>
                {highlights.topGainerToday ? (
                  <>
                    <Text style={styles.highlightSymbol} numberOfLines={1}>
                      {highlights.topGainerToday.symbolOrCode}
                    </Text>
                    <Text style={styles.highlightName} numberOfLines={1}>
                      {highlights.topGainerToday.instrumentName}
                    </Text>
                    <View style={styles.highlightMetricRow}>
                      <Text style={[styles.highlightMetricVal, { color: '#059669' }]}>
                        +{highlights.topGainerToday.todayPnlPercent}%
                      </Text>
                      <Text style={styles.highlightMetricSub}>
                        (+{formatINR(highlights.topGainerToday.todayPnl, 2)})
                      </Text>
                    </View>
                    <Text style={styles.highlightPrice}>
                      LTP: {formatINR(highlights.topGainerToday.currentPrice, 2)}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.highlightName}>No gainers recorded today</Text>
                )}
              </View>

              {/* Card 2: Top Loser Today */}
              <View style={styles.highlightCard}>
                <View style={styles.highlightTopRow}>
                  <View style={[styles.highlightTag, { backgroundColor: '#fef2f2' }]}>
                    <Ionicons name="arrow-down" size={11} color="#b91c1c" />
                    <Text style={[styles.highlightTagText, { color: '#b91c1c' }]}>
                      Top Loser Today
                    </Text>
                  </View>
                  <Ionicons name="trending-down" size={14} color="#ef4444" />
                </View>
                {highlights.topLoserToday ? (
                  <>
                    <Text style={styles.highlightSymbol} numberOfLines={1}>
                      {highlights.topLoserToday.symbolOrCode}
                    </Text>
                    <Text style={styles.highlightName} numberOfLines={1}>
                      {highlights.topLoserToday.instrumentName}
                    </Text>
                    <View style={styles.highlightMetricRow}>
                      <Text style={[styles.highlightMetricVal, { color: '#dc2626' }]}>
                        {highlights.topLoserToday.todayPnlPercent}%
                      </Text>
                      <Text style={styles.highlightMetricSub}>
                        ({formatINR(highlights.topLoserToday.todayPnl, 2)})
                      </Text>
                    </View>
                    <Text style={styles.highlightPrice}>
                      LTP: {formatINR(highlights.topLoserToday.currentPrice, 2)}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.highlightName}>No losers recorded today</Text>
                )}
              </View>

              {/* Card 3: Highest Overall Return */}
              <View style={styles.highlightCard}>
                <View style={styles.highlightTopRow}>
                  <View style={[styles.highlightTag, { backgroundColor: '#f5f3ff' }]}>
                    <Ionicons name="trophy" size={11} color="#7e37d8" />
                    <Text style={[styles.highlightTagText, { color: '#7e37d8' }]}>
                      Highest Total Profit
                    </Text>
                  </View>
                  <Ionicons name="medal-outline" size={14} color="#7e37d8" />
                </View>
                {highlights.highestOverallReturn ? (
                  <>
                    <Text style={styles.highlightSymbol} numberOfLines={1}>
                      {highlights.highestOverallReturn.symbolOrCode}
                    </Text>
                    <Text style={styles.highlightName} numberOfLines={1}>
                      {highlights.highestOverallReturn.instrumentName}
                    </Text>
                    <View style={styles.highlightMetricRow}>
                      <Text style={[styles.highlightMetricVal, { color: '#059669' }]}>
                        +{formatINR(highlights.highestOverallReturn.overallPnl)}
                      </Text>
                      <Text style={styles.highlightMetricSub}>
                        (+{highlights.highestOverallReturn.overallPnlPercent}%)
                      </Text>
                    </View>
                    <Text style={styles.highlightPrice}>
                      Total Value: {formatINR(highlights.highestOverallReturn.currentValue)}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.highlightName}>No profit holdings yet</Text>
                )}
              </View>

              {/* Card 4: Highest Overall Loss */}
              <View style={styles.highlightCard}>
                <View style={styles.highlightTopRow}>
                  <View style={[styles.highlightTag, { backgroundColor: '#fffbeb' }]}>
                    <Ionicons name="warning-outline" size={11} color="#b45309" />
                    <Text style={[styles.highlightTagText, { color: '#b45309' }]}>
                      Highest Total Loss
                    </Text>
                  </View>
                  <Ionicons name="alert-circle-outline" size={14} color="#f59e0b" />
                </View>
                {highlights.highestOverallLoss ? (
                  <>
                    <Text style={styles.highlightSymbol} numberOfLines={1}>
                      {highlights.highestOverallLoss.symbolOrCode}
                    </Text>
                    <Text style={styles.highlightName} numberOfLines={1}>
                      {highlights.highestOverallLoss.instrumentName}
                    </Text>
                    <View style={styles.highlightMetricRow}>
                      <Text style={[styles.highlightMetricVal, { color: '#dc2626' }]}>
                        {formatINR(highlights.highestOverallLoss.overallPnl)}
                      </Text>
                      <Text style={styles.highlightMetricSub}>
                        ({highlights.highestOverallLoss.overallPnlPercent}%)
                      </Text>
                    </View>
                    <Text style={styles.highlightPrice}>
                      Total Value: {formatINR(highlights.highestOverallLoss.currentValue)}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.highlightName}>Zero loss positions</Text>
                )}
              </View>
            </View>

            {/* 5. Stock Performance Section Header */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Stock & Asset Performance Analysis</Text>
                <View style={styles.sectionCountBadge}>
                  <Text style={styles.sectionCountText}>{stocks.length} Assets</Text>
                </View>
              </View>
            </View>

            {/* Filters & Sorting Controls */}
            <View style={styles.filtersContainer}>
              {/* Search Bar */}
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={14} color="#94a3b8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Filter stocks by symbol or company name..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={14} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Asset Class Filter Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortPillsScroll}>
                {['All', 'Equity', 'Mutual Fund', 'ETF', 'Gold'].map((cls) => {
                  const isActive = selectedAssetClass === cls;
                  return (
                    <TouchableOpacity
                      key={cls}
                      style={[styles.filterPill, isActive && styles.filterPillActive]}
                      onPress={() => setSelectedAssetClass(cls)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                        {cls === 'Equity' ? 'Stocks (Equity)' : cls}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Sorting Pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortPillsScroll}>
                {[
                  { key: 'today_best', label: 'Today: Best to Worst' },
                  { key: 'today_worst', label: 'Today: Worst to Best' },
                  { key: 'overall_highest_return', label: 'Overall: Highest Return' },
                  { key: 'overall_highest_loss', label: 'Overall: Highest Loss' },
                  { key: 'overall_percent_highest', label: 'Overall %: High to Low' },
                  { key: 'value_desc', label: 'Market Value: High to Low' },
                  { key: 'name_asc', label: 'Alphabetical: A-Z' },
                ].map((s) => {
                  const isActive = sortBy === s.key;
                  return (
                    <TouchableOpacity
                      key={s.key}
                      style={[styles.filterPill, isActive && styles.filterPillActive]}
                      onPress={() => setSortBy(s.key)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 6. Detailed Stock Performance Cards */}
            {stocks.length === 0 ? (
              <View style={styles.emptyListContainer}>
                <Ionicons name="file-tray-outline" size={32} color="#cbd5e1" />
                <Text style={styles.emptyListTitle}>No Matching Stocks Found</Text>
                <Text style={styles.emptyListSub}>
                  Try clearing the search query or changing the asset filter.
                </Text>
              </View>
            ) : (
              stocks.map((stock) => {
                const isTodayProfit = stock.todayPnl >= 0;
                const isOverallProfit = stock.overallPnl >= 0;

                return (
                  <View key={stock.id || stock.symbolOrCode} style={styles.stockCard}>
                    {/* Header: Name, Symbol, Live Price */}
                    <View style={styles.stockCardHeader}>
                      <View style={styles.stockHeaderLeft}>
                        <View style={styles.stockSymbolRow}>
                          <Text style={styles.stockSymbol}>{stock.symbolOrCode}</Text>
                          <View style={styles.stockCategoryBadge}>
                            <Text style={styles.stockCategoryText}>
                              {stock.subCategory || stock.assetClass}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.stockName} numberOfLines={1}>
                          {stock.instrumentName}
                        </Text>
                      </View>

                      <View style={styles.stockHeaderRight}>
                        <Text style={styles.stockPrice}>{formatINR(stock.currentPrice, 2)}</Text>
                        <View style={styles.stockLiveTag}>
                          <View style={styles.stockLiveDot} />
                          <Text style={styles.stockLiveText}>NSE Live</Text>
                        </View>
                      </View>
                    </View>

                    {/* Returns Comparison Row: Clearly Distinguishes Daily vs Overall */}
                    <View style={styles.stockReturnsBox}>
                      {/* Column 1: Today's Profit / Loss */}
                      <View style={styles.returnCol}>
                        <Text style={styles.returnColLabel}>Today's Return</Text>
                        <Text
                          style={[
                            styles.returnColAmount,
                            { color: isTodayProfit ? '#059669' : '#dc2626' },
                          ]}
                        >
                          {isTodayProfit ? '▲ +' : '▼ '}
                          {formatINR(stock.todayPnl, 2)}
                        </Text>
                        <Text
                          style={[
                            styles.returnColPercent,
                            { color: isTodayProfit ? '#059669' : '#dc2626' },
                          ]}
                        >
                          {isTodayProfit ? '+' : ''}
                          {stock.todayPnlPercent}% Today
                        </Text>
                      </View>

                      <View style={styles.returnColDivider} />

                      {/* Column 2: Overall Profit / Loss Since Purchase */}
                      <View style={styles.returnCol}>
                        <Text style={styles.returnColLabel}>Overall Return (Since Purchase)</Text>
                        <Text
                          style={[
                            styles.returnColAmount,
                            { color: isOverallProfit ? '#059669' : '#dc2626' },
                          ]}
                        >
                          {isOverallProfit ? '▲ +' : '▼ '}
                          {formatINR(stock.overallPnl)}
                        </Text>
                        <Text
                          style={[
                            styles.returnColPercent,
                            { color: isOverallProfit ? '#059669' : '#dc2626' },
                          ]}
                        >
                          {isOverallProfit ? '+' : ''}
                          {stock.overallPnlPercent}% All Time
                        </Text>
                      </View>
                    </View>

                    {/* Bottom Row: Invested Capital vs Current Market Value */}
                    <View style={styles.stockValuesRow}>
                      <View style={styles.stockValItem}>
                        <Text style={styles.stockValLabel}>Holding:</Text>
                        <Text style={styles.stockValNumber}>
                          {stock.quantity} units @ {formatINR(stock.averageBuyPrice, 2)}
                        </Text>
                      </View>

                      <View style={styles.stockValItem}>
                        <Text style={styles.stockValLabel}>Invested:</Text>
                        <Text style={styles.stockValNumber}>{formatINR(stock.investedValue)}</Text>
                      </View>

                      <View style={styles.stockValItem}>
                        <Text style={styles.stockValLabel}>Market Value:</Text>
                        <Text style={[styles.stockValNumber, { color: '#1e40af' }]}>
                          {formatINR(stock.currentValue)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
