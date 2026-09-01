import React, { useState } from "react";
import { Sparkles, X, Check } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";

const LOGISTICS_FIELDS = [
  { group: "uvc", key: "ean", label: "EAN UVC" },
  { group: "uvc", key: "pesoNetto", label: "Peso Netto UVC" },
  { group: "uvc", key: "pesoSgocc", label: "Peso Sgocciolato UVC" },
  { group: "uvc", key: "tara", label: "Tara UVC" },
  { group: "uvc", key: "pesoLordo", label: "Peso Lordo UVC" },
  { group: "uvc", key: "l", label: "Lunghezza UVC" },
  { group: "uvc", key: "p", label: "Profondità UVC" },
  { group: "uvc", key: "h", label: "Altezza UVC" },
  { group: "box", key: "itf", label: "ITF Cartone" },
  { group: "box", key: "pz", label: "Pezzi per Cartone" },
  { group: "box", key: "tara", label: "Tara Cartone" },
  { group: "box", key: "pesoLordo", label: "Peso Lordo Cartone" },
  { group: "box", key: "l", label: "Lunghezza Cartone" },
  { group: "box", key: "p", label: "Profondità Cartone" },
  { group: "box", key: "h", label: "Altezza Cartone" },
  { group: "pallet", key: "tipo", label: "Tipo Pallet" },
  { group: "pallet", key: "cLayer", label: "Cartoni per Strato" },
  { group: "pallet", key: "layers", label: "Numero Strati" },
  { group: "pallet", key: "totC", label: "Totale Cartoni" },
  { group: "pallet", key: "alt", label: "Altezza Totale Pallet" },
  { group: "pallet", key: "pesoTot", label: "Peso Totale Pallet" },
];

const NUTRITION_FIELDS = [
  { key: "energyKj", label: "Energia (kJ)" },
  { key: "energyKcal", label: "Energia (kcal)" },
  { key: "fat", label: "Grassi" },
  { key: "satFat", label: "di cui Saturi" },
  { key: "carbs", label: "Carboidrati" },
  { key: "sugar", label: "di cui Zuccheri" },
  { key: "fiber", label: "Fibre" },
  { key: "protein", label: "Proteine" },
  { key: "salt", label: "Sale" },
];

const DOC_TITLE_KEYS = {
  logistica: "aiDocTitleLogistica",
  microbiologici: "aiDocTitleMicrobiologici",
  chimici: "aiDocTitleChimici",
  etichetta: "aiDocTitleEtichetta",
  tecnica: "aiDocTitleTecnica",
};

const TECNICA_FIELDS = [
  { key: "legalName", label: "Denominazione Legale" },
  { key: "brand", label: "Brand" },
  { key: "claim", label: "Claim" },
  { key: "ingredients", label: "Ingredienti", multiline: true },
  { key: "allergensNote", label: "Allergeni", multiline: true },
  { key: "tmc", label: "TMC / Shelf Life" },
  { key: "producedIn", label: "Prodotto in" },
  { key: "batchDecode", label: "Decodifica Lotto", multiline: true },
  { key: "intendedUse", label: "Modalità d'uso e consumo" },
  { key: "storage", label: "Condizioni conservazione" },
  { key: "envLabel", label: "Etichetta ambientale", multiline: true },
  { key: "packMode", label: "Modalità di confezionamento" },
];

const TECNICA_ORGANOLEPTIC_FIELDS = [
  { key: "consistency", label: "Consistenza" },
  { key: "aroma", label: "Aroma" },
  { key: "look", label: "Apparenza/Colore" },
  { key: "taste", label: "Sapore" },
];

