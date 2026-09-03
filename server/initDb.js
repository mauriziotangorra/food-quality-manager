const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

const SALT_ROUNDS = 10;

// Contenuto di riferimento del Questionario (Dichiarazione C), dai due
// questionari cliente ("3.1 Service Supplier Questionnaire" e "3.2 MOCA
// Supplier Questionnaire"). Seminato SOLO se la tabella impegni_c e' vuota
// (vedi piu' sotto) — non deve mai sovrascrivere domande gia' modificate
// dall'admin. Il testo e' in inglese (unica lingua fornita dal cliente): lo
// stesso testo va anche in "it" cosi' il fallback imp.it (usato se en/fr/es
// non sono ancora tradotte) non resta mai vuoto.
const DEFAULT_IMPEGNI_C = [
  { id: 'svc-1', section: 'LABORATORY / RETAINED SAMPLES', text: "If you perform laboratory testing activities, are you accredited by ACCREDIA for the tests you perform? If yes, indicate in Notes which tests are accredited and how many accredited tests you perform." },
  { id: 'svc-2', section: 'LABORATORY / RETAINED SAMPLES', text: "Do you retain a representative finished-product sample for each lot, where applicable? If yes, indicate in Notes the retention period and storage conditions." },
  { id: 'svc-3', section: 'TRAINING', text: "Does the company provide training on hygiene and food safety based on the HACCP system?" },
  { id: 'svc-4', section: 'TRAINING', text: "Does the company provide training on occupational health and safety in compliance with Italian Legislative Decree 81/2008?" },
  { id: 'svc-5', section: 'TRANSPORT / LOGISTICS', text: "Does the company hold the Health Authorisation required for the transport vehicles used, as required by DPR 327/80? If yes, indicate in Notes the relevant authorisation details." },
  { id: 'svc-6', section: 'TRANSPORT / LOGISTICS', text: "Does the company provide regular hygiene and food-safety training for transport personnel, as provided for by Regulations (EC) 852/2004 and 853/2004?" },
  { id: 'svc-7', section: 'TRANSPORT / LOGISTICS', allowAttachment: true, text: "For temperature-controlled transport, does the company have a system that ensures monitoring, recording and traceability of vehicle temperature for each individual shipment? If yes, indicate in Notes the system used and attach the company procedure/instruction governing temperature monitoring and control during transport.\n\nINFO: International Food Pivot reserves the right to request, on a sampling basis during the supply relationship, the temperature record/temperature trace relating to one or more specific shipments in order to verify compliance with the required transport conditions." },
  { id: 'svc-8', section: 'VEHICLE CLEANING', text: "Do you have a cleaning programme for the cargo compartments of vehicles used for our transports?" },
  { id: 'svc-9', section: 'VEHICLE CLEANING', text: "If yes, are records of these cleaning activities maintained?" },
  { id: 'moca-1', section: 'GMP AND CERTIFICATIONS', text: "Does the company manufacture food contact materials and articles in compliance with Regulation (EC) 2023/2006 and apply Good Manufacturing Practices?" },
  { id: 'moca-2', section: 'GMP AND CERTIFICATIONS', allowAttachment: true, text: "Are you certified according to BRCGS Packaging Materials, AIB, FEFCO, EN 15593 or other relevant standards? If yes, indicate in Notes the certification held." },
  { id: 'moca-3', section: 'SITE HYGIENE', allowAttachment: true, text: "Does the company operate a pest management system? Attach the relevant file." },
  { id: 'moca-4', section: 'LOT IDENTIFICATION', allowAttachment: true, text: "Do you have a lot identification system? If yes, how do you identify the lot and what is the meaning/decoding of the lot code? Enter the decoding in Notes and, if available, attach the procedure." },
  { id: 'moca-6', section: 'MEASURING EQUIPMENT', text: "Do you have a system/procedure for the calibration of product and process measuring and monitoring equipment, ensuring traceability of the results to ACCREDIA-calibrated or equivalent reference equipment?" },
  { id: 'moca-7', section: 'MIGRATION / RELEASE TESTING', allowAttachment: true, text: "Do you periodically perform migration/release tests on the articles supplied to us or on similar/representative articles? If yes, attach the available test report/certificate." },
  { id: 'moca-8', section: 'MIGRATION / RELEASE TESTING', text: "Are the migration/release tests performed by an ACCREDIA-accredited or equivalent laboratory, where applicable? If yes, indicate in Notes the laboratory used." },
];

