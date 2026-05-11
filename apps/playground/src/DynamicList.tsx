import { useState, useEffect } from "react";

interface ListItem {
  id: number;
  label: string;
  color: string;
  size: number;
}

const COLORS = ["#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50", "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", "#ff9800", "#ff5722"];

let globalId = 0;

const createItem = (): ListItem => ({
  id: globalId++,
  label: `Item ${globalId}`,
  color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
  size: 20 + Math.floor(Math.random() * 40),
});

function AnimatedItem({ item, onRemove }: { item: ListItem; onRemove: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        margin: 3,
        borderRadius: 16,
        background: hovered ? item.color : `${item.color}30`,
        color: hovered ? "#fff" : item.color,
        fontSize: item.size * 0.4,
        fontWeight: "bold",
        cursor: "pointer",
        transition: "all 0.15s",
        transform: hovered ? "scale(1.1)" : "scale(1)",
      }}
      onClick={onRemove}
    >
      <span style={{ width: item.size * 0.3, height: item.size * 0.3, borderRadius: "50%", background: "currentColor", opacity: 0.7 }} />
      {item.label}
    </div>
  );
}

export function DynamicList() {
  const [items, setItems] = useState<ListItem[]>(() => Array.from({ length: 20 }, createItem));
  const [autoAdd, setAutoAdd] = useState(false);
  const [batchSize, setBatchSize] = useState(5);
  const [reverseOrder, setReverseOrder] = useState(false);

  useEffect(() => {
    if (!autoAdd) return;
    const interval = setInterval(() => {
      setItems((prev) => [...prev, createItem()]);
    }, 300);
    return () => clearInterval(interval);
  }, [autoAdd]);

  const addBatch = () => {
    const batch = Array.from({ length: batchSize }, createItem);
    setItems((prev) => [...prev, ...batch]);
  };

  const removeLast = () => {
    setItems((prev) => prev.slice(0, -1));
  };

  const removeFirst = () => {
    setItems((prev) => prev.slice(1));
  };

  const removeRandom = () => {
    setItems((prev) => {
      if (prev.length === 0) return prev;
      const randomIndex = Math.floor(Math.random() * prev.length);
      return [...prev.slice(0, randomIndex), ...prev.slice(randomIndex + 1)];
    });
  };

  const shuffle = () => {
    setItems((prev) => {
      const shuffled = [...prev];
      for (let index = shuffled.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex]!, shuffled[index]!];
      }
      return shuffled;
    });
  };

  const swap = () => {
    setItems((prev) => {
      if (prev.length < 2) return prev;
      const swapped = [...prev];
      const indexA = Math.floor(Math.random() * swapped.length);
      let indexB = Math.floor(Math.random() * swapped.length);
      while (indexB === indexA) indexB = Math.floor(Math.random() * swapped.length);
      [swapped[indexA], swapped[indexB]] = [swapped[indexB]!, swapped[indexA]!];
      return swapped;
    });
  };

  const displayItems = reverseOrder ? [...items].reverse() : items;

  return (
    <div>
      <h2 style={{ margin: "0 0 12px" }}>Dynamic List ({items.length} items)</h2>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={() => setItems((prev) => [...prev, createItem()])} style={{ padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>+ Add One</button>
        <button onClick={addBatch} style={{ padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>+ Add {batchSize}</button>
        <button onClick={removeFirst} style={{ padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>- Remove First</button>
        <button onClick={removeLast} style={{ padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>- Remove Last</button>
        <button onClick={removeRandom} style={{ padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>- Remove Random</button>
        <button onClick={shuffle} style={{ padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Shuffle</button>
        <button onClick={swap} style={{ padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Swap Two</button>
        <button onClick={() => setItems([])} style={{ padding: "6px 12px", fontSize: 12, cursor: "pointer", color: "#f44336" }}>Clear All</button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center", fontSize: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
          <input type="checkbox" checked={autoAdd} onChange={(event) => setAutoAdd(event.target.checked)} />
          Auto-add
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
          <input type="checkbox" checked={reverseOrder} onChange={(event) => setReverseOrder(event.target.checked)} />
          Reverse
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          Batch:
          <input type="number" value={batchSize} onChange={(event) => setBatchSize(Math.max(1, Number(event.target.value)))} style={{ width: 50, padding: "2px 4px" }} min={1} max={100} />
        </label>
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, minHeight: 100, maxHeight: 400, overflow: "auto" }}>
        {displayItems.map((item) => (
          <AnimatedItem key={item.id} item={item} onRemove={() => setItems((prev) => prev.filter((inner) => inner.id !== item.id))} />
        ))}
        {items.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "#999" }}>Empty list. Add some items!</div>
        )}
      </div>
    </div>
  );
}
