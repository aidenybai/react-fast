import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect } from "vitest";
import { act } from "./utils";

describe("ReactComponent", () => {
  it("should throw when children are mutated during render", async () => {
    const Wrapper = (props: any) => {
      props.children[1] = <p key={1} />;
      return <div>{props.children}</div>;
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(
          <Wrapper>
            <span key={0} />
            <span key={1} />
            <span key={2} />
          </Wrapper>,
        );
      });
    }).rejects.toThrowError(/Cannot assign to read only property/);
  });

  it("should throw when children are mutated during update", async () => {
    class Wrapper extends React.Component<{ children: React.ReactNode }> {
      componentDidMount() {
        (this.props as any).children[1] = <p key={1} />;
        this.forceUpdate();
      }
      render() {
        return <div>{this.props.children}</div>;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(
          <Wrapper>
            <span key={0} />
            <span key={1} />
            <span key={2} />
          </Wrapper>,
        );
      });
    }).rejects.toThrowError(/Cannot assign to read only property/);
  });

  it("should not have refs for elements that are not rendered", async () => {
    let refValue: HTMLDivElement | null = null;

    class Child extends React.Component<{ children?: React.ReactNode }> {
      render() {
        return <div />;
      }
    }

    let didMount = false;

    class Parent extends React.Component {
      render() {
        return (
          <Child>
            <div
              ref={(element) => {
                refValue = element;
              }}
            />
          </Child>
        );
      }
      componentDidMount() {
        expect(refValue).toEqual(null);
        didMount = true;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });
    expect(didMount).toBe(true);
  });

  it("should support callback-style refs", async () => {
    const innerObj = {};
    const outerObj = {};

    class Wrapper extends React.Component<{
      object: object;
      children?: React.ReactNode;
    }> {
      getObject = () => {
        return this.props.object;
      };
      render() {
        return <div>{this.props.children}</div>;
      }
    }

    let didMount = false;

    class Component extends React.Component {
      innerRef: Wrapper | null = null;
      outerRef: Wrapper | null = null;

      render() {
        const inner = (
          <Wrapper
            object={innerObj}
            ref={(instance) => {
              this.innerRef = instance;
            }}
          />
        );
        const outer = (
          <Wrapper
            object={outerObj}
            ref={(instance) => {
              this.outerRef = instance;
            }}
          >
            {inner}
          </Wrapper>
        );
        return outer;
      }
      componentDidMount() {
        expect(this.innerRef!.getObject()).toEqual(innerObj);
        expect(this.outerRef!.getObject()).toEqual(outerObj);
        didMount = true;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });
    expect(didMount).toBe(true);
  });

  it("should support object-style refs", async () => {
    const innerObj = {};
    const outerObj = {};

    class Wrapper extends React.Component<{
      object: object;
      children?: React.ReactNode;
    }> {
      getObject = () => {
        return this.props.object;
      };
      render() {
        return <div>{this.props.children}</div>;
      }
    }

    let didMount = false;

    class Component extends React.Component {
      innerRef = React.createRef<Wrapper>();
      outerRef = React.createRef<Wrapper>();

      render() {
        const inner = <Wrapper object={innerObj} ref={this.innerRef} />;
        const outer = (
          <Wrapper object={outerObj} ref={this.outerRef}>
            {inner}
          </Wrapper>
        );
        return outer;
      }
      componentDidMount() {
        expect(this.innerRef.current!.getObject()).toEqual(innerObj);
        expect(this.outerRef.current!.getObject()).toEqual(outerObj);
        didMount = true;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });
    expect(didMount).toBe(true);
  });

  it("should support new-style refs with mixed-up owners", async () => {
    class Wrapper extends React.Component<{
      title: string;
      getContent: () => React.ReactNode;
    }> {
      getTitle = () => {
        return this.props.title;
      };
      render() {
        return this.props.getContent();
      }
    }

    let didMount = false;

    class Component extends React.Component {
      innerRef: HTMLDivElement | null = null;
      wrapperRef: Wrapper | null = null;

      getInner = () => {
        return (
          <div
            className="inner"
            ref={(element) => {
              this.innerRef = element;
            }}
          />
        );
      };

      render() {
        return (
          <Wrapper
            title="wrapper"
            ref={(instance) => {
              this.wrapperRef = instance;
            }}
            getContent={this.getInner}
          />
        );
      }
      componentDidMount() {
        expect(this.wrapperRef!.getTitle()).toBe("wrapper");
        expect(this.innerRef!.className).toBe("inner");
        didMount = true;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });
    expect(didMount).toBe(true);
  });

  it("should call refs at the correct time", async () => {
    const refLog: string[] = [];

    class Inner extends React.Component<{ id: number }> {
      render() {
        refLog.push(`inner ${this.props.id} render`);
        return <div />;
      }
      componentDidMount() {
        refLog.push(`inner ${this.props.id} componentDidMount`);
      }
      componentDidUpdate() {
        refLog.push(`inner ${this.props.id} componentDidUpdate`);
      }
      componentWillUnmount() {
        refLog.push(`inner ${this.props.id} componentWillUnmount`);
      }
    }

    class Outer extends React.Component {
      render() {
        return (
          <div>
            <Inner
              id={1}
              ref={(instance) => {
                refLog.push(`ref 1 got ${instance ? `instance ${instance.props.id}` : "null"}`);
              }}
            />
            <Inner
              id={2}
              ref={(instance) => {
                refLog.push(`ref 2 got ${instance ? `instance ${instance.props.id}` : "null"}`);
              }}
            />
          </div>
        );
      }
      componentDidMount() {
        refLog.push("outer componentDidMount");
      }
      componentDidUpdate() {
        refLog.push("outer componentDidUpdate");
      }
      componentWillUnmount() {
        refLog.push("outer componentWillUnmount");
      }
    }

    const element = document.createElement("div");
    refLog.push("start mount");
    const root = ReactDOMClient.createRoot(element);
    await act(() => {
      root.render(<Outer />);
    });
    refLog.push("start update");
    await act(() => {
      root.render(<Outer />);
    });
    refLog.push("start unmount");
    await act(() => {
      root.unmount();
    });

    expect(refLog).toEqual([
      "start mount",
      "inner 1 render",
      "inner 2 render",
      "inner 1 componentDidMount",
      "ref 1 got instance 1",
      "inner 2 componentDidMount",
      "ref 2 got instance 2",
      "outer componentDidMount",
      "start update",
      "inner 1 render",
      "inner 2 render",
      "ref 1 got null",
      "ref 2 got null",
      "inner 1 componentDidUpdate",
      "ref 1 got instance 1",
      "inner 2 componentDidUpdate",
      "ref 2 got instance 2",
      "outer componentDidUpdate",
      "start unmount",
      "outer componentWillUnmount",
      "ref 1 got null",
      "inner 1 componentWillUnmount",
      "ref 2 got null",
      "inner 2 componentWillUnmount",
    ]);
  });

  it("throws usefully when rendering badly-typed elements", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    const Undefined = undefined as any;
    await expect(async () => {
      await act(() => {
        root.render(<Undefined />);
      });
    }).rejects.toThrowError(/Element type is invalid/);

    const Null = null as any;
    await expect(async () => {
      await act(() => {
        root.render(<Null />);
      });
    }).rejects.toThrowError(/Element type is invalid/);

    const TrueValue = true as any;
    await expect(async () => {
      await act(() => {
        root.render(<TrueValue />);
      });
    }).rejects.toThrowError(/Element type is invalid/);
  });

  it("includes owner name in the error about badly-typed elements", async () => {
    const Undefined = undefined as any;

    const Indirection = (props: { children: React.ReactNode }) => {
      return <div>{props.children}</div>;
    };

    const Bar = () => {
      return (
        <Indirection>
          <Undefined />
        </Indirection>
      );
    };

    const Foo = () => {
      return <Bar />;
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(<Foo />);
      });
    }).rejects.toThrowError(/Element type is invalid/);
  });

  it("throws if a plain object is used as a child", async () => {
    const children = {
      x: <span />,
      y: <span />,
      z: <span />,
    };
    const element = <div>{[children] as any}</div>;
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(element);
      });
    }).rejects.toThrowError(/Objects are not valid as a React child/);
  });

  it("throws if a legacy element is used as a child", async () => {
    const inlinedElement = {
      $$typeof: Symbol.for("react.element"),
      type: "div",
      key: null,
      ref: null,
      props: {},
      _owner: null,
    };
    const element = <div>{[inlinedElement] as any}</div>;
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(element);
      });
    }).rejects.toThrowError(/A React Element from an older version of React was rendered/);
  });

  it("throws if a plain object even if it is in an owner", async () => {
    class Foo extends React.Component {
      render() {
        const children = {
          a: <span />,
          b: <span />,
          c: <span />,
        };
        return <div>{[children] as any}</div>;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(<Foo />);
      });
    }).rejects.toThrowError(/Objects are not valid as a React child/);
  });

  describe("with new features", () => {
    it("warns on function as a return value from a function", async () => {
      const Foo = (): any => {
        return Foo;
      };
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Foo />);
      });
    });

    it("warns on function as a return value from a class", async () => {
      class Foo extends React.Component {
        render(): any {
          return Foo;
        }
      }
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Foo />);
      });
    });

    it("warns on function as a child to host component", async () => {
      const Foo = () => {
        return (
          <div>
            <span>{Foo as any}</span>
          </div>
        );
      };
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Foo />);
      });
    });

    it("does not warn for function-as-a-child that gets resolved", async () => {
      const Bar = (props: { children: () => string }) => {
        return <>{props.children()}</>;
      };
      const Foo = () => {
        return <Bar>{() => "Hello"}</Bar>;
      };
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Foo />);
      });
      expect(container.innerHTML).toBe("Hello");
    });

    it("deduplicates function type warnings based on component type", async () => {
      class Foo extends React.PureComponent<object, { type: string }> {
        state = { type: "mushrooms" };
        render() {
          return (
            <div>
              {Foo as any}
              {Foo as any}
              <span>
                {Foo as any}
                {Foo as any}
              </span>
            </div>
          );
        }
      }

      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      let componentInstance: Foo | null = null;
      await act(() => {
        root.render(
          <Foo
            ref={(instance) => {
              componentInstance = instance;
            }}
          />,
        );
      });
      await act(() => {
        componentInstance!.setState({ type: "portobello mushrooms" });
      });
    });
  });
});
