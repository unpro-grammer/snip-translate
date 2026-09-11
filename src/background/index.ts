import type {
  ExtensionMessage,
  OcrRequest,
  OcrResponse,
  Rect,
  StartSelectionMessage,
  TranslateRegionRequest,
  TranslateRegionResponse,
} from "../lib/messages";
import { LANGUAGES } from "../lib/languages";
import { getSettings } from "../lib/storage";
import { translateText } from "../lib/translate";
import { ocrWithOcrSpace } from "../lib/ocrSpace";

function resolveOcrLang(originLang: string): string {
  if (originLang === "auto") {
    return "eng";
  }
  return (
    LANGUAGES.find((l) => l.translateCode === originLang)?.tesseractCode ??
    "eng"
  );
}

function resolveOcrSpaceLang(originLang: string): string | undefined {
  if (originLang === "auto") {
    return "auto";
  }
  return LANGUAGES.find((l) => l.translateCode === originLang)?.ocrSpaceCode;
}

const OFFSCREEN_URL = "src/offscreen/index.html";

async function ensureOffscreenDocument(): Promise<void> {
  const existing = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)],
  });
  if (existing.length > 0) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: [chrome.offscreen.Reason.WORKERS, chrome.offscreen.Reason.BLOBS],
    justification: "Run Tesseract.js OCR on a cropped screenshot region.",
  });
}

const OCR_MAX_DIMENSION = 2200;
const OCR_UPSCALE = 2;

async function cropToDataUrl(fullDataUrl: string, rect: Rect): Promise<string> {
  const blob = await (await fetch(fullDataUrl)).blob();
  const bitmap = await createImageBitmap(blob);

  const sx = rect.x * rect.dpr;
  const sy = rect.y * rect.dpr;
  const sw = rect.width * rect.dpr;
  const sh = rect.height * rect.dpr;

  let scale = OCR_UPSCALE;
  if (Math.max(sw, sh) * scale > OCR_MAX_DIMENSION) {
    scale = Math.max(1, OCR_MAX_DIMENSION / Math.max(sw, sh));
  }
  const dw = Math.round(sw * scale);
  const dh = Math.round(sh * scale);

  const canvas = new OffscreenCanvas(dw, dh);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get 2D context for cropping");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.filter = "grayscale(1) contrast(1.4) brightness(1.05)";
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, dw, dh);

  const croppedBlob = await canvas.convertToBlob({ type: "image/png" });
  return blobToDataUrl(croppedBlob);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function sendToOffscreen(
  req: OcrRequest,
  attempts = 10,
  delayMs = 100,
): Promise<OcrResponse> {
  for (let i = 0; i < attempts; i++) {
    try {
      return (await chrome.runtime.sendMessage(req)) as OcrResponse;
    } catch (err) {
      if (i === attempts - 1) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("unreachable");
}

async function runOcrViaTesseract(
  dataUrl: string,
  originLang: string,
): Promise<string> {
  await ensureOffscreenDocument();
  const ocrRequest: OcrRequest = {
    type: "ocr-image",
    dataUrl,
    lang: resolveOcrLang(originLang),
  };
  const ocrResponse = await sendToOffscreen(ocrRequest);
  if (!ocrResponse?.ok) {
    throw new Error(ocrResponse?.error ?? "No text found in that region.");
  }
  return ocrResponse.text ?? "";
}

async function runOcr(
  dataUrl: string,
  originLang: string,
  ocrSpaceApiKey: string,
): Promise<string> {
  const ocrSpaceLang = resolveOcrSpaceLang(originLang);
  if (ocrSpaceApiKey && ocrSpaceLang) {
    try {
      return await ocrWithOcrSpace(dataUrl, ocrSpaceLang, ocrSpaceApiKey);
    } catch (err) {
      console.warn(
        "[on-screen-translator] OCR.space failed, falling back to Tesseract:",
        err,
      );
    }
  }
  return runOcrViaTesseract(dataUrl, originLang);
}

async function handleTranslateRegion(
  rect: Rect,
  tabId: number,
): Promise<TranslateRegionResponse> {
  try {
    const settings = await getSettings();

    const windowId = (await chrome.tabs.get(tabId)).windowId;
    const fullDataUrl = await chrome.tabs.captureVisibleTab(windowId, {
      format: "png",
    });
    const croppedDataUrl = await cropToDataUrl(fullDataUrl, rect);

    const sourceText = await runOcr(
      croppedDataUrl,
      settings.originLang,
      settings.ocrSpaceApiKey,
    );

    if (!sourceText) {
      return {
        type: "translate-region-result",
        ok: false,
        error: "No text found in that region.",
      };
    }

    try {
      const { translatedText, detectedLang } = await translateText(
        sourceText,
        settings.originLang,
        settings.targetLang,
        settings.deeplApiKey || undefined,
      );
      return {
        type: "translate-region-result",
        ok: true,
        sourceText,
        translatedText,
        detectedLang,
      };
    } catch (err) {
      // OCR already succeeded, so still return the source text
      return {
        type: "translate-region-result",
        ok: true,
        sourceText,
        translationError:
          err instanceof Error ? err.message : "Translation failed.",
      };
    }
  } catch (err) {
    return {
      type: "translate-region-result",
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Something went wrong translating that region.",
    };
  }
}

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    if (message.type !== "translate-region") {
      return undefined;
    }
    const req = message as TranslateRegionRequest;
    const tabId = sender.tab?.id;
    if (tabId == null) {
      return undefined;
    }

    handleTranslateRegion(req.rect, tabId).then(sendResponse);
    return true;
  },
);

async function startSelectionInActiveTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return;
  }
  const msg: StartSelectionMessage = { type: "start-selection" };
  chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-snip-translate") {
    startSelectionInActiveTab();
  }
});
