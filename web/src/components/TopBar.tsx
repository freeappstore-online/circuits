interface TopBarProps {
  showInfo: boolean;
  onToggleInfo: () => void;
  onClear: () => void;
  warnings: string[];
}

export default function TopBar({
  showInfo,
  onToggleInfo,
  onClear,
  warnings,
}: TopBarProps) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
      <h1 className="text-lg font-bold tracking-tight">Circuit Builder</h1>

      {warnings.length > 0 && (
        <div className="px-3 py-1 rounded-full bg-red-900/30 border border-red-800/40 text-red-400 text-xs font-medium">
          {warnings[0]}
        </div>
      )}

      <div className="flex gap-1">
        <button
          onClick={onToggleInfo}
          className={`px-3 py-1.5 rounded-[var(--radius-btn)] text-sm font-medium transition-colors ${
            showInfo
              ? "bg-[var(--color-accent)] text-white"
              : "bg-[var(--color-panel)] border border-[var(--color-line)] text-[var(--color-ink)] hover:bg-[var(--color-active)]"
          }`}
        >
          Info
        </button>
        <button
          onClick={onClear}
          className="px-3 py-1.5 rounded-[var(--radius-btn)] text-sm font-medium bg-[var(--color-panel)] border border-[var(--color-line)] text-[var(--color-ink)] hover:bg-[var(--color-active)] transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
