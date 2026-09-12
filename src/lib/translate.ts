import { containsHanScript } from "./pinyin";

export interface TranslateResult {
  translatedText: string;
  detectedLang?: string;
  provider?: string;
}

const FETCH_TIMEOUT_MS = 6000;
const MAX_TRANSLATE_CHARS = 1000;

function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
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

  const res = await fetchWithTimeout(url.toString());
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

async function translateWithMyMemory(
  text: string,
  source: string,
  target: string,
  email?: string,
): Promise<TranslateResult> {
  const langpair = `${source === "auto" ? "autodetect" : source}|${target}`;
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", langpair);
  if (email) {
    url.searchParams.set("de", email);
  }

  const res = await fetchWithTimeout(url.toString());
  if (!res.ok) {
    throw new Error(`MyMemory request failed (${res.status})`);
  }
  const data = await res.json();
  if (data.responseStatus !== 200 && data.responseStatus !== "200") {
    throw new Error(
      typeof data.responseDetails === "string"
        ? data.responseDetails
        : "MyMemory returned an error",
    );
  }
  const translatedText = data.responseData?.translatedText;
  if (!translatedText) {
    throw new Error("MyMemory returned no translation");
  }

  let detectedLang: string | undefined;
  if (source !== "auto") {
    detectedLang = source;
  } else if (containsHanScript(text)) {
    detectedLang = "zh";
  }

  return { translatedText, detectedLang };
}

async function translateWithDeepL(
  text: string,
  source: string,
  target: string,
  apiKey: string,
): Promise<TranslateResult> {
  const host = apiKey.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  const res = await fetchWithTimeout(`https://${host}/v2/translate`, {
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
  myMemoryEmail?: string,
): Promise<TranslateResult> {
  if (text.length > MAX_TRANSLATE_CHARS) {
    text = text.slice(0, MAX_TRANSLATE_CHARS);
  }

  if (deeplApiKey) {
    try {
      const result = await translateWithDeepL(
        text,
        source,
        target,
        deeplApiKey,
      );
      return { ...result, provider: "DeepL" };
    } catch (err) {
      console.warn(
        "[snip-translate] DeepL failed, falling back to Google:",
        err,
      );
    }
  }

  try {
    const result = await translateWithGoogle(text, source, target);
    return { ...result, provider: "Google" };
  } catch (err) {
    console.warn(
      "[snip-translate] Google failed, falling back to MyMemory:",
      err,
    );
  }

  const result = await translateWithMyMemory(
    text,
    source,
    target,
    myMemoryEmail,
  );
  return { ...result, provider: "MyMemory" };
}
