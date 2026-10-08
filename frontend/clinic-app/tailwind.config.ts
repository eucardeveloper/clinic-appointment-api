import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: ['class'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* Surfaces */
        background:  'hsl(var(--background) / <alpha-value>)',
        'surface-1': 'hsl(var(--surface-1) / <alpha-value>)',
        'surface-2': 'hsl(var(--surface-2) / <alpha-value>)',
        'surface-3': 'hsl(var(--surface-3) / <alpha-value>)',

        /* Legacy aliases kept for backward compat */
        card:    { DEFAULT: 'hsl(var(--surface-1) / <alpha-value>)', foreground: 'hsl(var(--foreground) / <alpha-value>)' },
        popover: { DEFAULT: 'hsl(var(--surface-2) / <alpha-value>)', foreground: 'hsl(var(--foreground) / <alpha-value>)' },
        muted:   { DEFAULT: 'hsl(var(--surface-2) / <alpha-value>)', foreground: 'hsl(var(--muted-foreground) / <alpha-value>)' },

        /* Text */
        foreground: 'hsl(var(--foreground) / <alpha-value>)',

        'primary-hover': 'hsl(var(--primary-hover) / <alpha-value>)',
        sidebar: 'hsl(var(--sidebar) / <alpha-value>)',

        /* Accent */
        primary: {
          DEFAULT:    'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT:    'hsl(var(--surface-2) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT:    'hsl(var(--surface-3) / <alpha-value>)',
          foreground: 'hsl(var(--foreground) / <alpha-value>)',
        },

        /* Borders */
        border: 'hsl(var(--border) / <alpha-value>)',
        input:  'hsl(var(--border) / <alpha-value>)',
        ring:   'hsl(var(--primary) / <alpha-value>)',

        /* Status */
        destructive: {
          DEFAULT:    'hsl(var(--danger) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
      },

      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        full: 'var(--radius-full)',
      },

      boxShadow: {
        card:    'var(--shadow-card)',
        popover: 'var(--shadow-popover)',
      },

      transitionDuration: {
        '120': '120ms',
        '180': '180ms',
      },

      animation: {
        'in': 'fadeIn 180ms ease-out',
        'slide-in-from-right-4': 'slideInRight 180ms ease-out',
      },

      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
