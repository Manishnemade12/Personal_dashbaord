export const colors = {
  // Main brand purple
  primary: '#7e37d8',
  primaryDark: '#571f9e',
  primaryLight: '#9358e0',
  primaryBg: '#e6dbfb',
  primaryHover: '#9664f1',

  // Backgrounds
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceAlt: '#f1f5f9',

  // Text
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  textLight: '#ffffff',

  // Status
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  dangerDark: '#dc2626',

  // Border & divider
  border: '#e2e8f0',
  borderDark: '#cbd5e1',

  // Card Gradients (matches globals.css .four_card nth-children)
  gradients: {
    purple: ['#9358e0', '#571f9e'],
    pink: ['#ff9cc3', '#fd3484'],
    yellow: ['#ffd85d', '#ffc200'],
    cyan: ['#00d2d7', '#07b2dd'],
  },

  // Shadows
  shadows: {
    purple: 'rgba(126, 55, 216, 0.35)',
    pink: 'rgba(254, 128, 178, 0.35)',
    yellow: 'rgba(255, 199, 23, 0.35)',
    cyan: 'rgba(6, 181, 221, 0.35)',
  }
};

export const typography = {
  titleLarge: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    color: colors.primaryDark,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  body: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  badge: {
    fontSize: 12,
    fontWeight: '600',
  }
};

export const layout = {
  cardBorderRadius: 24,
  pillBorderRadius: 50,
  inputBorderRadius: 12,
  padding: 16,
};
