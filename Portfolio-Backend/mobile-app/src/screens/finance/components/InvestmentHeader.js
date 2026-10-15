import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/investmentStyles';

export default function InvestmentHeader({ isMobile, refreshing, onNavigate, onRefresh, onBulkRemove, onAiImport, onAddHolding }) {
  return (
      <View style={[styles.headerToolbar, isMobile && { paddingHorizontal: 12, paddingVertical: 10, gap: 10 }]}>
        <View style={[styles.leftTitleRow, isMobile && { width: '100%' }]}>
          <View style={styles.titleIconBadge}>
            <Ionicons name="trending-up" size={20} color="#3b82f6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, isMobile && { fontSize: 17 }]}>Investments & Wealth</Text>
            <View style={styles.liveBadgeRow}>
              <View style={styles.livePulseDot} />
              <Text style={styles.liveBadgeText}>NSE/BSE & AMFI Real-time Tracking</Text>
            </View>
          </View>
        </View>

        <View style={[styles.rightActionRow, isMobile && { width: '100%', justifyContent: 'space-between', gap: 6 }]}>
          <TouchableOpacity
            style={[styles.analyticsBtn, isMobile && { flex: 1.1, justifyContent: 'center', paddingHorizontal: 6 }]}
            onPress={() => onNavigate && onNavigate('InvestmentAnalytics')}
            activeOpacity={0.8}
          >
            <Ionicons name="pie-chart-outline" size={15} color="#7e37d8" />
            <Text style={styles.analyticsBtnText}>{isMobile ? 'Visuals' : 'Visualisation & Charts'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.refreshBtn, isMobile && { paddingHorizontal: 10 }]}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Ionicons
              name="refresh-outline"
              size={15}
              color="#3b82f6"
              style={refreshing ? { transform: [{ rotate: '45deg' }] } : {}}
            />
            {!isMobile && <Text style={styles.refreshBtnText}>{refreshing ? 'Updating Prices...' : 'Sync Market Prices'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.manageRemoveBtn, isMobile && { paddingHorizontal: 10 }]}
            onPress={onBulkRemove}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={15} color="#ef4444" />
            {!isMobile && <Text style={styles.manageRemoveBtnText}>Remove Holdings</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.aiImportBtn, isMobile && { paddingHorizontal: 10 }]}
            onPress={onAiImport}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={15} color="#7c3aed" />
            <Text style={styles.aiImportBtnText}>AI Import</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addAssetBtn, isMobile && { flex: 1.3, justifyContent: 'center', paddingHorizontal: 8 }]}
            onPress={() => {
              onAddHolding()
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.addAssetBtnText}>+ Holding</Text>
          </TouchableOpacity>
        </View>
      </View>

  );
}
