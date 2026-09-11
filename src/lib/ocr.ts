import * as Tesseract from "tesseract.js";

let workerPromise: Promise<Tesseract.Worker> | null = null;
let workerLang = "";

async function getWorker(lang: string): Promise<Tesseract.Worker> {
  if (workerPromise && workerLang === lang) {
    return workerPromise;
  }
  if (workerPromise) {
    const prev = await workerPromise;
    await prev.terminate();
  }
  workerLang = lang;
  workerPromise = Tesseract.createWorker(lang, 1, {
    workerPath: chrome.runtime.getURL("tesseract/worker.min.js"),
    workerBlobURL: false,
    corePath: chrome.runtime.getURL("tesseract/"),
    langPath: "https://tessdata.projectnaptha.com/4.0.0",
    cacheMethod: "write",
  });
  return workerPromise;
}

export async function ocrImage(dataUrl: string, lang: string): Promise<string> {
  const worker = await getWorker(lang);
  const {
    data: { text },
  } = await worker.recognize(dataUrl);
  return text.trim();
}
