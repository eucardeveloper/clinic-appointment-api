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
      colors: {
        /* Surfaces */
        background:  'hsl(var(--background))',
        'surface-1': 'hsl(var(--surface-1))',
        'surface-2': 'hsl(var(--surface-2))',
        'surface-3': 'hsl(var(--surface-3))',

        /* Legacy aliases kept for backward compat */
        card:    { DEFAULT: 'hsl(var(--surface-1))', foreground: 'hsl(var(--foreground))' },
        popover: { DEFAULT: 'hsl(var(--surface-2))', foreground: 'hsl(var(--foreground))' },
        muted:   { DEFAULT: 'hsl(var(--surface-2))', foreground: 'hsl(var(--muted-foreground))' },

        /* Text */
        foreground: 'hsl(var(--foreground))',

        /* Accent */
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--surface-2))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--surface-3))',
          foreground: 'hsl(var(--foreground))',
        },

        /* Borders */
        border: 'hsl(var(--border))',
        input:  'hsl(var(--border))',
        ring:   'hsl(var(--primary))',

        /* Status */
        destructive: {
          DEFAULT:    'hsl(var(--danger))',
          foreground: 'hsl(var(--primary-foreground))',
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
