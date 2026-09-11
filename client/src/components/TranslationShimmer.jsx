import React from "react";
import { Languages, Loader2 } from "lucide-react";

export default function TranslationShimmer({ label }) {
  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-busy="true"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-5 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-[2rem] border border-blue-200 bg-white p-7 shadow-2xl sm:p-9">
        <div className="mb-6 flex items-center gap-3 text-sm font-black text-blue-950">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Languages size={19} />
            <Loader2 size={14} className="absolute -right-1 -top-1 animate-spin text-blue-700" />
          </span>
          <span>{label}</span>
        </div>
        <div className="animate-pulse space-y-3" aria-hidden="true">
          <div className="h-3 w-11/12 rounded-full bg-blue-200/80" />
          <div className="h-3 w-4/5 rounded-full bg-blue-200/70" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="h-14 rounded-2xl bg-slate-100" />
            <div className="h-14 rounded-2xl bg-slate-100" />
            <div className="h-14 rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
