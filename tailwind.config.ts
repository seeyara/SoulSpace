import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#9B046F',
        cream: '#FFF9E8',
        'warm-cream': '#FFF5E0',
        'soft-pink': '#FFE6F3',
        'light-purple': '#E6D5F7',
        background: '#FFF9E8',
      },
      fontFamily: {
        sans: ['var(--font-harmonia-sans)'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar-hide')
  ],
}

export default config;
