import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { flushSync } from "react-dom";
import { describe, it, expect, vi } from "vitest";
import { act, log, assertLog } from "./utils";

interface TestComponentProps {
  nextColor?: string;
}

interface TestComponentState {
  color: string;
}

let testComponentInstance: TestComponent;

const LogAfterCommit = ({ children, color }: { children: React.ReactNode; color: string }) => {
  React.useEffect(() => {
    log(`commit ${color}`);
  });
  return <>{children}</>;
};

class TestComponent extends React.Component<TestComponentProps, TestComponentState> {
  constructor(props: TestComponentProps) {
    super(props);
    this.peekAtState("getInitialState", undefined);
    this.state = { color: "red" };
    testComponentInstance = this;
  }

  peekAtState = (from: string, state: TestComponentState | undefined = this.state) => {
    log(`${from} ${state && state.color}`);
  };

  peekAtCallback = (from: string) => {
    return () => this.peekAtState(from);
  };

  setFavoriteColor(nextColor: string) {
    this.setState({ color: nextColor }, this.peekAtCallback("setFavoriteColor"));
  }

  render() {
    this.peekAtState("render");
    return (
      <LogAfterCommit color={this.state.color}>
        <div>{this.state.color}</div>
      </LogAfterCommit>
    );
  }

  UNSAFE_componentWillMount() {
    this.peekAtState("componentWillMount-start");
    this.setState((state) => {
      this.peekAtState("before-setState-sunrise", state);
      return null;
    });
    this.setState({ color: "sunrise" }, this.peekAtCallback("setState-sunrise"));
    this.setState((state) => {
      this.peekAtState("after-setState-sunrise", state);
      return null;
    });
    this.peekAtState("componentWillMount-after-sunrise");
    this.setState({ color: "orange" }, this.peekAtCallback("setState-orange"));
    this.setState((state) => {
      this.peekAtState("after-setState-orange", state);
      return null;
    });
    this.peekAtState("componentWillMount-end");
  }

  componentDidMount() {
    this.peekAtState("componentDidMount-start");
    this.setState({ color: "yellow" }, this.peekAtCallback("setState-yellow"));
    this.peekAtState("componentDidMount-end");
  }

  UNSAFE_componentWillReceiveProps(newProps: TestComponentProps) {
    this.peekAtState("componentWillReceiveProps-start");
    if (newProps.nextColor) {
      this.setState((state) => {
        this.peekAtState("before-setState-receiveProps", state);
        return { color: newProps.nextColor! };
      });
      (this as any).updater.enqueueReplaceState(this, { color: undefined });
      this.setState((state) => {
        this.peekAtState("before-setState-again-receiveProps", state);
        return { color: newProps.nextColor! };
      }, this.peekAtCallback("setState-receiveProps"));
      this.setState((state) => {
        this.peekAtState("after-setState-receiveProps", state);
        return null;
      });
    }
    this.peekAtState("componentWillReceiveProps-end");
  }

  shouldComponentUpdate(_nextProps: TestComponentProps, nextState: TestComponentState) {
    this.peekAtState("shouldComponentUpdate-currentState");
    this.peekAtState("shouldComponentUpdate-nextState", nextState);
    return true;
  }

  UNSAFE_componentWillUpdate(_nextProps: TestComponentProps, nextState: TestComponentState) {
    this.peekAtState("componentWillUpdate-currentState");
    this.peekAtState("componentWillUpdate-nextState", nextState);
  }

  componentDidUpdate(_prevProps: TestComponentProps, prevState: TestComponentState) {
    this.peekAtState("componentDidUpdate-currentState");
    this.peekAtState("componentDidUpdate-prevState", prevState);
  }

  componentWillUnmount() {
    this.peekAtState("componentWillUnmount");
  }
}

