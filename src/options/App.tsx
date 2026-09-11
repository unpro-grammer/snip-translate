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
    <div className="mx-auto min-h-screen max-w-lg space-y-6 bg-bg p-8 text-fg">
      <div>
        <h1 className="text-lg font-semibold">
          Screen Snip Translate: Settings
        </h1>
        <p className="mt-1 text-sm text-muted">
          Press the shortcut on any page, drag a box, and this extension OCRs
          whatever's inside it to translate it.
        </p>
      </div>

      <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">Languages</h2>
        <p className="text-xs text-muted">
          The origin language also picks which Tesseract OCR pack reads the
          on-screen text (downloaded the first time you use a given language).
          "Auto-detect" defaults OCR to English, so pick the real language for
          accurate recognition of non-English text.
        </p>
        <div className="grid grid-cols-2 gap-3">
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

      <section className="space-y-2 rounded-xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">Translation engine</h2>
        <p className="text-xs text-muted">
          By default translations use Google's free public endpoint, fast and no
          signup required. Optionally add a{" "}
          <a
            href="https://www.deepl.com/pro-api"
            target="_blank"
            rel="noreferrer"
            className="text-brand hover:underline"
          >
            DeepL API
          </a>{" "}
          key for higher reliability at scale; it'll be used automatically when
          present.
        </p>
        <input
          type="password"
          placeholder="DeepL API key (optional)"
          value={settings.deeplApiKey}
          onChange={(e) => save({ deeplApiKey: e.target.value })}
          className="w-full rounded-md border border-line bg-bg px-2 py-1.5 text-sm font-mono text-fg"
        />
      </section>

      <p
        className={`text-xs text-success transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}
      >
        Saved
      </p>
    </div>
  );
}
