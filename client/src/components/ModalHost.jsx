import React from "react";
import { useModal } from "../hooks/useModal";

// Sostituisce alert()/confirm()/prompt() nativi (bloccati in alcuni contesti embedded)
// con un dialog personalizzato, coerente con lo stile del resto dell'app.
export default function ModalHost() {
  const { modal, setInputValue } = useModal();

  if (!modal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-200 text-slate-900">
        <h3 className="text-xl font-black text-slate-900 mb-6 whitespace-pre-line">{modal.message}</h3>
        {modal.showInput && (
          <input
            type={modal.inputType}
            className="w-full p-4 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-blue-500 outline-none mb-6 font-mono text-center text-xl text-slate-900"
            autoFocus
            value={modal.inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") modal.onConfirm(modal.inputValue);
            }}
          />
        )}
        <div className="flex gap-4 justify-end">
          {(modal.type === "confirm" || modal.type === "prompt") && (
            <button
              onClick={modal.onCancel}
              className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors uppercase text-xs tracking-widest"
            >
              Annulla
            </button>
          )}
          <button
            onClick={() => modal.onConfirm(modal.inputValue)}
            className="px-8 py-3 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg uppercase text-xs tracking-widest"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
