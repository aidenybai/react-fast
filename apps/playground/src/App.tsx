import { useState } from "react";
import { SierpinskiNormal } from "./SierpinskiNormal";
import { SierpinskiOptimized } from "./SierpinskiOptimized";
import { TodoApp } from "./TodoApp";
import { DataGrid } from "./DataGrid";
import { FormDemo } from "./FormDemo";
import { ConditionalRendering } from "./ConditionalRendering";
import { DynamicList } from "./DynamicList";
import { NestedComponents } from "./NestedComponents";
import { SVGDemo } from "./SVGDemo";
import { EventDelegation } from "./EventDelegation";

type DemoKey =
  | "todo"
  | "grid"
  | "form"
  | "conditional"
  | "dynamic-list"
  | "nested"
  | "svg"
  | "events"
  | "sierpinski-opt"
  | "sierpinski-normal";

const DEMOS: { key: DemoKey; label: string }[] = [
  { key: "todo", label: "Todo App" },
  { key: "grid", label: "Data Grid" },
  { key: "form", label: "Forms" },
  { key: "conditional", label: "Conditionals" },
  { key: "dynamic-list", label: "Dynamic Lists" },
  { key: "nested", label: "Nested Components" },
  { key: "svg", label: "SVG" },
  { key: "events", label: "Events" },
  { key: "sierpinski-opt", label: "Sierpinski (optimized)" },
  { key: "sierpinski-normal", label: "Sierpinski (normal)" },
];

export function App() {
  "use no fast";
  const [activeDemo, setActiveDemo] = useState<DemoKey>("todo");

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 12px" }}>react-fast playground</h1>
      <p style={{ fontSize: 13, color: "#666", margin: "0 0 16px" }}>
        Complex application testing many compiler patterns. Check console for errors.
      </p>
      <nav style={{ marginBottom: 16, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {DEMOS.map((demo) => (
          <button
            key={demo.key}
            onClick={() => setActiveDemo(demo.key)}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: activeDemo === demo.key ? "bold" : "normal",
              background: activeDemo === demo.key ? "#61dafb" : "#f0f0f0",
              color: activeDemo === demo.key ? "#000" : "#333",
              border: "1px solid #ddd",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {demo.label}
          </button>
        ))}
      </nav>
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, padding: 16, minHeight: 400 }}>
        {activeDemo === "todo" && <TodoApp />}
        {activeDemo === "grid" && <DataGrid />}
        {activeDemo === "form" && <FormDemo />}
        {activeDemo === "conditional" && <ConditionalRendering />}
        {activeDemo === "dynamic-list" && <DynamicList />}
        {activeDemo === "nested" && <NestedComponents />}
        {activeDemo === "svg" && <SVGDemo />}
        {activeDemo === "events" && <EventDelegation />}
        {activeDemo === "sierpinski-opt" && <SierpinskiOptimized />}
        {activeDemo === "sierpinski-normal" && <SierpinskiNormal />}
      </div>
    </div>
  );
}
