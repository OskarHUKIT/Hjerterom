/**
 * Gradvis Tailwind (valg B): nye komponenter kan bruke utility-klasser.
 * Preflight er av — eksisterende globals.css og design tokens beholdes.
 * Tema: `dark:` matcher `document.documentElement[data-theme="dark"]`.
 */
const {
  default: flattenColorPalette,
} = require('tailwindcss/lib/util/flattenColorPalette')

/** Expose Tailwind palette as CSS variables (e.g. var(--indigo-500)) for aurora layers. */
function addVariablesForColors({ addBase, theme }) {
  const allColors = flattenColorPalette(theme('colors'))
  const newVars = Object.fromEntries(
    Object.entries(allColors).map(([key, val]) => [`--${key}`, val])
  )
  addBase({ ':root': newVars })
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './context/**/*.{js,ts,jsx,tsx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        'boly-bg-app': 'var(--bg-app)',
        'boly-bg-card': 'var(--bg-card)',
        'boly-text-main': 'var(--text-main)',
        'boly-text-body': 'var(--text-body)',
        'boly-text-muted': 'var(--text-muted)',
        'boly-border-subtle': 'var(--border-subtle)',
        'boly-accent': 'var(--color-accent)',
        'boly-teal': 'var(--color-teal)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
      },
      spacing: {
        'boly-1': 'var(--space-1)',
        'boly-2': 'var(--space-2)',
        'boly-3': 'var(--space-3)',
        'boly-4': 'var(--space-4)',
        'boly-6': 'var(--space-6)',
        'boly-8': 'var(--space-8)',
      },
      borderRadius: {
        boly: '10px',
        '4xl': '2rem',
      },
      ringWidth: {
        3: '3px',
      },
      outlineColor: {
        ring: 'var(--ring)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        aurora: {
          from: {
            backgroundPosition: '50% 50%, 50% 50%',
          },
          to: {
            backgroundPosition: '350% 50%, 350% 50%',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        aurora: 'aurora 60s linear infinite',
      },
    },
  },
  plugins: [addVariablesForColors],
}
