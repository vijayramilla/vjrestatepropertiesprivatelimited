/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        black: '#000000',
        white: '#FFFFFF',
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
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Inter', 'sans-serif'],
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
    },
  },
  plugins: [],
};
