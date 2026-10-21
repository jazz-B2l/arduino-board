'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { translations, type Lang } from '@/lib/i18n'

interface LanguageContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, params?: Record<string, string | number>) => string
  isRTL: boolean
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (k) => k,
  isRTL: false,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  // Load from localStorage on mount + apply to <html>
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bench_lang') as Lang | null
      const resolved: Lang = saved === 'ar' ? 'ar' : saved === 'fr' ? 'fr' : 'en'
      setLangState(resolved)
      applyHtml(resolved)
    }
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    if (typeof window !== 'undefined') {
      localStorage.setItem('bench_lang', l)
    }
    applyHtml(l)
  }

  const t = (key: string, params?: Record<string, string | number>): string => {
    let str = translations[lang]?.[key] ?? translations['en']?.[key] ?? key
    if (params) {
      Object.entries(params).forEach(([paramKey, paramVal]) => {
        str = str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal))
      })
    }
    return str
  }

  const isRTL = lang === 'ar'

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}

function applyHtml(l: Lang) {
  const html = document.documentElement
  if (l === 'ar') {
    html.setAttribute('lang', 'ar')
    html.setAttribute('dir', 'rtl')
  } else if (l === 'fr') {
    html.setAttribute('lang', 'fr')
    html.removeAttribute('dir')
  } else {
    html.setAttribute('lang', 'en')
    html.removeAttribute('dir')
  }
}
