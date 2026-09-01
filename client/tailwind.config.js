/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        keep: {
          default: { light: '#ffffff', dark: '#202124' },
          coral: { light: '#faafa8', dark: '#77172e' },
          peach: { light: '#f39f76', dark: '#692b17' },
          sand: { light: '#fff8b8', dark: '#7c4a03' },
          mint: { light: '#e2f6cb', dark: '#264d3b' },
          sage: { light: '#b4ddd3', dark: '#0c625d' },
          fog: { light: '#d4e4ed', dark: '#256377' },
          storm: { light: '#aeccdc', dark: '#284255' },
          blossom: { light: '#d3bfdb', dark: '#472e5b' },
          clay: { light: '#f6e2dd', dark: '#6c394f' },
          chalk: { light: '#e9e3d4', dark: '#4b443a' },
          gray: { light: '#efeff1', dark: '#2d2f31' },
        }
      },
      // 25% Reduced Border Radius Scale for all elements (buttons, inputs, cards, modals)
      borderRadius: {
        'none': '0px',
        'sm': '1.5px',      // ~1.5px (was 2px, -25%)
        'DEFAULT': '3px',   // 3px (was 4px, -25%)
        'md': '4.5px',      // ~4.5px (was 6px, -25%)
        'lg': '6px',        // 6px (was 8px, -25%)
        'xl': '9px',        // 9px (was 12px, -25%)
        '2xl': '12px',      // 12px (was 16px, -25%)
        '3xl': '18px',      // 18px (was 24px, -25%)
        'full': '9999px',
      },
      // All font sizes increased by +0.10rem base, scaled strictly via --font-scale without altering container/padding spacing
      fontSize: {
        '2xs': ['calc(0.75rem * var(--font-scale, 1))', { lineHeight: '1.2' }],
        'xs': ['calc(0.85rem * var(--font-scale, 1))', { lineHeight: '1.3' }],
        'sm': ['calc(0.975rem * var(--font-scale, 1))', { lineHeight: '1.4' }],
        'base': ['calc(1.10rem * var(--font-scale, 1))', { lineHeight: '1.5' }],
        'lg': ['calc(1.225rem * var(--font-scale, 1))', { lineHeight: '1.6' }],
        'xl': ['calc(1.35rem * var(--font-scale, 1))', { lineHeight: '1.6' }],
        '2xl': ['calc(1.60rem * var(--font-scale, 1))', { lineHeight: '1.4' }],
        '3xl': ['calc(1.975rem * var(--font-scale, 1))', { lineHeight: '1.3' }],
        '4xl': ['calc(2.35rem * var(--font-scale, 1))', { lineHeight: '1.2' }],
      },
      fontFamily: {
        sans: ['var(--app-font-family, "Inter")', 'system-ui', '-apple-system', 'sans-serif'],
        inter: ['"Inter"', 'system-ui', 'sans-serif'],
        noto: ['"Noto Sans"', 'system-ui', 'sans-serif'],
        jakarta: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        merriweather: ['"Merriweather"', 'Georgia', 'serif'],
        playfair: ['"Playfair Display"', 'Georgia', 'serif'],
        lora: ['"Lora"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'keep': '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
        'keep-hover': '0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)',
        'keep-modal': '0 1px 3px 0 rgba(60,64,67,0.3), 0 8px 16px 4px rgba(60,64,67,0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        }
      }
    },
  },
  plugins: [],
}
