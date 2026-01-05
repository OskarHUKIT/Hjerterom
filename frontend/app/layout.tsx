import type { Metadata } from 'next'
import './globals.css'
import Header from './components/Header'

export const metadata: Metadata = {
  title: 'Bo.ly - Boligbanken',
  description: 'Bo.ly Housing Bank Application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="no">
      <body>
        <Header />
        {children}
      </body>
    </html>
  )
}






