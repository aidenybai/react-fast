import React from "react";
import { describe, expect } from "vitest";
import { itClientRenders } from "./ssr-integration-utils";

describe("ReactDOMServerIntegration - hooks", () => {
  describe("useState", () => {
    itClientRenders("initial state", async (render) => {
      const Counter = () => {
        const [count] = React.useState(0);
        return <span>{count}</span>;
      };
      const element = await render(<Counter />);
      expect(element!.textContent).toBe("0");
    });

    itClientRenders("lazy initial state", async (render) => {
      const Counter = () => {
        const [count] = React.useState(() => 42);
        return <span>{count}</span>;
      };
      const element = await render(<Counter />);
      expect(element!.textContent).toBe("42");
    });

    itClientRenders("multiple states", async (render) => {
      const MultiState = () => {
        const [firstName] = React.useState("Alice");
        const [lastName] = React.useState("Smith");
        return (
          <span>
            {firstName} {lastName}
          </span>
        );
      };
      const element = await render(<MultiState />);
      expect(element!.textContent).toBe("Alice Smith");
    });
  });

  describe("useReducer", () => {
    itClientRenders("initial state from reducer", async (render) => {
      const reducer = (state: number, action: { type: string }) => {
        if (action.type === "increment") return state + 1;
        return state;
      };
      const Counter = () => {
        const [count] = React.useReducer(reducer, 0);
        return <span>{count}</span>;
      };
      const element = await render(<Counter />);
      expect(element!.textContent).toBe("0");
    });

    itClientRenders("initial state from init function", async (render) => {
      const reducer = (state: number) => state;
      const Counter = ({ initialCount }: { initialCount: number }) => {
        const [count] = React.useReducer(reducer, initialCount, (n) => n * 2);
        return <span>{count}</span>;
      };
      const element = await render(<Counter initialCount={5} />);
      expect(element!.textContent).toBe("10");
    });
  });

  describe("useContext", () => {
    itClientRenders("with provider value", async (render) => {
      const ThemeContext = React.createContext("light");
      const ThemedComponent = () => {
        const theme = React.useContext(ThemeContext);
        return <span>{theme}</span>;
      };
      const element = await render(
        <ThemeContext.Provider value="dark">
          <ThemedComponent />
        </ThemeContext.Provider>,
      );
      expect(element!.textContent).toBe("dark");
    });
  });

  describe("useRef", () => {
    itClientRenders("initial value", async (render) => {
      const RefComponent = () => {
        const ref = React.useRef(42);
        return <span>{ref.current}</span>;
      };
      const element = await render(<RefComponent />);
      expect(element!.textContent).toBe("42");
    });

    itClientRenders("null initial value", async (render) => {
      const RefComponent = () => {
        const ref = React.useRef<string | null>(null);
        return <span>{ref.current === null ? "null" : "not null"}</span>;
      };
      const element = await render(<RefComponent />);
      expect(element!.textContent).toBe("null");
    });
  });

  describe("useMemo", () => {
    itClientRenders("computed value", async (render) => {
      const MemoComponent = ({ multiplier }: { multiplier: number }) => {
        const computed = React.useMemo(() => multiplier * 10, [multiplier]);
        return <span>{computed}</span>;
      };
      const element = await render(<MemoComponent multiplier={3} />);
      expect(element!.textContent).toBe("30");
    });
  });

  describe("useCallback", () => {
    itClientRenders("component with callback", async (render) => {
      const CallbackComponent = () => {
        const handleClick = React.useCallback(() => "clicked", []);
        return <span>{typeof handleClick}</span>;
      };
      const element = await render(<CallbackComponent />);
      expect(element!.textContent).toBe("function");
    });
  });

  describe("useId", () => {
    itClientRenders("unique id", async (render) => {
      const IdComponent = () => {
        const id = React.useId();
        return <span id={id}>{id}</span>;
      };
      const element = await render(<IdComponent />);
      const id = (element as Element).getAttribute("id");
      expect(id).toBeTruthy();
      expect(element!.textContent).toBe(id);
    });

    itClientRenders("multiple useIds produce different values", async (render) => {
      const MultiIdComponent = () => {
        const id1 = React.useId();
        const id2 = React.useId();
        return (
          <div>
            <span id={id1}>{id1}</span>
            <span id={id2}>{id2}</span>
          </div>
        );
      };
      const element = await render(<MultiIdComponent />);
      const spans = (element as Element).querySelectorAll("span");
      expect(spans[0].id).toBeTruthy();
      expect(spans[1].id).toBeTruthy();
      expect(spans[0].id).not.toBe(spans[1].id);
    });
  });
});
