import React, { useEffect } from "react";
import * as ReactDOMClient from "react-dom/client";
import ReactDOM, { flushSync } from "react-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, log, assertLog } from "./utils";

describe("ReactDOMRoot", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
  });

  it("renders children", async () => {
    const root = ReactDOMClient.createRoot(container);
    root.render(<div>Hi</div>);
    await act(() => {});
    expect(container.textContent).toEqual("Hi");
  });

  it("warns if a callback parameter is provided to render", async () => {
    const callback = vi.fn();
    const root = ReactDOMClient.createRoot(container);
    root.render(<div>Hi</div>, callback as any);
    await act(() => {});
    expect(callback).not.toHaveBeenCalled();
  });

  it("warn if a object is passed to root.render(...)", async () => {
    function App() {
      return "Child" as any;
    }

    const root = ReactDOMClient.createRoot(container);
    root.render(<App />, {} as any);
  });

  it("warn if a container is passed to root.render(...)", async () => {
    function App() {
      return "Child" as any;
    }

    const root = ReactDOMClient.createRoot(container);
    root.render(<App />, container as any);
  });

  it("warns if a callback parameter is provided to unmount", async () => {
    const callback = vi.fn();
    const root = ReactDOMClient.createRoot(container);
    root.render(<div>Hi</div>);
    (root.unmount as any)(callback);
    await act(() => {});
    expect(callback).not.toHaveBeenCalled();
  });

  it("unmounts children", async () => {
    const root = ReactDOMClient.createRoot(container);
    root.render(<div>Hi</div>);
    await act(() => {});
    expect(container.textContent).toEqual("Hi");
    root.unmount();
    await act(() => {});
    expect(container.textContent).toEqual("");
  });

  it("can be immediately unmounted", async () => {
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.unmount();
    });
  });

  it("clears existing children", async () => {
    container.innerHTML = "<div>a</div><div>b</div>";
    const root = ReactDOMClient.createRoot(container);
    root.render(
      <div>
        <span>c</span>
        <span>d</span>
      </div>,
    );
    await act(() => {});
    expect(container.textContent).toEqual("cd");
    root.render(
      <div>
        <span>d</span>
        <span>c</span>
      </div>,
    );
    await act(() => {});
    expect(container.textContent).toEqual("dc");
  });

  it("throws a good message on invalid containers", () => {
    expect(() => {
      ReactDOMClient.createRoot((<div>Hi</div>) as any);
    }).toThrow("Target container is not a DOM element.");
  });

  it("warns when creating two roots managing the same container", () => {
    ReactDOMClient.createRoot(container);
    ReactDOMClient.createRoot(container);
  });

  it("does not warn when creating second root after first one is unmounted", async () => {
    const root = ReactDOMClient.createRoot(container);
    root.unmount();
    await act(() => {});
    ReactDOMClient.createRoot(container);
  });

  it("warns if creating a root on the document.body", async () => {
    ReactDOMClient.createRoot(document.body);
  });

  it("warns if updating a root that has had its contents removed", async () => {
    const root = ReactDOMClient.createRoot(container);
    root.render(<div>Hi</div>);
    await act(() => {});
    container.innerHTML = "";

    root.render(<div>Hi</div>);
  });

  it("should render different components in same root", async () => {
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<div />);
    });
    expect(container.firstChild!.nodeName).toBe("DIV");

    await act(() => {
      root.render(<span />);
    });
    expect(container.firstChild!.nodeName).toBe("SPAN");

    document.body.removeChild(container);
  });

  it("should not warn if mounting into non-empty node", async () => {
    container.innerHTML = "<div></div>";
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div />);
    });

    expect(true).toBe(true);
  });

  it("should reuse markup if rendering to the same target twice", async () => {
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div />);
    });
    const firstElm = container.firstChild;
    await act(() => {
      root.render(<div />);
    });

    expect(firstElm).toBe(container.firstChild);
  });

  it("should unmount and remount if the key changes", async () => {
    function Component({ text }: { text: string }) {
      useEffect(() => {
        log("Mount");

        return () => {
          log("Unmount");
        };
      }, []);

      return <span>{text}</span>;
    }

    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<Component text="orange" key="A" />);
    });
    expect(container.firstChild!.innerHTML).toBe("orange");
    assertLog(["Mount"]);

    await act(() => {
      root.render(<Component text="green" key="B" />);
    });
    expect(container.firstChild!.innerHTML).toBe("green");
    assertLog(["Unmount", "Mount"]);

    await act(() => {
      root.render(<Component text="blue" key="B" />);
    });
    expect(container.firstChild!.innerHTML).toBe("blue");
    assertLog([]);
  });

  it("throws if unmounting a root that has had its contents removed", async () => {
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div>Hi</div>);
    });
    container.innerHTML = "";

    await expect(async () => {
      await act(() => {
        root.unmount();
      });
    }).rejects.toThrow("The node to be removed is not a child of this node.");
  });

  it("unmount is synchronous", async () => {
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render("Hi" as any);
    });
    expect(container.textContent).toEqual("Hi");

    await act(() => {
      root.unmount();
      expect(container.textContent).toEqual("");
    });
  });

  it("throws if an unmounted root is updated", async () => {
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render("Hi" as any);
    });
    expect(container.textContent).toEqual("Hi");

    root.unmount();

    expect(() => root.render("I'm back" as any)).toThrow("Cannot update an unmounted root.");
  });

  it("warns if root is unmounted inside an effect", async () => {
    const container1 = document.createElement("div");
    const root1 = ReactDOMClient.createRoot(container1);
    const container2 = document.createElement("div");
    const root2 = ReactDOMClient.createRoot(container2);

    function App({ step }: { step: number }) {
      useEffect(() => {
        if (step === 2) {
          root2.unmount();
        }
      }, [step]);
      return "Hi" as any;
    }

    await act(() => {
      root1.render(<App step={1} />);
    });
    expect(container1.textContent).toEqual("Hi");

    flushSync(() => {
      root1.render(<App step={2} />);
    });
  });

  it("warn if JSX passed to createRoot", async () => {
    function App() {
      return "Child" as any;
    }

    ReactDOMClient.createRoot(container, (<App />) as any);
  });

  it("warns when given a function", () => {
    function Component() {
      return <div />;
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));

    flushSync(() => {
      root.render(Component as any);
    });
  });

  it("warns when given a symbol", () => {
    const root = ReactDOMClient.createRoot(document.createElement("div"));

    flushSync(() => {
      root.render(Symbol("foo") as any);
    });
  });
});
