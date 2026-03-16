/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: { 50: "#f3f0ff", 100: "#e9e3ff", 200: "#d4c8ff", 300: "#b49dff", 400: "#9171f8", 500: "#7c4dff", 600: "#6d28d9", 700: "#5b21b6", 800: "#4c1d95", 900: "#3b0764" },
        accent: { DEFAULT: "#f97316", light: "#fed7aa" },
        income: { DEFAULT: "#10b981", light: "#d1fae5", dark: "#065f46" },
        expense: { DEFAULT: "#ef4444", light: "#fee2e2", dark: "#991b1b" },
      },
      fontFamily: {
        display: ['"DM Sans"', 'system-ui', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
