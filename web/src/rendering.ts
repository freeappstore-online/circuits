/**
 * Canvas rendering for circuit components, wires, and simulation overlays.
 *
 * All coordinates are in grid units; the caller provides the transform
 * (camera zoom + pan) via ctx.setTransform before calling drawCircuit.
 */

import type {
  CircuitComponent,
  Wire,
  SimulationResult,
  Camera,
  Port,
} from "./types";

export const GRID_SIZE = 40; // pixels per grid unit

/* ── Colors ──────────────────────────────────────────────── */

const COLORS = {
  grid: "#2a2825",
  gridDot: "#3a3835",
  component: "#e0ddd8",
  componentSelected: "#5b7db1",
  port: "#5b7db1",
  portHover: "#7b9dd1",
  wire: "#8a8780",
  wireActive: "#5b7db1",
  text: "#f2f0ed",
  textMuted: "#7a7770",
  batteryPlus: "#e06050",
  batteryMinus: "#5080d0",
  ledRed: "#ff4444",
  ledGreen: "#44ff44",
  ledBlue: "#4488ff",
  ledYellow: "#ffdd44",
  bulbGlow: "#ffcc22",
  warning: "#ff6644",
  currentDot: "#5b7db1",
};

/* ── Grid ─────────────────────────────────────────────────── */

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  width: number,
  height: number,
): void {
  const gs = GRID_SIZE * camera.zoom;

  // Calculate visible grid range
  const startX = Math.floor(-camera.x / gs) * gs + (camera.x % gs);
  const startY = Math.floor(-camera.y / gs) * gs + (camera.y % gs);

  ctx.fillStyle = COLORS.gridDot;

  for (let x = startX; x < width; x += gs) {
    for (let y = startY; y < height; y += gs) {
      ctx.beginPath();
      ctx.arc(x + camera.x % gs + width, y + camera.y % gs + height, 1.2 * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Simpler approach: just draw dots at grid intersections in view
  ctx.fillStyle = COLORS.gridDot;
  const invZoom = 1 / camera.zoom;
  const viewLeft = -camera.x * invZoom;
  const viewTop = -camera.y * invZoom;
  const viewRight = viewLeft + width * invZoom;
  const viewBottom = viewTop + height * invZoom;

  const gridStartX = Math.floor(viewLeft / GRID_SIZE) * GRID_SIZE;
  const gridStartY = Math.floor(viewTop / GRID_SIZE) * GRID_SIZE;

  for (let gx = gridStartX; gx <= viewRight; gx += GRID_SIZE) {
    for (let gy = gridStartY; gy <= viewBottom; gy += GRID_SIZE) {
      const sx = gx * camera.zoom + camera.x;
      const sy = gy * camera.zoom + camera.y;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* ── Port position helper ────────────────────────────────── */

export function getPortWorldPos(
  comp: CircuitComponent,
  port: Port,
): { x: number; y: number } {
  return {
    x: (comp.x + port.dx) * GRID_SIZE,
    y: (comp.y + port.dy) * GRID_SIZE,
  };
}

export function getPortScreenPos(
  comp: CircuitComponent,
  port: Port,
  camera: Camera,
): { x: number; y: number } {
  const world = getPortWorldPos(comp, port);
  return {
    x: world.x * camera.zoom + camera.x,
    y: world.y * camera.zoom + camera.y,
  };
}

/* ── Component drawing ───────────────────────────────────── */

function worldToScreen(wx: number, wy: number, camera: Camera): [number, number] {
  return [wx * GRID_SIZE * camera.zoom + camera.x, wy * GRID_SIZE * camera.zoom + camera.y];
}

function drawBattery(
  ctx: CanvasRenderingContext2D,
  c: CircuitComponent,
  camera: Camera,
  selected: boolean,
): void {
  const [cx, cy] = worldToScreen(c.x, c.y, camera);
  const s = GRID_SIZE * camera.zoom;
  const color = selected ? COLORS.componentSelected : COLORS.component;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * camera.zoom;
  ctx.lineCap = "round";

  // Wires to terminals
  ctx.beginPath();
  ctx.moveTo(cx - s, cy);
  ctx.lineTo(cx - s * 0.3, cy);
  ctx.moveTo(cx + s * 0.3, cy);
  ctx.lineTo(cx + s, cy);
  ctx.stroke();

  // Long line (positive)
  ctx.strokeStyle = COLORS.batteryPlus;
  ctx.lineWidth = 3 * camera.zoom;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, cy - s * 0.4);
  ctx.lineTo(cx - s * 0.3, cy + s * 0.4);
  ctx.stroke();

  // Short line (negative)
  ctx.strokeStyle = COLORS.batteryMinus;
  ctx.lineWidth = 3 * camera.zoom;
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.3, cy - s * 0.25);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.25);
  ctx.stroke();

  // Plus/minus labels
  ctx.fillStyle = COLORS.batteryPlus;
  ctx.font = `bold ${10 * camera.zoom}px Manrope`;
  ctx.textAlign = "center";
  ctx.fillText("+", cx - s * 0.3, cy - s * 0.5);
  ctx.fillStyle = COLORS.batteryMinus;
  ctx.fillText("-", cx + s * 0.3, cy - s * 0.5);

  // Value label
  ctx.fillStyle = COLORS.text;
  ctx.font = `${10 * camera.zoom}px Manrope`;
  ctx.textAlign = "center";
  ctx.fillText(`${c.voltage ?? 9}V`, cx, cy + s * 0.65);
}

function drawResistor(
  ctx: CanvasRenderingContext2D,
  c: CircuitComponent,
  camera: Camera,
  selected: boolean,
): void {
  const [cx, cy] = worldToScreen(c.x, c.y, camera);
  const s = GRID_SIZE * camera.zoom;
  const color = selected ? COLORS.componentSelected : COLORS.component;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * camera.zoom;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Lead wires
  ctx.beginPath();
  ctx.moveTo(cx - s, cy);
  ctx.lineTo(cx - s * 0.6, cy);
  ctx.moveTo(cx + s * 0.6, cy);
  ctx.lineTo(cx + s, cy);
  ctx.stroke();

  // Zigzag
  const peaks = 5;
  const zigW = s * 1.2 / peaks;
  const zigH = s * 0.3;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.6, cy);
  for (let i = 0; i < peaks; i++) {
    const xOff = cx - s * 0.6 + zigW * (i + 0.25);
    ctx.lineTo(xOff, cy - zigH);
    ctx.lineTo(xOff + zigW * 0.5, cy + zigH);
  }
  ctx.lineTo(cx + s * 0.6, cy);
  ctx.stroke();

  // Value label
  ctx.fillStyle = COLORS.text;
  ctx.font = `${10 * camera.zoom}px Manrope`;
  ctx.textAlign = "center";
  const r = c.resistance ?? 1000;
  const label = r >= 1e6 ? `${(r / 1e6).toFixed(1)}MΩ` : r >= 1000 ? `${(r / 1000).toFixed(1)}kΩ` : `${r}Ω`;
  ctx.fillText(label, cx, cy + s * 0.6);
}

function drawLed(
  ctx: CanvasRenderingContext2D,
  c: CircuitComponent,
  camera: Camera,
  selected: boolean,
  sim: SimulationResult | null,
): void {
  const [cx, cy] = worldToScreen(c.x, c.y, camera);
  const s = GRID_SIZE * camera.zoom;
  const color = selected ? COLORS.componentSelected : COLORS.component;

  // Lead wires
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * camera.zoom;
  ctx.beginPath();
  ctx.moveTo(cx - s, cy);
  ctx.lineTo(cx - s * 0.35, cy);
  ctx.moveTo(cx + s * 0.35, cy);
  ctx.lineTo(cx + s, cy);
  ctx.stroke();

  // Triangle (anode side)
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.35, cy - s * 0.3);
  ctx.lineTo(cx - s * 0.35, cy + s * 0.3);
  ctx.lineTo(cx + s * 0.25, cy);
  ctx.closePath();

  // Check if LED is on
  const current = sim?.componentCurrents.get(c.id) ?? 0;
  const isOn = current > 0.001;

  const ledColorMap: Record<string, string> = {
    red: COLORS.ledRed,
    green: COLORS.ledGreen,
    blue: COLORS.ledBlue,
    yellow: COLORS.ledYellow,
  };
  const ledCol = ledColorMap[c.ledColor ?? "red"] ?? COLORS.ledRed;

  if (isOn) {
    ctx.fillStyle = ledCol;
    ctx.fill();
    // Glow effect
    ctx.shadowColor = ledCol;
    ctx.shadowBlur = 15 * camera.zoom;
    ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  // Cathode bar
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5 * camera.zoom;
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.25, cy - s * 0.3);
  ctx.lineTo(cx + s * 0.25, cy + s * 0.3);
  ctx.stroke();

  // Arrows
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5 * camera.zoom;
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.1, cy - s * 0.45);
  ctx.lineTo(cx + s * 0.3, cy - s * 0.55);
  ctx.moveTo(cx + s * 0.25, cy - s * 0.55);
  ctx.lineTo(cx + s * 0.3, cy - s * 0.55);
  ctx.lineTo(cx + s * 0.3, cy - s * 0.5);
  ctx.stroke();
}

