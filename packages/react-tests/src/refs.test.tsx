import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect, vi } from "vitest";
import { act } from "./utils";

describe("ref swapping", () => {
  it("Allow refs to hop around children correctly", async () => {
    class RefHopsAroundClass extends React.Component {
      containerRef: HTMLDivElement | null = null;
      state = { count: 0 };
      hopRef = React.createRef<HTMLDivElement>();
      divOneRef = React.createRef<HTMLDivElement>();
      divTwoRef = React.createRef<HTMLDivElement>();
      divThreeRef = React.createRef<HTMLDivElement>();

      moveRef = () => {
        this.setState({ count: this.state.count + 1 });
      };

      render() {
        const count = this.state.count;
        return (
          <div
            ref={(current) => {
              this.containerRef = current;
            }}
          >
            <div className="first" ref={count % 3 === 0 ? this.hopRef : this.divOneRef} />
            <div className="second" ref={count % 3 === 1 ? this.hopRef : this.divTwoRef} />
            <div className="third" ref={count % 3 === 2 ? this.hopRef : this.divThreeRef} />
          </div>
        );
      }
    }
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    let refHopsAround: InstanceType<typeof RefHopsAroundClass>;
    await act(() => {
      root.render(
        <RefHopsAroundClass
          ref={(current: InstanceType<typeof RefHopsAroundClass>) => {
            refHopsAround = current;
          }}
        />,
      );
    });

    const firstDiv = refHopsAround!.containerRef!.querySelector(".first");
    const secondDiv = refHopsAround!.containerRef!.querySelector(".second");
    const thirdDiv = refHopsAround!.containerRef!.querySelector(".third");

    expect(refHopsAround!.hopRef.current).toEqual(firstDiv);
    expect(refHopsAround!.divTwoRef.current).toEqual(secondDiv);
    expect(refHopsAround!.divThreeRef.current).toEqual(thirdDiv);

    await act(() => {
      refHopsAround!.moveRef();
    });
    expect(refHopsAround!.divOneRef.current).toEqual(firstDiv);
    expect(refHopsAround!.hopRef.current).toEqual(secondDiv);
    expect(refHopsAround!.divThreeRef.current).toEqual(thirdDiv);

    await act(() => {
      refHopsAround!.moveRef();
    });
    expect(refHopsAround!.divOneRef.current).toEqual(firstDiv);
    expect(refHopsAround!.divTwoRef.current).toEqual(secondDiv);
    expect(refHopsAround!.hopRef.current).toEqual(thirdDiv);

    await act(() => {
      refHopsAround!.moveRef();
    });
    expect(refHopsAround!.hopRef.current).toEqual(firstDiv);
    expect(refHopsAround!.divTwoRef.current).toEqual(secondDiv);
    expect(refHopsAround!.divThreeRef.current).toEqual(thirdDiv);
  });

  it("always has a value for this.refs", async () => {
    class Component extends React.Component {
      render() {
        return <div />;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    let instance: Component | null = null;
    await act(() => {
      root.render(
        <Component
          ref={(current) => {
            instance = current;
          }}
        />,
      );
    });
    expect(Boolean((instance as unknown as { refs: object }).refs)).toBe(true);
  });

  it("ref called correctly for stateless component", async () => {
    let refCalled = 0;

    const Inner = (props: { saveA: (element: HTMLAnchorElement | null) => void }) => {
      return <a ref={props.saveA} />;
    };

    class Outer extends React.Component {
      saveA = () => {
        refCalled++;
      };

      componentDidMount() {
        this.setState({});
      }

      render() {
        return <Inner saveA={this.saveA} />;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Outer />);
    });

    expect(refCalled).toBe(1);
  });

  it("provides an error for invalid refs", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(<div ref={10 as unknown as React.Ref<HTMLDivElement>} />);
      });
    }).rejects.toThrow();

    const root2 = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root2.render(<div ref={true as unknown as React.Ref<HTMLDivElement>} />);
      });
    }).rejects.toThrow();

    const root3 = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root3.render(<div ref={Symbol("foo") as unknown as React.Ref<HTMLDivElement>} />);
      });
    }).rejects.toThrow();
  });
});

