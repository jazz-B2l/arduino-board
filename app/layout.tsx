import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans, JetBrains_Mono, Noto_Kufi_Arabic } from 'next/font/google'
import './globals.css'
import { BenchProvider } from '@/components/bench/BenchContext'
import { AuthProvider } from '@/components/auth/AuthContext'
import { ThemeProvider } from '@/components/bench/ThemeContext'
import { LanguageProvider } from '@/components/bench/LanguageContext'

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

const notoKufiArabic = Noto_Kufi_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
})

export const metadata: Metadata = {
  title: 'Test Bench – Pro Monitoring',
  description: 'Real-time monitoring tool for engine test benches — Mechanical and thermal R&D',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: '#0a0e1a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${jetBrainsMono.variable} ${notoKufiArabic.variable} bg-bench-bg`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('bench_theme') === 'light') {
                  document.documentElement.classList.add('light');
                } else {
                  document.documentElement.classList.remove('light');
                }
              } catch (_) {}
            `
          }}
        />
      </head>
      <body className="antialiased font-sans min-h-screen text-bench-text">
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              <BenchProvider>
                {children}
              </BenchProvider>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