function drawSwitch(
  ctx: CanvasRenderingContext2D,
  c: CircuitComponent,
  camera: Camera,
  selected: boolean,
): void {
  const [cx, cy] = worldToScreen(c.x, c.y, camera);
  const s = GRID_SIZE * camera.zoom;
  const color = selected ? COLORS.componentSelected : COLORS.component;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * camera.zoom;
  ctx.lineCap = "round";

  // Lead wires
  ctx.beginPath();
  ctx.moveTo(cx - s, cy);
  ctx.lineTo(cx - s * 0.4, cy);
  ctx.moveTo(cx + s * 0.4, cy);
  ctx.lineTo(cx + s, cy);
  ctx.stroke();

  // Terminals (circles)
  ctx.beginPath();
  ctx.arc(cx - s * 0.4, cy, 3 * camera.zoom, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + s * 0.4, cy, 3 * camera.zoom, 0, Math.PI * 2);
  ctx.fill();

  // Switch arm
  ctx.strokeStyle = c.isClosed ? "#44cc44" : COLORS.warning;
  ctx.lineWidth = 2.5 * camera.zoom;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.4, cy);
  if (c.isClosed) {
    ctx.lineTo(cx + s * 0.4, cy);
  } else {
    ctx.lineTo(cx + s * 0.2, cy - s * 0.4);
  }
  ctx.stroke();

  // Label
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = `${9 * camera.zoom}px Manrope`;
  ctx.textAlign = "center";
  ctx.fillText(c.isClosed ? "CLOSED" : "OPEN", cx, cy + s * 0.6);
}

