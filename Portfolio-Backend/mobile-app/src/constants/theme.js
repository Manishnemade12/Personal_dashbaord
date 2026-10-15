/**
 * Centralized Design Tokens System
 * Unified colors, typography, spacing, radii, breakpoints, and shadows.
 * Designed for mobile-first ergonomics and responsive scalability.
 */

export const colors = {
  // Brand Purple Palette
  primary: '#7e37d8',
  primaryDark: '#571f9e',
  primaryLight: '#9358e0',
  primaryBg: '#f5f3ff',
  primaryBorder: '#ddd6fe',
  primaryHover: '#9664f1',

  // Surfaces & Backgrounds
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceAlt: '#f1f5f9',
  surfaceCard: '#ffffff',
  surfaceHover: '#f8fafc',

  // Text Colors
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  textLight: '#ffffff',
  textDisabled: '#cbd5e1',

  // Status & Accents
  success: '#10b981',
  successBg: '#ecfdf5',
  successBorder: '#a7f3d0',
  successText: '#047857',

  warning: '#f59e0b',
  warningBg: '#fffbeb',
  warningBorder: '#fde68a',
  warningText: '#b45309',

  danger: '#ef4444',
  dangerDark: '#dc2626',
  dangerBg: '#fef2f2',
  dangerBorder: '#fecaca',
  dangerText: '#b91c1c',

  info: '#3b82f6',
  infoBg: '#eff6ff',
  infoBorder: '#bfdbfe',
  infoText: '#1d4ed8',

  cyan: '#06b6d4',
  cyanBg: '#ecfeff',
  cyanBorder: '#a5f3fc',
  cyanText: '#0e7490',

  // Borders & Dividers
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  borderDark: '#cbd5e1',
  divider: '#f1f5f9',

  // Card Gradients
  gradients: {
    purple: ['#9358e0', '#571f9e'],
    pink: ['#f472b6', '#db2777'],
    yellow: ['#fbbf24', '#d97706'],
    cyan: ['#22d3ee', '#0284c7'],
    emerald: ['#34d399', '#059669'],
    slate: ['#475569', '#1e293b'],
  },

  // Elevation Shadows
  shadows: {
    purple: 'rgba(126, 55, 216, 0.25)',
    pink: 'rgba(219, 39, 119, 0.25)',
    yellow: 'rgba(217, 119, 6, 0.25)',
    cyan: 'rgba(2, 132, 199, 0.25)',
    subtle: 'rgba(15, 23, 42, 0.05)',
    card: 'rgba(15, 23, 42, 0.08)',
    float: 'rgba(15, 23, 42, 0.12)',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radii = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  pill: 9999,
};

export const breakpoints = {
  compactMobile: 380,
  mobile: 480,
  tablet: 768,
  desktop: 1024,
};

export const typography = {
  display: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  titleLarge: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.primaryDark,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  bodySecondary: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
  },
  badge: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  button: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
};

export const layout = {
  cardBorderRadius: radii.xl,
  pillBorderRadius: radii.pill,
  inputBorderRadius: radii.md,
  padding: spacing.lg,
  mobilePadding: spacing.md,
  minTouchTarget: 44,
};

export default {
  colors,
  spacing,
  radii,
  breakpoints,
  typography,
  layout,
};
