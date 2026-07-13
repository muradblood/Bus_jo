/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', './src/pages/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-gold': '#9A7B1A',
        'brand-gold-light': '#C4A94D',
        'brand-gold-dark': '#7A5F10',
        'sat-blue': '#4A9FD8',
        'sat-blue-light': '#7BBCE8',
        'charcoal': '#2C2C2C',
        'charcoal-light': '#3A3A3A',
        'surface': '#FFFFFF',
        'surface-alt': '#F5F5F5',
        'text-primary': '#2C2C2C',
        'text-secondary': '#6B6B6B',
        'border-light': '#E0E0E0',
        'success': '#28A745',
        'error': '#DC3545',
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      maxWidth: {
        'content': '1200px',
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        'card': '0 4px 24px rgba(44,44,44,0.06)',
        'card-hover': '0 8px 32px rgba(44,44,44,0.10)',
        'dropdown': '0 8px 32px rgba(44,44,44,0.12)',
        'button': '0 4px 16px rgba(154,123,26,0.35)',
        'button-hover': '0 6px 24px rgba(154,123,26,0.5)',
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-scale": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "spin-slow": { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } },
        "spin-reverse": { from: { transform: "rotate(360deg)" }, to: { transform: "rotate(0deg)" } },
        "pulse-dot": {
          "0%, 100%": { opacity: "0.3", transform: "scale(0.8)" },
          "50%": { opacity: "1", transform: "scale(1)" },
        },
        "progress-bar": {
          "0%": { width: "0%" },
          "50%": { width: "70%" },
          "100%": { width: "100%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-scale": "fade-scale 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "spin-slow": "spin-slow 1.8s linear infinite",
        "spin-reverse": "spin-reverse 2.4s linear infinite",
        "pulse-dot": "pulse-dot 1s ease-in-out infinite",
        "progress-bar": "progress-bar 3s cubic-bezier(0.4, 0, 0.2, 1) forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