describe("root level refs", () => {
  it("attaches and detaches root refs", async () => {
    let ref = vi.fn();
    const container = document.createElement("div");
    let root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div ref={ref} />);
    });
    let result = container.firstChild;
    expect(ref).toHaveBeenCalledTimes(1);
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
    expect(result).toBe(ref.mock.calls[0][0]);
    await act(() => {
      root.unmount();
    });
    expect(ref).toHaveBeenCalledTimes(2);
    expect(ref.mock.calls[1][0]).toBe(null);

    class Comp extends React.Component {
      method() {
        return true;
      }
      render() {
        return <div>Comp</div>;
      }
    }

    let compInst: Comp | null = null;
    const compRef = vi.fn((value: Comp | null) => {
      compInst = value;
    });
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Comp ref={compRef} />);
    });

    expect(compRef).toHaveBeenCalledTimes(1);
    expect(compInst).toBeInstanceOf(Comp);
    expect(compInst!.method()).toBe(true);

    await act(() => {
      root.unmount();
    });
    expect(compRef).toHaveBeenCalledTimes(2);
    expect(compRef.mock.calls[1][0]).toBe(null);

    compInst = null;
    const compRef2 = vi.fn((value: Comp | null) => {
      compInst = value;
    });
    let divInst: HTMLDivElement | null = null;
    const divRef = vi.fn((value: HTMLDivElement | null) => {
      divInst = value;
    });
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render([
        <Comp ref={compRef2} key="a" />,
        5,
        <div ref={divRef} key="b">
          Hello
        </div>,
      ]);
    });

    expect(compRef2).toHaveBeenCalledTimes(1);
    expect(compRef2.mock.calls[0][0]).toBeInstanceOf(Comp);

    expect(divRef).toHaveBeenCalledTimes(1);
    expect(divInst).toBeInstanceOf(HTMLDivElement);

    await act(() => {
      root.unmount();
    });
    expect(compRef2).toHaveBeenCalledTimes(2);
    expect(compRef2.mock.calls[1][0]).toBe(null);
    expect(divRef).toHaveBeenCalledTimes(2);
    expect(divRef.mock.calls[1][0]).toBe(null);

    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(null);
    });
    result = container.firstChild;
    expect(result).toBe(null);

    await act(() => {
      root.render(5);
    });
    result = container.firstChild;
    expect(result).toBeInstanceOf(Text);
  });
});

describe("refs return clean up function", () => {
  it("calls clean up function if it exists", async () => {
    const container = document.createElement("div");
    let cleanUp = vi.fn();
    let setup = vi.fn();

    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(
        <div
          ref={(_ref) => {
            setup(_ref);
            return cleanUp;
          }}
        />,
      );
    });

    await act(() => {
      root.render(
        <div
          ref={(_ref) => {
            setup(_ref);
          }}
        />,
      );
    });

    expect(setup).toHaveBeenCalledTimes(2);
    expect(cleanUp).toHaveBeenCalledTimes(1);
    expect(cleanUp.mock.calls[0][0]).toBe(undefined);

    await act(() => {
      root.render(<div ref={() => {}} />);
    });

    expect(cleanUp).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledTimes(3);
    expect(setup.mock.calls[2][0]).toBe(null);

    cleanUp = vi.fn();
    setup = vi.fn();

    await act(() => {
      root.render(
        <div
          ref={(_ref) => {
            setup(_ref);
            return cleanUp;
          }}
        />,
      );
    });

    expect(setup).toHaveBeenCalledTimes(1);
    expect(cleanUp).toHaveBeenCalledTimes(0);

    await act(() => {
      root.render(
        <div
          ref={(_ref) => {
            setup(_ref);
            return cleanUp;
          }}
        />,
      );
    });

    expect(setup).toHaveBeenCalledTimes(2);
    expect(cleanUp).toHaveBeenCalledTimes(1);
  });

  it("handles ref functions with stable identity", async () => {
    const container = document.createElement("div");
    const cleanUp = vi.fn();
    const setup = vi.fn();

    const onRefChange = (_ref: HTMLDivElement | null) => {
      setup(_ref);
      return cleanUp;
    };

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div ref={onRefChange} />);
    });

    expect(setup).toHaveBeenCalledTimes(1);
    expect(cleanUp).toHaveBeenCalledTimes(0);

    await act(() => {
      root.render(<div className="niceClassName" ref={onRefChange} />);
    });

    expect(setup).toHaveBeenCalledTimes(1);
    expect(cleanUp).toHaveBeenCalledTimes(0);

    await act(() => {
      root.render(<div />);
    });

    expect(setup).toHaveBeenCalledTimes(1);
    expect(cleanUp).toHaveBeenCalledTimes(1);
  });

  it("handles detaching refs with either cleanup function or null argument", async () => {
    const container = document.createElement("div");
    const cleanUp = vi.fn();
    const setup = vi.fn();
    const setup2 = vi.fn();
    const nullHandler = vi.fn();

    const onRefChangeWithCleanup = (_ref: HTMLDivElement | null) => {
      if (_ref) {
        setup(_ref.id);
      } else {
        nullHandler();
      }
      return cleanUp;
    };

    const onRefChangeWithoutCleanup = (_ref: HTMLDivElement | null) => {
      if (_ref) {
        setup2(_ref.id);
      } else {
        nullHandler();
      }
    };

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div id="test-div" ref={onRefChangeWithCleanup} />);
    });

    expect(setup).toHaveBeenCalledWith("test-div");
    expect(setup).toHaveBeenCalledTimes(1);
    expect(cleanUp).toHaveBeenCalledTimes(0);

    await act(() => {
      root.render(<div id="test-div2" ref={onRefChangeWithoutCleanup} />);
    });

    expect(setup).toHaveBeenCalledTimes(1);
    expect(nullHandler).toHaveBeenCalledTimes(0);
    expect(cleanUp).toHaveBeenCalledTimes(1);

    expect(setup2).toHaveBeenCalledWith("test-div2");
    expect(setup2).toHaveBeenCalledTimes(1);

    await act(() => {
      root.render(<div id="test-div3" ref={onRefChangeWithCleanup} />);
    });

    expect(setup2).toHaveBeenCalledWith("test-div2");
    expect(setup2).toHaveBeenCalledTimes(1);

    expect(nullHandler).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledTimes(2);
  });

  it("calls cleanup function on unmount", async () => {
    const container = document.createElement("div");
    const cleanUp = vi.fn();
    const setup = vi.fn();
    const nullHandler = vi.fn();

    const onRefChangeWithCleanup = (_ref: HTMLDivElement | null) => {
      if (_ref) {
        setup(_ref.id);
      } else {
        nullHandler();
      }
      return cleanUp;
    };

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div id="test-div" ref={onRefChangeWithCleanup} />);
    });

    expect(setup).toHaveBeenCalledTimes(1);
    expect(cleanUp).toHaveBeenCalledTimes(0);
    expect(nullHandler).toHaveBeenCalledTimes(0);

    root.unmount();

    expect(setup).toHaveBeenCalledTimes(1);
    expect(cleanUp).toHaveBeenCalledTimes(1);
    expect(nullHandler).toHaveBeenCalledTimes(0);
  });
});

