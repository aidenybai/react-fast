import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect, vi } from "vitest";
import { act } from "./utils";

describe("ReactMultiChild", () => {
  describe("reconciliation", () => {
    it("should update children when possible", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      const mockMount = vi.fn();
      const mockUpdate = vi.fn();
      const mockUnmount = vi.fn();

      class MockComponent extends React.Component {
        componentDidMount = mockMount;
        componentDidUpdate = mockUpdate;
        componentWillUnmount = mockUnmount;
        render() {
          return <span />;
        }
      }

      expect(mockMount).toHaveBeenCalledTimes(0);
      expect(mockUpdate).toHaveBeenCalledTimes(0);
      expect(mockUnmount).toHaveBeenCalledTimes(0);

      await act(() => {
        root.render(
          <div>
            <MockComponent />
          </div>,
        );
      });

      expect(mockMount).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledTimes(0);
      expect(mockUnmount).toHaveBeenCalledTimes(0);

      await act(() => {
        root.render(
          <div>
            <MockComponent />
          </div>,
        );
      });

      expect(mockMount).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUnmount).toHaveBeenCalledTimes(0);
    });

    it("should replace children with different constructors", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      const mockMount = vi.fn();
      const mockUnmount = vi.fn();

      class MockComponent extends React.Component {
        componentDidMount = mockMount;
        componentWillUnmount = mockUnmount;
        render() {
          return <span />;
        }
      }

      expect(mockMount).toHaveBeenCalledTimes(0);
      expect(mockUnmount).toHaveBeenCalledTimes(0);

      await act(() => {
        root.render(
          <div>
            <MockComponent />
          </div>,
        );
      });

      expect(mockMount).toHaveBeenCalledTimes(1);
      expect(mockUnmount).toHaveBeenCalledTimes(0);

      await act(() => {
        root.render(
          <div>
            <span />
          </div>,
        );
      });

      expect(mockMount).toHaveBeenCalledTimes(1);
      expect(mockUnmount).toHaveBeenCalledTimes(1);
    });

    it("should NOT replace children with different owners", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      const mockMount = vi.fn();
      const mockUnmount = vi.fn();

      class MockComponent extends React.Component {
        componentDidMount = mockMount;
        componentWillUnmount = mockUnmount;
        render() {
          return <span />;
        }
      }

      class WrapperComponent extends React.Component<{ children?: React.ReactNode }> {
        render() {
          return this.props.children || <MockComponent />;
        }
      }

      expect(mockMount).toHaveBeenCalledTimes(0);
      expect(mockUnmount).toHaveBeenCalledTimes(0);

      await act(() => {
        root.render(<WrapperComponent />);
      });

      expect(mockMount).toHaveBeenCalledTimes(1);
      expect(mockUnmount).toHaveBeenCalledTimes(0);

      await act(() => {
        root.render(
          <WrapperComponent>
            <MockComponent />
          </WrapperComponent>,
        );
      });

      expect(mockMount).toHaveBeenCalledTimes(1);
      expect(mockUnmount).toHaveBeenCalledTimes(0);
    });

    it("should replace children with different keys", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      const mockMount = vi.fn();
      const mockUnmount = vi.fn();

      class MockComponent extends React.Component {
        componentDidMount = mockMount;
        componentWillUnmount = mockUnmount;
        render() {
          return <span />;
        }
      }

      expect(mockMount).toHaveBeenCalledTimes(0);
      expect(mockUnmount).toHaveBeenCalledTimes(0);

      await act(() => {
        root.render(
          <div>
            <MockComponent key="A" />
          </div>,
        );
      });

      expect(mockMount).toHaveBeenCalledTimes(1);
      expect(mockUnmount).toHaveBeenCalledTimes(0);

      await act(() => {
        root.render(
          <div>
            <MockComponent key="B" />
          </div>,
        );
      });

      expect(mockMount).toHaveBeenCalledTimes(2);
      expect(mockUnmount).toHaveBeenCalledTimes(1);
    });

    it("should warn for duplicated array keys with component stack info", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      class WrapperComponent extends React.Component<{ children?: React.ReactNode }> {
        render() {
          return <div>{this.props.children}</div>;
        }
      }

      class Parent extends React.Component<{ children?: React.ReactNode }> {
        render() {
          return (
            <div>
              <WrapperComponent>{this.props.children}</WrapperComponent>
            </div>
          );
        }
      }

      await act(() => {
        root.render(<Parent>{[<div key="1" />]}</Parent>);
      });

      await act(() => {
        root.render(<Parent>{[<div key="1" />, <div key="1" />]}</Parent>);
      });
    });

    it("should warn for duplicated iterable keys with component stack info", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      class WrapperComponent extends React.Component<{ children?: React.ReactNode }> {
        render() {
          return <div>{this.props.children}</div>;
        }
      }

      class Parent extends React.Component<{ children?: React.ReactNode }> {
        render() {
          return (
            <div>
              <WrapperComponent>{this.props.children}</WrapperComponent>
            </div>
          );
        }
      }

      const createIterable = (array: React.ReactNode[]) => ({
        "@@iterator": function () {
          let index = 0;
          return {
            next() {
              const next = {
                value: index < array.length ? array[index] : undefined,
                done: index === array.length,
              };
              index++;
              return next;
            },
          };
        },
      });

      await act(() => {
        root.render(
          <Parent>{createIterable([<div key="1" />]) as unknown as React.ReactNode}</Parent>,
        );
      });

      await act(() => {
        root.render(
          <Parent>
            {createIterable([<div key="1" />, <div key="1" />]) as unknown as React.ReactNode}
          </Parent>,
        );
      });
    });
  });

  it("should warn for using maps as children with owner info", async () => {
    class Parent extends React.Component {
      render() {
        return (
          <div>
            {
              new Map([
                ["foo", 0],
                ["bar", 1],
              ]) as unknown as React.ReactNode
            }
          </div>
        );
      }
    }
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });
  });

  it("should NOT warn for using generator functions as components", async () => {
    function* Foo() {
      yield <h1 key="1">Hello</h1>;
      yield <h1 key="2">World</h1>;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Foo />);
    });

    expect(container.textContent).toBe("HelloWorld");
  });

  it("should warn for using generators as children props", async () => {
    function* getChildren() {
      yield <h1 key="1">Hello</h1>;
      yield <h1 key="2">World</h1>;
    }

    const Foo = () => {
      const children = getChildren();
      return <div>{children as unknown as React.ReactNode}</div>;
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Foo />);
    });

    expect(container.textContent).toBe("HelloWorld");

    await act(() => {
      root.render(<Foo />);
    });
  });

  it("should warn for using other types of iterators as children", async () => {
    const Foo = () => {
      let iteratorIndex = 0;
      const iterator = {
        [Symbol.iterator]() {
          return iterator;
        },
        next() {
          switch (iteratorIndex++) {
            case 0:
              return { done: false, value: <h1 key="1">Hello</h1> };
            case 1:
              return { done: false, value: <h1 key="2">World</h1> };
            default:
              return { done: true, value: undefined };
          }
        },
      };
      return iterator as unknown as React.ReactNode;
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Foo />);
    });

    expect(container.textContent).toBe("HelloWorld");

    await act(() => {
      root.render(<Foo />);
    });
  });

  it("should not warn for using generators in legacy iterables", async () => {
    const fooIterable = {
      "@@iterator": function* () {
        yield <h1 key="1">Hello</h1>;
        yield <h1 key="2">World</h1>;
      },
    };

    const Foo = () => {
      return fooIterable as unknown as React.ReactNode;
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Foo />);
    });
    expect(container.textContent).toBe("HelloWorld");

    await act(() => {
      root.render(<Foo />);
    });
    expect(container.textContent).toBe("HelloWorld");
  });

  it("should not warn for using generators in modern iterables", async () => {
    const fooIterable = {
      [Symbol.iterator]: function* () {
        yield <h1 key="1">Hello</h1>;
        yield <h1 key="2">World</h1>;
      },
    };

    const Foo = () => {
      return fooIterable as unknown as React.ReactNode;
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Foo />);
    });
    expect(container.textContent).toBe("HelloWorld");

    await act(() => {
      root.render(<Foo />);
    });
    expect(container.textContent).toBe("HelloWorld");
  });

  it("should reorder bailed-out children", async () => {
    class LetterInner extends React.Component<{ char: string }> {
      render() {
        return <div>{this.props.char}</div>;
      }
    }

    class Letter extends React.Component<{ char: string }> {
      render() {
        return <LetterInner char={this.props.char} />;
      }
      shouldComponentUpdate() {
        return false;
      }
    }

    class Letters extends React.Component<{ letters: string }> {
      render() {
        const letters = this.props.letters.split("");
        return (
          <div>
            {letters.map((characterItem) => (
              <Letter key={characterItem} char={characterItem} />
            ))}
          </div>
        );
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<Letters letters="XKwHomsNjIkBcQWFbiZU" />);
    });
    expect(container.textContent).toBe("XKwHomsNjIkBcQWFbiZU");

    await act(() => {
      root.render(<Letters letters="EHCjpdTUuiybDvhRJwZt" />);
    });
    expect(container.textContent).toBe("EHCjpdTUuiybDvhRJwZt");
  });

  it("prepares new children before unmounting old", async () => {
    const lifecycleLog: string[] = [];

    class Spy extends React.Component<{ name: string }> {
      UNSAFE_componentWillMount() {
        lifecycleLog.push(this.props.name + " componentWillMount");
      }
      render() {
        lifecycleLog.push(this.props.name + " render");
        return <div />;
      }
      componentDidMount() {
        lifecycleLog.push(this.props.name + " componentDidMount");
      }
      componentWillUnmount() {
        lifecycleLog.push(this.props.name + " componentWillUnmount");
      }
    }

    const SpyA = (props: { name: string }) => <Spy {...props} />;
    const SpyB = (props: { name: string }) => <Spy {...props} />;

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <div>
          <SpyA key="one" name="oneA" />
          <SpyA key="two" name="twoA" />
        </div>,
      );
    });
    await act(() => {
      root.render(
        <div>
          <SpyB key="one" name="oneB" />
          <SpyB key="two" name="twoB" />
        </div>,
      );
    });

    expect(lifecycleLog).toEqual([
      "oneA componentWillMount",
      "oneA render",
      "twoA componentWillMount",
      "twoA render",
      "oneA componentDidMount",
      "twoA componentDidMount",

      "oneB componentWillMount",
      "oneB render",
      "twoB componentWillMount",
      "twoB render",
      "oneA componentWillUnmount",
      "twoA componentWillUnmount",

      "oneB componentDidMount",
      "twoB componentDidMount",
    ]);
  });
});
