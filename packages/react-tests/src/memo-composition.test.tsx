import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect, vi } from "vitest";
import { act } from "./utils";

describe("React.memo", () => {
  it("should skip re-render when props don't change", async () => {
    let renderCount = 0;

    const Child = React.memo(({ value }: { value: string }) => {
      renderCount++;
      return <span>{value}</span>;
    });

    let setOther: React.Dispatch<React.SetStateAction<number>>;

    function Parent() {
      const [other, _setOther] = React.useState(0);
      setOther = _setOther;
      return (
        <div>
          <Child value="stable" />
          <span>{other}</span>
        </div>
      );
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });
    expect(renderCount).toBe(1);

    await act(() => {
      setOther!(1);
    });
    expect(renderCount).toBe(1);
  });

  it("should re-render when props change", async () => {
    let renderCount = 0;

    const Child = React.memo(({ value }: { value: string }) => {
      renderCount++;
      return <span>{value}</span>;
    });

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Child value="A" />);
    });
    expect(renderCount).toBe(1);

    await act(() => {
      root.render(<Child value="B" />);
    });
    expect(renderCount).toBe(2);
  });

  it("should support custom comparison function", async () => {
    let renderCount = 0;

    interface Props {
      item: { id: number; label: string };
    }

    const Child = React.memo(
      ({ item }: Props) => {
        renderCount++;
        return <span>{item.label}</span>;
      },
      (prevProps, nextProps) => prevProps.item.id === nextProps.item.id,
    );

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Child item={{ id: 1, label: "hello" }} />);
    });
    expect(renderCount).toBe(1);

    // Same ID, different label — should NOT re-render
    await act(() => {
      root.render(<Child item={{ id: 1, label: "world" }} />);
    });
    expect(renderCount).toBe(1);

    // Different ID — should re-render
    await act(() => {
      root.render(<Child item={{ id: 2, label: "new" }} />);
    });
    expect(renderCount).toBe(2);
  });
});

describe("Component composition", () => {
  it("should pass children as props", async () => {
    function Wrapper({ children }: { children: React.ReactNode }) {
      return <div className="wrapper">{children}</div>;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <Wrapper>
          <span>inner content</span>
        </Wrapper>,
      );
    });
    expect(container.querySelector(".wrapper span")!.textContent).toBe("inner content");
  });

  it("should support render props pattern", async () => {
    function DataProvider({ render }: { render: (data: string) => React.ReactNode }) {
      return <div>{render("provided data")}</div>;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<DataProvider render={(data) => <span>{data}</span>} />);
    });
    expect(container.querySelector("span")!.textContent).toBe("provided data");
  });

  it("should support higher-order components", async () => {
    function withPrefix(WrappedComponent: React.ComponentType<{ text: string }>, prefix: string) {
      return function EnhancedComponent({ text }: { text: string }) {
        return <WrappedComponent text={`${prefix}: ${text}`} />;
      };
    }

    function Display({ text }: { text: string }) {
      return <span>{text}</span>;
    }

    const PrefixedDisplay = withPrefix(Display, "Hello");

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<PrefixedDisplay text="World" />);
    });
    expect(container.querySelector("span")!.textContent).toBe("Hello: World");
  });

  it("should handle deeply nested components", async () => {
    function Level({ depth, maxDepth }: { depth: number; maxDepth: number }) {
      if (depth >= maxDepth) {
        return <span>leaf</span>;
      }
      return (
        <div data-depth={depth}>
          <Level depth={depth + 1} maxDepth={maxDepth} />
        </div>
      );
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Level depth={0} maxDepth={5} />);
    });
    expect(container.querySelectorAll("div").length).toBe(5);
    expect(container.querySelector("span")!.textContent).toBe("leaf");
  });

  it("should handle component composition with state", async () => {
    function Counter({ initial }: { initial: number }) {
      const [count, setCount] = React.useState(initial);
      return (
        <div>
          <span>{count}</span>
          <button onClick={() => setCount((prev) => prev + 1)}>+</button>
        </div>
      );
    }

    function App() {
      return (
        <div>
          <Counter initial={0} />
          <Counter initial={10} />
        </div>
      );
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });

    const spans = container.querySelectorAll("span");
    expect(spans[0].textContent).toBe("0");
    expect(spans[1].textContent).toBe("10");

    const buttons = container.querySelectorAll("button");
    await act(() => {
      buttons[0].click();
    });
    expect(spans[0].textContent).toBe("1");
    expect(spans[1].textContent).toBe("10");
  });

  it("should handle useImperativeHandle", async () => {
    interface HandleType {
      focus: () => void;
      getValue: () => string;
    }

    const FancyInput = React.forwardRef<HandleType, object>((_props, ref) => {
      const inputRef = React.useRef<HTMLInputElement>(null);

      React.useImperativeHandle(ref, () => ({
        focus: () => inputRef.current?.focus(),
        getValue: () => inputRef.current?.value ?? "",
      }));

      return <input ref={inputRef} defaultValue="test" />;
    });

    const handleRef = React.createRef<HandleType>();

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<FancyInput ref={handleRef} />);
    });

    expect(handleRef.current).not.toBe(null);
    expect(handleRef.current!.getValue()).toBe("test");
  });
});

describe("Error Boundaries", () => {
  it("should catch errors in child components", async () => {
    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { hasError: boolean }
    > {
      state = { hasError: false };

      static getDerivedStateFromError() {
        return { hasError: true };
      }

      render() {
        if (this.state.hasError) {
          return <span>Error caught</span>;
        }
        return this.props.children;
      }
    }

    function BrokenComponent(): React.ReactNode {
      throw new Error("Intentional error");
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    const originalError = console.error;
    console.error = vi.fn();
    await act(() => {
      root.render(
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>,
      );
    });
    console.error = originalError;

    expect(container.textContent).toBe("Error caught");
  });

  it("should not catch errors outside of its subtree", async () => {
    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { hasError: boolean }
    > {
      state = { hasError: false };

      static getDerivedStateFromError() {
        return { hasError: true };
      }

      render() {
        if (this.state.hasError) {
          return <span>Error</span>;
        }
        return this.props.children;
      }
    }

    function SafeComponent() {
      return <span>safe</span>;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <div>
          <ErrorBoundary>
            <SafeComponent />
          </ErrorBoundary>
        </div>,
      );
    });
    expect(container.textContent).toBe("safe");
  });
});
