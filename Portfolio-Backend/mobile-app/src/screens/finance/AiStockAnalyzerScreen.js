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

/**
 * Sanitize raw LaTeX math syntax into clean, standard Unicode symbols and Indian Rupee notation
 */
function sanitizeLatexAndMarkdown(rawText) {
  if (!rawText) return '';
  let str = String(rawText);

  // 1. Normalize line breaks
  str = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Remove block math delimiters $$ ... $$ and \[ ... \]
  str = str.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, '$1');
  str = str.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, '$1');

  // 3. Remove inline math delimiters \( ... \) and $ ... $
  str = str.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, '$1');
  str = str.replace(/\$([^\$\n]+?)\$/g, (match, inner) => inner.trim());

  // 4. Flatten inner text/formatting commands FIRST so nested braces are removed
  str = str.replace(/\\(?:text|mathrm|operatorname)\{([^{}]+)\}/g, '$1');
  str = str.replace(/\\(?:textbf|mathbf)\{([^{}]+)\}/g, '**$1**');
  str = str.replace(/\\(?:textit|mathit)\{([^{}]+)\}/g, '*$1*');
  str = str.replace(/\\boxed\{([^{}]+)\}/g, '[$1]');
  str = str.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)');

  // 5. Transform LaTeX fractions: \frac{a}{b}, \dfrac{a}{b}, \tfrac{a}{b} -> (a / b)
  for (let i = 0; i < 4; i++) {
    str = str.replace(/\\(?:d|t)?frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1 / $2)');
  }

  // 6. LaTeX math symbols to standard Unicode
  const symbolMap = [
    [/\\times\b/g, '×'],
    [/\\cdot\b/g, '·'],
    [/\\div\b/g, '÷'],
    [/\\approx\b/g, '≈'],
    [/\\pm\b/g, '±'],
    [/\\mp\b/g, '∓'],
    [/\\neq\b/g, '≠'],
    [/\\leq\b|\\le\b/g, '≤'],
    [/\\geq\b|\\ge\b/g, '≥'],
    [/\\ll\b/g, '≪'],
    [/\\gg\b/g, '≫'],
    [/\\infty\b/g, '∞'],
    [/\\sum\b/g, '∑'],
    [/\\prod\b/g, '∏'],
    [/\\Delta\b|\\delta\b/g, 'Δ'],
    [/\\alpha\b/g, 'α'],
    [/\\beta\b/g, 'β'],
    [/\\theta\b/g, 'θ'],
    [/\\pi\b/g, 'π'],
    [/\\sigma\b/g, 'σ'],
    [/\\mu\b/g, 'μ'],
    [/\\to\b|\\rightarrow\b/g, '→'],
    [/\\leftarrow\b/g, '←'],
    [/\\uparrow\b/g, '↑'],
    [/\\downarrow\b/g, '↓'],
    [/\\dots\b|\\ldots\b/g, '...'],
    [/\\left\(/g, '('],
    [/\\right\)/g, ')'],
    [/\\left\[/g, '['],
    [/\\right\]/g, ']'],
    [/\\left\{/g, '{'],
    [/\\right\}/g, '}'],
    [/\\%/g, '%'],
    [/\\([$_&])/g, '$1'],
    [/\\quad\b/g, '  '],
    [/\\qquad\b/g, '    '],
    [/\\([,;:!])/g, ' '],
  ];

  symbolMap.forEach(([reg, rep]) => {
    str = str.replace(reg, rep);
  });

  // 7. Clean up multiple spaces and lingering backslashes
  str = str.replace(/\\([a-zA-Z]+)/g, '$1');

  return str;
}

/**
 * Rich Formatted AI Response Renderer:
 * Parses LaTeX, Markdown tables, semantic color badges (Average Down 🟢, Hold 🔵, Exit 🔴),
 * bullet lists, code blocks, and bold highlights.
 */