function drawCapacitor(
  ctx: CanvasRenderingContext2D,
  c: CircuitComponent,
  camera: Camera,
  selected: boolean,
): void {
  const [cx, cy] = worldToScreen(c.x, c.y, camera);
  const s = GRID_SIZE * camera.zoom;
  const color = selected ? COLORS.componentSelected : COLORS.component;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * camera.zoom;
  ctx.lineCap = "round";

  // Lead wires
  ctx.beginPath();
  ctx.moveTo(cx - s, cy);
  ctx.lineTo(cx - s * 0.15, cy);
  ctx.moveTo(cx + s * 0.15, cy);
  ctx.lineTo(cx + s, cy);
  ctx.stroke();

  // Two parallel plates
  ctx.lineWidth = 3 * camera.zoom;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.15, cy - s * 0.35);
  ctx.lineTo(cx - s * 0.15, cy + s * 0.35);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + s * 0.15, cy - s * 0.35);
  ctx.lineTo(cx + s * 0.15, cy + s * 0.35);
  ctx.stroke();

  // Value label
  ctx.fillStyle = COLORS.text;
  ctx.font = `${10 * camera.zoom}px Manrope`;
  ctx.textAlign = "center";
  const cap = c.capacitance ?? 100;
  ctx.fillText(`${cap}µF`, cx, cy + s * 0.6);
}

