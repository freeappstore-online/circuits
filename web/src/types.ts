/* ── Circuit types ────────────────────────────────────────── */

export type ComponentKind =
  | "battery"
  | "resistor"
  | "led"
  | "switch"
  | "capacitor"
  | "ammeter"
  | "voltmeter"
  | "bulb";

export type LedColor = "red" | "green" | "blue" | "yellow";

export interface Port {
  /** Unique id for this port */
  id: string;
  /** Offset from component position (grid units) */
  dx: number;
  dy: number;
  /** Label shown in UI (optional) */
  label?: string;
}

export interface CircuitComponent {
  id: string;
  kind: ComponentKind;
  /** Grid position (top-left of bounding box) */
  x: number;
  y: number;
  /** Component-specific values */
  voltage?: number; // Battery voltage (V)
  resistance?: number; // Resistor value (Ohm)
  ledColor?: LedColor;
  forwardVoltage?: number; // LED forward voltage drop
  isClosed?: boolean; // Switch state
  capacitance?: number; // Capacitor (uF)
  /** Ports for wiring */
  ports: Port[];
  /** Rotation in 90-degree increments (0-3) */
  rotation: number;
}

export interface Wire {
  id: string;
  fromPortId: string;
  toPortId: string;
}

export interface SimulationResult {
  /** Map of wire id -> current in amps (positive = conventional from->to) */
  wireCurrents: Map<string, number>;
  /** Map of component id -> voltage drop across it */
  componentVoltages: Map<string, number>;
  /** Map of component id -> current through it */
  componentCurrents: Map<string, number>;
  /** Map of component id -> power dissipated */
  componentPower: Map<string, number>;
  /** Map of port id -> voltage at that node */
  nodeVoltages: Map<string, number>;
  /** Warnings (open circuit, short circuit, etc.) */
  warnings: string[];
  /** Total circuit power */
  totalPower: number;
  /** Whether simulation found a valid solution */
  valid: boolean;
}

export type ToolMode =
  | { kind: "select" }
  | { kind: "place"; componentKind: ComponentKind }
  | { kind: "wire"; fromPortId: string | null };

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface CircuitState {
  components: CircuitComponent[];
  wires: Wire[];
  selectedId: string | null;
  tool: ToolMode;
  camera: Camera;
  simulation: SimulationResult | null;
  showInfo: boolean;
}

export type Preset = {
  name: string;
  description: string;
  build: () => { components: CircuitComponent[]; wires: Wire[] };
};