// Traduzioni reali IT/FR/ES per le domande sopra (l'inglese e' quello
// fornito dal cliente, usato com'e'). Usate dalla migrazione idempotente più
// sotto per sostituire il placeholder "stesso testo in tutte le lingue"
// scritto al momento del seed iniziale — mai per sovrascrivere domande che
// l'admin ha gia' modificato a mano (vedi condizione it === en piu' sotto).
const IMPEGNI_C_TRANSLATIONS = {
  'svc-1': {
    it: "Se svolgete attività di analisi di laboratorio, siete accreditati ACCREDIA per le prove eseguite? In caso affermativo, indicare nelle Note quali prove sono accreditate e quante prove accreditate vengono eseguite.",
    fr: "Si vous effectuez des activités d'analyses de laboratoire, êtes-vous accrédités ACCREDIA pour les essais que vous réalisez ? Si oui, indiquez dans les Notes quels essais sont accrédités et combien d'essais accrédités vous réalisez.",
    es: "Si realiza actividades de análisis de laboratorio, ¿está acreditado por ACCREDIA para los ensayos que realiza? En caso afirmativo, indique en las Notas qué ensayos están acreditados y cuántos ensayos acreditados realiza.",
  },
  'svc-2': {
    it: "Trattenete un campione rappresentativo di prodotto finito per ogni lotto, ove applicabile? In caso affermativo, indicare nelle Note il periodo di conservazione e le condizioni di stoccaggio.",
    fr: "Conservez-vous un échantillon représentatif du produit fini pour chaque lot, le cas échéant ? Si oui, indiquez dans les Notes la durée de conservation et les conditions de stockage.",
    es: "¿Conserva una muestra representativa del producto terminado para cada lote, cuando corresponda? En caso afirmativo, indique en las Notas el período de conservación y las condiciones de almacenamiento.",
  },
  'svc-3': {
    it: "L'azienda fornisce formazione in materia di igiene e sicurezza alimentare basata sul sistema HACCP?",
    fr: "L'entreprise dispense-t-elle une formation en matière d'hygiène et de sécurité alimentaire basée sur le système HACCP ?",
    es: "¿La empresa imparte formación en materia de higiene y seguridad alimentaria basada en el sistema HACCP?",
  },
  'svc-4': {
    it: "L'azienda fornisce formazione in materia di salute e sicurezza sul lavoro in conformità al D.Lgs. 81/2008?",
    fr: "L'entreprise dispense-t-elle une formation en matière de santé et de sécurité au travail conformément au Décret législatif italien 81/2008 ?",
    es: "¿La empresa imparte formación en materia de salud y seguridad en el trabajo conforme al Decreto Legislativo italiano 81/2008?",
  },
  'svc-5': {
    it: "L'azienda possiede l'Autorizzazione Sanitaria richiesta per i mezzi di trasporto utilizzati, ai sensi del DPR 327/80? In caso affermativo, indicare nelle Note gli estremi dell'autorizzazione.",
    fr: "L'entreprise dispose-t-elle de l'Autorisation Sanitaire requise pour les véhicules de transport utilisés, conformément au DPR 327/80 ? Si oui, indiquez dans les Notes les détails de l'autorisation.",
    es: "¿La empresa dispone de la Autorización Sanitaria requerida para los vehículos de transporte utilizados, conforme al DPR 327/80? En caso afirmativo, indique en las Notas los datos de la autorización.",
  },
  'svc-6': {
    it: "L'azienda fornisce formazione periodica in materia di igiene e sicurezza alimentare al personale addetto al trasporto, come previsto dai Regolamenti (CE) 852/2004 e 853/2004?",
    fr: "L'entreprise dispense-t-elle une formation régulière en matière d'hygiène et de sécurité alimentaire au personnel de transport, comme le prévoient les Règlements (CE) 852/2004 et 853/2004 ?",
    es: "¿La empresa imparte formación periódica en materia de higiene y seguridad alimentaria al personal de transporte, según lo previsto por los Reglamentos (CE) 852/2004 y 853/2004?",
  },
  'svc-7': {
    it: "Per il trasporto a temperatura controllata, l'azienda dispone di un sistema che garantisce il monitoraggio, la registrazione e la tracciabilità della temperatura del veicolo per ogni singola spedizione? In caso affermativo, indicare nelle Note il sistema utilizzato e allegare la procedura/istruzione aziendale che disciplina il monitoraggio e il controllo della temperatura durante il trasporto.\n\nINFO: International Food Pivot si riserva il diritto di richiedere, a campione durante il rapporto di fornitura, la registrazione/traccia della temperatura relativa a una o più spedizioni specifiche al fine di verificare la conformità alle condizioni di trasporto richieste.",
    fr: "Pour le transport à température contrôlée, l'entreprise dispose-t-elle d'un système garantissant le suivi, l'enregistrement et la traçabilité de la température du véhicule pour chaque expédition individuelle ? Si oui, indiquez dans les Notes le système utilisé et joignez la procédure/instruction de l'entreprise régissant le suivi et le contrôle de la température pendant le transport.\n\nINFO : International Food Pivot se réserve le droit de demander, à titre d'échantillonnage pendant la relation d'approvisionnement, l'enregistrement/la trace de température relative à une ou plusieurs expéditions spécifiques afin de vérifier la conformité aux conditions de transport requises.",
    es: "Para el transporte a temperatura controlada, ¿dispone la empresa de un sistema que garantice el seguimiento, registro y trazabilidad de la temperatura del vehículo para cada envío individual? En caso afirmativo, indique en las Notas el sistema utilizado y adjunte el procedimiento/instrucción de la empresa que regula el seguimiento y control de la temperatura durante el transporte.\n\nINFO: International Food Pivot se reserva el derecho de solicitar, de forma muestral durante la relación de suministro, el registro/traza de temperatura relativo a uno o varios envíos específicos con el fin de verificar el cumplimiento de las condiciones de transporte requeridas.",
  },
  'svc-8': {
    it: "Disponete di un programma di pulizia per i vani di carico dei veicoli utilizzati per i nostri trasporti?",
    fr: "Disposez-vous d'un programme de nettoyage pour les compartiments de chargement des véhicules utilisés pour nos transports ?",
    es: "¿Dispone de un programa de limpieza para los compartimentos de carga de los vehículos utilizados para nuestros transportes?",
  },
  'svc-9': {
    it: "In caso affermativo, vengono conservate le registrazioni di tali attività di pulizia?",
    fr: "Si oui, des enregistrements de ces activités de nettoyage sont-ils conservés ?",
    es: "En caso afirmativo, ¿se conservan los registros de dichas actividades de limpieza?",
  },
  'moca-1': {
    it: "L'azienda produce materiali e oggetti destinati a contatto con alimenti in conformità al Regolamento (CE) 2023/2006 e applica le Buone Pratiche di Fabbricazione (GMP)?",
    fr: "L'entreprise fabrique-t-elle des matériaux et objets destinés au contact alimentaire conformément au Règlement (CE) 2023/2006 et applique-t-elle les Bonnes Pratiques de Fabrication (BPF) ?",
    es: "¿La empresa fabrica materiales y objetos destinados a entrar en contacto con alimentos conforme al Reglamento (CE) 2023/2006 y aplica las Buenas Prácticas de Fabricación (BPF)?",
  },
  'moca-2': {
    it: "Siete certificati secondo BRCGS Packaging Materials, AIB, FEFCO, EN 15593 o altri standard pertinenti? In caso affermativo, indicare nelle Note la certificazione posseduta.",
    fr: "Êtes-vous certifiés selon BRCGS Packaging Materials, AIB, FEFCO, EN 15593 ou d'autres normes pertinentes ? Si oui, indiquez dans les Notes la certification détenue.",
    es: "¿Está certificado según BRCGS Packaging Materials, AIB, FEFCO, EN 15593 u otras normas pertinentes? En caso afirmativo, indique en las Notas la certificación que posee.",
  },
  'moca-3': {
    it: "L'azienda dispone di un sistema di gestione della disinfestazione (pest control)? Allegare il relativo documento.",
    fr: "L'entreprise applique-t-elle un système de gestion de la lutte antiparasitaire ? Joindre le document correspondant.",
    es: "¿La empresa cuenta con un sistema de control de plagas? Adjunte el documento correspondiente.",
  },
  'moca-4': {
    it: "Disponete di un sistema di identificazione del lotto? In caso affermativo, come identificate il lotto e qual è il significato/la decodifica del codice lotto? Inserire la decodifica nelle Note e, se disponibile, allegare la procedura.",
    fr: "Disposez-vous d'un système d'identification du lot ? Si oui, comment identifiez-vous le lot et quelle est la signification/le décodage du code de lot ? Indiquez le décodage dans les Notes et, si disponible, joignez la procédure.",
    es: "¿Dispone de un sistema de identificación del lote? En caso afirmativo, ¿cómo identifica el lote y cuál es el significado/la decodificación del código de lote? Introduzca la decodificación en las Notas y, si está disponible, adjunte el procedimiento.",
  },
  'moca-6': {
    it: "Disponete di un sistema/procedura per la taratura degli strumenti di misura e monitoraggio di prodotto e di processo, che garantisca la tracciabilità dei risultati rispetto a strumenti di riferimento tarati ACCREDIA o equivalenti?",
    fr: "Disposez-vous d'un système/d'une procédure d'étalonnage des équipements de mesure et de surveillance du produit et du procédé, garantissant la traçabilité des résultats par rapport à des équipements de référence étalonnés ACCREDIA ou équivalents ?",
    es: "¿Dispone de un sistema/procedimiento para la calibración de los equipos de medición y seguimiento de producto y proceso, que garantice la trazabilidad de los resultados respecto a equipos de referencia calibrados por ACCREDIA o equivalentes?",
  },
  'moca-7': {
    it: "Eseguite periodicamente test di migrazione/cessione sugli articoli a noi forniti o su articoli simili/rappresentativi? In caso affermativo, allegare il rapporto di prova/certificato disponibile.",
    fr: "Effectuez-vous périodiquement des essais de migration/cession sur les articles qui nous sont fournis ou sur des articles similaires/représentatifs ? Si oui, joignez le rapport d'essai/certificat disponible.",
    es: "¿Realiza periódicamente ensayos de migración/cesión sobre los artículos que nos suministra o sobre artículos similares/representativos? En caso afirmativo, adjunte el informe de ensayo/certificado disponible.",
  },
  'moca-8': {
    it: "I test di migrazione/cessione sono eseguiti da un laboratorio accreditato ACCREDIA o equivalente, ove applicabile? In caso affermativo, indicare nelle Note il laboratorio utilizzato.",
    fr: "Les essais de migration/cession sont-ils réalisés par un laboratoire accrédité ACCREDIA ou équivalent, le cas échéant ? Si oui, indiquez dans les Notes le laboratoire utilisé.",
    es: "¿Los ensayos de migración/cesión son realizados por un laboratorio acreditado por ACCREDIA o equivalente, cuando corresponda? En caso afirmativo, indique en las Notas el laboratorio utilizado.",
  },
};

