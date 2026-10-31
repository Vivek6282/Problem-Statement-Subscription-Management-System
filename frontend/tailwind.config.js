/** @type {import('tailwindcss').Config} */

// Brightloop palette: sage greens, warm neutrals and muted status tones.
// Accent scales (indigo, blue, violet…) resolve to the brand green so older
// utility classes stay on-palette; status scales keep their meaning.
const brand = {
  DEFAULT: '#305D42',
  50: '#EFF4EC',
  100: '#E2EBDC',
  200: '#C9D9BF',
  300: '#A8C09B',
  400: '#7D9E72',
  500: '#55755B',
  600: '#305D42',
  700: '#234630',
  800: '#1C3826',
  900: '#162C1E',
  950: '#0F1F15',
}

const neutral = {
  50: '#F6F8F3',
  100: '#EEF1E8',
  200: '#DFE4DC',
  300: '#CDD5C8',
  400: '#8A9585',
  500: '#6B776D',
  600: '#5F6B62',
  700: '#3B4E3F',
  800: '#2A3B30',
  900: '#1F3327',
  950: '#142019',
}

const positive = {
  50: '#F0F5EE',
  100: '#DFEADB',
  200: '#C3D7BB',
  300: '#9DBD92',
  400: '#74A068',
  500: '#55844B',
  600: '#436C3B',
  700: '#365731',
  800: '#2D462A',
  900: '#263B24',
}

const negative = {
  50: '#FBF1EC',
  100: '#F6E0D6',
  200: '#ECC3B2',
  300: '#DEA08A',
  400: '#CC7A60',
  500: '#B75C42',
  600: '#A14A33',
  700: '#863C2A',
  800: '#6C3123',
  900: '#58291E',
}

const caution = {
  50: '#FBF6E9',
  100: '#F5EAD0',
  200: '#EAD39F',
  300: '#DCB86C',
  400: '#CC9D45',
  500: '#B8852F',
  600: '#9A6C24',
  700: '#7B551E',
  800: '#62441B',
  900: '#503818',
}

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: brand,
        navy: {
          DEFAULT: '#1F3327',
          800: '#293F32',
          900: '#1F3327',
          950: '#18281F',
        },
        background: '#F8F9F5',
        surface: '#FFFFFF',
        text: {
          DEFAULT: '#1F3327',
          muted: '#5F6B62',
        },
        success: '#436C3B',
        warning: '#B8852F',
        danger: '#A14A33',
        slate: neutral,
        gray: neutral,
        indigo: brand,
        blue: brand,
        violet: brand,
        purple: brand,
        sky: brand,
        teal: brand,
        cyan: brand,
        green: positive,
        emerald: positive,
        red: negative,
        rose: negative,
        amber: caution,
        yellow: caution,
        orange: caution,
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
