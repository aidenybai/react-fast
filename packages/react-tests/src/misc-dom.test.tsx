import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { flushSync } from "react-dom";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, log, assertLog } from "./utils";

describe("ReactDOMShorthandCSSPropertyCollision", () => {
  it("should warn for conflicting CSS shorthand updates", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div style={{ font: "foo", fontStyle: "bar" }} />);
    });
    await act(() => {
      root.render(<div style={{ font: "foo" }} />);
    });

    await act(() => {
      root.render(<div style={{ font: "qux", fontStyle: "bar" }} />);
    });
    await act(() => {
      root.render(<div style={{ font: "foo", fontStyle: "baz" }} />);
    });

    await act(() => {
      root.render(<div style={{ font: "qux", fontStyle: "baz" }} />);
    });
    await act(() => {
      root.render(<div style={{ fontStyle: "baz" }} />);
    });

    await act(() => {
      root.render(<div style={{ background: "yellow", backgroundPosition: "center" }} />);
    });
    await act(() => {
      root.render(<div style={{ background: "yellow" }} />);
    });

    await act(() => {
      root.render(<div style={{ background: "yellow", backgroundPosition: "center" }} />);
    });
    await act(() => {
      root.render(<div style={{ background: "green", backgroundPosition: "top" }} />);
    });
    await act(() => {
      root.render(<div style={{ backgroundPosition: "top" }} />);
    });

    await act(() => {
      root.render(
        <div
          style={{
            borderStyle: "dotted",
            borderLeft: "1px solid red",
          }}
        />,
      );
    });
    await act(() => {
      root.render(<div style={{ borderLeft: "1px solid red" }} />);
    });

    await act(() => {
      root.render(
        <div
          style={{
            borderStyle: "dashed",
            borderLeft: "1px solid red",
          }}
        />,
      );
    });
    await act(() => {
      root.render(
        <div
          style={{
            borderStyle: "dotted",
            borderLeft: "2px solid red",
          }}
        />,
      );
    });
    await act(() => {
      root.render(<div style={{ borderStyle: "dotted" }} />);
    });
  });
});

describe("refs-destruction", () => {
  let theInnerDivRef: React.RefObject<HTMLDivElement | null>;
  let theInnerClassComponentRef: React.RefObject<any>;

  class ClassComponent extends React.Component {
    render() {
      return null;
    }
  }

  class TestComponent extends React.Component<{
    destroy?: boolean;
    removeRef?: boolean;
  }> {
    constructor(props: { destroy?: boolean; removeRef?: boolean }) {
      super(props);
      theInnerDivRef = React.createRef();
      theInnerClassComponentRef = React.createRef();
    }
    render() {
      if (this.props.destroy) {
        return <div />;
      } else if (this.props.removeRef) {
        return (
          <div>
            <div />
            <ClassComponent />
          </div>
        );
      } else {
        return (
          <div>
            <div ref={theInnerDivRef} />
            <ClassComponent ref={theInnerClassComponentRef} />
          </div>
        );
      }
    }
  }

  it("should remove refs when destroying the parent", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<TestComponent />);
    });

    expect(theInnerDivRef.current).toBeInstanceOf(Element);
    expect(theInnerClassComponentRef.current).toBeTruthy();

    root.unmount();

    expect(theInnerDivRef.current).toBe(null);
    expect(theInnerClassComponentRef.current).toBe(null);
  });

  it("should remove refs when destroying the child", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<TestComponent />);
    });

    expect(theInnerDivRef.current).toBeInstanceOf(Element);
    expect(theInnerClassComponentRef.current).toBeTruthy();

    await act(async () => {
      root.render(<TestComponent destroy={true} />);
    });

    expect(theInnerDivRef.current).toBe(null);
    expect(theInnerClassComponentRef.current).toBe(null);
  });

  it("should remove refs when removing the child ref attribute", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<TestComponent />);
    });

    expect(theInnerDivRef.current).toBeInstanceOf(Element);
    expect(theInnerClassComponentRef.current).toBeTruthy();

    await act(async () => {
      root.render(<TestComponent removeRef={true} />);
    });

    expect(theInnerDivRef.current).toBe(null);
    expect(theInnerClassComponentRef.current).toBe(null);
  });

  it("should not error when destroying child with ref asynchronously", async () => {
    let nestedRoot: ReactDOMClient.Root;

    class Modal extends React.Component<{ children?: React.ReactNode }> {
      div: HTMLDivElement | null = null;

      componentDidMount() {
        this.div = document.createElement("div");
        nestedRoot = ReactDOMClient.createRoot(this.div);
        document.body.appendChild(this.div);
        this.componentDidUpdate();
      }
      componentDidUpdate() {
        setTimeout(() => {
          flushSync(() => {
            nestedRoot.render(<div>{this.props.children}</div>);
          });
        }, 0);
      }
      componentWillUnmount() {
        const divElement = this.div!;
        setTimeout(() => {
          expect(() => {
            nestedRoot.unmount();
          }).not.toThrow();
          if (divElement.parentNode) {
            divElement.parentNode.removeChild(divElement);
          }
        }, 0);
      }
      render() {
        return null;
      }
    }

    class AppModal extends React.Component {
      render() {
        return (
          <Modal>
            <a ref={React.createRef()} />
          </Modal>
        );
      }
    }

    class App extends React.Component<{ hidden?: boolean }> {
      render() {
        return this.props.hidden ? null : <AppModal />;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<App />);
    });
    await act(async () => {
      root.render(<App hidden={true} />);
    });
  });
});

