// @vitest-environment jsdom
import React from "react";
import * as ReactDOMClient from "react-dom/client";
import ReactDOM, { flushSync } from "react-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, log, assertLog } from "./utils";

describe("ReactBrowserEventEmitter", () => {
  let idCallOrder: any[];
  let container: HTMLDivElement;

  let GRANDPARENT: HTMLDivElement | null;
  let PARENT: HTMLDivElement | null;
  let CHILD: HTMLDivElement | null;
  let BUTTON: HTMLButtonElement | null;

  let renderTree: () => Promise<void>;
  let putListener: (
    node: Element | null,
    eventName: string,
    listener: (...args: any[]) => any,
  ) => Promise<void>;
  let deleteAllListeners: (node: Element | null) => Promise<void>;

  const recordID = (identifier: any) => {
    idCallOrder.push(identifier);
  };
  const recordIDAndStopPropagation = (identifier: any, event: any) => {
    recordID(identifier);
    event.stopPropagation();
  };
  const recordIDAndReturnFalse = (identifier: any) => {
    recordID(identifier);
    return false;
  };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);

    GRANDPARENT = null;
    PARENT = null;
    CHILD = null;
    BUTTON = null;

    let grandparentProps: Record<string, any> = {};
    let parentProps: Record<string, any> = {};
    let childProps: Record<string, any> = {};
    let buttonProps: Record<string, any> = {};

    const ChildComponent = (props: Record<string, any>) => {
      return (
        <div
          ref={(element) => {
            CHILD = element;
          }}
          {...props}
        />
      );
    };

    class ChildWrapper extends React.PureComponent<Record<string, any>> {
      render() {
        return <ChildComponent {...this.props} />;
      }
    }

    const root = ReactDOMClient.createRoot(container);

    renderTree = async () => {
      await act(() => {
        root.render(
          <div
            ref={(element) => {
              GRANDPARENT = element;
            }}
            {...grandparentProps}
          >
            <div
              ref={(element) => {
                PARENT = element;
              }}
              {...parentProps}
            >
              <ChildWrapper {...childProps} />
              <button
                disabled={true}
                ref={(element) => {
                  BUTTON = element;
                }}
                {...buttonProps}
              />
            </div>
          </div>,
        );
      });
    };

    putListener = async (node, eventName, listener) => {
      if (node === CHILD) childProps[eventName] = listener;
      else if (node === PARENT) parentProps[eventName] = listener;
      else if (node === GRANDPARENT) grandparentProps[eventName] = listener;
      else if (node === BUTTON) buttonProps[eventName] = listener;
      await renderTree();
    };

    deleteAllListeners = async (node) => {
      if (node === CHILD) childProps = {};
      else if (node === PARENT) parentProps = {};
      else if (node === GRANDPARENT) grandparentProps = {};
      else if (node === BUTTON) buttonProps = {};
      await renderTree();
    };

    idCallOrder = [];
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("should bubble simply", async () => {
    await renderTree();
    await putListener(CHILD, "onClick", recordID.bind(null, CHILD));
    await putListener(PARENT, "onClick", recordID.bind(null, PARENT));
    await putListener(GRANDPARENT, "onClick", recordID.bind(null, GRANDPARENT));
    await act(() => {
      CHILD!.click();
    });
    expect(idCallOrder.length).toBe(3);
    expect(idCallOrder[0]).toBe(CHILD);
    expect(idCallOrder[1]).toBe(PARENT);
    expect(idCallOrder[2]).toBe(GRANDPARENT);
  });

  it("should bubble to the right handler after an update", async () => {
    await renderTree();
    await putListener(GRANDPARENT, "onClick", recordID.bind(null, "GRANDPARENT"));
    await putListener(PARENT, "onClick", recordID.bind(null, "PARENT"));
    await putListener(CHILD, "onClick", recordID.bind(null, "CHILD"));
    await act(() => {
      CHILD!.click();
    });
    expect(idCallOrder).toEqual(["CHILD", "PARENT", "GRANDPARENT"]);

    idCallOrder = [];

    await putListener(GRANDPARENT, "onClick", recordID.bind(null, "UPDATED_GRANDPARENT"));
    await act(() => {
      CHILD!.click();
    });
    expect(idCallOrder).toEqual(["CHILD", "PARENT", "UPDATED_GRANDPARENT"]);
  });

  it("should continue bubbling if an error is thrown", async () => {
    await renderTree();
    await putListener(CHILD, "onClick", recordID.bind(null, CHILD));
    await putListener(PARENT, "onClick", () => {
      recordID(PARENT);
      throw new Error("Handler interrupted");
    });
    await putListener(GRANDPARENT, "onClick", recordID.bind(null, GRANDPARENT));
    const errorHandler = vi.fn((event: ErrorEvent) => {
      event.preventDefault();
    });
    window.addEventListener("error", errorHandler);
    try {
      CHILD!.click();
      expect(idCallOrder.length).toBe(3);
      expect(idCallOrder[0]).toBe(CHILD);
      expect(idCallOrder[1]).toBe(PARENT);
      expect(idCallOrder[2]).toBe(GRANDPARENT);
      expect(errorHandler).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener("error", errorHandler);
    }
  });

  it("should set currentTarget", async () => {
    await renderTree();
    await putListener(CHILD, "onClick", (event: any) => {
      recordID(CHILD);
      expect(event.currentTarget).toBe(CHILD);
    });
    await putListener(PARENT, "onClick", (event: any) => {
      recordID(PARENT);
      expect(event.currentTarget).toBe(PARENT);
    });
    await putListener(GRANDPARENT, "onClick", (event: any) => {
      recordID(GRANDPARENT);
      expect(event.currentTarget).toBe(GRANDPARENT);
    });
    await act(() => {
      CHILD!.click();
    });
    expect(idCallOrder.length).toBe(3);
    expect(idCallOrder[0]).toBe(CHILD);
    expect(idCallOrder[1]).toBe(PARENT);
    expect(idCallOrder[2]).toBe(GRANDPARENT);
  });

  it("should support stopPropagation()", async () => {
    await renderTree();
    await putListener(CHILD, "onClick", recordID.bind(null, CHILD));
    await putListener(PARENT, "onClick", recordIDAndStopPropagation.bind(null, PARENT));
    await putListener(GRANDPARENT, "onClick", recordID.bind(null, GRANDPARENT));
    await act(() => {
      CHILD!.click();
    });
    expect(idCallOrder.length).toBe(2);
    expect(idCallOrder[0]).toBe(CHILD);
    expect(idCallOrder[1]).toBe(PARENT);
  });

  it("should support overriding isPropagationStopped()", async () => {
    await renderTree();
    await putListener(CHILD, "onClick", recordID.bind(null, CHILD));
    await putListener(PARENT, "onClick", (event: any) => {
      recordID(PARENT);
      event.isPropagationStopped = () => true;
    });
    await putListener(GRANDPARENT, "onClick", recordID.bind(null, GRANDPARENT));
    await act(() => {
      CHILD!.click();
    });
    expect(idCallOrder.length).toBe(2);
    expect(idCallOrder[0]).toBe(CHILD);
    expect(idCallOrder[1]).toBe(PARENT);
  });

  it("should stop after first dispatch if stopPropagation", async () => {
    await renderTree();
    await putListener(CHILD, "onClick", recordIDAndStopPropagation.bind(null, CHILD));
    await putListener(PARENT, "onClick", recordID.bind(null, PARENT));
    await putListener(GRANDPARENT, "onClick", recordID.bind(null, GRANDPARENT));
    await act(() => {
      CHILD!.click();
    });
    expect(idCallOrder.length).toBe(1);
    expect(idCallOrder[0]).toBe(CHILD);
  });

  it("should not stopPropagation if false is returned", async () => {
    await renderTree();
    await putListener(CHILD, "onClick", recordIDAndReturnFalse.bind(null, CHILD));
    await putListener(PARENT, "onClick", recordID.bind(null, PARENT));
    await putListener(GRANDPARENT, "onClick", recordID.bind(null, GRANDPARENT));
    await act(() => {
      CHILD!.click();
    });
    expect(idCallOrder.length).toBe(3);
    expect(idCallOrder[0]).toBe(CHILD);
    expect(idCallOrder[1]).toBe(PARENT);
    expect(idCallOrder[2]).toBe(GRANDPARENT);
  });

  it("should invoke handlers that were removed while bubbling", async () => {
    await renderTree();
    const handleParentClick = vi.fn();
    const handleChildClick = async () => {
      await deleteAllListeners(PARENT);
    };
    await putListener(CHILD, "onClick", handleChildClick);
    await putListener(PARENT, "onClick", handleParentClick);
    await act(() => {
      CHILD!.click();
    });
    expect(handleParentClick).toHaveBeenCalledTimes(1);
  });

  it("should not invoke newly inserted handlers while bubbling", async () => {
    await renderTree();
    const handleParentClick = vi.fn();
    const handleChildClick = async () => {
      await putListener(PARENT, "onClick", handleParentClick);
    };
    await putListener(CHILD, "onClick", handleChildClick);
    await act(() => {
      CHILD!.click();
    });
    expect(handleParentClick).toHaveBeenCalledTimes(0);
  });
});

