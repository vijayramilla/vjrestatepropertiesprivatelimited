/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        chart: {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
          5: 'var(--chart-5)',
        },
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: 'var(--sidebar-foreground)',
          primary: 'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent: 'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)',
        },
        black: '#000000',
        white: '#FFFFFF',
        gold: {
          50: '#fdf8ed',
          100: '#f9edcc',
          200: '#f2d98e',
          300: '#e8c44f',
          400: '#dfb42a',
          500: '#c9a962',
          600: '#a8883d',
          700: '#8a6d30',
          800: '#735b2d',
          900: '#614d2b',
        },
        gray: {
          950: '#0A0A0A',
          900: '#111111',
          800: '#1A1A1A',
          700: '#222222',
          400: '#666666',
          200: '#CCCCCC',
          100: '#E5E5E5',
          50: '#F5F5F5',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Aileron', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Poppins', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        numeric: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        xs: '8px',
        sm: '13px',
        md: '21px',
        lg: '34px',
        xl: '55px',
        '2xl': '89px',
        '3xl': '144px',
      },
      fontSize: {
        h1: ['110px', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        h2: ['68px', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        h3: ['42px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        h4: ['26px', { lineHeight: '1.3', letterSpacing: '-0.02em' }],
        body: ['16px', { lineHeight: '1.618', letterSpacing: '0.01em' }],
      },
      maxWidth: {
        golden: '680px',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(20)', opacity: '0' },
        },
        'fade-rise': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        ripple: 'ripple 0.6s ease-out',
        'fade-rise': 'fade-rise 0.8s ease-out forwards',
        'fade-rise-delay': 'fade-rise 0.8s ease-out 0.2s forwards',
        'fade-rise-delay-2': 'fade-rise 0.8s ease-out 0.4s forwards',
      },
    },
  },
  plugins: [],
};
