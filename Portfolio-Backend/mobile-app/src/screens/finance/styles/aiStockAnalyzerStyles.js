import { StyleSheet, Platform } from 'react-native';
import { colors, spacing, radii } from '../../../styles/theme';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: spacing.sm,
    paddingBottom: spacing.xxl + 40,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },

  // Grok Banner Pill
  grokBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(126, 55, 216, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(126, 55, 216, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  grokBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7e37d8',
  },

  // Card Container
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' },
      default: {
        elevation: 1,
        shadowColor: colors.shadows.card,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
    }),
  },

  // Stock Selection Section Header
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  selectionCountBadge: {
    backgroundColor: 'rgba(126, 55, 216, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  selectionCountText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#7e37d8',
  },
  selectAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  // Search Filter Input
  searchInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 12,
    color: colors.textPrimary,
    marginBottom: 10,
  },

  // Stock Selection Item
  stockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
  },
  stockItemSelected: {
    backgroundColor: 'rgba(126, 55, 216, 0.06)',
    borderColor: '#7e37d8',
  },
  stockItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  checkboxSelected: {
    backgroundColor: '#7e37d8',
    borderColor: '#7e37d8',
  },
  stockSymbol: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  stockName: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  stockItemRight: {
    alignItems: 'flex-end',
  },
  stockPrice: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stockPnlBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  stockPnlBadgeProfit: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  stockPnlBadgeLoss: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  stockPnlTextProfit: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  stockPnlTextLoss: {
    fontSize: 10,
    fontWeight: '700',
    color: '#dc2626',
  },

  // Start Analysis Primary Button
  analyzeBtn: {
    backgroundColor: '#7e37d8',
    borderRadius: radii.sm,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    ...Platform.select({
      web: { boxShadow: '0 3px 12px rgba(126, 55, 216, 0.3)' },
      default: { elevation: 3 },
    }),
  },
  analyzeBtnDisabled: {
    opacity: 0.6,
  },
  analyzeBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Loading In-Progress Card
  loadingCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(126, 55, 216, 0.25)',
    marginVertical: 16,
  },
  loadingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 12,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 11.5,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 420,
    lineHeight: 17,
  },
  loadingPill: {
    backgroundColor: 'rgba(126, 55, 216, 0.1)',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 12,
  },
  loadingPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#7e37d8',
  },

  // =========================================================================
  // RESULTS: EXECUTIVE SUMMARY BANNER
  // =========================================================================
  summaryBanner: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(126, 55, 216, 0.3)',
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(126, 55, 216, 0.12)' },
      default: { elevation: 2 },
    }),
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#7e37d8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  scoreBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },

  // Breakdown Row (3 Actions Count)
  breakdownRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  breakdownChip: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: radii.xs,
    borderWidth: 1,
    alignItems: 'center',
  },
  breakdownChipBuy: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  breakdownChipHold: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  breakdownChipExit: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  breakdownChipCount: {
    fontSize: 14,
    fontWeight: '900',
  },
  breakdownChipLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 1,
  },

  summaryPlanBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  summaryPlanTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7e37d8',
    marginBottom: 3,
  },
  summaryPlanText: {
    fontSize: 11.5,
    color: colors.textPrimary,
    lineHeight: 17,
  },

  rebalanceNote: {
    fontSize: 10.5,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  // Filter Tabs
  filterTabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  filterTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: '#7e37d8',
    borderColor: '#7e37d8',
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // =========================================================================
  // DETAILED STOCK ANALYSIS CARD
  // =========================================================================
  stockAnalysisCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' },
      default: { elevation: 1 },
    }),
  },
  stockAnalysisCardBuy: {
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  stockAnalysisCardHold: {
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  stockAnalysisCardExit: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stockTitleRow: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  cardSymbolText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  cardCompanyText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // Verdict Badge
  verdictBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  verdictBadgeBuy: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  verdictBadgeHold: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  verdictBadgeExit: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  verdictBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  verdictBadgeTextBuy: {
    color: '#059669',
  },
  verdictBadgeTextHold: {
    color: '#2563eb',
  },
  verdictBadgeTextExit: {
    color: '#dc2626',
  },

  // Stats Grid in Card
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statColLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  statColVal: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },

  // Target & Buy Zone Levels
  levelsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  levelBox: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.xs,
    paddingVertical: 5,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  levelBoxLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  levelBoxVal: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 1,
  },

  // Action Plan Highlight Box
  actionPlanBox: {
    backgroundColor: 'rgba(126, 55, 216, 0.06)',
    borderRadius: radii.sm,
    padding: 9,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(126, 55, 216, 0.2)',
  },
  actionPlanTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#7e37d8',
    marginBottom: 3,
  },
  actionPlanText: {
    fontSize: 11,
    color: colors.textPrimary,
    lineHeight: 16,
  },

  // Thesis Box
  thesisText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 6,
  },

  // Tags Row (Catalysts & Horizon)
  tagsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: 4,
  },
  horizonBadge: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  convictionBadge: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#7e37d8',
  },

  // Secondary Bottom Actions
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: 8,
  },
  secondaryBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // Tab Switcher (Strategy vs Chat)
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: radii.md,
    padding: 3,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: radii.sm,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    ...Platform.select({
      web: { boxShadow: '0 2px 4px rgba(15, 23, 42, 0.08)' },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
    }),
  },
  tabBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#7e37d8',
    fontWeight: '800',
  },

  // AI Stock Chat Styles
  chatContainerCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 12,
    marginBottom: 12,
  },
  chatContextBanner: {
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderRadius: radii.sm,
    padding: 10,
    marginBottom: 10,
  },
  chatContextTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  chatContextTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#6b21a8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chatContextChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chatContextChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d8b4fe',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  chatContextChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#581c87',
  },
  chatQuickPromptsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 6,
    marginBottom: 6,
  },
  quickPromptsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  quickPromptChip: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
  },
  quickPromptText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  chatMessagesList: {
    minHeight: 220,
    maxHeight: 460,
    paddingVertical: 6,
  },
  messageRowUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#7e37d8',
    borderRadius: 14,
    borderBottomRightRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
    maxWidth: '85%',
  },
  messageTextUser: {
    color: '#ffffff',
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
  },
  messageRowAi: {
    alignSelf: 'flex-start',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderBottomLeftRadius: 3,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    maxWidth: '92%',
  },
  messageHeaderAi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  messageSenderAi: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7e37d8',
  },
  messageTextAi: {
    color: '#1e293b',
    fontSize: 12.5,
    lineHeight: 19,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 6,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12.5,
    color: colors.textPrimary,
  },
  chatSendBtn: {
    backgroundColor: '#7e37d8',
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
});

