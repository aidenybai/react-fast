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
    const output = transform(`
      function App() {
        return <div class="static"><span>text</span></div>;
      }
    `);
    expect(output).toMatch(/_tmpl\$\d/);
    expect(output).toMatch(/_\$template\(/);
  });

  it("deduplicates identical templates", () => {
    const output = transform(`
      function A() { return <div class="x"><span>A</span></div>; }
      function B() { return <div class="x"><span>A</span></div>; }
    `);
    const templateDecls = output.match(/_tmpl\$\d+\s*=/g);
    // 2 templates: children-only + full-element (both shared across A and B)
    expect(templateDecls?.length).toBe(2);
  });

  it("creates separate templates for different structures", () => {
    const output = transform(`
      function A() { return <div><span>A</span><p>B</p></div>; }
      function B() { return <section><h1>C</h1><p>D</p></section>; }
    `);
    expect(output).toContain("_tmpl$");
  });

  it("handles self-closing non-void elements in template", () => {
    const output = transform(`
      function App() { return <div><span></span><p>text</p></div>; }
    `);
    expect(output).toContain("<span></span>");
  });

  it("escapes HTML entities in static content", () => {
    const output = transform(`
      function App() { return <div title="a&b"><span>text</span></div>; }
    `);
    expect(output).toContain("a&amp;b");
  });

  it("adds #__PURE__ annotation to templates", () => {
    const output = transform(`
      function App() { return <div><span>text</span></div>; }
    `);
    expect(output).toContain("/*#__PURE__*/");
  });
});

describe("React integration output", () => {
  it("emits createElement with dangerouslySetInnerHTML and caches element", () => {
    const output = transform(`
      function App() {
        return <div className="app"><h1>Hello</h1><p>World</p></div>;
      }
    `);
    expect(output).toContain("createElement");
    expect(output).toContain("dangerouslySetInnerHTML");
    expect(output).toContain(".node || (");
  });

  it("emits useRef for flat cache array", () => {
    const output = transform(`
      function App() {
        return <div><span>{text}</span><p>static</p></div>;
      }
    `);
    expect(output).toContain("useRef");
    expect(output).toContain("_c$");
  });

  it("emits ref callback on cache object", () => {
    const output = transform(`
      function App() {
        return <div><span>{text}</span><p>static</p></div>;
      }
    `);
    expect(output).toContain(".ref");
    expect(output).not.toContain("useCallback");
  });

  it("emits inline patch block for re-renders", () => {
    const output = transform(`
      function App() {
        return <div><span>{text}</span><p>static</p></div>;
      }
    `);
    expect(output).toContain(".data");
    expect(output).not.toContain("useLayoutEffect");
  });

  it("emits ref for client path", () => {
    const output = transform(`
      function App() {
        return <div><span>A</span><p>B</p></div>;
      }
    `);
    expect(output).toContain(".ref");
  });

  it("emits typeof window check for SSR branching", () => {
    const output = transform(`
      function App() {
        return <div><span>{text}</span><p>static</p></div>;
      }
    `);
    expect(output).toContain("typeof window");
    expect(output).toContain('"undefined"');
  });

  it("emits hoisted _SSR$ flag for SSR branching", () => {
    const output = transform(`
      function App() {
        return <div><h1>Title</h1><p>Content</p></div>;
      }
    `);
    expect(output).toContain("_SSR$");
    expect(output).toContain("typeof window");
  });

  it("omits SSR path when ssr option is false", () => {
    const output = transformSync(
      `function App() { return <div><span>{text}</span></div>; }`,
      {
        filename: "test.tsx",
        plugins: [["@babel/plugin-syntax-jsx"], [plugin, { ssr: false }]],
      },
    )!.code!;
    expect(output).not.toContain("_SSR$");
    expect(output).not.toContain("dangerouslySetInnerHTML");
  });

  it("generates template clone in ref callback", () => {
    const output = transform(`
      function App() {
        return <div><span>A</span><p>{text}</p></div>;
      }
    `);
    expect(output).toContain("appendChild");
    expect(output).toContain("_tmpl$");
  });

  it("generates SSR path with template literal", () => {
    const output = transform(`
      function App({ name }) {
        return <div><h1>{name}</h1><p>static</p></div>;
      }
    `);
    expect(output).toContain("_$escape");
  });
});

describe("DOM walking in ref callback", () => {
  it("generates firstChild access", () => {
    const output = transform(`
      function App() {
        return <div><span>{text}</span><p>B</p></div>;
      }
    `);
    expect(output).toContain(".firstChild");
  });

  it("generates nextSibling for subsequent children", () => {
    const output = transform(`
      function App() {
        return <div><span>A</span><span>{text}</span></div>;
      }
    `);
    expect(output).toContain(".nextSibling");
  });
});

describe("dynamic patching via inline _patch", () => {
  it("patches dynamic attributes", () => {
    const output = transform(`
      function App({ cls }) {
        return <div className={cls}><span>A</span><p>B</p></div>;
      }
    `);
    expect(output).toContain(".className");
  });

  it("patches events via delegation", () => {
    const output = transform(`
      function App() {
        return <div><button onClick={() => {}}>A</button><span>B</span></div>;
      }
    `);
    expect(output).toContain("$$click");
    expect(output).toContain("delegateEvents");
  });

  it("patches non-delegated events via addEventListener", () => {
    const output = transform(`
      function App() {
        return <div><form onSubmit={handler}><input /><button>Go</button></form></div>;
      }
    `);
    expect(output).toContain("addEventListener");
    expect(output).toContain('"submit"');
  });

  it("handles insert for dynamic children", () => {
    const output = transform(`
      function App({ content }) {
        return <div><p>{content}</p><span>after</span></div>;
      }
    `);
    expect(output).toContain(".data");
  });
});

