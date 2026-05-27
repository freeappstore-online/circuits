import {
  useRef,
  useEffect,
  useCallback,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type {
  CircuitComponent,
  Wire,
  Camera,
  SimulationResult,
  ToolMode,
} from "../types";
import {
  drawGrid,
  drawComponent,
  drawPorts,
  drawWire,
  drawWirePreview,
  getPortScreenPos,
  GRID_SIZE,
} from "../rendering";

interface CanvasProps {
  components: CircuitComponent[];
  wires: Wire[];
  camera: Camera;
  selectedId: string | null;
  tool: ToolMode;
  simulation: SimulationResult | null;
  mousePos: { x: number; y: number };
  onCanvasClick: (gridX: number, gridY: number) => void;
  onComponentClick: (id: string) => void;
  onPortClick: (portId: string) => void;
  onComponentDrag: (id: string, gridX: number, gridY: number) => void;
  onPan: (dx: number, dy: number) => void;
  onZoom: (delta: number, cx: number, cy: number) => void;
  onMouseMove: (x: number, y: number) => void;
  onSwitchToggle: (id: string) => void;
}

const HIT_RADIUS = 20;
const PORT_HIT_RADIUS = 15;

export default function Canvas({
  components,
  wires,
  camera,
  selectedId,
  tool,
  simulation,
  mousePos,
  onCanvasClick,
  onComponentClick,
  onPortClick,
  onComponentDrag,
  onPan,
  onZoom,
  onMouseMove,
  onSwitchToggle,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const animTimeRef = useRef(0);
  const draggingRef = useRef<{ componentId: string; offsetX: number; offsetY: number } | null>(null);
  const panningRef = useRef<{ startX: number; startY: number } | null>(null);
  const hoveredPortRef = useRef<string | null>(null);

  // Find nearest port to screen position
  const findPortAt = useCallback(
    (sx: number, sy: number): { portId: string; comp: CircuitComponent } | null => {
      let closest: { portId: string; comp: CircuitComponent; dist: number } | null = null;
      for (const c of components) {
        for (const p of c.ports) {
          const pos = getPortScreenPos(c, p, camera);
          const dist = Math.hypot(pos.x - sx, pos.y - sy);
          if (dist < PORT_HIT_RADIUS * camera.zoom) {
            if (!closest || dist < closest.dist) {
              closest = { portId: p.id, comp: c, dist };
            }
          }
        }
      }
      return closest ? { portId: closest.portId, comp: closest.comp } : null;
    },
    [components, camera],
  );

  // Find component at screen position
  const findComponentAt = useCallback(
    (sx: number, sy: number): CircuitComponent | null => {
      for (let i = components.length - 1; i >= 0; i--) {
        const c = components[i];
        if (!c) continue;
        const cx = c.x * GRID_SIZE * camera.zoom + camera.x;
        const cy = c.y * GRID_SIZE * camera.zoom + camera.y;
        const hitSize = GRID_SIZE * camera.zoom + HIT_RADIUS;
        if (Math.abs(sx - cx) < hitSize && Math.abs(sy - cy) < hitSize) {
          return c;
        }
      }
      return null;
    },
    [components, camera],
  );

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;

    const draw = () => {
      if (!running) return;
      animTimeRef.current += 1;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      // Clear
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Grid
      drawGrid(ctx, camera, rect.width, rect.height);

      // Wires
      for (const w of wires) {
        drawWire(ctx, w, components, camera, simulation, animTimeRef.current);
      }

      // Wire preview
      if (tool.kind === "wire" && tool.fromPortId) {
        let fromPos: { x: number; y: number } | null = null;
        for (const c of components) {
          for (const p of c.ports) {
            if (p.id === tool.fromPortId) {
              fromPos = getPortScreenPos(c, p, camera);
            }
          }
        }
        if (fromPos) {
          drawWirePreview(ctx, fromPos, mousePos);
        }
      }

      // Components
      for (const c of components) {
        drawComponent(ctx, c, camera, c.id === selectedId, simulation);
        drawPorts(ctx, c, camera, hoveredPortRef.current);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [components, wires, camera, selectedId, tool, simulation, mousePos]);

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      // Check for port click first (for wiring)
      if (tool.kind === "wire" || tool.kind === "select") {
        const portHit = findPortAt(sx, sy);
        if (portHit) {
          onPortClick(portHit.portId);
          return;
        }
      }

      // Check for component click
      if (tool.kind === "select") {
        const comp = findComponentAt(sx, sy);
        if (comp) {
          // Double-click on switch toggles it
          if (comp.kind === "switch" && e.detail === 2) {
            onSwitchToggle(comp.id);
            return;
          }
          onComponentClick(comp.id);
          // Start drag
          const cx = comp.x * GRID_SIZE * camera.zoom + camera.x;
          const cy = comp.y * GRID_SIZE * camera.zoom + camera.y;
          draggingRef.current = {
            componentId: comp.id,
            offsetX: sx - cx,
            offsetY: sy - cy,
          };
          return;
        }
      }

      // Place component
      if (tool.kind === "place") {
        const gridX = Math.round(
          (sx - camera.x) / (GRID_SIZE * camera.zoom),
        );
        const gridY = Math.round(
          (sy - camera.y) / (GRID_SIZE * camera.zoom),
        );
        onCanvasClick(gridX, gridY);
        return;
      }

      // Start panning
      panningRef.current = { startX: e.clientX, startY: e.clientY };
    },
    [tool, camera, findPortAt, findComponentAt, onPortClick, onComponentClick, onCanvasClick, onSwitchToggle],
  );

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      onMouseMove(sx, sy);

      // Update hovered port
      const portHit = findPortAt(sx, sy);
      hoveredPortRef.current = portHit?.portId ?? null;

      // Dragging component
      if (draggingRef.current) {
        const gridX = Math.round(
          (sx - draggingRef.current.offsetX - camera.x) / (GRID_SIZE * camera.zoom),
        );
        const gridY = Math.round(
          (sy - draggingRef.current.offsetY - camera.y) / (GRID_SIZE * camera.zoom),
        );
        onComponentDrag(draggingRef.current.componentId, gridX, gridY);
        return;
      }

      // Panning
      if (panningRef.current) {
        const dx = e.clientX - panningRef.current.startX;
        const dy = e.clientY - panningRef.current.startY;
        panningRef.current = { startX: e.clientX, startY: e.clientY };
        onPan(dx, dy);
      }
    },
    [camera, findPortAt, onMouseMove, onComponentDrag, onPan],
  );

  const handleMouseUp = useCallback(() => {
    draggingRef.current = null;
    panningRef.current = null;
  }, []);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      onZoom(-e.deltaY * 0.001, cx, cy);
    },
    [onZoom],
  );

  // Attach wheel handler with passive: false
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ cursor: tool.kind === "place" ? "crosshair" : tool.kind === "wire" ? "crosshair" : "default" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}
