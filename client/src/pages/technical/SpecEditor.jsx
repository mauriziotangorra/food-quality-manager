import React from "react";
import {
  ChevronDown, ChevronUp, Trash2, Save, Edit3, FileClock, History, Download, Printer,
  FileUp, Truck, Microscope, FlaskRound, Image as ImageIcon, ShoppingBag, Scale, Apple,
  UtensilsCrossed, AlertCircle, Dna, Package, Check, Info, FileText,
} from "lucide-react";

export default function SpecEditor({
  spec, isExpanded, onToggleExpand, t, lang, globalConfig, isTestUser,
  onUpdateField, onUpdateTable, onAddTableRow, onDelete, onSave, onToggleEdit, onRevise,
  onShowHistory, onExportAll, onExportPdf, onFilesUpload, onRemoveFile, onBrandLogoUpload,
}) {
  const disabled = spec.isSaved;
  const langKey = lang.toLowerCase();

  return (
    <div className={`bg-white rounded-[3rem] shadow-xl overflow-hidden border-2 transition-all ${spec.isObsolete ? "border-red-500 opacity-60" : spec.isSaved ? "border-emerald-500" : "border-slate-200"}`}>
      <div className="p-8 bg-slate-50 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors text-slate-900" onClick={onToggleExpand}>
        <div className="flex items-center gap-6">
          <div className={`p-4 rounded-2xl shadow-inner ${spec.isObsolete ? "bg-red-100 text-red-600" : spec.isSaved ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
            <ShoppingBag size={28} />
          </div>
          <div>
            <div className="flex items-center gap-4">
              <h4 className="text-2xl font-black uppercase text-slate-900">{spec.master?.nome || t("newSpec")}</h4>
              {spec.isObsolete && <span className="bg-red-500 text-white px-2 py-1 rounded text-[8px] font-black uppercase">{t("statusArchived")}</span>}
              {spec.isSaved && !spec.isObsolete && <span className="bg-emerald-500 text-white px-2 py-1 rounded text-[8px] font-black uppercase">{t("statusRead")}</span>}
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">
              {t("prodCode")}: {spec.master?.codice || "---"} | EAN: {spec.header?.ean || "---"} | {t("rev")}: {spec.header?.revision || 0}
              {spec.saveDate ? ` | Data: ${spec.saveDate}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-slate-400">
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 hover:text-red-600 transition-colors">
            <Trash2 size={24} />
          </button>
          {isExpanded ? <ChevronUp size={32} /> : <ChevronDown size={32} />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-10 space-y-12 text-slate-900">
          <div className="flex flex-wrap justify-between items-center gap-4 bg-slate-900 p-4 rounded-2xl shadow-lg mb-8">
            <div className="flex flex-wrap gap-4">
              {!spec.isSaved && (
                <button onClick={onSave} className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-600 transition-colors shadow-sm">
                  <Save size={16} /> {t("saveSpec")}
                </button>
              )}
              {spec.isSaved && !spec.isObsolete && (
                <>
                  <button onClick={onToggleEdit} className="flex items-center gap-2 bg-amber-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-amber-600 transition-colors shadow-sm">
                    <Edit3 size={16} /> {t("editSpec")}
                  </button>
                  <button onClick={onRevise} className="flex items-center gap-2 bg-blue-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition-colors shadow-sm">
                    <FileClock size={16} /> {t("reviseSpec")} (Rev. {parseInt(spec.header?.revision || 0, 10) + 1})
                  </button>
                  <button onClick={onShowHistory} className="flex items-center gap-2 bg-slate-700 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-slate-600 transition-colors shadow-sm">
                    <History size={16} /> {t("historyBtn")}
                  </button>
                </>
              )}
            </div>
            <div className="text-white text-xs font-black uppercase opacity-50 tracking-widest px-4 flex items-center gap-3">
              <span>EAN: {spec.header?.ean || "---"}</span>
              <span>|</span>
              <span>Stato: {spec.isObsolete ? t("statusArchived") : spec.isSaved ? t("statusRead") : t("statusEdit")}</span>
            </div>
          </div>

          <div className={`grid grid-cols-2 md:grid-cols-5 gap-4 text-white p-6 rounded-t-3xl shadow-inner ${spec.isObsolete ? "bg-red-900" : "bg-slate-800"}`}>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase opacity-60">{t("prodCode")}</label>
              <input disabled={disabled} className="w-full bg-slate-700 p-2 rounded-lg text-xs font-bold border-none text-white shadow-inner disabled:opacity-50" value={spec.master?.codice || ""} onChange={(e) => onUpdateField("master.codice", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase opacity-60">{t("prodName")}</label>
              <input disabled={disabled} className="w-full bg-slate-700 p-2 rounded-lg text-xs font-bold border-none text-white shadow-inner disabled:opacity-50" value={spec.master?.nome || ""} onChange={(e) => onUpdateField("master.nome", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase opacity-60">{t("uvcWeight")}</label>
              <input disabled={disabled} className="w-full bg-slate-700 p-2 rounded-lg text-xs font-bold border-none text-white shadow-inner disabled:opacity-50" value={spec.header?.uvcWeight || ""} onChange={(e) => onUpdateField("header.uvcWeight", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase opacity-60">{t("eanCode")}</label>
              <input disabled={disabled} className="w-full bg-slate-700 p-2 rounded-lg text-xs font-bold border-none text-white shadow-inner disabled:opacity-50" value={spec.header?.ean || ""} onChange={(e) => onUpdateField("header.ean", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase opacity-60 text-amber-300">{t("rev")}</label>
              <input disabled className="w-full bg-slate-900 p-2 rounded-lg text-xs font-black border-none text-amber-300 shadow-inner text-center" value={spec.header?.revision || "0"} readOnly />
            </div>
          </div>

          <div className="bg-slate-100 p-6 -mt-10 rounded-b-3xl border border-t-0 border-slate-200">
            <div className="flex flex-wrap gap-4 items-center mb-6 pb-6 border-b border-slate-300">
              <button onClick={onExportAll} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-sm">
                <Download size={16} /> {t("exportAll")}
              </button>
              <button onClick={onExportPdf} className="flex items-center gap-2 bg-red-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-red-700 transition-colors shadow-sm">
                <Printer size={16} /> {t("exportPdf")}
              </button>
            </div>

            <div className="flex flex-wrap gap-4 items-center mb-2">
              <ImportButton disabled={disabled} done={spec.importFlags?.tecnica} color="bg-blue-600 hover:bg-blue-700" icon={FileUp} label={t("importTech")} title={t("titleImportTech")} accept=".pdf,.doc,.docx" onChange={(e) => onFilesUpload("attachedSheets", e, "tecnica")} />
              <ImportButton disabled={disabled} done={spec.importFlags?.logistica} color="bg-indigo-600 hover:bg-indigo-700" icon={Truck} label={t("importLog")} title={t("titleImportLog")} accept=".pdf,.xls,.xlsx" onChange={(e) => onFilesUpload("attachedSheets", e, "logistica")} />
              <ImportButton disabled={disabled} done={spec.importFlags?.microbiologici} color="bg-teal-600 hover:bg-teal-700" icon={Microscope} label={t("importMicro")} title={t("titleImportMicro")} accept=".pdf,.xls,.xlsx" onChange={(e) => onFilesUpload("attachedSheets", e, "microbiologici")} />
              <ImportButton disabled={disabled} done={spec.importFlags?.chimici} color="bg-cyan-600 hover:bg-cyan-700" icon={FlaskRound} label={t("importChem")} title={t("titleImportChem")} accept=".pdf,.xls,.xlsx" onChange={(e) => onFilesUpload("attachedSheets", e, "chimici")} />
              <ImportButton disabled={disabled} done={spec.importFlags?.etichetta} color="bg-purple-600 hover:bg-purple-700" icon={ImageIcon} label={t("importLabel")} title={t("titleImportLabel")} accept=".pdf,.jpg,.png,.jpeg" onChange={(e) => onFilesUpload("photos", e, "etichetta")} />
              <ImportButton disabled={disabled} done={spec.importFlags?.foto} color="bg-amber-500 hover:bg-amber-600" icon={ImageIcon} label={t("importPhoto")} title={t("titleImportPhoto")} accept="image/*" onChange={(e) => onFilesUpload("photos", e, "foto")} />
            </div>

            {((spec.attachedSheets && spec.attachedSheets.length > 0) || (spec.photos && spec.photos.length > 0)) && (
              <div className="flex flex-col gap-3 mt-6 pt-4 border-t border-slate-300">
                <span className="text-[10px] font-black text-slate-500 uppercase">{t("attachedFiles")}</span>
                {(spec.attachedSheets || []).map((file, idx) => (
                  <FileRow key={`sheet-${idx}`} file={file} icon={FileText} color="text-blue-600" disabled={disabled} onRemove={() => onRemoveFile("attachedSheets", idx)} />
                ))}
                {(spec.photos || []).map((file, idx) => (
                  <FileRow key={`photo-${idx}`} file={file} icon={ImageIcon} color="text-purple-600" disabled={disabled} onRemove={() => onRemoveFile("photos", idx)} />
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <SectionA t={t} spec={spec} disabled={disabled} onUpdateField={onUpdateField} onBrandLogoUpload={onBrandLogoUpload} />
              <SectionB t={t} spec={spec} disabled={disabled} onUpdateTable={onUpdateTable} onAddTableRow={onAddTableRow} />
              <SectionC t={t} spec={spec} disabled={disabled} onUpdateTable={onUpdateTable} onAddTableRow={onAddTableRow} />
            </div>
            <div className="space-y-8">
              <SectionD t={t} spec={spec} disabled={disabled} onUpdateTable={onUpdateTable} onAddTableRow={onAddTableRow} />
              <SectionE t={t} spec={spec} disabled={disabled} onUpdateField={onUpdateField} />
              <SectionF t={t} lang={langKey} spec={spec} disabled={disabled} globalConfig={globalConfig} onUpdateTable={onUpdateTable} />
              <SectionG t={t} spec={spec} disabled={disabled} onUpdateField={onUpdateField} />
              <SectionH t={t} spec={spec} disabled={disabled} onUpdateField={onUpdateField} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImportButton({ disabled, done, color, icon: Icon, label, title, accept, onChange }) {
  return (
    <div className={`relative flex items-center gap-2 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase cursor-pointer transition-colors shadow-sm ${color}`} title={title}>
      {done && (
        <span className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1 shadow-md border-2 border-white">
          <Check size={12} strokeWidth={4} />
        </span>
      )}
      <Icon size={16} /> <span>{label}</span>
      <input disabled={disabled} type="file" multiple accept={accept} className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" onChange={onChange} />
    </div>
  );
}

function FileRow({ file, icon: Icon, color, disabled, onRemove }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-white p-2 rounded-lg border shadow-sm w-fit pr-4">
      <div className="flex items-center gap-2 ml-2">
        <Icon size={14} className={color} />
        <span className={`text-xs font-bold max-w-[200px] truncate ${color}`} title={file.name}>{file.name}</span>
      </div>
      <div className="flex items-center gap-2 ml-4 border-l border-slate-200 pl-3">
        <a href={file.url} download={file.name} className="text-slate-400 hover:text-emerald-600 transition-colors">
          <Download size={16} />
        </a>
        {!disabled && (
          <button onClick={onRemove} className="text-slate-300 hover:text-red-500 transition-colors">
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function SectionA({ t, spec, disabled, onUpdateField, onBrandLogoUpload }) {
  const f = (path) => (e) => onUpdateField(path, e.target.value);
  return (
    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-amber-100 shadow-inner space-y-6">
      <div className="flex items-center gap-4 border-b-2 border-amber-200 pb-2 text-amber-700 font-black uppercase text-xs">
        <Scale size={18} /> {t("sc_a")}
      </div>
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {spec.a?.brandLogo ? (
          <img src={spec.a.brandLogo} alt="Brand" className="h-12 object-contain" />
        ) : (
          <span className="text-[10px] font-black uppercase text-slate-400">Logo Brand Prodotto</span>
        )}
        <div className="relative overflow-hidden inline-block ml-auto">
          <button disabled={disabled} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase disabled:opacity-50 pointer-events-none">Carica Logo</button>
          {!disabled && <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={onBrandLogoUpload} />}
        </div>
      </div>
      <div className="space-y-4">
        <input disabled={disabled} placeholder={t("legalName")} className="w-full p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.legalName || ""} onChange={f("a.legalName")} />
        <input disabled={disabled} placeholder={t("claim")} className="w-full p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.claim || ""} onChange={f("a.claim")} />
        <textarea disabled={disabled} placeholder={t("ingredients")} className="w-full p-3 bg-white rounded-xl text-xs font-bold h-24 border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.ingredients || ""} onChange={f("a.ingredients")} />
        <textarea disabled={disabled} placeholder={t("allergensNote")} className="w-full p-3 bg-white rounded-xl text-xs font-bold h-16 border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.allergensNote || ""} onChange={f("a.allergensNote")} />
        <input disabled={disabled} placeholder={t("tmc")} className="w-full p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.tmc || ""} onChange={f("a.tmc")} />
        <input disabled={disabled} placeholder={t("producedIn")} className="w-full p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.producedIn || ""} onChange={f("a.producedIn")} />
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 px-1">
            <Info size={13} className="text-red-500 shrink-0" />
            <span className="text-[9px] font-black uppercase text-red-500">{t("manualFillHint")}</span>
          </div>
          <textarea disabled={disabled} placeholder={t("batchDecode")} className="w-full p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm h-20 disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.batchDecode || ""} onChange={f("a.batchDecode")} />
        </div>
        <input disabled={disabled} placeholder={t("intendedUse")} className="w-full p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.intendedUse || ""} onChange={f("a.intendedUse")} />
        <input disabled={disabled} placeholder={t("storage")} className="w-full p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.storage || ""} onChange={f("a.storage")} />
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 px-1">
            <Info size={13} className="text-red-500 shrink-0" />
            <span className="text-[9px] font-black uppercase text-red-500">{t("manualFillHint")}</span>
          </div>
          <textarea disabled={disabled} placeholder={t("envLabel")} className="w-full p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100 h-20" value={spec.a?.envLabel || ""} onChange={f("a.envLabel")} />
        </div>
        <input disabled={disabled} placeholder={t("packMode")} className="w-full p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.packMode || ""} onChange={f("a.packMode")} />
      </div>
    </div>
  );
}

function ConformeSelect({ disabled, value, onChange }) {
  const color = value === "Sì" ? "bg-emerald-50 text-emerald-700 border-emerald-300" : value === "No" ? "bg-red-50 text-red-700 border-red-300" : "border-transparent shadow-sm";
  return (
    <select disabled={disabled} className={`p-2 bg-white rounded-lg text-[9px] font-bold border outline-none focus:ring-2 disabled:opacity-70 disabled:bg-slate-100 ${color}`} value={value || ""} onChange={onChange}>
      <option value=""></option>
      <option value="Sì">Sì</option>
      <option value="No">No</option>
    </select>
  );
}

function SectionB({ t, spec, disabled, onUpdateTable, onAddTableRow }) {
  return (
    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-amber-100 shadow-inner space-y-4">
      <div className="flex justify-between items-center border-b-2 border-amber-200 pb-2">
        <div className="flex items-center gap-4 text-amber-600 font-black uppercase text-xs"><Microscope size={18} /> {t("sc_b")}</div>
        {!disabled && <button onClick={() => onAddTableRow("b")} className="p-1 bg-amber-600 text-white rounded-full hover:bg-amber-700 transition-colors">+</button>}
      </div>
      <div className="grid grid-cols-4 gap-2 text-[8px] font-black text-slate-400 px-1 uppercase"><span>{t("param")}</span><span>{t("limite")}</span><span>{t("risultato")}</span><span>{t("conforme")}</span></div>
      {spec.b?.map((r) => (
        <div key={r.id} className="grid grid-cols-4 gap-2">
          <input disabled={disabled} className="p-2 bg-white rounded-lg text-[9px] font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={r.p || ""} onChange={(e) => onUpdateTable("b", r.id, "p", e.target.value)} />
          <input disabled={disabled} className="p-2 bg-white rounded-lg text-[9px] font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={r.limite || ""} onChange={(e) => onUpdateTable("b", r.id, "limite", e.target.value)} />
          <input disabled={disabled} className="p-2 bg-white rounded-lg text-[9px] font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={r.risultato || ""} onChange={(e) => onUpdateTable("b", r.id, "risultato", e.target.value)} />
          <ConformeSelect disabled={disabled} value={r.conforme} onChange={(e) => onUpdateTable("b", r.id, "conforme", e.target.value)} />
        </div>
      ))}
    </div>
  );
}

function SectionC({ t, spec, disabled, onUpdateTable, onAddTableRow }) {
  return (
    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-emerald-100 shadow-inner space-y-4">
      <div className="flex justify-between items-center border-b-2 border-emerald-200 pb-2 text-emerald-600 font-black uppercase text-xs">
        <div className="flex items-center gap-4"><Apple size={18} /> {t("sc_c")}</div>
        {!disabled && <button onClick={() => onAddTableRow("c")} className="p-1 bg-emerald-600 text-white rounded-full">+</button>}
      </div>
      <div className="grid grid-cols-2 gap-4 text-[8px] font-black text-slate-400 px-1 uppercase"><span>{t("element")}</span><span>{t("value")}</span></div>
      {spec.c?.map((r) => (
        <div key={r.id} className="grid grid-cols-2 gap-2">
          <input disabled={disabled} className="p-2 bg-white rounded-lg text-[10px] font-bold shadow-sm border-none disabled:opacity-70 disabled:bg-slate-100" value={r.p || ""} onChange={(e) => onUpdateTable("c", r.id, "p", e.target.value)} />
          <input disabled={disabled} className="p-2 bg-white rounded-lg text-[10px] font-bold shadow-sm border-none disabled:opacity-70 disabled:bg-slate-100" value={r.v || ""} onChange={(e) => onUpdateTable("c", r.id, "v", e.target.value)} />
        </div>
      ))}
    </div>
  );
}

function SectionD({ t, spec, disabled, onUpdateTable, onAddTableRow }) {
  return (
    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-indigo-100 shadow-inner space-y-4">
      <div className="flex justify-between items-center border-b-2 border-indigo-200 pb-2 text-indigo-600 font-black uppercase text-xs">
        <div className="flex items-center gap-4"><FlaskRound size={18} /> {t("sc_d")}</div>
        {!disabled && <button onClick={() => onAddTableRow("d")} className="p-1 bg-indigo-600 text-white rounded-full">+</button>}
      </div>
      <div className="grid grid-cols-4 gap-2 text-[8px] font-black text-slate-400 px-1 uppercase"><span>{t("param")}</span><span>{t("limite")}</span><span>{t("risultato")}</span><span>{t("conforme")}</span></div>
      {spec.d?.map((r) => (
        <div key={r.id} className="grid grid-cols-4 gap-2">
          <input disabled={disabled} className="p-2 bg-white rounded-lg text-[9px] font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={r.p || ""} onChange={(e) => onUpdateTable("d", r.id, "p", e.target.value)} />
          <input disabled={disabled} className="p-2 bg-white rounded-lg text-[9px] font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={r.limite || ""} onChange={(e) => onUpdateTable("d", r.id, "limite", e.target.value)} />
          <input disabled={disabled} className="p-2 bg-white rounded-lg text-[9px] font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={r.risultato || ""} onChange={(e) => onUpdateTable("d", r.id, "risultato", e.target.value)} />
          <ConformeSelect disabled={disabled} value={r.conforme} onChange={(e) => onUpdateTable("d", r.id, "conforme", e.target.value)} />
        </div>
      ))}
    </div>
  );
}

function SectionE({ t, spec, disabled, onUpdateField }) {
  return (
    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-orange-100 shadow-inner space-y-6">
      <div className="flex items-center gap-4 border-b border-orange-200 pb-2 text-orange-600 font-black uppercase text-xs"><UtensilsCrossed size={18} /> {t("sc_e")}</div>
      <div className="space-y-3">
        {[["consistency", t("consistency")], ["aroma", t("aroma")], ["look", t("look")], ["taste", t("taste")]].map(([f, label]) => (
          <div key={f} className="space-y-1">
            <label className="text-[8px] font-black uppercase opacity-60 ml-1">{label}</label>
            <input disabled={disabled} className="w-full p-2 bg-white rounded-lg text-[10px] font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.e?.[f] || ""} onChange={(e) => onUpdateField(`e.${f}`, e.target.value)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionF({ t, lang, spec, disabled, globalConfig, onUpdateTable }) {
  const getColor = (val) => (!val || val === t("no") ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-red-50 text-red-700 border-red-300");
  return (
    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-red-100 shadow-inner space-y-4 overflow-x-auto relative">
      <div className="flex items-center justify-between border-b border-red-200 pb-2">
        <div className="flex items-center gap-4 text-red-700 font-black uppercase text-xs"><AlertCircle size={18} /> {t("sc_f")}</div>
      </div>
      <div className="grid grid-cols-12 gap-2 text-[8px] font-black text-slate-400 px-1 uppercase text-center min-w-full">
        <div className="col-span-3 text-left">{t("allergen")}</div>
        <div className="col-span-3">{t("presence")}</div>
        <div className="col-span-3">{t("traces")}</div>
        <div className="col-span-3 text-left">{t("notes")}</div>
      </div>
      <div className="divide-y divide-slate-200 min-w-full">
        {(globalConfig.allergeni || []).map((all) => {
          const row = spec.f?.find((r) => r.id === all.id);
          return (
            <div key={all.id} className="grid grid-cols-12 gap-4 items-center py-2 group">
              <div className="col-span-3 text-[9px] font-black uppercase text-slate-700 leading-tight text-left">{all[lang] || all.it}</div>
              <div className="col-span-3">
                <select disabled={disabled} className={`w-full p-2 border rounded text-[9px] font-bold outline-none disabled:opacity-70 focus:border-blue-500 transition-colors ${getColor(row?.presenza)}`} value={row?.presenza || t("no")} onChange={(e) => onUpdateTable("f", all.id, "presenza", e.target.value)}>
                  <option value={t("no")}>{t("no")}</option>
                  <option value="Sì (Ingrediente)">Sì (Ingrediente)</option>
                  <option value="Sì (Derivato/Additivo)">Sì (Derivato/Additivo)</option>
                </select>
              </div>
              <div className="col-span-3">
                <select disabled={disabled} className={`w-full p-2 border rounded text-[9px] font-bold outline-none disabled:opacity-70 focus:border-blue-500 transition-colors ${getColor(row?.tracce)}`} value={row?.tracce || t("no")} onChange={(e) => onUpdateTable("f", all.id, "tracce", e.target.value)}>
                  <option value={t("no")}>{t("no")}</option>
                  <option value="Possibile (Stessa linea)">Possibile (Stessa linea)</option>
                  <option value="Possibile (Stesso stabilimento)">Possibile (Stesso stab.)</option>
                </select>
              </div>
              <div className="col-span-3">
                <input disabled={disabled} type="text" className="w-full p-2 bg-white border border-slate-200 rounded text-[9px] font-bold outline-none disabled:opacity-70 focus:border-blue-500" placeholder="Note..." value={row?.note || ""} onChange={(e) => onUpdateTable("f", all.id, "note", e.target.value)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionG({ t, spec, disabled, onUpdateField }) {
  return (
    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-blue-900 shadow-inner space-y-6">
      <div className="flex items-center gap-4 border-b border-blue-900 pb-2 text-blue-900 font-black uppercase text-xs"><Dna size={18} /> {t("sc_g")}</div>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-700">{t("containsGmo")}</span>
          <div className="flex gap-2">
            {[t("yes"), t("no")].map((v) => (
              <button disabled={disabled} key={v} onClick={() => onUpdateField("g.containsGmo", v)} className={`px-4 py-2 rounded-xl text-[10px] font-black disabled:cursor-not-allowed ${spec.g?.containsGmo === v ? "bg-blue-900 text-white" : "bg-white border text-slate-400"}`}>{v}</button>
            ))}
          </div>
        </div>
        <textarea disabled={disabled} placeholder={t("notesGmo")} className="w-full p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm h-20 disabled:opacity-70 disabled:bg-slate-100" value={spec.g?.statement || ""} onChange={(e) => onUpdateField("g.statement", e.target.value)} />
      </div>
    </div>
  );
}

function LogInput({ disabled, value, onChange, placeholder }) {
  return <input disabled={disabled} className="w-full p-2 bg-yellow-100 border border-yellow-300 rounded text-center focus:ring-2 outline-none font-bold disabled:opacity-70" value={value || ""} onChange={onChange} placeholder={placeholder} />;
}

function SectionH({ t, spec, disabled, onUpdateField }) {
  return (
    <div className="bg-slate-50 p-8 rounded-[3rem] border border-blue-100 shadow-inner space-y-6">
      <div className="flex items-center gap-4 border-b-2 border-blue-200 pb-2 text-blue-700 font-black uppercase text-xs"><Package size={24} /> {t("sc_h")}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse bg-white shadow-sm rounded-xl overflow-hidden min-w-[500px]">
          <thead className="bg-slate-200 text-[9px] uppercase font-black text-slate-700">
            <tr>
              <th className="border border-slate-300 p-2 w-[28%]">{t("logParam")}</th>
              <th className="border border-slate-300 p-2 w-[24%] text-center">{t("logUvc")}</th>
              <th className="border border-slate-300 p-2 w-[24%] text-center">{t("logCarton")}</th>
              <th className="border border-slate-300 p-2 w-[24%] text-center">{t("logPallet")}</th>
            </tr>
          </thead>
          <tbody className="text-[9px] text-slate-800 font-bold">
            <tr>
              <td className="border border-slate-300 p-2 bg-slate-50">{t("eanItfType")}</td>
              <td className="border border-slate-300 p-1"><LogInput disabled={disabled} placeholder="EAN" value={spec.log?.uvc?.ean} onChange={(e) => onUpdateField("log.uvc.ean", e.target.value)} /></td>
              <td className="border border-slate-300 p-1"><LogInput disabled={disabled} placeholder="ITF" value={spec.log?.box?.itf} onChange={(e) => onUpdateField("log.box.itf", e.target.value)} /></td>
              <td className="border border-slate-300 p-1"><LogInput disabled={disabled} placeholder="Tipo" value={spec.log?.pallet?.tipo} onChange={(e) => onUpdateField("log.pallet.tipo", e.target.value)} /></td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2 bg-slate-50">{t("dims")}</td>
              <td className="border border-slate-300 p-1">
                <div className="flex gap-1">
                  <LogInput disabled={disabled} placeholder={t("l")} value={spec.log?.uvc?.l} onChange={(e) => onUpdateField("log.uvc.l", e.target.value)} />
                  <LogInput disabled={disabled} placeholder={t("p")} value={spec.log?.uvc?.p} onChange={(e) => onUpdateField("log.uvc.p", e.target.value)} />
                  <LogInput disabled={disabled} placeholder={t("h")} value={spec.log?.uvc?.h} onChange={(e) => onUpdateField("log.uvc.h", e.target.value)} />
                </div>
              </td>
              <td className="border border-slate-300 p-1">
                <div className="flex gap-1">
                  <LogInput disabled={disabled} placeholder={t("l")} value={spec.log?.box?.l} onChange={(e) => onUpdateField("log.box.l", e.target.value)} />
                  <LogInput disabled={disabled} placeholder={t("p")} value={spec.log?.box?.p} onChange={(e) => onUpdateField("log.box.p", e.target.value)} />
                  <LogInput disabled={disabled} placeholder={t("h")} value={spec.log?.box?.h} onChange={(e) => onUpdateField("log.box.h", e.target.value)} />
                </div>
              </td>
              <td className="border border-slate-300 p-1"><LogInput disabled={disabled} placeholder={t("hTot")} value={spec.log?.pallet?.alt} onChange={(e) => onUpdateField("log.pallet.alt", e.target.value)} /></td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2 bg-slate-50">{t("netDrain")}</td>
              <td className="border border-slate-300 p-1">
                <div className="flex gap-1">
                  <LogInput disabled={disabled} placeholder={t("net")} value={spec.log?.uvc?.pesoNetto} onChange={(e) => onUpdateField("log.uvc.pesoNetto", e.target.value)} />
                  <LogInput disabled={disabled} placeholder={t("drain")} value={spec.log?.uvc?.pesoSgocc} onChange={(e) => onUpdateField("log.uvc.pesoSgocc", e.target.value)} />
                </div>
              </td>
              <td className="border border-slate-300 p-2 bg-slate-100 text-center text-slate-400">---</td>
              <td className="border border-slate-300 p-2 bg-slate-100 text-center text-slate-400">---</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2 bg-slate-50">{t("tareGross")}</td>
              <td className="border border-slate-300 p-1">
                <div className="flex gap-1">
                  <LogInput disabled={disabled} placeholder={t("tare")} value={spec.log?.uvc?.tara} onChange={(e) => onUpdateField("log.uvc.tara", e.target.value)} />
                  <LogInput disabled={disabled} placeholder={t("gross")} value={spec.log?.uvc?.pesoLordo} onChange={(e) => onUpdateField("log.uvc.pesoLordo", e.target.value)} />
                </div>
              </td>
              <td className="border border-slate-300 p-1">
                <div className="flex gap-1">
                  <LogInput disabled={disabled} placeholder={t("tare")} value={spec.log?.box?.tara} onChange={(e) => onUpdateField("log.box.tara", e.target.value)} />
                  <LogInput disabled={disabled} placeholder={t("gross")} value={spec.log?.box?.pesoLordo} onChange={(e) => onUpdateField("log.box.pesoLordo", e.target.value)} />
                </div>
              </td>
              <td className="border border-slate-300 p-1"><LogInput disabled={disabled} placeholder={t("wTot")} value={spec.log?.pallet?.pesoTot} onChange={(e) => onUpdateField("log.pallet.pesoTot", e.target.value)} /></td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2 bg-slate-50">{t("composition")}</td>
              <td className="border border-slate-300 p-2 bg-slate-100 text-center text-slate-400">---</td>
              <td className="border border-slate-300 p-1"><LogInput disabled={disabled} placeholder={t("pzCarton")} value={spec.log?.box?.pz} onChange={(e) => onUpdateField("log.box.pz", e.target.value)} /></td>
              <td className="border border-slate-300 p-1">
                <div className="flex gap-1">
                  <LogInput disabled={disabled} placeholder={t("cLayer")} value={spec.log?.pallet?.cLayer} onChange={(e) => onUpdateField("log.pallet.cLayer", e.target.value)} />
                  <LogInput disabled={disabled} placeholder={t("layers")} value={spec.log?.pallet?.layers} onChange={(e) => onUpdateField("log.pallet.layers", e.target.value)} />
                  <LogInput disabled={disabled} placeholder={t("totCarton")} value={spec.log?.pallet?.totC} onChange={(e) => onUpdateField("log.pallet.totC", e.target.value)} />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