describe("validateDOMNesting", () => {
  afterEach(() => {
    while (document.firstChild) {
      document.removeChild(document.firstChild);
    }
    document.appendChild(document.createElement("html"));
    document.documentElement.innerHTML = "<head></head><body></body>";
  });

  const expectWarnings = (tags: string[]) => {
    const tagsCopy = [...tags];

    if (document.documentElement) {
      document.removeChild(document.documentElement);
    }
    document.appendChild(document.createElement("html"));
    document.documentElement.innerHTML = "<head></head><body></body>";

    let element: React.ReactNode = null;
    const containerTag = tagsCopy.shift()!;
    let containerElement: any;
    switch (containerTag) {
      case "#document":
        containerElement = document;
        break;
      case "html":
        containerElement = document.documentElement;
        break;
      case "body":
        containerElement = document.body;
        break;
      case "head":
        containerElement = document.head;
        break;
      case "svg":
        containerElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        break;
      default:
        containerElement = document.createElement(containerTag);
        break;
    }

    while (tagsCopy.length) {
      const tagName = tagsCopy.pop()!;
      if (tagName === "#text") {
        element = "text";
      } else {
        element = React.createElement(tagName, null, element);
      }
    }

    const root = ReactDOMClient.createRoot(containerElement);
    flushSync(() => {
      root.render(element);
    });
    root.unmount();
  };

  it("allows valid nestings", () => {
    expectWarnings(["table", "tbody", "tr", "td", "b"]);
    expectWarnings(["body", "datalist", "option"]);
    expectWarnings(["div", "a", "object", "a"]);
    expectWarnings(["div", "p", "button", "p"]);
    expectWarnings(["p", "svg", "foreignObject", "p"]);
    expectWarnings(["html", "body", "div"]);

    expectWarnings(["div", "ul", "ul", "li"]);
    expectWarnings(["div", "label", "div"]);
    expectWarnings(["div", "ul", "li", "section", "li"]);
    expectWarnings(["div", "ul", "li", "dd", "li"]);
  });

  it("prevents problematic nestings", () => {
    expectWarnings(["a", "a"]);
    expectWarnings(["form", "form"]);
    expectWarnings(["p", "p"]);
    expectWarnings(["table", "tr"]);
    expectWarnings(["div", "ul", "li", "div", "li"]);
    expectWarnings(["div", "html"]);
    expectWarnings(["body", "body"]);
    expectWarnings(["head", "body"]);
    expectWarnings(["head", "head"]);
    expectWarnings(["html", "html"]);
    expectWarnings(["body", "html"]);
    expectWarnings(["head", "html"]);
    expectWarnings(["svg", "foreignObject", "body", "p"]);
  });

  it("relaxes the nesting rules at the root when the container is a singleton", () => {
    expectWarnings(["#document", "html"]);
    expectWarnings(["#document", "body"]);
    expectWarnings(["#document", "head"]);
    expectWarnings(["#document", "div"]);
    expectWarnings(["#document", "meta"]);
    expectWarnings(["#document", "#text"]);
    expectWarnings(["html", "body"]);
    expectWarnings(["html", "head"]);
    expectWarnings(["html", "div"]);
    expectWarnings(["html", "meta"]);
    expectWarnings(["html", "#text"]);
    expectWarnings(["body", "head"]);
    expectWarnings(["body", "div"]);
    expectWarnings(["body", "meta"]);
    expectWarnings(["body", "#text"]);
  });
});

