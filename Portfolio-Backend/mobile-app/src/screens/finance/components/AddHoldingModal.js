import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator, Image, Platform } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import styles from '../styles/investmentStyles';
import { ASSET_CLASSES, ASSET_META } from '../constants/assetOptions';

export default function AddHoldingModal({
  data: {
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
  },
}) {
  return (
<Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isMobile && { padding: 12, borderRadius: 14, maxHeight: '94%', width: '96%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                <Text style={[styles.modalTitle, isMobile && { fontSize: 15 }]} numberOfLines={1}>Add Asset</Text>
                <Text style={[styles.modalSubtitle, isMobile && { fontSize: 11 }]} numberOfLines={1}>Track buy price & live P&L</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setAddModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
              {/* Asset Class Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Asset Class</Text>
                <View style={styles.assetClassTabs}>
                  {['Equity', 'Mutual Fund', 'ETF', 'Gold'].map((cls) => (
                    <TouchableOpacity
                      key={cls}
                      style={[
                        styles.assetClassTab,
                        newAssetClass === cls && styles.assetClassTabActive,
                      ]}
                      onPress={() => {
                        setNewAssetClass(cls);
                        setSelectedInstrument(null);
                        setLiveQuoteForNew(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.assetClassTabText,
                          newAssetClass === cls && styles.assetClassTabTextActive,
                        ]}
                      >
                        {cls === 'Equity' ? 'Stocks' : cls}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Instrument Search / Catalog Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Search & Select {
                    newAssetClass === 'Mutual Fund'
                      ? 'Mutual Fund Scheme'
                      : newAssetClass === 'ETF'
                      ? 'ETF (Gold, Silver, Index, Sectoral)'
                      : newAssetClass === 'Gold'
                      ? 'Gold & Silver Asset'
                      : 'Stock / Company'
                  }
                </Text>
                <View
                  style={[
                    styles.instSearchInputWrap,
                    isSearchFocused && styles.instSearchInputWrapFocused,
                  ]}
                >
                  <Ionicons
                    name="search-outline"
                    size={18}
                    color={isSearchFocused ? '#3b82f6' : '#94a3b8'}
                  />
                  <TextInput
                    style={[
                      styles.instSearchInput,
                      Platform.OS === 'web' && { outlineStyle: 'none', outlineWidth: 0 },
                    ]}
                    placeholder={
                      newAssetClass === 'Mutual Fund'
                        ? 'Search any mutual fund (e.g. Parag Parikh, HDFC, SBI)...'
                        : newAssetClass === 'ETF'
                        ? 'Search any ETF (e.g. GoldBeES, SilverBeES, NiftyBeES, HDFC Silver)...'
                        : newAssetClass === 'Gold'
                        ? 'Search Gold / Silver ETF or Commodity (e.g. GoldBeES, SilverBeES)...'
                        : 'Search any stock or company (e.g. Reliance, TCS, Tata, HDFC)...'
                    }
                    placeholderTextColor="#94a3b8"
                    value={instrumentQuery}
                    onChangeText={setInstrumentQuery}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                  />
                  {searchingInstruments ? (
                    <ActivityIndicator size="small" color="#3b82f6" style={{ marginLeft: 6 }} />
                  ) : instrumentQuery ? (
                    <TouchableOpacity onPress={() => setInstrumentQuery('')}>
                      <Ionicons name="close-circle" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Autocomplete list */}
                <View style={styles.instListContainer}>
                  {searchResults.slice(0, 12).map((inst) => {
                    const isSelected = selectedInstrument?.symbolOrCode === inst.symbolOrCode;
                    return (
                      <TouchableOpacity
                        key={inst.symbolOrCode}
                        style={[
                          styles.instListItem,
                          isSelected && styles.instListItemActive,
                        ]}
                        onPress={() => handlePickInstrument(inst)}
                      >
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.instItemTitle} numberOfLines={1}>
                            {inst.instrumentName}
                          </Text>
                          <Text style={styles.instItemCode}>
                            {inst.symbolOrCode} • {inst.subCategory}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <View style={styles.exchangePill}>
                            <Text style={styles.exchangePillText}>{inst.exchange || 'NSE'}</Text>
                          </View>
                          <Text style={styles.instLiveHint}>Live Market API</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {searchResults.length === 0 && !searchingInstruments && instrumentQuery.trim().length > 0 && (
                    <View style={styles.noSearchFound}>
                      <Text style={styles.noSearchFoundText}>No instruments found matching "{instrumentQuery}"</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Selected Instrument & Manual Price + Quantity Inputs */}
              {selectedInstrument && (
                <View style={styles.selectedInstCard}>
                  <View style={styles.livePriceRow}>
                    <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                      <Text style={styles.selectedInstTitle} numberOfLines={1}>{selectedInstrument.instrumentName}</Text>
                      <Text style={styles.selectedInstCode} numberOfLines={1}>
                        {selectedInstrument.symbolOrCode} ({selectedInstrument.subCategory})
                      </Text>
                    </View>
                    <View style={styles.autoQuoteTag}>
                      <View style={styles.liveDotSmall} />
                      <Text style={styles.autoQuoteTagText}>
                        Live: ₹{(liveQuoteForNew?.price || selectedInstrument.basePrice || 0).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                  </View>

                  {/* Quantity & Buy Price side by side */}
                  <View style={styles.twoColInputRow}>
                    {/* Quantity */}
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>
                        {newAssetClass === 'Mutual Fund' ? 'Units Held *' : 'No. of Shares *'}
                      </Text>
                      <TextInput
                        style={[styles.textInput, styles.highlightInput]}
                        placeholder="e.g. 25"
                        keyboardType="numeric"
                        value={newQuantity}
                        onChangeText={setNewQuantity}
                      />
                    </View>

                    {/* Manual Buy Price */}
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>
                        Buy Price per {newAssetClass === 'Mutual Fund' ? 'Unit' : 'Share'} (₹) *
                      </Text>
                      <TextInput
                        style={[styles.textInput, styles.highlightInput]}
                        placeholder="e.g. 2650"
                        keyboardType="numeric"
                        value={newBuyPrice}
                        onChangeText={setNewBuyPrice}
                      />
                    </View>
                  </View>

                  {/* Real-time Calculation Summary */}
                  {Number(newQuantity) > 0 && Number(newBuyPrice) > 0 && (
                    <View style={styles.calcPreviewCard}>
                      <View style={styles.calcRow}>
                        <Text style={styles.calcLabel}>Total Invested Cost:</Text>
                        <Text style={styles.calcVal}>
                          ₹{(Number(newQuantity) * Number(newBuyPrice)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </Text>
                      </View>
                      <View style={styles.calcRow}>
                        <Text style={styles.calcLabel}>Current Market Value:</Text>
                        <Text style={styles.calcVal}>
                          ₹{(
                            Number(newQuantity) *
                            (liveQuoteForNew?.price || selectedInstrument.basePrice || Number(newBuyPrice))
                          ).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </Text>
                      </View>
                      <View style={[styles.calcRow, styles.calcBorderTop]}>
                        <Text style={styles.calcLabel}>Expected P&L:</Text>
                        {(() => {
                          const curVal =
                            Number(newQuantity) *
                            (liveQuoteForNew?.price || selectedInstrument.basePrice || Number(newBuyPrice));
                          const cost = Number(newQuantity) * Number(newBuyPrice);
                          const pnl = curVal - cost;
                          const pnlPct = cost > 0 ? ((pnl / cost) * 100).toFixed(2) : 0;
                          const isPos = pnl >= 0;
                          return (
                            <Text
                              style={[
                                styles.calcVal,
                                { color: isPos ? '#059669' : '#dc2626', fontWeight: '800' },
                              ]}
                            >
                              {isPos ? '+' : ''}₹{pnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ({isPos ? '+' : ''}{pnlPct}%)
                            </Text>
                          );
                        })()}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                (!selectedInstrument || !newQuantity || !newBuyPrice) && { opacity: 0.6 },
              ]}
              onPress={handleSaveNewHolding}
              disabled={savingNewHolding || !selectedInstrument || !newQuantity || !newBuyPrice}
            >
              <Text style={styles.saveBtnText} numberOfLines={1}>
                {savingNewHolding ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
  );
}
