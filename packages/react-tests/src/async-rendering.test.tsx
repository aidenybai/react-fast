import React from "react";
import * as ReactDOMClient from "react-dom/client";
import ReactDOM, { flushSync } from "react-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, log, assertLog } from "./utils";

const setUntrackedInputValue = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  "value",
)!.set!;

describe("ReactDOMFiberAsync", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    window.event = undefined;
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("flushSync batches sync updates and flushes them at the end of the batch", async () => {
    const ops: string[] = [];
    let instance: InstanceType<typeof Component>;

    class Component extends React.Component<object, { text: string }> {
      state = { text: "" };
      push(value: string) {
        this.setState((state) => ({ text: state.text + value }));
      }
      componentDidUpdate() {
        ops.push(this.state.text);
      }
      render() {
        instance = this;
        return <span>{this.state.text}</span>;
      }
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<Component />));

    await act(() => {
      instance!.push("A");
    });

    expect(ops).toEqual(["A"]);
    expect(container.textContent).toEqual("A");

    flushSync(() => {
      instance!.push("B");
      instance!.push("C");
      expect(container.textContent).toEqual("A");
      expect(ops).toEqual(["A"]);
    });

    expect(container.textContent).toEqual("ABC");
    expect(ops).toEqual(["A", "ABC"]);
    await act(() => {
      instance!.push("D");
    });
    expect(container.textContent).toEqual("ABCD");
    expect(ops).toEqual(["A", "ABC", "ABCD"]);
  });

  it("flushSync flushes updates even if nested inside another flushSync", async () => {
    const ops: string[] = [];
    let instance: InstanceType<typeof Component>;

    class Component extends React.Component<object, { text: string }> {
      state = { text: "" };
      push(value: string) {
        this.setState((state) => ({ text: state.text + value }));
      }
      componentDidUpdate() {
        ops.push(this.state.text);
      }
      render() {
        instance = this;
        return <span>{this.state.text}</span>;
      }
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<Component />));

    await act(() => {
      instance!.push("A");
    });
    expect(ops).toEqual(["A"]);
    expect(container.textContent).toEqual("A");

    flushSync(() => {
      instance!.push("B");
      instance!.push("C");
      expect(container.textContent).toEqual("A");
      expect(ops).toEqual(["A"]);

      flushSync(() => {
        instance!.push("D");
      });
      expect(container.textContent).toEqual("ABCD");
      expect(ops).toEqual(["A", "ABCD"]);
    });
    expect(container.textContent).toEqual("ABCD");
    expect(ops).toEqual(["A", "ABCD"]);
  });

  it("flushSync logs an error if already performing work", async () => {
    class Component extends React.Component {
      componentDidUpdate() {
        flushSync(() => {});
      }
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });
    flushSync(() => {
      root.render(<Component />);
    });
  });

  describe("concurrent mode", () => {
    it("does not perform deferred updates synchronously", async () => {
      const inputRef = React.createRef<HTMLInputElement>();
      const asyncValueRef = React.createRef<HTMLParagraphElement>();
      const syncValueRef = React.createRef<HTMLParagraphElement>();

      class Counter extends React.Component<object, { asyncValue: string; syncValue: string }> {
        state = { asyncValue: "", syncValue: "" };

        handleChange = (event: { target: { value: string } }) => {
          const nextValue = event.target.value;
          React.startTransition(() => {
            this.setState({
              asyncValue: nextValue,
            });
            expect(asyncValueRef.current!.textContent).toBe("");
          });
          this.setState({
            syncValue: nextValue,
          });
        };

        render() {
          return (
            <div>
              <input ref={inputRef} onChange={this.handleChange} defaultValue="" />
              <p ref={asyncValueRef}>{this.state.asyncValue}</p>
              <p ref={syncValueRef}>{this.state.syncValue}</p>
            </div>
          );
        }
      }
      const root = ReactDOMClient.createRoot(container);
      await act(() => root.render(<Counter />));
      expect(asyncValueRef.current!.textContent).toBe("");
      expect(syncValueRef.current!.textContent).toBe("");

      await act(() => {
        setUntrackedInputValue.call(inputRef.current, "hello");
        inputRef.current!.dispatchEvent(new Event("input", { bubbles: true }));
        expect(asyncValueRef.current!.textContent).toBe("");
        expect(syncValueRef.current!.textContent).toBe("hello");
      });

      expect(asyncValueRef.current!.textContent).toBe("hello");
      expect(syncValueRef.current!.textContent).toBe("hello");
    });

    it("top-level updates are concurrent", async () => {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div>Hi</div>);
        expect(container.textContent).toEqual("");
      });
      expect(container.textContent).toEqual("Hi");

      await act(() => {
        root.render(<div>Bye</div>);
        expect(container.textContent).toEqual("Hi");
      });
      expect(container.textContent).toEqual("Bye");
    });

    it("deep updates (setState) are concurrent", async () => {
      let instance: InstanceType<typeof Component>;
      class Component extends React.Component<object, { step: number }> {
        state = { step: 0 };
        render() {
          instance = this;
          return <div>{this.state.step}</div>;
        }
      }

      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<Component />);
        expect(container.textContent).toEqual("");
      });
      expect(container.textContent).toEqual("0");

      await act(() => {
        instance!.setState({ step: 1 });
        expect(container.textContent).toEqual("0");
      });
      expect(container.textContent).toEqual("1");
    });

    it("flushSync flushes updates before end of the tick", async () => {
      let instance: InstanceType<typeof Component>;

      class Component extends React.Component<object, { text: string }> {
        state = { text: "" };
        push(value: string) {
          this.setState((state) => ({ text: state.text + value }));
        }
        componentDidUpdate() {
          log(this.state.text);
        }
        render() {
          instance = this;
          return <span>{this.state.text}</span>;
        }
      }

      const root = ReactDOMClient.createRoot(container);
      await act(() => root.render(<Component />));

      instance!.push("A");
      assertLog([]);
      expect(container.textContent).toEqual("");

      flushSync(() => {
        instance!.push("B");
        instance!.push("C");
        expect(container.textContent).toEqual("");
        assertLog([]);
      });
      expect(container.textContent).toEqual("ABC");
      assertLog(["ABC"]);

      await act(() => {
        instance!.push("D");
        expect(container.textContent).toEqual("ABC");
        assertLog([]);
      });
      assertLog(["ABCD"]);
      expect(container.textContent).toEqual("ABCD");
    });

    it("ignores discrete events on a pending removed element", async () => {
      const disableButtonRef = React.createRef<HTMLButtonElement>();
      const submitButtonRef = React.createRef<HTMLButtonElement>();

      function Form() {
        const [active, setActive] = React.useState(true);
        function disableForm() {
          setActive(false);
        }

        return (
          <div>
            <button onClick={disableForm} ref={disableButtonRef}>
              Disable
            </button>
            {active ? <button ref={submitButtonRef}>Submit</button> : null}
          </div>
        );
      }

      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Form />);
      });

      const disableButton = disableButtonRef.current!;
      expect(disableButton.tagName).toBe("BUTTON");

      const submitButton = submitButtonRef.current!;
      expect(submitButton.tagName).toBe("BUTTON");

      const firstEvent = document.createEvent("Event");
      firstEvent.initEvent("click", true, true);
      await act(() => {
        disableButton.dispatchEvent(firstEvent);
      });

      expect(submitButtonRef.current).toBe(null);
    });

    it("ignores discrete events on a pending removed event listener", async () => {
      const disableButtonRef = React.createRef<HTMLButtonElement>();
      const submitButtonRef = React.createRef<HTMLButtonElement>();

      let formSubmitted = false;

      function Form() {
        const [active, setActive] = React.useState(true);
        function disableForm() {
          setActive(false);
        }
        function submitForm() {
          formSubmitted = true;
        }
        function disabledSubmitForm() {}
        return (
          <div>
            <button onClick={disableForm} ref={disableButtonRef}>
              Disable
            </button>
            <button onClick={active ? submitForm : disabledSubmitForm} ref={submitButtonRef}>
              Submit
            </button>
          </div>
        );
      }

      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Form />);
      });

      const disableButton = disableButtonRef.current!;
      expect(disableButton.tagName).toBe("BUTTON");

      const firstEvent = document.createEvent("Event");
      firstEvent.initEvent("click", true, true);
      await act(() => {
        disableButton.dispatchEvent(firstEvent);
      });

      const submitButton = submitButtonRef.current!;
      expect(submitButton.tagName).toBe("BUTTON");

      const secondEvent = document.createEvent("Event");
      secondEvent.initEvent("click", true, true);
      await act(() => {
        submitButton.dispatchEvent(secondEvent);
      });

      expect(formSubmitted).toBe(false);
    });

    it("uses the newest discrete events on a pending changed event listener", async () => {
      const enableButtonRef = React.createRef<HTMLButtonElement>();
      const submitButtonRef = React.createRef<HTMLButtonElement>();

      let formSubmitted = false;

      function Form() {
        const [active, setActive] = React.useState(false);
        function enableForm() {
          setActive(true);
        }
        function submitForm() {
          formSubmitted = true;
        }
        return (
          <div>
            <button onClick={enableForm} ref={enableButtonRef}>
              Enable
            </button>
            <button onClick={active ? submitForm : undefined} ref={submitButtonRef}>
              Submit
            </button>
          </div>
        );
      }

      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Form />);
      });

      const enableButton = enableButtonRef.current!;
      expect(enableButton.tagName).toBe("BUTTON");

      const firstEvent = document.createEvent("Event");
      firstEvent.initEvent("click", true, true);
      await act(() => {
        enableButton.dispatchEvent(firstEvent);
      });

      const submitButton = submitButtonRef.current!;
      expect(submitButton.tagName).toBe("BUTTON");

      const secondEvent = document.createEvent("Event");
      secondEvent.initEvent("click", true, true);
      await act(() => {
        submitButton.dispatchEvent(secondEvent);
      });

      expect(formSubmitted).toBe(true);
    });
  });

  it("regression test: does not drop passive effects across roots (#17066)", async () => {
    const { useState, useEffect } = React;

    function App() {
      const [step, setStep] = useState(0);
      useEffect(() => {
        if (step < 3) {
          setStep(step + 1);
        }
      }, [step]);

      return step === 3 ? "Finished" : "Unresolved";
    }

    const containerA = document.createElement("div");
    const containerB = document.createElement("div");
    const containerC = document.createElement("div");
    const rootA = ReactDOMClient.createRoot(containerA);
    const rootB = ReactDOMClient.createRoot(containerB);
    const rootC = ReactDOMClient.createRoot(containerC);

    await act(() => {
      rootA.render(<App />);
      rootB.render(<App />);
      rootC.render(<App />);
    });

    expect(containerA.textContent).toEqual("Finished");
    expect(containerB.textContent).toEqual("Finished");
    expect(containerC.textContent).toEqual("Finished");
  });

  it("updates flush without yielding in the next event", async () => {
    const root = ReactDOMClient.createRoot(container);

    function Text({ text }: { text: string }) {
      log(text);
      return <>{text}</>;
    }

    root.render(
      <>
        <Text text="A" />
        <Text text="B" />
        <Text text="C" />
      </>,
    );

    expect(container.textContent).toEqual("");

    await act(() => {});
    assertLog(["A", "B", "C"]);
    expect(container.textContent).toEqual("ABC");
  });

  it("unmounted roots should never clear newer root content from a container", async () => {
    const ref = React.createRef<HTMLButtonElement>();

    function OldApp() {
      const [value, setValue] = React.useState("old");
      function hideOnClick() {
        setValue("update");
        flushSync(() => oldRoot.unmount());
      }
      return (
        <button onClick={hideOnClick} ref={ref}>
          {value}
        </button>
      );
    }

    function NewApp() {
      return <button ref={ref}>new</button>;
    }

    const oldRoot = ReactDOMClient.createRoot(container);
    await act(() => {
      oldRoot.render(<OldApp />);
    });

    ref.current!.click();

    expect(container.textContent).toBe("");

    const newRoot = ReactDOMClient.createRoot(container);
    flushSync(() => {
      newRoot.render(<NewApp />);
    });
    ref.current!.click();

    expect(container.textContent).toBe("new");
  });

  it("should synchronously render the transition lane scheduled in a popState", async () => {
    function App() {
      const [syncState, setSyncState] = React.useState(false);
      const [hasNavigated, setHasNavigated] = React.useState(false);
      function onPopstate() {
        log("popState");
        React.startTransition(() => {
          setHasNavigated(true);
        });
        setSyncState(true);
      }
      React.useEffect(() => {
        window.addEventListener("popstate", onPopstate);
        return () => {
          window.removeEventListener("popstate", onPopstate);
        };
      }, []);
      log(`render:${hasNavigated}/${syncState}`);
      return null;
    }
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<App />);
    });
    assertLog(["render:false/false"]);

    await act(async () => {
      const popStateEvent = new Event("popstate");
      window.event = popStateEvent;
      window.dispatchEvent(popStateEvent);
      queueMicrotask(() => {
        window.event = undefined;
      });
    });

    assertLog(["popState", "render:true/true"]);
    await act(() => {
      root.unmount();
    });
  });

  it("Should not flush transition lanes if there is no transition scheduled in popState", async () => {
    let setHasNavigated: (value: boolean) => void;
    function App() {
      const [syncState, setSyncState] = React.useState(false);
      const [hasNavigated, _setHasNavigated] = React.useState(false);
      setHasNavigated = _setHasNavigated;
      function onPopstate() {
        setSyncState(true);
      }

      React.useEffect(() => {
        window.addEventListener("popstate", onPopstate);
        return () => {
          window.removeEventListener("popstate", onPopstate);
        };
      }, []);

      log(`render:${hasNavigated}/${syncState}`);
      return null;
    }
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<App />);
    });
    assertLog(["render:false/false"]);

    React.startTransition(() => {
      setHasNavigated!(true);
    });
    await act(async () => {
      const popStateEvent = new Event("popstate");
      window.event = popStateEvent;
      window.dispatchEvent(popStateEvent);
      queueMicrotask(() => {
        window.event = undefined;
      });
    });
    assertLog(["render:true/true"]);
    await act(() => {
      root.unmount();
    });
  });

  it("transition lane in popState should be allowed to suspend", async () => {
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((res) => {
      resolvePromise = res;
    });

    function Text({ text }: { text: string }) {
      log(text);
      return <>{text}</>;
    }

    function App() {
      const [pathname, setPathname] = React.useState("/path/a");

      if (pathname !== "/path/a") {
        try {
          React.use(promise as Promise<unknown>);
        } catch (error) {
          log(`Suspend! [${pathname}]`);
          throw error;
        }
      }

      React.useEffect(() => {
        function onPopstate() {
          React.startTransition(() => {
            setPathname("/path/b");
          });
        }
        window.addEventListener("popstate", onPopstate);
        return () => window.removeEventListener("popstate", onPopstate);
      }, []);

      return (
        <>
          <Text text="Before" />
          <div>
            <Text text={pathname} />
          </div>
          <Text text="After" />
        </>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<App />);
    });
    assertLog(["Before", "/path/a", "After"]);

    const div = container.getElementsByTagName("div")[0];
    expect(div.textContent).toBe("/path/a");

    await act(async () => {
      const popStateEvent = new Event("popstate");
      window.event = popStateEvent;
      window.dispatchEvent(popStateEvent);
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
      window.event = undefined;
    });

    expect(div.textContent).toBe("/path/a");

    await act(async () => {
      resolvePromise!(undefined);
    });

    expect(div.textContent).toBe("/path/b");
    await act(() => {
      root.unmount();
    });
  });

  it("regression: useDeferredValue in popState leads to infinite deferral loop", async () => {
    let browserPathname = "/path/a";

    let setPathname: (value: string) => void;
    function App() {
      const [pathname, _setPathname] = React.useState("/path/a");
      setPathname = _setPathname;

      const deferredPathname = React.useDeferredValue(pathname);

      React.useEffect(() => {
        function onPopstate() {
          React.startTransition(() => {
            _setPathname(browserPathname);
          });
        }
        window.addEventListener("popstate", onPopstate);
        return () => window.removeEventListener("popstate", onPopstate);
      }, []);

      return `Current:  ${pathname}\nDeferred: ${deferredPathname}`;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<App />);
    });

    setPathname!(browserPathname);

    for (let i = 0; i < 50; i++) {
      await act(async () => {
        browserPathname = browserPathname === "/path/a" ? "/path/b" : "/path/a";
        const popStateEvent = new Event("popstate");
        window.event = popStateEvent;
        window.dispatchEvent(popStateEvent);
        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        window.event = undefined;
      });
    }
  });

  it("regression: infinite deferral loop caused by unstable useDeferredValue input", async () => {
    function Text({ text }: { text: string }) {
      log(text);
      return <>{text}</>;
    }

    let iterationCount = 0;
    function App() {
      const [pathname, setPathname] = React.useState("/path/a");
      const { value: deferredPathname } = React.useDeferredValue({
        value: pathname,
      });
      if (iterationCount++ > 100) {
        throw new Error("Infinite loop detected");
      }
      React.useEffect(() => {
        function onPopstate() {
          React.startTransition(() => {
            setPathname("/path/b");
          });
        }
        window.addEventListener("popstate", onPopstate);
        return () => window.removeEventListener("popstate", onPopstate);
      }, []);

      return <Text text={deferredPathname} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });
    expect(container.textContent).toBe("/path/a");

    await act(async () => {
      const popStateEvent = new Event("popstate");
      window.event = popStateEvent;
      window.dispatchEvent(popStateEvent);
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
      window.event = undefined;
    });

    expect(container.textContent).toBe("/path/b");
    await act(() => {
      root.unmount();
    });
  });
});
