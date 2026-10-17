import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from './styles/investmentAnalyticsStyles';
import { SECTOR_COLORS, PALETTE_FALLBACK, MARKET_CAP_COLORS, RISK_COLORS, TAB_OPTIONS } from './constants/analyticsOptions.js';
import AnalyticsHeader from './components/AnalyticsHeader';
import AnalyticsTabBar from './components/AnalyticsTabBar';
import { api } from '../../api/client';

export default function InvestmentAnalyticsScreen({ onNavigate }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [selectedTab, setSelectedTab] = useState('monthly');
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.getInvestmentAnalytics();
      setAnalytics(res);
      setSelectedSlice(null);
      setSelectedMonth(null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const formatINR = (val) => {
    if (!val && val !== 0) return '₹0';
    return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const enrichData = (list, type) => {
    if (!list || list.length === 0) return [];
    return list.map((item, idx) => {
      let color = PALETTE_FALLBACK[idx % PALETTE_FALLBACK.length];
      if (type === 'sector' && SECTOR_COLORS[item.name]) {
        color = SECTOR_COLORS[item.name];
      } else if (type === 'marketCap' && MARKET_CAP_COLORS[item.name]) {
        color = MARKET_CAP_COLORS[item.name];
      } else if (type === 'risk' && RISK_COLORS[item.name]) {
        color = RISK_COLORS[item.name];
      }
      return { ...item, color };
    });
  };

  const sectorData = useMemo(() => enrichData(analytics?.bySector, 'sector'), [analytics]);
  const marketCapData = useMemo(() => enrichData(analytics?.byMarketCap, 'marketCap'), [analytics]);
  const riskData = useMemo(() => enrichData(analytics?.byRiskLevel, 'risk'), [analytics]);
  const assetClassData = useMemo(() => enrichData(analytics?.byAssetClass, 'assetClass'), [analytics]);
  const monthlyList = useMemo(() => analytics?.byMonth || [], [analytics]);

  const monthlyKPIs = useMemo(() => {
    if (!monthlyList.length) {
      return {
        totalInvested: 0,
        activeMonths: 0,
        avgMonthly: 0,
        currentMonthInvested: 0,
        currentMonthLabel: '',
        totalBuys: 0,
      };
    }
    const total = monthlyList.reduce((acc, m) => acc + (m.totalInvested || 0), 0);
    const activeMonths = monthlyList.filter((m) => (m.totalInvested || 0) > 0).length || 1;
    const avg = total / activeMonths;
    const latestMonth = monthlyList[monthlyList.length - 1] || {};
    const totalBuys = monthlyList.reduce((acc, m) => acc + (m.transactionsCount || 0), 0);

    return {
      totalInvested: total,
      activeMonths,
      avgMonthly: avg,
      currentMonthInvested: latestMonth.totalInvested || 0,
      currentMonthLabel: latestMonth.monthLabel || '',
      totalBuys,
    };
  }, [monthlyList]);

  const currentDataset = useMemo(() => {
    switch (selectedTab) {
      case 'sector':
        return { title: 'Sector & Industry Visualizer', list: sectorData, type: 'sector', subtitle: 'Capital allocation across economic sectors' };
      case 'marketCap':
        return { title: 'Market Cap Distribution', list: marketCapData, type: 'marketCap', subtitle: 'Portfolio spread across Large, Mid, and Small Cap enterprises' };
      case 'risk':
        return { title: 'Risk & Volatility Spectrum', list: riskData, type: 'risk', subtitle: 'Capital distribution categorized by investment volatility and safety' };
      case 'assetClass':
        return { title: 'Asset Class Allocation', list: assetClassData, type: 'assetClass', subtitle: 'Diversification between Equities, Gold, Mutual Funds, and Fixed Income' };
      default:
        return { title: 'All Visuals Studio', list: sectorData, type: 'sector', subtitle: 'Comprehensive multi-dimensional portfolio breakdown' };
    }
  }, [selectedTab, sectorData, marketCapData, riskData, assetClassData]);

  // Donut chart renderer
  const renderDonutChart = (dataList, size = 240, innerSize = 160) => {
    if (!dataList || dataList.length === 0) {
      return (
        <View style={[styles.emptyChartCircle, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={styles.emptyChartText}>No Data</Text>
        </View>
      );
    }

    let currentAngle = 0;
    const gradientStops = dataList.map((item) => {
      const start = currentAngle;
      const span = (item.percent / 100) * 360;
      currentAngle += span;
      return `${item.color} ${start.toFixed(1)}deg ${currentAngle.toFixed(1)}deg`;
    });

    const conicCss = gradientStops.length > 0 ? `conic-gradient(${gradientStops.join(', ')})` : '#e2e8f0';
    const activeItem = selectedSlice ? dataList.find((d) => d.name === selectedSlice) : null;

    return (
      <View style={styles.chartWrapper}>
        <View
          style={[
            styles.donutOuter,
            { width: size, height: size, borderRadius: size / 2 },
            Platform.OS === 'web'
              ? {
                  backgroundImage: conicCss.startsWith('conic') ? conicCss : undefined,
                  backgroundColor: !conicCss.startsWith('conic') ? conicCss : '#3b82f6',
                  background: conicCss,
                }
              : { backgroundColor: '#3b82f6' },
          ]}
        >
          <View
            style={[
              styles.donutInner,
              {
                width: innerSize,
                height: innerSize,
                borderRadius: innerSize / 2,
              },
            ]}
          >
            {activeItem ? (
              <View style={styles.donutCenterContent}>
                <View style={[styles.donutCenterDot, { backgroundColor: activeItem.color }]} />
                <Text style={[styles.donutCenterPercent, { color: activeItem.color }, isMobile && { fontSize: 20 }]}>
                  {activeItem.percent}%
                </Text>
                <Text style={[styles.donutCenterName, isMobile && { fontSize: 11, maxWidth: 95 }]} numberOfLines={1}>
                  {activeItem.name}
                </Text>
                <Text style={[styles.donutCenterValue, isMobile && { fontSize: 12 }]}>
                  {formatINR(activeItem.value)}
                </Text>
                <Text style={[styles.donutCenterCount, isMobile && { fontSize: 10 }]}>
                  {activeItem.items?.length || 0} Assets
                </Text>
              </View>
            ) : (
              <View style={styles.donutCenterContent}>
                <Text style={[styles.donutCenterTotalLabel, isMobile && { fontSize: 9 }]}>PORTFOLIO</Text>
                <Text style={[styles.donutCenterTotalVal, isMobile && { fontSize: 15 }]}>
                  {formatINR(analytics?.totalPortfolioValue)}
                </Text>
                <View style={[styles.donutCenterPill, isMobile && { paddingHorizontal: 6, paddingVertical: 1 }]}>
                  <Text style={[styles.donutCenterPillText, isMobile && { fontSize: 10 }]}>
                    {analytics?.holdingsCount || 0} Holdings
                  </Text>
                </View>
                {!isMobile && <Text style={styles.donutCenterHint}>Tap slice to inspect</Text>}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Continuous visual allocation strip
  const renderAllocationRibbon = (dataList) => {
    if (!dataList || dataList.length === 0) return null;
    return (
      <View style={styles.ribbonCard}>
        <View style={styles.ribbonHeader}>
          <Text style={styles.ribbonTitle}>Visual Allocation Ribbon</Text>
          <Text style={styles.ribbonSub}>100% Capital Distribution</Text>
        </View>
        <View style={styles.ribbonBar}>
          {dataList.map((item) => {
            if (item.percent <= 0) return null;
            const isSelected = selectedSlice === item.name;
            return (
              <TouchableOpacity
                key={item.name}
                style={[
                  styles.ribbonSegment,
                  {
                    flex: item.percent,
                    backgroundColor: item.color,
                    opacity: selectedSlice && !isSelected ? 0.35 : 1,
                  },
                ]}
                onPress={() => setSelectedSlice(isSelected ? null : item.name)}
                activeOpacity={0.8}
              />
            );
          })}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ribbonLegend}>
          {dataList.map((item) => {
            const isSelected = selectedSlice === item.name;
            return (
              <TouchableOpacity
                key={item.name}
                style={[
                  styles.ribbonLegendItem,
                  isSelected && styles.ribbonLegendItemActive,
                ]}
                onPress={() => setSelectedSlice(isSelected ? null : item.name)}
                activeOpacity={0.7}
              >
                <View style={[styles.ribbonDot, { backgroundColor: item.color }]} />
                <Text style={[styles.ribbonName, isSelected && styles.ribbonNameActive]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.ribbonPercent, { color: item.color }]}>
                  {item.percent}%
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // Interactive Monthly Bar Chart
  const renderMonthlyBarChart = (dataList, isMini = false) => {
    if (!dataList || dataList.length === 0) {
      return (
        <View style={styles.emptyBarChart}>
          <Text style={styles.emptyBarChartText}>No monthly investment history available</Text>
        </View>
      );
    }

    const selectedMonthObj = selectedMonth ? dataList.find((m) => m.month === selectedMonth) : null;
    const maxVal = Math.max(...dataList.map((m) => m.totalInvested || 0), 1000);
    const chartHeight = isMini ? 85 : 155;

    return (
      <View style={[styles.barChartContainer, isMini && styles.barChartContainerMini]}>
        {/* Interactive Selected Month Amount Display */}
        {!isMini && selectedMonthObj && (
          <View style={styles.selectedMonthBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' }} />
              <Text style={styles.selectedMonthBannerTitle}>{selectedMonthObj.monthLabel}:</Text>
              <Text style={styles.selectedMonthBannerAmount}>
                {formatINR(selectedMonthObj.totalInvested || 0)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedMonth(null)} style={styles.clearMonthPill}>
              <Text style={styles.clearMonthPillText}>Show All ✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.barChartCanvas, { height: chartHeight }]}>
          {dataList.map((m, idx) => {
            const isSelected = selectedMonth === m.month;
            const isCurrent = idx === dataList.length - 1;
            const amount = m.totalInvested || 0;
            const heightPercent = Math.max((amount / maxVal) * 100, amount > 0 ? 12 : 4);
            const availableHeight = chartHeight - (isMini ? 24 : 56);
            const barPixelHeight = Math.max((heightPercent / 100) * availableHeight, amount > 0 ? 12 : 4);

            return (
              <TouchableOpacity
                key={m.month}
                style={[styles.barColumn, isMini && styles.barColumnMini]}
                onPress={() => {
                  if (!isMini) {
                    setSelectedMonth(isSelected ? null : m.month);
                  } else {
                    setSelectedTab('monthly');
                    setSelectedMonth(m.month);
                  }
                }}
                activeOpacity={0.75}
              >
                {/* Top Amount Label: Guaranteed headroom to prevent clipping */}
                {!isMini && (
                  <Text
                    style={[
                      styles.barAmountText,
                      amount > 0 ? styles.barAmountActive : styles.barAmountZero,
                      isSelected && styles.barAmountSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {amount > 0 ? (amount >= 1000 ? `₹${Math.round(amount / 1000)}k` : `₹${amount}`) : '₹0'}
                  </Text>
                )}

                {/* Vertical Bar Cylinder */}
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: barPixelHeight,
                        backgroundColor: amount > 0 ? (isSelected ? '#1d4ed8' : '#3b82f6') : '#cbd5e1',
                      },
                      isSelected && styles.barFillSelected,
                    ]}
                  />
                </View>

                {/* Bottom Month Label */}
                <Text
                  style={[
                    styles.barMonthText,
                    isMini && styles.barMonthTextMini,
                    isCurrent && styles.barMonthCurrent,
                    isSelected && styles.barMonthSelected,
                  ]}
                >
                  {m.monthShort}
                </Text>

                {/* Indicator tag for Current Month */}
                {!isMini && isCurrent && (
                  <View style={styles.currentMonthDotBadge}>
                    <Text style={styles.currentMonthDotText}>Current</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // Dedicated Monthly Visuals Studio
  const renderMonthlyStudio = () => {
    const selectedMonthData = selectedMonth
      ? monthlyList.find((m) => m.month === selectedMonth)
      : null;

    const displayMonths = selectedMonthData ? [selectedMonthData] : [...monthlyList].reverse();

    return (
      <View style={styles.monthlyStudioContainer}>
        {/* 1. Modern KPI Cards Grid */}
        <View style={styles.monthlyKpiGrid}>
          {/* Card 1: 6-Mo Capital Deployed */}
          <View style={[styles.monthlyKpiCard, isMobile && { width: '48%' }]}>
            <View style={styles.monthlyKpiTop}>
              <View style={[styles.monthlyKpiIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="wallet-outline" size={17} color="#3b82f6" />
              </View>
              <Text style={styles.monthlyKpiBadge}>6-Mo Total</Text>
            </View>
            <Text style={styles.monthlyKpiValue}>{formatINR(monthlyKPIs.totalInvested)}</Text>
            <Text style={styles.monthlyKpiLabel}>Total Capital Deployed</Text>
          </View>

          {/* Card 2: Current Month Deployed */}
          <View style={[styles.monthlyKpiCard, isMobile && { width: '48%' }]}>
            <View style={styles.monthlyKpiTop}>
              <View style={[styles.monthlyKpiIcon, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="calendar-outline" size={17} color="#16a34a" />
              </View>
              <Text style={[styles.monthlyKpiBadge, { backgroundColor: '#dcfce7', color: '#166534' }]}>
                {monthlyKPIs.currentMonthLabel || 'Current'}
              </Text>
            </View>
            <Text style={[styles.monthlyKpiValue, { color: '#166534' }]}>
              {formatINR(monthlyKPIs.currentMonthInvested)}
            </Text>
            <Text style={styles.monthlyKpiLabel}>Current Month Deployed</Text>
          </View>

          {/* Card 3: Monthly Average */}
          <View style={[styles.monthlyKpiCard, isMobile && { width: '48%' }]}>
            <View style={styles.monthlyKpiTop}>
              <View style={[styles.monthlyKpiIcon, { backgroundColor: '#faf5ff' }]}>
                <Ionicons name="trending-up-outline" size={17} color="#8b5cf6" />
              </View>
              <Text style={[styles.monthlyKpiBadge, { backgroundColor: '#f3e8ff', color: '#7e22ce' }]}>
                Run-Rate
              </Text>
            </View>
            <Text style={styles.monthlyKpiValue}>{formatINR(monthlyKPIs.avgMonthly)}</Text>
            <Text style={styles.monthlyKpiLabel}>Monthly Average Investment</Text>
          </View>

          {/* Card 4: Purchases Count */}
          <View style={[styles.monthlyKpiCard, isMobile && { width: '48%' }]}>
            <View style={styles.monthlyKpiTop}>
              <View style={[styles.monthlyKpiIcon, { backgroundColor: '#fff7ed' }]}>
                <Ionicons name="bag-check-outline" size={17} color="#ea580c" />
              </View>
              <Text style={[styles.monthlyKpiBadge, { backgroundColor: '#ffedd5', color: '#c2410c' }]}>
                Lifetime
              </Text>
            </View>
            <Text style={styles.monthlyKpiValue}>{monthlyKPIs.totalBuys} Buys</Text>
            <Text style={styles.monthlyKpiLabel}>Executed Acquisitions</Text>
          </View>
        </View>

        {/* 2. Interactive Monthly Capital Allocation Chart Card */}
        <View style={styles.monthlyChartCard}>
          <View style={styles.monthlyChartHeader}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.chartHeaderIcon}>
                  <Ionicons name="bar-chart" size={17} color="#3b82f6" />
                </View>
                <Text style={styles.monthlyChartTitle}>Monthly Capital Allocation Chart</Text>
              </View>
              <Text style={styles.monthlyChartSubtitle}>
                Capital deployed into equities, bullion & funds across the trailing 6 months
              </Text>
            </View>
            {selectedMonth && (
              <TouchableOpacity
                style={styles.clearMonthBtn}
                onPress={() => setSelectedMonth(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={15} color="#ef4444" />
                <Text style={styles.clearMonthText}>Show All Months</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Vertical Bar Chart */}
          {renderMonthlyBarChart(monthlyList, false)}

          <View style={styles.chartFootnote}>
            <Ionicons name="finger-print-outline" size={15} color="#3b82f6" />
            <Text style={styles.chartFootnoteText}>
              Tap any month column to inspect acquired holdings and asset-class distribution for that cycle.
            </Text>
          </View>
        </View>

        {/* 3. Detailed Monthly Inspection Timeline */}
        <View style={styles.monthlyTimelineSection}>
          <View style={styles.timelineHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="layers-outline" size={18} color="#0f172a" />
              <Text style={styles.timelineTitle}>
                {selectedMonth
                  ? `Detailed Breakdown: ${selectedMonthData?.monthLabel || selectedMonth}`
                  : 'Monthly Chronological Inspection'}
              </Text>
            </View>
            <Text style={styles.timelineSubtitle}>
              Itemized stock purchases, asset-class weightage and MoM growth statistics
            </Text>
          </View>

          {displayMonths.map((m) => {
            const hasInvestments = (m.totalInvested || 0) > 0;
            const isLatest = m.month === monthlyList[monthlyList.length - 1]?.month;

            return (
              <View
                key={m.month}
                style={[
                  styles.monthBreakdownCard,
                  m.month === selectedMonth && styles.monthBreakdownCardActive,
                ]}
              >
                {/* Month Card Header */}
                <View style={styles.monthCardHeader}>
                  <View style={styles.monthCardLeft}>
                    <View style={styles.calendarMiniIcon}>
                      <Ionicons name="calendar" size={16} color="#3b82f6" />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.monthCardTitle}>{m.monthLabel}</Text>
                        {isLatest && (
                          <View style={styles.currentMonthBadge}>
                            <Text style={styles.currentMonthBadgeText}>Current Month</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.monthCardSub} numberOfLines={1} ellipsizeMode="tail">
                        {m.transactionsCount} tx{m.transactionsCount === 1 ? '' : 's'} • {m.assetsCount} unique asset{m.assetsCount === 1 ? '' : 's'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.monthCardRight}>
                    <Text style={styles.monthCardTotal}>{formatINR(m.totalInvested)}</Text>
                    {m.momGrowth !== 0 ? (
                      <View
                        style={[
                          styles.momBadge,
                          { backgroundColor: m.momGrowth > 0 ? '#dcfce7' : '#fee2e2' },
                        ]}
                      >
                        <Ionicons
                          name={m.momGrowth > 0 ? 'arrow-up' : 'arrow-down'}
                          size={11}
                          color={m.momGrowth > 0 ? '#166534' : '#b91c1c'}
                        />
                        <Text
                          style={[
                            styles.momBadgeText,
                            { color: m.momGrowth > 0 ? '#166534' : '#b91c1c' },
                          ]}
                        >
                          {Math.abs(m.momGrowth)}% MoM
                        </Text>
                      </View>
                    ) : hasInvestments ? (
                      <View style={[styles.momBadge, { backgroundColor: '#eff6ff' }]}>
                        <Text style={[styles.momBadgeText, { color: '#1d4ed8' }]}>Active Cycle</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Asset Class Breakdown Strip for this month */}
                {hasInvestments && m.byAssetClass && m.byAssetClass.length > 0 && (
                  <View style={styles.monthAssetSplitSection}>
                    <Text style={styles.monthAssetSplitTitle}>Asset Class Allocation</Text>
                    <View style={styles.monthAssetSplitBar}>
                      {m.byAssetClass.map((ac) => (
                        <View
                          key={ac.assetClass}
                          style={[
                            styles.monthAssetSplitSegment,
                            {
                              flex: ac.percent || 1,
                              backgroundColor:
                                ac.assetClass === 'Equity'
                                  ? '#3b82f6'
                                  : ac.assetClass === 'Gold'
                                  ? '#eab308'
                                  : ac.assetClass === 'Mutual Funds'
                                  ? '#10b981'
                                  : '#8b5cf6',
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <View style={styles.monthAssetSplitPills}>
                      {m.byAssetClass.map((ac) => {
                        const pillColor =
                          ac.assetClass === 'Equity'
                            ? '#3b82f6'
                            : ac.assetClass === 'Gold'
                            ? '#eab308'
                            : ac.assetClass === 'Mutual Funds'
                            ? '#10b981'
                            : '#8b5cf6';
                        return (
                          <View
                            key={ac.assetClass}
                            style={[
                              styles.assetPill,
                              { borderColor: pillColor + '40', backgroundColor: pillColor + '10' },
                            ]}
                          >
                            <View style={[styles.assetPillDot, { backgroundColor: pillColor }]} />
                            <Text style={styles.assetPillName}>{ac.assetClass}:</Text>
                            <Text style={[styles.assetPillVal, { color: pillColor }]}>
                              {formatINR(ac.amount)} ({ac.percent}%)
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Itemized Acquired Instruments */}
                {hasInvestments && m.topInstruments && m.topInstruments.length > 0 ? (
                  <View style={styles.monthInstrumentsSection}>
                    <Text style={styles.monthInstrumentsTitle}>
                      Acquired Instruments ({m.topInstruments.length})
                    </Text>
                    <View style={styles.monthInstrumentsGrid}>
                      {m.topInstruments.map((inst, idx) => {
                        const shareOfMonth =
                          m.totalInvested > 0
                            ? ((inst.amount / m.totalInvested) * 100).toFixed(1)
                            : 0;
                        return (
                          <View key={inst.symbol || idx} style={styles.monthInstrumentCard}>
                            <View style={styles.monthInstTop}>
                              <View style={styles.monthInstSymbolBadge}>
                                <Text style={styles.monthInstSymbolText}>
                                  {inst.symbol ? inst.symbol.replace('.NS', '').replace('.BO', '') : 'ASSET'}
                                </Text>
                              </View>
                              <Text style={styles.monthInstAmount}>{formatINR(inst.amount)}</Text>
                            </View>

                            <Text style={styles.monthInstName} numberOfLines={1}>
                              {inst.name}
                            </Text>

                            <View style={styles.monthInstFooter}>
                              <Text style={styles.monthInstUnits}>
                                {inst.units} unit{inst.units === 1 ? '' : 's'}
                              </Text>
                              <Text style={styles.monthInstShare}>
                                {shareOfMonth}% of month
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyMonthBox}>
                    <Ionicons name="information-circle-outline" size={16} color="#94a3b8" />
                    <Text style={styles.emptyMonthText}>
                      No investment capital was deployed during {m.monthLabel}.
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AnalyticsHeader
        isMobile={isMobile}
        holdingsCount={analytics?.holdingsCount || 0}
        onNavigateBack={() => onNavigate && onNavigate('Investments')}
        onRefresh={fetchAnalytics}
      />

      <AnalyticsTabBar
        selectedTab={selectedTab}
        onSelect={(tab) => {
          setSelectedTab(tab);
          setSelectedSlice(null);
          setSelectedMonth(null);
        }}
      />

      {/* 3. Main Visual Canvas */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Rendering visual portfolio charts...</Text>
        </View>
      ) : (
        <ScrollView
          style={[styles.contentScroll, isMobile && { padding: 12 }]}
          showsVerticalScrollIndicator={false}
        >
          {selectedTab === 'overview' ? (
            /* Multi-View Visual Studio */
            <View style={[styles.overviewGrid, isMobile && { flexDirection: 'column' }]}>
              {/* Monthly Trend Preview Card */}
              <View style={[styles.overviewCard, isMobile && { width: '100%', minWidth: '100%' }]}>
                <View style={styles.overviewCardHeader}>
                  <View style={[styles.overviewIcon, { backgroundColor: '#e0f2fe' }]}>
                    <Ionicons name="calendar" size={17} color="#0284c7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.overviewCardTitle}>Monthly Deployments</Text>
                    <Text style={styles.overviewCardSubtitle}>Trailing 6 months capital trend</Text>
                  </View>
                </View>
                {renderMonthlyBarChart(monthlyList, true)}
                <View style={styles.monthlyOverviewStats}>
                  <View style={styles.monthlyMiniKpi}>
                    <Text style={styles.monthlyMiniKpiLabel}>Current Month</Text>
                    <Text style={styles.monthlyMiniKpiVal}>{formatINR(monthlyKPIs.currentMonthInvested)}</Text>
                  </View>
                  <View style={styles.monthlyMiniKpiDivider} />
                  <View style={styles.monthlyMiniKpi}>
                    <Text style={styles.monthlyMiniKpiLabel}>6-Mo Total</Text>
                    <Text style={styles.monthlyMiniKpiVal}>{formatINR(monthlyKPIs.totalInvested)}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.exploreMonthlyBtn}
                  onPress={() => {
                    setSelectedTab('monthly');
                    setSelectedMonth(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.exploreMonthlyBtnText}>Open Monthly Analytics Studio</Text>
                  <Ionicons name="arrow-forward" size={14} color="#0284c7" />
                </TouchableOpacity>
              </View>

              {/* Sector Card */}
              <View style={[styles.overviewCard, isMobile && { width: '100%', minWidth: '100%' }]}>
                <View style={styles.overviewCardHeader}>
                  <View style={[styles.overviewIcon, { backgroundColor: '#eff6ff' }]}>
                    <Ionicons name="business" size={17} color="#3b82f6" />
                  </View>
                  <Text style={styles.overviewCardTitle}>Sector & Industry Spread</Text>
                </View>
                {renderDonutChart(sectorData, 190, 125)}
                <View style={styles.overviewList}>
                  {sectorData.slice(0, 6).map((item) => (
                    <View key={item.name} style={styles.overviewRow}>
                      <View style={[styles.dot, { backgroundColor: item.color }]} />
                      <Text style={styles.overviewRowName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.overviewRowVal}>{item.percent}%</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Market Cap Card */}
              <View style={[styles.overviewCard, isMobile && { width: '100%', minWidth: '100%' }]}>
                <View style={styles.overviewCardHeader}>
                  <View style={[styles.overviewIcon, { backgroundColor: '#f5f3ff' }]}>
                    <Ionicons name="bar-chart" size={17} color="#8b5cf6" />
                  </View>
                  <Text style={styles.overviewCardTitle}>Market Capitalization</Text>
                </View>
                {renderDonutChart(marketCapData, 190, 125)}
                <View style={styles.overviewList}>
                  {marketCapData.map((item) => (
                    <View key={item.name} style={styles.overviewRow}>
                      <View style={[styles.dot, { backgroundColor: item.color }]} />
                      <Text style={styles.overviewRowName}>{item.name}</Text>
                      <Text style={styles.overviewRowVal}>{item.percent}%</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Risk Spectrum Card */}
              <View style={[styles.overviewCard, isMobile && { width: '100%', minWidth: '100%' }]}>
                <View style={styles.overviewCardHeader}>
                  <View style={[styles.overviewIcon, { backgroundColor: '#fef2f2' }]}>
                    <Ionicons name="shield-checkmark" size={17} color="#ef4444" />
                  </View>
                  <Text style={styles.overviewCardTitle}>Risk & Volatility Spectrum</Text>
                </View>
                {renderDonutChart(riskData, 190, 125)}
                <View style={styles.overviewList}>
                  {riskData.map((item) => (
                    <View key={item.name} style={styles.overviewRow}>
                      <View style={[styles.dot, { backgroundColor: item.color }]} />
                      <Text style={styles.overviewRowName}>{item.name}</Text>
                      <Text style={styles.overviewRowVal}>{item.percent}%</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Asset Class Card */}
              <View style={[styles.overviewCard, isMobile && { width: '100%', minWidth: '100%' }]}>
                <View style={styles.overviewCardHeader}>
                  <View style={[styles.overviewIcon, { backgroundColor: '#ecfeff' }]}>
                    <Ionicons name="pie-chart" size={17} color="#06b6d4" />
                  </View>
                  <Text style={styles.overviewCardTitle}>Asset Classes</Text>
                </View>
                {renderDonutChart(assetClassData, 190, 125)}
                <View style={styles.overviewList}>
                  {assetClassData.map((item) => (
                    <View key={item.name} style={styles.overviewRow}>
                      <View style={[styles.dot, { backgroundColor: item.color }]} />
                      <Text style={styles.overviewRowName}>{item.name}</Text>
                      <Text style={styles.overviewRowVal}>{item.percent}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : selectedTab === 'monthly' ? (
            /* Dedicated Monthly Investment Analytics & Visuals Studio */
            renderMonthlyStudio()
          ) : (
            /* Single Dimension Focused Visual Studio */
            <View style={styles.studioCard}>
              <View style={styles.studioHeader}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.studioTitle}>{currentDataset.title}</Text>
                  {!isMobile && <Text style={styles.studioSubtitle}>{currentDataset.subtitle}</Text>}
                </View>
                {selectedSlice && (
                  <TouchableOpacity
                    style={styles.clearFilterBtn}
                    onPress={() => setSelectedSlice(null)}
                  >
                    <Ionicons name="close-circle" size={14} color="#ef4444" />
                    <Text style={styles.clearFilterText}>Reset ({selectedSlice})</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Visual Ring & Weightage Leaderboard */}
              <View style={[styles.studioBody, isMobile && { flexDirection: 'column', alignItems: 'center', gap: 10 }]}>
                {/* Donut Chart Canvas */}
                <View style={styles.donutCanvas}>
                  {renderDonutChart(currentDataset.list, isMobile ? 180 : 250, isMobile ? 120 : 165)}
                </View>

                {/* Visual Weightage Leaderboard */}
                <View style={styles.leaderboardSection}>
                  <Text style={styles.leaderboardSectionTitle}>Distribution Leaderboard</Text>
                  {currentDataset.list.map((item) => {
                    const isSelected = selectedSlice === item.name;
                    return (
                      <TouchableOpacity
                        key={item.name}
                        style={[
                          styles.leaderboardCard,
                          isSelected && styles.leaderboardCardActive,
                        ]}
                        onPress={() =>
                          setSelectedSlice(isSelected ? null : item.name)
                        }
                        activeOpacity={0.8}
                      >
                        <View style={styles.leaderboardTopRow}>
                          <View style={styles.leaderboardLeft}>
                            <View style={[styles.categoryColorDot, { backgroundColor: item.color }]} />
                            <Text style={[styles.categoryName, isSelected && styles.categoryNameActive]}>
                              {item.name}
                            </Text>
                          </View>

                          <View style={styles.leaderboardRight}>
                            <Text style={styles.categoryAmount}>{formatINR(item.value)}</Text>
                            <View style={[styles.percentTag, { backgroundColor: item.color + '22' }]}>
                              <Text style={[styles.percentTagText, { color: item.color }]}>
                                {item.percent}%
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Visual Progress Bar */}
                        <View style={styles.progressBarBg}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${Math.min(item.percent, 100)}%`,
                                backgroundColor: item.color,
                              },
                            ]}
                          />
                        </View>

                        <View style={styles.leaderboardBottomRow}>
                          <Text style={styles.holdingCountText}>
                            {item.items?.length || 0} Company Holding{(item.items?.length || 0) === 1 ? '' : 's'}
                          </Text>
                          <Text style={styles.inspectHint}>
                            {isSelected ? 'Currently Selected' : 'Tap to inspect'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Underlying Holdings Explorer (Modern Cards) */}
              <View style={styles.holdingsExplorerSection}>
                <View style={styles.explorerHeader}>
                  <View style={styles.explorerTitleRow}>
                    <Ionicons name="layers" size={18} color="#0f172a" />
                    <Text style={styles.explorerTitle}>
                      {selectedSlice
                        ? `Underlying Stocks in "${selectedSlice}"`
                        : `All Portfolio Holdings in this Breakdown (${analytics?.holdingsCount || 0})`}
                    </Text>
                  </View>
                  <Text style={styles.explorerSubtitle}>
                    Live real-time valuations & individual portfolio weightages
                  </Text>
                </View>

                {(() => {
                  let displayItems = [];
                  if (selectedSlice) {
                    const match = currentDataset.list.find((d) => d.name === selectedSlice);
                    displayItems = match ? match.items || [] : [];
                  } else {
                    currentDataset.list.forEach((cat) => {
                      if (cat.items) {
                        cat.items.forEach((item) => {
                          displayItems.push({ ...item, categoryColor: cat.color, categoryName: cat.name });
                        });
                      }
                    });
                  }

                  if (displayItems.length === 0) {
                    return (
                      <View style={styles.emptyDrilldown}>
                        <Text style={styles.emptyText}>No stocks found for the selected category.</Text>
                      </View>
                    );
                  }

                  const totalVal = analytics?.totalPortfolioValue || 1;

                  return (
                    <View style={styles.holdingsGrid}>
                      {displayItems.map((h, i) => {
                        const holdingShare = Number(((h.value / totalVal) * 100).toFixed(2));
                        return (
                          <View key={h.id || i} style={styles.holdingItemCard}>
                            <View style={styles.holdingItemTop}>
                              <View style={styles.tickerBadge}>
                                <Text style={styles.tickerText}>
                                  {h.symbolOrCode?.replace('.NS', '').replace('.BO', '') || 'ASSET'}
                                </Text>
                              </View>
                              <View style={styles.holdingItemRight}>
                                <Text style={styles.holdingItemVal}>{formatINR(h.value)}</Text>
                                <Text style={styles.holdingItemShare}>{holdingShare}% of total</Text>
                              </View>
                            </View>

                            <Text style={styles.holdingFullName} numberOfLines={1}>
                              {h.instrumentName}
                            </Text>

                            <View style={styles.holdingMiniBarBg}>
                              <View
                                style={[
                                  styles.holdingMiniBarFill,
                                  { width: `${Math.min(holdingShare * 4, 100)}%` },
                                ]}
                              />
                            </View>

                            <View style={styles.holdingItemFooter}>
                              <Text style={styles.holdingQtyText}>
                                {h.quantity} units @ {formatINR(h.latestPrice)}
                              </Text>
                              {h.categoryName && (
                                <View style={[styles.catBadge, { backgroundColor: (h.categoryColor || '#3b82f6') + '20' }]}>
                                  <Text style={[styles.catBadgeText, { color: h.categoryColor || '#3b82f6' }]}>
                                    {h.categoryName}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                })()}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
