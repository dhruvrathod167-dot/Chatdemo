/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        chatbg: {
          light: "#FFFFFF",
          dark: "#0E1118", // Dark slate
        },
        sidebarbg: {
          light: "#F3F4F6",
          dark: "#171C26", // Dark navy sidebar
        },
        panelbg: {
          light: "#E5E7EB",
          dark: "#202736",
        },
        accent: {
          DEFAULT: "#6366F1", // Violet indigo
          hover: "#4F46E5",
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      }
    },
  },
  plugins: [],
}