describe("useImperativeHandle refs", () => {
  interface ImperativeHandle {
    greet: () => string;
  }

  const ImperativeHandleComponent = React.forwardRef<ImperativeHandle, { name: string }>(
    ({ name }, ref) => {
      React.useImperativeHandle(
        ref,
        () => ({
          greet() {
            return `Hello ${name}`;
          },
        }),
        [name],
      );
      return null;
    },
  );

  it("should work with object style refs", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    const ref = React.createRef<ImperativeHandle>();

    await act(() => {
      root.render(<ImperativeHandleComponent name="Alice" ref={ref} />);
    });
    expect(ref.current!.greet()).toBe("Hello Alice");
    await act(() => {
      root.render(null);
    });
    expect(ref.current).toBe(null);
  });

  it("should work with callback style refs", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    let current: ImperativeHandle | null = null;

    await act(() => {
      root.render(
        <ImperativeHandleComponent
          name="Alice"
          ref={(handle) => {
            current = handle;
          }}
        />,
      );
    });
    expect(current!.greet()).toBe("Hello Alice");
    await act(() => {
      root.render(null);
    });
    expect(current).toBe(null);
  });

  it("should work with callback style refs with cleanup function", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    let cleanupCalls = 0;
    let createCalls = 0;
    let current: ImperativeHandle | null = null;

    const ref = (handle: ImperativeHandle | null) => {
      current = handle;
      createCalls++;
      return () => {
        current = null;
        cleanupCalls++;
      };
    };

    await act(() => {
      root.render(<ImperativeHandleComponent name="Alice" ref={ref} />);
    });
    expect(current!.greet()).toBe("Hello Alice");
    expect(createCalls).toBe(1);
    expect(cleanupCalls).toBe(0);

    await act(() => {
      root.render(<ImperativeHandleComponent name="Bob" ref={ref} />);
    });
    expect(current!.greet()).toBe("Hello Bob");
    expect(createCalls).toBe(2);
    expect(cleanupCalls).toBe(1);

    await act(() => {
      root.render(null);
    });
    expect(current).toBe(null);
    expect(createCalls).toBe(2);
    expect(cleanupCalls).toBe(2);
  });
});
