import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect, vi } from "vitest";
import { act } from "./utils";

describe("useState", () => {
  it("should initialize with the given value", async () => {
    function Component() {
      const [count] = React.useState(42);
      return <span>{count}</span>;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });
    expect(container.querySelector("span")!.textContent).toBe("42");
  });

  it("should support lazy initialization", async () => {
    const initializer = vi.fn(() => 99);

    function Component() {
      const [value] = React.useState(initializer);
      return <span>{value}</span>;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });
    expect(container.querySelector("span")!.textContent).toBe("99");
    expect(initializer).toHaveBeenCalledTimes(1);

    await act(() => {
      root.render(<Component />);
    });
    expect(initializer).toHaveBeenCalledTimes(1);
  });

  it("should update when setter is called", async () => {
    let setCount: React.Dispatch<React.SetStateAction<number>>;

    function Component() {
      const [count, _setCount] = React.useState(0);
      setCount = _setCount;
      return <span>{count}</span>;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });
    expect(container.querySelector("span")!.textContent).toBe("0");

    await act(() => {
      setCount!(5);
    });
    expect(container.querySelector("span")!.textContent).toBe("5");
  });
});

describe("useEffect", () => {
  it("should fire after render", async () => {
    const effectFn = vi.fn();

    function Component() {
      React.useEffect(effectFn);
      return <div />;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });
    expect(effectFn).toHaveBeenCalledTimes(1);
  });

  it("should fire cleanup on unmount", async () => {
    const cleanup = vi.fn();

    function Component() {
      React.useEffect(() => cleanup, []);
      return <div />;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });
    expect(cleanup).not.toHaveBeenCalled();

    await act(() => {
      root.unmount();
    });
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("should respect dependency array", async () => {
    const effectFn = vi.fn();
    let setCount: React.Dispatch<React.SetStateAction<number>>;
    let setOther: React.Dispatch<React.SetStateAction<number>>;

    function Component() {
      const [count, _setCount] = React.useState(0);
      const [other, _setOther] = React.useState(0);
      setCount = _setCount;
      setOther = _setOther;
      React.useEffect(effectFn, [count]);
      return (
        <span>
          {count} {other}
        </span>
      );
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });
    expect(effectFn).toHaveBeenCalledTimes(1);

    await act(() => {
      setOther!(1);
    });
    expect(effectFn).toHaveBeenCalledTimes(1);

    await act(() => {
      setCount!(1);
    });
    expect(effectFn).toHaveBeenCalledTimes(2);
  });
});

describe("useLayoutEffect", () => {
  it("should fire synchronously after DOM mutations", async () => {
    const order: string[] = [];

    function Component() {
      React.useLayoutEffect(() => {
        order.push("layout");
      });
      React.useEffect(() => {
        order.push("effect");
      });
      order.push("render");
      return <div />;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });
    expect(order).toEqual(["render", "layout", "effect"]);
  });
});

describe("useMemo", () => {
  it("should memoize values", async () => {
    const computeFn = vi.fn((value: number) => value * 2);
    let setCount: React.Dispatch<React.SetStateAction<number>>;
    let setOther: React.Dispatch<React.SetStateAction<number>>;

    function Component() {
      const [count, _setCount] = React.useState(1);
      const [other, _setOther] = React.useState(0);
      setCount = _setCount;
      setOther = _setOther;
      const doubled = React.useMemo(() => computeFn(count), [count]);
      return (
        <span>
          {doubled} {other}
        </span>
      );
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });
    expect(container.querySelector("span")!.textContent).toBe("2 0");
    expect(computeFn).toHaveBeenCalledTimes(1);

    await act(() => {
      setOther!(1);
    });
    expect(computeFn).toHaveBeenCalledTimes(1);

    await act(() => {
      setCount!(2);
    });
    expect(container.querySelector("span")!.textContent).toBe("4 1");
    expect(computeFn).toHaveBeenCalledTimes(2);
  });
});

describe("useCallback", () => {
  it("should return stable reference when deps don't change", async () => {
    const callbacks: Array<() => void> = [];
    let setOther: React.Dispatch<React.SetStateAction<number>>;

    function Component() {
      const [other, _setOther] = React.useState(0);
      setOther = _setOther;
      const stableCallback = React.useCallback(() => {}, []);
      callbacks.push(stableCallback);
      return <span>{other}</span>;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });

    await act(() => {
      setOther!(1);
    });

    expect(callbacks[0]).toBe(callbacks[1]);
  });
});

describe("useContext", () => {
  it("should provide and consume context", async () => {
    const ThemeContext = React.createContext("light");

    function Display() {
      const theme = React.useContext(ThemeContext);
      return <span>{theme}</span>;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <ThemeContext.Provider value="dark">
          <Display />
        </ThemeContext.Provider>,
      );
    });
    expect(container.querySelector("span")!.textContent).toBe("dark");
  });

  it("should re-render when context value changes", async () => {
    const CountContext = React.createContext(0);

    function Display() {
      const count = React.useContext(CountContext);
      return <span>{count}</span>;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <CountContext.Provider value={1}>
          <Display />
        </CountContext.Provider>,
      );
    });
    expect(container.querySelector("span")!.textContent).toBe("1");

    await act(() => {
      root.render(
        <CountContext.Provider value={2}>
          <Display />
        </CountContext.Provider>,
      );
    });
    expect(container.querySelector("span")!.textContent).toBe("2");
  });

  it("should use default value when no provider", async () => {
    const MyContext = React.createContext("default");

    function Display() {
      const value = React.useContext(MyContext);
      return <span>{value}</span>;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Display />);
    });
    expect(container.querySelector("span")!.textContent).toBe("default");
  });
});

describe("useReducer", () => {
  it("should work like useState with a reducer", async () => {
    type Action = { type: "increment" } | { type: "reset" };

    const reducer = (state: number, action: Action): number => {
      switch (action.type) {
        case "increment":
          return state + 1;
        case "reset":
          return 0;
      }
    };

    let dispatch: React.Dispatch<Action>;

    function Component() {
      const [count, _dispatch] = React.useReducer(reducer, 0);
      dispatch = _dispatch;
      return <span>{count}</span>;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });
    expect(container.querySelector("span")!.textContent).toBe("0");

    await act(() => {
      dispatch!({ type: "increment" });
    });
    expect(container.querySelector("span")!.textContent).toBe("1");

    await act(() => {
      dispatch!({ type: "increment" });
      dispatch!({ type: "increment" });
    });
    expect(container.querySelector("span")!.textContent).toBe("3");

    await act(() => {
      dispatch!({ type: "reset" });
    });
    expect(container.querySelector("span")!.textContent).toBe("0");
  });

  it("should support lazy initialization", async () => {
    const initFn = vi.fn((initialCount: number) => initialCount * 10);

    function Component({ initialCount }: { initialCount: number }) {
      const [count] = React.useReducer((state: number) => state, initialCount, initFn);
      return <span>{count}</span>;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component initialCount={5} />);
    });
    expect(container.querySelector("span")!.textContent).toBe("50");
    expect(initFn).toHaveBeenCalledTimes(1);
  });
});
