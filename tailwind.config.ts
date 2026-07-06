import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Noto Sans SC"',
          '"Microsoft YaHei"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          'sans-serif',
        ],
        display: [
          'var(--font-display)',
          '"Noto Serif SC"',
          '"Songti SC"',
          'Georgia',
          'serif',
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      fontSize: {
        'hero': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '800' }],
        'hero-sm': ['1.125rem', { lineHeight: '1.7', letterSpacing: '0' }],
        'display': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'section': ['1.75rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '700' }],
      },
      colors: {
        paper: {
          DEFAULT: 'rgb(248 246 241 / <alpha-value>)',
          dark: '#EDE9E1',
        },
        ink: { DEFAULT: '#1A2332', light: '#4A5568', muted: '#64748B' },
        border: '#D8D2C8',
        accent: {
          DEFAULT: '#C9A227',
          dark: '#9A7B1A',
        },
        legal: {
          navy: '#1A365D',
          'navy-light': '#2C5282',
          'navy-dark': '#0F2440',
          gold: '#C9A227',
          cream: '#F8F6F1',
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
