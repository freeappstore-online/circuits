import type { ComponentKind, ToolMode } from "../types";

interface ToolbarProps {
  tool: ToolMode;
  onSelectTool: (tool: ToolMode) => void;
}

interface ToolButton {
  label: string;
  icon: string;
  tool: ToolMode;
}

const COMPONENT_BUTTONS: Array<{ kind: ComponentKind; label: string; icon: string }> = [
  { kind: "battery", label: "Battery", icon: "⚡" },
  { kind: "resistor", label: "Resistor", icon: "⏛" },
  { kind: "led", label: "LED", icon: "💡" },
  { kind: "switch", label: "Switch", icon: "⏻" },
  { kind: "capacitor", label: "Capacitor", icon: "⊫" },
  { kind: "ammeter", label: "Ammeter", icon: "A" },
  { kind: "voltmeter", label: "Voltmeter", icon: "V" },
  { kind: "bulb", label: "Bulb", icon: "☀" },
];

const TOOLS: ToolButton[] = [
  { label: "Select", icon: "↖", tool: { kind: "select" } },
  { label: "Wire", icon: "⸻", tool: { kind: "wire", fromPortId: null } },
];

export default function Toolbar({ tool, onSelectTool }: ToolbarProps) {
  return (
    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 p-2 rounded-[var(--radius-card)] bg-[var(--color-panel)] border border-[var(--color-line)] shadow-lg max-h-[calc(100vh-24px)] overflow-y-auto">
      <div className="text-[10px] font-semibold tracking-wider uppercase text-[var(--color-muted)] px-1 mb-1">
        Tools
      </div>
      {TOOLS.map((t) => {
        const isActive =
          tool.kind === t.tool.kind &&
          (t.tool.kind !== "place" || (tool.kind === "place" && false));
        return (
          <button
            key={t.label}
            onClick={() => onSelectTool(t.tool)}
            className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-btn)] text-sm font-medium transition-colors ${
              isActive
                ? "bg-[var(--color-accent)] text-white"
                : "text-[var(--color-ink)] hover:bg-[var(--color-active)]"
            }`}
            title={t.label}
          >
            <span className="w-5 text-center text-base">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        );
      })}

      <div className="w-full h-px bg-[var(--color-line)] my-1" />

      <div className="text-[10px] font-semibold tracking-wider uppercase text-[var(--color-muted)] px-1 mb-1">
        Components
      </div>
      {COMPONENT_BUTTONS.map((cb) => {
        const isActive =
          tool.kind === "place" && tool.componentKind === cb.kind;
        return (
          <button
            key={cb.kind}
            onClick={() =>
              onSelectTool({ kind: "place", componentKind: cb.kind })
            }
            className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-btn)] text-sm font-medium transition-colors ${
              isActive
                ? "bg-[var(--color-accent)] text-white"
                : "text-[var(--color-ink)] hover:bg-[var(--color-active)]"
            }`}
            title={`Place ${cb.label}`}
          >
            <span className="w-5 text-center text-base">{cb.icon}</span>
            <span>{cb.label}</span>
          </button>
        );
      })}
    </div>
  );
}
