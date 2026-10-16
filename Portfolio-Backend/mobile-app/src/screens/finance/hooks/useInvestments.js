import { useState, useEffect, useMemo } from 'react';
import { Alert, Platform, useWindowDimensions } from 'react-native';
import apiDefault, { api as apiNamed } from '../../../api/client';
const api = apiNamed || apiDefault;

export default function useInvestments() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // =========================================================================
  // SECTION 1: CORE PORTFOLIO DATA, REFRESH & ASSET FILTERING
  // =========================================================================
  const [holdings, setHoldings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAssetClass, setSelectedAssetClass] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, holdRes] = await Promise.all([
        api.getInvestmentSummary(),
        api.getHoldings(),
      ]);
      setSummary(sumRes || null);
      setHoldings(Array.isArray(holdRes) ? holdRes : []);
    } catch (err) {
      console.error('Error loading investment portfolio:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefreshPrices = async () => {
    setRefreshing(true);
    await loadData();
  };

  const filteredHoldings = useMemo(() => {
    return holdings.filter((h) => {
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
  }, [holdings, selectedAssetClass, searchQuery]);

  // =========================================================================
  // SECTION 2: LIVE INSTRUMENT AUTOCOMPLETE SEARCH & ADD HOLDING
  // =========================================================================
  const [addModalVisible, setAddModalVisible] = useState(false);
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
  const [newBuyPrice, setNewBuyPrice] = useState('');
  const [savingNewHolding, setSavingNewHolding] = useState(false);

  useEffect(() => {
    if (!addModalVisible) return;
    setSearchingInstruments(true);
    const timer = setTimeout(async () => {
      try {
        const type =
          newAssetClass === 'Mutual Fund'
            ? 'Mutual Fund'
            : newAssetClass === 'ETF'
            ? 'ETF'
            : newAssetClass === 'Gold'
            ? 'Gold'
            : 'Equity';
        const res = await api.searchInstruments(instrumentQuery, type);
        setSearchResults(Array.isArray(res) ? res : []);
      } catch (e) {
      } finally {
        setSearchingInstruments(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [instrumentQuery, newAssetClass, addModalVisible]);

  const handlePickInstrument = async (inst) => {
    setSelectedInstrument(inst);
    const finalAssetClass =
      newAssetClass === 'ETF' || newAssetClass === 'Gold'
        ? newAssetClass
        : inst.assetClass || 'Equity';
    setNewAssetClass(finalAssetClass);
    setNewSubCategory(inst.subCategory || (finalAssetClass === 'ETF' ? 'ETF' : 'Large Cap Stocks'));
    setLoadingQuote(true);
    try {
      const quote = await api.getInstrumentPrice(inst.symbolOrCode, finalAssetClass);
      setLiveQuoteForNew(quote);
      setNewBuyPrice(String(quote.price || inst.basePrice || ''));
    } catch (e) {
      const fallbackPrice = inst.basePrice || 100;
      setLiveQuoteForNew({ price: fallbackPrice, instrumentName: inst.instrumentName });
      setNewBuyPrice(String(fallbackPrice));
    } finally {
      setLoadingQuote(false);
    }
  };

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
        buyPrice: Number(newBuyPrice),
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

  // =========================================================================
  // SECTION 3: ADD MORE UNITS TRANSACTION (BUY MORE)
  // =========================================================================
  const [addMoreModalVisible, setAddMoreModalVisible] = useState(false);
  const [addMoreHolding, setAddMoreHolding] = useState(null);
  const [addMoreQty, setAddMoreQty] = useState('');
  const [addMorePrice, setAddMorePrice] = useState('');
  const [addMoreLivePrice, setAddMoreLivePrice] = useState(null);
  const [loadingAddMoreQuote, setLoadingAddMoreQuote] = useState(false);
  const [savingAddMore, setSavingAddMore] = useState(false);

  const openAddMoreModal = async (h) => {
    setAddMoreHolding(h);
    setAddMoreQty('');
    setAddMorePrice('');
    setAddMoreLivePrice(null);
    setAddMoreModalVisible(true);
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
      const newAvg =
        (oldQty * (addMoreHolding.averageBuyPrice || 0) + addQty * Number(addMorePrice)) /
        (oldQty + addQty);

      Alert.alert(
        'Added Successfully',
        `${addQty} more units added to ${addMoreHolding.instrumentName}.\nNew Avg Buy Price: ₹${newAvg.toFixed(2)}\nTotal Qty: ${oldQty + addQty}`
      );
      setAddMoreModalVisible(false);
      // Invalidate transaction history cache so fresh transaction shows
      if (addMoreHolding._id) {
        fetchHoldingHistory(addMoreHolding._id, true);
      }
      loadData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to add more units');
    } finally {
      setSavingAddMore(false);
    }
  };

  // =========================================================================
  // SECTION 4: SELL HOLDING TRANSACTION (SELL UNITS & REALIZED P&L)
  // =========================================================================
  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [sellHolding, setSellHolding] = useState(null);
  const [sellQty, setSellQty] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellLivePrice, setSellLivePrice] = useState(null);
  const [loadingSellQuote, setLoadingSellQuote] = useState(false);
  const [savingSell, setSavingSell] = useState(false);
  const [sellNotes, setSellNotes] = useState('');

  const openSellModal = async (h) => {
    setSellHolding(h);
    setSellQty('');
    setSellPrice('');
    setSellNotes('');
    setSellLivePrice(null);
    setSellModalVisible(true);
    setLoadingSellQuote(true);
    try {
      const quote = await api.getInstrumentPrice(h.symbolOrCode, h.assetClass);
      const curPrice = quote?.price || h.latestPrice || h.averageBuyPrice || 0;
      setSellLivePrice(curPrice);
      setSellPrice(String(curPrice || ''));
    } catch (e) {
      const curPrice = h.latestPrice || h.averageBuyPrice || 0;
      setSellLivePrice(curPrice);
      setSellPrice(String(curPrice || ''));
    } finally {
      setLoadingSellQuote(false);
    }
  };

  const handleExecuteSell = async () => {
    if (!sellHolding) return;
    const qtyNum = Number(sellQty);
    const priceNum = Number(sellPrice);

    if (!sellQty || isNaN(qtyNum) || qtyNum <= 0) {
      Alert.alert('Required', 'Please enter a valid quantity to sell (> 0)');
      return;
    }
    if (qtyNum > sellHolding.quantity) {
      Alert.alert(
        'Invalid Quantity',
        `You cannot sell more than your current holding of ${sellHolding.quantity} units.`
      );
      return;
    }
    if (!sellPrice || isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Required', 'Please enter a valid selling price (> 0)');
      return;
    }

    setSavingSell(true);
    try {
      const res = await api.executeInvestmentTransaction({
        holdingId: sellHolding._id,
        type: 'SELL',
        units: qtyNum,
        price: priceNum,
        notes: sellNotes.trim(),
      });

      const pnl = res?.realizedGain ?? (priceNum - sellHolding.averageBuyPrice) * qtyNum;
      const pnlPct =
        sellHolding.averageBuyPrice > 0
          ? ((priceNum - sellHolding.averageBuyPrice) / sellHolding.averageBuyPrice) * 100
          : 0;

      Alert.alert(
        'Sale Executed! 💰',
        `Successfully sold ${qtyNum} units of ${sellHolding.instrumentName} @ ₹${priceNum.toFixed(2)}.\n` +
          `Realized P&L: ${pnl >= 0 ? '+' : ''}₹${pnl.toFixed(2)} (${pnl >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)\n` +
          `Remaining Balance: ${(sellHolding.quantity - qtyNum).toFixed(2)} units.`
      );
      setSellModalVisible(false);
      // Invalidate transaction history cache so fresh sell transaction shows
      if (sellHolding._id) {
        fetchHoldingHistory(sellHolding._id, true);
      }
      loadData();
    } catch (err) {
      Alert.alert('Sale Failed', err.message || 'Failed to execute sale transaction');
    } finally {
      setSavingSell(false);
    }
  };

  // =========================================================================
  // SECTION 5: HOLDING TRANSACTION HISTORY MODAL & DEDICATED LEDGER
  // =========================================================================
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedHistoryHolding, setSelectedHistoryHolding] = useState(null);
  const [expandedHoldingId, setExpandedHoldingId] = useState(null);
  const [holdingTransactionsMap, setHoldingTransactionsMap] = useState({});
  const [loadingHistoryId, setLoadingHistoryId] = useState(null);

  const fetchHoldingHistory = async (holdingId, forceRefresh = false) => {
    if (!forceRefresh && holdingTransactionsMap[holdingId]) {
      return holdingTransactionsMap[holdingId];
    }
    setLoadingHistoryId(holdingId);
    try {
      const res = await api.getHoldingTransactions(holdingId);
      if (res && res.transactions) {
        setHoldingTransactionsMap((prev) => ({
          ...prev,
          [holdingId]: res.transactions,
        }));
        return res.transactions;
      }
    } catch (e) {
      console.log('Error fetching holding transactions:', e.message);
    } finally {
      setLoadingHistoryId(null);
    }
    return [];
  };

  const openHistoryModal = async (holding) => {
    setSelectedHistoryHolding(holding);
    setHistoryModalVisible(true);
    if (!holdingTransactionsMap[holding._id]) {
      await fetchHoldingHistory(holding._id);
    }
  };

  const closeHistoryModal = () => {
    setHistoryModalVisible(false);
    setSelectedHistoryHolding(null);
  };

  const toggleHoldingExpand = async (holdingId) => {
    if (expandedHoldingId === holdingId) {
      setExpandedHoldingId(null);
    } else {
      setExpandedHoldingId(holdingId);
      if (!holdingTransactionsMap[holdingId]) {
        await fetchHoldingHistory(holdingId);
      }
    }
  };

  // =========================================================================
  // SECTION 6: EDIT HOLDING (MANUAL RE-BALANCING) & DELETE HOLDING
  // =========================================================================
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingHolding, setEditingHolding] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editBuyPrice, setEditBuyPrice] = useState('');
  const [editSubCategory, setEditSubCategory] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const openEditModal = (h) => {
    setEditingHolding(h);
    setEditQuantity(String(h.quantity || ''));
    setEditBuyPrice(String(h.averageBuyPrice || ''));
    setEditSubCategory(h.subCategory || '');
    setEditModalVisible(true);
  };

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

  // =========================================================================
  // SECTION 7: BULK REMOVE ASSETS
  // =========================================================================
  const [bulkRemoveModalVisible, setBulkRemoveModalVisible] = useState(false);
  const [selectedHoldingIds, setSelectedHoldingIds] = useState([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

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

  // =========================================================================
  // SECTION 8: GROK AI VISION SCREENSHOT EXTRACTION & BULK IMPORT
  // =========================================================================
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiStep, setAiStep] = useState('upload'); // 'upload' | 'scanning' | 'review'
  const [selectedAiImage, setSelectedAiImage] = useState(null);
  const [aiFileName, setAiFileName] = useState('');
  const [extractedHoldings, setExtractedHoldings] = useState([]);
  const [isScanningAi, setIsScanningAi] = useState(false);
  const [isSavingBulkAi, setIsSavingBulkAi] = useState(false);

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
          assetClass: ['Equity', 'Mutual Fund', 'ETF', 'Gold'].includes(h.assetClass)
            ? h.assetClass
            : 'Equity',
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
        Alert.alert(
          'Scan Result',
          res?.error || 'Could not detect any stock holdings in the image. Please try another screenshot.'
        );
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
        notes: `AI Imported via Grok Vision (${h.quantity} @ ₹${h.buyPrice})`,
      }));

      const res = await api.bulkAddHoldings({ holdings: payload });
      if (res && res.success) {
        Alert.alert(
          'Holdings Added! 🎉',
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

  // =========================================================================
  // PACKAGED MODAL DATA FOR INVESTMENT MODALS CONTAINER
  // =========================================================================
  const modalData = {
    isMobile,
    // Add Modal
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

    // Edit Modal
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

    // Add More Modal
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

    // Sell Modal
    sellModalVisible,
    setSellModalVisible,
    sellHolding,
    sellQty,
    setSellQty,
    sellPrice,
    setSellPrice,
    sellLivePrice,
    loadingSellQuote,
    savingSell,
    sellNotes,
    setSellNotes,
    handleExecuteSell,

    // Bulk Delete
    bulkRemoveModalVisible,
    setBulkRemoveModalVisible,
    selectedHoldingIds,
    holdings,
    toggleSelectAllHoldings,
    toggleSelectHolding,
    handleConfirmBulkRemoveHoldings,
    isDeletingBulk,

    // AI Vision Import
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

  return {
    isMobile,
    // Data & Filtering
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
    loadData,

    // Actions
    openAddHoldingModal: () => {
      resetAddForm();
      setAddModalVisible(true);
    },
    openEditModal,
    openAddMoreModal,
    openSellModal,
    openBulkRemoveModal,
    openAiImportModal,
    handleDeleteHolding,

    // History Modal & Ledger
    historyModalVisible,
    selectedHistoryHolding,
    openHistoryModal,
    closeHistoryModal,
    expandedHoldingId,
    toggleHoldingExpand,
    holdingTransactionsMap,
    loadingHistoryId,
    fetchHoldingHistory,

    // Modal data bundle
    modalData,
  };
}
