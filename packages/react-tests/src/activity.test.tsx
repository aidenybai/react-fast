import React, { useState, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, log, assertLog } from "./utils";

const Activity = React.Activity;

const Text = ({ text }: { text: string }) => {
  log(text);
  return <span>{text}</span>;
};

describe("ReactDOMActivity", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("hides children when mode is hidden", async () => {
    const root = createRoot(container);
    await act(() => {
      root.render(
        <Activity mode="hidden">
          <div>Hello</div>
        </Activity>,
      );
    });
    expect(container.querySelector("div")!.style.display).toContain("none");
  });

  it("shows children when mode is visible", async () => {
    const root = createRoot(container);
    await act(() => {
      root.render(
        <Activity mode="visible">
          <div>Hello</div>
        </Activity>,
      );
    });
    const div = container.querySelector("div")!;
    expect(div.style.display).not.toContain("none");
    expect(div.textContent).toBe("Hello");
  });

  it("toggles visibility when mode changes", async () => {
    let setMode!: (mode: "visible" | "hidden") => void;
    const App = () => {
      const [mode, _setMode] = useState<"visible" | "hidden">("visible");
      setMode = _setMode;
      return (
        <Activity mode={mode}>
          <Text text="Child" />
        </Activity>
      );
    };

    const root = createRoot(container);
    await act(() => root.render(<App />));
    assertLog(["Child"]);
    expect(container.querySelector("span")!.style.display).not.toContain("none");

    await act(() => setMode("hidden"));
    assertLog(["Child"]);
    expect(container.querySelector("span")!.style.display).toContain("none");

    await act(() => setMode("visible"));
    assertLog(["Child"]);
    expect(container.querySelector("span")!.style.display).not.toContain("none");
  });

  it("unmounts layout effects when hidden and remounts when visible", async () => {
    const Child = () => {
      useLayoutEffect(() => {
        log("Mount layout");
        return () => {
          log("Unmount layout");
        };
      }, []);
      return <Text text="Child" />;
    };

    let setMode!: (mode: "visible" | "hidden") => void;
    const App = () => {
      const [mode, _setMode] = useState<"visible" | "hidden">("visible");
      setMode = _setMode;
      return (
        <Activity mode={mode}>
          <Child />
        </Activity>
      );
    };

    const root = createRoot(container);
    await act(() => root.render(<App />));
    assertLog(["Child", "Mount layout"]);

    await act(() => setMode("hidden"));
    assertLog(["Unmount layout", "Child"]);

    await act(() => setMode("visible"));
    assertLog(["Child", "Mount layout"]);
  });

  it("does not mount layout effects when starting hidden", async () => {
    const Child = () => {
      useLayoutEffect(() => {
        log("Mount layout");
        return () => {
          log("Unmount layout");
        };
      }, []);
      return <Text text="Child" />;
    };

    const root = createRoot(container);
    await act(() => {
      root.render(
        <Activity mode="hidden">
          <Child />
        </Activity>,
      );
    });
    assertLog(["Child"]);

    await act(() => {
      root.render(
        <Activity mode="visible">
          <Child />
        </Activity>,
      );
    });
    assertLog(["Child", "Mount layout"]);
  });

  it("preserves state when toggling visibility", async () => {
    const Counter = () => {
      const [count, setCount] = useState(0);
      return (
        <div>
          <span>{count}</span>
          <button onClick={() => setCount((previous) => previous + 1)}>+</button>
        </div>
      );
    };

    let setMode!: (mode: "visible" | "hidden") => void;
    const App = () => {
      const [mode, _setMode] = useState<"visible" | "hidden">("visible");
      setMode = _setMode;
      return (
        <Activity mode={mode}>
          <Counter />
        </Activity>
      );
    };

    const root = createRoot(container);
    await act(() => root.render(<App />));
    expect(container.querySelector("span")!.textContent).toBe("0");

    await act(() => {
      container.querySelector("button")!.click();
    });
    expect(container.querySelector("span")!.textContent).toBe("1");

    await act(() => setMode("hidden"));
    await act(() => setMode("visible"));
    expect(container.querySelector("span")!.textContent).toBe("1");
  });
});
