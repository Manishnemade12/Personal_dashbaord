import { StyleSheet, Platform } from 'react-native';
import { colors, spacing, radii, typography, layout } from '../../../styles/theme';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 20,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    minHeight: 36,
  },
  createBtnText: {
    color: colors.textLight,
    fontSize: 12,
    fontWeight: '700',
  },
  filterSection: {
    marginBottom: spacing.xs,
  },
  blogCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' },
      default: {
        elevation: 2,
        shadowColor: colors.shadows.card,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
    }),
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  thumbWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 19,
    marginBottom: 4,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    flexWrap: 'wrap',
    gap: 6,
  },
  tagsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  statusBadgePublished: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
    borderWidth: 1,
  },
  statusBadgeDraft: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  categoryBadge: {
    fontSize: 11,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
    fontWeight: '500',
  },
  actionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: colors.primaryBg,
  },
  deleteBtn: {
    backgroundColor: colors.dangerBg,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
});
