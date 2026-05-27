import type { CircuitComponent, SimulationResult } from "../types";

interface InfoPanelProps {
  components: CircuitComponent[];
  simulation: SimulationResult | null;
  onClose: () => void;
}

function formatValue(v: number, unit: string): string {
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
  return `${v.toFixed(3)} ${unit}`;
}

export default function InfoPanel({
  components,
  simulation,
  onClose,
}: InfoPanelProps) {
  return (
    <div className="absolute bottom-3 right-3 z-10 w-80 max-h-[60vh] overflow-y-auto p-4 rounded-[var(--radius-card)] bg-[var(--color-panel)] border border-[var(--color-line)] shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold">Circuit Info</h3>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--color-active)] text-[var(--color-muted)]"
        >
          x
        </button>
      </div>

      {/* Warnings */}
      {simulation && simulation.warnings.length > 0 && (
        <div className="mb-3 p-2 rounded-lg bg-red-900/20 border border-red-800/30">
          {simulation.warnings.map((w, i) => (
            <div key={i} className="text-xs text-red-400">
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Total power */}
      {simulation?.valid && (
        <div className="mb-3 p-2 rounded-lg bg-[var(--color-active)]">
          <div className="text-xs text-[var(--color-muted)] font-semibold uppercase tracking-wider">
            Total Circuit Power
          </div>
          <div className="text-lg font-bold font-mono">
            {formatValue(simulation.totalPower, "W")}
          </div>
        </div>
      )}

      {/* Component table */}
      <div className="text-xs text-[var(--color-muted)] font-semibold uppercase tracking-wider mb-2">
        Components ({components.length})
      </div>
      <div className="space-y-2">
        {components.map((c) => {
          const vDrop = simulation?.componentVoltages.get(c.id);
          const current = simulation?.componentCurrents.get(c.id);
          return (
            <div
              key={c.id}
              className="p-2 rounded-lg bg-[var(--color-active)] text-sm"
            >
              <div className="font-semibold capitalize">{c.kind}</div>
              {c.kind === "battery" && (
                <span className="text-[var(--color-muted)]">
                  {c.voltage ?? 9}V source
                </span>
              )}
              {c.kind === "resistor" && (
                <span className="text-[var(--color-muted)]">
                  {formatResistance(c.resistance ?? 1000)}
                </span>
              )}
              {simulation?.valid &&
                vDrop !== undefined &&
                current !== undefined && (
                  <div className="mt-1 flex gap-3 font-mono text-xs">
                    <span>{formatValue(vDrop, "V")}</span>
                    <span>{formatValue(current, "A")}</span>
                  </div>
                )}
            </div>
          );
        })}
      </div>

      {/* Quick reference */}
      <div className="mt-4 pt-3 border-t border-[var(--color-line)]">
        <div className="text-xs text-[var(--color-muted)] font-semibold uppercase tracking-wider mb-2">
          Quick Reference
        </div>
        <div className="space-y-1 text-xs text-[var(--color-muted)]">
          <div>
            <strong>Ohm's Law:</strong> V = I x R
          </div>
          <div>
            <strong>KVL:</strong> Sum of voltages around a loop = 0
          </div>
          <div>
            <strong>KCL:</strong> Sum of currents at a node = 0
          </div>
          <div>
            <strong>Power:</strong> P = V x I = I² x R = V²/R
          </div>
          <div>
            <strong>Series R:</strong> R_total = R1 + R2 + ...
          </div>
          <div>
            <strong>Parallel R:</strong> 1/R_total = 1/R1 + 1/R2 + ...
          </div>
        </div>
      </div>
    </div>
  );
}

function formatResistance(r: number): string {
  if (r >= 1e6) return `${(r / 1e6).toFixed(1)} MΩ`;
  if (r >= 1000) return `${(r / 1000).toFixed(1)} kΩ`;
  return `${r} Ω`;
}
