export interface Settings {
  originLang: string;
  targetLang: string;
  // Optional DeepL API key. When set, translation prefers DeepL over the free Google endpoint
  deeplApiKey: string;
  // Optional OCR.space API key. When set, OCR prefers OCR.space over the local Tesseract engine
  ocrSpaceApiKey: string;
  // Optional email for the MyMemory fallback. Raises its daily quota
  myMemoryEmail: string;
}

export const DEFAULT_SETTINGS: Settings = {
  originLang: "auto",
  targetLang: "en",
  deeplApiKey: "",
  ocrSpaceApiKey: "",
  myMemoryEmail: "",
};

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get({ ...DEFAULT_SETTINGS });
  return { ...DEFAULT_SETTINGS, ...stored } as Settings;
}

export async function setSettings(partial: Partial<Settings>): Promise<void> {
  await chrome.storage.sync.set(partial as Record<string, unknown>);
}

export function onSettingsChanged(
  cb: (settings: Settings) => void,
): () => void {
  const listener = (
    _changes: { [key: string]: chrome.storage.StorageChange },
    area: string,
  ) => {
    if (area !== "sync") {
      return;
    }
    getSettings().then(cb);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