const IMPEGNI_C_SECTION_TRANSLATIONS = {
  'LABORATORY / RETAINED SAMPLES': { it: 'LABORATORIO / CAMPIONI TRATTENUTI', fr: 'LABORATOIRE / ÉCHANTILLONS TÉMOINS', es: 'LABORATORIO / MUESTRAS RETENIDAS' },
  'TRAINING': { it: 'FORMAZIONE', fr: 'FORMATION', es: 'FORMACIÓN' },
  'TRANSPORT / LOGISTICS': { it: 'TRASPORTO / LOGISTICA', fr: 'TRANSPORT / LOGISTIQUE', es: 'TRANSPORTE / LOGÍSTICA' },
  'VEHICLE CLEANING': { it: 'PULIZIA DEI VEICOLI', fr: 'NETTOYAGE DES VÉHICULES', es: 'LIMPIEZA DE VEHÍCULOS' },
  'GMP AND CERTIFICATIONS': { it: 'GMP E CERTIFICAZIONI', fr: 'BPF ET CERTIFICATIONS', es: 'BPF Y CERTIFICACIONES' },
  'SITE HYGIENE': { it: 'IGIENE DELLO STABILIMENTO', fr: 'HYGIÈNE DU SITE', es: 'HIGIENE DE LA PLANTA' },
  'LOT IDENTIFICATION': { it: 'IDENTIFICAZIONE DEL LOTTO', fr: 'IDENTIFICATION DU LOT', es: 'IDENTIFICACIÓN DEL LOTE' },
  'MEASURING EQUIPMENT': { it: 'STRUMENTI DI MISURA', fr: 'ÉQUIPEMENTS DE MESURE', es: 'EQUIPOS DE MEDICIÓN' },
  'MIGRATION / RELEASE TESTING': { it: 'TEST DI MIGRAZIONE / CESSIONE', fr: 'ESSAIS DE MIGRATION / CESSION', es: 'ENSAYOS DE MIGRACIÓN / CESIÓN' },
};

