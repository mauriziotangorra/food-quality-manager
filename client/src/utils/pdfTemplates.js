// Generazione PDF lato client tramite finestra di stampa (window.open + document.write
// + window.print()) - stessa tecnica del file originale, nessuna libreria PDF necessaria.
// I loghi/allegati sono ora URL relativi (es. "/uploads/..."), risolti in assoluti
// rispetto all'origin corrente prima di essere inseriti nell'HTML della finestra.

const COMPANY_HEADER_HTML = (masterLogoAbs) => `
  <table style="width: 100%; border-bottom: 3px solid #0f172a; padding-bottom: 15px; margin-bottom: 25px; border-collapse: collapse;">
    <tr>
      <td style="width: 40%; text-align: left; vertical-align: top; border: none; padding: 0;">
        ${masterLogoAbs ? `<img src="${masterLogoAbs}" style="max-height: 70px; object-fit: contain;" />` : ''}
      </td>
      <td style="width: 60%; text-align: right; vertical-align: top; font-size: 10px; line-height: 1.5; border: none; padding: 0; color: #475569;">
        <strong style="font-size: 13px; text-transform: uppercase; color: #0f172a;">International Food Pivot Srl</strong><br>
        Sede legale ed operativa<br>
        Piazza Duca D'Aosta, 12<br>
        20124 Milano – Italia<br>
        Partita IVA 11514530960<br>
        ordini@italianfoodpivot.it<br>
        amministrazione@italianfoodpivot.it<br>
        PEC: internationalfoodpivot@legalmail.it<br>
        Codice SDI SUBM70N<br>
        Tel. +39 02 82197510
      </td>
    </tr>
  </table>
`;

const BASE_STYLE = `
  @page { size: A4; margin: 15mm; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 0; color: #1e293b; font-size: 10px; line-height: 1.5; }
  .section { margin-bottom: 20px; page-break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; }
  .title { background: #f1f5f9; padding: 8px 12px; font-weight: 900; border-bottom: 1px solid #cbd5e1; text-transform: uppercase; font-size: 11px; color: #0f172a; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; word-wrap: break-word; vertical-align: middle; }
  th { background-color: #f8fafc; font-weight: bold; color: #475569; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; }
  .section table { border: none; margin-bottom: 0; }
  .section th, .section td { border-left: none; border-right: none; }
  .section tr:last-child td, .section tr:last-child th { border-bottom: none; }
  .label { font-weight: bold; background-color: #f8fafc; width: 30%; color: #334155; }
  .sign-container { margin-top: 60px; display: flex; justify-content: space-between; text-align: center; page-break-inside: avoid; gap: 20px; }
  .sign-box { border-top: 1px solid #0f172a; flex: 1; padding-top: 8px; font-weight: bold; font-size: 10px; color: #0f172a; }
`;

function toAbsoluteUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  return window.location.origin + url;
}

function isImageFile(name = '') {
  return /\.(jpe?g|png|gif|webp)$/i.test(name);
}

