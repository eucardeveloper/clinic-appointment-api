'use client'
import React, { createContext, useContext, useState } from 'react'
import { translations, type Language } from './i18n'

interface I18nContextValue {
  lang: Language
  setLang: (l: Language) => void
  t: typeof translations.en
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => {},
  t: translations.en,
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('en')
  return (
    <I18nContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
