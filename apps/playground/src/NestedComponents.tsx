import { useState, createContext, useContext } from "react";

interface ThemeContextValue {
  mode: "light" | "dark";
  accent: string;
}

const ThemeContext = createContext<ThemeContextValue>({ mode: "light", accent: "#1976d2" });

function ThemedBox({ children, depth }: { children: React.ReactNode; depth: number }) {
  const theme = useContext(ThemeContext);
  const isDark = theme.mode === "dark";
  return (
    <div style={{
      padding: 12,
      marginBottom: 8,
      borderRadius: 6,
      border: `1px solid ${isDark ? "#444" : "#e0e0e0"}`,
      background: isDark ? `hsl(220, 20%, ${12 + depth * 3}%)` : `hsl(220, 20%, ${97 - depth * 3}%)`,
      color: isDark ? "#e0e0e0" : "#333",
    }}>
      {children}
    </div>
  );
}

function Accordion({ title, children, defaultOpen }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? false);
  const theme = useContext(ThemeContext);

  return (
    <div style={{ marginBottom: 8, border: `1px solid ${theme.mode === "dark" ? "#555" : "#ddd"}`, borderRadius: 4, overflow: "hidden" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "10px 12px",
          background: theme.mode === "dark" ? "#2a2a2a" : "#f5f5f5",
          border: "none",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: theme.mode === "dark" ? "#e0e0e0" : "#333",
          fontSize: 13,
          fontWeight: "bold",
        }}
      >
        {title}
        <span style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>▶</span>
      </button>
      {isOpen && (
        <div style={{ padding: 12, background: theme.mode === "dark" ? "#1a1a1a" : "#fff" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function TabPanel({ tabs }: { tabs: { label: string; content: React.ReactNode }[] }) {
  const [activeTab, setActiveTab] = useState(0);
  const theme = useContext(ThemeContext);

  return (
    <div>
      <div style={{ display: "flex", borderBottom: `1px solid ${theme.mode === "dark" ? "#555" : "#ddd"}` }}>
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(index)}
            style={{
              padding: "8px 16px",
              background: "none",
              border: "none",
              borderBottom: activeTab === index ? `2px solid ${theme.accent}` : "2px solid transparent",
              color: activeTab === index ? theme.accent : theme.mode === "dark" ? "#aaa" : "#666",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: activeTab === index ? "bold" : "normal",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ padding: 12 }}>
        {tabs[activeTab]?.content}
      </div>
    </div>
  );
}

function TreeNode({ label, children, depth = 0 }: { label: string; children?: React.ReactNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const theme = useContext(ThemeContext);
  const hasChildren = children !== undefined;

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div
        onClick={() => hasChildren && setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 8px",
          cursor: hasChildren ? "pointer" : "default",
          borderRadius: 3,
          fontSize: 13,
          color: theme.mode === "dark" ? "#ddd" : "#333",
        }}
      >
        {hasChildren ? (
          <span style={{ fontSize: 10, width: 12, textAlign: "center" }}>{expanded ? "▼" : "▶"}</span>
        ) : (
          <span style={{ width: 12, textAlign: "center", fontSize: 8 }}>●</span>
        )}
        {label}
      </div>
      {expanded && children}
    </div>
  );
}

export function NestedComponents() {
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  const [accent, setAccent] = useState("#1976d2");

  const themeValue: ThemeContextValue = { mode: themeMode, accent };

  return (
    <ThemeContext.Provider value={themeValue}>
      <div style={{ color: themeMode === "dark" ? "#e0e0e0" : "#333" }}>
        <h2 style={{ margin: "0 0 12px" }}>Nested Components</h2>

        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
          <button onClick={() => setThemeMode((prev) => prev === "light" ? "dark" : "light")} style={{ padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>
            Toggle Theme ({themeMode})
          </button>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
            Accent:
            <input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 13, margin: "0 0 8px" }}>Accordion</h3>
            <Accordion title="Section 1: Getting Started" defaultOpen>
              <ThemedBox depth={1}>
                <p style={{ margin: 0, fontSize: 13 }}>This section covers the basics of getting started with the application.</p>
              </ThemedBox>
            </Accordion>
            <Accordion title="Section 2: Advanced Features">
              <ThemedBox depth={1}>
                <p style={{ margin: "0 0 8px", fontSize: 13 }}>Advanced features include:</p>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
                  <li>Theme customization</li>
                  <li>Component composition</li>
                  <li>Context propagation</li>
                </ul>
              </ThemedBox>
            </Accordion>
            <Accordion title="Section 3: API Reference">
              <ThemedBox depth={1}>
                <TabPanel tabs={[
                  { label: "Props", content: <p style={{ margin: 0, fontSize: 12 }}>Component accepts: theme, accent, children</p> },
                  { label: "Events", content: <p style={{ margin: 0, fontSize: 12 }}>onClick, onChange, onSubmit</p> },
                  { label: "Slots", content: <p style={{ margin: 0, fontSize: 12 }}>header, body, footer</p> },
                ]} />
              </ThemedBox>
            </Accordion>
          </div>

          <div>
            <h3 style={{ fontSize: 13, margin: "0 0 8px" }}>Tree View</h3>
            <ThemedBox depth={0}>
              <TreeNode label="src">
                <TreeNode label="components" depth={1}>
                  <TreeNode label="Button.tsx" depth={2} />
                  <TreeNode label="Input.tsx" depth={2} />
                  <TreeNode label="Modal.tsx" depth={2} />
                </TreeNode>
                <TreeNode label="hooks" depth={1}>
                  <TreeNode label="useTheme.ts" depth={2} />
                  <TreeNode label="useForm.ts" depth={2} />
                </TreeNode>
                <TreeNode label="pages" depth={1}>
                  <TreeNode label="Home.tsx" depth={2} />
                  <TreeNode label="About.tsx" depth={2} />
                  <TreeNode label="Settings" depth={2}>
                    <TreeNode label="Profile.tsx" depth={3} />
                    <TreeNode label="Security.tsx" depth={3} />
                  </TreeNode>
                </TreeNode>
                <TreeNode label="App.tsx" depth={1} />
                <TreeNode label="main.tsx" depth={1} />
              </TreeNode>
            </ThemedBox>
          </div>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
