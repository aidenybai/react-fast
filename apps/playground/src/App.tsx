import { useState } from "react";
import { SierpinskiNormal } from "./SierpinskiNormal";
import { SierpinskiOptimized } from "./SierpinskiOptimized";

export function App() {
  "use no fast";
  const [mode, setMode] = useState<"normal" | "optimized">("optimized");

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 20 }}>
      <h1 style={{ margin: "0 0 12px" }}>react-fast playground</h1>
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <button
          onClick={() => setMode("normal")}
          style={{
            padding: "6px 14px",
            fontWeight: mode === "normal" ? "bold" : "normal",
            background: mode === "normal" ? "#333" : "#eee",
            color: mode === "normal" ? "#fff" : "#333",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Normal React (no optimization)
        </button>
        <button
          onClick={() => setMode("optimized")}
          style={{
            padding: "6px 14px",
            fontWeight: mode === "optimized" ? "bold" : "normal",
            background: mode === "optimized" ? "#61dafb" : "#eee",
            color: mode === "optimized" ? "#000" : "#333",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Optimized (react-fast)
        </button>
      </div>
      <p style={{ fontSize: 13, color: "#666", margin: "0 0 12px" }}>
        Sierpinski Triangle — 729 nodes updating every frame with animation. Hover dots to trigger re-renders.
      </p>
      {mode === "normal" ? <SierpinskiNormal /> : <SierpinskiOptimized />}
    </div>
  );
}
