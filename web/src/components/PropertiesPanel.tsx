import type { CircuitComponent, LedColor, SimulationResult } from "../types";

interface PropertiesPanelProps {
  component: CircuitComponent;
  simulation: SimulationResult | null;
  onUpdate: (id: string, updates: Partial<CircuitComponent>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const LED_COLORS: LedColor[] = ["red", "green", "blue", "yellow"];

function formatValue(v: number | undefined, unit: string): string {
  if (v === undefined) return "N/A";
  const abs = Math.abs(v);
  if (unit === "A") {
    if (abs < 0.001) return `${(abs * 1e6).toFixed(1)} µA`;
    if (abs < 1) return `${(abs * 1000).toFixed(1)} mA`;
    return `${abs.toFixed(3)} A`;
  }
  if (unit === "V") {
    if (abs < 0.001) return `${(abs * 1000).toFixed(2)} mV`;
    return `${abs.toFixed(3)} V`;
  }
  if (unit === "W") {
    if (abs < 0.001) return `${(abs * 1e6).toFixed(1)} µW`;
    if (abs < 1) return `${(abs * 1000).toFixed(1)} mW`;
    return `${abs.toFixed(3)} W`;
  }
  return `${v} ${unit}`;
}

export default function PropertiesPanel({
  component: c,
  simulation,
  onUpdate,
  onDelete,
  onClose,
}: PropertiesPanelProps) {
  const voltage = simulation?.componentVoltages.get(c.id);
  const current = simulation?.componentCurrents.get(c.id);
  const power = simulation?.componentPower.get(c.id);

  return (
    <div className="absolute top-3 right-3 z-10 w-64 p-4 rounded-[var(--radius-card)] bg-[var(--color-panel)] border border-[var(--color-line)] shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold capitalize">{c.kind}</h3>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--color-active)] text-[var(--color-muted)]"
        >
          x
        </button>
      </div>

      {/* Component-specific editors */}
      {c.kind === "battery" && (
        <div className="mb-3">
          <label className="block text-xs text-[var(--color-muted)] mb-1">
            Voltage (V)
          </label>
          <input
            type="range"
            min={1}
            max={24}
            step={0.5}
            value={c.voltage ?? 9}
            onChange={(e) =>
              onUpdate(c.id, { voltage: parseFloat(e.target.value) })
            }
            className="w-full accent-[var(--color-accent)]"
          />
          <span className="text-sm font-mono">{c.voltage ?? 9} V</span>
        </div>
      )}

      {c.kind === "resistor" && (
        <div className="mb-3">
          <label className="block text-xs text-[var(--color-muted)] mb-1">
            Resistance
          </label>
          <input
            type="range"
            min={0}
            max={7}
            step={0.1}
            value={Math.log10(c.resistance ?? 1000)}
            onChange={(e) =>
              onUpdate(c.id, {
                resistance: Math.round(Math.pow(10, parseFloat(e.target.value))),
              })
            }
            className="w-full accent-[var(--color-accent)]"
          />
          <span className="text-sm font-mono">
            {formatResistance(c.resistance ?? 1000)}
          </span>
        </div>
      )}

      {c.kind === "bulb" && (
        <div className="mb-3">
          <label className="block text-xs text-[var(--color-muted)] mb-1">
            Resistance
          </label>
          <input
            type="range"
            min={10}
            max={1000}
            step={10}
            value={c.resistance ?? 100}
            onChange={(e) =>
              onUpdate(c.id, { resistance: parseFloat(e.target.value) })
            }
            className="w-full accent-[var(--color-accent)]"
          />
          <span className="text-sm font-mono">
            {formatResistance(c.resistance ?? 100)}
          </span>
        </div>
      )}

      {c.kind === "led" && (
        <div className="mb-3">
          <label className="block text-xs text-[var(--color-muted)] mb-1">
            Color
          </label>
          <div className="flex gap-2">
            {LED_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => onUpdate(c.id, { ledColor: color })}
                className={`w-8 h-8 rounded-full border-2 transition-transform ${
                  c.ledColor === color
                    ? "border-[var(--color-accent)] scale-110"
                    : "border-[var(--color-line)]"
                }`}
                style={{ backgroundColor: ledColorToCss(color) }}
              />
            ))}
          </div>
        </div>
      )}

      {c.kind === "switch" && (
        <div className="mb-3">
          <button
            onClick={() => onUpdate(c.id, { isClosed: !c.isClosed })}
            className={`px-4 py-2 rounded-[var(--radius-btn)] text-sm font-medium transition-colors ${
              c.isClosed
                ? "bg-green-600 text-white"
                : "bg-[var(--color-active)] text-[var(--color-ink)]"
            }`}
          >
            {c.isClosed ? "Close (ON)" : "Open (OFF)"}
          </button>
        </div>
      )}

      {c.kind === "capacitor" && (
        <div className="mb-3">
          <label className="block text-xs text-[var(--color-muted)] mb-1">
            Capacitance (µF)
          </label>
          <input
            type="range"
            min={1}
            max={1000}
            step={1}
            value={c.capacitance ?? 100}
            onChange={(e) =>
              onUpdate(c.id, { capacitance: parseFloat(e.target.value) })
            }
            className="w-full accent-[var(--color-accent)]"
          />
          <span className="text-sm font-mono">{c.capacitance ?? 100} µF</span>
        </div>
      )}

      {/* Simulation readings */}
      {simulation?.valid && (
        <div className="mt-3 pt-3 border-t border-[var(--color-line)]">
          <div className="text-xs text-[var(--color-muted)] mb-2 font-semibold uppercase tracking-wider">
            Readings
          </div>
          <div className="space-y-1 text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Voltage:</span>
              <span>{formatValue(voltage, "V")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Current:</span>
              <span>{formatValue(current, "A")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Power:</span>
              <span>{formatValue(power, "W")}</span>
            </div>
          </div>
        </div>
      )}

      {/* Delete */}
      <div className="mt-4 pt-3 border-t border-[var(--color-line)]">
        <button
          onClick={() => onDelete(c.id)}
          className="w-full px-3 py-2 rounded-[var(--radius-btn)] text-sm font-medium bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
        >
          Delete Component
        </button>
      </div>
    </div>
  );
}

function formatResistance(r: number): string {
  if (r >= 1e6) return `${(r / 1e6).toFixed(1)} MΩ`;
  if (r >= 1000) return `${(r / 1000).toFixed(1)} kΩ`;
  return `${r} Ω`;
}

function ledColorToCss(c: LedColor): string {
  switch (c) {
    case "red":
      return "#ff4444";
    case "green":
      return "#44ff44";
    case "blue":
      return "#4488ff";
    case "yellow":
      return "#ffdd44";
  }
}
