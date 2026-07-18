/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./frontend/app/**/*.{js,ts,jsx,tsx}",
    "./frontend/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#020b17",
        panel: "#ffffff",
        text: "#f8fafc",
        subtext: "#94a3b8",
        accent: "#22d3ee",
        accentStrong: "#38bdf8",
        brandBlue: "#26c4ff",
      },
      boxShadow: {
        soft: "0 24px 80px rgba(15, 23, 42, 0.16)",
      },
      fontSize: {
        hero: ["clamp(3.5rem, 5vw, 4.5rem)", { lineHeight: "0.95" }],
      },
    },
  },
  plugins: [],
};
