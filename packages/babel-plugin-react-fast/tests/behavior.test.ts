import { describe, it, expect } from "vitest";
import { transformSync } from "@babel/core";
import plugin from "../src/index.js";

const transform = (code: string): string => {
  const result = transformSync(code, {
    plugins: [plugin],
    configFile: false,
    babelrc: false,
  });
  return result?.code || "";
};

describe("template generation", () => {
  it("hoists static templates to module scope", () => {
    const output = transform(`const el = <div class="static"><span>text</span></div>;`);
    expect(output).toMatch(/const _tmpl\$1 = _\$template\(/);
    expect(output).toMatch(/class=\\"static\\"/);
    expect(output).toContain("<span>text</span>");
  });

  it("deduplicates identical templates", () => {
    const output = transform(`
      const a = <div class="x">A</div>;
      const b = <div class="x">A</div>;
    `);
    const templateMatches = output.match(/const _tmpl\$/g);
    expect(templateMatches).toHaveLength(1);
  });

  it("creates separate templates for different structures", () => {
    const output = transform(`
      const a = <div>A</div>;
      const b = <span>B</span>;
    `);
    const templateMatches = output.match(/const _tmpl\$/g);
    expect(templateMatches).toHaveLength(2);
  });

  it("handles void elements (no closing tag)", () => {
    const output = transform(`const el = <input type="text" />;`);
    expect(output).toMatch(/type=\\"text\\"/);
    expect(output).not.toContain("</input>");
  });

  it("handles self-closing non-void elements", () => {
    const output = transform(`const el = <div />;`);
    expect(output).toContain("<div></div>");
  });

  it("escapes HTML entities in static content", () => {
    const output = transform(`const el = <div title="<u>data</u>" />;`);
    expect(output).toContain("&lt;u&gt;data&lt;/u&gt;");
  });

  it("preserves whitespace text nodes correctly", () => {
    const output = transform(`const el = <span>Hello World</span>;`);
    expect(output).toContain("Hello World");
  });

  it("leaves a space placeholder for dynamic text", () => {
    const output = transform(`const el = <span>{name}</span>;`);
    expect(output).toContain("<span> </span>");
  });
});

describe("DOM walking", () => {
  it("generates firstChild for first child access", () => {
    const output = transform(`const el = <div><span>{text}</span></div>;`);
    expect(output).toContain(".firstChild");
  });

  it("generates nextSibling for subsequent children", () => {
    const output = transform(`
      const el = <div><span>A</span><span>{text}</span></div>;
    `);
    expect(output).toContain(".nextSibling");
  });

  it("chains firstChild for nested access", () => {
    const output = transform(`
      const el = <div><span><a>{link}</a></span></div>;
    `);
    expect(output).toContain(".firstChild");
    const firstChildCount = (output.match(/\.firstChild/g) || []).length;
    expect(firstChildCount).toBeGreaterThanOrEqual(2);
  });

  it("reuses walked variables for shared paths", () => {
    const output = transform(`
      const el = (
        <div>
          <span>{a}</span>
          <span>{b}</span>
        </div>
      );
    `);
    expect(output).toContain(".firstChild");
    expect(output).toContain(".nextSibling");
  });
});

describe("dynamic attribute batching", () => {
  it("batches multiple dynamics into a single effect", () => {
    const output = transform(`
      const el = <div className={cls} title={title} id={id} />;
    `);
    const effectCount = (output.match(/_\$effect/g) || []).length;
    expect(effectCount).toBe(2);
  });

  it("uses dirty-checking with previous cache", () => {
    const output = transform(`
      const el = <div className={cls} title={title} />;
    `);
    expect(output).toMatch(/_prev\.\w/);
    expect(output).toContain("!==");
  });

  it("sets DOM properties for known props", () => {
    const output = transform(`const el = <div className={cls} />;`);
    expect(output).toContain(".className");
  });

  it("uses setAttribute for SVG attributes", () => {
    const output = transform(`
      const el = <svg><rect x={x} y={y} /></svg>;
    `);
    expect(output).toContain("_$setAttribute");
  });

  it("does not create effect for purely static elements", () => {
    const output = transform(`const el = <div class="static" id="main"><span>text</span></div>;`);
    expect(output).not.toContain("_$effect");
  });
});

describe("event delegation", () => {
  it("uses $$ prefix for delegated events", () => {
    const output = transform(`const el = <button onClick={handler}>X</button>;`);
    expect(output).toContain(".$$click");
  });

  it("appends delegateEvents call at module end", () => {
    const output = transform(`const el = <button onClick={handler}>X</button>;`);
    expect(output).toContain('_$delegateEvents(["click"])');
  });

  it("collects multiple delegated event types", () => {
    const output = transform(`
      const el = (
        <div>
          <button onClick={a}>A</button>
          <input onInput={b} />
          <div onMouseDown={c} />
        </div>
      );
    `);
    expect(output).toContain("_$delegateEvents");
    expect(output).toContain('"click"');
    expect(output).toContain('"input"');
    expect(output).toContain('"mousedown"');
  });

  it("maps React onChange to input event for inputs", () => {
    const output = transform(`const el = <input onChange={handler} />;`);
    expect(output).toContain("$$input");
    expect(output).not.toContain("$$change");
  });

  it("maps React onChange to change event for select (non-delegated)", () => {
    const output = transform(`const el = <select onChange={handler}><option>A</option></select>;`);
    expect(output).toContain('addEventListener("change"');
    expect(output).not.toContain("$$input");
  });

  it("maps onDoubleClick to dblclick", () => {
    const output = transform(`const el = <div onDoubleClick={handler} />;`);
    expect(output).toContain("$$dblclick");
  });

  it("maps onFocus to focusin for delegation", () => {
    const output = transform(`const el = <div onFocus={handler} />;`);
    expect(output).toContain("$$focusin");
  });

  it("maps onBlur to focusout for delegation", () => {
    const output = transform(`const el = <div onBlur={handler} />;`);
    expect(output).toContain("$$focusout");
  });
});

describe("component handling", () => {
  it("leaves components as createElement calls", () => {
    const output = transform(`const el = <Component prop={value} />;`);
    expect(output).toContain("React.createElement");
    expect(output).toContain("Component");
  });

  it("handles member expression components", () => {
    const output = transform(`const el = <Namespace.Component prop={value} />;`);
    expect(output).toContain("Namespace.Component");
  });

  it("strips key prop from component calls", () => {
    const output = transform(`const el = <Component key="k" value={v} />;`);
    expect(output).not.toMatch(/key.*:.*"k"/);
    expect(output).toContain("value");
  });

  it("passes children as props for components", () => {
    const output = transform(`const el = <Component><div>child</div></Component>;`);
    expect(output).toContain("children");
  });

  it("handles component inside HTML element via insert marker", () => {
    const output = transform(`
      const el = <div><Component /><span>after</span></div>;
    `);
    expect(output).toContain("<!>");
  });
});

describe("ref handling", () => {
  it("calls ref as function", () => {
    const output = transform(`const el = <div ref={myRef} />;`);
    expect(output).toContain("_$use");
  });

  it("handles inline ref callbacks", () => {
    const output = transform(`const el = <div ref={el => (ref = el)} />;`);
    expect(output).toContain("_$use");
  });
});

describe("spread props", () => {
  it("calls runtime spread helper", () => {
    const output = transform(`const el = <div {...props} />;`);
    expect(output).toContain("_$spread");
  });

  it("handles spread with static attrs", () => {
    const output = transform(`const el = <div class="base" {...props} />;`);
    expect(output).toContain("_$spread");
    expect(output).toMatch(/class=\\"base\\"/);
  });
});

describe("style handling", () => {
  it("static string style goes into template", () => {
    const output = transform(`const el = <div style="color: red;" />;`);
    expect(output).toMatch(/style=\\"color: red;\\"/);
    expect(output).not.toContain("_$style");
  });

  it("dynamic style object uses style helper in effect", () => {
    const output = transform(`const el = <div style={{ color: dynamic() }} />;`);
    expect(output).toContain("_$style");
  });
});

describe("fragments", () => {
  it("single child fragment unwraps", () => {
    const output = transform(`const el = <><div>Only</div></>;`);
    expect(output).not.toContain("Array");
  });

  it("multi-child fragment returns array", () => {
    const output = transform(`const el = <><div>A</div><div>B</div></>;`);
    expect(output).toContain("[");
  });

  it("empty fragment returns null", () => {
    const output = transform(`const el = <></>;`);
    expect(output).toContain("null");
  });

  it("expression-only fragment passes through", () => {
    const output = transform(`const el = <>{value}</>;`);
    expect(output).toContain("value");
    expect(output).not.toContain("_$template");
  });
});

describe("IIFE wrapping", () => {
  it("wraps compiled element in IIFE", () => {
    const output = transform(`const el = <div>{dynamic}</div>;`);
    expect(output).toContain("(() => {");
    expect(output).toContain("})()");
  });

  it("static elements still use IIFE for template clone", () => {
    const output = transform(`const el = <div class="static">text</div>;`);
    expect(output).toContain("(() => {");
  });
});

describe("dangerouslySetInnerHTML", () => {
  it("compiles to innerHTML assignment", () => {
    const output = transform(`const el = <div dangerouslySetInnerHTML={{ __html: content }} />;`);
    expect(output).toContain("innerHTML");
    expect(output).toContain("__html");
  });
});

describe("imports", () => {
  it("imports template from react-fast", () => {
    const output = transform(`const el = <div>Hello</div>;`);
    expect(output).toContain('from "react-fast"');
    expect(output).toContain("template");
  });

  it("imports effect when dynamics present", () => {
    const output = transform(`const el = <div>{dynamic}</div>;`);
    expect(output).toContain("effect");
  });

  it("does not import effect for static-only elements", () => {
    const output = transform(`const el = <div class="a">text</div>;`);
    expect(output).not.toContain("effect");
  });

  it("imports spread helper when spread is used", () => {
    const output = transform(`const el = <div {...props} />;`);
    expect(output).toContain("spread");
  });

  it("imports delegateEvents when events are delegated", () => {
    const output = transform(`const el = <button onClick={fn}>X</button>;`);
    expect(output).toContain("delegateEvents");
  });
});

describe("nested JSX (inner elements not transformed separately)", () => {
  it("only transforms top-level JSX, not nested", () => {
    const output = transform(`
      const el = <div><span>{text}</span></div>;
    `);
    const templateCount = (output.match(/_tmpl\$/g) || []).length;
    expect(templateCount).toBe(2);
  });

  it("does not double-wrap nested elements in IIFEs", () => {
    const output = transform(`
      const el = <div><p>static</p></div>;
    `);
    const iifeCount = (output.match(/\(\(\) => \{/g) || []).length;
    expect(iifeCount).toBe(1);
  });
});

describe("real-world patterns", () => {
  it("handles conditional rendering pattern", () => {
    const output = transform(`
      function App({ isLoggedIn }) {
        return (
          <div>
            {isLoggedIn ? <span>Welcome</span> : <button>Login</button>}
          </div>
        );
      }
    `);
    expect(output).toContain("_$template");
    expect(output).toContain("_$effect");
  });

  it("handles list rendering pattern", () => {
    const output = transform(`
      function List({ items }) {
        return (
          <ul>
            {items.map(item => <li>{item.name}</li>)}
          </ul>
        );
      }
    `);
    expect(output).toContain("_$template");
    expect(output).toContain("items.map");
  });

  it("handles form with multiple inputs", () => {
    const output = transform(`
      function Form() {
        const [name, setName] = useState("");
        const [email, setEmail] = useState("");
        return (
          <form onSubmit={handleSubmit}>
            <input type="text" value={name} onChange={e => setName(e.target.value)} />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <button type="submit">Submit</button>
          </form>
        );
      }
    `);
    expect(output).toContain("_$template");
    expect(output).toContain("$$input");
    expect(output).toContain("addEventListener");
    expect(output).toContain('"submit"');
    expect(output).not.toContain("$$change");
  });

  it("handles deeply nested component tree", () => {
    const output = transform(`
      function App() {
        return (
          <div className="app">
            <header className="header">
              <h1>{title}</h1>
              <nav>
                <a href="/">Home</a>
                <a href="/about">About</a>
              </nav>
            </header>
            <main>
              <section>
                <h2>{sectionTitle}</h2>
                <p>{content}</p>
              </section>
            </main>
            <footer>
              <span>{year}</span>
            </footer>
          </div>
        );
      }
    `);
    expect(output).toContain("_$template");
    expect(output).toContain("_$effect");
    expect(output).toContain(".firstChild");
    expect(output).toContain(".nextSibling");
  });

  it("handles table with dynamic rows", () => {
    const output = transform(`
      function Table({ rows, columns }) {
        return (
          <table className="data-table">
            <thead>
              <tr>
                {columns.map(col => <th>{col.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr className={row.selected ? "selected" : ""}>
                  {columns.map(col => <td>{row[col.key]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        );
      }
    `);
    expect(output).toContain("_$template");
    expect(output).toContain("columns.map");
    expect(output).toContain("rows.map");
  });
});