describe("ReactDOMNativeEventHeuristic", () => {
  let container: HTMLDivElement;

  const dispatchAndSetCurrentEvent = (element: Element, event: Event) => {
    try {
      (window as any).event = event;
      element.dispatchEvent(event);
    } finally {
      (window as any).event = undefined;
    }
  };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("ignores discrete events on a pending removed element", async () => {
    const disableButtonRef = React.createRef<HTMLButtonElement>();
    const submitButtonRef = React.createRef<HTMLButtonElement>();

    const Form = () => {
      const [active, setActive] = React.useState(true);

      React.useLayoutEffect(() => {
        disableButtonRef.current!.onclick = disableForm;
      });

      const disableForm = () => {
        setActive(false);
      };

      return (
        <div>
          <button ref={disableButtonRef}>Disable</button>
          {active ? <button ref={submitButtonRef}>Submit</button> : null}
        </div>
      );
    };

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Form />);
    });

    const disableButton = disableButtonRef.current!;
    expect(disableButton.tagName).toBe("BUTTON");

    await act(async () => {
      const firstEvent = document.createEvent("Event");
      firstEvent.initEvent("click", true, true);
      dispatchAndSetCurrentEvent(disableButton, firstEvent);
    });
    expect(submitButtonRef.current).toBe(null);
  });

  it("ignores discrete events on a pending removed event listener", async () => {
    const disableButtonRef = React.createRef<HTMLButtonElement>();
    const submitButtonRef = React.createRef<HTMLButtonElement>();

    let formSubmitted = false;

    const Form = () => {
      const [active, setActive] = React.useState(true);

      React.useLayoutEffect(() => {
        disableButtonRef.current!.onclick = disableForm;
        submitButtonRef.current!.onclick = active ? submitForm : disabledSubmitForm;
      });

      const disableForm = () => {
        setActive(false);
      };

      const submitForm = () => {
        formSubmitted = true;
      };

      const disabledSubmitForm = () => {};

      return (
        <div>
          <button ref={disableButtonRef}>Disable</button>
          <button ref={submitButtonRef}>Submit</button>
        </div>
      );
    };

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<Form />));

    const disableButton = disableButtonRef.current!;
    expect(disableButton.tagName).toBe("BUTTON");

    const firstEvent = document.createEvent("Event");
    firstEvent.initEvent("click", true, true);
    await act(() => {
      dispatchAndSetCurrentEvent(disableButton, firstEvent);

      const submitButton = submitButtonRef.current!;
      expect(submitButton.tagName).toBe("BUTTON");

      flushSync(() => {});

      const secondEvent = document.createEvent("Event");
      secondEvent.initEvent("click", true, true);
      dispatchAndSetCurrentEvent(submitButton, secondEvent);
    });

    expect(formSubmitted).toBe(false);
  });

  it("uses the newest discrete events on a pending changed event listener", async () => {
    const enableButtonRef = React.createRef<HTMLButtonElement>();
    const submitButtonRef = React.createRef<HTMLButtonElement>();

    let formSubmitted = false;

    const Form = () => {
      const [active, setActive] = React.useState(false);

      React.useLayoutEffect(() => {
        enableButtonRef.current!.onclick = enableForm;
        submitButtonRef.current!.onclick = active ? submitForm : null;
      });

      const enableForm = () => {
        setActive(true);
      };

      const submitForm = () => {
        formSubmitted = true;
      };

      return (
        <div>
          <button ref={enableButtonRef}>Enable</button>
          <button ref={submitButtonRef}>Submit</button>
        </div>
      );
    };

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<Form />));

    const enableButton = enableButtonRef.current!;
    expect(enableButton.tagName).toBe("BUTTON");

    await act(() => {
      const firstEvent = document.createEvent("Event");
      firstEvent.initEvent("click", true, true);
      dispatchAndSetCurrentEvent(enableButton, firstEvent);

      const submitButton = submitButtonRef.current!;
      expect(submitButton.tagName).toBe("BUTTON");

      flushSync(() => {});

      const secondEvent = document.createEvent("Event");
      secondEvent.initEvent("click", true, true);
      dispatchAndSetCurrentEvent(submitButton, secondEvent);
    });

    expect(formSubmitted).toBe(true);
  });

  it("mouse over should be user-blocking but not discrete", async () => {
    const root = ReactDOMClient.createRoot(container);

    const target = React.createRef<HTMLDivElement>();
    const Foo = () => {
      const [isHover, setHover] = React.useState(false);
      React.useLayoutEffect(() => {
        target.current!.onmouseover = () => setHover(true);
      });
      return <div ref={target}>{isHover ? "hovered" : "not hovered"}</div>;
    };

    await act(() => {
      root.render(<Foo />);
    });
    expect(container.textContent).toEqual("not hovered");

    await act(() => {
      const mouseOverEvent = document.createEvent("MouseEvents");
      mouseOverEvent.initEvent("mouseover", true, true);
      dispatchAndSetCurrentEvent(target.current!, mouseOverEvent);

      flushSync(() => {});
      expect(container.textContent).toEqual("not hovered");
    });
    expect(container.textContent).toEqual("hovered");
  });

  it("mouse enter should be user-blocking but not discrete", async () => {
    const root = ReactDOMClient.createRoot(container);

    const target = React.createRef<HTMLDivElement>();
    const Foo = () => {
      const [isHover, setHover] = React.useState(false);
      React.useLayoutEffect(() => {
        target.current!.onmouseenter = () => setHover(true);
      });
      return <div ref={target}>{isHover ? "hovered" : "not hovered"}</div>;
    };

    await act(() => {
      root.render(<Foo />);
    });
    expect(container.textContent).toEqual("not hovered");

    await act(() => {
      const mouseEnterEvent = document.createEvent("MouseEvents");
      mouseEnterEvent.initEvent("mouseenter", true, true);
      dispatchAndSetCurrentEvent(target.current!, mouseEnterEvent);

      flushSync(() => {});
      expect(container.textContent).toEqual("not hovered");
    });
    expect(container.textContent).toEqual("hovered");
  });

  it("should batch inside native events", async () => {
    const root = ReactDOMClient.createRoot(container);

    const target = React.createRef<HTMLDivElement>();
    const Foo = () => {
      const [count, setCount] = React.useState(0);
      const countRef = React.useRef(-1);

      React.useLayoutEffect(() => {
        countRef.current = count;
        target.current!.onclick = () => {
          setCount(countRef.current + 1);
          setCount(countRef.current + 1);
        };
      });
      return <div ref={target}>Count: {count}</div>;
    };

    await act(() => {
      root.render(<Foo />);
    });
    expect(container.textContent).toEqual("Count: 0");

    await act(async () => {
      const pressEvent = document.createEvent("Event");
      pressEvent.initEvent("click", true, true);
      dispatchAndSetCurrentEvent(target.current!, pressEvent);
    });
    expect(container.textContent).toEqual("Count: 1");
  });

  it("should not flush discrete events at the end of outermost batchedUpdates", async () => {
    const root = ReactDOMClient.createRoot(container);

    let target: HTMLDivElement | null = null;
    const Foo = () => {
      const [count, setCount] = React.useState(0);
      return (
        <div
          ref={(element) => {
            target = element;
            if (target !== null) {
              element!.onclick = () => {
                (ReactDOM as any).unstable_batchedUpdates(() => {
                  setCount(count + 1);
                });
                log(container.textContent + " [after batchedUpdates]");
              };
            }
          }}
        >
          Count: {count}
        </div>
      );
    };

    await act(() => {
      root.render(<Foo />);
    });
    expect(container.textContent).toEqual("Count: 0");

    await act(async () => {
      const pressEvent = document.createEvent("Event");
      pressEvent.initEvent("click", true, true);
      dispatchAndSetCurrentEvent(target!, pressEvent);
      assertLog(["Count: 0 [after batchedUpdates]"]);
      expect(container.textContent).toEqual("Count: 0");
    });
    expect(container.textContent).toEqual("Count: 1");
  });
});

