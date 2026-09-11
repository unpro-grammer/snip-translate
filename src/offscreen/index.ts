import { ocrImage } from "../lib/ocr";
import type {
  OcrRequest,
  OcrResponse,
  ExtensionMessage,
} from "../lib/messages";

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type !== "ocr-image") {
      return undefined;
    }
    const req = message as OcrRequest;

    ocrImage(req.dataUrl, req.lang)
      .then((text) => {
        const response: OcrResponse = { type: "ocr-result", ok: true, text };
        sendResponse(response);
      })
      .catch((err) => {
        const response: OcrResponse = {
          type: "ocr-result",
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
        sendResponse(response);
      });

    return true;
  },
);
