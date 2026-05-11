import { useState, useRef } from "react";

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
}

let nextId = 1;

function TodoRow({ item, onToggle, onDelete, onEdit }: {
  item: TodoItem;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);

  const priorityColors = { low: "#4caf50", medium: "#ff9800", high: "#f44336" };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      borderBottom: "1px solid #eee",
      background: item.completed ? "#f9f9f9" : "#fff",
    }}>
      <input type="checkbox" checked={item.completed} onChange={onToggle} />
      <span style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: priorityColors[item.priority],
        flexShrink: 0,
      }} />
      {editing ? (
        <input
          type="text"
          value={editText}
          onChange={(event) => setEditText(event.target.value)}
          onBlur={() => { onEdit(editText); setEditing(false); }}
          onKeyDown={(event) => { if (event.key === "Enter") { onEdit(editText); setEditing(false); } }}
          style={{ flex: 1, padding: "2px 6px", fontSize: 14 }}
          autoFocus
        />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          style={{
            flex: 1,
            textDecoration: item.completed ? "line-through" : "none",
            color: item.completed ? "#999" : "#333",
            cursor: "pointer",
          }}
        >
          {item.text}
        </span>
      )}
      <span style={{ fontSize: 11, color: "#999" }}>#{item.id}</span>
      <button onClick={onDelete} style={{ background: "none", border: "none", color: "#f44336", cursor: "pointer", fontSize: 16 }}>×</button>
    </div>
  );
}

export function TodoApp() {
  const [items, setItems] = useState<TodoItem[]>([
    { id: nextId++, text: "Build complex playground", completed: true, priority: "high" },
    { id: nextId++, text: "Test compiler edge cases", completed: false, priority: "high" },
    { id: nextId++, text: "Fix any discovered issues", completed: false, priority: "medium" },
    { id: nextId++, text: "Optimize performance", completed: false, priority: "low" },
  ]);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [sortBy, setSortBy] = useState<"id" | "priority">("id");
  const inputRef = useRef<HTMLInputElement>(null);
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");

  const addTodo = () => {
    const text = inputRef.current?.value.trim();
    if (!text) return;
    setItems((prev) => [...prev, { id: nextId++, text, completed: false, priority: newPriority }]);
    inputRef.current!.value = "";
  };

  const filteredItems = items.filter((item) => {
    if (filter === "active") return !item.completed;
    if (filter === "completed") return item.completed;
    return true;
  });

  const sortedItems = [...filteredItems].sort((itemA, itemB) => {
    if (sortBy === "priority") {
      const order = { high: 0, medium: 1, low: 2 };
      return order[itemA.priority] - order[itemB.priority];
    }
    return itemA.id - itemB.id;
  });

  const activeCount = items.filter((item) => !item.completed).length;

  return (
    <div>
      <h2 style={{ margin: "0 0 12px" }}>Todo App</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Add a todo..."
          onKeyDown={(event) => { if (event.key === "Enter") addTodo(); }}
          style={{ flex: 1, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14 }}
        />
        <select value={newPriority} onChange={(event) => setNewPriority(event.target.value as TodoItem["priority"])} style={{ padding: "8px", borderRadius: 4, border: "1px solid #ddd" }}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button onClick={addTodo} style={{ padding: "8px 16px", background: "#61dafb", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>
          Add
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, fontSize: 13 }}>
        <span style={{ color: "#666" }}>Filter:</span>
        {(["all", "active", "completed"] as const).map((filterValue) => (
          <button
            key={filterValue}
            onClick={() => setFilter(filterValue)}
            style={{
              padding: "2px 8px",
              fontSize: 12,
              background: filter === filterValue ? "#333" : "#eee",
              color: filter === filterValue ? "#fff" : "#333",
              border: "none",
              borderRadius: 3,
              cursor: "pointer",
            }}
          >
            {filterValue}
          </button>
        ))}
        <span style={{ color: "#666", marginLeft: 8 }}>Sort:</span>
        <button onClick={() => setSortBy("id")} style={{ padding: "2px 8px", fontSize: 12, background: sortBy === "id" ? "#333" : "#eee", color: sortBy === "id" ? "#fff" : "#333", border: "none", borderRadius: 3, cursor: "pointer" }}>
          By ID
        </button>
        <button onClick={() => setSortBy("priority")} style={{ padding: "2px 8px", fontSize: 12, background: sortBy === "priority" ? "#333" : "#eee", color: sortBy === "priority" ? "#fff" : "#333", border: "none", borderRadius: 3, cursor: "pointer" }}>
          By Priority
        </button>
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 4, overflow: "hidden" }}>
        {sortedItems.map((item) => (
          <TodoRow
            key={item.id}
            item={item}
            onToggle={() => setItems((prev) => prev.map((inner) => inner.id === item.id ? { ...inner, completed: !inner.completed } : inner))}
            onDelete={() => setItems((prev) => prev.filter((inner) => inner.id !== item.id))}
            onEdit={(text) => setItems((prev) => prev.map((inner) => inner.id === item.id ? { ...inner, text } : inner))}
          />
        ))}
        {sortedItems.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "#999" }}>No items</div>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 13, color: "#666", display: "flex", justifyContent: "space-between" }}>
        <span>{activeCount} item{activeCount !== 1 ? "s" : ""} remaining</span>
        <button
          onClick={() => setItems((prev) => prev.filter((item) => !item.completed))}
          style={{ background: "none", border: "none", color: "#f44336", cursor: "pointer", fontSize: 12 }}
        >
          Clear completed
        </button>
      </div>
    </div>
  );
}
