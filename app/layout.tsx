import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ClerkProvider } from '@/components/providers/ClerkProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL("https://sonartra.com"),
  title: {
    default: 'Sonartra',
    template: '%s | Sonartra',
  },
  description:
    'Sonartra is a behavioural intelligence platform that maps individual, team, and organisational performance signals.',
  openGraph: {
    title: 'Sonartra',
    description: 'Behavioural intelligence for individuals, teams, and organisations.',
    url: '/',
    siteName: 'Sonartra',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Sonartra Intelligence Platform',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sonartra',
    description: 'Behavioural intelligence for individuals, teams, and organisations.',
  },
  icons: {
    icon: '/logo/sonartra-mark.svg',
    shortcut: '/logo/sonartra-mark.svg',
    apple: '/logo/sonartra-mark.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}><ClerkProvider>{children}</ClerkProvider></body>
    </html>
  )
}
