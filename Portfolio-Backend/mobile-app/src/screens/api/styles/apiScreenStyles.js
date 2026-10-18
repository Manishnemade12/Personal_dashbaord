import { StyleSheet, Platform } from 'react-native';
import { colors, spacing, radii, typography, layout } from '../../../styles/theme';

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
    paddingBottom: spacing.xxl + 30,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },

  // Header Actions
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.sm,
    minHeight: 28,
  },
  headerBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Project Filter Pills (Horizontal Scroll)
  projectFilterSection: {
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  projectFilterTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  projectFilterLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  projectFilterCounter: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  projectPillsScroll: {
    flexDirection: 'row',
  },
  projectPillsContainer: {
    gap: 6,
    paddingRight: 10,
    alignItems: 'center',
  },
  projectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  projectPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  projectPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  projectPillTextActive: {
    color: '#ffffff',
  },
  projectPillBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  projectPillBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  projectPillBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  projectPillBadgeTextActive: {
    color: '#ffffff',
  },

  // Search & Global Action Bar
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    padding: 0,
    minHeight: 24,
  },

  // Selected Project Hero Banner
  projectBanner: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
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
  projectBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  projectBannerInfo: {
    flex: 1,
    minWidth: 0,
  },
  projectBannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  projectBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  projectBannerDesc: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  projectBannerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  projectStatPill: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  projectStatPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  projectBannerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  bannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerBtnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  bannerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bannerBtnTextPrimary: {
    color: '#ffffff',
  },
  bannerBtnDanger: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  bannerBtnTextDanger: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '600',
  },

  // Key / Endpoint Card
  keyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      web: { boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)' },
      default: {
        elevation: 1,
        shadowColor: colors.shadows.card,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
      },
    }),
  },
  keyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  keyTitleArea: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  methodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  methodText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  keyProjectTag: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  keyProjectTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
  },
  keyName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  keyActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  keyMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radii.xs,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  keyMiniBtnSuccess: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
  },
  keyMiniBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  keyMiniBtnTextSuccess: {
    color: colors.successText,
  },
  iconActionBtn: {
    width: 26,
    height: 26,
    borderRadius: radii.xs,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Value / Secret Container
  valueBox: {
    backgroundColor: '#0f172a',
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  valueText: {
    fontSize: 11,
    color: '#38bdf8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  valueMasked: {
    fontSize: 12,
    color: '#94a3b8',
    letterSpacing: 2,
    flex: 1,
  },
  keyDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Project Group Card (in All View)
  projectGroupCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  projectGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  projectGroupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  projectGroupName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  projectGroupActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  projectGroupBody: {
    padding: 8,
    backgroundColor: colors.surfaceAlt,
  },

  // Toast / Copy Feedback Notice
  toastBanner: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#0f172a',
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 8,
    zIndex: 9999,
  },
  toastBannerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  formGroup: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 12,
    color: colors.textPrimary,
  },
  methodSelector: {
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
  },
  methodOption: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.xs,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  methodOptionText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  methodOptionTextSelected: {
    color: '#ffffff',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  projectSelectPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    maxHeight: 120,
  },
  projectSelectPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  projectSelectPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  projectSelectPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  projectSelectPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
