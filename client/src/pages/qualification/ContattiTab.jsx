import React from "react";
import { Users, Save } from "lucide-react";
import { useModal } from "../../hooks/useModal";

const DEPT_LABEL_KEYS = {
  sales: "deptSales",
  marketing: "deptMarketing",
  qualita: "deptQualita",
  amministrazione: "deptAmministrazione",
  customer: "deptCustomer",
  logistica: "deptLogistica",
};

export default function ContattiTab({ t, qualData, setQualData, saveImmediate }) {
  const { showAlert } = useModal();

  const update = (dept, field, value) => {
    setQualData((prev) => ({
      ...prev,
      contatti: { ...prev.contatti, [dept]: { ...prev.contatti[dept], [field]: value } },
    }));
  };

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Users size={48} className="text-slate-900" />
          <h3 className="text-5xl font-black uppercase tracking-tighter text-slate-900">{t("tabContatti")}</h3>
        </div>
        <button
          onClick={async () => {
            const ok = await saveImmediate(qualData);
            if (ok) showAlert(t("alertSaved"));
          }}
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Save size={16} /> {t("save")}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-slate-900">
        {Object.entries(qualData.contatti).map(([dept, data]) => (
          <div key={dept} className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 shadow-inner">
            <h4 className="text-xl font-black uppercase mb-6 text-slate-700">{t(DEPT_LABEL_KEYS[dept] || dept)}</h4>
            <div className="space-y-4">
              <input
                placeholder={t("name")}
                className="w-full p-4 rounded-xl border-none shadow-sm font-bold text-sm"
                value={data.nome || ""}
                onChange={(e) => update(dept, "nome", e.target.value)}
              />
              <input
                placeholder={t("email")}
                className="w-full p-4 rounded-xl border-none shadow-sm font-bold text-sm"
                value={data.email || ""}
                onChange={(e) => update(dept, "email", e.target.value)}
              />
              <input
                placeholder={t("tel")}
                className="w-full p-4 rounded-xl border-none shadow-sm font-bold text-sm"
                value={data.tel || ""}
                onChange={(e) => update(dept, "tel", e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
