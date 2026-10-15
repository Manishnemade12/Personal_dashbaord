export const ASSET_CLASSES = ['All', 'Equity', 'Mutual Fund', 'ETF', 'Gold'];

export const ASSET_META = {
  Equity: { label: 'Stocks', icon: 'trending-up', color: '#3b82f6', bg: '#eff6ff', unit: 'Shares' },
  'Mutual Fund': { label: 'Mutual Funds', icon: 'pie-chart', color: '#7e37d8', bg: '#f5f3ff', unit: 'Units' },
  ETF: { label: 'ETFs', icon: 'layers', color: '#06b6d4', bg: '#ecfeff', unit: 'Units' },
  Gold: { label: 'Commodities', icon: 'shield', color: '#f59e0b', bg: '#fffbeb', unit: 'Units' },
  'Fixed Income': { label: 'Bonds/FD', icon: 'lock-closed', color: '#10b981', bg: '#ecfdf5', unit: 'Units' },
};