describe("ReactCompositeComponent-state", () => {
  it("should support setting state", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<TestComponent />);
    });

    assertLog([
      "getInitialState undefined",
      "componentWillMount-start red",
      "componentWillMount-after-sunrise red",
      "componentWillMount-end red",
      "before-setState-sunrise red",
      "after-setState-sunrise sunrise",
      "after-setState-orange orange",
      "render orange",
      "componentDidMount-start orange",
      "componentDidMount-end orange",
      "setState-sunrise orange",
      "setState-orange orange",
      "commit orange",
      "shouldComponentUpdate-currentState orange",
      "shouldComponentUpdate-nextState yellow",
      "componentWillUpdate-currentState orange",
      "componentWillUpdate-nextState yellow",
      "render yellow",
      "componentDidUpdate-currentState yellow",
      "componentDidUpdate-prevState orange",
      "setState-yellow yellow",
      "commit yellow",
    ]);

    await act(() => {
      root.render(<TestComponent nextColor="green" />);
    });

    assertLog([
      "componentWillReceiveProps-start yellow",
      "componentWillReceiveProps-end yellow",
      "before-setState-receiveProps yellow",
      "before-setState-again-receiveProps undefined",
      "after-setState-receiveProps green",
      "shouldComponentUpdate-currentState yellow",
      "shouldComponentUpdate-nextState green",
      "componentWillUpdate-currentState yellow",
      "componentWillUpdate-nextState green",
      "render green",
      "componentDidUpdate-currentState green",
      "componentDidUpdate-prevState yellow",
      "setState-receiveProps green",
      "commit green",
    ]);

    await act(() => {
      testComponentInstance.setFavoriteColor("blue");
    });

    assertLog([
      "shouldComponentUpdate-currentState green",
      "shouldComponentUpdate-nextState blue",
      "componentWillUpdate-currentState green",
      "componentWillUpdate-nextState blue",
      "render blue",
      "componentDidUpdate-currentState blue",
      "componentDidUpdate-prevState green",
      "setFavoriteColor blue",
      "commit blue",
    ]);

    await act(() => {
      testComponentInstance.forceUpdate(testComponentInstance.peekAtCallback("forceUpdate"));
    });

    assertLog([
      "componentWillUpdate-currentState blue",
      "componentWillUpdate-nextState blue",
      "render blue",
      "componentDidUpdate-currentState blue",
      "componentDidUpdate-prevState blue",
      "forceUpdate blue",
      "commit blue",
    ]);

    root.unmount();

    assertLog(["componentWillUnmount blue"]);
  });

  it("should call componentDidUpdate of children first", async () => {
    const container = document.createElement("div");

    let childInstance: Child | null = null;
    let parentInstance: Parent | null = null;

    class Child extends React.Component<object, { bar: boolean }> {
      state = { bar: false };
      componentDidMount() {
        childInstance = this;
      }
      componentDidUpdate() {
        log("child did update");
      }
      render() {
        return <div />;
      }
    }

    let shouldUpdate = true;

    class Intermediate extends React.Component {
      shouldComponentUpdate() {
        return shouldUpdate;
      }
      render() {
        return <Child />;
      }
    }

    class Parent extends React.Component<object, { foo: boolean }> {
      state = { foo: false };
      componentDidMount() {
        parentInstance = this;
      }
      componentDidUpdate() {
        log("parent did update");
      }
      render() {
        return <Intermediate />;
      }
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });

    await act(() => {
      parentInstance!.setState({ foo: true });
      childInstance!.setState({ bar: true });
    });

    assertLog(["child did update", "parent did update"]);

    shouldUpdate = false;

    await act(() => {
      parentInstance!.setState({ foo: false });
      childInstance!.setState({ bar: false });
    });

    assertLog(["child did update", "parent did update"]);
  });

  it("should batch unmounts", async () => {
    let outerInstance: Outer | undefined;

    class Inner extends React.Component {
      render() {
        return <div />;
      }
      componentWillUnmount() {
        outerInstance!.setState({ showInner: false });
      }
    }

    class Outer extends React.Component<object, { showInner: boolean }> {
      state = { showInner: true };
      componentDidMount() {
        outerInstance = this;
      }
      render() {
        return <div>{this.state.showInner && <Inner />}</div>;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Outer />);
    });

    expect(() => {
      root.unmount();
    }).not.toThrow();
  });

  it("should update state when called from child cWRP", async () => {
    class Parent extends React.Component<object, { value: string }> {
      state = { value: "one" };
      render() {
        log("parent render " + this.state.value);
        return <Child parent={this} value={this.state.value} />;
      }
    }

    let didUpdate = false;

    class Child extends React.Component<{ parent: Parent; value: string }> {
      UNSAFE_componentWillReceiveProps() {
        if (didUpdate) {
          return;
        }
        log("child componentWillReceiveProps " + this.props.value);
        this.props.parent.setState({ value: "two" });
        log("child componentWillReceiveProps done " + this.props.value);
        didUpdate = true;
      }
      render() {
        log("child render " + this.props.value);
        return <div>{this.props.value}</div>;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });

    assertLog(["parent render one", "child render one"]);

    await act(() => {
      root.render(<Parent />);
    });

    assertLog([
      "parent render one",
      "child componentWillReceiveProps one",
      "child componentWillReceiveProps done one",
      "child render one",
      "parent render two",
      "child render two",
    ]);
  });

  it("should merge state when sCU returns false", async () => {
    let testInstance: Test | undefined;

    class Test extends React.Component<object, { a: number; b?: number; c?: number }> {
      state: { a: number; b?: number; c?: number } = { a: 0 };
      componentDidMount() {
        testInstance = this;
      }
      render() {
        return null;
      }
      shouldComponentUpdate(_nextProps: object, nextState: { a: number; b?: number; c?: number }) {
        log("scu from " + Object.keys(this.state) + " to " + Object.keys(nextState));
        return false;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Test />);
    });
    await act(() => {
      testInstance!.setState({ b: 0 });
    });

    assertLog(["scu from a to a,b"]);

    await act(() => {
      testInstance!.setState({ c: 0 });
    });

    assertLog(["scu from a,b to a,b,c"]);
  });

  it("should treat assigning to this.state inside cWRP as a replaceState", async () => {
    interface ReplaceStateTestState {
      step: number;
      extra?: boolean;
    }

    class Test extends React.Component<object, ReplaceStateTestState> {
      state: ReplaceStateTestState = { step: 1, extra: true };
      UNSAFE_componentWillReceiveProps() {
        this.setState({ step: 2 }, () => {
          log(`callback -- step: ${this.state.step}, extra: ${Boolean(this.state.extra)}`);
        });
        this.state = { step: 3 };
      }
      render() {
        log(`render -- step: ${this.state.step}, extra: ${Boolean(this.state.extra)}`);
        return null;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Test />);
    });
    flushSync(() => {
      root.render(<Test />);
    });

    assertLog([
      "render -- step: 1, extra: true",
      "render -- step: 3, extra: false",
      "callback -- step: 3, extra: false",
    ]);

    expect(() => {
      flushSync(() => {
        root.render(<Test />);
      });
    }).not.toThrow();
  });

  it("should treat assigning to this.state inside cWM as a replaceState", () => {
    interface ReplaceStateTestState {
      step: number;
      extra?: boolean;
    }

    class Test extends React.Component<object, ReplaceStateTestState> {
      state: ReplaceStateTestState = { step: 1, extra: true };
      UNSAFE_componentWillMount() {
        this.setState({ step: 2 }, () => {
          log(`callback -- step: ${this.state.step}, extra: ${Boolean(this.state.extra)}`);
        });
        this.state = { step: 3 };
      }
      render() {
        log(`render -- step: ${this.state.step}, extra: ${Boolean(this.state.extra)}`);
        return null;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    flushSync(() => {
      root.render(<Test />);
    });

    assertLog([
      "render -- step: 3, extra: false",
      "callback -- step: 3, extra: false",
      "render -- step: 3, extra: false",
      "callback -- step: 3, extra: false",
    ]);
  });

  it("should not support setState in componentWillUnmount", async () => {
    let subscription: () => void;

    class ComponentA extends React.Component {
      componentWillUnmount() {
        subscription();
      }
      render() {
        return <>A</>;
      }
    }

    class ComponentB extends React.Component<object, { siblingUnmounted: boolean }> {
      state = { siblingUnmounted: false };
      UNSAFE_componentWillMount() {
        subscription = () => this.setState({ siblingUnmounted: true });
      }
      render() {
        return <>{"B" + (this.state.siblingUnmounted ? " No Sibling" : "")}</>;
      }
    }

    const element = document.createElement("div");
    const root = ReactDOMClient.createRoot(element);
    await act(() => {
      root.render(<ComponentA />);
    });
    expect(element.textContent).toBe("A");

    flushSync(() => {
      root.render(<ComponentB />);
    });
  });
});