// Contenuto di riferimento di Dichiarazione A (OGM/Etichettatura/Impegni) e
// Dichiarazione B (Parametri di Qualità): stesso testo gia' presente (ma mai
// collegato al DB) in client/src/constants/defaults.js, portato 1:1 dal
// vecchio file dell'app originale — gia' tradotto in tutte e 4 le lingue.
// Seminato SOLO se la rispettiva tabella e' vuota (vedi piu' sotto), stesso
// criterio usato per il Questionario: non deve mai sovrascrivere dichiarazioni
// gia' modificate/aggiunte dall'admin.
const DEFAULT_IMPEGNI_A = [
  { id: 'impA_0', it: "1) L'Azienda Fornitrice si impegna ad utilizzare esclusivamente ingredienti, additivi e coadiuvanti tecnologici esenti da OGM o da derivati di OGM, in stretta ottemperanza ai Regolamenti CE 1829/2003 e 1830/2003, impegnandosi inoltre a comunicare tempestivamente in forma scritta qualsiasi futura variazione a tale stato.", en: "1) The Supplying Company undertakes to exclusively use ingredients, additives, and processing aids free from GMOs or GMO derivatives, in strict compliance with EC Regulations 1829/2003 and 1830/2003, and also undertakes to promptly communicate in writing any future change to this status.", fr: "1) L'Entreprise Fournisseur s'engage à utiliser exclusivement des ingrédients, additifs et auxiliaires technologiques exempts d'OGM ou de dérivés d'OGM, en stricte conformité avec les Règlements CE 1829/2003 e 1830/2003, s'engageant également à communiquer rapidement par écrit tout changement futur de ce statut.", es: "1) La Empresa Proveedora se compromete a utilizar exclusivamente ingredientes, aditivos y coadyuvantes tecnológicos libres de OGM o derivados de OGM, en estricto cumplimiento de los Reglamentos CE 1829/2003 y 1830/2003, comprometiéndose también a comunicar rápidamente por escrito cualquier cambio futuro en este estado." },
  { id: 'impA_1', it: "2) L'Azienda Fornitrice dichiara di aver implementato e di mantenere attive procedure e precauzioni preventive, integrate nel proprio sistema di autocontrollo e nelle procedure aziendali, finalizzate a prevenire e ridurre al minimo il rischio di commistione/contaminazione involontaria con materiali contenenti OGM durante i processi di stoccaggio, lavorazione e trasporto, in conformità ai Regolamenti (CE) 1829/2003 e 1830/2003.", en: "2) The Supplying Company declares that it has implemented and maintains active preventive procedures and precautions, integrated into its self-control system and corporate procedures, aimed at preventing and minimizing the risk of involuntary mixing/contamination with materials containing GMOs during storage, processing and transport processes, in compliance with Regulations (EC) 1829/2003 and 1830/2003.", fr: "2) L'entreprise fournisseuse déclare avoir mis en œuvre et maintenir des procédures et des précautions préventives, intégrées dans son système d'autocontrôle et ses procédures d'entreprise, visant à prévenir et à minimiser le risque de mélange/contamination involontaire avec des matériaux contenant des OGM lors des processus de stockage, de transformation et de transport, conformément aux règlements (CE) 1829/2003 et 1830/2003.", es: "2) La Empresa Proveedora declara haber implementado y mantener procedimientos y precauciones preventivas, integradas en su sistema de autocontrol y procedimientos corporativos, con el objetivo de prevenir y minimizar el riesgo de mezcla/contaminación involuntaria con materiales que contienen OGM durante los procesos de almacenamiento, procesamiento y transporte, de acuerdo con los Reglamentos (CE) 1829/2003 y 1830/2003." },
  { id: 'impA_2', it: "3) L'Azienda Fornitrice dichiara di predisporre, aggiornare regolarmente e condividere un'analisi dei pericoli igienico-sanitari (HACCP) e di applicare un sistema di qualifica e monitoraggio dei propri sub-fornitori, mediante procedure documentate e controlli periodici, al fine di assicurare la conformità e la sicurezza dei prodotti lungo la filiera a monte.", en: "3) The Supplying Company declares to prepare, regularly update and share an analysis of hygienic-sanitary hazards (HACCP) and to apply a qualification and monitoring system of its sub-suppliers, through documented procedures and periodic checks, in order to ensure the compliance and safety of products along the upstream supply chain.", fr: "3) L'entreprise fournisseuse déclare préparer, mettre à jour régulièrement et partager une analyse des risques hygiéno-sanitaires (HACCP) et appliquer un système de qualification et de suivi de ses sous-traitants, au moyen de procédures documentées et de contrôles périodiques, afin de garantir la conformité et la sécurité des produits tout au long de la chaîne d'approvisionnement en amont.", es: "3) La Empresa Proveedora declara preparar, actualizar regularmente y compartir un análisis de peligros higiénico-sanitarios (HACCP) y aplicar un sistema de calificación y monitoreo de sus subproveedores, mediante procedimientos documentados y controles periódicos, con el fin de asegurar el cumplimiento y la seguridad de los productos a lo largo de la cadena de suministro ascendente." },
  { id: 'impA_3', it: "4) L'Azienda Fornitrice dichiara di applicare rigorosamente tutte le procedure, le separazioni temporali/spaziali e i protocolli di sanificazione validati previsti dal proprio piano HACCP per scongiurare il rischio di cross-contaminazione accidentale da ALLERGENI (Reg. UE 1169/2011) tutelando il consumatore finale.", en: "4) The Supplying Company declares to strictly apply all the procedures, temporal/spatial separations, and validated sanitization protocols foreseen by its HACCP plan to prevent the risk of accidental cross-contamination by ALLERGENS (EU Reg. 1169/2011) protecting the final consumer.", fr: "4) L'Entreprise Fournisseur déclare appliquer rigoureusement toutes les procédures, séparations temporelles/spatiales et protocoles de nettoyage validés prévus par son plan HACCP pour prévenir le risque de contamination croisée accidentelle par des ALLERGÈNES (Règ. UE 1169/2011) protégeant le consommateur final.", es: "4) La Empresa Proveedora declara aplicar rigurosamente todos los procedimientos, separaciones temporales/espaciales y protocolos de limpieza validados previstos por su plan APPCC para prevenir el riesgo de contaminación cruzada accidental por ALÉRGENOS (Reg. UE 1169/2011) protegiendo al consumidor final." }
];

