import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { BenchProvider } from '@/components/bench/BenchContext'
import { AuthProvider } from '@/components/auth/AuthContext'

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Test Bench – Pro Monitoring',
  description: 'Real-time monitoring tool for engine test benches — Mechanical and thermal R&D',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a0e1a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${jetBrainsMono.variable} bg-[#0a0e1a]`}>
      <body className="antialiased font-sans min-h-screen">
        <AuthProvider>
          <BenchProvider>
            {children}
          </BenchProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
