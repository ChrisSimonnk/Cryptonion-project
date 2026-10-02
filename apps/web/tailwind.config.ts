import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#070C1A',
        surface: '#0D162B',
        'surface-subtle': '#13203C',
        'surface-border': '#1D2E54',
        'surface-highlight': '#253B6B',
        even: {
          blue: '#0055FF', // Even signature electric cobalt
          'blue-hover': '#0043CC',
          'blue-light': '#3377FF',
          ice: '#E4EAF6',
          'ice-subtle': '#F3F6FC',
          pink: '#FF459F',
          emerald: '#00C853',
          navy: '#0B132B',
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#0055ff', // Even Electric Blue
          600: '#0047d6',
          700: '#003bb3',
        },
        accent: {
          cyan: '#00D2FF',
          teal: '#00C853',
          emerald: '#10B981',
          pink: '#FF459F',
          amber: '#FFB800',
          rose: '#FF3366',
          sky: '#38BDF8',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'even-radial': 'radial-gradient(circle at 50% -10%, rgba(0, 85, 255, 0.22), rgba(0, 200, 83, 0.08) 40%, transparent 75%)',
        'even-gradient': 'linear-gradient(135deg, #0055FF 0%, #00D2FF 100%)',
        'card-gradient': 'linear-gradient(180deg, rgba(19, 32, 60, 0.75) 0%, rgba(13, 22, 43, 0.9) 100%)',
      },
      boxShadow: {
        'even-glow': '0 8px 30px -4px rgba(0, 85, 255, 0.25), 0 2px 8px -1px rgba(0, 0, 0, 0.3)',
        'even-hover': '0 14px 36px -4px rgba(0, 85, 255, 0.35), 0 4px 14px -2px rgba(0, 0, 0, 0.4)',
      }
    },
  },
  plugins: [],
};

export default config;
