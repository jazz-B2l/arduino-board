import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

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
  title: 'Banc d\'Essai – Monitoring Pro',
  description: 'Outil de surveillance en temps réel pour bancs d\'essai moteur — R&D mécanique et thermique',
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
    <html lang="fr" className={`${ibmPlexSans.variable} ${jetBrainsMono.variable} bg-[#0a0e1a]`}>
      <body className="antialiased font-sans min-h-screen">
        {children}
      </body>
    </html>
  )
}
