"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { makeTranslator, type Translator } from "@/i18n/translate";

const I18nContext = createContext<{ locale: Locale; t: Translator }>({
  locale: "en",
  t: makeTranslator("en"),
});

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, t: makeTranslator(locale) }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
