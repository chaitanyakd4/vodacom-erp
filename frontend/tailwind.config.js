/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        vodacom: {
          dark: '#041521',        // Main deep navy background
          darker: '#020d15',      // Even darker for depth/sidebar
          surface: '#0c2235',     // Card backgrounds
          blue: '#3665a8',        // Brand blue (VODA)
          green: '#00cc00',       // Brand green (COM)
          text: '#e2e8f0',        // Main text color (slate-200)
          muted: '#94a3b8',       // Muted text (slate-400)
        },
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(145deg, rgba(12, 34, 53, 0.6) 0%, rgba(4, 21, 33, 0.4) 100%)',
      }
    },
  },
  plugins: [],
};