describe("ReactCompositeComponentNestedState", () => {
  it("should provide up to date values for props", async () => {
    class ParentComponent extends React.Component<
      { logger: (...args: string[]) => void },
      { color: string }
    > {
      state = { color: "blue" };

      handleColor = (color: string) => {
        this.props.logger("parent-handleColor", this.state.color);
        this.setState({ color }, function (this: any) {
          this.props.logger("parent-after-setState", this.state.color);
        });
      };

      render() {
        this.props.logger("parent-render", this.state.color);
        return (
          <ChildComponent
            logger={this.props.logger}
            color={this.state.color}
            onSelectColor={this.handleColor}
          />
        );
      }
    }

    class ChildComponent extends React.Component<
      {
        logger: (...args: string[]) => void;
        color: string;
        onSelectColor: (color: string) => void;
      },
      { hue: string }
    > {
      constructor(props: {
        logger: (...args: string[]) => void;
        color: string;
        onSelectColor: (color: string) => void;
      }) {
        super(props);
        props.logger("getInitialState", props.color);
        this.state = { hue: "dark " + props.color };
      }

      handleHue = (shade: string, color: string) => {
        this.props.logger("handleHue", this.state.hue, this.props.color);
        this.props.onSelectColor(color);
        this.setState(
          function (this: any, state: any, props: any) {
            this.props.logger("setState-this", this.state.hue, this.props.color);
            this.props.logger("setState-args", state.hue, props.color);
            return { hue: shade + " " + props.color };
          },
          function (this: any) {
            this.props.logger("after-setState", this.state.hue, this.props.color);
          },
        );
      };

      render() {
        this.props.logger("render", this.state.hue, this.props.color);
        return (
          <div>
            <button onClick={this.handleHue.bind(this, "dark", "blue")}>Dark Blue</button>
            <button onClick={this.handleHue.bind(this, "light", "blue")}>Light Blue</button>
            <button onClick={this.handleHue.bind(this, "dark", "green")}>Dark Green</button>
            <button onClick={this.handleHue.bind(this, "light", "green")}>Light Green</button>
          </div>
        );
      }
    }

    const container = document.createElement("div");
    document.body.appendChild(container);

    const logger = vi.fn();
    const root = ReactDOMClient.createRoot(container);

    await act(async () => {
      root.render(<ParentComponent logger={logger} />);
    });

    await act(async () => {
      (container.childNodes[0].childNodes[3] as HTMLElement).click();
    });

    expect(logger.mock.calls).toEqual([
      ["parent-render", "blue"],
      ["getInitialState", "blue"],
      ["render", "dark blue", "blue"],
      ["handleHue", "dark blue", "blue"],
      ["parent-handleColor", "blue"],
      ["parent-render", "green"],
      ["setState-this", "dark blue", "blue"],
      ["setState-args", "dark blue", "green"],
      ["render", "light green", "green"],
      ["after-setState", "light green", "green"],
      ["parent-after-setState", "green"],
    ]);
  });
});
