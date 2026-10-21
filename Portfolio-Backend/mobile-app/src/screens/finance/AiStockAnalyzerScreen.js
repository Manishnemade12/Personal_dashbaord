import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/theme';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components/common';
import styles from './styles/aiStockAnalyzerStyles';

export default function AiStockAnalyzerScreen({ onNavigate }) {
  // Holdings & Selection State
  const [allHoldings, setAllHoldings] = useState([]);
  const [loadingHoldings, setLoadingHoldings] = useState(true);
  const [selectedStockIds, setSelectedStockIds] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');

  // AI Analysis State
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Result Filter ('ALL' | 'AVERAGE_DOWN' | 'HOLD_LONG_TERM' | 'EXIT_OR_TRIM')
  const [resultFilter, setResultFilter] = useState('ALL');

  const scrollRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  // 1. Load User's Stock Holdings
  useEffect(() => {
    loadUserHoldings();
  }, []);

  const loadUserHoldings = async () => {
    setLoadingHoldings(true);
    try {
      const data = await api.getHoldings();
      const list = Array.isArray(data) ? data : [];
      // Filter for Equity / Stocks by default, or include all if few
      const stocksOnly = list.filter(
        (h) => h.assetClass === 'Equity' || /stock|equity/i.test(h.subCategory || '')
      );
      const finalList = stocksOnly.length > 0 ? stocksOnly : list;
      setAllHoldings(finalList);

      // Default select all stocks (up to 6)
      setSelectedStockIds(finalList.slice(0, 6).map((s) => s._id || s.symbolOrCode));
    } catch (err) {
      console.warn('Failed to load stock holdings:', err);
      showToast('Could not fetch portfolio holdings.');
    } finally {
      setLoadingHoldings(false);
    }
  };

  // Filtered stocks for selection list
  const filteredStocks = useMemo(() => {
    if (!searchFilter.trim()) return allHoldings;
    const q = searchFilter.toLowerCase();
    return allHoldings.filter(
      (s) =>
        s.instrumentName?.toLowerCase().includes(q) ||
        s.symbolOrCode?.toLowerCase().includes(q)
    );
  }, [allHoldings, searchFilter]);

  // Toggle Single Stock Selection
  const handleToggleStock = (stockId) => {
    setSelectedStockIds((prev) => {
      if (prev.includes(stockId)) {
        return prev.filter((id) => id !== stockId);
      } else {
        return [...prev, stockId];
      }
    });
  };

  // Select All / Clear Selection
  const handleToggleSelectAll = () => {
    if (selectedStockIds.length === filteredStocks.length) {
      setSelectedStockIds([]);
    } else {
      setSelectedStockIds(filteredStocks.map((s) => s._id || s.symbolOrCode));
    }
  };

  // 2. Trigger AI Stock Analysis (Grok LLM individual requests per stock!)
  const handleRunAnalysis = async () => {
    if (selectedStockIds.length === 0) {
      Alert.alert('No Stocks Selected', 'Please select at least one stock to analyze.');
      return;
    }

    const chosenStockObjects = allHoldings.filter((s) =>
      selectedStockIds.includes(s._id || s.symbolOrCode)
    );

    setAnalyzing(true);
    setStatusMessage(
      `Sending ${chosenStockObjects.length} independent Grok AI requests for deep institutional analysis...`
    );

    try {
      const res = await api.analyzeStocksWithAi({
        stockIds: selectedStockIds,
        stocks: chosenStockObjects,
      });

      if (res?.success && res.stocks) {
        setAnalysisResult(res);
        setResultFilter('ALL');
        showToast(`✨ Analyzed ${res.stocks.length} stocks with Grok AI!`);

        // Smooth scroll to results
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 300);
      } else {
        throw new Error(res?.error || 'Failed to complete stock analysis.');
      }
    } catch (err) {
      console.error('AI Analysis failed:', err);
      Alert.alert('Analysis Error', err.message || 'Could not analyze stocks with Grok AI.');
    } finally {
      setAnalyzing(false);
      setStatusMessage('');
    }
  };

  // Copy Analysis Summary to Clipboard
  const handleCopySummary = () => {
    if (!analysisResult?.summary) return;
    const s = analysisResult.summary;
    const lines = [
      `📊 AI STOCK PORTFOLIO STRATEGY`,
      `Health Score: ${s.portfolioHealthScore}/100`,
      `Stocks Analyzed: ${s.totalStocksAnalyzed}`,
      `Breakdown: 🟢 ${s.averageDownCount} Average Down | 🔵 ${s.holdCount} Hold Long Term | 🔴 ${s.exitCount} Exit/Trim`,
      `\nOverall Action Plan:`,
      s.overallActionPlan,
      `\nTop Pick:`,
      s.topRecommendation,
      `\nCapital Advice:`,
      s.capitalRebalanceAdvice,
    ];

    if (analysisResult.stocks) {
      lines.push(`\nIndividual Stock Verdicts:`);
      analysisResult.stocks.forEach((st) => {
        lines.push(
          `• ${st.instrumentName} (${st.symbolOrCode}): ${st.verdictBadge} | Target: ₹${st.targetPrice} | Zone: ${st.buyZone}`
        );
      });
    }

    const fullText = lines.join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(fullText);
    }
    showToast('✓ AI Portfolio Strategy copied to clipboard!');
  };

  // Filtered results by verdict tab
  const displayedStockResults = useMemo(() => {
    if (!analysisResult?.stocks) return [];
    if (resultFilter === 'ALL') return analysisResult.stocks;
    return analysisResult.stocks.filter((s) => s.verdict === resultFilter);
  }, [analysisResult, resultFilter]);

  const summary = analysisResult?.summary;

  return (
    <View style={styles.container}>
      {/* Screen Header */}
      <ScreenHeader
        title="AI Stock Analyzer"
        subtitle="Institutional Buy, Average Down, Hold & Exit Recommendations"
        category="INVESTMENTS & WEALTH"
        iconName="sparkles-outline"
        onBack={() => onNavigate && onNavigate('Investments')}
        backText="Investments"
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        keyboardShouldPersistTaps="handled"
      >
        {/* Grok AI Badge */}
        <View style={styles.grokBadgeRow}>
          <Ionicons name="flash" size={13} color="#7e37d8" />
          <Text style={styles.grokBadgeText}>
            Powered by Grok LLM • Individual deep analysis per stock & portfolio rebalance plan
          </Text>
        </View>

        {/* ============================================================ */}
        {/* 1. STOCK SELECTION CARD                                      */}
        {/* ============================================================ */}
        <View style={styles.card}>
          <View style={styles.selectionHeader}>
            <View style={styles.selectionTitleRow}>
              <Ionicons name="checkbox-outline" size={16} color="#7e37d8" />
              <Text style={styles.selectionTitle}>Select Stocks to Analyze</Text>
              <View style={styles.selectionCountBadge}>
                <Text style={styles.selectionCountText}>
                  {selectedStockIds.length} of {allHoldings.length}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.selectAllBtn} onPress={handleToggleSelectAll}>
              <Text style={styles.selectAllText}>
                {selectedStockIds.length === filteredStocks.length ? 'Clear All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick search filter */}
          {allHoldings.length > 4 && (
            <TextInput
              style={styles.searchInput}
              placeholder="Search by stock name or symbol (e.g. Tata, Reliance)..."
              value={searchFilter}
              onChangeText={setSearchFilter}
              placeholderTextColor={colors.textMuted}
            />
          )}

          {/* Stock selection list */}
          {loadingHoldings ? (
            <ActivityIndicator size="small" color="#7e37d8" style={{ paddingVertical: 16 }} />
          ) : filteredStocks.length === 0 ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                No stock holdings found in your portfolio.
              </Text>
              <TouchableOpacity
                style={{ marginTop: 8 }}
                onPress={() => onNavigate && onNavigate('Investments')}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                  + Add Stocks in Investments
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredStocks.map((stock) => {
              const isSelected = selectedStockIds.includes(stock._id || stock.symbolOrCode);
              const isProfit = Number(stock.pnl || 0) >= 0;
              const pnlPct = Number(stock.pnlPercent || 0).toFixed(2);

              return (
                <TouchableOpacity
                  key={stock._id || stock.symbolOrCode}
                  style={[styles.stockItem, isSelected && styles.stockItemSelected]}
                  onPress={() => handleToggleStock(stock._id || stock.symbolOrCode)}
                  activeOpacity={0.75}
                >
                  <View style={styles.stockItemLeft}>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.stockSymbol} numberOfLines={1}>
                        {stock.symbolOrCode}
                      </Text>
                      <Text style={styles.stockName} numberOfLines={1}>
                        {stock.instrumentName || stock.symbolOrCode}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stockItemRight}>
                    <Text style={styles.stockPrice}>
                      ₹{Number(stock.latestPrice || stock.averageBuyPrice || 0).toLocaleString('en-IN')}
                    </Text>
                    <View
                      style={[
                        styles.stockPnlBadge,
                        isProfit ? styles.stockPnlBadgeProfit : styles.stockPnlBadgeLoss,
                      ]}
                    >
                      <Ionicons
                        name={isProfit ? 'caret-up' : 'caret-down'}
                        size={10}
                        color={isProfit ? '#059669' : '#dc2626'}
                      />
                      <Text
                        style={isProfit ? styles.stockPnlTextProfit : styles.stockPnlTextLoss}
                      >
                        {isProfit ? '+' : ''}
                        {pnlPct}%
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* Action Button: Run Analysis */}
          <TouchableOpacity
            style={[
              styles.analyzeBtn,
              (analyzing || selectedStockIds.length === 0) && styles.analyzeBtnDisabled,
            ]}
            onPress={handleRunAnalysis}
            disabled={analyzing || selectedStockIds.length === 0}
            activeOpacity={0.85}
          >
            {analyzing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color="#ffffff" />
                <Text style={styles.analyzeBtnText}>
                  {selectedStockIds.length > 0
                    ? `Analyze ${selectedStockIds.length} Stock(s) with Grok AI`
                    : 'Select Stocks to Analyze'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ============================================================ */}
        {/* 2. LOADING STATE WITH DEDICATED PROGRESS CARD               */}
        {/* ============================================================ */}
        {analyzing && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#7e37d8" />
            <Text style={styles.loadingTitle}>Institutional AI Stock Analysis in Progress</Text>
            <Text style={styles.loadingSubtitle}>{statusMessage}</Text>
            <View style={styles.loadingPill}>
              <Text style={styles.loadingPillText}>
                ⚡ Each stock receives an isolated Grok LLM evaluation
              </Text>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* 3. EXECUTIVE PORTFOLIO SUMMARY BANNER                        */}
        {/* ============================================================ */}
        {analysisResult && summary && !analyzing && (
          <View style={styles.summaryBanner}>
            <View style={styles.summaryHeaderRow}>
              <View style={styles.summaryTitleRow}>
                <Ionicons name="shield-checkmark" size={17} color="#7e37d8" />
                <Text style={styles.summaryTitle}>Portfolio Action Plan & Health</Text>
              </View>
              <View style={styles.scoreBadge}>
                <Ionicons name="speedometer-outline" size={12} color="#ffffff" />
                <Text style={styles.scoreBadgeText}>Health: {summary.portfolioHealthScore}/100</Text>
              </View>
            </View>

            {/* Verdict Counts Row */}
            <View style={styles.breakdownRow}>
              <View style={[styles.breakdownChip, styles.breakdownChipBuy]}>
                <Text style={[styles.breakdownChipCount, { color: '#059669' }]}>
                  {summary.averageDownCount}
                </Text>
                <Text style={[styles.breakdownChipLabel, { color: '#059669' }]}>Average Down</Text>
              </View>

              <View style={[styles.breakdownChip, styles.breakdownChipHold]}>
                <Text style={[styles.breakdownChipCount, { color: '#2563eb' }]}>
                  {summary.holdCount}
                </Text>
                <Text style={[styles.breakdownChipLabel, { color: '#2563eb' }]}>Hold Long Term</Text>
              </View>

              <View style={[styles.breakdownChip, styles.breakdownChipExit]}>
                <Text style={[styles.breakdownChipCount, { color: '#dc2626' }]}>
                  {summary.exitCount}
                </Text>
                <Text style={[styles.breakdownChipLabel, { color: '#dc2626' }]}>Exit / Trim</Text>
              </View>
            </View>

            {/* Strategic Action Plan Box */}
            <View style={styles.summaryPlanBox}>
              <Text style={styles.summaryPlanTitle}>RECOMMENDED ACTION STRATEGY:</Text>
              <Text style={styles.summaryPlanText}>{summary.overallActionPlan}</Text>
            </View>

            <Text style={styles.rebalanceNote}>
              💡 Capital Advice: {summary.capitalRebalanceAdvice}
            </Text>
          </View>
        )}

        {/* ============================================================ */}
        {/* 4. RESULTS FILTER TABS & STOCK CARDS                         */}
        {/* ============================================================ */}
        {analysisResult?.stocks && !analyzing && (
          <>
            {/* Filter Tabs */}
            <View style={styles.filterTabsRow}>
              <TouchableOpacity
                style={[styles.filterTab, resultFilter === 'ALL' && styles.filterTabActive]}
                onPress={() => setResultFilter('ALL')}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    resultFilter === 'ALL' && styles.filterTabTextActive,
                  ]}
                >
                  All ({analysisResult.stocks.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterTab,
                  resultFilter === 'AVERAGE_DOWN' && styles.filterTabActive,
                ]}
                onPress={() => setResultFilter('AVERAGE_DOWN')}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    resultFilter === 'AVERAGE_DOWN' && styles.filterTabTextActive,
                  ]}
                >
                  🟢 Average Down ({summary?.averageDownCount || 0})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterTab,
                  resultFilter === 'HOLD_LONG_TERM' && styles.filterTabActive,
                ]}
                onPress={() => setResultFilter('HOLD_LONG_TERM')}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    resultFilter === 'HOLD_LONG_TERM' && styles.filterTabTextActive,
                  ]}
                >
                  🔵 Hold ({summary?.holdCount || 0})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterTab,
                  resultFilter === 'EXIT_OR_TRIM' && styles.filterTabActive,
                ]}
                onPress={() => setResultFilter('EXIT_OR_TRIM')}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    resultFilter === 'EXIT_OR_TRIM' && styles.filterTabTextActive,
                  ]}
                >
                  🔴 Exit / Trim ({summary?.exitCount || 0})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Individual Stock Detailed Cards */}
            {displayedStockResults.map((stock) => {
              const isBuy = stock.verdict === 'AVERAGE_DOWN';
              const isExit = stock.verdict === 'EXIT_OR_TRIM';
              const isProfit = Number(stock.pnl || 0) >= 0;

              return (
                <View
                  key={stock.symbolOrCode}
                  style={[
                    styles.stockAnalysisCard,
                    isBuy
                      ? styles.stockAnalysisCardBuy
                      : isExit
                      ? styles.stockAnalysisCardExit
                      : styles.stockAnalysisCardHold,
                  ]}
                >
                  {/* Card Top Row: Name, Symbol, Verdict Badge */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.stockTitleRow}>
                      <Text style={styles.cardSymbolText}>{stock.symbolOrCode}</Text>
                      <Text style={styles.cardCompanyText} numberOfLines={1}>
                        {stock.instrumentName}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.verdictBadge,
                        isBuy
                          ? styles.verdictBadgeBuy
                          : isExit
                          ? styles.verdictBadgeExit
                          : styles.verdictBadgeHold,
                      ]}
                    >
                      <Text
                        style={[
                          styles.verdictBadgeText,
                          isBuy
                            ? styles.verdictBadgeTextBuy
                            : isExit
                            ? styles.verdictBadgeTextExit
                            : styles.verdictBadgeTextHold,
                        ]}
                      >
                        {stock.verdictBadge || stock.verdict}
                      </Text>
                    </View>
                  </View>

                  {/* Position Stats Grid */}
                  <View style={styles.statsGrid}>
                    <View style={styles.statCol}>
                      <Text style={styles.statColLabel}>Buy Average</Text>
                      <Text style={styles.statColVal}>
                        ₹{Number(stock.averageBuyPrice || 0).toLocaleString('en-IN')}
                      </Text>
                    </View>

                    <View style={styles.statCol}>
                      <Text style={styles.statColLabel}>Current Price</Text>
                      <Text style={styles.statColVal}>
                        ₹{Number(stock.latestPrice || 0).toLocaleString('en-IN')}
                      </Text>
                    </View>

                    <View style={styles.statCol}>
                      <Text style={styles.statColLabel}>P&L</Text>
                      <Text
                        style={[
                          styles.statColVal,
                          { color: isProfit ? '#059669' : '#dc2626' },
                        ]}
                      >
                        {isProfit ? '+' : ''}
                        {Number(stock.pnlPercent || 0).toFixed(2)}%
                      </Text>
                    </View>
                  </View>

                  {/* Key Target Levels Row */}
                  <View style={styles.levelsRow}>
                    <View style={styles.levelBox}>
                      <Text style={styles.levelBoxLabel}>Target Price</Text>
                      <Text style={[styles.levelBoxVal, { color: '#059669' }]}>
                        ₹{stock.targetPrice || 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.levelBox}>
                      <Text style={styles.levelBoxLabel}>Buy / Acc. Zone</Text>
                      <Text style={[styles.levelBoxVal, { color: '#2563eb' }]}>
                        {stock.buyZone || 'Current'}
                      </Text>
                    </View>

                    <View style={styles.levelBox}>
                      <Text style={styles.levelBoxLabel}>Stop Loss</Text>
                      <Text style={[styles.levelBoxVal, { color: '#dc2626' }]}>
                        ₹{stock.stopLoss || 'N/A'}
                      </Text>
                    </View>
                  </View>

                  {/* Action Plan Box */}
                  <View style={styles.actionPlanBox}>
                    <Text style={styles.actionPlanTitle}>ACTION PLAN FOR YOU:</Text>
                    <Text style={styles.actionPlanText}>{stock.actionPlan}</Text>
                  </View>

                  {/* Fundamental & Technical Thesis */}
                  <Text style={styles.thesisText}>
                    <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                      Fundamental:
                    </Text>{' '}
                    {stock.fundamentalThesis}
                  </Text>
                  <Text style={styles.thesisText}>
                    <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                      Technical:
                    </Text>{' '}
                    {stock.technicalTrend}
                  </Text>

                  {/* Footer Row: Time Horizon & Conviction */}
                  <View style={styles.tagsRow}>
                    <Text style={styles.horizonBadge}>
                      ⏱️ {stock.timeHorizon || '1-2 Years'} • {stock.riskRating || 'Medium'} Risk
                    </Text>
                    <Text style={styles.convictionBadge}>
                      ⚡ {stock.conviction || 85}% Conviction
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Bottom Secondary Actions */}
            <View style={styles.secondaryRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleCopySummary}
                activeOpacity={0.7}
              >
                <Ionicons name="copy-outline" size={14} color={colors.textPrimary} />
                <Text style={styles.secondaryBtnText}>Copy Plan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleRunAnalysis}
                activeOpacity={0.7}
                disabled={analyzing}
              >
                <Ionicons name="refresh-outline" size={14} color={colors.textPrimary} />
                <Text style={styles.secondaryBtnText}>Re-Analyze</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={15} color="#34d399" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </View>
  );
}
