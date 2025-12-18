import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Boligbanken - Housing Bank',
  description: 'Boligbanken Housing Bank Application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="no">
      <body>{children}</body>
    </html>
  )
}






