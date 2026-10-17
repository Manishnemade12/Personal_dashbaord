import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/financeStyles';

export default function FinanceSummarySection({ summary, isMobile, onOpenInvestmentDetail, onNavigate }) {
  return (
    <>
          <View style={[styles.kpiGrid, isMobile && styles.kpiGridMobile]}>
            {/* Total Income */}
            <View style={[styles.kpiCard, isMobile ? styles.kpiCardHalf : styles.kpiCardDesktop, { borderLeftColor: '#10b981' }]}>
              <View style={styles.kpiRowTop}>
                <Text style={styles.kpiLabel}>Total Income</Text>
                <View style={[styles.kpiIconWrap, { backgroundColor: '#ecfdf5' }]}>
                  <Ionicons name="arrow-down" size={16} color="#10b981" />
                </View>
              </View>
              <Text style={[styles.kpiValue, { color: '#065f46' }]}>
                ₹{Math.round(summary?.monthlyIncome || 0).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.kpiSub}>Earned this month</Text>
            </View>

            {/* Total Living Spent */}
            <View style={[styles.kpiCard, isMobile ? styles.kpiCardHalf : styles.kpiCardDesktop, { borderLeftColor: '#ef4444' }]}>
              <View style={styles.kpiRowTop}>
                <Text style={styles.kpiLabel}>Living Spent</Text>
                <View style={[styles.kpiIconWrap, { backgroundColor: '#fee2e2' }]}>
                  <Ionicons name="cart-outline" size={16} color="#ef4444" />
                </View>
              </View>
              <Text style={[styles.kpiValue, { color: '#991b1b' }]}>
                ₹{Math.round(summary?.totalSpent || 0).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.kpiSub}>
                {summary?.transactionCount || 0} expense entries
              </Text>
            </View>

            {/* Invested This Month (Coupled!) */}
            <TouchableOpacity
              style={[styles.kpiCard, styles.kpiCardInteractive, isMobile ? styles.kpiCardHalf : styles.kpiCardDesktop, { borderLeftColor: '#7e37d8' }]}
              onPress={onOpenInvestmentDetail}
              activeOpacity={0.8}
            >
              <View style={styles.kpiRowTop}>
                <Text style={styles.kpiLabel}>Invested</Text>
                <View style={[styles.kpiIconWrap, { backgroundColor: '#f3e8ff' }]}>
                  <Ionicons name="trending-up" size={16} color="#7e37d8" />
                </View>
              </View>
              <Text style={[styles.kpiValue, { color: '#581c87' }]}>
                ₹{Math.round(summary?.monthlyInvested || 0).toLocaleString('en-IN')}
              </Text>
              <View style={styles.kpiInteractiveBadge}>
                <Text style={styles.kpiInteractiveText}>
                  {summary?.investedByInstrument?.length || 0} assets • Tap ↗
                </Text>
              </View>
            </TouchableOpacity>

            {/* Remaining Expense Budget */}
            <View style={[styles.kpiCard, isMobile ? styles.kpiCardHalf : styles.kpiCardDesktop, { borderLeftColor: '#3b82f6' }]}>
              <View style={styles.kpiRowTop}>
                <Text style={styles.kpiLabel}>Budget Left</Text>
                <View style={[styles.kpiIconWrap, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="wallet-outline" size={16} color="#3b82f6" />
                </View>
              </View>
              <Text style={[styles.kpiValue, { color: '#1e40af' }]}>
                ₹{Math.round(summary?.remainingBudget || 0).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.kpiSub} numberOfLines={1}>
                {summary?.spendingLimit > 0
                  ? `From ₹${Math.round(summary?.spendingLimit || 0).toLocaleString('en-IN')}`
                  : 'No limit set'}
              </Text>
            </View>

            {/* Net Free Cashflow / Liquid Surplus / Outflow (Coupled: Income - Expenses - Investments) */}
            {(() => {
              const hasIncome = (summary?.monthlyIncome || 0) > 0;
              const netVal = summary?.netSavings || 0;
              const isPositive = netVal >= 0;

              const borderColor = !hasIncome ? '#f59e0b' : isPositive ? '#10b981' : '#ef4444';
              const bgColor = !hasIncome ? '#fffbeb' : isPositive ? '#f0fdf4' : '#fef2f2';
              const badgeBg = !hasIncome ? '#fef3c7' : isPositive ? '#dcfce7' : '#fee2e2';
              const badgeColor = !hasIncome ? '#b45309' : isPositive ? '#059669' : '#dc2626';
              const badgeLabel = !hasIncome ? 'No Income Added' : isPositive ? 'Liquid Surplus' : 'Net Deficit';
              const valueColor = !hasIncome ? '#92400e' : isPositive ? '#065f46' : '#dc2626';
              const iconName = !hasIncome ? 'wallet-outline' : isPositive ? 'cash-outline' : 'alert-circle-outline';
              const iconColor = !hasIncome ? '#d97706' : isPositive ? '#059669' : '#dc2626';

              const displayAmount = !hasIncome
                ? `₹${Math.round(summary?.totalOutflow || 0).toLocaleString('en-IN')}`
                : `${isPositive ? '+' : '-'}₹${Math.round(Math.abs(netVal)).toLocaleString('en-IN')}`;

              const subText = !hasIncome
                ? `₹${Math.round(summary?.totalSpent || 0).toLocaleString('en-IN')} living + ₹${Math.round(summary?.monthlyInvested || 0).toLocaleString('en-IN')} invested • Add income in (+ Entry) to see Net Surplus`
                : isPositive
                ? `Liquid surplus remaining from ₹${Math.round(summary?.monthlyIncome || 0).toLocaleString('en-IN')} income after living & investment deployments`
                : `Outflow exceeded income by ₹${Math.round(Math.abs(netVal)).toLocaleString('en-IN')}`;

              return (
                <View
                  style={[
                    styles.kpiCard,
                    isMobile ? styles.kpiCardFull : styles.kpiCardDesktop,
                    { borderLeftColor: borderColor, backgroundColor: bgColor },
                  ]}
                >
                  <View style={styles.kpiRowTop}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.kpiLabel, { color: valueColor }]}>
                        {!hasIncome ? 'Total Outflow Deployed' : 'Net Free Cashflow'}
                      </Text>
                      <View style={{ backgroundColor: badgeBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: badgeColor }}>{badgeLabel}</Text>
                      </View>
                    </View>
                    <View style={[styles.kpiIconWrap, { backgroundColor: badgeBg }]}>
                      <Ionicons name={iconName} size={16} color={iconColor} />
                    </View>
                  </View>
                  <Text style={[styles.kpiValue, { color: valueColor }]}>
                    {displayAmount}
                  </Text>
                  <Text style={styles.kpiSub}>
                    {subText}
                  </Text>
                </View>
              );
            })()}
          </View>

          {/* 3. Dual Coupled Trackers: Spending Budget & Wealth Target */}
          <View style={[styles.dualMetersContainer, isMobile && { flexDirection: 'column', gap: 12 }]}>
            {/* Left: Monthly Spending Budget Meter */}
            <View style={styles.budgetMeterCard}>
              <View style={styles.meterHeader}>
                <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <Text style={styles.meterTitle} numberOfLines={1}>Monthly Expense Budget</Text>
                  <Text style={styles.meterSubtitle} numberOfLines={2}>
                    {summary?.spendingLimit > 0
                      ? `₹${(summary?.totalSpent || 0).toLocaleString('en-IN')} spent of ₹${(summary?.spendingLimit || 0).toLocaleString('en-IN')} allocated limit`
                      : `₹${(summary?.totalSpent || 0).toLocaleString('en-IN')} spent this month • No limit configured`}
                  </Text>
                </View>
                <View
                  style={[
                    styles.meterPercentBadge,
                    { flexShrink: 0 },
                    summary?.spendingLimit > 0
                      ? summary?.budgetSpentPercent > 90
                        ? styles.badgeDanger
                        : summary?.budgetSpentPercent > 70
                        ? styles.badgeWarn
                        : styles.badgeSuccess
                      : styles.badgeNeutral,
                  ]}
                >
                  <Text
                    style={[
                      styles.meterPercentText,
                      summary?.spendingLimit > 0
                        ? summary?.budgetSpentPercent > 90
                          ? styles.textDanger
                          : summary?.budgetSpentPercent > 70
                          ? styles.textWarn
                          : styles.textSuccess
                        : styles.textNeutral,
                    ]}
                  >
                    {summary?.spendingLimit > 0 ? `${summary?.budgetSpentPercent || 0}% Spent` : 'No Budget'}
                  </Text>
                </View>
              </View>

              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: summary?.spendingLimit > 0 ? `${Math.min(100, summary?.budgetSpentPercent || 0)}%` : '0%',
                      backgroundColor:
                        summary?.budgetSpentPercent > 90
                          ? '#ef4444'
                          : summary?.budgetSpentPercent > 70
                          ? '#f59e0b'
                          : '#10b981',
                    },
                  ]}
                />
              </View>

              <View style={styles.meterFooterRow}>
                <View style={styles.footStatItem}>
                  <Ionicons name="shield-checkmark-outline" size={14} color="#10b981" />
                  <Text style={styles.meterFootText}>
                    Safe daily spend: ₹
                    {Math.round((summary?.remainingBudget || 0) / 30).toLocaleString('en-IN')} / day
                  </Text>
                </View>
              </View>
            </View>

            {/* Right: Monthly Wealth & Investment Target Meter (Coupled!) */}
            <View style={styles.investmentMeterCard}>
              <View style={styles.meterHeader}>
                <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <Text style={styles.meterTitle} numberOfLines={1}>Monthly Investment Target</Text>
                  <Text style={styles.meterSubtitle} numberOfLines={2}>
                    {summary?.investmentTarget > 0
                      ? `₹${(summary?.monthlyInvested || 0).toLocaleString('en-IN')} invested of ₹${(summary?.investmentTarget || 0).toLocaleString('en-IN')} target`
                      : `₹${(summary?.monthlyInvested || 0).toLocaleString('en-IN')} invested • Tap Set Budget to set target`}
                  </Text>
                </View>
                <View
                  style={[
                    styles.meterPercentBadge,
                    { flexShrink: 0 },
                    summary?.investmentTarget > 0
                      ? summary?.investmentTargetProgress >= 100
                        ? styles.badgeSuccess
                        : styles.badgePurple
                      : styles.badgeNeutral,
                  ]}
                >
                  <Text
                    style={[
                      styles.meterPercentText,
                      summary?.investmentTarget > 0
                        ? summary?.investmentTargetProgress >= 100
                          ? styles.textSuccess
                          : styles.textPurple
                        : styles.textNeutral,
                    ]}
                  >
                    {summary?.investmentTarget > 0
                      ? summary?.investmentTargetProgress >= 100
                        ? '🎉 Goal Achieved!'
                        : `${summary?.investmentTargetProgress || 0}% Reached`
                      : 'No Target'}
                  </Text>
                </View>
              </View>

              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: summary?.investmentTarget > 0 ? `${Math.min(100, summary?.investmentTargetProgress || 0)}%` : '0%',
                      backgroundColor: '#7e37d8',
                    },
                  ]}
                />
              </View>

              <View style={styles.meterFooterRow}>
                <View style={styles.footStatItem}>
                  <Ionicons name="flag-outline" size={14} color="#7e37d8" />
                  <Text style={styles.meterFootText}>
                    {summary?.investmentTarget > 0
                      ? (summary?.remainingInvestmentTarget || 0) > 0
                        ? `₹${Math.round(summary?.remainingInvestmentTarget || 0).toLocaleString('en-IN')} remaining to hit goal`
                        : 'Target fully accomplished this month!'
                      : 'Target not configured'}
                  </Text>
                </View>
                <TouchableOpacity onPress={onOpenInvestmentDetail} style={styles.footLinkBtn}>
                  <Text style={styles.footLinkText}>Inspect Buys →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 3B. Current Month Wealth Deployments & Investments Breakdown */}
          {((summary?.monthlyInvested || 0) > 0 || (summary?.investedByInstrument?.length || 0) > 0) && (
            <View style={styles.investmentsOverviewCard}>
              <View style={[styles.invCardHeader, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}>
                <View style={[styles.invCardTitleWrap, isMobile && { width: '100%' }]}>
                  <View style={[styles.invIconBadge, isMobile && { width: 32, height: 32, borderRadius: 8 }]}>
                    <Ionicons name="trending-up" size={isMobile ? 16 : 18} color="#7e37d8" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.invCardTitle, isMobile && { fontSize: 14 }]} numberOfLines={1}>Current Month Wealth</Text>
                    <Text style={[styles.invCardSubtitle, isMobile && { fontSize: 11 }]} numberOfLines={isMobile ? 2 : 1}>
                      Monthly Deployments • ₹{(summary?.monthlyInvested || 0).toLocaleString('en-IN')} across {summary?.investedByInstrument?.length || 0} assets
                    </Text>
                  </View>
                </View>

                <View style={[styles.invCardActions, isMobile && { width: '100%', justifyContent: 'flex-start', flexWrap: 'wrap', gap: 6 }]}>
                  <TouchableOpacity
                    style={[styles.invViewAllBtn, isMobile && { flex: 1, justifyContent: 'center', paddingHorizontal: 9, paddingVertical: 5, minHeight: 28 }]}
                    onPress={onOpenInvestmentDetail}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="list" size={13} color="#7e37d8" />
                    <Text style={[styles.invViewAllText, isMobile && { fontSize: 11 }]}>
                      View ({summary?.investmentTransactionsThisMonth?.length || 0})
                    </Text>
                  </TouchableOpacity>

                  {onNavigate && (
                    <TouchableOpacity
                      style={[styles.invPortfolioLinkBtn, isMobile && { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 5, minHeight: 28 }]}
                      onPress={() => onNavigate('Investments')}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.invPortfolioLinkText, isMobile && { fontSize: 11 }]}>Track ↗</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Asset Class Distribution Pills */}
              {Array.isArray(summary?.investedByAssetClass) && summary.investedByAssetClass.length > 0 && (
                <View style={styles.assetClassPillsWrap}>
                  {summary.investedByAssetClass.map((ac) => (
                    <View key={ac.assetClass} style={styles.assetClassPill}>
                      <View style={styles.assetClassDot} />
                      <Text style={styles.assetClassPillLabel}>{ac.assetClass}:</Text>
                      <Text style={styles.assetClassPillAmount}>
                        ₹{(ac.amount || 0).toLocaleString('en-IN')} ({ac.percent || 0}%)
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Top Funded Instruments Horizontal Feed */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.invInstScroll}>
                <View style={styles.invInstRow}>
                  {summary?.investedByInstrument?.slice(0, 10).map((inst) => (
                    <TouchableOpacity
                      key={inst.name}
                      style={styles.invInstItemCard}
                      onPress={onOpenInvestmentDetail}
                      activeOpacity={0.8}
                    >
                      <View style={styles.invInstTopRow}>
                        <Text style={styles.invInstSymbol} numberOfLines={1}>{inst.symbol || inst.name}</Text>
                        <View style={styles.invInstClassBadge}>
                          <Text style={styles.invInstClassText}>{inst.assetClass}</Text>
                        </View>
                      </View>
                      <Text style={styles.invInstName} numberOfLines={1}>{inst.name}</Text>
                      <Text style={styles.invInstAmount}>
                        ₹{(inst.totalAmount || 0).toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.invInstUnits}>
                        {inst.units} units @ ₹{inst.latestPrice || 0}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

    </>
  );
}
