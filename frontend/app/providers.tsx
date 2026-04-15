'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthSessionProvider } from '../context/AuthSessionContext'
import { LanguageProvider } from '../context/LanguageContext'
import { ThemeProvider } from '../context/ThemeContext'
import NavigationProgress from './components/NavigationProgress'
import AuthQuerySync from './components/AuthQuerySync'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AuthQuerySync />
            <NavigationProgress />
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </AuthSessionProvider>
    </QueryClientProvider>
  )
}