function openPrintWindow(title, bodyHtml, extraStyle = '') {
  const win = window.open('', '_blank');
  if (!win) {
    // eslint-disable-next-line no-alert
    alert('Il browser ha bloccato la finestra di stampa. Consenti i popup per questo sito.');
    return;
  }

  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>${BASE_STYLE}${extraStyle}</style>
      </head>
      <body>
        ${bodyHtml}
        <script>
          setTimeout(() => { window.print(); }, 800);
        </script>
      </body>
    </html>
  `);
  win.document.close();
}

// --- 1) DOSSIER DI QUALIFICA FORNITORE (Tab 12) ---
export function generateQualificationDossierPDF({ qualData, supplierName, globalConfig, lang, t, masterLogoUrl }) {
  const masterLogoAbs = toAbsoluteUrl(masterLogoUrl);
  const pdfPlace = qualData.pdfPlace || '_________________';
  const pdfDateStr = qualData.pdfDate ? new Date(qualData.pdfDate).toLocaleDateString(lang) : '_________________';

  const impegniTesti = globalConfig.impegniA || [];
  const logisticaList = globalConfig.impegniB || [];
  const anagrafica = qualData.anagrafica || {};

  const body = `
    ${COMPANY_HEADER_HTML(masterLogoAbs)}
    <h2 style="text-align:center; font-size: 16px; margin-top:0; margin-bottom: 20px; text-transform: uppercase;">${t('pdfReportTitle')}</h2>

    <div class="section">
      <div class="title">${t('sect1')}</div>
      <table>
        <tr><td class="label">${t('rs')}</td><td colspan="3"><b>${anagrafica.rs || supplierName || ''}</b></td></tr>
        <tr>
          <td class="label">${t('piva')}</td><td>${anagrafica.piva || ''}</td>
          <td class="label">${t('nazione')}</td><td>${anagrafica.nazione || ''}</td>
        </tr>
        <tr><td class="label">${t('sede')}</td><td colspan="3">${anagrafica.sede || ''}, ${anagrafica.cap || ''} ${anagrafica.citta || ''} (${anagrafica.provincia || ''})</td></tr>
      </table>
    </div>

    <div class="section">
      <div class="title">${t('sect2')}</div>
      <table>
        <tr><th>${t('dept')}</th><th>${t('name')}</th><th>${t('email')}</th><th>${t('tel')}</th></tr>
        ${Object.entries(qualData.contatti || {}).map(([dept, data]) => `
          <tr>
            <td style="text-transform: uppercase;"><b>${dept}</b></td>
            <td>${data?.nome || '-'}</td>
            <td>${data?.email || '-'}</td>
            <td>${data?.tel || '-'}</td>
          </tr>
        `).join('')}
      </table>
    </div>

    <div class="section">
      <div class="title">${t('sect3')}</div>
      <table>
        <tr><th>${t('certType')}</th><th>${t('expDate')}</th><th>${t('attState')}</th></tr>
        ${(qualData.certificazioni || []).map((c) => `
          <tr>
            <td><b>${c.type || '-'}</b></td>
            <td>${c.expiry ? new Date(c.expiry).toLocaleDateString(lang) : t('notDef')}</td>
            <td>${c.fileUrl ? t('loaded') : t('missing')}</td>
          </tr>
        `).join('')}
      </table>
    </div>

    <div class="section">
      <div class="title">${t('sect4')}</div>
      <table>
        <tr><th style="width:85%">${t('decl')}</th><th style="width:15%; text-align:center;">${t('outcome')}</th></tr>
        ${impegniTesti.map((imp, idx) => {
          const isChecked = Array.isArray(qualData.fileA?.impegni) ? (qualData.fileA.impegni[idx] || false) : false;
          const textStr = typeof imp === 'string' ? imp : (imp?.[lang.toLowerCase()] || imp?.it || '');
          return `
            <tr>
              <td style="text-align: justify; padding: 10px;">${textStr}</td>
              <td style="text-align: center; font-weight: bold; vertical-align: middle; ${isChecked ? 'color: #059669;' : 'color: #dc2626;'}">
                ${isChecked ? t('yesAccept') : t('noAccept')}
              </td>
            </tr>
          `;
        }).join('')}
      </table>
      <table style="margin-top:10px;">
        <tr><th style="width:60%">${t('docType')}</th><th style="width:40%">${t('attState')}</th></tr>
        <tr>
          <td><b>${t('allergenMgmtPlan')}</b></td>
          <td>${(qualData.fileA?.allergenManagementPlan || []).length ? t('loaded') : t('missing')}</td>
        </tr>
        <tr>
          <td><b>${t('contaminationRiskAssessment')}</b></td>
          <td>${(qualData.fileA?.contaminationRiskAssessment || []).length ? t('loaded') : t('missing')}</td>
        </tr>
      </table>
      <table style="margin-top:10px;">
        <tr><th style="width:40%">${t('allergen')}</th><th style="width:15%">${t('presence')}</th><th style="width:20%">${t('traces')}</th><th style="width:25%">${t('notes')}</th></tr>
        ${(globalConfig.allergeni || []).map((all) => {
          const langKey = lang.toLowerCase();
          const row = qualData.fileA?.allergens?.[all.id] || {};
          const allergenName = all[langKey] || all.it || '';
          return `<tr><td><b>${allergenName}</b></td><td>${row.presenza || 'No'}</td><td>${row.tracce || 'No'}</td><td>${row.note || ''}</td></tr>`;
        }).join('')}
      </table>
    </div>

    <div class="section">
      <div class="title">${t('sect5')}</div>
      <table>
        <tr><th style="width:85%">${t('ctrlParam')}</th><th style="width:15%; text-align:center;">${t('outcome')}</th></tr>
        ${logisticaList.map((imp) => {
          const isChecked = qualData.fileB?.[imp?.id] || false;
          const langKey = lang.toLowerCase();
          const titleStr = imp?.[`title_${langKey}`] || imp?.title_it || imp?.title || '';
          const descStr = imp?.[`desc_${langKey}`] || imp?.desc_it || imp?.desc || '';
          return `
            <tr>
              <td style="padding: 10px;">
                <b style="font-size: 11px;">${titleStr}</b><br/>
                <span style="font-size: 9px; text-align: justify; display: block; margin-top: 4px;">${descStr}</span>
              </td>
              <td style="text-align: center; font-weight: bold; vertical-align: middle; ${isChecked ? 'color: #059669;' : 'color: #dc2626;'}">
                ${isChecked ? t('yesConf') : t('noConf')}
              </td>
            </tr>
          `;
        }).join('')}
      </table>
    </div>

    <div class="section">
      <div class="title">${t('sect6')}</div>
      <table>
        <tr><th style="width:8%">${t('declCColNo')}</th><th style="width:52%">${t('declCColQuestion')}</th><th style="width:15%">${t('answerColLabel')}</th><th style="width:25%">${t('declCColNotes')}</th></tr>
        ${(() => {
          const langKey = lang.toLowerCase();
          const items = globalConfig.impegniC || [];
          const answers = qualData.fileD?.answers || {};
          return items.map((imp, idx) => {
            const sectionKey = langKey === 'it' ? 'section' : `section_${langKey}`;
            const sectionText = (imp[sectionKey] || imp.section || '').trim();
            const prevSectionText = idx > 0 ? (items[idx - 1][sectionKey] || items[idx - 1].section || '').trim() : null;
            const showHeader = sectionText && sectionText !== prevSectionText;
            const questionText = imp[langKey] || imp.it || '';
            const ans = answers[imp.id] || {};
            const headerRow = showHeader ? `<tr><td colspan="4" style="background:#f1f5f9; font-weight:900; text-transform:uppercase; font-size:9px;">${sectionText}</td></tr>` : '';
            return `${headerRow}<tr><td style="text-align:center;">${idx + 1}</td><td>${questionText}</td><td style="text-align:center;"><b>${ans.answer || '-'}</b></td><td>${ans.notes || ''}</td></tr>`;
          }).join('');
        })()}
      </table>
    </div>

    <div class="section">
      <div class="title">${t('sect7')}</div>
      <table>
        <tr><th>${t('typology')}</th><th>${t('prodName')}</th><th>${t('labelOrigine')}</th><th>${t('labelTmc')}</th></tr>
        ${(qualData.fileC || []).length > 0 ? (qualData.fileC || []).map((p) => `
          <tr>
            <td>${p?.tipologia || '-'}</td>
            <td>${p?.denominazione || '-'}</td>
            <td>${p?.origine || '-'}</td>
            <td>${p?.shelfLife || '-'}</td>
          </tr>
        `).join('') : `<tr><td colspan="4" style="text-align:center;">-</td></tr>`}
      </table>
    </div>

    <div class="section">
      <div class="title">${t('sect8')}</div>
      <table>
        <tr><th>${t('name')}</th><th>${t('analysisFrequencyLabel')}</th><th>${t('technicalSheetLabel')}</th><th>${t('analysisReportsLabel')}</th><th>${t('riskMgmtLabel')}</th><th>${t('notes')}</th></tr>
        ${(qualData.rawMaterials || []).length > 0 ? (qualData.rawMaterials || []).map((m) => `
          <tr>
            <td><b>${m?.name || '-'}</b></td>
            <td>${m?.frequency || '-'}</td>
            <td>${m?.technicalSheet ? t('loaded') : t('missing')}</td>
            <td>${(m?.analysisReports || []).length ? t('loaded') : t('missing')}</td>
            <td>${(m?.riskAssessment || []).length ? t('loaded') : t('missing')}</td>
            <td>${m?.notes || ''}</td>
          </tr>
        `).join('') : `<tr><td colspan="6" style="text-align:center;">-</td></tr>`}
      </table>
    </div>

    <div class="section">
      <div class="title">${t('sect9')}</div>
      <table>
        <tr><th style="width:25%">${t('typology')}</th><th style="width:40%">${t('appliesTo')}</th><th style="width:35%">${t('attState')}</th></tr>
        <tr>
          <td><b>Food Fraud</b></td>
          <td>${qualData.foodFraudDefense?.foodFraud?.appliesTo || '-'}</td>
          <td>${(qualData.foodFraudDefense?.foodFraud?.files || []).length ? t('loaded') : t('missing')}</td>
        </tr>
        <tr>
          <td><b>Food Defense</b></td>
          <td>${qualData.foodFraudDefense?.foodDefense?.appliesTo || '-'}</td>
          <td>${(qualData.foodFraudDefense?.foodDefense?.files || []).length ? t('loaded') : t('missing')}</td>
        </tr>
      </table>
    </div>

    <div class="section">
      <div class="title">${t('sect10')}</div>
      <table>
        <tr><th style="width:60%">${t('docType')}</th><th style="width:40%">${t('attState')}</th></tr>
        <tr><td><b>${t('mocaDeclLabel')}</b></td><td>${(qualData.mocaPackaging?.moca || []).length ? t('loaded') : t('missing')}</td></tr>
        <tr><td><b>${t('packagingTechSheetLabel')}</b></td><td>${(qualData.mocaPackaging?.technicalSpecs || []).length ? t('loaded') : t('missing')}</td></tr>
        <tr><td><b>${t('migrationTestsLabel')}</b></td><td>${(qualData.mocaPackaging?.migrationTests || []).length ? t('loaded') : t('missing')}</td></tr>
        <tr><td><b>${t('ppwrDocLabel')}</b></td><td>${(qualData.mocaPackaging?.ppwr || []).length ? t('loaded') : t('missing')}</td></tr>
      </table>
    </div>

    <div class="section">
      <div class="title">${t('sect11')}</div>
      <table>
        <tr><th style="width:60%">${t('docType')}</th><th style="width:40%">${t('attState')}</th></tr>
        <tr><td><b>${t('haccpManualExtractLabel')}</b></td><td>${(qualData.haccp?.manualExtract || []).length ? t('loaded') : t('missing')}</td></tr>
        <tr><td><b>${t('haccpFlowChartLabel')}</b></td><td>${(qualData.haccp?.flowChart || []).length ? t('loaded') : t('missing')}</td></tr>
        <tr><td><b>${t('haccpPrpOprpLabel')}</b></td><td>${[...(qualData.haccp?.prp || []), ...(qualData.haccp?.oprpCcp || [])].length ? t('loaded') : t('missing')}</td></tr>
      </table>
    </div>

    <div class="sign-container">
      <div class="sign-box">${t('placeAndDate')}<br><br><br>${pdfPlace}, ${pdfDateStr}</div>
      <div class="sign-box">
        ${t('suppStamp')}<br>
        <span style="font-weight: normal; font-size: 9px; color: #475569;">${t('suppRole')}</span><br><br><br>
        ................................................
      </div>
      <div class="sign-box">
        ${t('pivotStamp')}<br>
        <span style="font-weight: normal; font-size: 9px; color: #475569;">${t('pivotRole')}</span><br><br><br>
        ................................................
      </div>
    </div>
  `;

  openPrintWindow(`Dossier Qualifica - ${anagrafica.rs || supplierName || 'Fornitore'}`, body);
}

// --- 2) SPECIFICA TECNICA PRODOTTO (Tab 6, standard / IFP) ---
export function generateSpecPDF({ spec, qualData, lang, t, masterLogoUrl, pdfType = 'standard' }) {
  const masterLogoAbs = toAbsoluteUrl(masterLogoUrl);
  const brandLogoAbs = toAbsoluteUrl(spec.a?.brandLogo);
  const pdfPlace = qualData.pdfPlace || '_________________';
  const pdfDateStr = qualData.pdfDate ? new Date(qualData.pdfDate).toLocaleDateString(lang) : '_________________';

  const imagesToRender = [...(spec.photos || []), ...(spec.attachedSheets || [])].filter((f) => f.url && isImageFile(f.name));
  let visualAttachmentsHtml = '';
  if (imagesToRender.length > 0) {
    visualAttachmentsHtml = `
      <div style="page-break-before: always;"></div>
      <div class="section">
        <div class="title">ALLEGATI VISIVI (FOTO PRODOTTO ED ETICHETTE)</div>
        <div style="padding: 20px; text-align: center;">
          ${imagesToRender.map((img) => `
            <div style="margin-bottom: 40px; page-break-inside: avoid;">
              <strong style="display:block; margin-bottom: 10px; font-size: 13px; color: #0f172a;">${img.name}</strong>
              <img src="${toAbsoluteUrl(img.url)}" style="max-width: 100%; max-height: 800px; object-fit: contain; border: 2px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #f8fafc;" />
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  const body = `
    <table style="width: 100%; border-bottom: 3px solid #0f172a; padding-bottom: 15px; margin-bottom: 25px; border-collapse: collapse;">
      <tr>
        <td style="width: 30%; text-align: left; vertical-align: top; border: none; padding: 0;">
          ${masterLogoAbs ? `<img src="${masterLogoAbs}" style="max-height: 70px; object-fit: contain;" />` : ''}
        </td>
        <td style="width: 40%; text-align: center; vertical-align: top; font-size: 10px; line-height: 1.5; border: none; padding: 0; color: #475569;">
          <strong style="font-size: 13px; text-transform: uppercase; color: #0f172a;">International Food Pivot Srl</strong><br>
          Sede legale ed operativa<br>
          Piazza Duca D'Aosta, 12<br>
          20124 Milano – Italia<br>
          Partita IVA 11514530960<br>
          ordini@italianfoodpivot.it<br>
          amministrazione@italianfoodpivot.it<br>
          PEC: internationalfoodpivot@legalmail.it<br>
          Codice SDI SUBM70N<br>
          Tel. +39 02 82197510
        </td>
        <td style="width: 30%; text-align: right; vertical-align: bottom; border: none; padding: 0;">
          ${brandLogoAbs ? `<img src="${brandLogoAbs}" style="max-height: 70px; object-fit: contain;" />` : ''}
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin-bottom: 15px; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
      <h2 style="margin:0 0 5px 0; color: #0f172a;">${t('ap05_title')}</h2>
      <p style="margin:0; color: #64748b; font-weight: bold;">Stato: ${spec.isObsolete ? t('statusArchived') : 'ATTIVA'} | ${t('rev')}: ${spec.header?.revision || '0'} | Data: ${spec.saveDate || 'Bozza'}</p>
    </div>

    <table style="margin-bottom: 20px;">
      <tr>
        <td class="label">${t('prodCode')}</td><td><b>${spec.master?.codice || ''}</b></td>
        <td class="label">${t('prodName')}</td><td><b style="font-size: 12px;">${spec.master?.nome || ''}</b></td>
      </tr>
      <tr>
        <td class="label">${t('eanCode')}</td><td>${spec.header?.ean || ''}</td>
        <td class="label">${t('uvcWeight')}</td><td>${spec.header?.uvcWeight || ''}</td>
      </tr>
    </table>

    <div class="section">
      <div class="title">${t('sc_a')}</div>
      <table>
        <tr><td class="label">${t('legalName')}</td><td>${spec.a?.legalName || ''}</td></tr>
        <tr><td class="label">${t('brand')}</td><td>${spec.a?.brand || ''}</td></tr>
        <tr><td class="label">${t('claim')}</td><td>${spec.a?.claim || ''}</td></tr>
        <tr><td class="label">${t('ingredients')}</td><td>${spec.a?.ingredients || ''}</td></tr>
        <tr><td class="label">${t('allergensNote')}</td><td>${spec.a?.allergensNote || ''}</td></tr>
        ${pdfType === 'standard' ? `<tr><td class="label">${t('tmc')}</td><td>${spec.a?.tmc || ''}</td></tr>` : ''}
        ${pdfType === 'ifp' ? `<tr><td class="label">${t('ggConsegna')}</td><td>${spec.a?.giorniGarantiti || ''}</td></tr>` : ''}
        <tr><td class="label">${t('producedIn')}</td><td>${spec.a?.producedIn || ''}</td></tr>
        <tr><td class="label">${t('batchDecode')}</td><td>${(spec.a?.batchDecode || '').replace(/\n/g, '<br>')}</td></tr>
        <tr><td class="label">${t('intendedUse')}</td><td>${spec.a?.intendedUse || ''}</td></tr>
        <tr><td class="label">${t('storage')}</td><td>${spec.a?.storage || ''}</td></tr>
        <tr><td class="label">${t('envLabel')}</td><td>${(spec.a?.envLabel || '').replace(/\n/g, '<br>')}</td></tr>
        <tr><td class="label">${t('packMode')}</td><td>${spec.a?.packMode || ''}</td></tr>
      </table>
    </div>

    <div class="section">
      <div class="title">${t('sc_b')}</div>
      <table>
        <tr><th style="width: 30%;">${t('param')}</th><th style="width: 25%;">${t('limite')}</th><th style="width: 25%;">${t('risultato')}</th><th style="width: 20%;">${t('conforme')}</th></tr>
        ${(spec.b || []).filter((r) => r.p).map((r) => `<tr><td><b>${r.p || ''}</b></td><td>${r.limite || ''}</td><td>${r.risultato || ''}</td><td>${r.conforme || ''}</td></tr>`).join('')}
      </table>
    </div>

    <div class="section">
      <div class="title">${t('sc_c')}</div>
      <table>
        <tr><th style="width: 50%;">${t('element')}</th><th style="width: 50%;">${t('value')}</th></tr>
        ${(spec.c || []).filter((r) => r.p || r.v).map((r) => `<tr><td><b>${r.p || ''}</b></td><td>${r.v || ''}</td></tr>`).join('')}
      </table>
    </div>

    <div class="section">
      <div class="title">${t('sc_d')}</div>
      <table>
        <tr><th style="width: 30%;">${t('param')}</th><th style="width: 25%;">${t('limite')}</th><th style="width: 25%;">${t('risultato')}</th><th style="width: 20%;">${t('conforme')}</th></tr>
        ${(spec.d || []).filter((r) => r.p).map((r) => `<tr><td><b>${r.p || ''}</b></td><td>${r.limite || ''}</td><td>${r.risultato || ''}</td><td>${r.conforme || ''}</td></tr>`).join('')}
      </table>
    </div>

    <div class="section">
      <div class="title">${t('sc_e')}</div>
      <table>
        <tr><td class="label">${t('consistency')}</td><td>${spec.e?.consistency || ''}</td></tr>
        <tr><td class="label">${t('aroma')}</td><td>${spec.e?.aroma || ''}</td></tr>
        <tr><td class="label">${t('look')}</td><td>${spec.e?.look || ''}</td></tr>
        <tr><td class="label">${t('taste')}</td><td>${spec.e?.taste || ''}</td></tr>
      </table>
    </div>

    <div class="section">
      <div class="title">${t('sc_g')}</div>
      <table>
        <tr><td class="label">${t('containsGmo')}</td><td><b>${spec.g?.containsGmo || t('no')}</b></td></tr>
        <tr><td class="label">${t('notesGmo')}</td><td>${spec.g?.statement || ''}</td></tr>
      </table>
    </div>

    <div class="section">
      <div class="title">${t('sc_h')}</div>
      <table>
        <tr><th style="width: 25%;">${t('logParam')}</th><th style="width: 25%;">${t('logUvc')}</th><th style="width: 25%;">${t('logCarton')}</th><th style="width: 25%;">${t('logPallet')}</th></tr>
        <tr>
          <td class="label">${t('eanItfType')}</td>
          <td>${spec.log?.uvc?.ean || '-'}</td>
          <td>${spec.log?.box?.itf || '-'}</td>
          <td>${spec.log?.pallet?.tipo || '-'}</td>
        </tr>
        <tr>
          <td class="label">${t('dims')}</td>
          <td>${spec.log?.uvc?.l || '-'} x ${spec.log?.uvc?.p || '-'} x ${spec.log?.uvc?.h || '-'}</td>
          <td>${spec.log?.box?.l || '-'} x ${spec.log?.box?.p || '-'} x ${spec.log?.box?.h || '-'}</td>
          <td>H Tot: ${spec.log?.pallet?.alt || '-'}</td>
        </tr>
        <tr>
          <td class="label">${t('netDrain')}</td>
          <td>${spec.log?.uvc?.pesoNetto || '-'} / ${spec.log?.uvc?.pesoSgocc || '-'}</td>
          <td>-</td>
          <td>-</td>
        </tr>
        <tr>
          <td class="label">${t('tareGross')}</td>
          <td>${spec.log?.uvc?.tara || '-'} / ${spec.log?.uvc?.pesoLordo || '-'}</td>
          <td>${spec.log?.box?.tara || '-'} / ${spec.log?.box?.pesoLordo || '-'}</td>
          <td>Tot Lordo: ${spec.log?.pallet?.pesoTot || '-'}</td>
        </tr>
        <tr>
          <td class="label">${t('composition')}</td>
          <td>-</td>
          <td>Pz x Cart: ${spec.log?.box?.pz || '-'}</td>
          <td>Crt/Str: ${spec.log?.pallet?.cLayer || '-'} | Strati: ${spec.log?.pallet?.layers || '-'} | Tot Crt: ${spec.log?.pallet?.totC || '-'}</td>
        </tr>
      </table>
    </div>

    <div class="sign-container">
      <div class="sign-box">${t('placeAndDate')}<br><br><br>${pdfPlace}, ${pdfDateStr}</div>
      <div class="sign-box">
        ${t('suppStamp')}<br>
        <span style="font-weight: normal; font-size: 9px; color: #475569;">${t('suppRole')}</span><br><br><br>
        ................................................
      </div>
      <div class="sign-box">
        ${t('pivotStamp')}<br>
        <span style="font-weight: normal; font-size: 9px; color: #475569;">${t('pivotRole')}</span><br><br><br>
        ................................................
      </div>
    </div>

    ${visualAttachmentsHtml}
  `;

  openPrintWindow(`Specifica Tecnica - ${spec.master?.nome || 'Prodotto'}`, body);
}

// --- 3) LETTERA IMPEGNO SCHEDE TECNICHE ---
export function generateImpegnoPDF({ qualData, supplierName, lang, t, masterLogoUrl }) {
  const masterLogoAbs = toAbsoluteUrl(masterLogoUrl);
  const place = qualData.impegnoSchede?.place || '_________________';
  const dateStr = qualData.impegnoSchede?.date ? new Date(qualData.impegnoSchede.date).toLocaleDateString(lang) : '_________________';
  const rs = qualData.anagrafica?.rs || supplierName || '[NOME_AZIENDA_CLIENTE]';

  const style = `
    h1 { text-align: center; font-size: 16px; text-transform: uppercase; margin-bottom: 30px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; color: #0f172a; }
    p { margin-bottom: 15px; }
    .bold { font-weight: bold; color: #0f172a; }
    ol { margin-bottom: 20px; }
    li { margin-bottom: 10px; }
  `;

  const body = `
    ${COMPANY_HEADER_HTML(masterLogoAbs)}
    <h1>${t('impObj')}</h1>
    <p>${t('impSubj')}</p>
    <p><span class="bold">${t('rs')}:</span> ${rs}</p>

    <p class="bold">${t('impDeclTitle')}</p>
    <ol>
      <li>${t('impPoint1')}</li>
      <li>${t('impPoint2')}</li>
    </ol>

    <p><span class="bold">${t('impCondTitle')}</span> ${t('impCondText1')} <span class="bold">${rs}</span>${t('impCondText2')}</p>

    <div class="sign-container">
      <div class="sign-box"><span class="bold">${t('placeAndDate')}</span><br><br><br>${place}, ${dateStr}</div>
      <div class="sign-box"><span class="bold">${t('impSignClient')}</span><br><br><br>____________________________________</div>
    </div>
  `;

  openPrintWindow(`${t('impegnoTitle')} - ${rs}`, body, style);
}
