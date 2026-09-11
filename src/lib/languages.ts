export interface Language {
  translateCode: string;
  tesseractCode: string;
  label: string;
}

export const LANGUAGES: Language[] = [
  { translateCode: "en", tesseractCode: "eng", label: "English" },
  { translateCode: "es", tesseractCode: "spa", label: "Spanish" },
  { translateCode: "fr", tesseractCode: "fra", label: "French" },
  { translateCode: "de", tesseractCode: "deu", label: "German" },
  { translateCode: "it", tesseractCode: "ita", label: "Italian" },
  { translateCode: "pt", tesseractCode: "por", label: "Portuguese" },
  { translateCode: "ru", tesseractCode: "rus", label: "Russian" },
  { translateCode: "ja", tesseractCode: "jpn", label: "Japanese" },
  { translateCode: "ko", tesseractCode: "kor", label: "Korean" },
  {
    translateCode: "zh-CN",
    tesseractCode: "chi_sim",
    label: "Chinese (Simplified)",
  },
  {
    translateCode: "zh-TW",
    tesseractCode: "chi_tra",
    label: "Chinese (Traditional)",
  },
  { translateCode: "ar", tesseractCode: "ara", label: "Arabic" },
  { translateCode: "hi", tesseractCode: "hin", label: "Hindi" },
  { translateCode: "nl", tesseractCode: "nld", label: "Dutch" },
  { translateCode: "pl", tesseractCode: "pol", label: "Polish" },
  { translateCode: "tr", tesseractCode: "tur", label: "Turkish" },
  { translateCode: "vi", tesseractCode: "vie", label: "Vietnamese" },
];

export function findByTesseractCode(code: string): Language | undefined {
  return LANGUAGES.find((l) => l.tesseractCode === code);
}