describe("event mapping", () => {
  it("maps React onChange to input event for inputs", () => {
    const output = transform(`
      function App() {
        return <div><input onChange={() => {}} /><span>label</span></div>;
      }
    `);
    expect(output).toContain("$$input");
  });

  it("maps onDoubleClick to dblclick", () => {
    const output = transform(`
      function App() {
        return <div onDoubleClick={() => {}}><span>A</span><p>B</p></div>;
      }
    `);
    expect(output).toContain("$$dblclick");
  });

  it("maps onFocus to focusin for delegation", () => {
    const output = transform(`
      function App() {
        return <div onFocus={() => {}}><span>A</span><p>B</p></div>;
      }
    `);
    expect(output).toContain("$$focusin");
  });

  it("maps onBlur to focusout for delegation", () => {
    const output = transform(`
      function App() {
        return <div onBlur={() => {}}><span>A</span><p>B</p></div>;
      }
    `);
    expect(output).toContain("$$focusout");
  });
});

describe("component handling", () => {
  it("leaves components as createElement calls", () => {
    const output = transform(`
      function App() {
        return <Component prop={value} />;
      }
    `);
    expect(output).toContain("createElement");
    expect(output).toContain("Component");
  });

  it("handles member expression components", () => {
    const output = transform(`
      function App() {
        return <Namespace.Component prop={value} />;
      }
    `);
    expect(output).toContain("Namespace.Component");
  });

  it("partial optimization: component siblings stay as React elements", () => {
    const output = transform(`
      function App({ content }) {
        return (
          <div>
            <UserProfile />
            <div className="content"><h2>Title</h2><p>{content}</p></div>
          </div>
        );
      }
    `);
    expect(output).toContain("createElement");
    expect(output).toContain("UserProfile");
  });
});

describe("style handling", () => {
  it("inlines static object style properties into template", () => {
    const output = transform(`
      function App() {
        return <div style={{ color: "red", fontSize: "12px" }}><span>A</span><p>B</p></div>;
      }
    `);
    expect(output).toContain("color:red");
    expect(output).toContain("font-size:12px");
  });

  it("keeps dynamic style properties as runtime holes", () => {
    const output = transform(`
      function App() {
        return <div style={{ color: dynamic() }}><span>A</span><p>B</p></div>;
      }
    `);
    expect(output).toContain("style");
  });
});

describe("fragments", () => {
  it("single child fragment unwraps", () => {
    const output = transform(`
      function App() {
        return <><div><span>A</span><p>B</p></div></>;
      }
    `);
    expect(output).not.toContain("Array");
  });

  it("empty fragment returns null", () => {
    const output = transform(`
      function App() { return <></>; }
    `);
    expect(output).toContain("null");
  });
});

describe("SSR support", () => {
  it("generates escape calls for dynamic values in SSR path", () => {
    const output = transform(`
      function App({ name }) {
        return <div><h1>{name}</h1><p>static</p></div>;
      }
    `);
    expect(output).toContain("_$escape");
  });

  it("generates complete HTML with interpolation for server", () => {
    const output = transform(`
      function App({ title, content }) {
        return <div><h1>{title}</h1><p>{content}</p></div>;
      }
    `);
    expect(output).toContain("typeof window");
    expect(output).toContain("_$escape");
  });
});

describe("imports", () => {
  it("imports template from react-fast", () => {
    const output = transform(`
      function App() {
        return <div><span>A</span><p>B</p></div>;
      }
    `);
    expect(output).toContain('from "react-fast"');
    expect(output).toContain("template");
  });

  it("imports React hooks from react", () => {
    const output = transform(`
      function App() {
        return <div><span>{text}</span><p>B</p></div>;
      }
    `);
    expect(output).toContain('from "react"');
  });

  it("imports delegateEvents when events are delegated", () => {
    const output = transform(`
      function App() {
        return <div><button onClick={() => {}}>X</button><span>Y</span></div>;
      }
    `);
    expect(output).toContain("delegateEvents");
  });
});

describe("does not transform outside functions", () => {
  it("leaves module-level JSX untransformed", () => {
    const output = transform(`const el = <div class="static"><span>text</span></div>;`);
    expect(output).not.toContain("_$template");
    expect(output).not.toContain("useRef");
  });
});

describe("real-world patterns", () => {
  it("bails out when dynamic children contain JSX", () => {
    const output = transform(`
      function List({ items }) {
        return (
          <ul>
            {items.map(item => <li>{item.name}</li>)}
          </ul>
        );
      }
    `);
    expect(output).not.toContain("_$template");
    expect(output).toContain("items.map");
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
          </div>
        );
      }
    `);
    expect(output).toContain("_$template");
    expect(output).toContain("createElement");
    expect(output).toContain("dangerouslySetInnerHTML");
    expect(output).toContain(".node || (");
  });

  it("constant-folds confident attribute expressions", () => {
    const output = transform(`
      function App() {
        return <div className={"foo" + "bar"}><span>A</span><p>B</p></div>;
      }
    `);
    expect(output).toContain("foobar");
  });
});
