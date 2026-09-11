import { LANGUAGES } from "../lib/languages";

export default function LanguageSelect({
  label,
  value,
  onChange,
  includeAuto,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  includeAuto?: boolean;
}) {
  return (
    <label className="block text-xs font-medium">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md bg-input px-2 py-1.5 text-bg shadow-sm hover:cursor-pointer"
      >
        {includeAuto && <option value="auto">Auto-detect</option>}
        {LANGUAGES.map((l) => (
          <option key={l.translateCode} value={l.translateCode}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
