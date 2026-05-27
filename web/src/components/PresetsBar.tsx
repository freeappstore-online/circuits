import type { Preset } from "../types";

interface PresetsBarProps {
  presets: Preset[];
  onLoadPreset: (preset: Preset) => void;
}

export default function PresetsBar({ presets, onLoadPreset }: PresetsBarProps) {
  return (
    <div className="absolute bottom-3 left-3 z-10 flex gap-2">
      {presets.map((p) => (
        <button
          key={p.name}
          onClick={() => onLoadPreset(p)}
          className="px-3 py-2 rounded-[var(--radius-btn)] bg-[var(--color-panel)] border border-[var(--color-line)] text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-active)] transition-colors shadow-md"
          title={p.description}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}
