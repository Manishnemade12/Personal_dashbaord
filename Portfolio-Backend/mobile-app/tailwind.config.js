/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.js',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core dark palette
        vault: {
          bg: '#0b0f19',
          card: '#0f172a',
          surface: '#111827',
          border: '#1e293b',
          'border-light': '#334155',
        },
        // Accent colors
        accent: {
          primary: '#6366f1',    // indigo
          success: '#10b981',    // emerald
          danger: '#f43f5e',     // rose
          warning: '#f59e0b',    // amber
          info: '#3b82f6',       // blue
          purple: '#8b5cf6',     // violet
        },
        // Text colors
        txt: {
          primary: '#f8fafc',
          secondary: '#cbd5e1',
          muted: '#94a3b8',
          dim: '#64748b',
        },
      },
      fontFamily: {
        mono: ['monospace'],
      },
    },
  },
  plugins: [],
};