describe("ReactDOMSuspensePlaceholder", () => {
  let container: HTMLDivElement;
  let textCache: Map<string, { status: string; value: any }>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    textCache = new Map();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  const resolveText = (text: string) => {
    const record = textCache.get(text);
    if (record === undefined) {
      textCache.set(text, { status: "resolved", value: text });
    } else if (record.status === "pending") {
      const thenable = record.value;
      record.status = "resolved";
      record.value = text;
      thenable.pings.forEach((callback: () => void) => callback());
    }
  };

  const readText = (text: string): string => {
    const record = textCache.get(text);
    if (record !== undefined) {
      switch (record.status) {
        case "pending":
          log(`Suspend! [${text}]`);
          throw record.value;
        case "rejected":
          throw record.value;
        case "resolved":
          return record.value;
      }
    }
    log(`Suspend! [${text}]`);
    const thenable: any = {
      pings: [] as (() => void)[],
      then(resolve: (value: any) => void) {
        if (newRecord.status === "pending") {
          thenable.pings.push(resolve);
        } else {
          Promise.resolve().then(() => resolve(newRecord.value));
        }
      },
    };
    const newRecord = { status: "pending", value: thenable };
    textCache.set(text, newRecord);
    throw thenable;
  };

  const Text = ({ text }: { text: string }) => {
    log(text);
    return <>{text}</>;
  };

  const AsyncText = ({ text }: { text: string }) => {
    readText(text);
    log(text);
    return <>{text}</>;
  };

  it("hides and unhides timed out text nodes", async () => {
    const App = () => {
      return (
        <React.Suspense fallback={<Text text="Loading..." />}>
          <Text text="A" />
          <AsyncText text="B" />
          <Text text="C" />
        </React.Suspense>
      );
    };

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });

    expect(container.textContent).toEqual("Loading...");
    assertLog(["A", "Suspend! [B]", "Loading...", "A", "Suspend! [B]", "C"]);

    await act(() => {
      resolveText("B");
    });
    assertLog(["A", "B", "C"]);
    expect(container.textContent).toEqual("ABC");
  });

  it("fires lifecycle methods in a suspended component commit phase", async () => {
    let suspendOnce: Promise<void> | null = Promise.resolve();
    const Suspend = () => {
      if (suspendOnce) {
        const promise = suspendOnce;
        suspendOnce = null;
        throw promise;
      }
      return null;
    };

    const lifecycleLog: string[] = [];

    class Child extends React.Component {
      componentDidMount() {
        lifecycleLog.push("cDM");
      }
      componentDidUpdate() {
        lifecycleLog.push("cDU");
      }
      render() {
        return null;
      }
    }

    const App = () => (
      <React.Suspense fallback="Loading">
        <Suspend />
        <Child />
      </React.Suspense>
    );

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });
    expect(lifecycleLog).toEqual(["cDM"]);

    await act(() => {
      root.render(<App />);
    });
    expect(lifecycleLog).toEqual(["cDM", "cDU"]);
  });
});

describe("ReactDOMUseId", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("returns a non-empty string", async () => {
    let capturedId: string | undefined;
    const App = () => {
      capturedId = React.useId();
      return <div />;
    };

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });
    expect(typeof capturedId).toBe("string");
    expect(capturedId!.length).toBeGreaterThan(0);
  });

  it("returns different ids for multiple calls in a single component", async () => {
    let firstId: string | undefined;
    let secondId: string | undefined;
    let thirdId: string | undefined;

    const App = () => {
      firstId = React.useId();
      secondId = React.useId();
      thirdId = React.useId();
      return <div>{`${firstId}, ${secondId}, ${thirdId}`}</div>;
    };

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });
    expect(firstId).not.toBe(secondId);
    expect(secondId).not.toBe(thirdId);
    expect(firstId).not.toBe(thirdId);
  });

  it("returns stable ids across re-renders", async () => {
    const idsPerRender: string[] = [];
    const App = () => {
      const generatedId = React.useId();
      idsPerRender.push(generatedId);
      return <div>{generatedId}</div>;
    };

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });
    await act(() => {
      root.render(<App />);
    });
    expect(idsPerRender.length).toBeGreaterThanOrEqual(2);
    expect(idsPerRender[0]).toBe(idsPerRender[idsPerRender.length - 1]);
  });

  it("returns different ids for sibling components", async () => {
    const collectedIds: string[] = [];
    const Child = () => {
      collectedIds.push(React.useId());
      return <div />;
    };
    const App = () => (
      <div>
        <Child />
        <Child />
      </div>
    );

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });
    expect(collectedIds[0]).not.toBe(collectedIds[1]);
  });

  it("returns different ids for nested components", async () => {
    let parentId: string | undefined;
    let childId: string | undefined;

    const Child = () => {
      childId = React.useId();
      return <div />;
    };
    const Parent = () => {
      parentId = React.useId();
      return (
        <div>
          <Child />
        </div>
      );
    };

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });
    expect(parentId).not.toBe(childId);
  });

  it("is stable with local render phase updates", async () => {
    let capturedId: string | undefined;
    const App = () => {
      const [count, setCount] = React.useState(0);
      if (count < 3) {
        setCount(count + 1);
      }
      capturedId = React.useId();
      return <div>{capturedId}</div>;
    };

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });
    const firstId = capturedId;
    await act(() => {
      root.render(<App />);
    });
    expect(capturedId).toBe(firstId);
  });

  it("respects identifierPrefix option", async () => {
    let capturedId: string | undefined;
    const Child = () => {
      capturedId = React.useId();
      return <div>{capturedId}</div>;
    };

    const root = ReactDOMClient.createRoot(container, {
      identifierPrefix: "custom-prefix-",
    });
    await act(() => {
      root.render(<Child />);
    });
    expect(capturedId).toContain("custom-prefix-");
  });
});
