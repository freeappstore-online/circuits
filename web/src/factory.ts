/**
 * Factory functions for creating circuit components, wires, and preset circuits.
 */

import type {
  CircuitComponent,
  ComponentKind,
  Wire,
  Preset,
  LedColor,
} from "./types";

let _nextId = 1;
function uid(): string {
  return `c${_nextId++}`;
}

function portId(componentId: string, index: number): string {
  return `${componentId}_p${index}`;
}

export function createComponent(
  kind: ComponentKind,
  x: number,
  y: number,
): CircuitComponent {
  const id = uid();

  const base = {
    id,
    kind,
    x,
    y,
    rotation: 0,
    ports: [
      { id: portId(id, 0), dx: -1, dy: 0, label: "A" },
      { id: portId(id, 1), dx: 1, dy: 0, label: "B" },
    ],
  };

  switch (kind) {
    case "battery":
      return { ...base, voltage: 9, ports: [
        { id: portId(id, 0), dx: -1, dy: 0, label: "+" },
        { id: portId(id, 1), dx: 1, dy: 0, label: "-" },
      ] };
    case "resistor":
      return { ...base, resistance: 1000 };
    case "led":
      return {
        ...base,
        ledColor: "red" as LedColor,
        forwardVoltage: 2.0,
        ports: [
          { id: portId(id, 0), dx: -1, dy: 0, label: "+" },
          { id: portId(id, 1), dx: 1, dy: 0, label: "-" },
        ],
      };
    case "switch":
      return { ...base, isClosed: false };
    case "capacitor":
      return { ...base, capacitance: 100 };
    case "ammeter":
      return base;
    case "voltmeter":
      return base;
    case "bulb":
      return { ...base, resistance: 100 };
  }
}

export function createWire(fromPortId: string, toPortId: string): Wire {
  return { id: uid(), fromPortId, toPortId };
}

/* ── Presets ──────────────────────────────────────────────── */

function makePresetIds(prefix: string): {
  comp: (n: number) => string;
  port: (compN: number, portN: number) => string;
} {
  return {
    comp: (n) => `${prefix}_c${n}`,
    port: (compN, portN) => `${prefix}_c${compN}_p${portN}`,
  };
}

