import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#071225', 900: '#0B1B33', 800: '#13294A', 700: '#1E3A63', 600: '#2F4E7A', 500: '#4A6690', 400: '#7389AB', 300: '#A3B2C9', 200: '#CDD6E3', 100: '#E8EDF4', 50: '#F4F7FA' },
        leaf: { 900: '#064E35', 800: '#065F42', 700: '#047857', 600: '#059669', 500: '#10B981', 400: '#34D399', 300: '#6EE7B7', 100: '#D1FAE5', 50: '#ECFDF5' },
        sand: { 50: '#FAFAF7', 100: '#F3F2EC' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,27,51,0.04), 0 4px 16px -4px rgba(11,27,51,0.08)',
        lift: '0 2px 4px rgba(11,27,51,0.04), 0 16px 40px -12px rgba(11,27,51,0.18)',
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        'pulse-dot': { '0%,100%': { opacity: '0.3' }, '50%': { opacity: '1' } },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(.2,.7,.2,1) both',
        'pulse-dot': 'pulse-dot 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