const DEFAULT_IMPEGNI_B = [
  { id: 'validazioneProd', title_it: "Validazione dei Processi Produttivi", desc_it: "L'Azienda Fornitrice garantisce formalmente che tutti i processi di produzione, confezionamento, stoccaggio e manipolazione sono regolarmente validati, costantemente monitorati e documentati secondo le normative igienico-sanitarie vigenti (Pacchetto Igiene) e nel rispetto dei parametri definiti dai severi standard di certificazione volontaria adottati.", title_en: "Validation of Production Processes", desc_en: "The Supplying Company formally guarantees that all production, packaging, storage, and handling processes are regularly validated, constantly monitored, and documented according to the hygiene and sanitary regulations in force (Hygiene Package) and in compliance with the parameters defined by the strict voluntary certification standards adopted.", title_fr: "Validation des Processus de Production", desc_fr: "L'Entreprise Fournisseur garantit formellement que tous processus de production, conditionnement, stockage et manipulation sont régulièrement validés, constamment surveillés et documentés conformément à la réglementation en matière d'hygiène en vigueur (Paquet Hygiène) et dans le respect des paramètres définis par les normes de certification volontaires strictes adoptées.", title_es: "Validación de los Procesos de Producción", desc_es: "La Empresa Proveedora garantiza formalmente que todos los procesos de producción, envasado, almacenamiento y manipulación se validan regularmente, se supervisan constantemente y se documentan de acuerdo con las normativas higiénico-sanitarias vigentes (Paquete de Higiene) y en cumplimiento de los parámetros definidos por los estrictos estándares de certificación voluntaria adoptados." },
  { id: 'validazioneTras', title_it: "Sicurezza, Igiene e Trasporti a Temperatura Controllata", desc_it: "L'Azienda Fornitrice garantisce che i mezzi di trasporto utilizzati per le consegne in entrata e in uscita rispettano i più rigidi requisiti igienico-sanitari (HACCP). Viene garantito senza interruzioni il mantenimento della catena del freddo o delle temperature specifiche richieste per la conservazione ottimale del prodotto. I veicoli sono inoltre assoggettati a regolari e documentati piani di pulizia e sanificazione.", title_en: "Safety, Hygiene, and Temperature-Controlled Transport", desc_en: "The Supplying Company guarantees that the means of transport used for incoming and outgoing deliveries meet the strictest hygiene and sanitary requirements (HACCP). The maintenance of the cold chain or specific temperatures required for optimal product conservation is guaranteed without interruption. Vehicles are also subjected to regular and documented cleaning and sanitization plans.", title_fr: "Sécurité, Hygiène et Transport sous Température Contrôlée", desc_fr: "L'Entreprise Fournisseur garantit que les moyens de transport utilisés pour les livraisons entrantes et sortantes respectent les exigences hygiéno-sanitaires les plus strictes (HACCP). Le maintien de la chaîne du froid ou des températures spécifiques requises pour une conservation optimale du produit est garanti sans interruption. Les véhicules sont également soumis à des plans de nettoyage et d'assainissement réguliers et documentés.", title_es: "Seguridad, Higiene y Transporte a Temperatura Controlada", desc_es: "La Empresa Proveedora garantiza que los medios de transporte utilizados para las entregas entrantes y salientes cumplen con los requisitos higiénico-sanitarios más estrictos (APPCC). Se garantiza sin interrupción el mantenimiento de la cadena de frío o de las temperaturas específicas requeridas para la conservación óptima del producto. Los vehículos también están sujetos a planes de limpieza y desinfección regulares y documentados." },
  { id: 'rintracciabilita', title_it: "Rintracciabilità Integrale (Reg. CE 178/2002)", desc_it: "L'Azienda Fornitrice garantisce l'implementazione e l'efficacia di un sistema strutturato di rintracciabilità (in conformità al Regolamento CE 178/2002), in grado di identificare biunivocamente e in qualsiasi momento il lotto specifico di materia prima, del materiale di imballaggio primario e del prodotto finito. Si garantisce l'esecuzione di simulazioni di ritiro/richiamo dal mercato con cadenza almeno annuale.", title_en: "Full Traceability (EC Reg. 178/2002)", desc_en: "The Supplying Company guarantees the implementation and effectiveness of a structured traceability system (in compliance with EC Reg. 178/2002), capable of uniquely identifying at any time the specific batch of raw material, primary packaging material, and finished product. The execution of market withdrawal/recall simulations is guaranteed at least annually.", title_fr: "Traçabilité Intégrale (Règ. CE 178/2002)", desc_fr: "L'Entreprise Fournisseur garantit la mise en œuvre et l'efficacité d'un système de traçabilité structuré (conformément au Règlement CE 178/2002), capable d'identifier de manière univoque et à tout moment le lot spécifique de matière première, de matériau d'emballage primaire et de produit fini. L'exécution de simulations de retrait/rappel du marché est garantie au moins annuellement.", title_es: "Trazabilidad Integral (Reg. CE 178/2002)", desc_es: "La Empresa Proveedora garantiza la implementación y eficacia de un sistema de trazabilidad estructurado (de conformidad con el Reg. CE 178/2002), capaz de identificar de forma inequívoca y en cualquier momento el lote específico de materia prima, material de embalaje primario y producto terminado. Se garantiza la ejecución de simulacros de retirada/recuperación del mercado al menos anualmente." }
];

