'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthSessionProvider } from '../context/AuthSessionContext'
import { LanguageProvider } from '../context/LanguageContext'
import { ThemeProvider } from '../context/ThemeContext'
import { CookieConsentProvider } from '../context/CookieConsentContext'
import NavigationProgress from './components/NavigationProgress'
import AuthQuerySync from './components/AuthQuerySync'
import NotificationsRealtimeSync from './components/NotificationsRealtimeSync'
import PrefetchAuthUser from './components/PrefetchAuthUser'
import CookieBanner from './components/CookieBanner'
import { ConfirmProvider, ToastProvider } from './components/design-system'

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
            <CookieConsentProvider>
              <ToastProvider>
                <ConfirmProvider>
                  <PrefetchAuthUser />
                  <AuthQuerySync />
                  <NotificationsRealtimeSync />
                  <NavigationProgress />
                  {children}
                  <CookieBanner />
                </ConfirmProvider>
              </ToastProvider>
            </CookieConsentProvider>
          </LanguageProvider>
        </ThemeProvider>
      </AuthSessionProvider>
    </QueryClientProvider>
  )
}
