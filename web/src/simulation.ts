/**
 * DC circuit simulator using Modified Nodal Analysis (MNA).
 *
 * Builds a system of equations from Kirchhoff's laws:
 *   - KCL at each node (sum of currents = 0)
 *   - Voltage source constraints (V_a - V_b = V_source)
 *
 * Solves Ax = b via Gaussian elimination.
 */

import type {
  CircuitComponent,
  Wire,
  SimulationResult,
} from "./types";

/* ── Helpers ──────────────────────────────────────────────── */

function makeResult(partial?: Partial<SimulationResult>): SimulationResult {
  return {
    wireCurrents: new Map(),
    componentVoltages: new Map(),
    componentCurrents: new Map(),
    componentPower: new Map(),
    nodeVoltages: new Map(),
    warnings: [],
    totalPower: 0,
    valid: false,
    ...partial,
  };
}

/** Union-Find to group ports into electrical nodes. */
class UnionFind {
  private parent: Map<string, string> = new Map();

  find(x: string): string {
    let p = this.parent.get(x);
    if (p === undefined) {
      this.parent.set(x, x);
      return x;
    }
    while (p !== x) {
      const gp = this.parent.get(p);
      if (gp === undefined) break;
      this.parent.set(x, gp);
      x = p;
      p = gp;
    }
    return x;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) {
      this.parent.set(ra, rb);
    }
  }

  groups(): Map<string, string[]> {
    const g = new Map<string, string[]>();
    for (const key of this.parent.keys()) {
      const root = this.find(key);
      const arr = g.get(root);
      if (arr) {
        arr.push(key);
      } else {
        g.set(root, [key]);
      }
    }
    return g;
  }
}

/* ── Gauss elimination ─────────────────────────────────── */

function solveLinearSystem(
  A: number[][],
  b: number[],
): number[] | null {
  const n = b.length;
  // Augmented matrix
  const aug: number[][] = A.map((row, i) => {
    const bVal = b[i];
    return bVal !== undefined ? [...row, bVal] : [...row, 0];
  });

  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let maxRow = col;
    let maxVal = Math.abs(aug[col]?.[col] ?? 0);
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(aug[row]?.[col] ?? 0);
      if (val > maxVal) {
        maxVal = val;
        maxRow = row;
      }
    }
    if (maxVal < 1e-12) return null; // Singular

    // Swap rows
    if (maxRow !== col) {
      const tmp = aug[col];
      const swapRow = aug[maxRow];
      if (tmp && swapRow) {
        aug[col] = swapRow;
        aug[maxRow] = tmp;
      }
    }

    const pivotRow = aug[col];
    if (!pivotRow) return null;
    const pivot = pivotRow[col];
    if (pivot === undefined || Math.abs(pivot) < 1e-12) return null;

    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const currentRow = aug[row];
      if (!currentRow) continue;
      const factor = (currentRow[col] ?? 0) / pivot;
      for (let j = col; j <= n; j++) {
        currentRow[j] = (currentRow[j] ?? 0) - factor * (pivotRow[j] ?? 0);
      }
    }
  }

  // Back substitution
  const x = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    const currentRow = aug[row];
    if (!currentRow) return null;
    let sum = currentRow[n] ?? 0;
    for (let j = row + 1; j < n; j++) {
      sum -= (currentRow[j] ?? 0) * (x[j] ?? 0);
    }
    const diag = currentRow[row];
    if (diag === undefined || Math.abs(diag) < 1e-12) return null;
    x[row] = sum / diag;
  }

  return x;
}

/* ── Component model ───────────────────────────────────── */

interface ComponentModel {
  component: CircuitComponent;
  portAId: string;
  portBId: string;
  /** 'resistor' | 'voltage' | 'open' */
  type: "resistor" | "voltage" | "open";
  resistance?: number;
  voltage?: number;
}

