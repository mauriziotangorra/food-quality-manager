// Carica pdf.js da CDN al volo (serve solo per convertire la prima pagina di un
// PDF etichetta in un'anteprima immagine lato browser).
export const loadPdfJs = async () => {
  if (window.pdfjsLib) return window.pdfjsLib;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
      resolve(window.pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// Converte la prima pagina di un File PDF in un File immagine JPEG (per l'anteprima
// etichette). Ritorna un oggetto File pronto per essere passato a api.uploadFile.
export async function pdfFirstPageToImageFile(file) {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: context, viewport }).promise;

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
  const name = file.name.replace(/\.pdf$/i, " (Anteprima).jpg");
  return new File([blob], name, { type: "image/jpeg" });
}
