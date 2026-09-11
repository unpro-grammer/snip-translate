export interface Language {
  translateCode: string;
  tesseractCode: string;
  ocrSpaceCode?: string;
  label: string;
}

export const LANGUAGES: Language[] = [
  {
    translateCode: "en",
    tesseractCode: "eng",
    ocrSpaceCode: "eng",
    label: "English",
  },
  {
    translateCode: "es",
    tesseractCode: "spa",
    ocrSpaceCode: "spa",
    label: "Spanish",
  },
  {
    translateCode: "fr",
    tesseractCode: "fra",
    ocrSpaceCode: "fre",
    label: "French",
  },
  {
    translateCode: "de",
    tesseractCode: "deu",
    ocrSpaceCode: "ger",
    label: "German",
  },
  {
    translateCode: "it",
    tesseractCode: "ita",
    ocrSpaceCode: "ita",
    label: "Italian",
  },
  {
    translateCode: "pt",
    tesseractCode: "por",
    ocrSpaceCode: "por",
    label: "Portuguese",
  },
  {
    translateCode: "ru",
    tesseractCode: "rus",
    ocrSpaceCode: "rus",
    label: "Russian",
  },
  {
    translateCode: "ja",
    tesseractCode: "jpn",
    ocrSpaceCode: "jpn",
    label: "Japanese",
  },
  {
    translateCode: "ko",
    tesseractCode: "kor",
    ocrSpaceCode: "kor",
    label: "Korean",
  },
  {
    translateCode: "zh-CN",
    tesseractCode: "chi_sim",
    ocrSpaceCode: "chs",
    label: "Chinese (Simplified)",
  },
  {
    translateCode: "zh-TW",
    tesseractCode: "chi_tra",
    ocrSpaceCode: "cht",
    label: "Chinese (Traditional)",
  },
  {
    translateCode: "ar",
    tesseractCode: "ara",
    ocrSpaceCode: "ara",
    label: "Arabic",
  },
  { translateCode: "hi", tesseractCode: "hin", label: "Hindi" },
  {
    translateCode: "nl",
    tesseractCode: "nld",
    ocrSpaceCode: "dut",
    label: "Dutch",
  },
  {
    translateCode: "pl",
    tesseractCode: "pol",
    ocrSpaceCode: "pol",
    label: "Polish",
  },
  {
    translateCode: "tr",
    tesseractCode: "tur",
    ocrSpaceCode: "tur",
    label: "Turkish",
  },
  {
    translateCode: "vi",
    tesseractCode: "vie",
    ocrSpaceCode: "vnm",
    label: "Vietnamese",
  },
];

export function findByTesseractCode(code: string): Language | undefined {
  return LANGUAGES.find((l) => l.tesseractCode === code);
}
