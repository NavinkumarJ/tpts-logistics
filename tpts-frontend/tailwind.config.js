/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",  // ← ADDED THIS
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1e40af",
        },
        secondary: {
          500: "#4f46e5",
          600: "#4338ca",
        },
        accent: {
          500: "#06b6d4",
        },
        success: {
          500: "#22c55e",
        },
      },
    },
  },
  plugins: [],
};
