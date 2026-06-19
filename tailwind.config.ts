import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: 'rgb(250 249 246 / <alpha-value>)',
          dark: '#F0EDE8',
        },
        ink: { DEFAULT: '#1A1A1A', light: '#5C5C5C', muted: '#6B6B6B' },
        border: '#E5E0D8',
        accent: {
          DEFAULT: '#d4a574',
          dark: '#b07540',
        },
        // dimension scores
        dim: {
          fairness: '#f59e0b',
          compliance: '#3b82f6',
          financial: '#ef4444',
        },
        // risk levels
        risk: {
          high: '#dc2626',
          medium: '#f59e0b',
          low: '#22c55e',
        },
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out forwards',
        shimmer: 'shimmer 2s infinite linear',
      },
    },
  },
  plugins: [],
};

export default config;
