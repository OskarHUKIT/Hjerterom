import path from 'node:path'
import { fileURLToPath } from 'node:url'
import coreWebVitals from 'eslint-config-next/core-web-vitals'
import eslintConfigPrettier from 'eslint-config-prettier'
import tailwind from 'eslint-plugin-tailwindcss'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'public/**',
      'capacitor.config.ts',
      '*.config.js',
      'build-mobile.js',
    ],
  },
  ...coreWebVitals,
  {
    rules: {
      // eslint-plugin-react-hooks@7 (via Next 16): flagger mange legitime mønstre (synkronisering av lokal UI-state).
      // Skru på igjen når komponentene er refaktorert (eller regelen er justert).
      'react-hooks/set-state-in-effect': 'off',
      // next.config har images.unoptimized; migrering til next/image kan gjøres målrettet.
      '@next/next/no-img-element': 'off',
    },
  },
  ...tailwind.configs['flat/recommended'],
  {
    settings: {
      tailwindcss: {
        callees: ['classnames', 'clsx', 'ctl', 'cn', 'cva'],
        config: path.join(__dirname, 'tailwind.config.js'),
      },
    },
  },
  // Eksisterende UI bruker mange ikke-Tailwind-klasser (f.eks. .button, .container).
  {
    files: ['**/*.{tsx,jsx}'],
    rules: {
      'tailwindcss/no-custom-classname': 'off',
    },
  },
  // Strengere sjekk kun der vi innfører Tailwind gradvis.
  {
    files: ['app/dev/**/*.{tsx,jsx}'],
    rules: {
      'tailwindcss/no-custom-classname': 'warn',
    },
  },
  // Sinking Ship / launch: ingen console.* i prod-kode — bruk app/lib/appLogger.ts.
  {
    files: [
      'app/**/*.{ts,tsx}',
      'context/**/*.{ts,tsx}',
      'middleware.ts',
      'lib/**/*.{ts,tsx}',
    ],
    rules: {
      'no-console': 'error',
    },
  },
  {
    files: ['app/lib/appLogger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  eslintConfigPrettier,
  {
    files: ['app/**/*.{ts,tsx}', 'features/**/*.{ts,tsx}'],
    rules: {
      'no-alert': 'warn',
    },
  },
]

export default eslintConfig