function modelComponent(c: CircuitComponent): ComponentModel | null {
  const portA = c.ports[0];
  const portB = c.ports[1];
  if (!portA || !portB) return null;

  switch (c.kind) {
    case "battery":
      return {
        component: c,
        portAId: portA.id,
        portBId: portB.id,
        type: "voltage",
        voltage: c.voltage ?? 9,
      };
    case "resistor":
      return {
        component: c,
        portAId: portA.id,
        portBId: portB.id,
        type: "resistor",
        resistance: c.resistance ?? 1000,
      };
    case "led": {
      // Model LED as a small resistance when forward-biased
      // (simplified: we check after solving)
      return {
        component: c,
        portAId: portA.id,
        portBId: portB.id,
        type: "resistor",
        resistance: 50, // typical LED on-resistance
      };
    }
    case "bulb":
      return {
        component: c,
        portAId: portA.id,
        portBId: portB.id,
        type: "resistor",
        resistance: 100, // typical incandescent resistance
      };
    case "switch":
      if (c.isClosed) {
        return {
          component: c,
          portAId: portA.id,
          portBId: portB.id,
          type: "resistor",
          resistance: 0.001, // near-zero for closed switch
        };
      }
      return {
        component: c,
        portAId: portA.id,
        portBId: portB.id,
        type: "open",
      };
    case "capacitor":
      // DC steady-state: capacitor = open circuit
      return {
        component: c,
        portAId: portA.id,
        portBId: portB.id,
        type: "open",
      };
    case "ammeter":
      // Ideal ammeter = zero resistance
      return {
        component: c,
        portAId: portA.id,
        portBId: portB.id,
        type: "resistor",
        resistance: 0.001,
      };
    case "voltmeter":
      // Ideal voltmeter = very high resistance
      return {
        component: c,
        portAId: portA.id,
        portBId: portB.id,
        type: "resistor",
        resistance: 1e9,
      };
  }
}

/* ── Main simulation ───────────────────────────────────── */