describe("InvalidEventListeners", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("should prevent non-function listeners, at dispatch", async () => {
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div onClick={"not a function" as any} />);
    });

    const node = container.firstChild!;

    const uncaughtErrors: Error[] = [];
    const handleWindowError = (event: ErrorEvent) => {
      uncaughtErrors.push(event.error);
      event.preventDefault();
    };
    window.addEventListener("error", handleWindowError);
    try {
      node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    } finally {
      window.removeEventListener("error", handleWindowError);
    }
    expect(uncaughtErrors.length).toBe(1);
    expect(uncaughtErrors[0]).toEqual(
      expect.objectContaining({
        message: expect.stringContaining("Expected `onClick` listener to be a function"),
      }),
    );
  });

  it("should not prevent null listeners, at dispatch", async () => {
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div onClick={undefined} />);
    });

    const node = container.firstChild!;
    await act(() => {
      node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  });
});

describe("ReactDOMNestedEvents", () => {
  it("nested event dispatches should not cause updates to flush", async () => {
    const buttonRef = React.createRef<HTMLButtonElement>();

    const App = () => {
      const [isClicked, setIsClicked] = React.useState(false);
      const [isFocused, setIsFocused] = React.useState(false);

      const onClick = () => {
        setIsClicked(true);
        const element = buttonRef.current!;
        element.focus();
        log("Value right after focus call: " + element.innerHTML);
      };

      const onFocus = () => {
        setIsFocused(true);
      };

      return (
        <button ref={buttonRef} onFocus={onFocus} onClick={onClick}>
          {`Clicked: ${isClicked}, Focused: ${isFocused}`}
        </button>
      );
    };

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<App />);
    });
    expect(buttonRef.current!.innerHTML).toEqual("Clicked: false, Focused: false");

    await act(() => {
      buttonRef.current!.click();
    });
    assertLog(["Value right after focus call: Clicked: false, Focused: false"]);
    expect(buttonRef.current!.innerHTML).toEqual("Clicked: true, Focused: true");

    document.body.removeChild(container);
  });
});

