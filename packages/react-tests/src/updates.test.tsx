import React from "react";
import ReactDOM from "react-dom";
import * as ReactDOMClient from "react-dom/client";
import { flushSync } from "react-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, log, assertLog } from "./utils";

describe("ReactUpdates", () => {
  it("should batch state when updating state twice", async () => {
    let componentState: number;
    let setState: React.Dispatch<React.SetStateAction<number>>;

    function Component() {
      const [state, _setState] = React.useState(0);
      componentState = state;
      setState = _setState;
      React.useLayoutEffect(() => {
        log("Commit");
      });
      return <div>{state}</div>;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });

    assertLog(["Commit"]);
    expect(container.firstChild!.textContent).toBe("0");

    await act(() => {
      setState(1);
      setState(2);
      expect(componentState!).toBe(0);
      expect(container.firstChild!.textContent).toBe("0");
      assertLog([]);
    });

    expect(componentState!).toBe(2);
    assertLog(["Commit"]);
    expect(container.firstChild!.textContent).toBe("2");
  });

  it("should batch state when updating two different states", async () => {
    let componentStateA: number;
    let componentStateB: number;
    let setStateA: React.Dispatch<React.SetStateAction<number>>;
    let setStateB: React.Dispatch<React.SetStateAction<number>>;

    function Component() {
      const [stateA, _setStateA] = React.useState(0);
      const [stateB, _setStateB] = React.useState(0);
      componentStateA = stateA;
      componentStateB = stateB;
      setStateA = _setStateA;
      setStateB = _setStateB;

      React.useLayoutEffect(() => {
        log("Commit");
      });

      return (
        <div>
          {stateA} {stateB}
        </div>
      );
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });

    assertLog(["Commit"]);
    expect(container.firstChild!.textContent).toBe("0 0");

    await act(() => {
      setStateA(1);
      setStateB(2);
      expect(componentStateA!).toBe(0);
      expect(componentStateB!).toBe(0);
      expect(container.firstChild!.textContent).toBe("0 0");
      assertLog([]);
    });

    expect(componentStateA!).toBe(1);
    expect(componentStateB!).toBe(2);
    assertLog(["Commit"]);
    expect(container.firstChild!.textContent).toBe("1 2");
  });

  it("should batch state and props together", async () => {
    let setState: React.Dispatch<React.SetStateAction<number>>;
    let componentProp: number;
    let componentState: number;

    function Component({ prop }: { prop: number }) {
      const [state, _setState] = React.useState(0);
      componentProp = prop;
      componentState = state;
      setState = _setState;

      React.useLayoutEffect(() => {
        log("Commit");
      });

      return (
        <div>
          {prop} {state}
        </div>
      );
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component prop={0} />);
    });

    assertLog(["Commit"]);
    expect(container.firstChild!.textContent).toBe("0 0");

    await act(() => {
      root.render(<Component prop={1} />);
      setState(2);
      expect(componentProp!).toBe(0);
      expect(componentState!).toBe(0);
      expect(container.firstChild!.textContent).toBe("0 0");
      assertLog([]);
    });

    expect(componentProp!).toBe(1);
    expect(componentState!).toBe(2);
    assertLog(["Commit"]);
    expect(container.firstChild!.textContent).toBe("1 2");
  });

  it("should batch parent/child state updates together", async () => {
    let childRef: HTMLDivElement;
    let parentState: number;
    let childState: number;
    let setParentState: React.Dispatch<React.SetStateAction<number>>;
    let setChildState: React.Dispatch<React.SetStateAction<number>>;

    function Parent() {
      const [state, _setState] = React.useState(0);
      parentState = state;
      setParentState = _setState;

      React.useLayoutEffect(() => {
        log("Parent Commit");
      });

      return (
        <div>
          <Child prop={state} />
        </div>
      );
    }

    function Child({ prop }: { prop: number }) {
      const [state, _setState] = React.useState(0);
      childState = state;
      setChildState = _setState;

      React.useLayoutEffect(() => {
        log("Child Commit");
      });

      return (
        <div
          ref={(ref) => {
            if (ref) childRef = ref;
          }}
        >
          {prop} {state}
        </div>
      );
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });

    assertLog(["Child Commit", "Parent Commit"]);
    expect(childRef!.textContent).toBe("0 0");

    await act(() => {
      setParentState(1);
      setChildState(2);
      expect(parentState!).toBe(0);
      expect(childState!).toBe(0);
      expect(childRef!.textContent).toBe("0 0");
      assertLog([]);
    });

    expect(parentState!).toBe(1);
    expect(childState!).toBe(2);
    expect(childRef!.textContent).toBe("1 2");
    assertLog(["Child Commit", "Parent Commit"]);
  });

  it("should batch child/parent state updates together", async () => {
    let childRef: HTMLDivElement;
    let parentState: number;
    let childState: number;
    let setParentState: React.Dispatch<React.SetStateAction<number>>;
    let setChildState: React.Dispatch<React.SetStateAction<number>>;

    function Parent() {
      const [state, _setState] = React.useState(0);
      parentState = state;
      setParentState = _setState;

      React.useLayoutEffect(() => {
        log("Parent Commit");
      });

      return (
        <div>
          <Child prop={state} />
        </div>
      );
    }

    function Child({ prop }: { prop: number }) {
      const [state, _setState] = React.useState(0);
      childState = state;
      setChildState = _setState;

      React.useLayoutEffect(() => {
        log("Child Commit");
      });

      return (
        <div
          ref={(ref) => {
            if (ref) childRef = ref;
          }}
        >
          {prop} {state}
        </div>
      );
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });

    assertLog(["Child Commit", "Parent Commit"]);
    expect(childRef!.textContent).toBe("0 0");

    await act(() => {
      setChildState(2);
      setParentState(1);
      expect(parentState!).toBe(0);
      expect(childState!).toBe(0);
      expect(childRef!.textContent).toBe("0 0");
      assertLog([]);
    });

    expect(parentState!).toBe(1);
    expect(childState!).toBe(2);
    expect(childRef!.textContent).toBe("1 2");
    assertLog(["Child Commit", "Parent Commit"]);
  });

  it("should support chained state updates", async () => {
    let instance: InstanceType<typeof Component>;
    class Component extends React.Component<object, { x: number }> {
      state = { x: 0 };
      constructor(props: object) {
        super(props);
        instance = this;
      }

      componentDidUpdate() {
        log("Update");
      }

      render() {
        return <div>{this.state.x}</div>;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });

    expect(instance!.state.x).toBe(0);
    expect(container.firstChild!.textContent).toBe("0");

    let innerCallbackRun = false;
    await act(() => {
      instance!.setState({ x: 1 }, function (this: InstanceType<typeof Component>) {
        instance!.setState({ x: 2 }, function (this: InstanceType<typeof Component>) {
          innerCallbackRun = true;
          expect(instance!.state.x).toBe(2);
          expect(container.firstChild!.textContent).toBe("2");
          assertLog(["Update"]);
        });
        expect(instance!.state.x).toBe(1);
        expect(container.firstChild!.textContent).toBe("1");
        assertLog(["Update"]);
      });
      expect(instance!.state.x).toBe(0);
      expect(container.firstChild!.textContent).toBe("0");
      assertLog([]);
    });

    assertLog([]);
    expect(instance!.state.x).toBe(2);
    expect(innerCallbackRun).toBeTruthy();
    expect(container.firstChild!.textContent).toBe("2");
  });

  it("should batch forceUpdate together", async () => {
    let instance: InstanceType<typeof Component>;
    let shouldUpdateCount = 0;
    class Component extends React.Component<object, { x: number }> {
      state = { x: 0 };

      constructor(props: object) {
        super(props);
        instance = this;
      }
      shouldComponentUpdate() {
        shouldUpdateCount++;
        return true;
      }

      componentDidUpdate() {
        log("Update");
      }

      render() {
        return <div>{this.state.x}</div>;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });

    assertLog([]);
    expect(instance!.state.x).toBe(0);

    await act(() => {
      instance!.setState({ x: 1 }, function () {
        log("callback");
      });
      instance!.forceUpdate(function () {
        log("forceUpdate");
      });
      assertLog([]);
      expect(instance!.state.x).toBe(0);
      expect(container.firstChild!.textContent).toBe("0");
    });

    expect(shouldUpdateCount).toBe(0);
    assertLog(["Update", "callback", "forceUpdate"]);
    expect(instance!.state.x).toBe(1);
    expect(container.firstChild!.textContent).toBe("1");
  });

  it("should update children even if parent blocks updates", async () => {
    let instance: InstanceType<typeof Parent>;
    class Parent extends React.Component<object, { x?: number }> {
      childRef = React.createRef<Child>();

      constructor(props: object) {
        super(props);
        instance = this;
      }
      shouldComponentUpdate() {
        return false;
      }

      render() {
        log("Parent render");
        return <Child ref={this.childRef} />;
      }
    }

    class Child extends React.Component<object, { x?: number }> {
      state = {};
      render() {
        log("Child render");
        return <div />;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });

    assertLog(["Parent render", "Child render"]);

    await act(() => {
      instance!.setState({ x: 1 });
    });

    assertLog([]);

    await act(() => {
      instance!.childRef.current!.setState({ x: 1 });
    });

    assertLog(["Child render"]);
  });

  it("should not reconcile children passed via props", async () => {
    class Top extends React.Component {
      render() {
        return (
          <Middle>
            <Bottom />
          </Middle>
        );
      }
    }

    class Middle extends React.Component<{ children?: React.ReactNode }> {
      componentDidMount() {
        this.forceUpdate();
      }

      render() {
        log("Middle");
        return React.Children.only(this.props.children);
      }
    }

    class Bottom extends React.Component {
      render() {
        log("Bottom");
        return null;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Top />);
    });

    assertLog(["Middle", "Bottom", "Middle"]);
  });

  it("should flow updates correctly", async () => {
    let willUpdates: string[] = [];
    let didUpdates: string[] = [];
    let instance: InstanceType<typeof App>;

    const UpdateLoggingMixin = {
      UNSAFE_componentWillUpdate: function (this: React.Component) {
        willUpdates.push((this.constructor as { displayName?: string }).displayName!);
      },
      componentDidUpdate: function (this: React.Component) {
        didUpdates.push((this.constructor as { displayName?: string }).displayName!);
      },
    };

    class Box extends React.Component<{ children?: React.ReactNode }, { x?: number }> {
      static displayName = "Box";
      boxDivRef = React.createRef<HTMLDivElement>();

      UNSAFE_componentWillUpdate() {
        willUpdates.push("Box");
      }
      componentDidUpdate() {
        didUpdates.push("Box");
      }

      render() {
        return <div ref={this.boxDivRef}>{this.props.children}</div>;
      }
    }

    class Child extends React.Component<object, { x?: number }> {
      static displayName = "Child";
      spanRef = React.createRef<HTMLSpanElement>();

      UNSAFE_componentWillUpdate() {
        willUpdates.push("Child");
      }
      componentDidUpdate() {
        didUpdates.push("Child");
      }

      render() {
        return <span ref={this.spanRef}>child</span>;
      }
    }

    class Switcher extends React.Component<
      { children?: React.ReactNode },
      { tabKey: string; x?: number }
    > {
      static displayName = "Switcher";
      state = { tabKey: "hello" } as { tabKey: string; x?: number };
      boxRef = React.createRef<Box>();
      switcherDivRef = React.createRef<HTMLDivElement>();

      UNSAFE_componentWillUpdate() {
        willUpdates.push("Switcher");
      }
      componentDidUpdate() {
        didUpdates.push("Switcher");
      }

      render() {
        const child = this.props.children;
        return (
          <div ref={this.switcherDivRef}>
            <Box ref={this.boxRef}>{child}</Box>
          </div>
        );
      }
    }

    class App extends React.Component<object, { x?: number }> {
      static displayName = "App";
      switcherRef = React.createRef<Switcher>();
      childRef = React.createRef<Child>();
      constructor(props: object) {
        super(props);
        instance = this;
      }

      UNSAFE_componentWillUpdate() {
        willUpdates.push("App");
      }
      componentDidUpdate() {
        didUpdates.push("App");
      }

      render() {
        return (
          <Switcher ref={this.switcherRef}>
            <Child ref={this.childRef} />
          </Switcher>
        );
      }
    }

    const container = document.createElement("div");
    await act(() => {
      ReactDOMClient.createRoot(container).render(<App />);
    });

    function expectUpdates(desiredWillUpdates: string[], desiredDidUpdates: string[]) {
      for (let i = 0; i < desiredWillUpdates.length; i++) {
        expect(willUpdates).toContain(desiredWillUpdates[i]);
      }
      for (let i = 0; i < desiredDidUpdates.length; i++) {
        expect(didUpdates).toContain(desiredDidUpdates[i]);
      }
      willUpdates = [];
      didUpdates = [];
    }

    function triggerUpdate(component: React.Component) {
      component.setState({ x: 1 });
    }

    async function testUpdates(
      components: React.Component[],
      desiredWillUpdates: string[],
      desiredDidUpdates: string[],
    ) {
      await act(() => {
        for (let i = 0; i < components.length; i++) {
          triggerUpdate(components[i]);
        }
      });

      expectUpdates(desiredWillUpdates, desiredDidUpdates);

      await act(() => {
        for (let i = components.length - 1; i >= 0; i--) {
          triggerUpdate(components[i]);
        }
      });

      expectUpdates(desiredWillUpdates, desiredDidUpdates);
    }

    await testUpdates(
      [instance!.switcherRef.current!.boxRef.current!, instance!.switcherRef.current!],
      ["Switcher", "Box"],
      ["Box", "Switcher"],
    );

    await testUpdates(
      [instance!.childRef.current!, instance!.switcherRef.current!.boxRef.current!],
      ["Box", "Child"],
      ["Box", "Child"],
    );

    await testUpdates(
      [instance!.childRef.current!, instance!.switcherRef.current!],
      ["Switcher", "Box", "Child"],
      ["Box", "Switcher", "Child"],
    );
  });

  it("should queue mount-ready handlers across different roots", async () => {
    const bContainer = document.createElement("div");
    let aInstance: InstanceType<typeof A>;
    let bInstance: InstanceType<typeof B>;
    let bRef: HTMLSpanElement;

    let aUpdated = false;

    class A extends React.Component<object, { x: number }> {
      state = { x: 0 };
      constructor(props: object) {
        super(props);
        aInstance = this;
      }
      componentDidUpdate() {
        expect(bRef!.textContent).toBe("B1");
        aUpdated = true;
      }

      render() {
        const portal = ReactDOM.createPortal(
          <B
            ref={(n) => {
              if (n) bInstance = n;
            }}
          />,
          bContainer,
        );
        return (
          <div>
            <span>A{this.state.x}</span>
            {portal}
          </div>
        );
      }
    }

    class B extends React.Component<object, { x: number }> {
      state = { x: 0 };

      render() {
        return (
          <span
            ref={(n) => {
              if (n) bRef = n;
            }}
          >
            B{this.state.x}
          </span>
        );
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<A />);
    });

    await act(() => {
      aInstance!.setState({ x: 1 });
      bInstance!.setState({ x: 1 });
    });

    expect(aUpdated).toBe(true);
  });

  it("should flush updates in the correct order", async () => {
    const updates: string[] = [];
    let instance: InstanceType<typeof Outer>;

    class Outer extends React.Component<object, { x: number }> {
      state = { x: 0 };
      innerRef = React.createRef<Inner>();
      constructor(props: object) {
        super(props);
        instance = this;
      }
      render() {
        updates.push("Outer-render-" + this.state.x);
        return (
          <div>
            <Inner ref={this.innerRef} x={this.state.x} />
          </div>
        );
      }

      componentDidUpdate() {
        const x = this.state.x;
        updates.push("Outer-didUpdate-" + x);
        updates.push("Inner-setState-" + x);
        this.innerRef.current!.setState({ x }, function () {
          updates.push("Inner-callback-" + x);
        });
      }
    }

    class Inner extends React.Component<{ x: number }, { x: number }> {
      state = { x: 0 };

      render() {
        updates.push("Inner-render-" + this.props.x + "-" + this.state.x);
        return <div />;
      }

      componentDidUpdate() {
        updates.push("Inner-didUpdate-" + this.props.x + "-" + this.state.x);
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Outer />);
    });

    await act(() => {
      updates.push("Outer-setState-1");
      instance!.setState({ x: 1 }, function () {
        updates.push("Outer-callback-1");
        updates.push("Outer-setState-2");
        instance!.setState({ x: 2 }, function () {
          updates.push("Outer-callback-2");
        });
      });
    });

    expect(updates).toEqual([
      "Outer-render-0",
      "Inner-render-0-0",

      "Outer-setState-1",
      "Outer-render-1",
      "Inner-render-1-0",
      "Inner-didUpdate-1-0",
      "Outer-didUpdate-1",
      "Inner-setState-1",
      "Outer-callback-1",

      "Outer-setState-2",

      "Outer-render-2",
      "Inner-render-2-1",
      "Inner-didUpdate-2-1",
      "Inner-callback-1",
      "Outer-didUpdate-2",
      "Inner-setState-2",
      "Outer-callback-2",
      "Inner-render-2-2",
      "Inner-didUpdate-2-2",
      "Inner-callback-2",
    ]);
  });

  it("should queue nested updates", async () => {
    class X extends React.Component<object, { s: number }> {
      state = { s: 0 };

      render() {
        if (this.state.s === 0) {
          return (
            <div>
              <span>0</span>
            </div>
          );
        } else {
          return <div>1</div>;
        }
      }

      go = () => {
        this.setState({ s: 1 });
        this.setState({ s: 0 });
        this.setState({ s: 1 });
      };
    }

    class Y extends React.Component {
      render() {
        return (
          <div>
            <Z />
          </div>
        );
      }
    }

    let xInstance: X;

    class Z extends React.Component<object, { x?: number }> {
      state = {};
      render() {
        return <div />;
      }

      UNSAFE_componentWillUpdate() {
        xInstance!.go();
      }
    }

    let xContainer = document.createElement("div");
    let xRoot = ReactDOMClient.createRoot(xContainer);
    await act(() => {
      xRoot.render(
        <X
          ref={(current) => {
            if (current) xInstance = current;
          }}
        />,
      );
    });

    const yContainer = document.createElement("div");
    const yRoot = ReactDOMClient.createRoot(yContainer);
    let yInstance: Y;
    await act(() => {
      yRoot.render(
        <Y
          ref={(current) => {
            if (current) yInstance = current;
          }}
        />,
      );
    });

    expect(xContainer.firstChild!.textContent).toBe("0");

    await act(() => {
      yInstance!.forceUpdate();
    });
    expect(xContainer.firstChild!.textContent).toBe("1");
  });

  it("should queue updates from during mount", async () => {
    let aInstance: InstanceType<typeof A>;

    class A extends React.Component<object, { x: number }> {
      state = { x: 0 };

      UNSAFE_componentWillMount() {
        aInstance = this;
      }

      render() {
        return <div>A{this.state.x}</div>;
      }
    }

    class B extends React.Component {
      UNSAFE_componentWillMount() {
        aInstance!.setState({ x: 1 });
      }

      render() {
        return <div />;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(
        <div>
          <A />
          <B />
        </div>,
      );
    });

    expect(container.firstChild!.textContent).toBe("A1");
  });

  it("calls componentWillReceiveProps setState callback properly", async () => {
    class A extends React.Component<{ x: number }, { x: number }> {
      state = { x: this.props.x };

      UNSAFE_componentWillReceiveProps(nextProps: { x: number }) {
        const newX = nextProps.x;
        this.setState({ x: newX }, function (this: A) {
          expect(this.state.x).toBe(newX);
          log("Callback");
        });
      }

      render() {
        return <div>{this.state.x}</div>;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<A x={1} />);
    });
    assertLog([]);

    await act(() => {
      root.render(<A x={2} />);
    });

    assertLog(["Callback"]);
  });

  it("does not call render after a component as been deleted", async () => {
    let componentA: InstanceType<typeof A> | null = null;
    let componentB: InstanceType<typeof B> | null = null;

    class B extends React.Component<object, { updates: number }> {
      state = { updates: 0 };

      componentDidMount() {
        componentB = this;
      }

      render() {
        log("B");
        return <div />;
      }
    }

    class A extends React.Component<object, { showB: boolean }> {
      state = { showB: true };

      componentDidMount() {
        componentA = this;
      }
      render() {
        return this.state.showB ? <B /> : <div />;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<A />);
    });
    assertLog(["B"]);

    await act(() => {
      componentB!.setState({ updates: 1 });
      componentA!.setState({ showB: false });
    });

    assertLog([]);
  });

  it("throws in setState if the update callback is not a function", async () => {
    class A extends React.Component<object, object> {
      state = {};

      render() {
        return <div />;
      }
    }

    async function assertSetStateCallbackThrows(invalidCallback: any, expectedMessage: string) {
      const container = document.createElement("div");
      let component: A;
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <A
            ref={(current) => {
              if (current) component = current;
            }}
          />,
        );
      });

      let caughtError: Error | null = null;
      try {
        await act(() => {
          (component! as any).setState({}, invalidCallback);
        });
      } catch (error) {
        caughtError = error as Error;
      }
      expect(caughtError).not.toBeNull();
      expect(caughtError!.message).toContain(expectedMessage);
    }

    await assertSetStateCallbackThrows(
      "no",
      "Invalid argument passed as callback. Expected a function. Instead received: no",
    );
    await assertSetStateCallbackThrows(
      { foo: "bar" },
      "Invalid argument passed as callback. Expected a function. Instead received: [object Object]",
    );
    await assertSetStateCallbackThrows(
      { a: 1, b: 2 },
      "Invalid argument passed as callback. Expected a function. Instead received: [object Object]",
    );
  });

  it("throws in forceUpdate if the update callback is not a function", async () => {
    class A extends React.Component<object, object> {
      state = {};

      render() {
        return <div />;
      }
    }

    async function assertForceUpdateCallbackThrows(invalidCallback: any, expectedMessage: string) {
      const container = document.createElement("div");
      let component: A;
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <A
            ref={(current) => {
              if (current) component = current;
            }}
          />,
        );
      });

      let caughtError: Error | null = null;
      try {
        await act(() => {
          (component! as any).forceUpdate(invalidCallback);
        });
      } catch (error) {
        caughtError = error as Error;
      }
      expect(caughtError).not.toBeNull();
      expect(caughtError!.message).toContain(expectedMessage);
    }

    await assertForceUpdateCallbackThrows(
      "no",
      "Invalid argument passed as callback. Expected a function. Instead received: no",
    );
    await assertForceUpdateCallbackThrows(
      { foo: "bar" },
      "Invalid argument passed as callback. Expected a function. Instead received: [object Object]",
    );
    await assertForceUpdateCallbackThrows(
      { a: 1, b: 2 },
      "Invalid argument passed as callback. Expected a function. Instead received: [object Object]",
    );
  });

  it("does not update one component twice in a batch (#2410)", async () => {
    let parent: Parent;
    class Parent extends React.Component {
      childRef = React.createRef<Child>();

      componentDidMount() {
        parent = this;
      }
      getChild = () => {
        return this.childRef.current;
      };

      render() {
        return <Child ref={this.childRef} />;
      }
    }

    let renderCount = 0;
    let postRenderCount = 0;
    let once = false;

    class Child extends React.Component<object, { updated: boolean }> {
      state = { updated: false };

      UNSAFE_componentWillUpdate() {
        if (!once) {
          once = true;
          this.setState({ updated: true });
        }
      }

      componentDidMount() {
        expect(renderCount).toBe(postRenderCount + 1);
        postRenderCount++;
      }

      componentDidUpdate() {
        expect(renderCount).toBe(postRenderCount + 1);
        postRenderCount++;
      }

      render() {
        expect(renderCount).toBe(postRenderCount);
        renderCount++;
        return <div />;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });

    const child = parent!.getChild();
    await act(() => {
      parent!.forceUpdate();
      child!.forceUpdate();
    });

    expect.assertions(6);
  });

  it("does not update one component twice in a batch (#6371)", async () => {
    let callbacks: Array<() => void> = [];
    function emitChange() {
      callbacks.forEach((c) => c());
    }

    class App extends React.Component<object, { showChild: boolean }> {
      constructor(props: object) {
        super(props);
        this.state = { showChild: true };
      }
      componentDidMount() {
        this.setState({ showChild: false });
      }
      render() {
        return (
          <div>
            <ForceUpdatesOnChange />
            {this.state.showChild && <EmitsChangeOnUnmount />}
          </div>
        );
      }
    }

    class EmitsChangeOnUnmount extends React.Component {
      componentWillUnmount() {
        emitChange();
      }
      render() {
        return null;
      }
    }

    class ForceUpdatesOnChange extends React.Component {
      onChange: (() => void) | null = null;
      componentDidMount() {
        this.onChange = () => this.forceUpdate();
        this.onChange();
        callbacks.push(this.onChange);
      }
      componentWillUnmount() {
        callbacks = callbacks.filter((c) => c !== this.onChange);
      }
      render() {
        return <div key={Math.random()} onClick={function () {}} />;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await act(() => {
      root.render(<App />);
    });

    expect(true).toBe(true);
  });

  it("handles reentrant mounting in synchronous mode", async () => {
    let onChangeCalled = false;
    class Editor extends React.Component<{
      text: string;
      rendered: boolean;
      onChange: (props: { rendered: boolean }) => void;
    }> {
      render() {
        return <div>{this.props.text}</div>;
      }
      componentDidMount() {
        log("Mount");
        if (!this.props.rendered) {
          this.props.onChange({ rendered: true });
        }
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    function render() {
      root.render(
        <Editor
          onChange={(newProps) => {
            onChangeCalled = true;
            props = { ...props, ...newProps };
            render();
          }}
          {...props}
        />,
      );
    }

    let props = { text: "hello", rendered: false };
    await act(() => {
      render();
    });
    assertLog(["Mount"]);
    props = { ...props, text: "goodbye" };
    await act(() => {
      render();
    });

    assertLog([]);
    expect(container.textContent).toBe("goodbye");
    expect(onChangeCalled).toBeTruthy();
  });

  it("mounts and unmounts are batched", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<div>Hello</div>);
      expect(container.textContent).toBe("");
      root.unmount();
      expect(container.textContent).toBe("");
    });

    expect(container.textContent).toBe("");
  });

  it("uses correct base state for setState inside render phase", async () => {
    class Foo extends React.Component<object, { step: number }> {
      state = { step: 0 };
      render() {
        const memoizedStep = this.state.step;
        this.setState((baseState) => {
          const baseStep = baseState.step;
          log(`base: ${baseStep}, memoized: ${memoizedStep}`);
          return baseStep === 0 ? { step: 1 } : null;
        });
        return null;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Foo />);
    });

    assertLog(["base: 0, memoized: 0", "base: 1, memoized: 1"]);
  });

  it("does not re-render if state update is null", async () => {
    const container = document.createElement("div");

    let instance: InstanceType<typeof Foo>;
    class Foo extends React.Component {
      render() {
        instance = this;
        log("render");
        return <div />;
      }
    }
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Foo />);
    });

    assertLog(["render"]);
    await act(() => {
      instance!.setState(() => null);
    });
    assertLog([]);
  });

  it("synchronously renders hidden subtrees", async () => {
    const container = document.createElement("div");

    function Baz() {
      log("Baz");
      return null;
    }

    function Bar() {
      log("Bar");
      return null;
    }

    function Foo() {
      log("Foo");
      return (
        <div>
          <div hidden={true}>
            <Bar />
          </div>
          <Baz />
        </div>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Foo />);
    });
    assertLog(["Foo", "Bar", "Baz"]);

    await act(() => {
      root.render(<Foo />);
    });
    assertLog(["Foo", "Bar", "Baz"]);
  });

  it("can render ridiculously large number of roots without triggering infinite update loop error", async () => {
    function Component({ trigger }: { trigger?: boolean }) {
      const [state, setState] = React.useState(0);

      React.useEffect(() => {
        if (trigger) {
          log("Trigger");
          setState((c) => c + 1);
        }
      }, [trigger]);

      return <div>{state}</div>;
    }

    class Foo extends React.Component {
      componentDidMount() {
        const limit = 1200;
        for (let i = 0; i < limit; i++) {
          if (i < limit - 1) {
            ReactDOMClient.createRoot(document.createElement("div")).render(<Component />);
          } else {
            ReactDOMClient.createRoot(document.createElement("div")).render(
              <Component trigger={true} />,
            );
          }
        }
      }
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await act(() => {
      root.render(<Foo />);
    });

    assertLog(["Trigger"]);
  });

  it("resets the update counter for unrelated updates", async () => {
    const container = document.createElement("div");
    const ref = React.createRef<EventuallyTerminating>();

    class EventuallyTerminating extends React.Component<object, { step: number }> {
      state = { step: 0 };
      componentDidMount() {
        this.setState({ step: 1 });
      }
      componentDidUpdate() {
        if (this.state.step < limit) {
          this.setState({ step: this.state.step + 1 });
        }
      }
      render() {
        return <span>{this.state.step}</span>;
      }
    }

    let limit = 55;
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(<EventuallyTerminating ref={ref} />);
      });
    }).rejects.toThrow("Maximum");

    limit -= 10;
    await act(() => {
      root.render(<EventuallyTerminating ref={ref} />);
    });
    expect(container.textContent).toBe(limit.toString());

    await act(() => {
      ref.current!.setState({ step: 0 });
    });
    expect(container.textContent).toBe(limit.toString());

    await act(() => {
      ref.current!.setState({ step: 0 });
    });
    expect(container.textContent).toBe(limit.toString());

    limit += 10;
    await expect(async () => {
      await act(() => {
        ref.current!.setState({ step: 0 });
      });
    }).rejects.toThrow("Maximum");
    expect(ref.current).toBe(null);
  });

  it("does not fall into an infinite update loop", async () => {
    class NonTerminating extends React.Component<{ name?: string }, { step: number }> {
      state = { step: 0 };

      componentDidMount() {
        this.setState({ step: 1 });
      }

      componentDidUpdate() {
        this.setState({ step: 2 });
      }

      render() {
        return (
          <div>
            Hello {this.props.name}
            {this.state.step}
          </div>
        );
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await expect(async () => {
      await act(() => {
        root.render(<NonTerminating />);
      });
    }).rejects.toThrow("Maximum");
  });

  it("does not fall into an infinite update loop with useLayoutEffect", async () => {
    function NonTerminating() {
      const [step, setStep] = React.useState(0);
      React.useLayoutEffect(() => {
        setStep((x) => x + 1);
      });
      return <span>{step}</span>;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(<NonTerminating />);
      });
    }).rejects.toThrow("Maximum");
  });

  it("can recover after falling into an infinite update loop", async () => {
    class NonTerminating extends React.Component<object, { step: number }> {
      state = { step: 0 };
      componentDidMount() {
        this.setState({ step: 1 });
      }
      componentDidUpdate() {
        this.setState({ step: 2 });
      }
      render() {
        return <span>{this.state.step}</span>;
      }
    }

    class Terminating extends React.Component<object, { step: number }> {
      state = { step: 0 };
      componentDidMount() {
        this.setState({ step: 1 });
      }
      render() {
        return <span>{this.state.step}</span>;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(<NonTerminating />);
      });
    }).rejects.toThrow("Maximum");

    await act(() => {
      root.render(<Terminating />);
    });
    expect(container.textContent).toBe("1");

    await expect(async () => {
      await act(() => {
        root.render(<NonTerminating />);
      });
    }).rejects.toThrow("Maximum");
    await act(() => {
      root.render(<Terminating />);
    });
    expect(container.textContent).toBe("1");
  });

  it("does not fall into mutually recursive infinite update loop with same container", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    class A extends React.Component {
      componentDidMount() {
        root.render(<B />);
      }
      render() {
        return null;
      }
    }

    class B extends React.Component {
      componentDidMount() {
        root.render(<A />);
      }
      render() {
        return null;
      }
    }

    await expect(async () => {
      await act(() => {
        root.render(<A />);
      });
    }).rejects.toThrow("Maximum");
  });

  it("does not fall into an infinite error loop", async () => {
    function BadRender(): React.ReactNode {
      throw new Error("error");
    }

    class ErrorBoundary extends React.Component<{ parent: NonTerminating }> {
      componentDidCatch() {
        this.setState({});
        this.props.parent.remount();
      }
      render() {
        return <BadRender />;
      }
    }

    class NonTerminating extends React.Component<object, { step: number }> {
      state = { step: 0 };
      remount() {
        this.setState((state) => ({ step: state.step + 1 }));
      }
      render() {
        return <ErrorBoundary key={this.state.step} parent={this} />;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(<NonTerminating />);
      });
    }).rejects.toThrow("Maximum");
  });

  it("can schedule ridiculously many updates within the same batch without triggering a maximum update error", async () => {
    const subscribers: Child[] = [];
    const limit = 1200;

    class Child extends React.Component<object, { value: string }> {
      state = { value: "initial" };
      componentDidMount() {
        subscribers.push(this);
      }
      render() {
        return null;
      }
    }

    class App extends React.Component {
      render() {
        const children = [];
        for (let i = 0; i < limit; i++) {
          children.push(<Child key={i} />);
        }
        return children;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });

    await act(() => {
      subscribers.forEach((s) => {
        s.setState({ value: "update" });
      });
    });

    expect(subscribers.length).toBe(limit);
  });

  it("can have nested updates if they do not cross the limit", async () => {
    let _setStep: React.Dispatch<React.SetStateAction<number>>;
    const LIMIT = 50;

    function Terminating() {
      const [step, setStep] = React.useState(0);
      _setStep = setStep;
      React.useEffect(() => {
        if (step < LIMIT) {
          setStep((x) => x + 1);
        }
      });
      log(String(step));
      return <span>{step}</span>;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Terminating />);
    });

    assertLog(Array.from({ length: LIMIT + 1 }, (_, k) => String(k)));
    expect(container.textContent).toBe("50");
    await act(() => {
      _setStep!(0);
    });
    expect(container.textContent).toBe("50");
    assertLog(Array.from({ length: LIMIT + 1 }, (_, k) => String(k)));
  });

  it("can have many updates inside useEffect without triggering a warning", async () => {
    function Terminating() {
      const [step, setStep] = React.useState(0);
      React.useEffect(() => {
        for (let i = 0; i < 1000; i++) {
          setStep((x) => x + 1);
        }
        log("Done");
      }, []);
      return <span>{step}</span>;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Terminating />);
    });

    assertLog(["Done"]);
    expect(container.textContent).toBe("1000");
  });

  it("prevents infinite update loop triggered by synchronous updates in useEffect", async () => {
    function NonTerminating() {
      const [step, setStep] = React.useState(0);
      React.useEffect(() => {
        flushSync(() => {
          setStep(step + 1);
        });
      }, [step]);
      return <span>{step}</span>;
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        flushSync(() => {
          root.render(<NonTerminating />);
        });
      });
    }).rejects.toThrow("Maximum update depth exceeded");
  });

  it("prevents infinite update loop triggered by too many updates in ref callbacks", async () => {
    let scheduleUpdate: () => void;
    function TooManyRefUpdates() {
      const [count, _scheduleUpdate] = React.useReducer((c: number) => c + 1, 0);
      scheduleUpdate = _scheduleUpdate;

      return (
        <div
          ref={() => {
            for (let i = 0; i < 50; i++) {
              scheduleUpdate();
            }
          }}
        >
          {count}
        </div>
      );
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(<TooManyRefUpdates />);
      });
    }).rejects.toThrow("Maximum update depth exceeded");
  });
});
