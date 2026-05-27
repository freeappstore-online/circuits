import { useState, useCallback, useEffect, useMemo } from "react";
import type {
  CircuitComponent,
  Wire,
  Camera,
  ToolMode,
  SimulationResult,
  Preset,
} from "./types";
import { createComponent, createWire, presets } from "./factory";
import { simulate } from "./simulation";
import Canvas from "./components/Canvas";
import Toolbar from "./components/Toolbar";
import PropertiesPanel from "./components/PropertiesPanel";
import InfoPanel from "./components/InfoPanel";
import PresetsBar from "./components/PresetsBar";
import TopBar from "./components/TopBar";

const INITIAL_CAMERA: Camera = { x: 200, y: 100, zoom: 1 };

export default function App() {
  const [components, setComponents] = useState<CircuitComponent[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<ToolMode>({ kind: "select" });
  const [camera, setCamera] = useState<Camera>(INITIAL_CAMERA);
  const [showInfo, setShowInfo] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Run simulation whenever components or wires change
  const simulation: SimulationResult | null = useMemo(() => {
    if (components.length === 0) return null;
    return simulate(components, wires);
  }, [components, wires]);

  // Selected component
  const selectedComponent = useMemo(() => {
    if (!selectedId) return null;
    return components.find((c) => c.id === selectedId) ?? null;
  }, [components, selectedId]);

  // Place component on canvas
  const handleCanvasClick = useCallback(
    (gridX: number, gridY: number) => {
      if (tool.kind === "place") {
        const comp = createComponent(tool.componentKind, gridX, gridY);
        setComponents((prev) => [...prev, comp]);
      }
    },
    [tool],
  );

  // Select a component
  const handleComponentClick = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  // Port click for wiring
  const handlePortClick = useCallback(
    (portId: string) => {
      if (tool.kind === "wire") {
        if (tool.fromPortId === null) {
          // Start wiring from this port
          setTool({ kind: "wire", fromPortId: portId });
        } else {
          // Complete wire to this port
          if (tool.fromPortId !== portId) {
            const wire = createWire(tool.fromPortId, portId);
            setWires((prev) => [...prev, wire]);
          }
          setTool({ kind: "wire", fromPortId: null });
        }
      } else if (tool.kind === "select") {
        // Clicking a port in select mode starts wiring
        setTool({ kind: "wire", fromPortId: portId });
      }
    },
    [tool],
  );

  // Drag component
  const handleComponentDrag = useCallback(
    (id: string, gridX: number, gridY: number) => {
      setComponents((prev) =>
        prev.map((c) => (c.id === id ? { ...c, x: gridX, y: gridY } : c)),
      );
    },
    [],
  );

  // Pan camera
  const handlePan = useCallback((dx: number, dy: number) => {
    setCamera((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);

  // Zoom camera
  const handleZoom = useCallback((delta: number, cx: number, cy: number) => {
    setCamera((prev) => {
      const newZoom = Math.max(0.25, Math.min(3, prev.zoom + delta));
      const ratio = newZoom / prev.zoom;
      return {
        x: cx - (cx - prev.x) * ratio,
        y: cy - (cy - prev.y) * ratio,
        zoom: newZoom,
      };
    });
  }, []);

  // Update component properties
  const handleUpdateComponent = useCallback(
    (id: string, updates: Partial<CircuitComponent>) => {
      setComponents((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      );
    },
    [],
  );

  // Delete component
  const handleDeleteComponent = useCallback(
    (id: string) => {
      const comp = components.find((c) => c.id === id);
      if (!comp) return;
      const portIds = new Set(comp.ports.map((p) => p.id));
      setComponents((prev) => prev.filter((c) => c.id !== id));
      setWires((prev) =>
        prev.filter(
          (w) => !portIds.has(w.fromPortId) && !portIds.has(w.toPortId),
        ),
      );
      if (selectedId === id) setSelectedId(null);
    },
    [components, selectedId],
  );

  // Toggle switch
  const handleSwitchToggle = useCallback((id: string) => {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === id && c.kind === "switch"
          ? { ...c, isClosed: !c.isClosed }
          : c,
      ),
    );
  }, []);

  // Load preset
  const handleLoadPreset = useCallback((preset: Preset) => {
    const { components: newComps, wires: newWires } = preset.build();
    setComponents(newComps);
    setWires(newWires);
    setSelectedId(null);
    setTool({ kind: "select" });
    setCamera(INITIAL_CAMERA);
  }, []);

  // Clear all
  const handleClear = useCallback(() => {
    setComponents([]);
    setWires([]);
    setSelectedId(null);
    setTool({ kind: "select" });
  }, []);

  // Mouse move
  const handleMouseMove = useCallback((x: number, y: number) => {
    setMousePos({ x, y });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          handleDeleteComponent(selectedId);
        }
      }
      if (e.key === "Escape") {
        setTool({ kind: "select" });
        setSelectedId(null);
      }
      if (e.key === "w" || e.key === "W") {
        if (tool.kind !== "wire") {
          setTool({ kind: "wire", fromPortId: null });
        }
      }
      if (e.key === "s" || e.key === "S") {
        if (!e.ctrlKey && !e.metaKey) {
          setTool({ kind: "select" });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, tool, handleDeleteComponent]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[var(--color-paper)]">
      {/* Canvas */}
      <Canvas
        components={components}
        wires={wires}
        camera={camera}
        selectedId={selectedId}
        tool={tool}
        simulation={simulation}
        mousePos={mousePos}
        onCanvasClick={handleCanvasClick}
        onComponentClick={handleComponentClick}
        onPortClick={handlePortClick}
        onComponentDrag={handleComponentDrag}
        onPan={handlePan}
        onZoom={handleZoom}
        onMouseMove={handleMouseMove}
        onSwitchToggle={handleSwitchToggle}
      />

      {/* Toolbar (left side) */}
      <Toolbar tool={tool} onSelectTool={setTool} />

      {/* Top bar (centered) */}
      <TopBar
        showInfo={showInfo}
        onToggleInfo={() => setShowInfo((v) => !v)}
        onClear={handleClear}
        warnings={simulation?.warnings ?? []}
      />

      {/* Properties panel (right, when component selected) */}
      {selectedComponent && (
        <PropertiesPanel
          component={selectedComponent}
          simulation={simulation}
          onUpdate={handleUpdateComponent}
          onDelete={handleDeleteComponent}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* Info panel (bottom right) */}
      {showInfo && (
        <InfoPanel
          components={components}
          simulation={simulation}
          onClose={() => setShowInfo(false)}
        />
      )}

      {/* Presets bar (bottom left) */}
      <PresetsBar presets={presets} onLoadPreset={handleLoadPreset} />

      {/* Keyboard hints */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-3 text-[10px] text-[var(--color-muted)]">
        <span>W = Wire tool</span>
        <span>S = Select</span>
        <span>Del = Delete</span>
        <span>Esc = Cancel</span>
        <span>Scroll = Zoom</span>
        <span>Drag empty = Pan</span>
        <span>Dbl-click switch = Toggle</span>
      </div>
    </div>
  );
}
