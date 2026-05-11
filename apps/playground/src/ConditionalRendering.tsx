import { useState } from "react";

function StatusBadge({ status }: { status: "online" | "offline" | "away" | "busy" }) {
  const colors = { online: "#4caf50", offline: "#9e9e9e", away: "#ff9800", busy: "#f44336" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 12, background: `${colors[status]}20`, color: colors[status], fontSize: 12, fontWeight: "bold" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors[status] }} />
      {status}
    </span>
  );
}

function UserCard({ name, role, status, avatar }: { name: string; role: string; status: "online" | "offline" | "away" | "busy"; avatar: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e3f2fd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: "bold", color: "#1976d2" }}>
          {avatar}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: "bold", fontSize: 14 }}>{name}</div>
          <div style={{ fontSize: 12, color: "#666" }}>{role}</div>
        </div>
        <StatusBadge status={status} />
      </div>
      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee", fontSize: 12, color: "#666" }}>
          <p style={{ margin: 0 }}>
            {status === "online" && "Currently active and available for collaboration."}
            {status === "away" && "Stepped away. Will respond when back."}
            {status === "busy" && "In a meeting or focused work. Please leave a message."}
            {status === "offline" && "Currently offline. Messages will be delivered later."}
          </p>
        </div>
      )}
      <button onClick={() => setExpanded(!expanded)} style={{ marginTop: 8, background: "none", border: "none", color: "#1976d2", cursor: "pointer", fontSize: 12, padding: 0 }}>
        {expanded ? "Show less" : "Show more"}
      </button>
    </div>
  );
}

function Notification({ type, message, onDismiss }: { type: "info" | "success" | "warning" | "error"; message: string; onDismiss: () => void }) {
  const styles = {
    info: { bg: "#e3f2fd", border: "#90caf9", icon: "ℹ️" },
    success: { bg: "#e8f5e9", border: "#a5d6a7", icon: "✓" },
    warning: { bg: "#fff3e0", border: "#ffcc80", icon: "⚠" },
    error: { bg: "#fbe9e7", border: "#ef9a9a", icon: "✗" },
  };
  const style = styles[type];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: style.bg, border: `1px solid ${style.border}`, borderRadius: 4, marginBottom: 8 }}>
      <span>{style.icon}</span>
      <span style={{ flex: 1, fontSize: 13 }}>{message}</span>
      <button onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#666" }}>×</button>
    </div>
  );
}

export function ConditionalRendering() {
  const [notifications, setNotifications] = useState([
    { id: 1, type: "info" as const, message: "Welcome to the conditional rendering demo" },
    { id: 2, type: "success" as const, message: "All components loaded successfully" },
    { id: 3, type: "warning" as const, message: "Some features may be experimental" },
    { id: 4, type: "error" as const, message: "Connection to API timed out (simulated)" },
  ]);
  const [showUsers, setShowUsers] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const users = [
    { name: "Alice Chen", role: "Engineer", status: "online" as const, avatar: "AC" },
    { name: "Bob Smith", role: "Designer", status: "away" as const, avatar: "BS" },
    { name: "Carol Davis", role: "PM", status: "busy" as const, avatar: "CD" },
    { name: "Dan Wilson", role: "QA", status: "offline" as const, avatar: "DW" },
  ];

  const simulateLoad = () => {
    setLoading(true);
    setError(null);
    setTimeout(() => {
      if (Math.random() > 0.5) {
        setError("Failed to fetch data (simulated error)");
      }
      setLoading(false);
    }, 1500);
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 12px" }}>Conditional Rendering</h2>

      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Notifications ({notifications.length})</h3>
        {notifications.length > 0 ? (
          notifications.map((notif) => (
            <Notification
              key={notif.id}
              type={notif.type}
              message={notif.message}
              onDismiss={() => setNotifications((prev) => prev.filter((innerNotif) => innerNotif.id !== notif.id))}
            />
          ))
        ) : (
          <div style={{ padding: 16, textAlign: "center", color: "#999", background: "#f9f9f9", borderRadius: 4 }}>
            No notifications
          </div>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Counter: {count}</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setCount((prev) => prev - 1)} style={{ padding: "4px 12px" }}>-</button>
          <span style={{ minWidth: 40, textAlign: "center", fontWeight: "bold" }}>{count}</span>
          <button onClick={() => setCount((prev) => prev + 1)} style={{ padding: "4px 12px" }}>+</button>
          <span style={{ marginLeft: 12, fontSize: 12, color: "#666" }}>
            {count === 0 && "Zero"}
            {count > 0 && count < 5 && "Low"}
            {count >= 5 && count < 10 && "Medium"}
            {count >= 10 && "High!"}
            {count < 0 && "Negative"}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ fontSize: 14, margin: 0 }}>Users</h3>
          <button onClick={() => setShowUsers(!showUsers)} style={{ fontSize: 12, padding: "2px 8px", cursor: "pointer" }}>
            {showUsers ? "Hide" : "Show"}
          </button>
          <button onClick={simulateLoad} style={{ fontSize: 12, padding: "2px 8px", cursor: "pointer" }}>
            Simulate Load
          </button>
        </div>
        {loading ? (
          <div style={{ padding: 24, textAlign: "center", color: "#666" }}>Loading...</div>
        ) : error ? (
          <div style={{ padding: 16, background: "#fbe9e7", borderRadius: 4, color: "#c62828", fontSize: 13 }}>
            Error: {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 8, fontSize: 12 }}>Dismiss</button>
          </div>
        ) : showUsers ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {users.map((user) => (
              <UserCard key={user.name} {...user} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