function drawAmmeter(
  ctx: CanvasRenderingContext2D,
  c: CircuitComponent,
  camera: Camera,
  selected: boolean,
  sim: SimulationResult | null,
): void {
  const [cx, cy] = worldToScreen(c.x, c.y, camera);
  const s = GRID_SIZE * camera.zoom;
  const color = selected ? COLORS.componentSelected : COLORS.component;

  // Lead wires
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * camera.zoom;
  ctx.beginPath();
  ctx.moveTo(cx - s, cy);
  ctx.lineTo(cx - s * 0.45, cy);
  ctx.moveTo(cx + s * 0.45, cy);
  ctx.lineTo(cx + s, cy);
  ctx.stroke();

  // Circle
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * camera.zoom;
  ctx.stroke();

  // "A" label
  ctx.fillStyle = COLORS.text;
  ctx.font = `bold ${14 * camera.zoom}px Manrope`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("A", cx, cy);
  ctx.textBaseline = "alphabetic";

  // Reading
  const current = sim?.componentCurrents.get(c.id);
  if (current !== undefined) {
    const mA = Math.abs(current) * 1000;
    const label = mA >= 1000 ? `${(mA / 1000).toFixed(2)}A` : `${mA.toFixed(1)}mA`;
    ctx.fillStyle = COLORS.componentSelected;
    ctx.font = `bold ${10 * camera.zoom}px Manrope`;
    ctx.fillText(label, cx, cy + s * 0.65);
  }
}

function drawVoltmeter(
  ctx: CanvasRenderingContext2D,
  c: CircuitComponent,
  camera: Camera,
  selected: boolean,
  sim: SimulationResult | null,
): void {
  const [cx, cy] = worldToScreen(c.x, c.y, camera);
  const s = GRID_SIZE * camera.zoom;
  const color = selected ? COLORS.componentSelected : COLORS.component;

  // Lead wires
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * camera.zoom;
  ctx.beginPath();
  ctx.moveTo(cx - s, cy);
  ctx.lineTo(cx - s * 0.45, cy);
  ctx.moveTo(cx + s * 0.45, cy);
  ctx.lineTo(cx + s, cy);
  ctx.stroke();

  // Circle
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * camera.zoom;
  ctx.stroke();

  // "V" label
  ctx.fillStyle = COLORS.text;
  ctx.font = `bold ${14 * camera.zoom}px Manrope`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("V", cx, cy);
  ctx.textBaseline = "alphabetic";

  // Reading
  const voltage = sim?.componentVoltages.get(c.id);
  if (voltage !== undefined) {
    const label = `${Math.abs(voltage).toFixed(2)}V`;
    ctx.fillStyle = COLORS.componentSelected;
    ctx.font = `bold ${10 * camera.zoom}px Manrope`;
    ctx.fillText(label, cx, cy + s * 0.65);
  }
}

function drawBulb(
  ctx: CanvasRenderingContext2D,
  c: CircuitComponent,
  camera: Camera,
  selected: boolean,
  sim: SimulationResult | null,
): void {
  const [cx, cy] = worldToScreen(c.x, c.y, camera);
  const s = GRID_SIZE * camera.zoom;
  const color = selected ? COLORS.componentSelected : COLORS.component;

  // Lead wires
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * camera.zoom;
  ctx.beginPath();
  ctx.moveTo(cx - s, cy);
  ctx.lineTo(cx - s * 0.45, cy);
  ctx.moveTo(cx + s * 0.45, cy);
  ctx.lineTo(cx + s, cy);
  ctx.stroke();

  // Check power for glow
  const power = sim?.componentPower.get(c.id) ?? 0;
  const brightness = Math.min(1, power / 2); // normalized brightness

  // Circle (bulb)
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.38, 0, Math.PI * 2);

  if (brightness > 0.01) {
    ctx.fillStyle = `rgba(255, 204, 34, ${brightness * 0.6})`;
    ctx.fill();
    ctx.shadowColor = COLORS.bulbGlow;
    ctx.shadowBlur = 20 * camera.zoom * brightness;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * camera.zoom;
  ctx.stroke();

  // Cross inside (filament)
  ctx.strokeStyle = brightness > 0.01 ? COLORS.bulbGlow : color;
  ctx.lineWidth = 1.5 * camera.zoom;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.2, cy - s * 0.2);
  ctx.lineTo(cx + s * 0.2, cy + s * 0.2);
  ctx.moveTo(cx + s * 0.2, cy - s * 0.2);
  ctx.lineTo(cx - s * 0.2, cy + s * 0.2);
  ctx.stroke();
}

/* ── Draw component (dispatcher) ─────────────────────────── */

