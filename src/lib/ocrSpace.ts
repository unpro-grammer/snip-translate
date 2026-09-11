interface OcrSpaceResult {
  ParsedText: string;
  ErrorMessage?: string;
}

interface OcrSpaceResponse {
  IsErroredOnProcessing: boolean;
  ErrorMessage?: string | string[];
  ParsedResults?: OcrSpaceResult[];
}

export async function ocrWithOcrSpace(
  dataUrl: string,
  lang: string,
  apiKey: string,
): Promise<string> {
  const form = new FormData();
  form.append("apikey", apiKey);
  form.append("base64Image", dataUrl);
  form.append("language", lang);
  form.append("OCREngine", "2");
  form.append("scale", "true");

  const res = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new Error(`OCR.space request failed (${res.status})`);
  }

  const data = (await res.json()) as OcrSpaceResponse;
  if (data.IsErroredOnProcessing) {
    const message = Array.isArray(data.ErrorMessage)
      ? data.ErrorMessage.join(", ")
      : data.ErrorMessage;
    throw new Error(message || "OCR.space could not process that image.");
  }

  return (data.ParsedResults ?? [])
    .map((r) => r.ParsedText)
    .join("\n")
    .trim();
}
