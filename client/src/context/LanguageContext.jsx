import React, {
  createContext,
  useCallback,
  useMemo,
  useState,
} from "react";
import { translations, DEFAULT_LANG, SUPPORTED_LANGS } from "../i18n";

const STORAGE_KEY = "fqm_lang";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved && SUPPORTED_LANGS.includes(saved) ? saved : DEFAULT_LANG;
    } catch {
      return DEFAULT_LANG;
    }
  });

  const changeLang = useCallback((code) => {
    if (!SUPPORTED_LANGS.includes(code)) return;
    setLang(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* storage unavailable — keep in-memory state only */
    }
  }, []);

  const t = useCallback(
    (key) =>
      translations[lang]?.[key] ?? translations[DEFAULT_LANG]?.[key] ?? key,
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang: changeLang, t }),
    [lang, changeLang, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export default LanguageContext;
