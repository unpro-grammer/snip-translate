export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  dpr: number;
}

export interface TranslateRegionRequest {
  type: "translate-region";
  rect: Rect;
}

export interface TranslateRegionNoText {
  type: "translate-region-result";
  ok: false;
  error: string;
}

export interface TranslateRegionSuccess {
  type: "translate-region-result";
  ok: true;
  sourceText: string;
  translatedText?: string;
  translationError?: string;
  detectedLang?: string;
  provider?: string;
}

export type TranslateRegionResponse =
  | TranslateRegionNoText
  | TranslateRegionSuccess;

export interface StartSelectionMessage {
  type: "start-selection";
}

export interface RegionCapturedMessage {
  type: "region-captured";
}

export interface OcrRequest {
  type: "ocr-image";
  dataUrl: string;
  lang: string;
}

export interface OcrResponse {
  type: "ocr-result";
  ok: boolean;
  text?: string;
  error?: string;
}

export type ExtensionMessage =
  | TranslateRegionRequest
  | TranslateRegionResponse
  | StartSelectionMessage
  | RegionCapturedMessage
  | OcrRequest
  | OcrResponse;
