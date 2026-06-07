/**
 * Gradvis Tailwind (valg B): nye komponenter kan bruke utility-klasser.
 * Preflight er av — eksisterende globals.css og design tokens beholdes.
 * Tema: `dark:` matcher `document.documentElement[data-theme="dark"]`.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './context/**/*.{js,ts,jsx,tsx}',
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
      },
    },
  },
  plugins: [],
}
