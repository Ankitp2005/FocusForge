/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ['"Fredoka"', '"Space Grotesk"', '"Arial Black"', 'sans-serif'],
        body: ['"Lexend"', '"IBM Plex Mono"', '"Courier New"', 'sans-serif'],
        label: ['"Fredoka"', '"Space Grotesk"', 'sans-serif'],
      },
      colors: {
        lmls: {
          black: 'var(--color-black)',
          white: 'var(--color-white)',
          paper: 'var(--color-paper)',
          concrete: 'var(--color-concrete)',
          red: 'var(--color-red)',
          'red-bg': 'var(--color-red-bg)',
          yellow: 'var(--color-yellow)',
          'yellow-bg': 'var(--color-yellow-bg)',
          green: 'var(--color-green)',
          'green-bg': 'var(--color-green-bg)',
          electric: 'var(--color-electric)',
        },
        // shadcn/ui variables mapping for components we don't fully override yet
        border: "var(--color-black)",
        input: "var(--color-black)",
        ring: "var(--color-electric)",
        background: "var(--color-white)",
        foreground: "var(--color-black)",
        primary: {
          DEFAULT: "var(--color-black)",
          foreground: "var(--color-white)",
        },
        secondary: {
          DEFAULT: "var(--color-paper)",
          foreground: "var(--color-black)",
        },
        destructive: {
          DEFAULT: "var(--color-red)",
          foreground: "var(--color-white)",
        },
        muted: {
          DEFAULT: "var(--color-concrete)",
          foreground: "var(--color-black)",
        },
        accent: {
          DEFAULT: "var(--color-yellow)",
          foreground: "var(--color-black)",
        },
        popover: {
          DEFAULT: "var(--color-white)",
          foreground: "var(--color-black)",
        },
        card: {
          DEFAULT: "var(--color-paper)",
          foreground: "var(--color-black)",
        },
      },
      borderRadius: {
        lg: "8px",
        md: "6px",
        sm: "4px",
      },
      boxShadow: {
        'brutal-sm': '3px 3px 0px var(--color-black)',
        'brutal-md': '5px 5px 0px var(--color-black)',
        'brutal-lg': '8px 8px 0px var(--color-black)',
        'brutal-hover': '1px 1px 0px var(--color-black)',
        'brutal-red': '5px 5px 0px var(--color-red)',
        'brutal-electric': '5px 5px 0px var(--color-electric)',
        // Override default shadows
        sm: '3px 3px 0px var(--color-black)',
        DEFAULT: '5px 5px 0px var(--color-black)',
        md: '5px 5px 0px var(--color-black)',
        lg: '8px 8px 0px var(--color-black)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "siren": {
          "0%, 100%": { background: "var(--color-red)", boxShadow: "8px 8px 0px #8B0000" },
          "50%": { background: "#8B0000", boxShadow: "8px 8px 0px var(--color-red)" }
        },
        "countdown-flash": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "siren": "siren 0.8s step-end infinite",
        "countdown-flash": "countdown-flash 1s step-end infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
