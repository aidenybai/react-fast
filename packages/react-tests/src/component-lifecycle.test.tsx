import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect } from "vitest";
import { act } from "./utils";

const clone = (object: unknown) => JSON.parse(JSON.stringify(object));

const GET_INIT_STATE_RETURN_VAL = {
  hasWillMountCompleted: false,
  hasRenderCompleted: false,
  hasDidMountCompleted: false,
  hasWillUnmountCompleted: false,
};

const INIT_RENDER_STATE = {
  hasWillMountCompleted: true,
  hasRenderCompleted: false,
  hasDidMountCompleted: false,
  hasWillUnmountCompleted: false,
};

const DID_MOUNT_STATE = {
  hasWillMountCompleted: true,
  hasRenderCompleted: true,
  hasDidMountCompleted: false,
  hasWillUnmountCompleted: false,
};

const NEXT_RENDER_STATE = {
  hasWillMountCompleted: true,
  hasRenderCompleted: true,
  hasDidMountCompleted: true,
  hasWillUnmountCompleted: false,
};

const WILL_UNMOUNT_STATE = {
  hasWillMountCompleted: true,
  hasDidMountCompleted: true,
  hasRenderCompleted: true,
  hasWillUnmountCompleted: false,
};

const POST_WILL_UNMOUNT_STATE = {
  hasWillMountCompleted: true,
  hasDidMountCompleted: true,
  hasRenderCompleted: true,
  hasWillUnmountCompleted: true,
};

