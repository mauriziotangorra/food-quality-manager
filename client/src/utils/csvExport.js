// Esporta tutte le specifiche tecniche attive (non obsolete) in un unico CSV.
export function exportAllSpecsToCSV(productSpecs, lang) {
  const validSpecs = (productSpecs || []).filter((s) => !s.isObsolete);
  if (validSpecs.length === 0) return false;

  let csv = 'data:text/csv;charset=utf-8,';
  csv += 'CATALOGO SPECIFICHE TECNICHE AP 05.1.1 (Solo Attive)\n\n';

  validSpecs.forEach((spec, index) => {
    csv += `--- SCHEDA PRODOTTO ${index + 1} ---\n`;
    csv += `Codice Prodotto;${spec.master?.codice || ''}\n`;
    csv += `Nome Commerciale;${spec.master?.nome || ''}\n`;
    csv += `Revisione;${spec.header?.revision || '0'}\n`;
    csv += `Peso UVC (g);${spec.header?.uvcWeight || ''}\n`;
    csv += `Codice EAN;${spec.header?.ean || ''}\n`;

    csv += '\na) CARATTERISTICHE COMMERCIALI\n';
    csv += `Denominazione legale;${spec.a?.legalName || ''}\n`;
    csv += `Brand;${spec.a?.brand || ''}\n`;
    csv += `Claim;${spec.a?.claim || ''}\n`;
    csv += `Ingredienti;${(spec.a?.ingredients || '').replace(/\n/g, ' ')}\n`;
    csv += `Shelf life;${spec.a?.tmc || ''}\n`;
    csv += `Formato;${spec.a?.tmcFormat || ''}\n`;
    csv += `Giorni garantiti alla consegna;${spec.a?.giorniGarantiti || ''}\n`;
    csv += `Fornitore;${spec.a?.supplier || ''}\n`;
    csv += `Prodotto in;${spec.a?.producedIn || ''}\n`;
    csv += `Materiale Imballo;${spec.a?.packaging || ''}\n`;
    csv += `Formato Lotto;${spec.a?.batchFormat || ''}\n`;
    csv += `Decodifica Lotto;${(spec.a?.batchDecode || '').replace(/\n/g, ' ')}\n`;
    csv += `Modalità di etichettatura;${spec.a?.prepMode || ''}\n`;
    csv += `Modalità d'uso e consumo;${spec.a?.intendedUse || ''}\n`;
    csv += `Condizioni conservazione;${spec.a?.storage || ''}\n`;
    csv += `Descrizione del processo;${(spec.a?.processDesc || '').replace(/\n/g, ' ')}\n`;
    csv += `Etichetta ambientale;${(spec.a?.envLabel || '').replace(/\n/g, ' ')}\n`;
    csv += `Modalità di confezionamento;${spec.a?.packMode || ''}\n`;

    csv += '\nb) MICROBIOLOGIA\n';
    (spec.b || []).forEach((r) => { if (r.p) csv += `${r.p || ''};${r.limite || ''};${r.risultato || ''};${r.conforme || ''}\n`; });

    csv += '\nc) DICHIARAZIONE NUTRIZIONALE\n';
    (spec.c || []).forEach((r) => { if (r.p || r.v) csv += `${r.p || ''};${r.v || ''}\n`; });

    csv += '\nd) CARATTERISTICHE CHIMICHE\n';
    (spec.d || []).forEach((r) => { if (r.p) csv += `${r.p || ''};${r.limite || ''};${r.risultato || ''};${r.conforme || ''}\n`; });

    csv += '\ne) CARATTERISTICHE ORGANOLETTICHE\n';
    csv += `Consistenza;${spec.e?.consistency || ''}\n`;
    csv += `Aroma;${spec.e?.aroma || ''}\n`;
    csv += `Apparenza/Colore;${spec.e?.look || ''}\n`;
    csv += `Sapore;${spec.e?.taste || ''}\n`;

    csv += '\nf) DICHIARAZIONE ALLERGENI\n';
    (spec.f || []).forEach((r) => {
      csv += `${r.it || ''};${r.presenza || ''};${r.tracce || ''};${r.note || ''}\n`;
    });

    csv += '\ng) DICHIARAZIONE OGM\n';
    csv += `Contiene OGM?;${spec.g?.containsGmo || 'No'}\n`;
    csv += `Note;${(spec.g?.statement || '').replace(/\n/g, ' ')}\n`;

    csv += '\nh) LOGISTICA\n';
    csv += `EAN / ITF / Tipo;${spec.log?.uvc?.ean || ''};${spec.log?.box?.itf || ''};${spec.log?.pallet?.tipo || ''}\n`;
    csv += `Dimensioni (LxPxH) cm;${spec.log?.uvc?.l || ''}x${spec.log?.uvc?.p || ''}x${spec.log?.uvc?.h || ''};${spec.log?.box?.l || ''}x${spec.log?.box?.p || ''}x${spec.log?.box?.h || ''};H Tot: ${spec.log?.pallet?.alt || ''}\n`;
    csv += `Peso Netto/Sgocc. (g);${spec.log?.uvc?.pesoNetto || ''} / ${spec.log?.uvc?.pesoSgocc || ''};--;--\n`;
    csv += `Tara / Lordo;${spec.log?.uvc?.tara || ''} / ${spec.log?.uvc?.pesoLordo || ''};${spec.log?.box?.tara || ''} / ${spec.log?.box?.pesoLordo || ''};Lordo Tot: ${spec.log?.pallet?.pesoTot || ''}\n`;
    csv += `Composizione / Pz;--;${spec.log?.box?.pz || ''};Crt/Str: ${spec.log?.pallet?.cLayer || ''} | Strati: ${spec.log?.pallet?.layers || ''} | Tot Crt: ${spec.log?.pallet?.totC || ''}\n`;

    csv += '\n\n========================================\n\n';
  });

  const encodedUri = encodeURI(csv);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'Catalogo_Specifiche_Pivot.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}
