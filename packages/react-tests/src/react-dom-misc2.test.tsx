import React from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, afterEach } from "vitest";
import { act } from "./utils";

describe("ReactDOM misc2", () => {
  let container: HTMLDivElement;

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it("should bubble onSubmit", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    let submitCount = 0;
    let buttonRef: HTMLInputElement | null = null;

    const Parent = () => (
      <div
        onSubmit={(event) => {
          event.preventDefault();
          submitCount++;
        }}
      >
        <Child />
      </div>
    );

    const Child = () => (
      <form>
        <input
          type="submit"
          ref={(button) => {
            buttonRef = button;
          }}
        />
      </form>
    );

    const root = createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });
    buttonRef!.click();
    expect(submitCount).toBe(1);
  });

  it("allows a DOM element to be used with a string", async () => {
    container = document.createElement("div");
    const root = createRoot(container);
    const element = React.createElement("div", { className: "foo" });
    await act(() => {
      root.render(element);
    });

    const node = container.firstChild as HTMLElement;
    expect(node.tagName).toBe("DIV");
  });

  it("should allow children to be passed as an argument", async () => {
    container = document.createElement("div");
    const root = createRoot(container);
    await act(() => {
      root.render(React.createElement("div", null, "child"));
    });

    const argNode = container.firstChild as HTMLElement;
    expect(argNode.innerHTML).toBe("child");
  });

  it("should overwrite props.children with children argument", async () => {
    container = document.createElement("div");
    const root = createRoot(container);
    await act(() => {
      root.render(React.createElement("div", { children: "fakechild" }, "child"));
    });

    const conflictNode = container.firstChild as HTMLElement;
    expect(conflictNode.innerHTML).toBe("child");
  });

  it("should purge the DOM cache when removing nodes", async () => {
    let currentContainer = document.createElement("div");
    let root = createRoot(currentContainer);
    await act(() => {
      root.render(
        <div>
          <div key="theDog" className="dog" />,
          <div key="theBird" className="bird" />
        </div>,
      );
    });

    currentContainer = document.createElement("div");
    root = createRoot(currentContainer);
    await act(() => {
      root.render(
        <div>
          <div key="theDog" className="dogbeforedelete" />,
          <div key="theBird" className="bird" />,
        </div>,
      );
    });

    currentContainer = document.createElement("div");
    root = createRoot(currentContainer);
    await act(() => {
      root.render(
        <div>
          <div key="theBird" className="bird" />,
        </div>,
      );
    });

    currentContainer = document.createElement("div");
    root = createRoot(currentContainer);
    await act(() => {
      root.render(
        <div>
          <div key="theDog" className="dog" />,
          <div key="theBird" className="bird" />,
        </div>,
      );
    });

    currentContainer = document.createElement("div");
    root = createRoot(currentContainer);
    await act(() => {
      root.render(
        <div>
          <div key="theDog" className="bigdog" />,
          <div key="theBird" className="bird" />,
        </div>,
      );
    });

    const myDiv = currentContainer.firstChild as HTMLElement;
    const dog = myDiv.childNodes[0] as HTMLElement;
    expect(dog.className).toBe("bigdog");
  });

  it("preserves focus", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    let inputElement: HTMLInputElement | null = null;
    let secondInputElement: HTMLInputElement | null = null;
    const eventLog: string[] = [];

    class FocusPreserver extends React.Component<{ showTwo: boolean }> {
      render() {
        return (
          <div>
            <input
              id="one"
              ref={(reference) => {
                inputElement = inputElement || reference;
              }}
            />
            {this.props.showTwo && (
              <input
                id="two"
                ref={(reference) => {
                  secondInputElement = secondInputElement || reference;
                }}
              />
            )}
          </div>
        );
      }

      componentDidUpdate() {
        expect(document.activeElement!.id).toBe("one");
        secondInputElement!.focus();
        expect(document.activeElement!.id).toBe("two");
        eventLog.push("input2 focused");
      }
    }

    const root = createRoot(container);
    await act(() => {
      root.render(<FocusPreserver showTwo={false} />);
    });
    inputElement!.focus();

    const div = container.firstChild as HTMLDivElement;
    (["appendChild", "insertBefore"] as const).forEach((methodName) => {
      const originalMethod = div[methodName].bind(div);
      (div as any)[methodName] = function (...args: any[]) {
        if (inputElement) {
          inputElement.blur();
          expect(document.activeElement!.tagName).toBe("BODY");
          eventLog.push("input2 inserted");
        }
        return originalMethod(...args);
      };
    });

    expect(document.activeElement!.id).toBe("one");
    await act(() => {
      root.render(<FocusPreserver showTwo={true} />);
    });
    expect(document.activeElement!.id).toBe("two");
    expect(eventLog).toEqual(["input2 inserted", "input2 focused"]);
  });

  it("calls focus() on autoFocus elements after they have been mounted to the DOM", async () => {
    const originalFocus = HTMLElement.prototype.focus;

    try {
      let focusedElement: HTMLElement | null = null;
      let inputFocusedAfterMount = false;

      HTMLElement.prototype.focus = function () {
        focusedElement = this;
        inputFocusedAfterMount = Boolean(this.parentNode);
      };

      container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);
      await act(() => {
        root.render(
          <div>
            <h1>Auto-focus Test</h1>
            <input autoFocus={true} />
            <p>The above input should be focused after mount.</p>
          </div>,
        );
      });

      expect(inputFocusedAfterMount).toBe(true);
      expect(focusedElement!.tagName).toBe("INPUT");
    } finally {
      HTMLElement.prototype.focus = originalFocus;
    }
  });

  it("shouldn't fire duplicate event handler while handling other nested dispatch", async () => {
    const actualEvents: string[] = [];

    class Wrapper extends React.Component {
      ref1: HTMLDivElement | null = null;
      ref2: HTMLDivElement | null = null;

      componentDidMount() {
        this.ref1!.click();
      }

      render() {
        return (
          <div>
            <div
              onClick={() => {
                actualEvents.push("1st node clicked");
                this.ref2!.click();
              }}
              ref={(reference) => {
                this.ref1 = reference;
              }}
            />
            <div
              onClick={() => {
                actualEvents.push("2nd node clicked imperatively from 1st's handler");
              }}
              ref={(reference) => {
                this.ref2 = reference;
              }}
            />
          </div>
        );
      }
    }

    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(() => {
      root.render(<Wrapper />);
    });

    expect(actualEvents).toEqual([
      "1st node clicked",
      "2nd node clicked imperatively from 1st's handler",
    ]);
  });
});
