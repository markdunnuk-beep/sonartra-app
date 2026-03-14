import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './data/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#070B12',
        panel: '#0E141E',
        border: '#253040',
        accent: '#4C9FFF',
        textPrimary: '#E8EDF5',
        textSecondary: '#9DA9BA',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 24px 56px -32px rgba(0,0,0,0.8), 0 0 0 1px rgba(138, 157, 184, 0.08)',
      },
    },
  },
  plugins: [],
}

export default config