export function drawComponent(
  ctx: CanvasRenderingContext2D,
  c: CircuitComponent,
  camera: Camera,
  selected: boolean,
  sim: SimulationResult | null,
): void {
  switch (c.kind) {
    case "battery":
      drawBattery(ctx, c, camera, selected);
      break;
    case "resistor":
      drawResistor(ctx, c, camera, selected);
      break;
    case "led":
      drawLed(ctx, c, camera, selected, sim);
      break;
    case "switch":
      drawSwitch(ctx, c, camera, selected);
      break;
    case "capacitor":
      drawCapacitor(ctx, c, camera, selected);
      break;
    case "ammeter":
      drawAmmeter(ctx, c, camera, selected, sim);
      break;
    case "voltmeter":
      drawVoltmeter(ctx, c, camera, selected, sim);
      break;
    case "bulb":
      drawBulb(ctx, c, camera, selected, sim);
      break;
  }
}

/* ── Ports ─────────────────────────────────────────────────── */

export function drawPorts(
  ctx: CanvasRenderingContext2D,
  c: CircuitComponent,
  camera: Camera,
  hoveredPortId: string | null,
): void {
  for (const port of c.ports) {
    const pos = getPortScreenPos(c, port, camera);
    const isHovered = port.id === hoveredPortId;
    const r = (isHovered ? 6 : 4) * camera.zoom;

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fillStyle = isHovered ? COLORS.portHover : COLORS.port;
    ctx.fill();
  }
}

/* ── Wires ─────────────────────────────────────────────────── */

export function drawWire(
  ctx: CanvasRenderingContext2D,
  wire: Wire,
  components: CircuitComponent[],
  camera: Camera,
  sim: SimulationResult | null,
  animTime: number,
): void {
  // Find the ports
  let fromPos: { x: number; y: number } | null = null;
  let toPos: { x: number; y: number } | null = null;

  for (const c of components) {
    for (const p of c.ports) {
      if (p.id === wire.fromPortId) {
        fromPos = getPortScreenPos(c, p, camera);
      }
      if (p.id === wire.toPortId) {
        toPos = getPortScreenPos(c, p, camera);
      }
    }
  }

  if (!fromPos || !toPos) return;

  // Draw right-angle routed wire
  const midX = (fromPos.x + toPos.x) / 2;

  ctx.strokeStyle = sim?.valid ? COLORS.wireActive : COLORS.wire;
  ctx.lineWidth = 2 * camera.zoom;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(fromPos.x, fromPos.y);
  ctx.lineTo(midX, fromPos.y);
  ctx.lineTo(midX, toPos.y);
  ctx.lineTo(toPos.x, toPos.y);
  ctx.stroke();

  // Current flow animation (moving dots)
  const current = sim?.wireCurrents.get(wire.id) ?? 0;
  if (sim?.valid && Math.abs(current) > 0.0001) {
    const dotSpacing = 20 * camera.zoom;
    const speed = current > 0 ? 1 : -1;
    const offset = (animTime * speed * 0.05) % dotSpacing;

    ctx.fillStyle = COLORS.currentDot;

    // Dots along the wire path segments
    const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [
      { x1: fromPos.x, y1: fromPos.y, x2: midX, y2: fromPos.y },
      { x1: midX, y1: fromPos.y, x2: midX, y2: toPos.y },
      { x1: midX, y1: toPos.y, x2: toPos.x, y2: toPos.y },
    ];

    let totalDist = 0;
    for (const seg of segments) {
      totalDist += Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
    }

    if (totalDist > 0) {
      for (let d = offset; d < totalDist; d += dotSpacing) {
        let remaining = d;
        for (const seg of segments) {
          const segLen = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
          if (remaining <= segLen && segLen > 0) {
            const t = remaining / segLen;
            const dx = seg.x1 + (seg.x2 - seg.x1) * t;
            const dy = seg.y1 + (seg.y2 - seg.y1) * t;
            ctx.beginPath();
            ctx.arc(dx, dy, 2.5 * camera.zoom, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          remaining -= segLen;
        }
      }
    }
  }
}

/* ── Wire preview (in-progress wiring) ───────────────────── */

export function drawWirePreview(
  ctx: CanvasRenderingContext2D,
  fromPos: { x: number; y: number },
  toPos: { x: number; y: number },
): void {
  const midX = (fromPos.x + toPos.x) / 2;

  ctx.strokeStyle = COLORS.port;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(fromPos.x, fromPos.y);
  ctx.lineTo(midX, fromPos.y);
  ctx.lineTo(midX, toPos.y);
  ctx.lineTo(toPos.x, toPos.y);
  ctx.stroke();

  ctx.setLineDash([]);
}
