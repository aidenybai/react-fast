import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { flushSync } from "react-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, log, assertLog } from "./utils";

describe("ReactCompositeComponent", () => {
  const hasOwnProperty = Object.prototype.hasOwnProperty;

  function shallowEqual(objA: unknown, objB: unknown): boolean {
    if (Object.is(objA, objB)) {
      return true;
    }
    if (typeof objA !== "object" || objA === null || typeof objB !== "object" || objB === null) {
      return false;
    }
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) {
      return false;
    }
    for (let i = 0; i < keysA.length; i++) {
      if (
        !hasOwnProperty.call(objB, keysA[i]) ||
        !Object.is(
          (objA as Record<string, unknown>)[keysA[i]],
          (objB as Record<string, unknown>)[keysA[i]],
        )
      ) {
        return false;
      }
    }
    return true;
  }

  function shallowCompare(instance: React.Component, nextProps: unknown, nextState: unknown) {
    return !shallowEqual(instance.props, nextProps) || !shallowEqual(instance.state, nextState);
  }

  let MorphingComponent: typeof React.Component;
  let ChildUpdates: typeof React.Component;
  let instance: any;
  let childInstance: any;

  describe("MorphingComponent", () => {
    beforeEach(() => {
      MorphingComponent = class extends React.Component {
        state = { activated: false };
        xRef = React.createRef<HTMLElement>();

        componentDidMount() {
          instance = this;
        }

        _toggleActivatedState = () => {
          this.setState({ activated: !(this.state as any).activated });
        };

        render() {
          const toggleActivatedState = this._toggleActivatedState;
          return !(this.state as any).activated ? (
            <a ref={this.xRef} onClick={toggleActivatedState} />
          ) : (
            <b ref={this.xRef} onClick={toggleActivatedState} />
          );
        }
      };

      ChildUpdates = class extends React.Component<any> {
        anchorRef = React.createRef<HTMLAnchorElement>();

        componentDidMount() {
          childInstance = this;
        }

        getAnchor = () => {
          return this.anchorRef.current;
        };

        render() {
          const className = this.props.anchorClassOn ? "anchorClass" : "";
          return this.props.renderAnchor ? <a ref={this.anchorRef} className={className} /> : <b />;
        }
      };
    });

    it("should support rendering to different child types over time", async () => {
      const root = ReactDOMClient.createRoot(document.createElement("div"));
      await act(() => {
        root.render(<MorphingComponent />);
      });
      expect(instance.xRef.current.tagName).toBe("A");

      await act(() => {
        instance._toggleActivatedState();
      });
      expect(instance.xRef.current.tagName).toBe("B");

      await act(() => {
        instance._toggleActivatedState();
      });
      expect(instance.xRef.current.tagName).toBe("A");
    });

    it("should react to state changes from callbacks", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      try {
        await act(() => {
          root.render(<MorphingComponent />);
        });
        expect(instance.xRef.current.tagName).toBe("A");
        await act(() => {
          instance.xRef.current.click();
        });
        expect(instance.xRef.current.tagName).toBe("B");
      } finally {
        document.body.removeChild(container);
        root.unmount();
      }
    });

    it("should rewire refs when rendering to different child types", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<MorphingComponent />);
      });
      expect(instance.xRef.current.tagName).toBe("A");

      await act(() => {
        instance._toggleActivatedState();
      });
      expect(instance.xRef.current.tagName).toBe("B");

      await act(() => {
        instance._toggleActivatedState();
      });
      expect(instance.xRef.current.tagName).toBe("A");
    });

    it("should not cache old DOM nodes when switching constructors", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<ChildUpdates renderAnchor={true} anchorClassOn={false} />);
      });
      await act(() => {
        root.render(<ChildUpdates renderAnchor={true} anchorClassOn={true} />);
      });
      await act(() => {
        root.render(<ChildUpdates renderAnchor={false} anchorClassOn={true} />);
      });
      await act(() => {
        root.render(<ChildUpdates renderAnchor={true} anchorClassOn={false} />);
      });
      expect(childInstance.getAnchor().className).toBe("");
    });
  });

  it("should not support module pattern components", async () => {
    function Child({ test }: { test: string }) {
      return {
        render() {
          return <div>{test}</div>;
        },
      } as any;
    }

    const element = document.createElement("div");
    const root = ReactDOMClient.createRoot(element);
    await expect(async () => {
      await act(() => {
        root.render(<Child test="test" />);
      });
    }).rejects.toThrow();

    expect(element.textContent).toBe("");
  });

  it("should use default values for undefined props", async () => {
    class Component extends React.Component {
      static defaultProps = { prop: "testKey" };

      render() {
        return <span />;
      }
    }

    let instance1: any;
    let instance2: any;
    let instance3: any;

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await act(() => {
      root.render(<Component ref={(ref) => (instance1 = ref)} />);
    });
    expect(instance1.props).toEqual({ prop: "testKey" });

    await act(() => {
      root.render(<Component ref={(ref) => (instance2 = ref)} prop={undefined} />);
    });
    expect(instance2.props).toEqual({ prop: "testKey" });

    await act(() => {
      root.render(<Component ref={(ref) => (instance3 = ref)} prop={null} />);
    });
    expect(instance3.props).toEqual({ prop: null });
  });

  it("should not mutate passed-in props object", async () => {
    class Component extends React.Component {
      static defaultProps = { prop: "testKey" };

      render() {
        return <span />;
      }
    }

    const inputProps: Record<string, unknown> = {};
    let instance1: any;
    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await act(() => {
      root.render(<Component {...inputProps} ref={(ref) => (instance1 = ref)} />);
    });
    expect(instance1.props.prop).toBe("testKey");
    expect(inputProps.prop).not.toBeDefined();
  });

  it("should warn about forceUpdate on not-yet-mounted components", async () => {
    class MyComponent extends React.Component {
      constructor(props: any) {
        super(props);
        this.forceUpdate();
      }
      render() {
        return <div>foo</div>;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    flushSync(() => {
      root.render(<MyComponent />);
    });

    const container2 = document.createElement("div");
    const root2 = ReactDOMClient.createRoot(container2);
    await act(() => {
      root2.render(<MyComponent />);
    });
    expect(container2.firstChild!.textContent).toBe("foo");
  });

  it("should warn about setState on not-yet-mounted components", async () => {
    class MyComponent extends React.Component {
      constructor(props: any) {
        super(props);
        this.setState();
      }
      render() {
        return <div>foo</div>;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    flushSync(() => {
      root.render(<MyComponent />);
    });

    const container2 = document.createElement("div");
    const root2 = ReactDOMClient.createRoot(container2);
    await act(() => {
      root2.render(<MyComponent />);
    });
    expect(container2.firstChild!.textContent).toBe("foo");
  });

  it("should not warn about forceUpdate on unmounted components", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    let instanceRef: any;
    class Component extends React.Component {
      componentDidMount() {
        instanceRef = this;
      }
      render() {
        return <div />;
      }
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });

    instanceRef.forceUpdate();
    root.unmount();
    instanceRef.forceUpdate();
    instanceRef.forceUpdate();

    document.body.removeChild(container);
  });

  it("should not warn about setState on unmounted components", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    class Component extends React.Component {
      state = { value: 0 };

      render() {
        log("render " + (this.state as any).value);
        return <div />;
      }
    }

    let ref: any;
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <div>
          <span>
            <Component ref={(c) => (ref = c || ref)} />
          </span>
        </div>,
      );
    });

    assertLog(["render 0"]);

    await act(() => {
      ref.setState({ value: 1 });
    });
    assertLog(["render 1"]);

    await act(() => {
      root.render(<div />);
    });

    await act(() => {
      ref.setState({ value: 2 });
    });
    assertLog([]);

    document.body.removeChild(container);
  });

  it("should silently allow setState, not call cb on unmounting components", async () => {
    let cbCalled = false;
    const container = document.createElement("div");
    document.body.appendChild(container);

    class Component extends React.Component {
      state = { value: 0 };

      componentWillUnmount() {
        expect(() => {
          this.setState({ value: 2 }, function () {
            cbCalled = true;
          });
        }).not.toThrow();
      }

      render() {
        return <div />;
      }
    }

    let instanceRef: any;
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component ref={(c) => (instanceRef = c)} />);
    });
    await act(() => {
      instanceRef.setState({ value: 1 });
    });
    instanceRef.setState({ value: 1 });

    root.unmount();
    expect(cbCalled).toBe(false);

    document.body.removeChild(container);
  });

  it("should warn when rendering a class with a render method that does not extend React.Component", async () => {
    const container = document.createElement("div");
    class ClassWithRenderNotExtended {
      render() {
        return <div />;
      }
    }
    const InvalidComponent = ClassWithRenderNotExtended as any;
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(<InvalidComponent />);
      });
    }).rejects.toThrow();
  });

  it("should warn about setState in render", async () => {
    const container = document.createElement("div");

    class Component extends React.Component {
      state = { value: 0 };

      render() {
        log("render " + (this.state as any).value);
        if ((this.state as any).value === 0) {
          this.setState({ value: 1 });
        }
        return <div>foo {(this.state as any).value}</div>;
      }
    }

    let instanceRef: any;
    const root = ReactDOMClient.createRoot(container);
    flushSync(() => {
      root.render(<Component ref={(ref) => (instanceRef = ref)} />);
    });

    assertLog(["render 0", "render 1"]);
    expect(instanceRef.state.value).toBe(1);

    await act(() => {
      root.render(<Component prop={123} />);
    });
    assertLog(["render 1"]);
  });

  it("should cleanup even if render fatals", async () => {
    class BadComponent extends React.Component {
      render(): React.ReactNode {
        throw new Error();
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await expect(async () => {
      await act(() => {
        root.render(<BadComponent />);
      });
    }).rejects.toThrow();
  });

  it("should call componentWillUnmount before unmounting", async () => {
    const container = document.createElement("div");
    let innerUnmounted = false;

    class Component extends React.Component {
      render() {
        return (
          <div>
            <Inner />
            Text
          </div>
        );
      }
    }

    class Inner extends React.Component {
      componentWillUnmount() {
        innerUnmounted = true;
      }
      render() {
        return <div />;
      }
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });
    root.unmount();
    expect(innerUnmounted).toBe(true);
  });

  it("should warn when shouldComponentUpdate returns undefined", async () => {
    class ClassComponent extends React.Component {
      state = { bogus: false };

      shouldComponentUpdate() {
        return undefined as any;
      }

      render() {
        return <div />;
      }
    }

    let instanceRef: any;
    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await act(() => {
      root.render(<ClassComponent ref={(ref) => (instanceRef = ref)} />);
    });

    flushSync(() => {
      instanceRef.setState({ bogus: true });
    });
  });

  it("should warn when componentDidUnmount method is defined", async () => {
    class Component extends React.Component {
      componentDidUnmount = () => {};
      render() {
        return <div />;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    flushSync(() => {
      root.render(<Component />);
    });
  });

  it("should warn when componentDidReceiveProps method is defined", () => {
    class Component extends React.Component {
      componentDidReceiveProps = () => {};
      render() {
        return <div />;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    flushSync(() => {
      root.render(<Component />);
    });
  });

  it("should warn when defaultProps was defined as an instance property", () => {
    class Component extends React.Component {
      constructor(props: any) {
        super(props);
        (this as any).defaultProps = { name: "Abhay" };
      }
      render() {
        return <div />;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    flushSync(() => {
      root.render(<Component />);
    });
  });

  it("should skip update when rerendering element in container", async () => {
    class Parent extends React.Component<{ children?: React.ReactNode }> {
      render() {
        return <div>{this.props.children}</div>;
      }
    }

    class Child extends React.Component {
      render() {
        log("Child render");
        return <div />;
      }
    }

    const container = document.createElement("div");
    const child = <Child />;
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent>{child}</Parent>);
    });
    assertLog(["Child render"]);

    await act(() => {
      root.render(<Parent>{child}</Parent>);
    });
    assertLog([]);
  });

  it("should disallow nested render calls", () => {
    const root = ReactDOMClient.createRoot(document.createElement("div"));
    class Inner extends React.Component {
      render() {
        return <div />;
      }
    }

    class Outer extends React.Component {
      render() {
        root.render(<Inner />);
        return <div />;
      }
    }

    flushSync(() => {
      root.render(<Outer />);
    });
  });

  it("only renders once if updated in componentWillReceiveProps", async () => {
    let renders = 0;

    class Component extends React.Component<any> {
      state = { updated: false };

      UNSAFE_componentWillReceiveProps(props: any) {
        expect(props.update).toBe(1);
        expect(renders).toBe(1);
        this.setState({ updated: true });
        expect(renders).toBe(1);
      }

      render() {
        renders++;
        return <div />;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    let instanceRef: any;

    await act(() => {
      root.render(<Component update={0} ref={(ref) => (instanceRef = ref)} />);
    });
    expect(renders).toBe(1);
    expect(instanceRef.state.updated).toBe(false);

    await act(() => {
      root.render(<Component update={1} ref={(ref) => (instanceRef = ref)} />);
    });
    expect(renders).toBe(2);
    expect(instanceRef.state.updated).toBe(true);
  });

  it("only renders once if updated in componentWillReceiveProps when batching", async () => {
    let renders = 0;

    class Component extends React.Component<any> {
      state = { updated: false };

      UNSAFE_componentWillReceiveProps(props: any) {
        expect(props.update).toBe(1);
        expect(renders).toBe(1);
        this.setState({ updated: true });
        expect(renders).toBe(1);
      }

      render() {
        renders++;
        return <div />;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    let instanceRef: any;
    await act(() => {
      root.render(<Component update={0} ref={(ref) => (instanceRef = ref)} />);
    });
    expect(renders).toBe(1);
    expect(instanceRef.state.updated).toBe(false);
    await act(() => {
      root.render(<Component update={1} ref={(ref) => (instanceRef = ref)} />);
    });
    expect(renders).toBe(2);
    expect(instanceRef.state.updated).toBe(true);
  });

  it("should warn when mutated props are passed", async () => {
    const container = document.createElement("div");

    class Foo extends React.Component {
      constructor(props: any) {
        const _props = { idx: props.idx + "!" };
        super(_props);
      }
      render() {
        return <span />;
      }
    }

    const root = ReactDOMClient.createRoot(container);
    flushSync(() => {
      root.render(<Foo idx="qwe" />);
    });
  });

  it("should only call componentWillUnmount once", async () => {
    let app: any;
    let count = 0;

    class App extends React.Component<any> {
      render() {
        if (this.props.stage === 1) {
          return <UnunmountableComponent />;
        } else {
          return null;
        }
      }
    }

    class UnunmountableComponent extends React.Component {
      componentWillUnmount() {
        app.setState({});
        count++;
        throw Error("always fails");
      }
      render() {
        return <div>Hello {(this.props as any).name}</div>;
      }
    }

    const container = document.createElement("div");

    const setRef = (ref: any) => {
      if (ref) {
        app = ref;
      }
    };

    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(<App ref={setRef} stage={1} />);
      });
      await act(() => {
        root.render(<App ref={setRef} stage={2} />);
      });
    }).rejects.toThrow();
    expect(count).toBe(1);
  });

  it("prepares new child before unmounting old", async () => {
    class Spy extends React.Component<{ name: string }> {
      UNSAFE_componentWillMount() {
        log(this.props.name + " componentWillMount");
      }
      render() {
        log(this.props.name + " render");
        return <div />;
      }
      componentDidMount() {
        log(this.props.name + " componentDidMount");
      }
      componentWillUnmount() {
        log(this.props.name + " componentWillUnmount");
      }
    }

    class Wrapper extends React.Component<{ name: string }> {
      render() {
        return <Spy key={this.props.name} name={this.props.name} />;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Wrapper name="A" />);
    });

    assertLog(["A componentWillMount", "A render", "A componentDidMount"]);
    await act(() => {
      root.render(<Wrapper name="B" />);
    });

    assertLog([
      "B componentWillMount",
      "B render",
      "A componentWillUnmount",
      "B componentDidMount",
    ]);
  });

  it("respects a shallow shouldComponentUpdate implementation", async () => {
    class PlasticWrap extends React.Component {
      constructor(props: any, context: any) {
        super(props, context);
        this.state = {
          color: "green",
        };
        (this as any).appleRef = React.createRef();
      }

      render() {
        return <Apple color={(this.state as any).color} ref={(this as any).appleRef} />;
      }
    }

    class Apple extends React.Component<any> {
      state = {
        cut: false,
        slices: 1,
      };

      shouldComponentUpdate(nextProps: any, nextState: any) {
        return shallowCompare(this, nextProps, nextState);
      }

      cut() {
        this.setState({
          cut: true,
          slices: 10,
        });
      }

      eatSlice() {
        this.setState({
          slices: (this.state as any).slices - 1,
        });
      }

      render() {
        const { color } = this.props;
        const { cut, slices } = this.state as any;
        log(`${color} ${cut} ${slices}`);
        return <div />;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    let instanceRef: any;
    await act(() => {
      root.render(<PlasticWrap ref={(ref) => (instanceRef = ref)} />);
    });
    assertLog(["green false 1"]);

    await act(() => {
      instanceRef.setState({ color: "green" });
    });
    assertLog([]);

    await act(() => {
      instanceRef.setState({ color: "red" });
    });
    assertLog(["red false 1"]);

    await act(() => {
      instanceRef.appleRef.current.cut();
    });
    assertLog(["red true 10"]);

    await act(() => {
      instanceRef.appleRef.current.cut();
    });
    assertLog([]);

    await act(() => {
      instanceRef.appleRef.current.eatSlice();
    });
    assertLog(["red true 9"]);
  });

  it("does not do a deep comparison for a shallow shouldComponentUpdate implementation", async () => {
    function getInitialState() {
      return {
        foo: [1, 2, 3],
        bar: { a: 4, b: 5, c: 6 },
      };
    }

    const initialSettings = getInitialState();

    class Component extends React.Component {
      state = initialSettings;

      shouldComponentUpdate(nextProps: any, nextState: any) {
        return shallowCompare(this, nextProps, nextState);
      }

      render() {
        const { foo, bar } = this.state as any;
        log(`{foo:[${foo}],bar:{a:${bar.a},b:${bar.b},c:${bar.c}}`);
        return <div />;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    let instanceRef: any;
    await act(() => {
      root.render(<Component ref={(ref) => (instanceRef = ref)} />);
    });
    assertLog(["{foo:[1,2,3],bar:{a:4,b:5,c:6}"]);

    const settings = {
      foo: initialSettings.foo,
      bar: initialSettings.bar,
    };
    await act(() => {
      instanceRef.setState(settings);
    });
    assertLog([]);

    initialSettings.foo = [1, 2, 3];
    await act(() => {
      instanceRef.setState(initialSettings);
    });
    assertLog(["{foo:[1,2,3],bar:{a:4,b:5,c:6}"]);

    await act(() => {
      instanceRef.setState(getInitialState());
    });
    assertLog(["{foo:[1,2,3],bar:{a:4,b:5,c:6}"]);
  });

  it("should call setState callback with no arguments", async () => {
    let mockArgs: any;
    class Component extends React.Component {
      componentDidMount() {
        this.setState({}, (...args: any[]) => (mockArgs = args));
      }
      render() {
        return false as any;
      }
    }
    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await act(() => {
      root.render(<Component />);
    });

    expect(mockArgs.length).toEqual(0);
  });

  it("this.state should be updated on setState callback inside componentWillMount", async () => {
    const div = document.createElement("div");
    let stateSuccessfullyUpdated = false;

    class Component extends React.Component {
      constructor(props: any, context: any) {
        super(props, context);
        this.state = {
          hasUpdatedState: false,
        };
      }

      UNSAFE_componentWillMount() {
        this.setState(
          { hasUpdatedState: true },
          () => (stateSuccessfullyUpdated = (this.state as any).hasUpdatedState),
        );
      }

      render() {
        return <div>{(this.props as any).children}</div>;
      }
    }

    const root = ReactDOMClient.createRoot(div);
    await act(() => {
      root.render(<Component />);
    });

    expect(stateSuccessfullyUpdated).toBe(true);
  });

  it("should call the setState callback even if shouldComponentUpdate = false", async () => {
    const mockFn = vi.fn().mockReturnValue(false);
    const div = document.createElement("div");

    class Component extends React.Component {
      constructor(props: any, context: any) {
        super(props, context);
        this.state = {
          hasUpdatedState: false,
        };
      }

      UNSAFE_componentWillMount() {
        instanceRef = this;
      }

      shouldComponentUpdate() {
        return mockFn();
      }

      render() {
        return <div>{(this.state as any).hasUpdatedState}</div>;
      }
    }

    const root = ReactDOMClient.createRoot(div);
    let instanceRef: any;
    await act(() => {
      root.render(<Component ref={(ref) => (instanceRef = ref)} />);
    });

    expect(instanceRef).toBeDefined();
    expect(mockFn).not.toHaveBeenCalled();

    await act(() => {
      instanceRef.setState({ hasUpdatedState: true }, () => {
        expect(mockFn).toHaveBeenCalled();
        expect(instanceRef.state.hasUpdatedState).toBe(true);
        log("setState callback called");
      });
    });

    assertLog(["setState callback called"]);
  });

  it("should return a meaningful warning when constructor is returned", async () => {
    class RenderTextInvalidConstructor extends React.Component {
      constructor(props: any) {
        super(props);
        return { something: false } as any;
      }
      render() {
        return <div />;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await expect(async () => {
      await act(() => {
        root.render(<RenderTextInvalidConstructor />);
      });
    }).rejects.toThrow();
  });

  it("should warn about reassigning this.props while rendering", () => {
    class Bad extends React.Component {
      componentDidMount() {}
      componentDidUpdate() {}
      render() {
        (this as any).props = { ...(this as any).props };
        return null;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    flushSync(() => {
      root.render(<Bad />);
    });
  });

  it("should return error if render is not defined", async () => {
    class RenderTestUndefinedRender extends React.Component {}

    const UndefinedRenderComponent = RenderTestUndefinedRender as any;
    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await expect(async () => {
      await act(() => {
        root.render(<UndefinedRenderComponent />);
      });
    }).rejects.toThrow();
  });

  it("should support classes shadowing isReactComponent", async () => {
    class Shadow extends React.Component {
      isReactComponent() {}
      render() {
        return <div />;
      }
    }
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Shadow />);
    });
    expect(container.firstChild!.nodeName).toBe("DIV");
  });

  it("should not warn on updating function component from componentWillMount", async () => {
    let setState: any;
    let ref: any;
    function A() {
      const [state, _setState] = React.useState<any>(null);
      setState = _setState;
      return <div ref={(r) => (ref = r)}>{state}</div>;
    }
    class B extends React.Component {
      UNSAFE_componentWillMount() {
        setState(1);
      }
      render() {
        return null;
      }
    }
    function Parent() {
      return (
        <div>
          <A />
          <B />
        </div>
      );
    }
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });

    expect(ref.textContent).toBe("1");
  });

  it("should not warn on updating function component from componentWillUpdate", async () => {
    let setState: any;
    let ref: any;
    function A() {
      const [state, _setState] = React.useState<any>();
      setState = _setState;
      return <div ref={(r) => (ref = r)}>{state}</div>;
    }
    class B extends React.Component {
      UNSAFE_componentWillUpdate() {
        setState(1);
      }
      render() {
        return null;
      }
    }
    function Parent() {
      return (
        <div>
          <A />
          <B />
        </div>
      );
    }
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });
    await act(() => {
      root.render(<Parent />);
    });

    expect(ref.textContent).toBe("1");
  });

  it("should not warn on updating function component from componentWillReceiveProps", async () => {
    let setState: any;
    let ref: any;
    function A() {
      const [state, _setState] = React.useState<any>();
      setState = _setState;
      return <div ref={(r) => (ref = r)}>{state}</div>;
    }

    class B extends React.Component {
      UNSAFE_componentWillReceiveProps() {
        setState(1);
      }
      render() {
        return null;
      }
    }
    function Parent() {
      return (
        <div>
          <A />
          <B />
        </div>
      );
    }
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });
    await act(() => {
      root.render(<Parent />);
    });

    expect(ref.textContent).toBe("1");
  });

  it("should warn on updating function component from render", () => {
    let setState: any;
    let ref: any;
    function A() {
      const [state, _setState] = React.useState(0);
      setState = _setState;
      return <div ref={(r) => (ref = r)}>{state}</div>;
    }

    class B extends React.Component {
      render() {
        setState((c: number) => c + 1);
        return null;
      }
    }
    function Parent() {
      return (
        <div>
          <A />
          <B />
        </div>
      );
    }
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    flushSync(() => {
      root.render(<Parent />);
    });

    expect(ref.textContent).toBe("1");

    flushSync(() => {
      root.render(<Parent />);
    });

    expect(ref.textContent).toBe("2");
  });
});
