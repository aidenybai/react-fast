import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect } from "vitest";
import { act } from "./utils";

describe("Fragments", () => {
  it("should render a fragment with multiple children", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <>
          <span>A</span>
          <span>B</span>
          <span>C</span>
        </>,
      );
    });
    expect(container.children.length).toBe(3);
    expect(container.children[0].textContent).toBe("A");
    expect(container.children[1].textContent).toBe("B");
    expect(container.children[2].textContent).toBe("C");
  });

  it("should render nested fragments", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <div>
          <>
            <span>A</span>
            <>
              <span>B</span>
              <span>C</span>
            </>
          </>
        </div>,
      );
    });
    const div = container.firstChild as HTMLElement;
    expect(div.children.length).toBe(3);
    expect(div.textContent).toBe("ABC");
  });

  it("should update fragments correctly", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(
        <div>
          <>
            <span>A</span>
            <span>B</span>
          </>
        </div>,
      );
    });
    expect((container.firstChild as HTMLElement).children.length).toBe(2);

    await act(() => {
      root.render(
        <div>
          <>
            <span>A</span>
            <span>B</span>
            <span>C</span>
          </>
        </div>,
      );
    });
    expect((container.firstChild as HTMLElement).children.length).toBe(3);
  });

  it("should handle conditional fragments", async () => {
    function Component({ showExtra }: { showExtra: boolean }) {
      return (
        <div>
          <span>always</span>
          {showExtra && (
            <>
              <span>extra1</span>
              <span>extra2</span>
            </>
          )}
        </div>
      );
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component showExtra={false} />);
    });
    expect((container.firstChild as HTMLElement).children.length).toBe(1);

    await act(() => {
      root.render(<Component showExtra={true} />);
    });
    expect((container.firstChild as HTMLElement).children.length).toBe(3);
  });
});

describe("Keys", () => {
  it("should preserve state with keys during reorder", async () => {
    function Item({ label }: { label: string }) {
      const [count, setCount] = React.useState(0);
      return (
        <div>
          <span>
            {label}:{count}
          </span>
          <button onClick={() => setCount((prev) => prev + 1)}>+</button>
        </div>
      );
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <div>
          <Item key="a" label="A" />
          <Item key="b" label="B" />
          <Item key="c" label="C" />
        </div>,
      );
    });

    // Increment B
    await act(() => {
      (container.firstChild as HTMLElement).children[1].querySelector("button")!.click();
    });
    expect(
      (container.firstChild as HTMLElement).children[1].querySelector("span")!.textContent,
    ).toBe("B:1");

    // Reorder: move B to front
    await act(() => {
      root.render(
        <div>
          <Item key="b" label="B" />
          <Item key="a" label="A" />
          <Item key="c" label="C" />
        </div>,
      );
    });

    // B should retain its state (count=1)
    expect(
      (container.firstChild as HTMLElement).children[0].querySelector("span")!.textContent,
    ).toBe("B:1");
    // A should still be at count=0
    expect(
      (container.firstChild as HTMLElement).children[1].querySelector("span")!.textContent,
    ).toBe("A:0");
  });

  it("should reset state when key changes", async () => {
    function Counter({ label }: { label: string }) {
      const [count, setCount] = React.useState(0);
      return (
        <div>
          <span>
            {label}:{count}
          </span>
          <button onClick={() => setCount((prev) => prev + 1)}>+</button>
        </div>
      );
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Counter key="v1" label="counter" />);
    });

    await act(() => {
      container.querySelector("button")!.click();
    });
    expect(container.querySelector("span")!.textContent).toBe("counter:1");

    // Change key resets state
    await act(() => {
      root.render(<Counter key="v2" label="counter" />);
    });
    expect(container.querySelector("span")!.textContent).toBe("counter:0");
  });

  it("should handle adding items to a keyed list", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(
        <ul>
          <li key="a">A</li>
          <li key="b">B</li>
        </ul>,
      );
    });
    expect(container.querySelectorAll("li").length).toBe(2);

    await act(() => {
      root.render(
        <ul>
          <li key="a">A</li>
          <li key="b">B</li>
          <li key="c">C</li>
        </ul>,
      );
    });
    expect(container.querySelectorAll("li").length).toBe(3);
    expect(container.querySelectorAll("li")[2].textContent).toBe("C");
  });

  it("should handle removing items from a keyed list", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(
        <ul>
          <li key="a">A</li>
          <li key="b">B</li>
          <li key="c">C</li>
        </ul>,
      );
    });
    expect(container.querySelectorAll("li").length).toBe(3);

    await act(() => {
      root.render(
        <ul>
          <li key="a">A</li>
          <li key="c">C</li>
        </ul>,
      );
    });
    expect(container.querySelectorAll("li").length).toBe(2);
    expect(container.querySelectorAll("li")[0].textContent).toBe("A");
    expect(container.querySelectorAll("li")[1].textContent).toBe("C");
  });

  it("should handle complex reordering", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(
        <ul>
          <li key="a">A</li>
          <li key="b">B</li>
          <li key="c">C</li>
          <li key="d">D</li>
        </ul>,
      );
    });

    // Reverse order
    await act(() => {
      root.render(
        <ul>
          <li key="d">D</li>
          <li key="c">C</li>
          <li key="b">B</li>
          <li key="a">A</li>
        </ul>,
      );
    });

    const items = container.querySelectorAll("li");
    expect(items[0].textContent).toBe("D");
    expect(items[1].textContent).toBe("C");
    expect(items[2].textContent).toBe("B");
    expect(items[3].textContent).toBe("A");
  });

  it("should handle map with dynamic keys", async () => {
    function List({ items }: { items: string[] }) {
      return (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<List items={["apple", "banana", "cherry"]} />);
    });
    expect(container.querySelectorAll("li").length).toBe(3);

    await act(() => {
      root.render(<List items={["banana", "date", "apple"]} />);
    });
    const items = container.querySelectorAll("li");
    expect(items.length).toBe(3);
    expect(items[0].textContent).toBe("banana");
    expect(items[1].textContent).toBe("date");
    expect(items[2].textContent).toBe("apple");
  });
});