// I 14 allergeni regolamentati (Reg. UE 1169/2011, Allegato II), usati dalla
// griglia allergeni company-wide in Dichiarazione A. Stesso testo gia'
// presente (ma mai collegato al DB) in ALLERGENI_DETTAGLIATI dentro
// client/src/constants/defaults.js — gia' tradotto in tutte e 4 le lingue.
// Seminato SOLO se la tabella allergens e' vuota, stesso criterio delle altre.
const DEFAULT_ALLERGENI = [
  { id: '0', it: "Cereali contenenti glutine (grano, segale, orzo, avena, farro, kamut o i loro ceppi ibridati) e prodotti derivati", en: "Cereals containing gluten (wheat, rye, barley, oats, spelt, kamut or their hybridised strains) and products thereof", fr: "Céréales contenant du gluten (blé, seigle, orge, avoine, épeautre, kamut ou leurs souches hybridées) et produits à base de ces céréales", es: "Cereales que contengan gluten (trigo, centeno, cebada, avena, espelta, kamut o sus variedades híbridas) y productos derivados" },
  { id: '1', it: "Crostacei e prodotti a base di crostacei", en: "Crustaceans and products thereof", fr: "Crustacés et produits à base de crustacés", es: "Crustáceos y productos a base de crustáceos" },
  { id: '2', it: "Uova e prodotti a base di uova", en: "Eggs and products thereof", fr: "Œufs et produits à base d'œufs", es: "Huevos y productos a base de huevo" },
  { id: '3', it: "Pesce e prodotti a base di pesce", en: "Fish and products thereof", fr: "Poissons et produits à base de poissons", es: "Pescado y productos a base de pescado" },
  { id: '4', it: "Arachidi e prodotti a base di arachidi", en: "Peanuts and products thereof", fr: "Arachides et produits à base d'arachides", es: "Cacahuetes y productos a base de cacahuetes" },
  { id: '5', it: "Soia e prodotti a base di soia", en: "Soybeans and products thereof", fr: "Soja et produits à base de soja", es: "Soja y productos a base de soja" },
  { id: '6', it: "Latte e prodotti a base di latte (incluso lattosio)", en: "Milk and products thereof (including lactose)", fr: "Lait et produits à base de lait (y compris le lactose)", es: "Leche y sus derivados (incluida la lactosa)" },
  { id: '7', it: "Frutta a guscio (mandorle, nocciole, noci, noci di acagiù, noci di pecan, noci del Brasile, pistacchi, noci macadamia) e prodotti derivati", en: "Nuts, namely: almonds, hazelnuts, walnuts, cashews, pecan nuts, Brazil nuts, pistachio nuts, macadamia and products thereof", fr: "Fruits à coque, à savoir: amandes, noisettes, noix, noix de cajou, noix de pécan, noix du Brésil, pistaches, noix de Macadamia et produits à base de ces fruits", es: "Frutos de cáscara, es decir: almendras, avellanas, nueces, anacardos, pacanas, nueces de Brasil, alfóncigos, nueces macadamia y productos derivados" },
  { id: '8', it: "Sedano e prodotti a base di sedano", en: "Celery and products thereof", fr: "Céleri et produits à base de céleri", es: "Apio y productos derivados" },
  { id: '9', it: "Senape e prodotti a base di senape", en: "Mustard and products thereof", fr: "Moutarde et produits à base de moutarde", es: "Mostaza y productos derivados" },
  { id: '10', it: "Semi di sesamo e prodotti a base di semi di sesamo", en: "Sesame seeds and products thereof", fr: "Graines de sésame et produits à base de graines de sésame", es: "Granos de sésamo y productos a base de granos de sésamo" },
  { id: '11', it: "Anidride solforosa e solfiti (in concentrazioni superiori a 10 mg/kg o 10 mg/litro espressi come SO2 totale)", en: "Sulphur dioxide and sulphites at concentrations of more than 10 mg/kg or 10 mg/litre in terms of the total SO2", fr: "Anhydride sulfureux et sulfites en concentrations de plus de 10 mg/kg ou 10 mg/litre en termes de SO2 total", es: "Dióxido de azufre y sulfitos en concentraciones superiores a 10 mg/kg o 10 mg/litro en términos de SO2 total" },
  { id: '12', it: "Lupini e prodotti a base di lupini", en: "Lupin and products thereof", fr: "Lupin et produits à base de lupin", es: "Altramuces y productos a base de altramuces" },
  { id: '13', it: "Molluschi e prodotti a base di molluschi", en: "Molluscs and products thereof", fr: "Mollusques et produits à base de mollusques", es: "Moluscos y productos a base de moluscos" },
];

