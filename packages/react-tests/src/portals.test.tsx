import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { createPortal, flushSync } from "react-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, log, assertLog, clearLog } from "./utils";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      math: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      mi: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

describe("ReactDOMFiber", () => {
  let container: HTMLDivElement;
  let root: ReactDOMClient.Root;

  let svgEls: Element[];
  let htmlEls: Element[];
  let mathEls: Element[];

  const expectSVG = {
    ref: (element: Element | null) => {
      if (element) svgEls.push(element);
    },
  };

  const expectHTML = {
    ref: (element: Element | null) => {
      if (element) htmlEls.push(element);
    },
  };

  const expectMath = {
    ref: (element: Element | null) => {
      if (element) mathEls.push(element);
    },
  };

  const usePortal = (tree: React.ReactNode) => {
    return createPortal(tree, document.createElement("div"));
  };

  const assertNamespacesMatch = async (tree: React.ReactNode) => {
    const testContainer = document.createElement("div");
    svgEls = [];
    htmlEls = [];
    mathEls = [];

    const testRoot = ReactDOMClient.createRoot(testContainer);
    await act(async () => {
      testRoot.render(tree);
    });

    svgEls.forEach((element) => {
      expect(element.namespaceURI).toBe("http://www.w3.org/2000/svg");
    });
    htmlEls.forEach((element) => {
      expect(element.namespaceURI).toBe("http://www.w3.org/1999/xhtml");
    });
    mathEls.forEach((element) => {
      expect(element.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");
    });

    testRoot.unmount();
    expect(testContainer.innerHTML).toBe("");
  };

  beforeEach(() => {
    clearLog();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOMClient.createRoot(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  it("should render strings as children", async () => {
    const Box = ({ value }: { value: React.ReactNode }) => <div>{value}</div>;
    await act(async () => {
      root.render(<Box value="foo" />);
    });
    expect(container.textContent).toEqual("foo");
  });

  it("should render numbers as children", async () => {
    const Box = ({ value }: { value: React.ReactNode }) => <div>{value}</div>;
    await act(async () => {
      root.render(<Box value={10} />);
    });
    expect(container.textContent).toEqual("10");
  });

  it("should render bigints as children", async () => {
    const Box = ({ value }: { value: React.ReactNode }) => <div>{value}</div>;
    await act(async () => {
      root.render(<Box value={10n} />);
    });
    expect(container.textContent).toEqual("10");
  });

  it("should call an effect after mount/update (replacing render callback pattern)", async () => {
    const Component = () => {
      React.useEffect(() => {
        log("Callback");
      });
      return <div>Foo</div>;
    };

    await act(async () => {
      root.render(<Component />);
    });
    assertLog(["Callback"]);

    await act(async () => {
      root.render(<Component />);
    });
    assertLog(["Callback"]);
  });

  it("should call an effect when the same element is re-rendered (replacing render callback pattern)", async () => {
    const Component = ({ prop }: { prop: string }) => {
      React.useEffect(() => {
        log("Callback");
      });
      return <div>{prop}</div>;
    };

    await act(async () => {
      root.render(<Component prop="Foo" />);
    });
    assertLog(["Callback"]);

    await act(async () => {
      root.render(<Component prop="Bar" />);
    });
    assertLog(["Callback"]);
  });

  it("should render a component returning strings directly from render", async () => {
    const Text = ({
      value,
    }: {
      value: React.ReactNode;
    }): React.ReactNode => value;

    await act(async () => {
      root.render(<Text value="foo" />);
    });
    expect(container.textContent).toEqual("foo");
  });

  it("should render a component returning numbers directly from render", async () => {
    const Text = ({
      value,
    }: {
      value: React.ReactNode;
    }): React.ReactNode => value;

    await act(async () => {
      root.render(<Text value={10} />);
    });
    expect(container.textContent).toEqual("10");
  });

  it("renders an empty fragment", async () => {
    const Div = () => <div />;
    const EmptyFragment = () => <></>;
    const NonEmptyFragment = () => (
      <>
        <Div />
      </>
    );

    await act(async () => {
      root.render(<EmptyFragment />);
    });
    expect(container.firstChild).toBe(null);

    await act(async () => {
      root.render(<NonEmptyFragment />);
    });
    expect((container.firstChild as Element).tagName).toBe("DIV");

    await act(async () => {
      root.render(<EmptyFragment />);
    });
    expect(container.firstChild).toBe(null);

    await act(async () => {
      root.render(<Div />);
    });
    expect((container.firstChild as Element).tagName).toBe("DIV");

    await act(async () => {
      root.render(<EmptyFragment />);
    });
    expect(container.firstChild).toBe(null);
  });

  it("should render one portal", async () => {
    const portalContainer = document.createElement("div");

    await act(() => {
      root.render(
        <div>{createPortal(<div>portal</div>, portalContainer)}</div>,
      );
    });
    expect(portalContainer.innerHTML).toBe("<div>portal</div>");
    expect(container.innerHTML).toBe("<div></div>");

    root.unmount();
    expect(portalContainer.innerHTML).toBe("");
    expect(container.innerHTML).toBe("");
  });

  it("should render many portals", async () => {
    const portalContainer1 = document.createElement("div");
    const portalContainer2 = document.createElement("div");

    class Child extends React.Component<{ name: string }> {
      componentDidMount() {
        log(`${this.props.name} componentDidMount`);
      }
      componentDidUpdate() {
        log(`${this.props.name} componentDidUpdate`);
      }
      componentWillUnmount() {
        log(`${this.props.name} componentWillUnmount`);
      }
      render() {
        return <div>{this.props.name}</div>;
      }
    }

    class Parent extends React.Component<{ step: string }> {
      componentDidMount() {
        log(`Parent:${this.props.step} componentDidMount`);
      }
      componentDidUpdate() {
        log(`Parent:${this.props.step} componentDidUpdate`);
      }
      componentWillUnmount() {
        log(`Parent:${this.props.step} componentWillUnmount`);
      }
      render() {
        const { step } = this.props;
        return [
          <Child key="a" name={`normal[0]:${step}`} />,
          createPortal(
            <Child key="b" name={`portal1[0]:${step}`} />,
            portalContainer1,
          ),
          <Child key="c" name={`normal[1]:${step}`} />,
          createPortal(
            [
              <Child key="d" name={`portal2[0]:${step}`} />,
              <Child key="e" name={`portal2[1]:${step}`} />,
            ],
            portalContainer2,
          ),
        ];
      }
    }

    await act(() => {
      root.render(<Parent step="a" />);
    });
    expect(portalContainer1.innerHTML).toBe("<div>portal1[0]:a</div>");
    expect(portalContainer2.innerHTML).toBe(
      "<div>portal2[0]:a</div><div>portal2[1]:a</div>",
    );
    expect(container.innerHTML).toBe(
      "<div>normal[0]:a</div><div>normal[1]:a</div>",
    );
    assertLog([
      "normal[0]:a componentDidMount",
      "portal1[0]:a componentDidMount",
      "normal[1]:a componentDidMount",
      "portal2[0]:a componentDidMount",
      "portal2[1]:a componentDidMount",
      "Parent:a componentDidMount",
    ]);

    await act(() => {
      root.render(<Parent step="b" />);
    });
    expect(portalContainer1.innerHTML).toBe("<div>portal1[0]:b</div>");
    expect(portalContainer2.innerHTML).toBe(
      "<div>portal2[0]:b</div><div>portal2[1]:b</div>",
    );
    expect(container.innerHTML).toBe(
      "<div>normal[0]:b</div><div>normal[1]:b</div>",
    );
    assertLog([
      "normal[0]:b componentDidUpdate",
      "portal1[0]:b componentDidUpdate",
      "normal[1]:b componentDidUpdate",
      "portal2[0]:b componentDidUpdate",
      "portal2[1]:b componentDidUpdate",
      "Parent:b componentDidUpdate",
    ]);

    root.unmount();
    expect(portalContainer1.innerHTML).toBe("");
    expect(portalContainer2.innerHTML).toBe("");
    expect(container.innerHTML).toBe("");
    assertLog([
      "Parent:b componentWillUnmount",
      "normal[0]:b componentWillUnmount",
      "portal1[0]:b componentWillUnmount",
      "normal[1]:b componentWillUnmount",
      "portal2[0]:b componentWillUnmount",
      "portal2[1]:b componentWillUnmount",
    ]);
  });

  it("should render nested portals", async () => {
    const portalContainer1 = document.createElement("div");
    const portalContainer2 = document.createElement("div");
    const portalContainer3 = document.createElement("div");

    await act(() => {
      root.render([
        <div key="a">normal[0]</div>,
        createPortal(
          [
            <div key="b">portal1[0]</div>,
            createPortal(<div key="c">portal2[0]</div>, portalContainer2),
            createPortal(<div key="d">portal3[0]</div>, portalContainer3),
            <div key="e">portal1[1]</div>,
          ],
          portalContainer1,
        ),
        <div key="f">normal[1]</div>,
      ]);
    });
    expect(portalContainer1.innerHTML).toBe(
      "<div>portal1[0]</div><div>portal1[1]</div>",
    );
    expect(portalContainer2.innerHTML).toBe("<div>portal2[0]</div>");
    expect(portalContainer3.innerHTML).toBe("<div>portal3[0]</div>");
    expect(container.innerHTML).toBe(
      "<div>normal[0]</div><div>normal[1]</div>",
    );

    root.unmount();
    expect(portalContainer1.innerHTML).toBe("");
    expect(portalContainer2.innerHTML).toBe("");
    expect(portalContainer3.innerHTML).toBe("");
    expect(container.innerHTML).toBe("");
  });

  it("should reconcile portal children", async () => {
    const portalContainer = document.createElement("div");

    await act(() => {
      root.render(
        <div>
          {createPortal(<div>portal:1</div>, portalContainer)}
        </div>,
      );
    });
    expect(portalContainer.innerHTML).toBe("<div>portal:1</div>");
    expect(container.innerHTML).toBe("<div></div>");

    await act(() => {
      root.render(
        <div>
          {createPortal(<div>portal:2</div>, portalContainer)}
        </div>,
      );
    });
    expect(portalContainer.innerHTML).toBe("<div>portal:2</div>");
    expect(container.innerHTML).toBe("<div></div>");

    await act(() => {
      root.render(
        <div>{createPortal(<p>portal:3</p>, portalContainer)}</div>,
      );
    });
    expect(portalContainer.innerHTML).toBe("<p>portal:3</p>");
    expect(container.innerHTML).toBe("<div></div>");

    await act(() => {
      root.render(
        <div>{createPortal(["Hi", "Bye"], portalContainer)}</div>,
      );
    });
    expect(portalContainer.innerHTML).toBe("HiBye");
    expect(container.innerHTML).toBe("<div></div>");

    await act(() => {
      root.render(
        <div>{createPortal(["Bye", "Hi"], portalContainer)}</div>,
      );
    });
    expect(portalContainer.innerHTML).toBe("ByeHi");
    expect(container.innerHTML).toBe("<div></div>");

    await act(() => {
      root.render(<div>{createPortal(null, portalContainer)}</div>);
    });
    expect(portalContainer.innerHTML).toBe("");
    expect(container.innerHTML).toBe("<div></div>");
  });

  it("should unmount empty portal component wherever it appears", async () => {
    const portalContainer = document.createElement("div");

    let wrapperInstance: React.Component<{}, { show: boolean }>;

    class Wrapper extends React.Component<{}, { show: boolean }> {
      state: { show: boolean } = { show: true };

      constructor(props: {}) {
        super(props);
        wrapperInstance = this;
      }

      render() {
        return (
          <div>
            {this.state.show && (
              <>
                {createPortal(null, portalContainer)}
                <div>child</div>
              </>
            )}
            <div>parent</div>
          </div>
        );
      }
    }

    await act(() => {
      root.render(<Wrapper />);
    });
    expect(container.innerHTML).toBe(
      "<div><div>child</div><div>parent</div></div>",
    );
    await act(() => {
      wrapperInstance.setState({ show: false });
    });
    expect(container.innerHTML).toBe("<div><div>parent</div></div>");
  });

  it("should keep track of namespace across portals (simple)", async () => {
    await assertNamespacesMatch(
      <svg {...expectSVG}>
        <image {...expectSVG} />
        {usePortal(<div {...expectHTML} />)}
        <image {...expectSVG} />
      </svg>,
    );
    await assertNamespacesMatch(
      <math {...expectMath}>
        <mi {...expectMath} />
        {usePortal(<div {...expectHTML} />)}
        <mi {...expectMath} />
      </math>,
    );
    await assertNamespacesMatch(
      <div {...expectHTML}>
        <p {...expectHTML} />
        {usePortal(
          <svg {...expectSVG}>
            <image {...expectSVG} />
          </svg>,
        )}
        <p {...expectHTML} />
      </div>,
    );
  });

  it("should keep track of namespace across portals (medium)", async () => {
    await assertNamespacesMatch(
      <svg {...expectSVG}>
        <image {...expectSVG} />
        {usePortal(<div {...expectHTML} />)}
        <image {...expectSVG} />
        {usePortal(<div {...expectHTML} />)}
        <image {...expectSVG} />
      </svg>,
    );
    await assertNamespacesMatch(
      <div {...expectHTML}>
        <math {...expectMath}>
          <mi {...expectMath} />
          {usePortal(
            <svg {...expectSVG}>
              <image {...expectSVG} />
            </svg>,
          )}
        </math>
        <p {...expectHTML} />
      </div>,
    );
    await assertNamespacesMatch(
      <math {...expectMath}>
        <mi {...expectMath} />
        {usePortal(
          <svg {...expectSVG}>
            <image {...expectSVG} />
            <foreignObject {...expectSVG}>
              <p {...expectHTML} />
              <math {...expectMath}>
                <mi {...expectMath} />
              </math>
              <p {...expectHTML} />
            </foreignObject>
            <image {...expectSVG} />
          </svg>,
        )}
        <mi {...expectMath} />
      </math>,
    );
    await assertNamespacesMatch(
      <div {...expectHTML}>
        {usePortal(
          <svg {...expectSVG}>
            {usePortal(<div {...expectHTML} />)}
            <image {...expectSVG} />
          </svg>,
        )}
        <p {...expectHTML} />
      </div>,
    );
    await assertNamespacesMatch(
      <svg {...expectSVG}>
        <svg {...expectSVG}>
          {usePortal(<div {...expectHTML} />)}
          <image {...expectSVG} />
        </svg>
        <image {...expectSVG} />
      </svg>,
    );
  });

  it("should keep track of namespace across portals (complex)", async () => {
    await assertNamespacesMatch(
      <div {...expectHTML}>
        {usePortal(
          <svg {...expectSVG}>
            <image {...expectSVG} />
          </svg>,
        )}
        <p {...expectHTML} />
        <svg {...expectSVG}>
          <image {...expectSVG} />
        </svg>
        <svg {...expectSVG}>
          <svg {...expectSVG}>
            <image {...expectSVG} />
          </svg>
          <image {...expectSVG} />
        </svg>
        <p {...expectHTML} />
      </div>,
    );
    await assertNamespacesMatch(
      <div {...expectHTML}>
        <svg {...expectSVG}>
          <svg {...expectSVG}>
            <image {...expectSVG} />
            {usePortal(
              <svg {...expectSVG}>
                <image {...expectSVG} />
                <svg {...expectSVG}>
                  <image {...expectSVG} />
                </svg>
                <image {...expectSVG} />
              </svg>,
            )}
            <image {...expectSVG} />
            <foreignObject {...expectSVG}>
              <p {...expectHTML} />
              {usePortal(<p {...expectHTML} />)}
              <p {...expectHTML} />
            </foreignObject>
          </svg>
          <image {...expectSVG} />
        </svg>
        <p {...expectHTML} />
      </div>,
    );
    await assertNamespacesMatch(
      <div {...expectHTML}>
        <svg {...expectSVG}>
          <foreignObject {...expectSVG}>
            <p {...expectHTML} />
            {usePortal(
              <svg {...expectSVG}>
                <image {...expectSVG} />
                <svg {...expectSVG}>
                  <image {...expectSVG} />
                  <foreignObject {...expectSVG}>
                    <p {...expectHTML} />
                  </foreignObject>
                  {usePortal(<p {...expectHTML} />)}
                </svg>
                <image {...expectSVG} />
              </svg>,
            )}
            <p {...expectHTML} />
          </foreignObject>
          <image {...expectSVG} />
        </svg>
        <p {...expectHTML} />
      </div>,
    );
  });

  it("should unwind namespaces on uncaught errors", async () => {
    const BrokenRender = () => {
      throw new Error("Hello");
    };

    await expect(async () => {
      await assertNamespacesMatch(
        <svg {...expectSVG}>
          <BrokenRender />
        </svg>,
      );
    }).rejects.toThrow("Hello");
    await assertNamespacesMatch(<div {...expectHTML} />);
  });

  it("should unwind namespaces on caught errors", async () => {
    const BrokenRender = () => {
      throw new Error("Hello");
    };

    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { error: Error | null }
    > {
      state: { error: Error | null } = { error: null };
      componentDidCatch(error: Error) {
        this.setState({ error });
      }
      render() {
        if (this.state.error) {
          return <p {...expectHTML} />;
        }
        return this.props.children;
      }
    }

    await assertNamespacesMatch(
      <svg {...expectSVG}>
        <foreignObject {...expectSVG}>
          <ErrorBoundary>
            <math {...expectMath}>
              <BrokenRender />
            </math>
          </ErrorBoundary>
        </foreignObject>
        <image {...expectSVG} />
      </svg>,
    );
    await assertNamespacesMatch(<div {...expectHTML} />);
  });

  it("should unwind namespaces on caught errors in a portal", async () => {
    const BrokenRender = () => {
      throw new Error("Hello");
    };

    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { error: Error | null }
    > {
      state: { error: Error | null } = { error: null };
      componentDidCatch(error: Error) {
        this.setState({ error });
      }
      render() {
        if (this.state.error) {
          return <image {...expectSVG} />;
        }
        return this.props.children;
      }
    }

    await assertNamespacesMatch(
      <svg {...expectSVG}>
        <ErrorBoundary>
          {usePortal(
            <div {...expectHTML}>
              <math {...expectMath}>
                <BrokenRender />)
              </math>
            </div>,
          )}
        </ErrorBoundary>
        {usePortal(<div {...expectHTML} />)}
      </svg>,
    );
  });

  it("should bubble events from the portal to the parent", async () => {
    const portalContainer = document.createElement("div");
    document.body.appendChild(portalContainer);
    try {
      let portal: HTMLDivElement | null = null;

      await act(() => {
        root.render(
          <div onClick={() => log("parent clicked")}>
            {createPortal(
              <div
                onClick={() => log("portal clicked")}
                ref={(node) => {
                  portal = node;
                }}>
                portal
              </div>,
              portalContainer,
            )}
          </div>,
        );
      });

      expect(portal!.tagName).toBe("DIV");

      await act(() => {
        portal!.click();
      });

      assertLog(["portal clicked", "parent clicked"]);
    } finally {
      document.body.removeChild(portalContainer);
    }
  });

  it("should not onMouseLeave when staying in the portal", async () => {
    const portalContainer = document.createElement("div");
    document.body.appendChild(portalContainer);

    let firstTarget: HTMLDivElement | null = null;
    let secondTarget: HTMLDivElement | null = null;
    let thirdTarget: HTMLDivElement | null = null;

    const simulateMouseMove = (
      from: Element | null,
      to: Element | null,
    ) => {
      if (from) {
        from.dispatchEvent(
          new MouseEvent("mouseout", {
            bubbles: true,
            cancelable: true,
            relatedTarget: to,
          }),
        );
      }
      if (to) {
        to.dispatchEvent(
          new MouseEvent("mouseover", {
            bubbles: true,
            cancelable: true,
            relatedTarget: from,
          }),
        );
      }
    };

    try {
      await act(() => {
        root.render(
          <div>
            <div
              onMouseEnter={() => log("enter parent")}
              onMouseLeave={() => log("leave parent")}>
              <div ref={(node) => { firstTarget = node; }} />
              {createPortal(
                <div
                  onMouseEnter={() => log("enter portal")}
                  onMouseLeave={() => log("leave portal")}
                  ref={(node) => { secondTarget = node; }}>
                  portal
                </div>,
                portalContainer,
              )}
            </div>
            <div ref={(node) => { thirdTarget = node; }} />
          </div>,
        );
      });
      await act(() => {
        simulateMouseMove(null, firstTarget);
      });
      assertLog(["enter parent"]);

      await act(() => {
        simulateMouseMove(firstTarget, secondTarget);
      });
      assertLog(["enter portal"]);

      await act(() => {
        simulateMouseMove(secondTarget, thirdTarget);
      });
      assertLog(["leave portal", "leave parent"]);
    } finally {
      document.body.removeChild(portalContainer);
    }
  });

  it("does not fire mouseEnter twice when relatedTarget is the root node", async () => {
    let target: HTMLDivElement | null = null;

    const simulateMouseMove = (
      from: Element | null,
      to: Element | null,
    ) => {
      if (from) {
        from.dispatchEvent(
          new MouseEvent("mouseout", {
            bubbles: true,
            cancelable: true,
            relatedTarget: to,
          }),
        );
      }
      if (to) {
        to.dispatchEvent(
          new MouseEvent("mouseover", {
            bubbles: true,
            cancelable: true,
            relatedTarget: from,
          }),
        );
      }
    };

    await act(() => {
      root.render(
        <div
          ref={(node) => { target = node; }}
          onMouseEnter={() => log("enter")}
          onMouseLeave={() => log("leave")}
        />,
      );
    });

    await act(() => {
      simulateMouseMove(null, container);
    });
    assertLog([]);

    await act(() => {
      simulateMouseMove(container, target);
    });
    assertLog(["enter"]);

    await act(() => {
      simulateMouseMove(target, container);
    });
    assertLog(["leave"]);

    await act(() => {
      simulateMouseMove(container, null);
    });
    assertLog([]);
  });

  it("listens to events that do not exist in the Portal subtree", async () => {
    const onClick = vi.fn();

    const buttonRef = React.createRef<HTMLButtonElement>();
    await act(() => {
      root.render(
        <div onClick={onClick}>
          {createPortal(
            <button ref={buttonRef}>click</button>,
            document.body,
          )}
        </div>,
      );
    });
    const event = new MouseEvent("click", {
      bubbles: true,
    });
    await act(() => {
      buttonRef.current!.dispatchEvent(event);
    });

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("should throw on bad createPortal argument", () => {
    expect(() => {
      // eslint-disable-next-line
      createPortal(<div>portal</div>, null as any);
    }).toThrow("Target container is not a DOM element.");
    expect(() => {
      // eslint-disable-next-line
      createPortal(<div>portal</div>, document.createTextNode("hi") as any);
    }).toThrow("Target container is not a DOM element.");
  });

  it("should warn for non-functional event listeners", () => {
    class Example extends React.Component {
      render() {
        return <div onClick={"woops" as any} />;
      }
    }
    flushSync(() => {
      root.render(<Example />);
    });
  });

  it("should warn with a special message for `false` event listeners", () => {
    class Example extends React.Component {
      render() {
        return <div onClick={false as any} />;
      }
    }
    flushSync(() => {
      root.render(<Example />);
    });
  });

  it("should not update event handlers until commit", async () => {
    const handlerA = () => log("A");
    const handlerB = () => log("B");

    let node!: HTMLElement;

    const click = () => {
      const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "timeStamp", {
        value: 0,
      });
      node.dispatchEvent(event);
    };

    class Example extends React.Component<
      { forceA?: boolean },
      { flip: boolean; count: number }
    > {
      state: { flip: boolean; count: number } = { flip: false, count: 0 };
      flip() {
        this.setState({ flip: true, count: this.state.count + 1 });
      }
      tick() {
        this.setState({ count: this.state.count + 1 });
      }
      render() {
        const useB = !this.props.forceA && this.state.flip;
        return <div onClick={useB ? handlerB : handlerA} />;
      }
    }

    class Click extends React.Component {
      constructor(props: {}) {
        super(props);
        node.click();
      }
      render() {
        return null;
      }
    }

    let inst!: Example;
    await act(() => {
      root.render([
        <Example
          key="a"
          ref={(instance) => {
            if (instance) inst = instance;
          }}
        />,
      ]);
    });
    node = container.firstChild as HTMLElement;
    expect(node.tagName).toEqual("DIV");

    await act(() => {
      click();
    });
    assertLog(["A"]);

    await act(() => {
      inst.flip();
    });

    await act(() => {
      click();
    });
    assertLog(["B"]);

    await act(() => {
      inst.tick();
    });

    await act(() => {
      click();
    });
    assertLog(["B"]);

    await act(() => {
      root.render([<Example key="a" forceA={true} />, <Click key="b" />]);
    });
    assertLog(["B"]);

    await act(() => {
      click();
    });
    assertLog(["A"]);
  });

  it("should not crash encountering low-priority tree", async () => {
    await act(() => {
      root.render(
        <div hidden={true}>
          <div />
        </div>,
      );
    });

    expect(container.innerHTML).toBe('<div hidden=""><div></div></div>');
  });

  it("should not warn when rendering into an empty container", async () => {
    await act(() => {
      root.render(<div>foo</div>);
    });
    expect(container.innerHTML).toBe("<div>foo</div>");
    await act(() => {
      root.render(null);
    });
    expect(container.innerHTML).toBe("");
    await act(() => {
      root.render(<div>bar</div>);
    });
    expect(container.innerHTML).toBe("<div>bar</div>");
  });

  it("should warn when replacing a container which was manually updated outside of React", async () => {
    await act(() => {
      root.render(<div key="1">foo</div>);
    });
    expect(container.innerHTML).toBe("<div>foo</div>");

    await act(() => {
      root.render(<div key="1">bar</div>);
    });
    expect(container.innerHTML).toBe("<div>bar</div>");

    container.innerHTML = "<div>MEOW.</div>";

    await expect(async () => {
      await act(() => {
        flushSync(() => {
          root.render(<div key="2">baz</div>);
        });
      });
    }).rejects.toThrow("The node to be removed is not a child of this node");
  });

  it("should not warn when doing an update to a container manually updated outside of React", async () => {
    await act(() => {
      root.render(<div>foo</div>);
    });
    expect(container.innerHTML).toBe("<div>foo</div>");

    await act(() => {
      root.render(<div>bar</div>);
    });
    expect(container.innerHTML).toBe("<div>bar</div>");

    container.innerHTML = "<div>MEOW.</div>";

    await act(() => {
      root.render(<div>baz</div>);
    });
    expect(container.innerHTML).toBe("<div>MEOW.</div>");
  });

  it("should not warn when doing an update to a container manually cleared outside of React", async () => {
    await act(() => {
      root.render(<div>foo</div>);
    });
    expect(container.innerHTML).toBe("<div>foo</div>");

    await act(() => {
      root.render(<div>bar</div>);
    });
    expect(container.innerHTML).toBe("<div>bar</div>");

    container.innerHTML = "";

    await act(() => {
      root.render(<div>baz</div>);
    });
    expect(container.innerHTML).toBe("");
  });

  it("should render a text component with a text DOM node on the same document as the container", async () => {
    const textContent = "Hello world";
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);

    try {
      const iframeDocument = iframe.contentDocument!;
      iframeDocument.write(
        "<!DOCTYPE html><html><head></head><body><div></div></body></html>",
      );
      iframeDocument.close();
      const iframeContainer = iframeDocument.body
        .firstChild as HTMLDivElement;

      let actualDocument: Document | null = null;
      let textNode: Node | null = null;

      const appendChildSpy = vi.spyOn(iframeContainer, "appendChild");
      appendChildSpy.mockImplementation((<T extends Node>(
        appendedNode: T,
      ): T => {
        actualDocument = appendedNode.ownerDocument;
        textNode = appendedNode;
        return appendedNode;
      }) as typeof iframeContainer.appendChild);

      const iframeRoot = ReactDOMClient.createRoot(iframeContainer);
      await act(() => {
        iframeRoot.render(textContent);
      });

      expect(textNode!.textContent).toBe(textContent);
      expect(actualDocument).not.toBe(document);
      expect(actualDocument).toBe(iframeDocument);
      expect(iframeContainer.appendChild).toHaveBeenCalledTimes(1);
    } finally {
      document.body.removeChild(iframe);
    }
  });

  it("should mount into a document fragment", async () => {
    const fragment = document.createDocumentFragment();
    const fragmentRoot = ReactDOMClient.createRoot(fragment);
    await act(() => {
      fragmentRoot.render(<div>foo</div>);
    });
    expect(container.innerHTML).toBe("");
    container.appendChild(fragment);
    expect(container.innerHTML).toBe("<div>foo</div>");
  });

  it("should not diff memoized host components", async () => {
    const inputRef = React.createRef<HTMLInputElement>();
    let didCallOnChange = false;

    class Child extends React.Component {
      state = {};
      componentDidMount() {
        document.addEventListener("click", this.update, true);
      }
      componentWillUnmount() {
        document.removeEventListener("click", this.update, true);
      }
      update = () => {
        this.setState({});
      };
      render() {
        return <div />;
      }
    }

    class Parent extends React.Component {
      handleChange = () => {
        didCallOnChange = true;
      };
      render() {
        return (
          <div>
            <Child />
            <input
              ref={inputRef}
              type="checkbox"
              checked={true}
              onChange={this.handleChange}
            />
          </div>
        );
      }
    }

    await act(() => {
      root.render(<Parent />);
    });
    await act(() => {
      inputRef.current!.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
        }),
      );
    });
    expect(didCallOnChange).toBe(true);
  });
});
