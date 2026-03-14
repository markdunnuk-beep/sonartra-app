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
        bg: '#0E1117',
        panel: '#161B22',
        border: '#2A2F36',
        accent: '#3B82F6',
        textPrimary: '#E6EDF3',
        textSecondary: '#9CA3AF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 10px 30px rgba(0,0,0,0.28)',
      },
    },
  },
  plugins: [],
}

export default config
