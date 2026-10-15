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
import styles from './styles/investmentStyles';
import { ASSET_CLASSES, ASSET_META } from './constants/assetOptions';
import InvestmentHeader from './components/InvestmentHeader';
import InvestmentModals from './components/InvestmentModals';

export default function InvestmentScreen({ onNavigate }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [selectedAssetClass, setSelectedAssetClass] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingHolding, setEditingHolding] = useState(null);

  // Add Asset Form
  const [newAssetClass, setNewAssetClass] = useState('Equity');
  const [newSubCategory, setNewSubCategory] = useState('Stocks');
  const [instrumentQuery, setInstrumentQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [liveQuoteForNew, setLiveQuoteForNew] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [searchingInstruments, setSearchingInstruments] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [newQuantity, setNewQuantity] = useState('');
  const [newBuyPrice, setNewBuyPrice] = useState(''); // User's manual purchase price!
  const [savingNewHolding, setSavingNewHolding] = useState(false);

  // Edit Holding Form
  const [editQuantity, setEditQuantity] = useState('');
  const [editBuyPrice, setEditBuyPrice] = useState('');
  const [editSubCategory, setEditSubCategory] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Add More to Existing Holding
  const [addMoreModalVisible, setAddMoreModalVisible] = useState(false);
  const [addMoreHolding, setAddMoreHolding] = useState(null);
  const [addMoreQty, setAddMoreQty] = useState('');
  const [addMorePrice, setAddMorePrice] = useState('');
  const [addMoreLivePrice, setAddMoreLivePrice] = useState(null);
  const [loadingAddMoreQuote, setLoadingAddMoreQuote] = useState(false);
  const [savingAddMore, setSavingAddMore] = useState(false);

  // Bulk / Selective Remove Holdings
  const [bulkRemoveModalVisible, setBulkRemoveModalVisible] = useState(false);
  const [selectedHoldingIds, setSelectedHoldingIds] = useState([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Grok AI Vision Import & Confirmation Review
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiStep, setAiStep] = useState('upload'); // 'upload' | 'scanning' | 'review'
  const [selectedAiImage, setSelectedAiImage] = useState(null);
  const [aiFileName, setAiFileName] = useState('');
  const [extractedHoldings, setExtractedHoldings] = useState([]);
  const [isScanningAi, setIsScanningAi] = useState(false);
  const [isSavingBulkAi, setIsSavingBulkAi] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, holdRes] = await Promise.all([
        api.getInvestmentSummary(),
        api.getHoldings(),
      ]);
      setSummary(sumRes);
      setHoldings(Array.isArray(holdRes) ? holdRes : []);
    } catch (err) {
      console.log('Error loading investment portfolio:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefreshPrices = async () => {
    setRefreshing(true);
    await loadData();
  };

  // Search autocomplete instruments from live market APIs
  useEffect(() => {
    if (!addModalVisible) return;
    setSearchingInstruments(true);
    const timer = setTimeout(async () => {
      try {
        const type = newAssetClass === 'Mutual Fund' ? 'Mutual Fund' : newAssetClass === 'ETF' ? 'ETF' : 'stock';
        const res = await api.searchInstruments(instrumentQuery, type);
        setSearchResults(Array.isArray(res) ? res : []);
      } catch (e) {
      } finally {
        setSearchingInstruments(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [instrumentQuery, newAssetClass, addModalVisible]);

  // When an instrument is picked in Add modal
  const handlePickInstrument = async (inst) => {
    setSelectedInstrument(inst);
    setNewAssetClass(inst.assetClass);
    setNewSubCategory(inst.subCategory);
    setLoadingQuote(true);
    try {
      const quote = await api.getInstrumentPrice(inst.symbolOrCode, inst.assetClass);
      setLiveQuoteForNew(quote);
      // Pre-fill user's buy price with live quote price as a helpful default, but let them edit freely
      setNewBuyPrice(String(quote.price || inst.basePrice || ''));
    } catch (e) {
      const fallbackPrice = inst.basePrice || 100;
      setLiveQuoteForNew({ price: fallbackPrice, instrumentName: inst.instrumentName });
      setNewBuyPrice(String(fallbackPrice));
    } finally {
      setLoadingQuote(false);
    }
  };

  // Save new holding to tracker
  const handleSaveNewHolding = async () => {
    if (!selectedInstrument) {
      Alert.alert('Required', 'Please select a stock or fund scheme');
      return;
    }
    if (!newQuantity || isNaN(Number(newQuantity)) || Number(newQuantity) <= 0) {
      Alert.alert('Required', 'Please enter the number of shares / units (>0)');
      return;
    }
    if (!newBuyPrice || isNaN(Number(newBuyPrice)) || Number(newBuyPrice) <= 0) {
      Alert.alert('Required', 'Please enter your purchase price per share / unit (>0)');
      return;
    }

    setSavingNewHolding(true);
    try {
      await api.createHolding({
        symbolOrCode: selectedInstrument.symbolOrCode,
        instrumentName: selectedInstrument.instrumentName,
        assetClass: newAssetClass,
        subCategory: newSubCategory,
        quantity: Number(newQuantity),
        buyPrice: Number(newBuyPrice), // User's manual buy price!
      });

      Alert.alert('Added', `${selectedInstrument.instrumentName} added to your wealth tracker!`);
      setAddModalVisible(false);
      resetAddForm();
      loadData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to add holding');
    } finally {
      setSavingNewHolding(false);
    }
  };

  const resetAddForm = () => {
    setSelectedInstrument(null);
    setLiveQuoteForNew(null);
    setNewQuantity('');
    setNewBuyPrice('');
    setInstrumentQuery('');
  };

  // Open Edit Holding Modal
  const openEditModal = (h) => {
    setEditingHolding(h);
    setEditQuantity(String(h.quantity || ''));
    setEditBuyPrice(String(h.averageBuyPrice || ''));
    setEditSubCategory(h.subCategory || '');
    setEditModalVisible(true);
  };

  // Save edited holding
  const handleSaveEditHolding = async () => {
    if (!editQuantity || isNaN(Number(editQuantity)) || Number(editQuantity) <= 0) {
      Alert.alert('Required', 'Please enter a valid quantity');
      return;
    }
    if (!editBuyPrice || isNaN(Number(editBuyPrice)) || Number(editBuyPrice) <= 0) {
      Alert.alert('Required', 'Please enter a valid purchase price');
      return;
    }

    setSavingEdit(true);
    try {
      await api.updateHolding(editingHolding._id, {
        quantity: Number(editQuantity),
        averageBuyPrice: Number(editBuyPrice),
        subCategory: editSubCategory.trim(),
      });

      Alert.alert('Updated', 'Holding metrics updated successfully');
      setEditModalVisible(false);
      loadData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update holding');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete holding
  const handleDeleteHolding = (holding) => {
    Alert.alert(
      'Remove Holding',
      `Remove "${holding.instrumentName}" from your investment tracker?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteHolding(holding._id);
              loadData();
            } catch (e) {
              Alert.alert('Error', 'Failed to remove holding');
            }
          },
        },
      ]
    );
  };

  // Open "Add More" modal for an existing holding
  const openAddMoreModal = async (h) => {
    setAddMoreHolding(h);
    setAddMoreQty('');
    setAddMorePrice('');
    setAddMoreLivePrice(null);
    setAddMoreModalVisible(true);
    // Fetch live price for this instrument
    setLoadingAddMoreQuote(true);
    try {
      const quote = await api.getInstrumentPrice(h.symbolOrCode, h.assetClass);
      setAddMoreLivePrice(quote?.price || h.latestPrice || 0);
      setAddMorePrice(String(quote?.price || h.latestPrice || ''));
    } catch (e) {
      setAddMoreLivePrice(h.latestPrice || 0);
      setAddMorePrice(String(h.latestPrice || ''));
    } finally {
      setLoadingAddMoreQuote(false);
    }
  };

  // Save "Add More" â€” uses the same createHolding API which auto-averages
  const handleSaveAddMore = async () => {
    if (!addMoreQty || isNaN(Number(addMoreQty)) || Number(addMoreQty) <= 0) {
      Alert.alert('Required', 'Please enter a valid quantity (> 0)');
      return;
    }
    if (!addMorePrice || isNaN(Number(addMorePrice)) || Number(addMorePrice) <= 0) {
      Alert.alert('Required', 'Please enter a valid buy price (> 0)');
      return;
    }

    setSavingAddMore(true);
    try {
      await api.createHolding({
        symbolOrCode: addMoreHolding.symbolOrCode,
        instrumentName: addMoreHolding.instrumentName,
        assetClass: addMoreHolding.assetClass,
        subCategory: addMoreHolding.subCategory,
        quantity: Number(addMoreQty),
        buyPrice: Number(addMorePrice),
      });

      const oldQty = addMoreHolding.quantity || 0;
      const addQty = Number(addMoreQty);
      const newAvg = ((oldQty * (addMoreHolding.averageBuyPrice || 0)) + (addQty * Number(addMorePrice))) / (oldQty + addQty);

      Alert.alert(
        'Added Successfully',
        `${addQty} more units added to ${addMoreHolding.instrumentName}.\nNew Avg Buy Price: â‚¹${newAvg.toFixed(2)}\nTotal Qty: ${oldQty + addQty}`
      );
      setAddMoreModalVisible(false);
      loadData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to add more units');
    } finally {
      setSavingAddMore(false);
    }
  };

  // Open selective / bulk remove modal
  const openBulkRemoveModal = () => {
    setSelectedHoldingIds([]);
    setBulkRemoveModalVisible(true);
  };

  const toggleSelectHolding = (id) => {
    setSelectedHoldingIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllHoldings = () => {
    if (selectedHoldingIds.length === holdings.length) {
      setSelectedHoldingIds([]);
    } else {
      setSelectedHoldingIds(holdings.map((h) => h._id));
    }
  };

  const handleConfirmBulkRemoveHoldings = async () => {
    if (selectedHoldingIds.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one asset to remove.');
      return;
    }

    Alert.alert(
      'Remove Selected Holdings',
      `Are you sure you want to remove ${selectedHoldingIds.length} asset(s) from your tracker?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Remove (${selectedHoldingIds.length})`,
          style: 'destructive',
          onPress: async () => {
            setIsDeletingBulk(true);
            try {
              if (selectedHoldingIds.length === holdings.length) {
                await api.clearAllInvestments();
              } else {
                await Promise.all(selectedHoldingIds.map((id) => api.deleteHolding(id)));
              }
              Alert.alert('Removed', `${selectedHoldingIds.length} asset(s) removed.`);
              setBulkRemoveModalVisible(false);
              setSelectedHoldingIds([]);
              loadData();
            } catch (e) {
              Alert.alert('Error', 'Failed to remove selected assets');
            } finally {
              setIsDeletingBulk(false);
            }
          },
        },
      ]
    );
  };

  // ===== GROK AI IMPORT & CONFIRMATION HELPERS =====
  const resetAiModal = () => {
    setAiStep('upload');
    setSelectedAiImage(null);
    setAiFileName('');
    setExtractedHoldings([]);
    setIsScanningAi(false);
    setIsSavingBulkAi(false);
  };

  const openAiImportModal = () => {
    resetAiModal();
    setAiModalVisible(true);
  };

  const handlePickAiImage = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
          setAiFileName(file.name);
          const reader = new FileReader();
          reader.onload = (event) => {
            setSelectedAiImage(event.target.result);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      Alert.alert(
        'Upload Screenshot',
        'Upload your brokerage screenshot or test with sample broker data.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Use Sample Screenshot', onPress: () => handleRunAiExtraction(true) },
        ]
      );
    }
  };

  const handleRunAiExtraction = async (forceDemo = false) => {
    if (!selectedAiImage && !forceDemo) {
      Alert.alert('No Screenshot Selected', 'Please select or upload a portfolio screenshot first.');
      return;
    }
    setIsScanningAi(true);
    setAiStep('scanning');
    try {
      const res = await api.aiExtractHoldings({
        image: selectedAiImage || '',
        useDemo: forceDemo || !selectedAiImage,
      });

      if (res && Array.isArray(res.holdings) && res.holdings.length > 0) {
        const mapped = res.holdings.map((h, idx) => ({
          id: `ai-${Date.now()}-${idx}`,
          symbolOrCode: (h.symbolOrCode || 'STOCK.NS').toUpperCase().trim(),
          instrumentName: h.instrumentName || h.symbolOrCode || 'Investment Asset',
          assetClass: ['Equity', 'Mutual Fund', 'ETF', 'Gold'].includes(h.assetClass) ? h.assetClass : 'Equity',
          subCategory: h.subCategory || 'Stocks',
          quantity: String(h.quantity || 1),
          buyPrice: String(h.buyPrice || 100),
          latestPrice: String(h.latestPrice || h.buyPrice || 100),
          confidence: h.confidence || 0.95,
          notes: h.notes || 'Extracted via Grok AI from screenshot',
          isSelected: true,
        }));
        setExtractedHoldings(mapped);
        setAiStep('review');
      } else {
        Alert.alert('Scan Result', res?.error || 'Could not detect any stock holdings in the image. Please try another screenshot.');
        setAiStep('upload');
      }
    } catch (err) {
      console.log('AI Extraction error:', err);
      Alert.alert('AI Extraction', err.message || 'Error communicating with Grok API.');
      setAiStep('upload');
    } finally {
      setIsScanningAi(false);
    }
  };

  const handleToggleHoldingSelect = (id) => {
    setExtractedHoldings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isSelected: !item.isSelected } : item))
    );
  };

  const handleUpdateHoldingField = (id, field, value) => {
    setExtractedHoldings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveExtractedHolding = (id) => {
    setExtractedHoldings((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddCustomExtractedHolding = () => {
    const newId = `custom-${Date.now()}`;
    setExtractedHoldings((prev) => [
      ...prev,
      {
        id: newId,
        symbolOrCode: 'NEWSTOCK.NS',
        instrumentName: 'New Asset Ltd',
        assetClass: 'Equity',
        subCategory: 'Stocks',
        quantity: '10',
        buyPrice: '500',
        latestPrice: '500',
        confidence: 1.0,
        notes: 'Manually added in confirmation review',
        isSelected: true,
      },
    ]);
  };

  const handleConfirmAiHoldings = async () => {
    const selected = extractedHoldings.filter((h) => h.isSelected && Number(h.quantity) > 0);
    if (selected.length === 0) {
      Alert.alert('No Holdings Selected', 'Please select at least one holding with valid quantity.');
      return;
    }

    setIsSavingBulkAi(true);
    try {
      const payload = selected.map((h) => ({
        symbolOrCode: h.symbolOrCode.trim().toUpperCase(),
        instrumentName: h.instrumentName.trim(),
        assetClass: h.assetClass,
        subCategory: h.subCategory,
        quantity: Number(h.quantity),
        buyPrice: Number(h.buyPrice),
        latestPrice: Number(h.latestPrice),
        notes: `AI Imported via Grok Vision (${h.quantity} @ â‚¹${h.buyPrice})`,
      }));

      const res = await api.bulkAddHoldings({ holdings: payload });
      if (res && res.success) {
        Alert.alert(
          'Holdings Added! ðŸŽ‰',
          `Successfully verified and added ${res.count} holding(s) to your portfolio database!`
        );
        setAiModalVisible(false);
        resetAiModal();
        await loadData();
      } else {
        Alert.alert('Error', res?.error || 'Failed to save confirmed holdings.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save confirmed holdings.');
    } finally {
      setIsSavingBulkAi(false);
    }
  };

  // Filtered holdings
  const filteredHoldings = holdings.filter((h) => {
    if (selectedAssetClass !== 'All' && h.assetClass !== selectedAssetClass) return false;
    if (
      searchQuery.trim() &&
      !h.instrumentName?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !h.symbolOrCode?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const modalData = {
    isMobile,
    addModalVisible,
    setAddModalVisible,
    resetAddForm,
    newAssetClass,
    setNewAssetClass,
    newSubCategory,
    setNewSubCategory,
    instrumentQuery,
    setInstrumentQuery,
    searchResults,
    selectedInstrument,
    setSelectedInstrument,
    liveQuoteForNew,
    setLiveQuoteForNew,
    loadingQuote,
    searchingInstruments,
    isSearchFocused,
    setIsSearchFocused,
    newQuantity,
    setNewQuantity,
    newBuyPrice,
    setNewBuyPrice,
    savingNewHolding,
    handlePickInstrument,
    handleSaveNewHolding,
    editModalVisible,
    setEditModalVisible,
    editingHolding,
    editQuantity,
    setEditQuantity,
    editBuyPrice,
    setEditBuyPrice,
    editSubCategory,
    setEditSubCategory,
    savingEdit,
    handleSaveEditHolding,
    handleDeleteHolding,
    bulkRemoveModalVisible,
    setBulkRemoveModalVisible,
    selectedHoldingIds,
    holdings,
    toggleSelectAllHoldings,
    toggleSelectHolding,
    handleConfirmBulkRemoveHoldings,
    isDeletingBulk,
    addMoreModalVisible,
    setAddMoreModalVisible,
    addMoreHolding,
    addMoreQty,
    setAddMoreQty,
    addMorePrice,
    setAddMorePrice,
    addMoreLivePrice,
    loadingAddMoreQuote,
    savingAddMore,
    handleSaveAddMore,
    aiModalVisible,
    setAiModalVisible,
    aiStep,
    setAiStep,
    selectedAiImage,
    aiFileName,
    extractedHoldings,
    isScanningAi,
    isSavingBulkAi,
    resetAiModal,
    handlePickAiImage,
    handleRunAiExtraction,
    handleToggleHoldingSelect,
    handleUpdateHoldingField,
    handleRemoveExtractedHolding,
    handleAddCustomExtractedHolding,
    handleConfirmAiHoldings,
  };

  return (
    <View style={styles.container}>
      <InvestmentHeader
        isMobile={isMobile}
        refreshing={refreshing}
        onNavigate={onNavigate}
        onRefresh={handleRefreshPrices}
        onBulkRemove={openBulkRemoveModal}
        onAiImport={openAiImportModal}
        onAddHolding={() => { resetAddForm(); setAddModalVisible(true); }}
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
          <View style={[styles.kpiGrid, isMobile && { justifyContent: 'space-between', gap: 10 }]}>
            {/* Total Portfolio Value */}
            <View style={[styles.kpiCard, isMobile ? { width: '100%', minWidth: 0 } : { flex: 1, minWidth: 170 }, { borderLeftColor: '#7e37d8' }]}>
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

            {/* Total Invested Capital */}
            <View style={[styles.kpiCard, isMobile ? { width: '48%', minWidth: 0, flexGrow: 1 } : { flex: 1, minWidth: 170 }, { borderLeftColor: '#3b82f6' }]}>
              <View style={styles.kpiHeaderRow}>
                <Text style={styles.kpiLabel}>Total Invested</Text>
                <View style={[styles.kpiIconWrap, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="card-outline" size={16} color="#3b82f6" />
                </View>
              </View>
              <Text style={[styles.kpiValue, { color: '#1e40af' }]}>
                ₹{(summary?.totalInvested || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
              <Text style={styles.kpiSub} numberOfLines={1}>Across {summary?.holdingsCount || 0} holdings</Text>
            </View>

            {/* Overall Returns / P&L */}
            <View
              style={[
                styles.kpiCard,
                isMobile ? { width: '48%', minWidth: 0, flexGrow: 1 } : { flex: 1, minWidth: 170 },
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
              <Text style={styles.allocHoldingsBadge}>
                {holdings.length} Assets Tracked
              </Text>
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
          <View style={styles.filterBarRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classPillsScroll}>
              {ASSET_CLASSES.map((cls) => {
                const isSelected = selectedAssetClass === cls;
                return (
                  <TouchableOpacity
                    key={cls}
                    style={[
                      styles.classPill,
                      isSelected && styles.classPillActive,
                    ]}
                    onPress={() => setSelectedAssetClass(cls)}
                  >
                    <Text
                      style={[
                        styles.classPillText,
                        isSelected && styles.classPillTextActive,
                      ]}
                    >
                      {cls}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.searchBox}>
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
                Showing {filteredHoldings.length} assets with auto-calculated P&L
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
                    {/* Top Row: Icon, Instrument, Subcategory, Valuation */}
                    <View style={styles.holdingHeader}>
                      <View style={[styles.assetIconBox, { backgroundColor: meta.bg }]}>
                        <Ionicons name={meta.icon} size={20} color={meta.color} />
                      </View>

                      <View style={styles.holdingNameCol}>
                        <View style={styles.holdingSymbolRow}>
                          <Text style={styles.holdingSymbol}>{h.symbolOrCode}</Text>
                          <View style={styles.subCatBadge}>
                            <Text style={styles.subCatBadgeText}>{h.subCategory || h.assetClass}</Text>
                          </View>
                        </View>
                        <Text style={styles.instrumentFullName} numberOfLines={1}>
                          {h.instrumentName}
                        </Text>
                      </View>

                      <View style={styles.holdingValueCol}>
                        <Text style={styles.holdingCurVal}>
                          ₹{(h.currentValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                        </Text>
                        <Text style={styles.holdingUnitsText}>
                          {h.quantity} {meta.unit}
                        </Text>
                      </View>
                    </View>

                    {/* Middle Metrics Grid: Buy Price, Live Price, Invested, Profit/Loss */}
                    <View style={styles.holdingMetricsGrid}>
                      {/* Your Buy Price */}
                      <View style={styles.metricBox}>
                        <Text style={styles.metricLabel}>Your Buy Price</Text>
                        <Text style={styles.metricVal}>
                          ₹{(h.averageBuyPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                        <Text style={styles.metricHint}>Entered purchase cost</Text>
                      </View>

                      {/* Live Market Price / NAV */}
                      <View style={styles.metricBox}>
                        <Text style={styles.metricLabel}>Current Live Price</Text>
                        <Text style={[styles.metricVal, { color: '#0f172a' }]}>
                          ₹{(h.latestPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                        <View style={styles.liveTagRow}>
                          <View style={styles.liveDotSmall} />
                          <Text style={styles.liveTagText}>Market Feed</Text>
                        </View>
                      </View>

                      {/* Invested Amount */}
                      <View style={styles.metricBox}>
                        <Text style={styles.metricLabel}>Total Invested</Text>
                        <Text style={styles.metricVal}>
                          ₹{(h.investedValue || (h.quantity * h.averageBuyPrice) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Text>
                        <Text style={styles.metricHint}>{h.allocationPercent || 0}% of portfolio</Text>
                      </View>

                      {/* Profit / Loss */}
                      <View style={styles.metricBox}>
                        <Text style={styles.metricLabel}>Profit / Loss</Text>
                        <Text
                          style={[
                            styles.metricVal,
                            { color: isProfit ? '#059669' : '#dc2626' },
                          ]}
                        >
                          {isProfit ? '+' : ''}₹{(h.pnl || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Text>
                        <View
                          style={[
                            styles.pnlTagPill,
                            { backgroundColor: isProfit ? '#ecfdf5' : '#fef2f2' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.pnlTagText,
                              { color: isProfit ? '#059669' : '#dc2626' },
                            ]}
                          >
                            {isProfit ? '▲ +' : '▼ '}
                            {h.pnlPercent || 0}%
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Bottom Action Strip: Edit Cost/Shares, Delete */}
                    <View style={styles.holdingFooter}>
                      <View style={styles.footerNoteRow}>
                        <Ionicons name="information-circle-outline" size={13} color="#94a3b8" />
                        <Text style={styles.footerNoteText}>
                          Updated {new Date(h.latestPriceDate || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>

                      <View style={styles.holdingActionBtns}>
                        <TouchableOpacity
                          style={styles.addMoreHoldingBtn}
                          onPress={() => openAddMoreModal(h)}
                        >
                          <Ionicons name="add-circle-outline" size={14} color="#10b981" />
                          <Text style={styles.addMoreHoldingBtnText}>Add More</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.editHoldingBtn}
                          onPress={() => openEditModal(h)}
                        >
                          <Feather name="edit-2" size={13} color="#3b82f6" />
                          <Text style={styles.editHoldingBtnText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.deleteHoldingIconBtn}
                          onPress={() => handleDeleteHolding(h)}
                        >
                          <Feather name="trash-2" size={13} color="#ef4444" />
                          <Text style={styles.deleteHoldingBtnText}>Remove</Text>
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

      {/* ========================================================= */}
      {/* MODAL 1: ADD HOLDING TO TRACKER (With Manual Buy Price)   */}
      {/* ========================================================= */}
            <InvestmentModals data={modalData} />
    </View>

  );
}
