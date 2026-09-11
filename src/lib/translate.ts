export interface TranslateResult {
  translatedText: string;
  detectedLang?: string;
}

async function translateWithGoogle(
  text: string,
  source: string,
  target: string,
): Promise<TranslateResult> {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", source);
  url.searchParams.set("tl", target);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Google Translate request failed (${res.status})`);
  }
  const data = await res.json();
  const translatedText = (data[0] as Array<[string, string]>)
    .map((chunk) => chunk[0])
    .join("");
  const detectedLang = typeof data[2] === "string" ? data[2] : undefined;
  return { translatedText, detectedLang };
}

async function translateWithDeepL(
  text: string,
  source: string,
  target: string,
  apiKey: string,
): Promise<TranslateResult> {
  const host = apiKey.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  const res = await fetch(`https://${host}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: [text],
      target_lang: target.toUpperCase(),
      ...(source !== "auto" ? { source_lang: source.toUpperCase() } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`DeepL request failed (${res.status})`);
  }
  const data = await res.json();
  const translation = data.translations?.[0];
  if (!translation) {
    throw new Error("DeepL returned no translation");
  }
  return {
    translatedText: translation.text,
    detectedLang: translation.detected_source_language?.toLowerCase(),
  };
}

export async function translateText(
  text: string,
  source: string,
  target: string,
  deeplApiKey?: string,
): Promise<TranslateResult> {
  if (deeplApiKey) {
    try {
      return await translateWithDeepL(text, source, target, deeplApiKey);
    } catch (err) {
      console.warn(
        "[on-screen-translator] DeepL failed, falling back to Google:",
        err,
      );
    }
  }
  return translateWithGoogle(text, source, target);
}