function Field({ label, value, onChange, included, onToggle, multiline }) {
  const InputTag = multiline ? "textarea" : "input";
  return (
    <div className={`flex items-start gap-3 p-2 rounded-xl transition-colors ${included ? "bg-white" : "bg-slate-100 opacity-50"}`}>
      <input type="checkbox" className="w-4 h-4 shrink-0 accent-blue-600 mt-1" checked={included} onChange={onToggle} />
      <div className="flex-1 min-w-0">
        <label className="text-[9px] font-black uppercase text-slate-400 block">{label}</label>
        <InputTag
          disabled={!included}
          className={`w-full bg-transparent text-xs font-bold text-slate-800 outline-none disabled:text-slate-400 resize-none ${multiline ? "h-14" : ""}`}
          value={value || ""}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

export default function AiSuggestionsModal({ docType, data, globalConfig, onApply, onClose }) {
  const { t } = useLanguage();
  // Copia locale editabile + flag "included" per ogni campo/riga: la revisione
  // umana è obbligatoria prima che qualunque valore venga scritto nella scheda
  // (l'AI qui propone soltanto, non salva mai da sola).
  const [logistics, setLogistics] = useState(() => {
    const included = {};
    LOGISTICS_FIELDS.forEach(({ group, key }) => {
      included[`${group}.${key}`] = Boolean(data?.[group]?.[key]);
    });
    return { values: data || {}, included };
  });

  const [rows, setRows] = useState(() => (data?.rows || []).map((r) => ({ ...r, included: true })));

  const [ingredients, setIngredients] = useState({ value: data?.ingredients || "", included: Boolean(data?.ingredients) });
  const [nutrition, setNutrition] = useState(() => {
    const included = {};
    NUTRITION_FIELDS.forEach(({ key }) => { included[key] = Boolean(data?.nutrition?.[key]); });
    return { values: data?.nutrition || {}, included };
  });
  const [allergens, setAllergens] = useState(() => (data?.allergens || []).map((a) => ({ ...a, included: true })));

  const [tecnicaFields, setTecnicaFields] = useState(() => {
    const included = {};
    TECNICA_FIELDS.forEach(({ key }) => { included[key] = Boolean(data?.[key]); });
    return { values: data || {}, included };
  });
  const [tecnicaOrganoleptic, setTecnicaOrganoleptic] = useState(() => {
    const included = {};
    TECNICA_ORGANOLEPTIC_FIELDS.forEach(({ key }) => { included[key] = Boolean(data?.organoleptic?.[key]); });
    return { values: data?.organoleptic || {}, included };
  });
  const [tecnicaNutrition, setTecnicaNutrition] = useState(() => {
    const included = {};
    NUTRITION_FIELDS.forEach(({ key }) => { included[key] = Boolean(data?.nutrition?.[key]); });
    return { values: data?.nutrition || {}, included };
  });
  const [tecnicaGmo, setTecnicaGmo] = useState({
    containsGmo: data?.gmo?.containsGmo || "",
    statement: data?.gmo?.statement || "",
    includedContains: Boolean(data?.gmo?.containsGmo),
    includedStatement: Boolean(data?.gmo?.statement),
  });

  const allergenLabel = (id) => {
    const found = (globalConfig?.allergeni || []).find((a) => String(a.id) === String(id));
    return found?.it || found?.en || `Allergene #${id}`;
  };

  const handleApply = () => {
    if (docType === "logistica") {
      const selected = { uvc: {}, box: {}, pallet: {} };
      LOGISTICS_FIELDS.forEach(({ group, key }) => {
        if (logistics.included[`${group}.${key}`]) {
          selected[group][key] = logistics.values?.[group]?.[key] || "";
        }
      });
      onApply(selected);
    } else if (docType === "microbiologici" || docType === "chimici") {
      onApply({ rows: rows.filter((r) => r.included).map(({ included: _i, ...r }) => r) });
    } else if (docType === "etichetta") {
      const selectedNutrition = {};
      NUTRITION_FIELDS.forEach(({ key }) => { if (nutrition.included[key]) selectedNutrition[key] = nutrition.values[key] || ""; });
      onApply({
        ingredients: ingredients.included ? ingredients.value : "",
        nutrition: selectedNutrition,
        allergens: allergens.filter((a) => a.included).map(({ included: _i, ...a }) => a),
      });
    } else if (docType === "tecnica") {
      const selected = {};
      TECNICA_FIELDS.forEach(({ key }) => {
        if (tecnicaFields.included[key]) selected[key] = tecnicaFields.values[key] || "";
      });
      const selectedNutrition = {};
      NUTRITION_FIELDS.forEach(({ key }) => { if (tecnicaNutrition.included[key]) selectedNutrition[key] = tecnicaNutrition.values[key] || ""; });
      const selectedOrganoleptic = {};
      TECNICA_ORGANOLEPTIC_FIELDS.forEach(({ key }) => { if (tecnicaOrganoleptic.included[key]) selectedOrganoleptic[key] = tecnicaOrganoleptic.values[key] || ""; });
      onApply({
        ...selected,
        nutrition: selectedNutrition,
        organoleptic: selectedOrganoleptic,
        gmo: {
          containsGmo: tecnicaGmo.includedContains ? tecnicaGmo.containsGmo : "",
          statement: tecnicaGmo.includedStatement ? tecnicaGmo.statement : "",
        },
      });
    }
  };

  const tecnicaHasData =
    Object.values(tecnicaFields.included).some(Boolean) ||
    Object.values(tecnicaNutrition.included).some(Boolean) ||
    Object.values(tecnicaOrganoleptic.included).some(Boolean) ||
    tecnicaGmo.includedContains || tecnicaGmo.includedStatement;

  const hasAnyData =
    docType === "logistica"
      ? Object.values(logistics.included).some(Boolean)
      : docType === "microbiologici" || docType === "chimici"
      ? rows.length > 0
      : docType === "tecnica"
      ? tecnicaHasData
      : ingredients.included || Object.values(nutrition.included).some(Boolean) || allergens.length > 0;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] p-8 max-w-4xl w-full shadow-2xl animate-in zoom-in duration-200 flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center mb-2 border-b border-slate-200 pb-4 shrink-0">
          <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Sparkles className="text-blue-600" /> {t("aiSuggestionsTitle")} — {t(DOC_TITLE_KEYS[docType]) || docType}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <p className="text-xs font-bold text-slate-500 mb-4 shrink-0">
          {t("aiSuggestionsDesc")}
        </p>

        <div className="overflow-y-auto pr-2 flex-1 space-y-6">
          {!hasAnyData && (
            <p className="text-sm font-bold text-slate-400 text-center py-10">
              {t("aiNoDataFound")}
            </p>
          )}

          {docType === "logistica" && hasAnyData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {["uvc", "box", "pallet"].map((group) => (
                <div key={group} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 mb-2">
                    {group === "uvc" ? t("logUvc") : group === "box" ? t("logCarton") : t("logPallet")}
                  </h4>
                  {LOGISTICS_FIELDS.filter((f) => f.group === group).map((f) => (
                    <Field
                      key={f.key}
                      label={f.label}
                      value={logistics.values?.[group]?.[f.key]}
                      included={logistics.included[`${group}.${f.key}`]}
                      onToggle={() =>
                        setLogistics((prev) => ({ ...prev, included: { ...prev.included, [`${group}.${f.key}`]: !prev.included[`${group}.${f.key}`] } }))
                      }
                      onChange={(e) =>
                        setLogistics((prev) => ({
                          ...prev,
                          values: { ...prev.values, [group]: { ...(prev.values[group] || {}), [f.key]: e.target.value } },
                        }))
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {(docType === "microbiologici" || docType === "chimici") && rows.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[9px] font-black text-slate-400 px-2 uppercase">
                <span className="col-span-1" />
                <span className="col-span-4">{t("logParam")}</span>
                <span className="col-span-2">{t("aiColLimit")}</span>
                <span className="col-span-2">{t("aiColResult")}</span>
                <span className="col-span-3">{t("aiColCompliant")}</span>
              </div>
              {rows.map((r, idx) => (
                <div key={idx} className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl ${r.included ? "bg-white border border-slate-100" : "bg-slate-100 opacity-50"}`}>
                  <input
                    type="checkbox"
                    className="col-span-1 w-4 h-4 accent-blue-600"
                    checked={r.included}
                    onChange={() => setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, included: !row.included } : row)))}
                  />
                  {["p", "limite", "risultato", "conforme"].map((field) => (
                    <input
                      key={field}
                      disabled={!r.included}
                      className={`p-2 bg-slate-50 rounded-lg text-[10px] font-bold outline-none disabled:text-slate-400 ${field === "p" ? "col-span-4" : field === "conforme" ? "col-span-3" : "col-span-2"}`}
                      value={r[field] || ""}
                      onChange={(e) => setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: e.target.value } : row)))}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {docType === "etichetta" && (
            <div className="space-y-6">
              {ingredients.value && (
                <div className={`p-4 rounded-2xl border ${ingredients.included ? "bg-white border-slate-200" : "bg-slate-100 opacity-50 border-slate-100"}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={ingredients.included} onChange={() => setIngredients((p) => ({ ...p, included: !p.included }))} />
                    <label className="text-[10px] font-black uppercase text-slate-500">{t("aiIngredientsList")}</label>
                  </div>
                  <textarea
                    disabled={!ingredients.included}
                    className="w-full p-2 bg-slate-50 rounded-lg text-xs font-bold outline-none h-24 disabled:text-slate-400"
                    value={ingredients.value}
                    onChange={(e) => setIngredients((p) => ({ ...p, value: e.target.value }))}
                  />
                </div>
              )}

              {Object.values(nutrition.included).some(Boolean) && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 mb-2">{t("aiNutritionTableTitle")}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {NUTRITION_FIELDS.filter((f) => nutrition.values?.[f.key]).map((f) => (
                      <Field
                        key={f.key}
                        label={f.label}
                        value={nutrition.values?.[f.key]}
                        included={nutrition.included[f.key]}
                        onToggle={() => setNutrition((prev) => ({ ...prev, included: { ...prev.included, [f.key]: !prev.included[f.key] } }))}
                        onChange={(e) => setNutrition((prev) => ({ ...prev, values: { ...prev.values, [f.key]: e.target.value } }))}
                      />
                    ))}
                  </div>
                </div>
              )}

              {allergens.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 mb-2">{t("aiAllergensDetected")}</h4>
                  {allergens.map((a, idx) => (
                    <div key={a.id} className={`flex items-center gap-3 p-2 rounded-xl ${a.included ? "bg-white" : "bg-slate-100 opacity-50"}`}>
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-blue-600"
                        checked={a.included}
                        onChange={() => setAllergens((prev) => prev.map((al, i) => (i === idx ? { ...al, included: !al.included } : al)))}
                      />
                      <span className="text-xs font-black uppercase text-slate-700 flex-1">{allergenLabel(a.id)}</span>
                      <select
                        disabled={!a.included}
                        className="p-2 bg-slate-50 rounded-lg text-[10px] font-bold outline-none disabled:text-slate-400"
                        value={a.presenza || ""}
                        onChange={(e) => setAllergens((prev) => prev.map((al, i) => (i === idx ? { ...al, presenza: e.target.value } : al)))}
                      >
                        <option value="Sì (Ingrediente)">Sì (Ingrediente)</option>
                        <option value="Sì (Derivato/Additivo)">Sì (Derivato/Additivo)</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {docType === "tecnica" && (
            <div className="space-y-6">
              {Object.values(tecnicaFields.included).some(Boolean) && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 mb-2">{t("aiCommercialData")}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {TECNICA_FIELDS.filter((f) => tecnicaFields.values?.[f.key]).map((f) => (
                      <Field
                        key={f.key}
                        label={t(f.key)}
                        multiline={f.multiline}
                        value={tecnicaFields.values?.[f.key]}
                        included={tecnicaFields.included[f.key]}
                        onToggle={() => setTecnicaFields((prev) => ({ ...prev, included: { ...prev.included, [f.key]: !prev.included[f.key] } }))}
                        onChange={(e) => setTecnicaFields((prev) => ({ ...prev, values: { ...prev.values, [f.key]: e.target.value } }))}
                      />
                    ))}
                  </div>
                </div>
              )}

              {Object.values(tecnicaNutrition.included).some(Boolean) && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 mb-2">{t("aiNutritionTableTitle")}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {NUTRITION_FIELDS.filter((f) => tecnicaNutrition.values?.[f.key]).map((f) => (
                      <Field
                        key={f.key}
                        label={f.label}
                        value={tecnicaNutrition.values?.[f.key]}
                        included={tecnicaNutrition.included[f.key]}
                        onToggle={() => setTecnicaNutrition((prev) => ({ ...prev, included: { ...prev.included, [f.key]: !prev.included[f.key] } }))}
                        onChange={(e) => setTecnicaNutrition((prev) => ({ ...prev, values: { ...prev.values, [f.key]: e.target.value } }))}
                      />
                    ))}
                  </div>
                </div>
              )}

              {Object.values(tecnicaOrganoleptic.included).some(Boolean) && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 mb-2">{t("aiOrganolepticChars")}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {TECNICA_ORGANOLEPTIC_FIELDS.filter((f) => tecnicaOrganoleptic.values?.[f.key]).map((f) => (
                      <Field
                        key={f.key}
                        label={t(f.key)}
                        value={tecnicaOrganoleptic.values?.[f.key]}
                        included={tecnicaOrganoleptic.included[f.key]}
                        onToggle={() => setTecnicaOrganoleptic((prev) => ({ ...prev, included: { ...prev.included, [f.key]: !prev.included[f.key] } }))}
                        onChange={(e) => setTecnicaOrganoleptic((prev) => ({ ...prev, values: { ...prev.values, [f.key]: e.target.value } }))}
                      />
                    ))}
                  </div>
                </div>
              )}

              {(tecnicaGmo.includedContains || tecnicaGmo.includedStatement) && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 mb-2">{t("aiGmoDeclaration")}</h4>
                  {tecnicaGmo.includedContains && (
                    <div className="flex items-center gap-3 p-2 bg-white rounded-xl">
                      <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={tecnicaGmo.includedContains} onChange={() => setTecnicaGmo((p) => ({ ...p, includedContains: !p.includedContains }))} />
                      <label className="text-[9px] font-black uppercase text-slate-400 flex-1">{t("containsGmo")}</label>
                      <select
                        className="p-2 bg-slate-50 rounded-lg text-[10px] font-bold outline-none"
                        value={tecnicaGmo.containsGmo}
                        onChange={(e) => setTecnicaGmo((p) => ({ ...p, containsGmo: e.target.value }))}
                      >
                        <option value="Sì">Sì</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  )}
                  {tecnicaGmo.includedStatement && (
                    <div className="flex items-start gap-3 p-2 bg-white rounded-xl">
                      <input type="checkbox" className="w-4 h-4 accent-blue-600 mt-1" checked={tecnicaGmo.includedStatement} onChange={() => setTecnicaGmo((p) => ({ ...p, includedStatement: !p.includedStatement }))} />
                      <div className="flex-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 block">{t("aiDeclarationText")}</label>
                        <textarea
                          className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none resize-none h-14"
                          value={tecnicaGmo.statement}
                          onChange={(e) => setTecnicaGmo((p) => ({ ...p, statement: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-slate-200 shrink-0">
          <button onClick={onClose} className="px-6 py-3 rounded-xl text-xs font-black uppercase text-slate-500 hover:bg-slate-100 transition-colors">
            {t("aiIgnore")}
          </button>
          <button
            onClick={handleApply}
            disabled={!hasAnyData}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check size={16} /> {t("aiApplyToSpec")}
          </button>
        </div>
      </div>
    </div>
  );
}