// MySQL (a differenza di MariaDB) non supporta "ALTER TABLE ... ADD COLUMN
// IF NOT EXISTS": per aggiungere colonne a tabelle create da versioni
// precedenti di schema.sql in modo idempotente, si verifica prima la loro
// esistenza via information_schema.
async function addColumnIfMissing(connection, dbName, table, column, definition) {
  const [rows] = await connection.query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [dbName, table, column]
  );
  if (rows.length) return;
  await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

// Esegue schema.sql (crea database + tabelle) e poi semina gli account di
// default con password hashate (bcrypt non è disponibile in SQL puro).
// Esportata come funzione (invece che IIFE auto-eseguita) così può essere
// chiamata sia da riga di comando ("npm run db:init") sia da app.js
// all'avvio del server: su Railway il "pre-deploy command" gira in un
// contesto separato dove le reference variable del plugin MySQL non sono
// sempre risolte, mentre il servizio web avviato con `node server/app.js`
// le riceve correttamente iniettate.
async function initDb() {
  console.log('🔍 Environment variables:');
  console.log(`   DB_HOST=${process.env.DB_HOST || 'localhost (default)'}`);
  console.log(`   DB_PORT=${process.env.DB_PORT || '3306 (default)'}`);
  console.log(`   DB_USER=${process.env.DB_USER || 'root (default)'}`);
  console.log(`   DB_PASSWORD=${process.env.DB_PASSWORD ? '***' : '(empty)'}`);
  console.log(`   DB_NAME=${process.env.DB_NAME || 'food_quality_manager (default)'}`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    charset: 'utf8mb4'
  });

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schema);

    const dbName = process.env.DB_NAME || 'food_quality_manager';
    await connection.changeUser({ database: dbName });

    // Colonne aggiunte a impegni_c dopo la creazione iniziale della tabella
    // (vedi commento in schema.sql): idempotente, sicura da rieseguire ad ogni boot.
    await addColumnIfMissing(connection, dbName, 'impegni_c', 'section', 'TEXT NULL');
    await addColumnIfMissing(connection, dbName, 'impegni_c', 'allow_attachment', 'TINYINT(1) NOT NULL DEFAULT 0');
    await addColumnIfMissing(connection, dbName, 'impegni_c', 'section_en', 'TEXT NULL');
    await addColumnIfMissing(connection, dbName, 'impegni_c', 'section_fr', 'TEXT NULL');
    await addColumnIfMissing(connection, dbName, 'impegni_c', 'section_es', 'TEXT NULL');
    await addColumnIfMissing(connection, dbName, 'qual_raw_materials', 'notes', 'TEXT NULL');
    await addColumnIfMissing(connection, dbName, 'suppliers', 'qualification_status', "VARCHAR(50) NOT NULL DEFAULT 'not_qualified'");
    await addColumnIfMissing(connection, dbName, 'suppliers', 'qualification_notes', 'TEXT NULL');

    // --- Dichiarazione A (OGM/Etichettatura/Impegni): seminata SOLO se la
    // tabella e' vuota, stesso criterio del Questionario — non deve mai
    // sovrascrivere impegni gia' modificati/aggiunti dall'admin.
    const [impegniARows] = await connection.query('SELECT COUNT(*) AS n FROM impegni_a');
    if (impegniARows[0].n === 0) {
      for (let i = 0; i < DEFAULT_IMPEGNI_A.length; i++) {
        const item = DEFAULT_IMPEGNI_A[i];
        // eslint-disable-next-line no-await-in-loop
        await connection.query(
          'INSERT INTO impegni_a (id, it, en, fr, es, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
          [item.id, item.it, item.en, item.fr, item.es, i]
        );
      }
      console.log(`   Dichiarazione A: ${DEFAULT_IMPEGNI_A.length} impegni di riferimento inseriti (tabella impegni_a era vuota).`);
    }

    // --- Dichiarazione B (Parametri di Qualita'): stesso criterio.
    const [impegniBRows] = await connection.query('SELECT COUNT(*) AS n FROM impegni_b');
    if (impegniBRows[0].n === 0) {
      for (let i = 0; i < DEFAULT_IMPEGNI_B.length; i++) {
        const item = DEFAULT_IMPEGNI_B[i];
        // eslint-disable-next-line no-await-in-loop
        await connection.query(
          `INSERT INTO impegni_b (id, title_it, desc_it, title_en, desc_en, title_fr, desc_fr, title_es, desc_es, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.id, item.title_it, item.desc_it, item.title_en, item.desc_en, item.title_fr, item.desc_fr, item.title_es, item.desc_es, i]
        );
      }
      console.log(`   Dichiarazione B: ${DEFAULT_IMPEGNI_B.length} parametri di riferimento inseriti (tabella impegni_b era vuota).`);
    }

    // --- Griglia Allergeni (Dichiarazione A): stesso criterio.
    const [allergeniRows] = await connection.query('SELECT COUNT(*) AS n FROM allergens');
    if (allergeniRows[0].n === 0) {
      for (let i = 0; i < DEFAULT_ALLERGENI.length; i++) {
        const item = DEFAULT_ALLERGENI[i];
        // eslint-disable-next-line no-await-in-loop
        await connection.query(
          'INSERT INTO allergens (id, it, en, fr, es, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
          [item.id, item.it, item.en, item.fr, item.es, i]
        );
      }
      console.log(`   Griglia Allergeni: ${DEFAULT_ALLERGENI.length} allergeni di riferimento inseriti (tabella allergens era vuota).`);
    }

    // --- Questionario (impegni_c): seminato SOLO se la tabella e' vuota, mai
    // se contiene gia' qualcosa (anche una sola domanda di test) — l'admin
    // deve poter svuotare/modificare la lista senza che riappaia da sola ad
    // ogni riavvio del server.
    const [impegniCRows] = await connection.query('SELECT COUNT(*) AS n FROM impegni_c');
    if (impegniCRows[0].n === 0) {
      for (let i = 0; i < DEFAULT_IMPEGNI_C.length; i++) {
        const q = DEFAULT_IMPEGNI_C[i];
        // eslint-disable-next-line no-await-in-loop
        await connection.query(
          `INSERT INTO impegni_c (id, it, en, fr, es, section, section_en, section_fr, section_es, allow_attachment, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [q.id, q.text, q.text, q.text, q.text, q.section, q.section, q.section, q.section, q.allowAttachment ? 1 : 0, i]
        );
      }
      console.log(`   Questionario: ${DEFAULT_IMPEGNI_C.length} domande di riferimento inserite (tabella impegni_c era vuota).`);
    }

    // --- Fix dati: il seed originale (sopra, o su un deploy precedente)
    // scriveva lo stesso testo inglese in it/en/fr/es come placeholder,
    // perche' il cliente aveva fornito il questionario solo in inglese —
    // risultato: cambiare lingua su /qualifica non cambiava il testo
    // mostrato. Qui si sostituiscono it/fr/es (e section/section_fr/
    // section_es) con traduzioni vere, ma SOLO per le righe con it === en
    // (segno che nessuno le ha gia' personalizzate dall'admin) — idempotente
    // e sicura da rieseguire ad ogni boot, anche su Railway.
    const [impegniCToFix] = await connection.query('SELECT id, it, en, section_en FROM impegni_c');
    let fixedCount = 0;
    for (const row of impegniCToFix) {
      if (row.it !== row.en) continue;
      const q = IMPEGNI_C_TRANSLATIONS[row.id];
      if (!q) continue;
      const sec = IMPEGNI_C_SECTION_TRANSLATIONS[row.section_en];
      // eslint-disable-next-line no-await-in-loop
      await connection.query(
        sec
          ? 'UPDATE impegni_c SET it = ?, fr = ?, es = ?, section = ?, section_fr = ?, section_es = ? WHERE id = ?'
          : 'UPDATE impegni_c SET it = ?, fr = ?, es = ? WHERE id = ?',
        sec ? [q.it, q.fr, q.es, sec.it, sec.fr, sec.es, row.id] : [q.it, q.fr, q.es, row.id]
      );
      fixedCount += 1;
    }
    if (fixedCount) {
      console.log(`   Questionario: ${fixedCount} domande aggiornate con traduzioni reali IT/FR/ES (erano identiche a EN).`);
    }

    // --- Fornitori di test/demo (come nel vecchio client Firebase) ---
    const seedSuppliers = [
      { id: 'test-profile-sys', name: 'TEST', qualPass: 'test', techPass: 'test' },
      { id: 'demo-profile-sys', name: 'DEMO', qualPass: '1', techPass: '1' }
    ];

    for (const s of seedSuppliers) {
      const [rows] = await connection.query('SELECT id FROM suppliers WHERE id = ?', [s.id]);
      if (rows.length) continue; // non sovrascrivere password già impostate/cambiate
      const qualHash = await bcrypt.hash(s.qualPass, SALT_ROUNDS);
      const techHash = await bcrypt.hash(s.techPass, SALT_ROUNDS);
      await connection.query(
        'INSERT INTO suppliers (id, name, qual_pass, tech_pass, status) VALUES (?, ?, ?, ?, ?)',
        [s.id, s.name, qualHash, techHash, 'active']
      );
    }

    const adminUsername = process.env.ADMIN_DEFAULT_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || '0404';

    const [adminRows] = await connection.query('SELECT id FROM admins WHERE username = ?', [adminUsername]);
    if (!adminRows.length) {
      const adminHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
      await connection.query(
        'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
        [adminUsername, adminHash]
      );
    }

    console.log('✅ Database "food_quality_manager", tabelle e account di default creati/verificati con successo.');
    console.log(`   Admin: ${adminUsername} / ${adminRows.length ? '(esistente, non modificato)' : adminPassword}`);
    console.log('   Fornitori seed: TEST/test/test, DEMO/1/1 (solo se non già presenti)');

    // Eseguiamo la traduzione per eventuali record che non hanno ancora i campi multilingua popolati
    // (come richiesto, non tocchiamo i dati compilati dai fornitori, ma solo i template).
    try {
      const settingsService = require('./services/settingsService');
      const translationService = require('./services/translationService');
      if (translationService.isAiConfigured()) {
        console.log('🔄 Avvio seeder traduzioni per record mancanti (impegni_a, impegni_b, impegni_c, allergens)...');
        const summary = await settingsService.translateMissingInStore();
        console.log('   Report traduzioni effettuate:', summary);
      } else {
        console.log('⚠️ Traduzione AI non configurata, salto il seeder traduzioni.');
      }
    } catch (e) {
      console.error('⚠️ Errore durante il seeder traduzioni:', e.message);
    }

  } finally {
    await connection.end();
    try {
      const pool = require('./db');
      await pool.end();
    } catch(e) {
      // Ignora, pool potrebbe non essere stato inizializzato
    }
  }
}

module.exports = { initDb };

// Eseguito solo quando lanciato direttamente ("npm run db:init"), non
// quando importato da app.js.
if (require.main === module) {
  initDb().catch((err) => {
    console.error('❌ Errore inizializzazione database:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  });
}

