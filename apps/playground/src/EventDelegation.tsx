import { useState, useRef } from "react";

interface ClickEvent {
  id: number;
  type: string;
  target: string;
  timestamp: number;
  position: { x: number; y: number };
}

function DraggableBox({ label, color }: { label: string; color: string }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (event: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { x: event.clientX - position.x, y: event.clientY - position.y };
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!dragging) return;
    setPosition({
      x: event.clientX - dragStart.current.x,
      y: event.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: "relative",
        left: position.x,
        top: position.y,
        width: 80,
        height: 80,
        background: color,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        fontSize: 12,
        fontWeight: "bold",
        color: "#fff",
        boxShadow: dragging ? "0 4px 12px rgba(0,0,0,0.3)" : "0 2px 4px rgba(0,0,0,0.1)",
        transition: dragging ? "none" : "box-shadow 0.2s",
      }}
    >
      {label}
    </div>
  );
}

function KeyboardInput() {
  const [keys, setKeys] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    event.preventDefault();
    setKeys((prev) => [...prev.slice(-19), event.key]);
  };

  return (
    <div>
      <div
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          padding: 12,
          border: `2px solid ${focused ? "#1976d2" : "#ddd"}`,
          borderRadius: 4,
          minHeight: 60,
          outline: "none",
          cursor: "text",
          fontSize: 12,
          background: focused ? "#f5f9ff" : "#fff",
        }}
      >
        {!focused && keys.length === 0 && <span style={{ color: "#999" }}>Click here and type...</span>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {keys.map((key, index) => (
            <span key={index} style={{
              display: "inline-block",
              padding: "2px 6px",
              background: "#e3f2fd",
              borderRadius: 3,
              fontSize: 11,
              fontFamily: "monospace",
              border: "1px solid #90caf9",
            }}>
              {key === " " ? "Space" : key}
            </span>
          ))}
        </div>
      </div>
      <button onClick={() => setKeys([])} style={{ marginTop: 4, fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>Clear</button>
    </div>
  );
}

export function EventDelegation() {
  const [events, setEvents] = useState<ClickEvent[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  let eventId = useRef(0);

  const logEvent = (type: string, target: string, event: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    setEvents((prev) => [...prev.slice(-29), {
      id: eventId.current++,
      type,
      target,
      timestamp: Date.now(),
      position: { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) },
    }]);
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 12px" }}>Event Delegation & Interaction</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <h3 style={{ fontSize: 13, margin: "0 0 8px" }}>Click Targets</h3>
          <div
            ref={containerRef}
            onMouseMove={(event) => {
              const rect = containerRef.current?.getBoundingClientRect();
              setMousePos({ x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) });
            }}
            style={{ position: "relative", border: "1px solid #eee", borderRadius: 8, padding: 16, minHeight: 200 }}
          >
            <div style={{ fontSize: 10, color: "#999", position: "absolute", top: 4, right: 8 }}>
              Mouse: {mousePos.x.toFixed(0)}, {mousePos.y.toFixed(0)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
              {["red", "blue", "green", "orange", "purple", "teal"].map((color) => (
                <button
                  key={color}
                  onClick={(event) => logEvent("click", color, event)}
                  onDoubleClick={(event) => logEvent("dblclick", color, event)}
                  onContextMenu={(event) => { event.preventDefault(); logEvent("contextmenu", color, event); }}
                  style={{
                    padding: "12px 8px",
                    background: color,
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: "bold",
                    textTransform: "capitalize",
                  }}
                >
                  {color}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#666", margin: 0 }}>
              Click, double-click, or right-click the buttons above.
            </p>
          </div>

          <h3 style={{ fontSize: 13, margin: "16px 0 8px" }}>Keyboard Events</h3>
          <KeyboardInput />
        </div>

        <div>
          <h3 style={{ fontSize: 13, margin: "0 0 8px" }}>Drag & Drop</h3>
          <div style={{ display: "flex", gap: 12, marginBottom: 16, padding: 16, background: "#f9f9f9", borderRadius: 8, minHeight: 120 }}>
            <DraggableBox label="Box A" color="#2196f3" />
            <DraggableBox label="Box B" color="#4caf50" />
            <DraggableBox label="Box C" color="#ff9800" />
          </div>

          <h3 style={{ fontSize: 13, margin: "0 0 8px" }}>Event Log ({events.length})</h3>
          <div style={{ border: "1px solid #eee", borderRadius: 4, maxHeight: 200, overflow: "auto", fontSize: 11, fontFamily: "monospace" }}>
            {events.length === 0 && <div style={{ padding: 12, color: "#999", textAlign: "center" }}>No events yet</div>}
            {[...events].reverse().map((event) => (
              <div key={event.id} style={{ padding: "4px 8px", borderBottom: "1px solid #f5f5f5", display: "flex", gap: 8 }}>
                <span style={{ color: "#999", minWidth: 30 }}>#{event.id}</span>
                <span style={{ color: "#1976d2", minWidth: 70 }}>{event.type}</span>
                <span style={{ color: "#333" }}>{event.target}</span>
                <span style={{ color: "#999", marginLeft: "auto" }}>({event.position.x.toFixed(0)}, {event.position.y.toFixed(0)})</span>
              </div>
            ))}
          </div>
          {events.length > 0 && (
            <button onClick={() => setEvents([])} style={{ marginTop: 4, fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>Clear Log</button>
          )}
        </div>
      </div>
    </div>
  );
}