describe("ReactEventIndependence", () => {
  it("does not crash with other react inside", async () => {
    let clicks = 0;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);
    try {
      await act(() => {
        root.render(
          <div
            onClick={() => clicks++}
            dangerouslySetInnerHTML={{
              __html: '<button data-reactid=".z">click me</div>',
            }}
          />,
        );
      });
      (container.firstElementChild as HTMLElement).click();
      expect(clicks).toBe(1);
    } finally {
      document.body.removeChild(container);
    }
  });

  it("does not crash with other react outside", async () => {
    let clicks = 0;
    const outer = document.createElement("div");
    document.body.appendChild(outer);
    const root = ReactDOMClient.createRoot(outer);
    try {
      outer.setAttribute("data-reactid", ".z");
      await act(() => {
        root.render(<button onClick={() => clicks++}>click me</button>);
      });
      (outer.firstElementChild as HTMLElement).click();
      expect(clicks).toBe(1);
    } finally {
      document.body.removeChild(outer);
    }
  });

  it("does not fire when event fired on unmounted tree", async () => {
    let clicks = 0;
    const container = document.createElement("div");
    document.body.appendChild(container);
    try {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<button onClick={() => clicks++}>click me</button>);
      });

      const button = container.firstChild as HTMLButtonElement;
      root.unmount();
      button.click();

      expect(clicks).toBe(0);
    } finally {
      document.body.removeChild(container);
    }
  });
});
