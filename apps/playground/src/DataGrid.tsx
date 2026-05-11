import { useState, useMemo } from "react";

interface Row {
  id: number;
  name: string;
  email: string;
  age: number;
  department: string;
  salary: number;
  active: boolean;
}

const DEPARTMENTS = ["Engineering", "Design", "Marketing", "Sales", "Support", "HR"];

const generateRows = (count: number): Row[] =>
  Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `User ${index + 1}`,
    email: `user${index + 1}@example.com`,
    age: 22 + (index * 7) % 40,
    department: DEPARTMENTS[index % DEPARTMENTS.length]!,
    salary: 50000 + (index * 3571) % 100000,
    active: index % 3 !== 0,
  }));

type SortKey = keyof Row;
type SortDir = "asc" | "desc";

function GridCell({ children, width, align }: { children: React.ReactNode; width?: number; align?: string }) {
  return (
    <td style={{ padding: "8px 12px", borderBottom: "1px solid #eee", width, textAlign: align as any }}>
      {children}
    </td>
  );
}

function GridRow({ row, isSelected, onSelect }: { row: Row; isSelected: boolean; onSelect: () => void }) {
  return (
    <tr style={{ background: isSelected ? "#e3f2fd" : row.active ? "#fff" : "#fafafa", cursor: "pointer" }} onClick={onSelect}>
      <GridCell width={40}>
        <input type="checkbox" checked={isSelected} onChange={onSelect} />
      </GridCell>
      <GridCell width={50} align="right">{row.id}</GridCell>
      <GridCell>{row.name}</GridCell>
      <GridCell>{row.email}</GridCell>
      <GridCell width={50} align="right">{row.age}</GridCell>
      <GridCell>{row.department}</GridCell>
      <GridCell width={90} align="right">${row.salary.toLocaleString()}</GridCell>
      <GridCell width={60}>
        <span style={{ color: row.active ? "#4caf50" : "#f44336", fontWeight: "bold", fontSize: 12 }}>
          {row.active ? "Active" : "Inactive"}
        </span>
      </GridCell>
    </tr>
  );
}

export function DataGrid() {
  const [rowCount, setRowCount] = useState(100);
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterDept, setFilterDept] = useState<string>("all");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const allRows = useMemo(() => generateRows(rowCount), [rowCount]);

  const filteredRows = useMemo(() => {
    let result = allRows;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter((row) =>
        row.name.toLowerCase().includes(lower) ||
        row.email.toLowerCase().includes(lower) ||
        row.department.toLowerCase().includes(lower)
      );
    }
    if (filterDept !== "all") {
      result = result.filter((row) => row.department === filterDept);
    }
    return result;
  }, [allRows, searchTerm, filterDept]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((rowA, rowB) => {
      const valueA = rowA[sortKey];
      const valueB = rowB[sortKey];
      const cmp = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredRows, sortKey, sortDir]);

  const totalPages = Math.ceil(sortedRows.length / pageSize);
  const pagedRows = sortedRows.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => prev === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const headerStyle = { padding: "8px 12px", borderBottom: "2px solid #ddd", textAlign: "left" as const, cursor: "pointer", fontSize: 12, fontWeight: "bold" as const, userSelect: "none" as const };

  return (
    <div>
      <h2 style={{ margin: "0 0 12px" }}>Data Grid</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(event) => { setSearchTerm(event.target.value); setPage(0); }}
          style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 4, fontSize: 13, width: 200 }}
        />
        <select value={filterDept} onChange={(event) => { setFilterDept(event.target.value); setPage(0); }} style={{ padding: "6px", borderRadius: 4, border: "1px solid #ddd", fontSize: 13 }}>
          <option value="all">All Departments</option>
          {DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
        </select>
        <select value={rowCount} onChange={(event) => { setRowCount(Number(event.target.value)); setPage(0); }} style={{ padding: "6px", borderRadius: 4, border: "1px solid #ddd", fontSize: 13 }}>
          <option value={50}>50 rows</option>
          <option value={100}>100 rows</option>
          <option value={500}>500 rows</option>
          <option value={1000}>1000 rows</option>
        </select>
        <span style={{ fontSize: 12, color: "#666" }}>
          {filteredRows.length} results | {selectedIds.size} selected
        </span>
      </div>

      <div style={{ overflow: "auto", border: "1px solid #eee", borderRadius: 4 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={headerStyle}>✓</th>
              <th style={headerStyle} onClick={() => handleSort("id")}>ID {sortKey === "id" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
              <th style={headerStyle} onClick={() => handleSort("name")}>Name {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
              <th style={headerStyle} onClick={() => handleSort("email")}>Email</th>
              <th style={headerStyle} onClick={() => handleSort("age")}>Age {sortKey === "age" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
              <th style={headerStyle} onClick={() => handleSort("department")}>Dept</th>
              <th style={headerStyle} onClick={() => handleSort("salary")}>Salary {sortKey === "salary" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
              <th style={headerStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => (
              <GridRow key={row.id} row={row} isSelected={selectedIds.has(row.id)} onSelect={() => toggleSelect(row.id)} />
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 12 }}>
        <span style={{ color: "#666" }}>Page {page + 1} of {totalPages}</span>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setPage(0)} disabled={page === 0} style={{ padding: "4px 8px", cursor: "pointer" }}>«</button>
          <button onClick={() => setPage((prev) => Math.max(0, prev - 1))} disabled={page === 0} style={{ padding: "4px 8px", cursor: "pointer" }}>‹</button>
          <button onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))} disabled={page >= totalPages - 1} style={{ padding: "4px 8px", cursor: "pointer" }}>›</button>
          <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} style={{ padding: "4px 8px", cursor: "pointer" }}>»</button>
        </div>
      </div>
    </div>
  );
}
