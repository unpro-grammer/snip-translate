import { useEffect, useState } from "react";
import {
  DEFAULT_SETTINGS,
  getSettings,
  setSettings,
  type Settings,
} from "../lib/storage";
import LanguageSelect from "../components/LanguageSelect";

export default function App() {
  const [settings, setLocalSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setLocalSettings);
  }, []);

  async function save(partial: Partial<Settings>) {
    setLocalSettings((s) => ({ ...s, ...partial }));
    await setSettings(partial);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  return (
    <div className="min-h-screen w-full bg-bg p-8 text-fg">
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Snip Translate: Settings</h1>
          <p className="mt-1 text-sm text-muted">
            Press the shortcut on any page, drag a box, and this extension OCRs
            whatever's selected to translate it.
          </p>
        </div>

        <section className="space-y-2 rounded-xl bg-brand p-4 text-fg shadow-md">
          <h2 className="text-lg font-semibold">Languages</h2>
          <p className="text-sm">
            The origin language also picks which Tesseract OCR pack reads the
            on-screen text (downloaded the first time you use a given language).
            "Auto-detect" defaults OCR to English, so pick the actual language
            if known for accurate recognition of non-English text.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <LanguageSelect
              label="Origin language"
              value={settings.originLang}
              onChange={(v) => save({ originLang: v })}
              includeAuto
            />
            <LanguageSelect
              label="Translate to"
              value={settings.targetLang}
              onChange={(v) => save({ targetLang: v })}
            />
          </div>
        </section>

        <section className="space-y-2 rounded-xl bg-brand p-4 text-fg shadow-md">
          <h2 className="text-lg font-semibold">OCR engine</h2>
          <p className="text-sm">
            By default, text is read locally with Tesseract, which is free and
            works offline but can struggle with small or stylised screenshot
            text. Optionally add a{" "}
            <a
              href="https://ocr.space/OCRAPI"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              OCR.space API
            </a>{" "}
            key for a more accurate cloud OCR engine; it'll be used
            automatically when present, falling back to Tesseract if it ever
            fails.
          </p>
          <input
            type="password"
            placeholder="OCR.space API key (optional)"
            value={settings.ocrSpaceApiKey}
            onChange={(e) => save({ ocrSpaceApiKey: e.target.value })}
            className="w-full rounded-md bg-input mt-1 px-2 py-1.5 text-sm font-mono text-bg shadow-sm"
          />
        </section>

        <section className="space-y-2 rounded-xl bg-brand p-4 text-fg shadow-md">
          <h2 className="text-lg font-semibold">Translation engine</h2>
          <p className="text-sm">
            By default, translations use Google's free public endpoint, which
            requires no sign-up. Optionally add a{" "}
            <a
              href="https://www.deepl.com/pro-api"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              DeepL API
            </a>{" "}
            key for higher reliability; it'll be used automatically when
            present.
          </p>
          <input
            type="password"
            placeholder="DeepL API key (optional)"
            value={settings.deeplApiKey}
            onChange={(e) => save({ deeplApiKey: e.target.value })}
            className="w-full rounded-md bg-input mt-1 px-2 py-1.5 text-sm font-mono text-bg shadow-sm"
          />
        </section>

        <p
          className={`text-xs text-success transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}
        >
          Saved
        </p>
      </div>
    </div>
  );
}