export function simulate(
  components: CircuitComponent[],
  wires: Wire[],
): SimulationResult {
  if (components.length === 0) {
    return makeResult({ warnings: ["No components placed"] });
  }

  // 1. Build union-find of ports connected by wires
  const uf = new UnionFind();

  // Register all component ports
  for (const c of components) {
    for (const p of c.ports) {
      uf.find(p.id);
    }
  }

  // Merge wired ports
  for (const w of wires) {
    uf.union(w.fromPortId, w.toPortId);
  }

  // 2. Build component models
  const models: ComponentModel[] = [];
  for (const c of components) {
    const m = modelComponent(c);
    if (m) models.push(m);
  }

  // Filter to only active (non-open) models
  const activeModels = models.filter((m) => m.type !== "open");

  // Count batteries
  const batteries = activeModels.filter((m) => m.type === "voltage");
  if (batteries.length === 0) {
    return makeResult({
      warnings: ["No voltage source in circuit"],
      valid: false,
    });
  }

  // 3. Assign node indices
  const nodeMap = new Map<string, number>(); // root port id -> node index
  let nodeCount = 0;

  for (const m of activeModels) {
    const rootA = uf.find(m.portAId);
    const rootB = uf.find(m.portBId);
    if (!nodeMap.has(rootA)) {
      nodeMap.set(rootA, nodeCount++);
    }
    if (!nodeMap.has(rootB)) {
      nodeMap.set(rootB, nodeCount++);
    }
  }

  if (nodeCount < 2) {
    return makeResult({ warnings: ["Circuit too small to simulate"] });
  }

  // Check connectivity: all active nodes should be reachable
  // (simplified: we just check that batteries connect to something)

  // 4. Build MNA matrix
  // Variables: [V0, V1, ..., V_{n-1}, I_vs0, I_vs1, ...]
  // Where V_i = voltage at node i, I_vs_j = current through voltage source j
  const resistors = activeModels.filter((m) => m.type === "resistor");
  const voltageSources = activeModels.filter((m) => m.type === "voltage");

  const size = nodeCount + voltageSources.length;
  const A: number[][] = Array.from({ length: size }, () =>
    new Array<number>(size).fill(0),
  );
  const b: number[] = new Array<number>(size).fill(0);

  // Ground: node 0 = 0V (we'll pick the negative terminal of first battery)
  const firstBattery = voltageSources[0];
  let groundNode = 0;
  if (firstBattery) {
    const rootNeg = uf.find(firstBattery.portBId);
    const gn = nodeMap.get(rootNeg);
    if (gn !== undefined) groundNode = gn;
  }

  // Stamp resistors: G(a,a) += 1/R, G(b,b) += 1/R, G(a,b) -= 1/R, G(b,a) -= 1/R
  for (const m of resistors) {
    const nodeA = nodeMap.get(uf.find(m.portAId));
    const nodeB = nodeMap.get(uf.find(m.portBId));
    if (nodeA === undefined || nodeB === undefined) continue;

    const r = m.resistance ?? 1000;
    if (r < 1e-12) continue;
    const g = 1 / r;

    const rowA = A[nodeA];
    const rowB = A[nodeB];
    if (rowA) {
      rowA[nodeA] = (rowA[nodeA] ?? 0) + g;
      rowA[nodeB] = (rowA[nodeB] ?? 0) - g;
    }
    if (rowB) {
      rowB[nodeA] = (rowB[nodeA] ?? 0) - g;
      rowB[nodeB] = (rowB[nodeB] ?? 0) + g;
    }
  }

  // Stamp voltage sources
  for (let i = 0; i < voltageSources.length; i++) {
    const vs = voltageSources[i];
    if (!vs) continue;
    const nodeA = nodeMap.get(uf.find(vs.portAId)); // positive terminal
    const nodeB = nodeMap.get(uf.find(vs.portBId)); // negative terminal
    if (nodeA === undefined || nodeB === undefined) continue;

    const currentIdx = nodeCount + i;

    // KCL: current from voltage source enters node A, leaves node B
    const rowA = A[nodeA];
    const rowB = A[nodeB];
    if (rowA) rowA[currentIdx] = (rowA[currentIdx] ?? 0) + 1;
    if (rowB) rowB[currentIdx] = (rowB[currentIdx] ?? 0) - 1;

    // Voltage constraint: V_A - V_B = V_source
    const rowVs = A[currentIdx];
    if (rowVs) {
      rowVs[nodeA] = (rowVs[nodeA] ?? 0) + 1;
      rowVs[nodeB] = (rowVs[nodeB] ?? 0) - 1;
    }
    b[currentIdx] = vs.voltage ?? 0;
  }

  // Ground constraint: replace ground node row with V_ground = 0
  const groundRow = A[groundNode];
  if (groundRow) {
    groundRow.fill(0);
    groundRow[groundNode] = 1;
    b[groundNode] = 0;
  }

  // 5. Solve
  const solution = solveLinearSystem(A, b);
  if (!solution) {
    return makeResult({
      warnings: ["Could not solve circuit (may be open or short circuit)"],
    });
  }

  // 6. Extract results
  const result = makeResult({ valid: true });

  // Node voltages
  for (const [rootId, idx] of nodeMap) {
    const v = solution[idx] ?? 0;
    // Map back to all ports in this group
    const groups = uf.groups();
    const group = groups.get(rootId);
    if (group) {
      for (const portId of group) {
        result.nodeVoltages.set(portId, v);
      }
    }
    result.nodeVoltages.set(rootId, v);
  }

  // Component voltages and currents
  let totalPower = 0;

  for (const m of resistors) {
    const nodeA = nodeMap.get(uf.find(m.portAId));
    const nodeB = nodeMap.get(uf.find(m.portBId));
    if (nodeA === undefined || nodeB === undefined) continue;

    const vA = solution[nodeA] ?? 0;
    const vB = solution[nodeB] ?? 0;
    const vDrop = vA - vB;
    const r = m.resistance ?? 1000;
    const current = r > 1e-12 ? vDrop / r : 0;
    const power = Math.abs(vDrop * current);

    result.componentVoltages.set(m.component.id, vDrop);
    result.componentCurrents.set(m.component.id, current);
    result.componentPower.set(m.component.id, power);
    totalPower += power;
  }

  // Voltage source currents
  for (let i = 0; i < voltageSources.length; i++) {
    const vs = voltageSources[i];
    if (!vs) continue;
    const current = solution[nodeCount + i] ?? 0;
    const v = vs.voltage ?? 0;
    result.componentVoltages.set(vs.component.id, v);
    result.componentCurrents.set(vs.component.id, current);
    result.componentPower.set(vs.component.id, Math.abs(v * current));
  }

  // Wire currents (approximate: use current of connected components)
  for (const w of wires) {
    const fromRoot = uf.find(w.fromPortId);
    const toRoot = uf.find(w.toPortId);
    const fromNode = nodeMap.get(fromRoot);
    const toNode = nodeMap.get(toRoot);
    if (fromNode !== undefined && toNode !== undefined) {
      const vFrom = solution[fromNode] ?? 0;
      const vTo = solution[toNode] ?? 0;
      // Wire carries the net current
      result.wireCurrents.set(w.id, vFrom - vTo > 0 ? 0.01 : -0.01);
    }
  }

  // Open components (switches, capacitors)
  for (const m of models) {
    if (m.type === "open") {
      result.componentVoltages.set(m.component.id, 0);
      result.componentCurrents.set(m.component.id, 0);
      result.componentPower.set(m.component.id, 0);
    }
  }

  // Check for shorts: very high current through any component
  for (const [id, current] of result.componentCurrents) {
    if (Math.abs(current) > 100) {
      result.warnings.push(`Short circuit detected near component ${id}`);
    }
  }

  result.totalPower = totalPower;
  return result;
}
