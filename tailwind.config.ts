import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      colors: {
        // New brand colors
        brand: {
          primary: '#F5A623',
          gradient: {
            from: '#F6B63E',
            to: '#E98E00',
          }
        },
        surface: {
          light: '#FFF8F1',
          dark: '#0F0F0F',
        },
        text: {
          light: '#111111',
          dark: '#EDEDED',
        },
        // Legacy colors for compatibility
        peach: {
          50:  '#F9F5EF',
          100: '#FDF9F3',
          200: '#F8E8D7',
          300: '#F2D7BB',
          400: '#EEC49B',
          500: '#E7B079',
          600: '#E29A2E',
          700: '#C67F22',
        },
        slateDark: {
          900: '#0F0F0F',
          800: '#181818',
          700: '#2A2A2A',
        },
        sun: '#FBEEDC',
        amber: {
          DEFAULT: '#F3A340',
          400: '#FFB847',
          500: '#F3A340',
          600: '#C47C00',
          900: '#1A1409'
        },
        // CSS variable-based colors for theme switching
        background: 'var(--bg)',
        foreground: 'var(--fg)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--fg)'
        },
        popover: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--fg)'
        },
        primary: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--fg)'
        },
        secondary: {
          DEFAULT: 'var(--accent-soft)',
          foreground: 'var(--fg)'
        },
        muted: {
          DEFAULT: 'var(--accent-soft)',
          foreground: 'var(--fg)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--fg)'
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff'
        },
        border: 'var(--outline)',
        input: 'var(--outline)',
        ring: 'var(--accent)',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,.06)',
        sun: '0 0 40px rgba(226,154,46,0.4)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
      screens: {
        xs: '475px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
      },
      keyframes: {
        'draw': {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' }
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        }
      },
      animation: {
        'draw': 'draw 0.6s ease-out',
        'fade-up': 'fade-up 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.2s ease-out',
        'slide-in-left': 'slide-in-left 0.2s ease-out'
      },
      maxWidth: {
        '72ch': '72ch',
        '80ch': '80ch',
        '85ch': '85ch',
        '90ch': '90ch',
        '96ch': '96ch',
        '110ch': '110ch',
        '120ch': '120ch',
        '130ch': '130ch',
        '140ch': '140ch',
        '150ch': '150ch',
        '160ch': '160ch'
      },
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
