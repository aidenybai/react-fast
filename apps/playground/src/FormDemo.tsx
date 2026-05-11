import { useState } from "react";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  age: string;
  bio: string;
  role: string;
  notifications: boolean;
  theme: "light" | "dark" | "auto";
  tags: string[];
}

function TextInput({ label, value, onChange, type, error, placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: "bold", marginBottom: 4, color: "#555" }}>
        {label}
      </label>
      <input
        type={type || "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "8px 10px",
          border: `1px solid ${error ? "#f44336" : "#ddd"}`,
          borderRadius: 4,
          fontSize: 14,
          boxSizing: "border-box",
        }}
      />
      {error && <span style={{ fontSize: 11, color: "#f44336", marginTop: 2, display: "block" }}>{error}</span>}
    </div>
  );
}

function TagInput({ tags, onAdd, onRemove }: { tags: string[]; onAdd: (tag: string) => void; onRemove: (tag: string) => void }) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && inputValue.trim()) {
      event.preventDefault();
      onAdd(inputValue.trim());
      setInputValue("");
    }
    if (event.key === "Backspace" && !inputValue && tags.length > 0) {
      onRemove(tags[tags.length - 1]!);
    }
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: "bold", marginBottom: 4, color: "#555" }}>Tags</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "6px 8px", border: "1px solid #ddd", borderRadius: 4, minHeight: 36, alignItems: "center" }}>
        {tags.map((tag) => (
          <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#e3f2fd", padding: "2px 8px", borderRadius: 12, fontSize: 12 }}>
            {tag}
            <button onClick={() => onRemove(tag)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#666", padding: 0, lineHeight: 1 }}>×</button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? "Type and press Enter..." : ""}
          style={{ border: "none", outline: "none", fontSize: 13, flex: 1, minWidth: 100 }}
        />
      </div>
    </div>
  );
}

export function FormDemo() {
  const [form, setForm] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    age: "",
    bio: "",
    role: "developer",
    notifications: true,
    theme: "auto",
    tags: ["react", "typescript"],
  });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!form.firstName.trim()) newErrors.firstName = "Required";
    if (!form.lastName.trim()) newErrors.lastName = "Required";
    if (!form.email.includes("@")) newErrors.email = "Invalid email";
    if (form.password.length < 6) newErrors.password = "Min 6 characters";
    if (form.age && (isNaN(Number(form.age)) || Number(form.age) < 0)) newErrors.age = "Invalid age";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (validate()) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div>
        <h2 style={{ margin: "0 0 12px" }}>Form Submitted!</h2>
        <pre style={{ background: "#f5f5f5", padding: 16, borderRadius: 4, fontSize: 12, overflow: "auto" }}>
          {JSON.stringify(form, null, 2)}
        </pre>
        <button onClick={() => setSubmitted(false)} style={{ marginTop: 12, padding: "8px 16px", background: "#61dafb", border: "none", borderRadius: 4, cursor: "pointer" }}>
          Edit Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ margin: "0 0 12px" }}>Form Demo</h2>
      <form onSubmit={handleSubmit} style={{ maxWidth: 500 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TextInput label="First Name" value={form.firstName} onChange={(value) => updateField("firstName", value)} error={errors.firstName} placeholder="John" />
          <TextInput label="Last Name" value={form.lastName} onChange={(value) => updateField("lastName", value)} error={errors.lastName} placeholder="Doe" />
        </div>
        <TextInput label="Email" value={form.email} onChange={(value) => updateField("email", value)} type="email" error={errors.email} placeholder="john@example.com" />
        <TextInput label="Password" value={form.password} onChange={(value) => updateField("password", value)} type="password" error={errors.password} />
        <TextInput label="Age" value={form.age} onChange={(value) => updateField("age", value)} error={errors.age} placeholder="25" />

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: "bold", marginBottom: 4, color: "#555" }}>Bio</label>
          <textarea
            value={form.bio}
            onChange={(event) => updateField("bio", event.target.value)}
            rows={3}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, boxSizing: "border-box", resize: "vertical" }}
            placeholder="Tell us about yourself..."
          />
          <span style={{ fontSize: 11, color: "#999" }}>{form.bio.length}/500</span>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: "bold", marginBottom: 4, color: "#555" }}>Role</label>
          <select value={form.role} onChange={(event) => updateField("role", event.target.value)} style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14 }}>
            <option value="developer">Developer</option>
            <option value="designer">Designer</option>
            <option value="manager">Manager</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: "bold", marginBottom: 4, color: "#555" }}>Theme</label>
          <div style={{ display: "flex", gap: 12 }}>
            {(["light", "dark", "auto"] as const).map((theme) => (
              <label key={theme} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, cursor: "pointer" }}>
                <input type="radio" name="theme" value={theme} checked={form.theme === theme} onChange={() => updateField("theme", theme)} />
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={form.notifications} onChange={(event) => updateField("notifications", event.target.checked)} />
            Enable notifications
          </label>
        </div>

        <TagInput
          tags={form.tags}
          onAdd={(tag) => updateField("tags", [...form.tags, tag])}
          onRemove={(tag) => updateField("tags", form.tags.filter((existingTag) => existingTag !== tag))}
        />

        <button type="submit" style={{ padding: "10px 24px", background: "#61dafb", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold", fontSize: 14 }}>
          Submit
        </button>
      </form>
    </div>
  );
}
