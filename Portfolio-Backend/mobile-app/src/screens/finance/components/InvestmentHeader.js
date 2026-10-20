import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/investmentStyles';

export default function InvestmentHeader({ isMobile, refreshing, onNavigate, onRefresh, onBulkRemove, onAiImport, onAddHolding }) {
  if (isMobile) {
    return (
      <View style={styles.headerToolbarMobileWrap}>
        {/* Row 1: Header Title & Main Primary Action Button */}
        <View style={styles.headerMobileTopRow}>
          <View style={styles.leftTitleRowMobile}>
            <View style={styles.titleIconBadgeMobile || styles.titleIconBadge}>
              <Ionicons name="trending-up" size={16} color="#3b82f6" />
            </View>
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
              <Text style={styles.pageTitleMobile} numberOfLines={1} ellipsizeMode="tail">
                Investments & Wealth
              </Text>
              <View style={styles.liveBadgeRow}>
                <View style={styles.livePulseDot} />
                <Text style={styles.liveBadgeText}>NSE/BSE & AMFI • Live</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addAssetBtnMobile}
            onPress={onAddHolding}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={15} color="#ffffff" />
            <Text style={styles.addAssetBtnTextMobile}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Row 2: Secondary Quick Actions Horizontal Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mobileActionsScrollContent}
          style={styles.mobileActionsScroll}
        >
          {/* Insights & Net Worth */}
          <TouchableOpacity
            style={[styles.mobileActionChip, { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' }]}
            onPress={() => onNavigate && onNavigate('PortfolioInsights')}
            activeOpacity={0.8}
          >
            <Ionicons name="analytics" size={14} color="#7e37d8" />
            <Text style={[styles.mobileActionChipTextPurple, { color: '#7e37d8', fontWeight: '800' }]}>Insights</Text>
          </TouchableOpacity>

          {/* Charts / Visuals */}
          <TouchableOpacity
            style={styles.mobileActionChip}
            onPress={() => onNavigate && onNavigate('InvestmentAnalytics')}
            activeOpacity={0.8}
          >
            <Ionicons name="pie-chart-outline" size={14} color="#7e37d8" />
            <Text style={styles.mobileActionChipTextPurple}>Visuals & Charts</Text>
          </TouchableOpacity>

          {/* Sync Market Prices */}
          <TouchableOpacity
            style={styles.mobileActionChip}
            onPress={onRefresh}
            disabled={refreshing}
            activeOpacity={0.8}
          >
            <Ionicons
              name="refresh-outline"
              size={14}
              color="#3b82f6"
              style={refreshing ? { transform: [{ rotate: '45deg' }] } : {}}
            />
            <Text style={styles.mobileActionChipTextBlue}>
              {refreshing ? 'Syncing...' : 'Sync Prices'}
            </Text>
          </TouchableOpacity>

          {/* AI Import */}
          <TouchableOpacity
            style={styles.mobileActionChip}
            onPress={onAiImport}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={14} color="#7c3aed" />
            <Text style={styles.mobileActionChipTextPurple}>AI Import</Text>
          </TouchableOpacity>

          {/* Remove / Clean Holdings */}
          <TouchableOpacity
            style={styles.mobileActionChipDanger}
            onPress={onBulkRemove}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={14} color="#ef4444" />
            <Text style={styles.mobileActionChipTextDanger}>Remove</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.headerToolbar}>
      <View style={styles.leftTitleRow}>
        <View style={styles.titleIconBadge}>
          <Ionicons name="trending-up" size={20} color="#3b82f6" />
        </View>
        <View>
          <Text style={styles.pageTitle}>Investments & Wealth</Text>
          <View style={styles.liveBadgeRow}>
            <View style={styles.livePulseDot} />
            <Text style={styles.liveBadgeText}>NSE/BSE & AMFI Real-time Tracking</Text>
          </View>
        </View>
      </View>

      <View style={styles.rightActionRow}>
        <TouchableOpacity
          style={[styles.analyticsBtn, { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' }]}
          onPress={() => onNavigate && onNavigate('PortfolioInsights')}
          activeOpacity={0.8}
        >
          <Ionicons name="analytics" size={15} color="#7e37d8" />
          <Text style={[styles.analyticsBtnText, { color: '#7e37d8', fontWeight: '800' }]}>Insights & Net Worth</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.analyticsBtn}
          onPress={() => onNavigate && onNavigate('InvestmentAnalytics')}
          activeOpacity={0.8}
        >
          <Ionicons name="pie-chart-outline" size={15} color="#7e37d8" />
          <Text style={styles.analyticsBtnText}>Visualisation & Charts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Ionicons
            name="refresh-outline"
            size={15}
            color="#3b82f6"
            style={refreshing ? { transform: [{ rotate: '45deg' }] } : {}}
          />
          <Text style={styles.refreshBtnText}>{refreshing ? 'Updating Prices...' : 'Sync Market Prices'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.manageRemoveBtn}
          onPress={onBulkRemove}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={15} color="#ef4444" />
          <Text style={styles.manageRemoveBtnText}>Remove Holdings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.aiImportBtn}
          onPress={onAiImport}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={15} color="#7c3aed" />
          <Text style={styles.aiImportBtnText}>AI Import</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addAssetBtn}
          onPress={onAddHolding}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text style={styles.addAssetBtnText}>Holding</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
