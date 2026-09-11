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
  const [shortcut, setShortcut] = useState("");

  useEffect(() => {
    getSettings().then(setLocalSettings);
    chrome.commands.getAll().then((commands) => {
      const cmd = commands.find((c) => c.name === "toggle-snip-translate");
      if (cmd?.shortcut) {
        setShortcut(cmd.shortcut);
      }
    });
  }, []);

  async function startSelecting() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) {
      return;
    }
    await chrome.tabs
      .sendMessage(tab.id, { type: "start-selection" })
      .catch(() => {});
    window.close();
  }

  async function save(partial: Partial<Settings>) {
    setLocalSettings((s) => ({ ...s, ...partial }));
    await setSettings(partial);
  }

  return (
    <div className="w-72 space-y-4 bg-bg p-4 text-fg">
      <div>
        <h1 className="text-sm font-semibold">Screen Translate</h1>
        <p className="mt-0.5 text-xs text-muted">
          Select any part of a page, even inside images or video, and get an
          instant translation.
        </p>
      </div>

      <button
        onClick={startSelecting}
        className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white shadow hover:bg-brand-hover"
      >
        Start selecting
      </button>

      {shortcut && (
        <p className="text-center text-xs text-muted">
          Shortcut:{" "}
          <kbd className="rounded bg-line/50 px-1.5 py-0.5 font-mono">
            {shortcut}
          </kbd>
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <LanguageSelect
          label="From"
          value={settings.originLang}
          onChange={(v) => save({ originLang: v })}
          includeAuto
        />
        <LanguageSelect
          label="To"
          value={settings.targetLang}
          onChange={(v) => save({ targetLang: v })}
        />
      </div>

      {settings.originLang === "auto" && (
        <p className="text-xs text-warning">
          Auto-detect works for translation, but text recognition defaults to
          English. Pick the actual origin language above for accurate OCR on
          non-English text.
        </p>
      )}

      <button
        onClick={() => chrome.runtime.openOptionsPage()}
        className="w-full text-center text-xs text-brand hover:underline"
      >
        More settings (DeepL key)
      </button>
    </div>
  );
}
