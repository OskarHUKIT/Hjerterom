'use client'

import { LanguageProvider } from '../context/LanguageContext'
import { ThemeProvider } from '../context/ThemeContext'
import NavigationProgress from './components/NavigationProgress'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <NavigationProgress />
        {children}
      </LanguageProvider>
    </ThemeProvider>
  )
}
