import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect } from "vitest";
import { act } from "./utils";

describe("Conditional Rendering", () => {
  it("should handle ternary expressions", async () => {
    function Component({ isLoggedIn }: { isLoggedIn: boolean }) {
      return <div>{isLoggedIn ? <span>Welcome</span> : <span>Login</span>}</div>;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<Component isLoggedIn={false} />);
    });
    expect(container.textContent).toBe("Login");

    await act(() => {
      root.render(<Component isLoggedIn={true} />);
    });
    expect(container.textContent).toBe("Welcome");
  });

  it("should handle && short-circuit", async () => {
    function Component({ showMessage }: { showMessage: boolean }) {
      return (
        <div>
          <span>Header</span>
          {showMessage && <p>Message</p>}
        </div>
      );
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<Component showMessage={false} />);
    });
    expect(container.querySelector("p")).toBe(null);

    await act(() => {
      root.render(<Component showMessage={true} />);
    });
    expect(container.querySelector("p")!.textContent).toBe("Message");
  });

  it("should handle switching between element types", async () => {
    function Component({ useSpan }: { useSpan: boolean }) {
      return <div>{useSpan ? <span>text</span> : <p>text</p>}</div>;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<Component useSpan={true} />);
    });
    expect((container.firstChild as HTMLElement).firstChild!.nodeName).toBe("SPAN");

    await act(() => {
      root.render(<Component useSpan={false} />);
    });
    expect((container.firstChild as HTMLElement).firstChild!.nodeName).toBe("P");
  });

  it("should handle switching between component and null", async () => {
    function Child() {
      return <span>child content</span>;
    }

    function Parent({ showChild }: { showChild: boolean }) {
      return <div>{showChild ? <Child /> : null}</div>;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<Parent showChild={true} />);
    });
    expect(container.textContent).toBe("child content");

    await act(() => {
      root.render(<Parent showChild={false} />);
    });
    expect(container.textContent).toBe("");

    await act(() => {
      root.render(<Parent showChild={true} />);
    });
    expect(container.textContent).toBe("child content");
  });

  it("should handle switching between different components", async () => {
    function CompA() {
      return <span>A</span>;
    }
    function CompB() {
      return <span>B</span>;
    }

    function Parent({ which }: { which: "a" | "b" }) {
      return <div>{which === "a" ? <CompA /> : <CompB />}</div>;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<Parent which="a" />);
    });
    expect(container.textContent).toBe("A");

    await act(() => {
      root.render(<Parent which="b" />);
    });
    expect(container.textContent).toBe("B");
  });

  it("should handle conditional lists", async () => {
    function Component({ items }: { items: string[] | null }) {
      return (
        <div>
          {items ? (
            <ul>
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>No items</p>
          )}
        </div>
      );
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<Component items={null} />);
    });
    expect(container.querySelector("p")!.textContent).toBe("No items");
    expect(container.querySelector("ul")).toBe(null);

    await act(() => {
      root.render(<Component items={["one", "two"]} />);
    });
    expect(container.querySelector("p")).toBe(null);
    expect(container.querySelectorAll("li").length).toBe(2);
  });

  it("should handle multiple conditional sections", async () => {
    function Dashboard({
      showHeader,
      showContent,
      showFooter,
    }: {
      showHeader: boolean;
      showContent: boolean;
      showFooter: boolean;
    }) {
      return (
        <div>
          {showHeader && <header>Header</header>}
          {showContent && <main>Content</main>}
          {showFooter && <footer>Footer</footer>}
        </div>
      );
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<Dashboard showHeader={true} showContent={true} showFooter={true} />);
    });
    expect(container.querySelector("header")).not.toBe(null);
    expect(container.querySelector("main")).not.toBe(null);
    expect(container.querySelector("footer")).not.toBe(null);

    await act(() => {
      root.render(<Dashboard showHeader={true} showContent={false} showFooter={true} />);
    });
    expect(container.querySelector("header")).not.toBe(null);
    expect(container.querySelector("main")).toBe(null);
    expect(container.querySelector("footer")).not.toBe(null);

    await act(() => {
      root.render(<Dashboard showHeader={false} showContent={false} showFooter={false} />);
    });
    expect(container.querySelector("header")).toBe(null);
    expect(container.querySelector("main")).toBe(null);
    expect(container.querySelector("footer")).toBe(null);
  });

  it("should preserve DOM when conditional doesn't change structure", async () => {
    function Component({ text }: { text: string }) {
      return (
        <div>
          <span>{text}</span>
        </div>
      );
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<Component text="hello" />);
    });
    const firstSpan = container.querySelector("span");

    await act(() => {
      root.render(<Component text="world" />);
    });
    const secondSpan = container.querySelector("span");

    // Same DOM node should be reused
    expect(firstSpan).toBe(secondSpan);
    expect(secondSpan!.textContent).toBe("world");
  });
});
