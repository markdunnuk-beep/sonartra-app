import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sonartra | Performance Intelligence Platform',
  description: 'Performance intelligence platform for organisations.',
  icons: {
    icon: '/logo/sonartra-mark.svg',
    shortcut: '/logo/sonartra-mark.svg',
    apple: '/logo/sonartra-mark.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
