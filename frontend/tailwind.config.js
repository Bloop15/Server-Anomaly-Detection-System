/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      "colors": {
          "outline": "#859399",
          "surface-tint": "#4cd6ff",
          "on-secondary-fixed-variant": "#5e4200",
          "background": "#0f131d",
          "on-secondary-container": "#6b4b00",
          "on-error": "#690005",
          "secondary": "#ffdb9d",
          "primary-fixed": "#b7eaff",
          "error": "#ffb4ab",
          "on-primary-container": "#00566a",
          "on-secondary-fixed": "#271900",
          "outline-variant": "#3c494e",
          "on-background": "#dfe2f1",
          "surface": "#0f131d",
          "on-tertiary-fixed-variant": "#930014",
          "on-tertiary-fixed": "#410004",
          "tertiary-fixed-dim": "#ffb3ae",
          "error-container": "#93000a",
          "on-primary-fixed": "#001f28",
          "on-tertiary-container": "#a10017",
          "surface-container-low": "#171b26",
          "on-secondary": "#412d00",
          "inverse-on-surface": "#2c303b",
          "surface-container": "#1c1f2a",
          "on-surface-variant": "#bbc9cf",
          "on-tertiary": "#68000b",
          "inverse-surface": "#dfe2f1",
          "inverse-primary": "#00677f",
          "secondary-fixed-dim": "#ffba20",
          "surface-container-high": "#262a35",
          "surface-container-highest": "#313540",
          "tertiary": "#ffd1ce",
          "secondary-fixed": "#ffdea8",
          "secondary-container": "#feb700",
          "tertiary-fixed": "#ffdad7",
          "on-surface": "#dfe2f1",
          "surface-container-lowest": "#0a0e18",
          "surface-bright": "#353944",
          "tertiary-container": "#ffaaa4",
          "on-primary-fixed-variant": "#004e60",
          "primary": "#a4e6ff",
          "surface-variant": "#313540",
          "primary-fixed-dim": "#4cd6ff",
          "on-primary": "#003543",
          "on-error-container": "#ffdad6",
          "surface-dim": "#0f131d",
          "primary-container": "#00d1ff"
      },
      "borderRadius": {
          "DEFAULT": "0.125rem",
          "lg": "0.25rem",
          "xl": "0.5rem",
          "full": "0.75rem"
      },
      "fontFamily": {
          "headline": ["Inter"],
          "body": ["Inter"],
          "label": ["Space Grotesk"]
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
}