function FormattedAiText({ text, isUser = false }) {
  if (!text) return null;
  if (isUser) {
    return <Text style={styles.messageTextUser}>{text}</Text>;
  }

  const cleanedText = sanitizeLatexAndMarkdown(text);
  const rawLines = cleanedText.split('\n');

  // Parse lines into structured blocks
  const blocks = [];
  let currentTable = null;
  let inCodeBlock = false;
  let codeBuffer = [];

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const line = rawLine.trim();

    // Code / Formula block toggle
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        blocks.push({ type: 'code', lines: codeBuffer });
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Markdown Table detection: lines with '|'
    if (line.startsWith('|') && line.endsWith('|')) {
      // Ignore separator row like '| --- | --- |'
      if (/^\|[\s\-:|]+\|$/.test(line)) {
        continue;
      }
      const cells = line
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());

      if (!currentTable) {
        currentTable = { headers: cells, rows: [] };
      } else {
        currentTable.rows.push(cells);
      }
      continue;
    } else {
      if (currentTable) {
        blocks.push({ type: 'table', data: currentTable });
        currentTable = null;
      }
    }

    if (!line) {
      blocks.push({ type: 'spacer' });
      continue;
    }

    // Headings: "# ...", "## ...", "### ..."
    if (line.startsWith('#')) {
      const heading = line.replace(/^#+\s*/, '');
      blocks.push({ type: 'heading', text: heading });
      continue;
    }

    // Bullets: "- ...", "* ...", "• ...", "1. ..."
    const bulletMatch = line.match(/^([-*•]|\d+\.)\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({ type: 'bullet', bullet: bulletMatch[1], text: bulletMatch[2] });
      continue;
    }

    // Standard paragraph line
    blocks.push({ type: 'paragraph', text: line });
  }

  if (currentTable) {
    blocks.push({ type: 'table', data: currentTable });
  }
  if (codeBuffer.length > 0) {
    blocks.push({ type: 'code', lines: codeBuffer });
  }

  return (
    <View style={{ gap: 4, width: '100%' }}>
      {blocks.map((block, idx) => {
        if (block.type === 'spacer') {
          return <View key={idx} style={{ height: 3 }} />;
        }

        // Semantic colored headings
        if (block.type === 'heading') {
          const isAverage = /average|accumulate|buy/i.test(block.text);
          const isExit = /exit|trim|sell|profit|cut\s*loss/i.test(block.text);
          const isHold = /hold/i.test(block.text);
          const isTarget = /target|support|stop\s*loss|levels|action/i.test(block.text);

          const badgeBg = isAverage
            ? '#ecfdf5'
            : isExit
            ? '#fef2f2'
            : isHold
            ? '#eff6ff'
            : isTarget
            ? '#fffbeb'
            : '#f5f3ff';
          const badgeBorder = isAverage
            ? '#10b981'
            : isExit
            ? '#ef4444'
            : isHold
            ? '#3b82f6'
            : isTarget
            ? '#f59e0b'
            : '#8b5cf6';
          const textColor = isAverage
            ? '#065f46'
            : isExit
            ? '#991b1b'
            : isHold
            ? '#1e40af'
            : isTarget
            ? '#92400e'
            : '#581c87';

          return (
            <View
              key={idx}
              style={{
                backgroundColor: badgeBg,
                borderLeftWidth: 3.5,
                borderLeftColor: badgeBorder,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 4,
                marginTop: 5,
                marginBottom: 2,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: textColor }}>
                {block.text}
              </Text>
            </View>
          );
        }

        // Native Responsive Data Table
        if (block.type === 'table') {
          return (
            <View
              key={idx}
              style={{
                borderWidth: 1,
                borderColor: '#cbd5e1',
                borderRadius: 6,
                backgroundColor: '#ffffff',
                marginVertical: 4,
                overflow: 'hidden',
              }}
            >
              {/* Table Header */}
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: '#f1f5f9',
                  borderBottomWidth: 1,
                  borderBottomColor: '#cbd5e1',
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                }}
              >
                {block.data.headers.map((h, hIdx) => (
                  <Text
                    key={hIdx}
                    style={{
                      flex: 1,
                      fontSize: 11,
                      fontWeight: '800',
                      color: '#334155',
                      textAlign: hIdx === 0 ? 'left' : 'center',
                    }}
                  >
                    {h}
                  </Text>
                ))}
              </View>

              {/* Table Rows */}
              {block.data.rows.map((row, rIdx) => (
                <View
                  key={rIdx}
                  style={{
                    flexDirection: 'row',
                    backgroundColor: rIdx % 2 === 0 ? '#ffffff' : '#f8fafc',
                    borderBottomWidth: rIdx === block.data.rows.length - 1 ? 0 : 1,
                    borderBottomColor: '#f1f5f9',
                    paddingVertical: 6,
                    paddingHorizontal: 8,
                  }}
                >
                  {row.map((cell, cIdx) => (
                    <Text
                      key={cIdx}
                      style={{
                        flex: 1,
                        fontSize: 11,
                        color: '#1e293b',
                        fontWeight: cIdx === 0 ? '700' : '500',
                        textAlign: cIdx === 0 ? 'left' : 'center',
                      }}
                    >
                      {cell}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          );
        }

        // Code / Formula Monospace Block
        if (block.type === 'code') {
          return (
            <View
              key={idx}
              style={{
                backgroundColor: '#0f172a',
                padding: 10,
                borderRadius: 6,
                marginVertical: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 11.5,
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  color: '#38bdf8',
                  lineHeight: 18,
                }}
              >
                {block.lines.join('\n')}
              </Text>
            </View>
          );
        }

        // Bullet or Paragraph with Bold Highlights
        const isBullet = block.type === 'bullet';
        const content = block.text;
        const parts = content.split(/(\*\*[^*]+\*\*)/g);

        return (
          <View
            key={idx}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              paddingLeft: isBullet ? 6 : 0,
              gap: 6,
            }}
          >
            {isBullet && (
              <Text style={{ fontSize: 13, color: '#7e37d8', lineHeight: 18, fontWeight: '800' }}>
                {block.bullet?.includes('.') ? block.bullet : '•'}
              </Text>
            )}
            <Text style={{ flex: 1, fontSize: 12.5, color: '#1e293b', lineHeight: 19 }}>
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  const boldText = part.slice(2, -2);
                  const isAvg = /average\s*down|buy|target|upside/i.test(boldText);
                  const isEx = /exit|trim|loss|stop\s*loss|risk/i.test(boldText);
                  const isHld = /hold|support|neutral/i.test(boldText);

                  return (
                    <Text
                      key={pIdx}
                      style={{
                        fontWeight: '800',
                        color: isAvg ? '#047857' : isEx ? '#b91c1c' : isHld ? '#1d4ed8' : '#0f172a',
                      }}
                    >
                      {boldText}
                    </Text>
                  );
                }
                return <Text key={pIdx}>{part}</Text>;
              })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function AiStockAnalyzerScreen({ onNavigate }) {
  // Holdings & Selection State
  const [allHoldings, setAllHoldings] = useState([]);
  const [loadingHoldings, setLoadingHoldings] = useState(true);
  const [selectedStockIds, setSelectedStockIds] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [isStocksCollapsed, setIsStocksCollapsed] = useState(false);

  // AI Analysis State
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Result Filter ('ALL' | 'AVERAGE_DOWN' | 'HOLD_LONG_TERM' | 'EXIT_OR_TRIM')
  const [resultFilter, setResultFilter] = useState('ALL');

  // Active Tab ('strategy' | 'chat')
  const [activeTab, setActiveTab] = useState('strategy');

  // AI Stock Chat State
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Namaste! I am your AI Investment CIO & Equity Advisor. Ask me anything about your selected stocks — whether to average down at current prices, hold for compounding, or exit/trim. I evaluate using your actual buy price and live market trends.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const scrollRef = useRef(null);
  const chatScrollRef = useRef(null);

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

  // 3. Send Message in Interactive AI Stock Chat
  const handleSendChatMessage = async (customPrompt) => {
    const q = (typeof customPrompt === 'string' ? customPrompt : chatInput).trim();
    if (!q) return;

    const chosenStockObjects = allHoldings.filter((s) =>
      selectedStockIds.includes(s._id || s.symbolOrCode)
    );

    const userMsg = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: q,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setSendingChat(true);

    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const res = await api.chatWithStockAi({
        question: q,
        selectedStocks: chosenStockObjects,
        history: chatMessages.slice(-6),
      });

      if (res?.success && res.answer) {
        const aiMsg = {
          id: `msg-${Date.now()}-ai`,
          sender: 'ai',
          text: res.answer,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setChatMessages((prev) => [...prev, aiMsg]);
        setTimeout(() => {
          chatScrollRef.current?.scrollToEnd({ animated: true });
        }, 150);
      } else {
        throw new Error(res?.error || 'No response from Stock AI');
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errMsg = {
        id: `msg-${Date.now()}-err`,
        sender: 'ai',
        text: `⚠️ Could not complete query: ${err.message}. Please check selected stocks and try again.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errMsg]);
    } finally {
      setSendingChat(false);
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
            Powered by Grok LLM • Individual deep analysis per stock & interactive chat
          </Text>
        </View>

        {/* Tab Switcher: Strategy & Verdicts vs AI Stock Chat */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'strategy' && styles.tabBtnActive]}
            onPress={() => setActiveTab('strategy')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="analytics"
              size={15}
              color={activeTab === 'strategy' ? '#7e37d8' : '#64748b'}
            />
            <Text
              style={[styles.tabBtnText, activeTab === 'strategy' && styles.tabBtnTextActive]}
            >
              Strategy & Verdicts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'chat' && styles.tabBtnActive]}
            onPress={() => setActiveTab('chat')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="chatbubbles"
              size={15}
              color={activeTab === 'chat' ? '#7e37d8' : '#64748b'}
            />
            <Text style={[styles.tabBtnText, activeTab === 'chat' && styles.tabBtnTextActive]}>
              AI Stock Chat
            </Text>
          </TouchableOpacity>
        </View>

        {/* ============================================================ */}
        {/* COMPACT STOCK SELECTION BOX (SHARED & FIXED-HEIGHT SCROLL)   */}
        {/* ============================================================ */}
        {isStocksCollapsed ? (
          <View style={styles.stocksCollapsedBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Ionicons name="layers" size={15} color="#7e37d8" />
              <Text style={styles.stocksCollapsedText} numberOfLines={1}>
                {selectedStockIds.length === 0
                  ? 'All holdings active (tap to select specific stocks)'
                  : `${selectedStockIds.length} Stock(s) Active: ${allHoldings
                      .filter((s) => selectedStockIds.includes(s._id || s.symbolOrCode))
                      .map((s) => s.symbolOrCode)
                      .slice(0, 3)
                      .join(', ')}${selectedStockIds.length > 3 ? '...' : ''}`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.expandStocksBtn}
              onPress={() => setIsStocksCollapsed(false)}
            >
              <Text style={styles.expandStocksBtnText}>▼ Change</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.selectionHeader}>
              <View style={styles.selectionTitleRow}>
                <Ionicons name="checkbox-outline" size={16} color="#7e37d8" />
                <Text style={styles.selectionTitle}>Select Stocks to Analyze / Chat</Text>
                <View style={styles.selectionCountBadge}>
                  <Text style={styles.selectionCountText}>
                    {selectedStockIds.length} of {allHoldings.length}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity style={styles.selectAllBtn} onPress={handleToggleSelectAll}>
                  <Text style={styles.selectAllText}>
                    {selectedStockIds.length === filteredStocks.length ? 'Clear All' : 'Select All'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.collapseToggleBtn}
                  onPress={() => setIsStocksCollapsed(true)}
                >
                  <Text style={styles.collapseToggleText}>▲ Minimize</Text>
                </TouchableOpacity>
              </View>
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

            {/* Compact Scrollable Stock selection list (Fixed height with internal scroll) */}
            {loadingHoldings ? (
              <ActivityIndicator size="small" color="#7e37d8" style={{ paddingVertical: 16 }} />
            ) : filteredStocks.length === 0 ? (
              <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  No stock holdings found in your portfolio.
                </Text>
                <TouchableOpacity
                  style={{ marginTop: 6 }}
                  onPress={() => onNavigate && onNavigate('Investments')}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                    + Add Stocks in Investments
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                style={styles.stockSelectionScroll}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {filteredStocks.map((stock) => {
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
                })}
              </ScrollView>
            )}
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 1: STRATEGY & RECOMMENDATIONS                            */}
        {/* ============================================================ */}
        {activeTab === 'strategy' && (
          <>
            {/* Action Button: Run Analysis */}
            <TouchableOpacity
              style={[
                styles.analyzeBtn,
                (analyzing || selectedStockIds.length === 0) && styles.analyzeBtnDisabled,
                { marginBottom: 12 },
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
              <FormattedAiText text={summary.overallActionPlan} />
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
                    <FormattedAiText text={stock.actionPlan} />
                  </View>

                  {/* Fundamental & Technical Thesis */}
                  <View style={{ marginVertical: 3 }}>
                    <Text style={{ fontWeight: '700', fontSize: 12, color: colors.textPrimary, marginBottom: 2 }}>
                      Fundamental Thesis:
                    </Text>
                    <FormattedAiText text={stock.fundamentalThesis} />
                  </View>

                  <View style={{ marginVertical: 3 }}>
                    <Text style={{ fontWeight: '700', fontSize: 12, color: colors.textPrimary, marginBottom: 2 }}>
                      Technical Trend & Levels:
                    </Text>
                    <FormattedAiText text={stock.technicalTrend} />
                  </View>

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
          </>
        )}

        {/* ============================================================ */}
        {/* TAB 2: INTERACTIVE AI STOCK CHAT (AT TOP WITH COMPACT CONTEXT) */}
        {/* ============================================================ */}
        {activeTab === 'chat' && (
          <View style={styles.chatContainerCard}>
            {/* Context Banner: Active Selected Stocks */}
            <View style={styles.chatContextBanner}>
              <View style={styles.chatContextTitleRow}>
                <Text style={styles.chatContextTitle}>Active Context Stocks ({selectedStockIds.length})</Text>
                <TouchableOpacity onPress={() => setIsStocksCollapsed((v) => !v)}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#7e37d8' }}>
                    {isStocksCollapsed ? '+ Add / Change Stocks' : '▲ Minimize Stock Box'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Selected Stock Chips Row */}
              <View style={styles.chatContextChipsWrap}>
                {selectedStockIds.length === 0 ? (
                  <Text style={{ fontSize: 11, color: '#64748b' }}>
                    No stocks selected. AI will answer general equity strategy questions. Click "+ Add / Change Stocks" above.
                  </Text>
                ) : (
                  allHoldings
                    .filter((s) => selectedStockIds.includes(s._id || s.symbolOrCode))
                    .map((st) => (
                      <View key={st._id || st.symbolOrCode} style={styles.chatContextChip}>
                        <Text style={styles.chatContextChipText}>
                          {st.symbolOrCode} (₹{Number(st.latestPrice || st.averageBuyPrice || 0).toLocaleString('en-IN')})
                        </Text>
                        <TouchableOpacity onPress={() => handleToggleStock(st._id || st.symbolOrCode)}>
                          <Ionicons name="close-circle" size={14} color="#a855f7" />
                        </TouchableOpacity>
                      </View>
                    ))
                )}
              </View>
            </View>

            {/* Quick Prompts */}
            <Text style={styles.chatQuickPromptsTitle}>Quick Questions to Ask AI:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.quickPromptsRow}
            >
              {[
                '⚡ Should I average down or exit?',
                '🎯 Target & stop-loss levels?',
                '📉 Market 5% correction plan',
                '⚖️ Capital rebalancing advice',
                '🏆 Which stock has highest upside?',
              ].map((qp, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.quickPromptChip}
                  onPress={() => handleSendChatMessage(qp)}
                  disabled={sendingChat}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickPromptText}>{qp}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Message Bubbles Scroll with Rich Markdown Formatter */}
            <ScrollView
              ref={chatScrollRef}
              style={styles.chatMessagesList}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {chatMessages.map((msg) => (
                <View
                  key={msg.id}
                  style={msg.sender === 'user' ? styles.messageRowUser : styles.messageRowAi}
                >
                  {msg.sender === 'ai' && (
                    <View style={styles.messageHeaderAi}>
                      <Ionicons name="sparkles" size={13} color="#7e37d8" />
                      <Text style={styles.messageSenderAi}>AI Portfolio CIO</Text>
                    </View>
                  )}
                  <FormattedAiText text={msg.text} isUser={msg.sender === 'user'} />
                </View>
              ))}
              {sendingChat && (
                <View style={styles.messageRowAi}>
                  <View style={styles.messageHeaderAi}>
                    <ActivityIndicator size="small" color="#7e37d8" />
                    <Text style={styles.messageSenderAi}>Analyzing with Grok LLM...</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#64748b' }}>
                    Evaluating your entry price vs current market trends...
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Input Row */}
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatTextInput}
                placeholder="Ask in Hindi or English (e.g. Reliance me average kare ya wait?)..."
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={() => handleSendChatMessage()}
                returnKeyType="send"
                editable={!sendingChat}
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity
                style={[
                  styles.chatSendBtn,
                  (!chatInput.trim() || sendingChat) && styles.chatSendBtnDisabled,
                ]}
                onPress={() => handleSendChatMessage()}
                disabled={!chatInput.trim() || sendingChat}
                activeOpacity={0.8}
              >
                <Ionicons name="send" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
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