describe("ReactComponentLifeCycle", () => {
  it("should not reuse an instance when it has been unmounted", async () => {
    const container = document.createElement("div");

    class StatefulComponent extends React.Component {
      state = {};
      render() {
        return <div />;
      }
    }

    const element = <StatefulComponent />;
    let root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(element);
    });

    const firstInstance = container.firstChild;
    await act(() => {
      root.unmount();
    });
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(element);
    });

    const secondInstance = container.firstChild;
    expect(firstInstance).not.toBe(secondInstance);
  });

  it("should fire onDOMReady when already in onDOMReady", async () => {
    const testJournal: string[] = [];

    class Child extends React.Component {
      componentDidMount() {
        testJournal.push("Child:onDOMReady");
      }
      render() {
        return <div />;
      }
    }

    class SwitcherParent extends React.Component {
      state = { showHasOnDOMReadyComponent: false };

      constructor(props: Record<string, unknown>) {
        super(props);
        testJournal.push("SwitcherParent:getInitialState");
      }

      componentDidMount() {
        testJournal.push("SwitcherParent:onDOMReady");
        this.switchIt();
      }

      switchIt = () => {
        this.setState({ showHasOnDOMReadyComponent: true });
      };

      render() {
        return <div>{this.state.showHasOnDOMReadyComponent ? <Child /> : <div />}</div>;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<SwitcherParent />);
    });

    expect(testJournal).toEqual([
      "SwitcherParent:getInitialState",
      "SwitcherParent:onDOMReady",
      "Child:onDOMReady",
    ]);
  });

  it("throws when accessing state in componentWillMount", async () => {
    class StatefulComponent extends React.Component {
      UNSAFE_componentWillMount() {
        void (this.state as Record<string, unknown>).yada;
      }
      render() {
        return <div />;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(<StatefulComponent />);
      });
    }).rejects.toThrow();
  });

  it("should allow update state inside of componentWillMount", () => {
    class StatefulComponent extends React.Component {
      UNSAFE_componentWillMount() {
        this.setState({ stateField: "something" });
      }
      render() {
        return <div />;
      }
    }

    expect(async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<StatefulComponent />);
      });
    }).not.toThrow();
  });

  it("should not allow update state inside of getInitialState", async () => {
    class StatefulComponent extends React.Component {
      constructor(props: Record<string, unknown>) {
        super(props);
        this.setState({ stateField: "something" });
        this.state = { stateField: "somethingelse" };
      }
      render() {
        return <div />;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<StatefulComponent />);
    });
  });

  it("should carry through each of the phases of setup", async () => {
    class LifeCycleComponent extends React.Component {
      _testJournal: Record<string, unknown> = {};

      constructor(props: Record<string, unknown>) {
        super(props);
        const initState = {
          hasWillMountCompleted: false,
          hasDidMountCompleted: false,
          hasRenderCompleted: false,
          hasWillUnmountCompleted: false,
        };
        this._testJournal.returnedFromGetInitialState = clone(initState);
        this.state = initState;
      }

      UNSAFE_componentWillMount() {
        this._testJournal.stateAtStartOfWillMount = clone(this.state);
        (this.state as Record<string, boolean>).hasWillMountCompleted = true;
      }

      componentDidMount() {
        this._testJournal.stateAtStartOfDidMount = clone(this.state);
        this.setState({ hasDidMountCompleted: true });
      }

      render() {
        const isInitialRender = !(this.state as Record<string, boolean>).hasRenderCompleted;
        if (isInitialRender) {
          this._testJournal.stateInInitialRender = clone(this.state);
        } else {
          this._testJournal.stateInLaterRender = clone(this.state);
        }
        (this.state as Record<string, boolean>).hasRenderCompleted = true;
        return <div ref={React.createRef()}>I am the inner DIV</div>;
      }

      componentWillUnmount() {
        this._testJournal.stateAtStartOfWillUnmount = clone(this.state);
        (this.state as Record<string, boolean>).hasWillUnmountCompleted = true;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));

    const instanceRef = React.createRef<LifeCycleComponent>();
    await act(() => {
      root.render(<LifeCycleComponent ref={instanceRef} />);
    });
    const instance = instanceRef.current!;

    expect(instance._testJournal.returnedFromGetInitialState).toEqual(GET_INIT_STATE_RETURN_VAL);

    expect(instance._testJournal.stateAtStartOfWillMount).toEqual(
      instance._testJournal.returnedFromGetInitialState,
    );

    expect(instance._testJournal.stateAtStartOfDidMount).toEqual(DID_MOUNT_STATE);

    expect(instance._testJournal.stateInInitialRender).toEqual(INIT_RENDER_STATE);

    instance.forceUpdate();

    expect(instance._testJournal.stateInLaterRender).toEqual(NEXT_RENDER_STATE);

    await act(() => {
      root.unmount();
    });

    expect(instance._testJournal.stateAtStartOfWillUnmount).toEqual(WILL_UNMOUNT_STATE);

    expect(instance.state).toEqual(POST_WILL_UNMOUNT_STATE);
  });

  it("should not throw when updating an auxiliary component", async () => {
    class Tooltip extends React.Component<{
      tooltip: React.ReactNode;
      children: React.ReactNode;
    }> {
      root: ReactDOMClient.Root | null = null;

      render() {
        return <div>{this.props.children}</div>;
      }

      componentDidMount() {
        const container = document.createElement("div");
        this.root = ReactDOMClient.createRoot(container);
        this.updateTooltip();
      }

      componentDidUpdate() {
        this.updateTooltip();
      }

      updateTooltip = () => {
        this.root!.render(this.props.tooltip);
      };
    }

    class Component extends React.Component<{
      text: string;
      tooltipText: string;
    }> {
      render() {
        return (
          <Tooltip ref={React.createRef()} tooltip={<div>{this.props.tooltipText}</div>}>
            {this.props.text}
          </Tooltip>
        );
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await act(() => {
      root.render(<Component text="uno" tooltipText="one" />);
    });

    await act(() => {
      root.render(<Component text="dos" tooltipText="two" />);
    });
  });

  it("should allow state updates in componentDidMount", async () => {
    class SetStateInComponentDidMount extends React.Component<{
      valueToUseInitially: string;
      valueToUseInOnDOMReady: string;
    }> {
      state = {
        stateField: this.props.valueToUseInitially,
      };

      componentDidMount() {
        this.setState({ stateField: this.props.valueToUseInOnDOMReady });
      }

      render() {
        return <div />;
      }
    }

    let instance: SetStateInComponentDidMount | null = null;
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <SetStateInComponentDidMount
          ref={(current) => (instance = current)}
          valueToUseInitially="hello"
          valueToUseInOnDOMReady="goodbye"
        />,
      );
    });

    expect(instance!.state.stateField).toBe("goodbye");
  });

  it("should call nested legacy lifecycle methods in the right order", async () => {
    let lifecycleLog: string[];
    const logger = (message: string) => {
      return function () {
        lifecycleLog.push(message);
        return true;
      };
    };

    class Outer extends React.Component<{ x: number }> {
      UNSAFE_componentWillMount = logger("outer componentWillMount");
      componentDidMount = logger("outer componentDidMount");
      UNSAFE_componentWillReceiveProps = logger("outer componentWillReceiveProps");
      shouldComponentUpdate = logger("outer shouldComponentUpdate");
      UNSAFE_componentWillUpdate = logger("outer componentWillUpdate");
      componentDidUpdate = logger("outer componentDidUpdate");
      componentWillUnmount = logger("outer componentWillUnmount");
      render() {
        return (
          <div>
            <Inner x={this.props.x} />
          </div>
        );
      }
    }

    class Inner extends React.Component<{ x: number }> {
      UNSAFE_componentWillMount = logger("inner componentWillMount");
      componentDidMount = logger("inner componentDidMount");
      UNSAFE_componentWillReceiveProps = logger("inner componentWillReceiveProps");
      shouldComponentUpdate = logger("inner shouldComponentUpdate");
      UNSAFE_componentWillUpdate = logger("inner componentWillUpdate");
      componentDidUpdate = logger("inner componentDidUpdate");
      componentWillUnmount = logger("inner componentWillUnmount");
      render() {
        return <span>{this.props.x}</span>;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    lifecycleLog = [];
    await act(() => {
      root.render(<Outer x={1} />);
    });
    expect(lifecycleLog).toEqual([
      "outer componentWillMount",
      "inner componentWillMount",
      "inner componentDidMount",
      "outer componentDidMount",
    ]);

    lifecycleLog = [];
    await act(() => {
      root.render(<Outer x={2} />);
    });
    expect(lifecycleLog).toEqual([
      "outer componentWillReceiveProps",
      "outer shouldComponentUpdate",
      "outer componentWillUpdate",
      "inner componentWillReceiveProps",
      "inner shouldComponentUpdate",
      "inner componentWillUpdate",
      "inner componentDidUpdate",
      "outer componentDidUpdate",
    ]);

    lifecycleLog = [];
    await act(() => {
      root.unmount();
    });
    expect(lifecycleLog).toEqual(["outer componentWillUnmount", "inner componentWillUnmount"]);
  });

  it("should call nested new lifecycle methods in the right order", async () => {
    let lifecycleLog: string[];
    const logger = (message: string) => {
      return function () {
        lifecycleLog.push(message);
        return true;
      };
    };

    class Outer extends React.Component<{ x: number }> {
      state = {};
      static getDerivedStateFromProps() {
        lifecycleLog.push("outer getDerivedStateFromProps");
        return null;
      }
      componentDidMount = logger("outer componentDidMount");
      shouldComponentUpdate = logger("outer shouldComponentUpdate");
      getSnapshotBeforeUpdate = logger("outer getSnapshotBeforeUpdate");
      componentDidUpdate = logger("outer componentDidUpdate");
      componentWillUnmount = logger("outer componentWillUnmount");
      render() {
        return (
          <div>
            <Inner x={this.props.x} />
          </div>
        );
      }
    }

    class Inner extends React.Component<{ x: number }> {
      state = {};
      static getDerivedStateFromProps() {
        lifecycleLog.push("inner getDerivedStateFromProps");
        return null;
      }
      componentDidMount = logger("inner componentDidMount");
      shouldComponentUpdate = logger("inner shouldComponentUpdate");
      getSnapshotBeforeUpdate = logger("inner getSnapshotBeforeUpdate");
      componentDidUpdate = logger("inner componentDidUpdate");
      componentWillUnmount = logger("inner componentWillUnmount");
      render() {
        return <span>{this.props.x}</span>;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));

    lifecycleLog = [];
    await act(() => {
      root.render(<Outer x={1} />);
    });
    expect(lifecycleLog).toEqual([
      "outer getDerivedStateFromProps",
      "inner getDerivedStateFromProps",
      "inner componentDidMount",
      "outer componentDidMount",
    ]);

    lifecycleLog = [];
    await act(() => {
      root.render(<Outer x={2} />);
    });
    expect(lifecycleLog).toEqual([
      "outer getDerivedStateFromProps",
      "outer shouldComponentUpdate",
      "inner getDerivedStateFromProps",
      "inner shouldComponentUpdate",
      "inner getSnapshotBeforeUpdate",
      "outer getSnapshotBeforeUpdate",
      "inner componentDidUpdate",
      "outer componentDidUpdate",
    ]);

    lifecycleLog = [];
    await act(() => {
      root.unmount();
    });
    expect(lifecycleLog).toEqual(["outer componentWillUnmount", "inner componentWillUnmount"]);
  });

  it("should not invoke deprecated lifecycles if new static gDSFP is present", async () => {
    class Component extends React.Component<{ value?: number }> {
      state = {};
      static getDerivedStateFromProps() {
        return null;
      }
      componentWillMount() {
        throw Error("unexpected");
      }
      componentWillReceiveProps() {
        throw Error("unexpected");
      }
      componentWillUpdate() {
        throw Error("unexpected");
      }
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await act(() => {
      root.render(<Component />);
    });
  });

  it("should not invoke deprecated lifecycles if new getSnapshotBeforeUpdate is present", async () => {
    class Component extends React.Component<{ value?: number }> {
      state = {};
      getSnapshotBeforeUpdate() {
        return null;
      }
      componentWillMount() {
        throw Error("unexpected");
      }
      componentWillReceiveProps() {
        throw Error("unexpected");
      }
      componentWillUpdate() {
        throw Error("unexpected");
      }
      componentDidUpdate() {}
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await act(() => {
      root.render(<Component value={1} />);
    });

    await act(() => {
      root.render(<Component value={2} />);
    });
  });

  it("should not invoke new unsafe lifecycles if static gDSFP is present", async () => {
    class Component extends React.Component<{ value?: number }> {
      state = {};
      static getDerivedStateFromProps() {
        return null;
      }
      UNSAFE_componentWillMount() {
        throw Error("unexpected");
      }
      UNSAFE_componentWillReceiveProps() {
        throw Error("unexpected");
      }
      UNSAFE_componentWillUpdate() {
        throw Error("unexpected");
      }
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await act(() => {
      root.render(<Component value={1} />);
    });
    await act(() => {
      root.render(<Component value={2} />);
    });
  });

  it("should warn about deprecated lifecycles if new static gDSFP is present", async () => {
    class AllLegacyLifecycles extends React.Component {
      state = {};
      static getDerivedStateFromProps() {
        return null;
      }
      componentWillMount() {}
      UNSAFE_componentWillReceiveProps() {}
      componentWillUpdate() {}
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await act(() => {
      root.render(<AllLegacyLifecycles />);
    });

    class WillMount extends React.Component {
      state = {};
      static getDerivedStateFromProps() {
        return null;
      }
      UNSAFE_componentWillMount() {}
      render() {
        return null;
      }
    }

    await act(() => {
      root.render(<WillMount />);
    });

    class WillMountAndUpdate extends React.Component {
      state = {};
      static getDerivedStateFromProps() {
        return null;
      }
      componentWillMount() {}
      UNSAFE_componentWillUpdate() {}
      render() {
        return null;
      }
    }

    await act(() => {
      root.render(<WillMountAndUpdate />);
    });

    class WillReceiveProps extends React.Component {
      state = {};
      static getDerivedStateFromProps() {
        return null;
      }
      componentWillReceiveProps() {}
      render() {
        return null;
      }
    }

    await act(() => {
      root.render(<WillReceiveProps />);
    });
  });

  it("should warn about deprecated lifecycles if new getSnapshotBeforeUpdate is present", async () => {
    class AllLegacyLifecycles extends React.Component {
      state = {};
      getSnapshotBeforeUpdate() {}
      componentWillMount() {}
      UNSAFE_componentWillReceiveProps() {}
      componentWillUpdate() {}
      componentDidUpdate() {}
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await act(() => {
      root.render(<AllLegacyLifecycles />);
    });

    class WillMount extends React.Component {
      state = {};
      getSnapshotBeforeUpdate() {}
      UNSAFE_componentWillMount() {}
      componentDidUpdate() {}
      render() {
        return null;
      }
    }

    await act(() => {
      root.render(<WillMount />);
    });

    class WillMountAndUpdate extends React.Component {
      state = {};
      getSnapshotBeforeUpdate() {}
      componentWillMount() {}
      UNSAFE_componentWillUpdate() {}
      componentDidUpdate() {}
      render() {
        return null;
      }
    }

    await act(() => {
      root.render(<WillMountAndUpdate />);
    });

    class WillReceiveProps extends React.Component {
      state = {};
      getSnapshotBeforeUpdate() {}
      componentWillReceiveProps() {}
      componentDidUpdate() {}
      render() {
        return null;
      }
    }

    await act(() => {
      root.render(<WillReceiveProps />);
    });
  });

  it("should warn if getDerivedStateFromProps returns undefined", async () => {
    class MyComponent extends React.Component {
      state = {};
      static getDerivedStateFromProps() {}
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await act(() => {
      root.render(<MyComponent />);
    });

    await act(() => {
      root.render(<MyComponent />);
    });
  });

  it("should warn if state is not initialized before getDerivedStateFromProps", async () => {
    class MyComponent extends React.Component {
      static getDerivedStateFromProps() {
        return null;
      }
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await act(() => {
      root.render(<MyComponent />);
    });

    await act(() => {
      root.render(<MyComponent />);
    });
  });

  it("should invoke both deprecated and new lifecycles if both are present", async () => {
    const lifecycleLog: string[] = [];

    class MyComponent extends React.Component<{ foo: string }> {
      componentWillMount() {
        lifecycleLog.push("componentWillMount");
      }
      componentWillReceiveProps() {
        lifecycleLog.push("componentWillReceiveProps");
      }
      componentWillUpdate() {
        lifecycleLog.push("componentWillUpdate");
      }
      UNSAFE_componentWillMount() {
        lifecycleLog.push("UNSAFE_componentWillMount");
      }
      UNSAFE_componentWillReceiveProps() {
        lifecycleLog.push("UNSAFE_componentWillReceiveProps");
      }
      UNSAFE_componentWillUpdate() {
        lifecycleLog.push("UNSAFE_componentWillUpdate");
      }
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await act(() => {
      root.render(<MyComponent foo="bar" />);
    });
    expect(lifecycleLog).toEqual(["componentWillMount", "UNSAFE_componentWillMount"]);

    lifecycleLog.length = 0;

    await act(() => {
      root.render(<MyComponent foo="baz" />);
    });
    expect(lifecycleLog).toEqual([
      "componentWillReceiveProps",
      "UNSAFE_componentWillReceiveProps",
      "componentWillUpdate",
      "UNSAFE_componentWillUpdate",
    ]);
  });

  it("should not override state with stale values if prevState is spread within getDerivedStateFromProps", async () => {
    const divRef = React.createRef<HTMLDivElement>();
    let childInstance: Child | null = null;

    class Child extends React.Component<
      { remote: number; onChange: (value: number) => void },
      { local: number; remote: number }
    > {
      state = { local: 0, remote: 0 };
      static getDerivedStateFromProps(
        nextProps: { remote: number },
        prevState: { local: number; remote: number },
      ) {
        return { ...prevState, remote: nextProps.remote };
      }
      updateState = () => {
        this.setState((state) => ({ local: state.local + 1 }));
        this.props.onChange(this.state.remote + 1);
      };
      render() {
        childInstance = this;
        return (
          <div
            onClick={this.updateState}
            ref={divRef}
          >{`remote:${this.state.remote}, local:${this.state.local}`}</div>
        );
      }
    }

    class Parent extends React.Component<Record<string, never>, { value: number }> {
      state = { value: 0 };
      handleChange = (value: number) => {
        this.setState({ value });
      };
      render() {
        return <Child remote={this.state.value} onChange={this.handleChange} />;
      }
    }

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<Parent />);
    });
    expect(divRef.current!.textContent).toBe("remote:0, local:0");

    await act(() => {
      childInstance!.updateState();
    });
    expect(divRef.current!.textContent).toBe("remote:1, local:1");

    await act(() => {
      divRef.current!.click();
    });
    expect(divRef.current!.textContent).toBe("remote:2, local:2");
    document.body.removeChild(container);
  });

  it("should pass the return value from getSnapshotBeforeUpdate to componentDidUpdate", async () => {
    const lifecycleLog: string[] = [];

    class MyComponent extends React.Component<{ value: string }, { value: number }> {
      state = { value: 0 };
      static getDerivedStateFromProps(_nextProps: { value: string }, prevState: { value: number }) {
        return { value: prevState.value + 1 };
      }
      getSnapshotBeforeUpdate(prevProps: { value: string }, prevState: { value: number }) {
        lifecycleLog.push(
          `getSnapshotBeforeUpdate() prevProps:${prevProps.value} prevState:${prevState.value}`,
        );
        return "abc";
      }
      componentDidUpdate(
        prevProps: { value: string },
        prevState: { value: number },
        snapshot: string,
      ) {
        lifecycleLog.push(
          `componentDidUpdate() prevProps:${prevProps.value} prevState:${prevState.value} snapshot:${snapshot}`,
        );
      }
      render() {
        lifecycleLog.push("render");
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await act(() => {
      root.render(
        <div>
          <MyComponent value="foo" />
        </div>,
      );
    });
    expect(lifecycleLog).toEqual(["render"]);
    lifecycleLog.length = 0;

    await act(() => {
      root.render(
        <div>
          <MyComponent value="bar" />
        </div>,
      );
    });
    expect(lifecycleLog).toEqual([
      "render",
      "getSnapshotBeforeUpdate() prevProps:foo prevState:1",
      "componentDidUpdate() prevProps:foo prevState:1 snapshot:abc",
    ]);
    lifecycleLog.length = 0;

    await act(() => {
      root.render(
        <div>
          <MyComponent value="baz" />
        </div>,
      );
    });
    expect(lifecycleLog).toEqual([
      "render",
      "getSnapshotBeforeUpdate() prevProps:bar prevState:2",
      "componentDidUpdate() prevProps:bar prevState:2 snapshot:abc",
    ]);
    lifecycleLog.length = 0;

    await act(() => {
      root.render(<div />);
    });
    expect(lifecycleLog).toEqual([]);
  });

  it("should pass previous state to shouldComponentUpdate even with getDerivedStateFromProps", async () => {
    const divRef = React.createRef<HTMLDivElement>();

    class SimpleComponent extends React.Component<{ value: string }, { value: string }> {
      constructor(props: { value: string }) {
        super(props);
        this.state = { value: props.value };
      }

      static getDerivedStateFromProps(nextProps: { value: string }, prevState: { value: string }) {
        if (nextProps.value === prevState.value) {
          return null;
        }
        return { value: nextProps.value };
      }

      shouldComponentUpdate(_nextProps: { value: string }, nextState: { value: string }) {
        return nextState.value !== this.state.value;
      }

      render() {
        return <div ref={divRef}>value: {this.state.value}</div>;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await act(() => {
      root.render(<SimpleComponent value="initial" />);
    });
    expect(divRef.current!.textContent).toBe("value: initial");
    await act(() => {
      root.render(<SimpleComponent value="updated" />);
    });
    expect(divRef.current!.textContent).toBe("value: updated");
  });

  it("should call getSnapshotBeforeUpdate before mutations are committed", async () => {
    const lifecycleLog: string[] = [];

    class MyComponent extends React.Component<{ value: string }> {
      divRef = React.createRef<HTMLDivElement>();
      getSnapshotBeforeUpdate(prevProps: { value: string }) {
        lifecycleLog.push("getSnapshotBeforeUpdate");
        expect(this.divRef.current!.textContent).toBe(`value:${prevProps.value}`);
        return "foobar";
      }
      componentDidUpdate(_prevProps: { value: string }, _prevState: unknown, snapshot: string) {
        lifecycleLog.push("componentDidUpdate");
        expect(this.divRef.current!.textContent).toBe(`value:${this.props.value}`);
        expect(snapshot).toBe("foobar");
      }
      render() {
        lifecycleLog.push("render");
        return <div ref={this.divRef}>{`value:${this.props.value}`}</div>;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await act(() => {
      root.render(<MyComponent value="foo" />);
    });
    expect(lifecycleLog).toEqual(["render"]);
    lifecycleLog.length = 0;

    await act(() => {
      root.render(<MyComponent value="bar" />);
    });
    expect(lifecycleLog).toEqual(["render", "getSnapshotBeforeUpdate", "componentDidUpdate"]);
    lifecycleLog.length = 0;
  });

  it("should warn if getSnapshotBeforeUpdate returns undefined", async () => {
    class MyComponent extends React.Component<{ value: string }> {
      getSnapshotBeforeUpdate() {}
      componentDidUpdate() {}
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await act(() => {
      root.render(<MyComponent value="foo" />);
    });

    await act(() => {
      root.render(<MyComponent value="bar" />);
    });

    await act(() => {
      root.render(<MyComponent value="baz" />);
    });
  });

  it("should warn if getSnapshotBeforeUpdate is defined with no componentDidUpdate", async () => {
    class MyComponent extends React.Component {
      getSnapshotBeforeUpdate() {
        return null;
      }
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));
    await act(() => {
      root.render(<MyComponent />);
    });

    await act(() => {
      root.render(<MyComponent />);
    });
  });

  it("warns about deprecated unsafe lifecycles", async () => {
    class MyComponent extends React.Component<{ x: number }> {
      componentWillMount() {}
      componentWillReceiveProps() {}
      componentWillUpdate() {}
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement("div"));

    await act(() => {
      root.render(<MyComponent x={1} />);
    });

    await act(() => {
      root.render(<MyComponent x={2} />);
    });
    await act(() => {
      root.render(<MyComponent key="new" x={1} />);
    });
  });

  it("warns if setting this.state = props", async () => {
    class StatefulComponent extends React.Component {
      constructor(props: Record<string, unknown>) {
        super(props);
        this.state = props;
      }
      render() {
        return <div />;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<StatefulComponent />);
    });
  });
});
