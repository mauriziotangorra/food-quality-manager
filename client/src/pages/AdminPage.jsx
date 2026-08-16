import React, { useEffect, useState } from "react";
import { ArrowLeft, PlusCircle, Edit3, Trash2 } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { useModal } from "../hooks/useModal";
import { api } from "../services/api";

const EMPTY_FORM = { id: null, name: "", status: "active", qualPass: "", techPass: "" };

export default function AdminPage({ onLogout }) {
  const { t } = useLanguage();
  const { showAlert, showConfirm } = useModal();

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);

  const loadSuppliers = () => {
    setLoading(true);
    api
      .getSuppliers()
      .then((data) => setSuppliers(data.suppliers || []))
      .catch(() => showAlert("Errore nel recupero dei fornitori"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!form.name) return showAlert("Il nome del fornitore è obbligatorio");
    try {
      if (form.id) {
        await api.updateSupplier(form.id, {
          name: form.name,
          status: form.status,
          qualPass: form.qualPass || undefined,
          techPass: form.techPass || undefined,
        });
      } else {
        if (!form.qualPass || !form.techPass) {
          return showAlert("Password di qualifica e tecnica sono obbligatorie per un nuovo fornitore");
        }
        await api.createSupplier(form);
      }
      setForm(null);
      loadSuppliers();
    } catch (e) {
      showAlert(e.message || "Errore nel salvataggio del fornitore");
    }
  };

  const handleDelete = (supplier) => {
    showConfirm(`Eliminare il fornitore "${supplier.name}"? Verranno rimossi anche i suoi dati di qualifica.`, async () => {
      try {
        await api.deleteSupplier(supplier.id);
        loadSuppliers();
      } catch (e) {
        showAlert(e.message || "Errore nella cancellazione del fornitore");
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex justify-between items-center">
          <h2 className="text-5xl font-black flex items-center gap-6">
            <button onClick={onLogout} className="p-4 bg-white rounded-3xl shadow hover:bg-slate-100 transition-all">
              <ArrowLeft size={32} />
            </button>
            {t("admin")}
          </h2>
          <button
            onClick={() => setForm(EMPTY_FORM)}
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <PlusCircle size={20} /> Nuovo Fornitore
          </button>
        </div>

        {form && (
          <div className="bg-white p-12 rounded-[4rem] shadow-2xl border-4 border-blue-100">
            <h3 className="text-2xl font-black mb-10 uppercase">{form.id ? "Modifica Profilo" : "Nuovo Profilo Fornitore"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <input
                placeholder="Ragione Sociale"
                className="p-6 bg-slate-50 rounded-3xl font-bold border-none shadow-inner"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                placeholder={t("newQualPassword")}
                className="p-6 bg-emerald-50 rounded-3xl font-mono border-none shadow-inner"
                value={form.qualPass}
                onChange={(e) => setForm({ ...form, qualPass: e.target.value })}
              />
              <input
                placeholder={t("newTechPassword")}
                className="p-6 bg-amber-50 rounded-3xl font-mono border-none shadow-inner"
                value={form.techPass}
                onChange={(e) => setForm({ ...form, techPass: e.target.value })}
              />
            </div>
            <div className="mt-12 flex gap-6">
              <button
                onClick={handleSave}
                className="bg-slate-900 text-white px-12 py-5 rounded-3xl font-black uppercase text-xs shadow-xl hover:bg-blue-600 transition-all"
              >
                Salva Database
              </button>
              <button onClick={() => setForm(null)} className="text-slate-400 font-black uppercase text-xs">
                Annulla
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-[4rem] shadow-sm border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b text-[10px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th className="p-10">Azienda</th>
                <th className="p-10">Stato</th>
                <th className="p-10 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {!loading && suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-10 font-black text-2xl uppercase tracking-tighter leading-none">{s.name}</td>
                  <td className="p-10 font-bold text-slate-500 uppercase text-xs">{s.status}</td>
                  <td className="p-10 text-right space-x-4">
                    <button
                      onClick={() => setForm({ id: s.id, name: s.name, status: s.status, qualPass: "", techPass: "" })}
                      className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"
                    >
                      <Edit3 size={24} />
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all"
                    >
                      <Trash2 size={24} />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && suppliers.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-10 text-center text-slate-400 font-bold">Nessun fornitore</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
