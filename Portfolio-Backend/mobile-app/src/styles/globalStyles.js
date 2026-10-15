import { StyleSheet, Platform } from 'react-native';
import { colors, spacing, radii, typography, layout } from './theme';

export const globalStyles = StyleSheet.create({
  // Safe Root Container
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + 10,
  },
  scrollContentDesktop: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },

  // Base Card Styles
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
      },
      default: {
        elevation: 2,
        shadowColor: colors.shadows.card,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
    }),
  },
  cardInteractive: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  // Responsive Layout Utilities
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  col: {
    flexDirection: 'column',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Typography Utilities
  displayTitle: {
    ...typography.display,
  },
  sectionTitle: {
    ...typography.sectionTitle,
  },
  subtitle: {
    ...typography.subtitle,
  },
  bodyText: {
    ...typography.body,
  },
  captionText: {
    ...typography.caption,
  },

  // Badge Utilities
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
  },
  badgeText: {
    ...typography.badge,
  },
  badgeSuccess: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
    borderWidth: 1,
  },
  badgeSuccessText: {
    color: colors.successText,
  },
  badgeWarning: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
    borderWidth: 1,
  },
  badgeWarningText: {
    color: colors.warningText,
  },
  badgeDanger: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
  },
  badgeDangerText: {
    color: colors.dangerText,
  },
  badgePrimary: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
  },
  badgePrimaryText: {
    color: colors.primary,
  },

  // Input Field Styles
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    minHeight: layout.minTouchTarget,
  },
  inputFocused: {
    borderColor: colors.primary,
  },

  // Button Styles
  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  btnPrimaryText: {
    color: colors.textLight,
    ...typography.button,
  },
  btnSecondary: {
    backgroundColor: colors.primaryBg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  btnSecondaryText: {
    color: colors.primary,
    ...typography.button,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  btnOutlineText: {
    color: colors.textSecondary,
    ...typography.button,
  },

  // Circular Icon Action Buttons (40x40 minimum for easy mobile tap)
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  iconBtnPrimary: {
    backgroundColor: colors.primaryBg,
  },
  iconBtnDanger: {
    backgroundColor: colors.dangerBg,
  },

  // Touch Target & Accessibility
  touchTarget: {
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Text Truncation Safety
  noOverflow: {
    overflow: 'hidden',
    flexShrink: 1,
  },
});

export default globalStyles;
