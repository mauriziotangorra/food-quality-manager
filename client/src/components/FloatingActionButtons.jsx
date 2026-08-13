import React from "react";
import { Image, FileText } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { SUPPORTED_LANGS } from "../i18n";

export default function FloatingActionButtons() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Action buttons row */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          style={{ backgroundColor: "rgb(245 158 11 / 0.95)" }}
          className="flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-extrabold tracking-wide text-white shadow-md transition hover:brightness-105 active:scale-95"
        >
          <Image size={16} strokeWidth={2.5} />
          {t("compressImages")}
        </button>

        <button
          type="button"
          style={{ backgroundColor: "rgb(220 38 38 / 0.95)" }}
          className="flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-extrabold tracking-wide text-white shadow-md transition hover:brightness-105 active:scale-95"
        >
          <FileText size={16} strokeWidth={2.5} />
          {t("compressPdf")}
        </button>
      </div>

      {/* Language switcher */}
      <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-md">
        {SUPPORTED_LANGS.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            className={`rounded-full px-3.5 py-1.5 text-[11px] font-extrabold tracking-wide transition ${
              lang === code
                ? "bg-[#12182b] text-white"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {code}
          </button>
        ))}
      </div>
    </div>
  );
}
