import { StyleSheet, Platform } from 'react-native';
import { colors, spacing, radii, typography } from '../../../styles/theme';

export default StyleSheet.create({
  fullH: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  loginform: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 30px rgba(126, 55, 216, 0.1)',
      },
      default: {
        elevation: 6,
        shadowColor: colors.shadows.purple,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
    }),
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heading: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 22,
    color: colors.primary,
    marginBottom: 4,
  },
  subheading: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  loadingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  loadingText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  form: {
    marginTop: spacing.xs,
  },
  input: {
    width: '100%',
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontSize: 12,
    fontWeight: '600',
  },
  loginBtnWrapper: {
    marginTop: spacing.lg,
    borderRadius: radii.md,
    overflow: 'hidden',
    elevation: 3,
  },
  loginButton: {
    width: '100%',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: colors.textLight,
    fontSize: 15,
    fontWeight: '700',
  },
  toggleWrap: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  toggleText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  agreement: {
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  agreementLink: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
