import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect, afterEach } from "vitest";
import { act } from "./utils";

describe("ReactDOMHooks", () => {
  let container: HTMLDivElement;

  afterEach(() => {
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
  });

  it("can render from useEffect (chained roots)", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const container2 = document.createElement("div");
    const container3 = document.createElement("div");

    const root1 = ReactDOMClient.createRoot(container);
    const root2 = ReactDOMClient.createRoot(container2);
    const root3 = ReactDOMClient.createRoot(container3);

    const Example1 = ({ n }: { n: number }) => {
      React.useEffect(() => {
        root2.render(<Example2 n={n} />);
      });
      return <>{1 * n}</>;
    };

    const Example2 = ({ n }: { n: number }) => {
      React.useEffect(() => {
        root3.render(<Example3 n={n} />);
      });
      return <>{2 * n}</>;
    };

    const Example3 = ({ n }: { n: number }) => {
      return <>{3 * n}</>;
    };

    await act(() => {
      root1.render(<Example1 n={1} />);
    });
    await act(() => {});
    expect(container.textContent).toBe("1");
    expect(container2.textContent).toBe("2");
    expect(container3.textContent).toBe("3");

    await act(() => {
      root1.render(<Example1 n={2} />);
    });
    await act(() => {});
    expect(container.textContent).toBe("2");
    expect(container2.textContent).toBe("4");
    expect(container3.textContent).toBe("6");
  });

  it("can render() from useEffect", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const container2 = document.createElement("div");
    const container3 = document.createElement("div");

    const root1 = ReactDOMClient.createRoot(container);
    const root2 = ReactDOMClient.createRoot(container2);
    const root3 = ReactDOMClient.createRoot(container3);

    const Example1 = ({ n }: { n: number }) => {
      React.useEffect(() => {
        root2.render(<Example2 n={n} />);
      });
      return <>{1 * n}</>;
    };

    const Example2 = ({ n }: { n: number }) => {
      React.useEffect(() => {
        root3.render(<Example3 n={n} />);
      });
      return <>{2 * n}</>;
    };

    const Example3 = ({ n }: { n: number }) => {
      return <>{3 * n}</>;
    };

    await act(() => {
      root1.render(<Example1 n={1} />);
    });
    await act(() => {});
    expect(container.textContent).toBe("1");
    expect(container2.textContent).toBe("2");
    expect(container3.textContent).toBe("3");

    await act(() => {
      root1.render(<Example1 n={2} />);
    });
    await act(() => {});
    expect(container.textContent).toBe("2");
    expect(container2.textContent).toBe("4");
    expect(container3.textContent).toBe("6");
  });

  it("should not bail out when an update is scheduled from within an event handler", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const Example = ({
      inputRef,
      labelRef,
    }: {
      inputRef: React.RefObject<HTMLInputElement | null>;
      labelRef: React.RefObject<HTMLLabelElement | null>;
    }) => {
      const [text, setText] = React.useState("");
      const handleInput = React.useCallback((event: React.FormEvent<HTMLInputElement>) => {
        setText((event.target as HTMLInputElement).value);
      }, []);

      return (
        <>
          <input ref={inputRef} onInput={handleInput} />
          <label ref={labelRef}>{text}</label>
        </>
      );
    };

    const inputRef = React.createRef<HTMLInputElement>();
    const labelRef = React.createRef<HTMLLabelElement>();

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Example inputRef={inputRef} labelRef={labelRef} />);
    });

    await act(() => {
      inputRef.current!.value = "abc";
      inputRef.current!.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    });

    expect(labelRef.current!.innerHTML).toBe("abc");
  });

  it("should not bail out when an update is scheduled from within an event handler in Concurrent Mode", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const Example = ({
      inputRef,
      labelRef,
    }: {
      inputRef: React.RefObject<HTMLInputElement | null>;
      labelRef: React.RefObject<HTMLLabelElement | null>;
    }) => {
      const [text, setText] = React.useState("");
      const handleInput = React.useCallback((event: React.FormEvent<HTMLInputElement>) => {
        setText((event.target as HTMLInputElement).value);
      }, []);

      return (
        <>
          <input ref={inputRef} onInput={handleInput} />
          <label ref={labelRef}>{text}</label>
        </>
      );
    };

    const inputRef = React.createRef<HTMLInputElement>();
    const labelRef = React.createRef<HTMLLabelElement>();

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Example inputRef={inputRef} labelRef={labelRef} />);
    });

    await act(() => {
      inputRef.current!.value = "abc";
      inputRef.current!.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    });

    expect(labelRef.current!.innerHTML).toBe("abc");
  });
});