export const presets: Preset[] = [
  {
    name: "Simple Series",
    description: "Battery + Resistor + LED in series",
    build: () => {
      const { comp, port } = makePresetIds("ps1");
      const battery: CircuitComponent = {
        id: comp(1), kind: "battery", x: 3, y: 5, voltage: 9, rotation: 0,
        ports: [
          { id: port(1, 0), dx: -1, dy: 0, label: "+" },
          { id: port(1, 1), dx: 1, dy: 0, label: "-" },
        ],
      };
      const resistor: CircuitComponent = {
        id: comp(2), kind: "resistor", x: 8, y: 5, resistance: 330, rotation: 0,
        ports: [
          { id: port(2, 0), dx: -1, dy: 0, label: "A" },
          { id: port(2, 1), dx: 1, dy: 0, label: "B" },
        ],
      };
      const led: CircuitComponent = {
        id: comp(3), kind: "led", x: 13, y: 5, ledColor: "red", forwardVoltage: 2.0, rotation: 0,
        ports: [
          { id: port(3, 0), dx: -1, dy: 0, label: "+" },
          { id: port(3, 1), dx: 1, dy: 0, label: "-" },
        ],
      };
      return {
        components: [battery, resistor, led],
        wires: [
          { id: `${comp(1)}_w1`, fromPortId: port(1, 0), toPortId: port(3, 1) },
          { id: `${comp(1)}_w2`, fromPortId: port(1, 1), toPortId: port(2, 0) },
          { id: `${comp(1)}_w3`, fromPortId: port(2, 1), toPortId: port(3, 0) },
        ],
      };
    },
  },
  {
    name: "Parallel Resistors",
    description: "Battery + two resistors in parallel",
    build: () => {
      const { comp, port } = makePresetIds("ps2");
      const battery: CircuitComponent = {
        id: comp(1), kind: "battery", x: 3, y: 6, voltage: 12, rotation: 0,
        ports: [
          { id: port(1, 0), dx: -1, dy: 0, label: "+" },
          { id: port(1, 1), dx: 1, dy: 0, label: "-" },
        ],
      };
      const r1: CircuitComponent = {
        id: comp(2), kind: "resistor", x: 10, y: 4, resistance: 1000, rotation: 0,
        ports: [
          { id: port(2, 0), dx: -1, dy: 0, label: "A" },
          { id: port(2, 1), dx: 1, dy: 0, label: "B" },
        ],
      };
      const r2: CircuitComponent = {
        id: comp(3), kind: "resistor", x: 10, y: 8, resistance: 2000, rotation: 0,
        ports: [
          { id: port(3, 0), dx: -1, dy: 0, label: "A" },
          { id: port(3, 1), dx: 1, dy: 0, label: "B" },
        ],
      };
      return {
        components: [battery, r1, r2],
        wires: [
          { id: `${comp(1)}_w1`, fromPortId: port(1, 0), toPortId: port(2, 0) },
          { id: `${comp(1)}_w2`, fromPortId: port(1, 0), toPortId: port(3, 0) },
          { id: `${comp(1)}_w3`, fromPortId: port(1, 1), toPortId: port(2, 1) },
          { id: `${comp(1)}_w4`, fromPortId: port(1, 1), toPortId: port(3, 1) },
        ],
      };
    },
  },
  {
    name: "Voltage Divider",
    description: "Battery + two series resistors + voltmeter",
    build: () => {
      const { comp, port } = makePresetIds("ps3");
      const battery: CircuitComponent = {
        id: comp(1), kind: "battery", x: 3, y: 5, voltage: 12, rotation: 0,
        ports: [
          { id: port(1, 0), dx: -1, dy: 0, label: "+" },
          { id: port(1, 1), dx: 1, dy: 0, label: "-" },
        ],
      };
      const r1: CircuitComponent = {
        id: comp(2), kind: "resistor", x: 8, y: 5, resistance: 1000, rotation: 0,
        ports: [
          { id: port(2, 0), dx: -1, dy: 0, label: "A" },
          { id: port(2, 1), dx: 1, dy: 0, label: "B" },
        ],
      };
      const r2: CircuitComponent = {
        id: comp(3), kind: "resistor", x: 13, y: 5, resistance: 2000, rotation: 0,
        ports: [
          { id: port(3, 0), dx: -1, dy: 0, label: "A" },
          { id: port(3, 1), dx: 1, dy: 0, label: "B" },
        ],
      };
      const vm: CircuitComponent = {
        id: comp(4), kind: "voltmeter", x: 13, y: 9, rotation: 0,
        ports: [
          { id: port(4, 0), dx: -1, dy: 0, label: "+" },
          { id: port(4, 1), dx: 1, dy: 0, label: "-" },
        ],
      };
      return {
        components: [battery, r1, r2, vm],
        wires: [
          { id: `${comp(1)}_w1`, fromPortId: port(1, 0), toPortId: port(3, 1) },
          { id: `${comp(1)}_w2`, fromPortId: port(1, 1), toPortId: port(2, 0) },
          { id: `${comp(1)}_w3`, fromPortId: port(2, 1), toPortId: port(3, 0) },
          { id: `${comp(1)}_w4`, fromPortId: port(3, 0), toPortId: port(4, 0) },
          { id: `${comp(1)}_w5`, fromPortId: port(3, 1), toPortId: port(4, 1) },
        ],
      };
    },
  },
  {
    name: "RC Circuit",
    description: "Battery + Resistor + Capacitor (DC steady-state)",
    build: () => {
      const { comp, port } = makePresetIds("ps4");
      const battery: CircuitComponent = {
        id: comp(1), kind: "battery", x: 3, y: 5, voltage: 9, rotation: 0,
        ports: [
          { id: port(1, 0), dx: -1, dy: 0, label: "+" },
          { id: port(1, 1), dx: 1, dy: 0, label: "-" },
        ],
      };
      const resistor: CircuitComponent = {
        id: comp(2), kind: "resistor", x: 8, y: 5, resistance: 1000, rotation: 0,
        ports: [
          { id: port(2, 0), dx: -1, dy: 0, label: "A" },
          { id: port(2, 1), dx: 1, dy: 0, label: "B" },
        ],
      };
      const cap: CircuitComponent = {
        id: comp(3), kind: "capacitor", x: 13, y: 5, capacitance: 100, rotation: 0,
        ports: [
          { id: port(3, 0), dx: -1, dy: 0, label: "+" },
          { id: port(3, 1), dx: 1, dy: 0, label: "-" },
        ],
      };
      return {
        components: [battery, resistor, cap],
        wires: [
          { id: `${comp(1)}_w1`, fromPortId: port(1, 0), toPortId: port(3, 1) },
          { id: `${comp(1)}_w2`, fromPortId: port(1, 1), toPortId: port(2, 0) },
          { id: `${comp(1)}_w3`, fromPortId: port(2, 1), toPortId: port(3, 0) },
        ],
      };
    },
  },
];
