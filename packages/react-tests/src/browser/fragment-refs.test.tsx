import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { createPortal, flushSync } from "react-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "../utils";

declare module "react" {
  interface FragmentProps {
    ref?: React.Ref<any>;
  }
}

const Fragment = React.Fragment;
const Activity = (React as any).Activity as React.ComponentType<{
  mode: "visible" | "hidden";
  children?: React.ReactNode;
}>;

const Wrapper = ({ children }: { children: React.ReactNode }) => children;

const supportsFragmentRefs = (() => {
  try {
    const ref = React.createRef();
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    flushSync(() => {
      root.render(
        <Fragment ref={ref}>
          <div />
        </Fragment>,
      );
    });
    const isSupported = ref.current !== null;
    flushSync(() => {
      root.render(null);
    });
    return isSupported;
  } catch {
    return false;
  }
})();

const supportsFragmentRefsInstanceHandles = (() => {
  if (!supportsFragmentRefs) return false;
  try {
    const ref = React.createRef<any>();
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    flushSync(() => {
      root.render(
        <Fragment ref={ref}>
          <div id="__frag_test" />
        </Fragment>,
      );
    });
    const child = container.querySelector("#__frag_test") as any;
    const isSupported = child?.reactFragments instanceof Set;
    flushSync(() => {
      root.render(null);
    });
    return isSupported;
  } catch {
    return false;
  }
})();

const supportsFragmentRefsScrollIntoView = (() => {
  if (!supportsFragmentRefs) return false;
  try {
    const ref = React.createRef<any>();
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    flushSync(() => {
      root.render(
        <Fragment ref={ref}>
          <div />
        </Fragment>,
      );
    });
    const isSupported = typeof ref.current?.scrollIntoView === "function";
    flushSync(() => {
      root.render(null);
    });
    return isSupported;
  } catch {
    return false;
  }
})();

const supportsFragmentRefsTextNodes = (() => {
  if (!supportsFragmentRefs) return false;
  try {
    const ref = React.createRef<any>();
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    flushSync(() => {
      root.render(
        <div>
          <Fragment ref={ref}>Hello</Fragment>
        </div>,
      );
    });
    const rects = ref.current?.getClientRects?.();
    const isSupported = rects !== undefined && rects.length > 0;
    flushSync(() => {
      root.render(null);
    });
    return isSupported;
  } catch {
    return false;
  }
})();

interface IntersectionMocks {
  originalIntersectionObserver: typeof IntersectionObserver | undefined;
  observers: Map<IntersectionObserver, Set<Element>>;
}

let intersectionMocks: IntersectionMocks;

const mockIntersectionObserver = () => {
  const observers = new Map<IntersectionObserver, Set<Element>>();
  intersectionMocks = {
    originalIntersectionObserver: globalThis.IntersectionObserver,
    observers,
  };

  (globalThis as any).IntersectionObserver = class MockIntersectionObserver {
    callback: IntersectionObserverCallback;
    elements: Set<Element>;

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
      this.elements = new Set();
      observers.set(this as unknown as IntersectionObserver, this.elements);
    }

    observe(element: Element) {
      this.elements.add(element);
    }

    unobserve(element: Element) {
      this.elements.delete(element);
    }

    disconnect() {
      this.elements.clear();
    }
  };
};

const restoreIntersectionObserver = () => {
  if (intersectionMocks?.originalIntersectionObserver) {
    globalThis.IntersectionObserver = intersectionMocks.originalIntersectionObserver;
  }
};

const simulateIntersection = (...entries: Array<[Element, DOMRectInit, number]>) => {
  for (const [observer, elements] of intersectionMocks.observers) {
    const matchingEntries = entries
      .filter(([element]) => elements.has(element))
      .map(([target, rect, intersectionRatio]) => ({
        target,
        boundingClientRect: rect as DOMRectReadOnly,
        intersectionRatio,
        intersectionRect: rect as DOMRectReadOnly,
        isIntersecting: intersectionRatio > 0,
        rootBounds: null,
        time: Date.now(),
      }));
    if (matchingEntries.length > 0) {
      (observer as any).callback(matchingEntries as IntersectionObserverEntry[], observer);
    }
  }
};

const setClientRects = (element: Element, rects: DOMRectInit[]) => {
  (element as any).getClientRects = () =>
    rects.map((rect) => new DOMRect(rect.x ?? 0, rect.y ?? 0, rect.width ?? 0, rect.height ?? 0));
};

const mockRangeClientRects = (rects: DOMRectInit[]) => {
  const originalCreateRange = document.createRange;
  document.createRange = () => {
    const range = originalCreateRange.call(document);
    range.getClientRects = () =>
      rects.map(
        (rect) => new DOMRect(rect.x ?? 0, rect.y ?? 0, rect.width ?? 0, rect.height ?? 0),
      ) as unknown as DOMRectList;
    range.getBoundingClientRect = () =>
      new DOMRect(rects[0]?.x ?? 0, rects[0]?.y ?? 0, rects[0]?.width ?? 0, rects[0]?.height ?? 0);
    return range;
  };
  return () => {
    document.createRange = originalCreateRange;
  };
};

describe.skipIf(!supportsFragmentRefs)("FragmentRefs", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.innerHTML = "";
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("attaches a ref to Fragment", async () => {
    const fragmentRef = React.createRef<any>();
    const root = ReactDOMClient.createRoot(container);

    await act(() =>
      root.render(
        <div id="parent">
          <Fragment ref={fragmentRef}>
            <div id="child">Hi</div>
          </Fragment>
        </div>,
      ),
    );
    expect(container.innerHTML).toEqual('<div id="parent"><div id="child">Hi</div></div>');
    expect(fragmentRef.current).not.toBe(null);
  });

  it("accepts a ref callback", async () => {
    let fragmentRef: any;
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(
        <Fragment ref={(ref: any) => (fragmentRef = ref)}>
          <div id="child">Hi</div>
        </Fragment>,
      );
    });

    expect(fragmentRef._fragmentFiber).toBeTruthy();
  });

  it("is available in effects", async () => {
    const Test = () => {
      const fragmentRef = React.useRef(null);
      React.useLayoutEffect(() => {
        expect(fragmentRef.current).not.toBe(null);
      });
      React.useEffect(() => {
        expect(fragmentRef.current).not.toBe(null);
      });
      return (
        <Fragment ref={fragmentRef}>
          <div />
        </Fragment>
      );
    };

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<Test />));
  });

  describe.skipIf(!supportsFragmentRefsInstanceHandles)("instance handles", () => {
    it("attaches fragment handles to nodes", async () => {
      const fragmentParentRef = React.createRef<any>();
      const fragmentRef = React.createRef<any>();

      const Test = ({ show }: { show: boolean }) => {
        return (
          <Fragment ref={fragmentParentRef}>
            <Fragment ref={fragmentRef}>
              <div id="childA">A</div>
              <div id="childB">B</div>
            </Fragment>
            <div id="childC">C</div>
            {show && <div id="childD">D</div>}
          </Fragment>
        );
      };

      const root = ReactDOMClient.createRoot(container);
      await act(() => root.render(<Test show={false} />));

      const childA = document.querySelector("#childA") as any;
      const childB = document.querySelector("#childB") as any;
      const childC = document.querySelector("#childC") as any;

      expect(childA.reactFragments.has(fragmentRef.current)).toBe(true);
      expect(childB.reactFragments.has(fragmentRef.current)).toBe(true);
      expect(childC.reactFragments.has(fragmentRef.current)).toBe(false);
      expect(childA.reactFragments.has(fragmentParentRef.current)).toBe(true);
      expect(childB.reactFragments.has(fragmentParentRef.current)).toBe(true);
      expect(childC.reactFragments.has(fragmentParentRef.current)).toBe(true);

      await act(() => root.render(<Test show={true} />));

      const childD = document.querySelector("#childD") as any;
      expect(childD.reactFragments.has(fragmentRef.current)).toBe(false);
      expect(childD.reactFragments.has(fragmentParentRef.current)).toBe(true);
    });
  });

  describe("focus methods", () => {
    describe("focus()", () => {
      it("focuses the first focusable child", async () => {
        const fragmentRef = React.createRef<any>();
        const root = ReactDOMClient.createRoot(container);

        const Test = () => {
          return (
            <div>
              <Fragment ref={fragmentRef}>
                <div id="child-a" />
                <style>{`#child-c {}`}</style>
                <a id="child-b" href="/">
                  B
                </a>
                <a id="child-c" href="/">
                  C
                </a>
              </Fragment>
            </div>
          );
        };

        await act(() => {
          root.render(<Test />);
        });

        await act(() => {
          fragmentRef.current.focus();
        });
        expect(document.activeElement!.id).toEqual("child-b");
        (document.activeElement as HTMLElement).blur();
      });

      it("focuses deeply nested focusable children, depth first", async () => {
        const fragmentRef = React.createRef<any>();
        const root = ReactDOMClient.createRoot(container);

        const Test = () => {
          return (
            <Fragment ref={fragmentRef}>
              <div id="child-a">
                <div tabIndex={0} id="grandchild-a">
                  <a id="greatgrandchild-a" href="/" />
                </div>
              </div>
              <a id="child-b" href="/" />
            </Fragment>
          );
        };
        await act(() => {
          root.render(<Test />);
        });
        await act(() => {
          fragmentRef.current.focus();
        });
        expect(document.activeElement!.id).toEqual("grandchild-a");
      });

      it("preserves document order when adding and removing children", async () => {
        const fragmentRef = React.createRef<any>();
        const root = ReactDOMClient.createRoot(container);

        const Test = ({ showA, showB }: { showA: boolean; showB: boolean }) => {
          return (
            <Fragment ref={fragmentRef}>
              {showA && <a href="/" id="child-a" />}
              {showB && <a href="/" id="child-b" />}
            </Fragment>
          );
        };

        await act(() => {
          root.render(<Test showA={true} showB={false} />);
        });
        await act(() => {
          fragmentRef.current.focus();
        });
        expect(document.activeElement!.id).toEqual("child-a");
        (document.activeElement as HTMLElement).blur();

        await act(() => {
          root.render(<Test showA={true} showB={true} />);
        });
        await act(() => {
          fragmentRef.current.focus();
        });
        expect(document.activeElement!.id).toEqual("child-a");
        (document.activeElement as HTMLElement).blur();

        await act(() => {
          root.render(<Test showA={false} showB={true} />);
        });
        await act(() => {
          fragmentRef.current.focus();
        });
        expect(document.activeElement!.id).toEqual("child-b");
        (document.activeElement as HTMLElement).blur();
      });

      it("keeps focus on the first focusable child if already focused", async () => {
        const fragmentRef = React.createRef<any>();
        const root = ReactDOMClient.createRoot(container);

        const Test = () => {
          return (
            <Fragment ref={fragmentRef}>
              <a id="child-a" href="/">
                A
              </a>
              <a id="child-b" href="/">
                B
              </a>
            </Fragment>
          );
        };

        await act(() => {
          root.render(<Test />);
        });

        document.getElementById("child-a")!.focus();
        expect(document.activeElement!.id).toEqual("child-a");

        await act(() => {
          fragmentRef.current.focus();
        });
        expect(document.activeElement!.id).toEqual("child-a");
        (document.activeElement as HTMLElement).blur();
      });

      it("keeps focus on a nested child if already focused", async () => {
        const fragmentRef = React.createRef<any>();
        const root = ReactDOMClient.createRoot(container);

        const Test = () => {
          return (
            <Fragment ref={fragmentRef}>
              <div>
                <input id="nested-input" />
              </div>
              <a id="sibling-link" href="/">
                Link
              </a>
            </Fragment>
          );
        };

        await act(() => {
          root.render(<Test />);
        });

        document.getElementById("nested-input")!.focus();
        expect(document.activeElement!.id).toEqual("nested-input");

        await act(() => {
          fragmentRef.current.focus();
        });
        expect(document.activeElement!.id).toEqual("nested-input");
        (document.activeElement as HTMLElement).blur();
      });

      it("focuses the first focusable child in a fieldset", async () => {
        const fragmentRef = React.createRef<any>();
        const root = ReactDOMClient.createRoot(container);

        const Test = () => {
          return (
            <Fragment ref={fragmentRef}>
              <fieldset>
                <legend>Shipping</legend>
                <input id="street" name="street" />
                <input id="city" name="city" />
              </fieldset>
            </Fragment>
          );
        };

        await act(() => {
          root.render(<Test />);
        });
        await act(() => {
          fragmentRef.current.focus();
        });
        expect(document.activeElement!.id).toEqual("street");
        (document.activeElement as HTMLElement).blur();
      });
    });

    describe("focusLast()", () => {
      it("focuses the last focusable child", async () => {
        const fragmentRef = React.createRef<any>();
        const root = ReactDOMClient.createRoot(container);

        const Test = () => {
          return (
            <div>
              <Fragment ref={fragmentRef}>
                <a id="child-a" href="/">
                  A
                </a>
                <a id="child-b" href="/">
                  B
                </a>
                <Wrapper>
                  <a id="child-c" href="/">
                    C
                  </a>
                </Wrapper>
                <div id="child-d" />
                <style id="child-e">{`#child-d {}`}</style>
              </Fragment>
            </div>
          );
        };

        await act(() => {
          root.render(<Test />);
        });

        await act(() => {
          fragmentRef.current.focusLast();
        });
        expect(document.activeElement!.id).toEqual("child-c");
        (document.activeElement as HTMLElement).blur();
      });

      it("focuses deeply nested focusable children, depth first", async () => {
        const fragmentRef = React.createRef<any>();
        const root = ReactDOMClient.createRoot(container);

        const Test = () => {
          return (
            <Fragment ref={fragmentRef}>
              <div id="child-a">
                <a id="grandchild-a" href="/" />
                <a id="grandchild-b" href="/" />
              </div>
              <div tabIndex={0} id="child-b">
                <a id="grandchild-a" href="/" />
                <a id="grandchild-b" href="/" />
              </div>
            </Fragment>
          );
        };
        await act(() => {
          root.render(<Test />);
        });
        await act(() => {
          fragmentRef.current.focusLast();
        });
        expect(document.activeElement!.id).toEqual("grandchild-b");
      });
    });

    describe("blur()", () => {
      it("removes focus from an element inside of the Fragment", async () => {
        const fragmentRef = React.createRef<any>();
        const root = ReactDOMClient.createRoot(container);

        const Test = () => {
          return (
            <Fragment ref={fragmentRef}>
              <a id="child-a" href="/">
                A
              </a>
            </Fragment>
          );
        };

        await act(() => {
          root.render(<Test />);
        });

        await act(() => {
          fragmentRef.current.focus();
        });
        expect(document.activeElement!.id).toEqual("child-a");

        await act(() => {
          fragmentRef.current.blur();
        });
        expect(document.activeElement).toEqual(document.body);
      });

      it("does not remove focus from elements outside of the Fragment", async () => {
        const fragmentRefA = React.createRef<any>();
        const fragmentRefB = React.createRef<any>();
        const root = ReactDOMClient.createRoot(container);

        const Test = () => {
          return (
            <Fragment ref={fragmentRefA}>
              <a id="child-a" href="/">
                A
              </a>
              <Fragment ref={fragmentRefB}>
                <a id="child-b" href="/">
                  B
                </a>
              </Fragment>
            </Fragment>
          );
        };

        await act(() => {
          root.render(<Test />);
        });

        await act(() => {
          fragmentRefA.current.focus();
        });
        expect(document.activeElement!.id).toEqual("child-a");

        await act(() => {
          fragmentRefB.current.blur();
        });
        expect(document.activeElement!.id).toEqual("child-a");
      });
    });
  });

  describe("events", () => {
    describe("add/remove event listeners", () => {
      it("adds and removes event listeners from children", async () => {
        const parentRef = React.createRef<HTMLDivElement>();
        const fragmentRef = React.createRef<any>();
        const childARef = React.createRef<HTMLDivElement>();
        const childBRef = React.createRef<HTMLDivElement>();
        const root = ReactDOMClient.createRoot(container);

        let logs: string[] = [];

        const handleFragmentRefClicks = () => {
          logs.push("fragmentRef");
        };

        const Test = () => {
          React.useEffect(() => {
            fragmentRef.current.addEventListener("click", handleFragmentRefClicks);

            return () => {
              fragmentRef.current.removeEventListener("click", handleFragmentRefClicks);
            };
          }, []);
          return (
            <div ref={parentRef}>
              <Fragment ref={fragmentRef}>
                <>Text</>
                <div ref={childARef}>A</div>
                <>
                  <div ref={childBRef}>B</div>
                </>
              </Fragment>
            </div>
          );
        };

        await act(() => {
          root.render(<Test />);
        });

        childARef.current!.addEventListener("click", () => {
          logs.push("A");
        });

        childBRef.current!.addEventListener("click", () => {
          logs.push("B");
        });

        parentRef.current!.click();
        expect(logs).toEqual([]);

        childARef.current!.click();
        expect(logs).toEqual(["fragmentRef", "A"]);

        logs = [];

        childBRef.current!.click();
        expect(logs).toEqual(["fragmentRef", "B"]);

        logs = [];

        fragmentRef.current.removeEventListener("click", handleFragmentRefClicks);

        childARef.current!.click();
        expect(logs).toEqual(["A"]);

        logs = [];

        childBRef.current!.click();
        expect(logs).toEqual(["B"]);
      });

      it("adds and removes event listeners from children with multiple fragments", async () => {
        const fragmentRef = React.createRef<any>();
        const nestedFragmentRef = React.createRef<any>();
        const nestedFragmentRef2 = React.createRef<any>();
        const childARef = React.createRef<HTMLDivElement>();
        const childBRef = React.createRef<HTMLDivElement>();
        const childCRef = React.createRef<HTMLDivElement>();
        const root = ReactDOMClient.createRoot(container);

        await act(() => {
          root.render(
            <div>
              <Fragment ref={fragmentRef}>
                <div ref={childARef}>A</div>
                <div>
                  <Fragment ref={nestedFragmentRef}>
                    <div ref={childBRef}>B</div>
                  </Fragment>
                </div>
                <Fragment ref={nestedFragmentRef2}>
                  <div ref={childCRef}>C</div>
                </Fragment>
              </Fragment>
            </div>,
          );
        });

        let logs: string[] = [];

        const handleFragmentRefClicks = () => {
          logs.push("fragmentRef");
        };

        const handleNestedFragmentRefClicks = () => {
          logs.push("nestedFragmentRef");
        };

        const handleNestedFragmentRef2Clicks = () => {
          logs.push("nestedFragmentRef2");
        };

        fragmentRef.current.addEventListener("click", handleFragmentRefClicks);
        nestedFragmentRef.current.addEventListener("click", handleNestedFragmentRefClicks);
        nestedFragmentRef2.current.addEventListener("click", handleNestedFragmentRef2Clicks);

        childBRef.current!.click();
        expect(logs).toEqual(["nestedFragmentRef", "fragmentRef"]);

        logs = [];

        childARef.current!.click();
        expect(logs).toEqual(["fragmentRef"]);

        logs = [];
        childCRef.current!.click();
        expect(logs).toEqual(["fragmentRef", "nestedFragmentRef2"]);

        logs = [];

        fragmentRef.current.removeEventListener("click", handleFragmentRefClicks);
        nestedFragmentRef.current.removeEventListener("click", handleNestedFragmentRefClicks);
        childCRef.current!.click();
        expect(logs).toEqual(["nestedFragmentRef2"]);
      });

      it("adds an event listener to a newly added child", async () => {
        const fragmentRef = React.createRef<any>();
        const childRef = React.createRef<HTMLDivElement>();
        const root = ReactDOMClient.createRoot(container);
        let showChild: () => void;

        const Component = () => {
          const [shouldShowChild, setShouldShowChild] = React.useState(false);
          showChild = () => {
            setShouldShowChild(true);
          };

          return (
            <div>
              <Fragment ref={fragmentRef}>
                <div id="a">A</div>
                {shouldShowChild && (
                  <div ref={childRef} id="b">
                    B
                  </div>
                )}
              </Fragment>
            </div>
          );
        };

        await act(() => {
          root.render(<Component />);
        });

        expect(fragmentRef.current).not.toBe(null);
        expect(childRef.current).toBe(null);

        let hasClicked = false;
        fragmentRef.current.addEventListener("click", () => {
          hasClicked = true;
        });

        await act(() => {
          showChild!();
        });
        expect(childRef.current).not.toBe(null);

        childRef.current!.click();
        expect(hasClicked).toBe(true);
      });

      it("applies event listeners to host children nested within non-host children", async () => {
        const fragmentRef = React.createRef<any>();
        const childRef = React.createRef<HTMLDivElement>();
        const nestedChildRef = React.createRef<HTMLDivElement>();
        const root = ReactDOMClient.createRoot(container);

        await act(() => {
          root.render(
            <div>
              <Fragment ref={fragmentRef}>
                <div ref={childRef}>Host A</div>
                <Wrapper>
                  <Wrapper>
                    <Wrapper>
                      <div ref={nestedChildRef}>Host B</div>
                    </Wrapper>
                  </Wrapper>
                </Wrapper>
              </Fragment>
            </div>,
          );
        });
        const logs: string[] = [];
        fragmentRef.current.addEventListener("click", (event: MouseEvent) => {
          logs.push((event.target as HTMLElement).textContent!);
        });

        expect(logs).toEqual([]);
        childRef.current!.click();
        expect(logs).toEqual(["Host A"]);
        nestedChildRef.current!.click();
        expect(logs).toEqual(["Host A", "Host B"]);
      });

      it("allows adding and cleaning up listeners in effects", async () => {
        const root = ReactDOMClient.createRoot(container);

        let logs: string[] = [];
        const logClick = (event: Event) => {
          logs.push((event.currentTarget as HTMLElement).id);
        };

        let rerender: () => void;
        let removeEventListeners: () => void;

        const Test = () => {
          const fragmentRef = React.useRef<any>(null);
          const [_, setState] = React.useState(0);
          rerender = () => {
            setState((previous) => previous + 1);
          };
          removeEventListeners = () => {
            fragmentRef.current.removeEventListener("click", logClick);
          };
          React.useEffect(() => {
            fragmentRef.current.addEventListener("click", logClick);

            return removeEventListeners;
          });

          return (
            <Fragment ref={fragmentRef}>
              <div id="child-a" />
            </Fragment>
          );
        };

        await act(() => root.render(<Test />));
        expect(logs).toEqual([]);
        document.querySelector<HTMLElement>("#child-a")!.click();
        expect(logs).toEqual(["child-a"]);

        logs = [];
        await act(rerender!);
        document.querySelector<HTMLElement>("#child-a")!.click();
        expect(logs).toEqual(["child-a"]);
      });

      it("does not apply removed event listeners to new children", async () => {
        const root = ReactDOMClient.createRoot(container);
        const fragmentRef = React.createRef<any>();
        const Test = () => {
          return (
            <Fragment ref={fragmentRef}>
              <div id="child-a" />
            </Fragment>
          );
        };

        let logs: string[] = [];
        const logClick = (event: Event) => {
          logs.push((event.currentTarget as HTMLElement).id);
        };
        await act(() => {
          root.render(<Test />);
        });
        fragmentRef.current.addEventListener("click", logClick);
        const childA = document.querySelector<HTMLElement>("#child-a")!;
        childA.click();
        expect(logs).toEqual(["child-a"]);

        logs = [];
        fragmentRef.current.removeEventListener("click", logClick);
        childA.click();
        expect(logs).toEqual([]);
      });

      it("removes a capture listener registered with boolean when removed with options object", async () => {
        const fragmentRef = React.createRef<any>();
        const Test = () => {
          return (
            <Fragment ref={fragmentRef}>
              <div id="child-a" />
            </Fragment>
          );
        };
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(<Test />);
        });

        const logs: string[] = [];
        const logCapture = () => {
          logs.push("capture");
        };

        fragmentRef.current.addEventListener("click", logCapture, true);
        document.querySelector<HTMLElement>("#child-a")!.click();
        expect(logs).toEqual(["capture"]);

        logs.length = 0;

        fragmentRef.current.removeEventListener("click", logCapture, {
          capture: true,
        });
        document.querySelector<HTMLElement>("#child-a")!.click();
        expect(logs).toEqual([]);
      });

      it("removes a capture listener registered with options object when removed with boolean", async () => {
        const fragmentRef = React.createRef<any>();
        const Test = () => {
          return (
            <Fragment ref={fragmentRef}>
              <div id="child-b" />
            </Fragment>
          );
        };
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(<Test />);
        });

        const logs: string[] = [];
        const logCapture = () => {
          logs.push("capture");
        };

        fragmentRef.current.addEventListener("click", logCapture, {
          capture: true,
        });
        document.querySelector<HTMLElement>("#child-b")!.click();
        expect(logs).toEqual(["capture"]);

        logs.length = 0;

        fragmentRef.current.removeEventListener("click", logCapture, true);
        document.querySelector<HTMLElement>("#child-b")!.click();
        expect(logs).toEqual([]);
      });

      it("applies event listeners to portaled children", async () => {
        const fragmentRef = React.createRef<any>();
        const childARef = React.createRef<HTMLDivElement>();
        const childBRef = React.createRef<HTMLDivElement>();
        const root = ReactDOMClient.createRoot(container);

        const Test = () => {
          return (
            <Fragment ref={fragmentRef}>
              <div id="child-a" ref={childARef} />
              {createPortal(<div id="child-b" ref={childBRef} />, document.body)}
            </Fragment>
          );
        };

        await act(() => {
          root.render(<Test />);
        });

        const logs: string[] = [];
        fragmentRef.current.addEventListener("click", (event: MouseEvent) => {
          logs.push((event.target as HTMLElement).id);
        });

        childARef.current!.click();
        expect(logs).toEqual(["child-a"]);

        logs.length = 0;
        childBRef.current!.click();
        expect(logs).toEqual(["child-b"]);
      });

      describe("with activity", () => {
        it("does not apply event listeners to hidden trees", async () => {
          const parentRef = React.createRef<HTMLDivElement>();
          const fragmentRef = React.createRef<any>();
          const root = ReactDOMClient.createRoot(container);

          const Test = () => {
            return (
              <div ref={parentRef}>
                <Fragment ref={fragmentRef}>
                  <div>Child 1</div>
                  <Activity mode="hidden">
                    <div>Child 2</div>
                  </Activity>
                  <div>Child 3</div>
                </Fragment>
              </div>
            );
          };

          await act(() => {
            root.render(<Test />);
          });

          const logs: string[] = [];
          fragmentRef.current.addEventListener("click", (event: MouseEvent) => {
            logs.push((event.target as HTMLElement).textContent!);
          });

          const [child1, child2, child3] = parentRef.current!.children;
          (child1 as HTMLElement).click();
          (child2 as HTMLElement).click();
          (child3 as HTMLElement).click();
          expect(logs).toEqual(["Child 1", "Child 3"]);
        });

        it("applies event listeners to visible trees", async () => {
          const parentRef = React.createRef<HTMLDivElement>();
          const fragmentRef = React.createRef<any>();
          const root = ReactDOMClient.createRoot(container);

          const Test = () => {
            return (
              <div ref={parentRef}>
                <Fragment ref={fragmentRef}>
                  <div>Child 1</div>
                  <Activity mode="visible">
                    <div>Child 2</div>
                  </Activity>
                  <div>Child 3</div>
                </Fragment>
              </div>
            );
          };

          await act(() => {
            root.render(<Test />);
          });

          const logs: string[] = [];
          fragmentRef.current.addEventListener("click", (event: MouseEvent) => {
            logs.push((event.target as HTMLElement).textContent!);
          });

          const [child1, child2, child3] = parentRef.current!.children;
          (child1 as HTMLElement).click();
          (child2 as HTMLElement).click();
          (child3 as HTMLElement).click();
          expect(logs).toEqual(["Child 1", "Child 2", "Child 3"]);
        });

        it("handles Activity modes switching", async () => {
          const fragmentRef = React.createRef<any>();
          const fragmentRef2 = React.createRef<any>();
          const parentRef = React.createRef<HTMLDivElement>();
          const root = ReactDOMClient.createRoot(container);

          const Test = ({ mode }: { mode: "visible" | "hidden" }) => {
            return (
              <div id="parent" ref={parentRef}>
                <Fragment ref={fragmentRef}>
                  <Activity mode={mode}>
                    <div id="child1">Child</div>
                    <Fragment ref={fragmentRef2}>
                      <div id="child2">Child 2</div>
                    </Fragment>
                  </Activity>
                </Fragment>
              </div>
            );
          };

          await act(() => {
            root.render(<Test mode="visible" />);
          });

          let logs: string[] = [];
          fragmentRef.current.addEventListener("click", () => {
            logs.push("clicked 1");
          });
          fragmentRef2.current.addEventListener("click", () => {
            logs.push("clicked 2");
          });
          parentRef.current!.lastChild!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          expect(logs).toEqual(["clicked 1", "clicked 2"]);

          logs = [];
          await act(() => {
            root.render(<Test mode="hidden" />);
          });
          (parentRef.current!.firstChild as HTMLElement).click();
          (parentRef.current!.lastChild as HTMLElement).click();
          expect(logs).toEqual([]);

          logs = [];
          await act(() => {
            root.render(<Test mode="visible" />);
          });
          parentRef.current!.lastChild!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          expect(logs).toEqual(["clicked 2", "clicked 1"]);
        });
      });
    });

    describe("dispatchEvent()", () => {
      it("fires events on the host parent if bubbles=true", async () => {
        const fragmentRef = React.createRef<any>();
        const root = ReactDOMClient.createRoot(container);
        let logs: Array<[string, string, string]> = [];

        const handleClick = (event: React.MouseEvent) => {
          logs.push([
            event.type,
            (event.target as HTMLElement).id,
            (event.currentTarget as HTMLElement).id,
          ]);
        };

        const Test = ({ isMounted }: { isMounted: boolean }) => {
          return (
            <div onClick={handleClick} id="grandparent">
              <div onClick={handleClick} id="parent">
                {isMounted && (
                  <Fragment ref={fragmentRef}>
                    <div onClick={handleClick} id="child">
                      Hi
                    </div>
                  </Fragment>
                )}
              </div>
            </div>
          );
        };

        await act(() => {
          root.render(<Test isMounted={true} />);
        });

        let isCancelable = !fragmentRef.current.dispatchEvent(
          new MouseEvent("click", { bubbles: true }),
        );
        expect(logs).toEqual([
          ["click", "parent", "parent"],
          ["click", "parent", "grandparent"],
        ]);
        expect(isCancelable).toBe(false);

        const fragmentInstanceHandle = fragmentRef.current;
        await act(() => {
          root.render(<Test isMounted={false} />);
        });
        logs = [];

        isCancelable = !fragmentInstanceHandle.dispatchEvent(
          new MouseEvent("click", { bubbles: true }),
        );
        expect(logs).toEqual([]);
        expect(isCancelable).toBe(false);

        logs = [];
        isCancelable = !fragmentInstanceHandle.dispatchEvent(
          new MouseEvent("click", { bubbles: false }),
        );
        expect(logs).toEqual([]);
        expect(isCancelable).toBe(false);
      });

      it("fires events on self, and only self if bubbles=false", async () => {
        const fragmentRef = React.createRef<any>();
        const root = ReactDOMClient.createRoot(container);
        let logs: Array<[string, string | undefined, string | undefined]> = [];

        const handleClick = (event: React.MouseEvent | Event) => {
          logs.push([
            event.type,
            (event.target as HTMLElement | undefined)?.id,
            (event.currentTarget as HTMLElement | undefined)?.id,
          ]);
        };

        const Test = () => {
          return (
            <div id="parent" onClick={handleClick as any}>
              <Fragment ref={fragmentRef} />
            </div>
          );
        };

        await act(() => {
          root.render(<Test />);
        });

        fragmentRef.current.addEventListener("click", handleClick);

        fragmentRef.current.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        expect(logs).toEqual([
          ["click", undefined, undefined],
          ["click", "parent", "parent"],
        ]);

        logs = [];

        fragmentRef.current.dispatchEvent(new MouseEvent("click", { bubbles: false }));
        expect(logs).toEqual([["click", undefined, undefined]]);
      });
    });
  });

  describe("observers", () => {
    beforeEach(() => {
      mockIntersectionObserver();
    });

    afterEach(() => {
      restoreIntersectionObserver();
    });

    it("attaches intersection observers to children", async () => {
      let logs: string[] = [];
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          logs.push((entry.target as HTMLElement).id);
        });
      });

      const Test = ({ showB }: { showB: boolean }) => {
        const fragmentRef = React.useRef<any>(null);
        React.useEffect(() => {
          fragmentRef.current.observeUsing(observer);
          const lastRefValue = fragmentRef.current;
          return () => {
            lastRefValue.unobserveUsing(observer);
          };
        }, []);
        return (
          <div id="parent">
            <React.Fragment ref={fragmentRef}>
              <div id="childA">A</div>
              {showB && <div id="childB">B</div>}
            </React.Fragment>
          </div>
        );
      };

      const simulateAllChildrenIntersecting = () => {
        const parent = container.firstChild as HTMLElement;
        if (parent) {
          const children = Array.from(parent.children).map((child) => {
            return [child, { y: 0, x: 0, width: 1, height: 1 }, 1] as [
              Element,
              DOMRectInit,
              number,
            ];
          });
          simulateIntersection(...children);
        }
      };

      const root = ReactDOMClient.createRoot(container);
      await act(() => root.render(<Test showB={false} />));
      simulateAllChildrenIntersecting();
      expect(logs).toEqual(["childA"]);

      logs = [];
      await act(() => root.render(<Test showB={true} />));
      simulateAllChildrenIntersecting();
      expect(logs).toEqual(["childA", "childB"]);

      logs = [];
      await act(() => root.render(<Test showB={false} />));
      simulateAllChildrenIntersecting();
      expect(logs).toEqual(["childA"]);

      logs = [];
      await act(() => root.render(null));
      simulateAllChildrenIntersecting();
      expect(logs).toEqual([]);
    });

    it("warns when unobserveUsing() is called with an observer that was not observed", async () => {
      const fragmentRef = React.createRef<any>();
      const observer = new IntersectionObserver(() => {});
      const observer2 = new IntersectionObserver(() => {});
      const Test = () => {
        return (
          <React.Fragment ref={fragmentRef}>
            <div />
          </React.Fragment>
        );
      };

      const root = ReactDOMClient.createRoot(container);
      await act(() => root.render(<Test />));

      fragmentRef.current.unobserveUsing(observer);

      fragmentRef.current.observeUsing(observer);
      fragmentRef.current.unobserveUsing(observer2);
    });

    describe.skipIf(!supportsFragmentRefsInstanceHandles)("instance handles for observers", () => {
      it("attaches handles to observed elements to allow caching of observers", async () => {
        const targetToCallbackMap = new WeakMap<
          any,
          Array<(entry: IntersectionObserverEntry) => void>
        >();
        let cachedObserver: IntersectionObserver | null = null;
        const createObserverIfNeeded = (
          fragmentInstance: any,
          onIntersection: (entry: IntersectionObserverEntry) => void,
        ) => {
          const callbacks = targetToCallbackMap.get(fragmentInstance);
          targetToCallbackMap.set(
            fragmentInstance,
            callbacks ? [...callbacks, onIntersection] : [onIntersection],
          );
          if (cachedObserver !== null) {
            return cachedObserver;
          }
          const newObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              const fragmentInstances = (entry.target as any).reactFragments;
              if (fragmentInstances) {
                Array.from(fragmentInstances as Set<any>).forEach((fInstance: any) => {
                  const cbs = targetToCallbackMap.get(fInstance) || [];
                  cbs.forEach((callback) => {
                    callback(entry);
                  });
                });
              }

              targetToCallbackMap.get(entry.target)?.forEach((callback) => {
                callback(entry);
              });
            });
          });
          cachedObserver = newObserver;
          return newObserver;
        };

        const IntersectionObserverFragment = ({
          onIntersection,
          children,
        }: {
          onIntersection: (entry: IntersectionObserverEntry) => void;
          children: React.ReactNode;
        }) => {
          const fragmentRef = React.useRef<any>(null);
          React.useLayoutEffect(() => {
            const innerObserver = createObserverIfNeeded(fragmentRef.current, onIntersection);
            fragmentRef.current.observeUsing(innerObserver);
            const lastRefValue = fragmentRef.current;
            return () => {
              lastRefValue.unobserveUsing(innerObserver);
            };
          }, []);
          return <React.Fragment ref={fragmentRef}>{children}</React.Fragment>;
        };

        let logs: string[] = [];
        const logIntersection = (id: string) => {
          logs.push(`observe: ${id}`);
        };

        const ChildWithManualIO = ({ id }: { id: string }) => {
          const divRef = React.useRef<HTMLDivElement>(null);
          React.useLayoutEffect(() => {
            const innerObserver = createObserverIfNeeded(divRef.current, () => {
              logIntersection(id);
            });
            innerObserver.observe(divRef.current!);
            return () => {
              innerObserver.unobserve(divRef.current!);
            };
          }, []);
          return (
            <div id={id} ref={divRef}>
              {id}
            </div>
          );
        };

        const Test = () => {
          return (
            <>
              <IntersectionObserverFragment onIntersection={() => logIntersection("grandparent")}>
                <IntersectionObserverFragment onIntersection={() => logIntersection("parentA")}>
                  <div id="childA">A</div>
                </IntersectionObserverFragment>
              </IntersectionObserverFragment>
              <IntersectionObserverFragment onIntersection={() => logIntersection("parentB")}>
                <div id="childB">B</div>
                <ChildWithManualIO id="childC" />
              </IntersectionObserverFragment>
            </>
          );
        };

        const root = ReactDOMClient.createRoot(container);
        await act(() => root.render(<Test />));

        simulateIntersection([
          container.querySelector("#childA")!,
          { y: 0, x: 0, width: 1, height: 1 },
          1,
        ]);
        expect(logs).toEqual(["observe: grandparent", "observe: parentA"]);

        logs = [];

        simulateIntersection([
          container.querySelector("#childB")!,
          { y: 0, x: 0, width: 1, height: 1 },
          1,
        ]);
        expect(logs).toEqual(["observe: parentB"]);

        logs = [];
        simulateIntersection([
          container.querySelector("#childC")!,
          { y: 0, x: 0, width: 1, height: 1 },
          1,
        ]);
        expect(logs).toEqual(["observe: parentB", "observe: childC"]);
      });
    });
  });

  describe("getClientRects", () => {
    it("returns the bounding client rects of all children", async () => {
      const fragmentRef = React.createRef<any>();
      const childARef = React.createRef<HTMLDivElement>();
      const childBRef = React.createRef<HTMLDivElement>();
      const root = ReactDOMClient.createRoot(container);

      const Test = () => {
        return (
          <React.Fragment ref={fragmentRef}>
            <div ref={childARef} />
            <div ref={childBRef} />
          </React.Fragment>
        );
      };

      await act(() => root.render(<Test />));
      setClientRects(childARef.current!, [
        {
          x: 1,
          y: 2,
          width: 3,
          height: 4,
        },
        {
          x: 5,
          y: 6,
          width: 7,
          height: 8,
        },
      ]);
      setClientRects(childBRef.current!, [{ x: 9, y: 10, width: 11, height: 12 }]);
      const clientRects = fragmentRef.current.getClientRects();
      expect(clientRects.length).toBe(3);
      expect(clientRects[0].left).toBe(1);
      expect(clientRects[1].left).toBe(5);
      expect(clientRects[2].left).toBe(9);
    });
  });

  describe("getRootNode", () => {
    it("returns the root node of the parent", async () => {
      const fragmentRef = React.createRef<any>();
      const root = ReactDOMClient.createRoot(container);

      const Test = () => {
        return (
          <div>
            <React.Fragment ref={fragmentRef}>
              <div />
            </React.Fragment>
          </div>
        );
      };

      await act(() => root.render(<Test />));
      expect(fragmentRef.current.getRootNode()).toBe(document);
    });

    it("returns the topmost disconnected element if the fragment and parent are unmounted", async () => {
      const containerRef = React.createRef<HTMLDivElement>();
      const parentRef = React.createRef<HTMLDivElement>();
      const fragmentRef = React.createRef<any>();
      const root = ReactDOMClient.createRoot(container);

      const Test = ({ mounted }: { mounted: boolean }) => {
        return (
          <div ref={containerRef} id="container">
            {mounted && (
              <div ref={parentRef} id="parent">
                <React.Fragment ref={fragmentRef}>
                  <div />
                </React.Fragment>
              </div>
            )}
          </div>
        );
      };

      await act(() => root.render(<Test mounted={true} />));
      expect(fragmentRef.current.getRootNode()).toBe(document);
      const fragmentHandle = fragmentRef.current;
      await act(() => root.render(<Test mounted={false} />));
      expect(fragmentHandle.getRootNode()).toBe(fragmentHandle);
    });

    it("returns self when only the fragment was unmounted", async () => {
      const fragmentRef = React.createRef<any>();
      const parentRef = React.createRef<HTMLDivElement>();
      const root = ReactDOMClient.createRoot(container);

      const Test = ({ mounted }: { mounted: boolean }) => {
        return (
          <div ref={parentRef} id="parent">
            {mounted && (
              <React.Fragment ref={fragmentRef}>
                <div />
              </React.Fragment>
            )}
          </div>
        );
      };

      await act(() => root.render(<Test mounted={true} />));
      expect(fragmentRef.current.getRootNode()).toBe(document);
      const fragmentHandle = fragmentRef.current;
      await act(() => root.render(<Test mounted={false} />));
      expect(fragmentHandle.getRootNode()).toBe(fragmentHandle);
    });
  });

  describe("compareDocumentPosition", () => {
    const expectPosition = (
      position: number,
      spec: {
        following: boolean;
        preceding: boolean;
        contains: boolean;
        containedBy: boolean;
        disconnected: boolean;
        implementationSpecific: boolean;
      },
    ) => {
      const positionResult = {
        following: (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
        preceding: (position & Node.DOCUMENT_POSITION_PRECEDING) !== 0,
        contains: (position & Node.DOCUMENT_POSITION_CONTAINS) !== 0,
        containedBy: (position & Node.DOCUMENT_POSITION_CONTAINED_BY) !== 0,
        disconnected: (position & Node.DOCUMENT_POSITION_DISCONNECTED) !== 0,
        implementationSpecific: (position & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC) !== 0,
      };
      expect(positionResult).toEqual(spec);
    };

    it("returns the relationship between the fragment instance and a given node", async () => {
      const fragmentRef = React.createRef<any>();
      const beforeRef = React.createRef<HTMLDivElement>();
      const afterRef = React.createRef<HTMLDivElement>();
      const middleChildRef = React.createRef<HTMLDivElement>();
      const firstChildRef = React.createRef<HTMLDivElement>();
      const lastChildRef = React.createRef<HTMLDivElement>();
      const containerRef = React.createRef<HTMLDivElement>();
      const disconnectedElement = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      const Test = () => {
        return (
          <div ref={containerRef} id="container">
            <div ref={beforeRef} id="before" />
            <React.Fragment ref={fragmentRef}>
              <div ref={firstChildRef} id="first" />
              <div ref={middleChildRef} id="middle" />
              <div ref={lastChildRef} id="last" />
            </React.Fragment>
            <div ref={afterRef} id="after" />
          </div>
        );
      };

      await act(() => root.render(<Test />));

      expectPosition(fragmentRef.current.compareDocumentPosition(document.body), {
        preceding: true,
        following: false,
        contains: true,
        containedBy: false,
        disconnected: false,
        implementationSpecific: false,
      });

      expectPosition(fragmentRef.current.compareDocumentPosition(beforeRef.current), {
        preceding: true,
        following: false,
        contains: false,
        containedBy: false,
        disconnected: false,
        implementationSpecific: false,
      });

      expectPosition(fragmentRef.current.compareDocumentPosition(afterRef.current), {
        preceding: false,
        following: true,
        contains: false,
        containedBy: false,
        disconnected: false,
        implementationSpecific: false,
      });

      expectPosition(fragmentRef.current.compareDocumentPosition(firstChildRef.current), {
        preceding: false,
        following: false,
        contains: false,
        containedBy: true,
        disconnected: false,
        implementationSpecific: false,
      });

      expectPosition(fragmentRef.current.compareDocumentPosition(middleChildRef.current), {
        preceding: false,
        following: false,
        contains: false,
        containedBy: true,
        disconnected: false,
        implementationSpecific: false,
      });

      expectPosition(fragmentRef.current.compareDocumentPosition(lastChildRef.current), {
        preceding: false,
        following: false,
        contains: false,
        containedBy: true,
        disconnected: false,
        implementationSpecific: false,
      });

      expectPosition(fragmentRef.current.compareDocumentPosition(containerRef.current), {
        preceding: true,
        following: false,
        contains: true,
        containedBy: false,
        disconnected: false,
        implementationSpecific: false,
      });

      expectPosition(fragmentRef.current.compareDocumentPosition(disconnectedElement), {
        preceding: false,
        following: true,
        contains: false,
        containedBy: false,
        disconnected: true,
        implementationSpecific: true,
      });
    });

    it("handles fragment instances with one child", async () => {
      const fragmentRef = React.createRef<any>();
      const beforeRef = React.createRef<HTMLDivElement>();
      const afterRef = React.createRef<HTMLDivElement>();
      const containerRef = React.createRef<HTMLDivElement>();
      const onlyChildRef = React.createRef<HTMLDivElement>();
      const disconnectedElement = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      const Test = () => {
        return (
          <div id="container" ref={containerRef}>
            <div id="innercontainer">
              <div ref={beforeRef} id="before" />
              <React.Fragment ref={fragmentRef}>
                <div ref={onlyChildRef} id="within" />
              </React.Fragment>
              <div id="after" ref={afterRef} />
            </div>
          </div>
        );
      };

      await act(() => root.render(<Test />));
      expectPosition(fragmentRef.current.compareDocumentPosition(beforeRef.current), {
        preceding: true,
        following: false,
        contains: false,
        containedBy: false,
        disconnected: false,
        implementationSpecific: false,
      });
      expectPosition(fragmentRef.current.compareDocumentPosition(afterRef.current), {
        preceding: false,
        following: true,
        contains: false,
        containedBy: false,
        disconnected: false,
        implementationSpecific: false,
      });
      expectPosition(fragmentRef.current.compareDocumentPosition(onlyChildRef.current), {
        preceding: false,
        following: false,
        contains: false,
        containedBy: true,
        disconnected: false,
        implementationSpecific: false,
      });
      expectPosition(fragmentRef.current.compareDocumentPosition(containerRef.current), {
        preceding: true,
        following: false,
        contains: true,
        containedBy: false,
        disconnected: false,
        implementationSpecific: false,
      });
      expectPosition(fragmentRef.current.compareDocumentPosition(disconnectedElement), {
        preceding: false,
        following: true,
        contains: false,
        containedBy: false,
        disconnected: true,
        implementationSpecific: true,
      });
    });

    it("handles empty fragment instances", async () => {
      const fragmentRef = React.createRef<any>();
      const beforeParentRef = React.createRef<HTMLDivElement>();
      const beforeRef = React.createRef<HTMLDivElement>();
      const afterRef = React.createRef<HTMLDivElement>();
      const afterParentRef = React.createRef<HTMLDivElement>();
      const containerRef = React.createRef<HTMLDivElement>();
      const root = ReactDOMClient.createRoot(container);

      const Test = () => {
        return (
          <>
            <div id="before-container" ref={beforeParentRef} />
            <div id="container" ref={containerRef}>
              <div id="before" ref={beforeRef} />
              <React.Fragment ref={fragmentRef} />
              <div id="after" ref={afterRef} />
            </div>
            <div id="after-container" ref={afterParentRef} />
          </>
        );
      };

      await act(() => root.render(<Test />));

      expectPosition(fragmentRef.current.compareDocumentPosition(document.body), {
        preceding: true,
        following: false,
        contains: true,
        containedBy: false,
        disconnected: false,
        implementationSpecific: true,
      });
      expectPosition(fragmentRef.current.compareDocumentPosition(beforeRef.current), {
        preceding: true,
        following: false,
        contains: false,
        containedBy: false,
        disconnected: false,
        implementationSpecific: true,
      });
      expectPosition(fragmentRef.current.compareDocumentPosition(beforeParentRef.current), {
        preceding: true,
        following: false,
        contains: false,
        containedBy: false,
        disconnected: false,
        implementationSpecific: true,
      });
      expectPosition(fragmentRef.current.compareDocumentPosition(afterRef.current), {
        preceding: false,
        following: true,
        contains: false,
        containedBy: false,
        disconnected: false,
        implementationSpecific: true,
      });
      expectPosition(fragmentRef.current.compareDocumentPosition(afterParentRef.current), {
        preceding: false,
        following: true,
        contains: false,
        containedBy: false,
        disconnected: false,
        implementationSpecific: true,
      });
      expectPosition(fragmentRef.current.compareDocumentPosition(containerRef.current), {
        preceding: false,
        following: false,
        contains: true,
        containedBy: false,
        disconnected: false,
        implementationSpecific: true,
      });
    });

    it("handles nested children", async () => {
      const fragmentRef = React.createRef<any>();
      const nestedFragmentRef = React.createRef<any>();
      const childARef = React.createRef<HTMLDivElement>();
      const childBRef = React.createRef<HTMLDivElement>();
      const childCRef = React.createRef<HTMLDivElement>();
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);

      const Child = () => {
        return (
          <div ref={childCRef} id="C">
            C
          </div>
        );
      };

      const Test = () => {
        return (
          <React.Fragment ref={fragmentRef}>
            <div ref={childARef} id="A">
              A
            </div>
            <React.Fragment ref={nestedFragmentRef}>
              <div ref={childBRef} id="B">
                B
              </div>
            </React.Fragment>
            <Child />
          </React.Fragment>
        );
      };

      await act(() => root.render(<Test />));

      expectPosition(fragmentRef.current.compareDocumentPosition(childARef.current), {
        preceding: false,
        following: false,
        contains: false,
        containedBy: true,
        disconnected: false,
        implementationSpecific: false,
      });
      expectPosition(fragmentRef.current.compareDocumentPosition(childBRef.current), {
        preceding: false,
        following: false,
        contains: false,
        containedBy: true,
        disconnected: false,
        implementationSpecific: false,
      });
      expectPosition(fragmentRef.current.compareDocumentPosition(childCRef.current), {
        preceding: false,
        following: false,
        contains: false,
        containedBy: true,
        disconnected: false,
        implementationSpecific: false,
      });
    });

    it("returns disconnected for comparison with an unmounted fragment instance", async () => {
      const fragmentRef = React.createRef<any>();
      const containerRef = React.createRef<HTMLDivElement>();
      const root = ReactDOMClient.createRoot(container);

      const Test = ({ mount }: { mount: boolean }) => {
        return (
          <div ref={containerRef}>
            {mount && (
              <Fragment ref={fragmentRef}>
                <div />
              </Fragment>
            )}
          </div>
        );
      };

      await act(() => root.render(<Test mount={true} />));

      const fragmentHandle = fragmentRef.current;

      expectPosition(fragmentHandle.compareDocumentPosition(containerRef.current), {
        preceding: true,
        following: false,
        contains: true,
        containedBy: false,
        disconnected: false,
        implementationSpecific: false,
      });

      await act(() => {
        root.render(<Test mount={false} />);
      });

      expectPosition(fragmentHandle.compareDocumentPosition(containerRef.current), {
        preceding: false,
        following: false,
        contains: false,
        containedBy: false,
        disconnected: true,
        implementationSpecific: false,
      });
    });

    it("compares a root-level Fragment", async () => {
      const fragmentRef = React.createRef<any>();
      const emptyFragmentRef = React.createRef<any>();
      const childRef = React.createRef<HTMLDivElement>();
      const siblingPrecedingRef = React.createRef<HTMLDivElement>();
      const siblingFollowingRef = React.createRef<HTMLDivElement>();
      const root = ReactDOMClient.createRoot(container);

      const Test = () => {
        return (
          <Fragment>
            <div ref={siblingPrecedingRef} />
            <Fragment ref={fragmentRef}>
              <div ref={childRef} />
            </Fragment>
            <Fragment ref={emptyFragmentRef} />
            <div ref={siblingFollowingRef} />
          </Fragment>
        );
      };

      await act(() => root.render(<Test />));

      const fragmentInstance = fragmentRef.current;
      if (fragmentInstance == null) {
        throw new Error("Expected fragment instance to be non-null");
      }
      const emptyFragmentInstance = emptyFragmentRef.current;
      if (emptyFragmentInstance == null) {
        throw new Error("Expected empty fragment instance to be non-null");
      }

      expectPosition(fragmentInstance.compareDocumentPosition(childRef.current), {
        preceding: false,
        following: false,
        contains: false,
        containedBy: true,
        disconnected: false,
        implementationSpecific: false,
      });

      expectPosition(fragmentInstance.compareDocumentPosition(siblingPrecedingRef.current), {
        preceding: true,
        following: false,
        contains: false,
        containedBy: false,
        disconnected: false,
        implementationSpecific: false,
      });

      expectPosition(fragmentInstance.compareDocumentPosition(siblingFollowingRef.current), {
        preceding: false,
        following: true,
        contains: false,
        containedBy: false,
        disconnected: false,
        implementationSpecific: false,
      });

      expectPosition(emptyFragmentInstance.compareDocumentPosition(childRef.current), {
        preceding: true,
        following: false,
        contains: false,
        containedBy: false,
        disconnected: false,
        implementationSpecific: true,
      });

      expectPosition(emptyFragmentInstance.compareDocumentPosition(siblingPrecedingRef.current), {
        preceding: true,
        following: false,
        contains: false,
        containedBy: false,
        disconnected: false,
        implementationSpecific: true,
      });

      expectPosition(emptyFragmentInstance.compareDocumentPosition(siblingFollowingRef.current), {
        preceding: false,
        following: true,
        contains: false,
        containedBy: false,
        disconnected: false,
        implementationSpecific: true,
      });
    });

    describe("with portals", () => {
      it("handles portaled elements", async () => {
        const fragmentRef = React.createRef<any>();
        const portaledSiblingRef = React.createRef<HTMLDivElement>();
        const portaledChildRef = React.createRef<HTMLDivElement>();

        const Test = () => {
          return (
            <div id="wrapper">
              {createPortal(<div ref={portaledSiblingRef} id="A" />, container)}
              <Fragment ref={fragmentRef}>
                {createPortal(<div ref={portaledChildRef} id="B" />, container)}
                <div id="C" />
              </Fragment>
            </div>
          );
        };

        const root = ReactDOMClient.createRoot(container);
        await act(() => root.render(<Test />));

        expectPosition(fragmentRef.current.compareDocumentPosition(portaledSiblingRef.current), {
          preceding: true,
          following: false,
          contains: false,
          containedBy: false,
          disconnected: false,
          implementationSpecific: false,
        });

        expectPosition(fragmentRef.current.compareDocumentPosition(portaledChildRef.current), {
          preceding: false,
          following: false,
          contains: false,
          containedBy: false,
          disconnected: false,
          implementationSpecific: true,
        });
      });

      it("handles multiple portals to the same element", async () => {
        const root = ReactDOMClient.createRoot(container);
        const fragmentRef = React.createRef<any>();
        const childARef = React.createRef<HTMLDivElement>();
        const childBRef = React.createRef<HTMLParagraphElement>();
        const childCRef = React.createRef<HTMLDivElement>();
        const childDRef = React.createRef<HTMLDivElement>();
        const childERef = React.createRef<HTMLDivElement>();

        const Test = () => {
          const [showC, setShowC] = React.useState(false);
          React.useEffect(() => {
            setShowC(true);
          });

          return (
            <>
              {createPortal(
                <Fragment ref={fragmentRef}>
                  <div id="A" ref={childARef} />
                  {showC ? (
                    <div id="C" ref={childCRef}>
                      <div id="D" ref={childDRef} />
                    </div>
                  ) : null}
                </Fragment>,
                document.body,
              )}
              {createPortal(<p id="B" ref={childBRef} />, document.body)}
              <div id="E" ref={childERef} />
            </>
          );
        };

        await act(() => root.render(<Test />));

        expect(document.body.outerHTML).toBe(
          "<body>" +
            '<div><div id="E"></div></div>' +
            '<div id="A"></div>' +
            '<p id="B"></p>' +
            '<div id="C"><div id="D"></div></div>' +
            "</body>",
        );

        expectPosition(fragmentRef.current.compareDocumentPosition(document.body), {
          preceding: true,
          following: false,
          contains: true,
          containedBy: false,
          disconnected: false,
          implementationSpecific: false,
        });
        expectPosition(fragmentRef.current.compareDocumentPosition(childARef.current), {
          preceding: false,
          following: false,
          contains: false,
          containedBy: true,
          disconnected: false,
          implementationSpecific: false,
        });
        expectPosition(fragmentRef.current.compareDocumentPosition(childBRef.current), {
          preceding: false,
          following: false,
          contains: false,
          containedBy: false,
          disconnected: false,
          implementationSpecific: true,
        });
        expectPosition(fragmentRef.current.compareDocumentPosition(childCRef.current), {
          preceding: false,
          following: false,
          contains: false,
          containedBy: true,
          disconnected: false,
          implementationSpecific: false,
        });
        expectPosition(fragmentRef.current.compareDocumentPosition(childDRef.current), {
          preceding: false,
          following: false,
          contains: false,
          containedBy: true,
          disconnected: false,
          implementationSpecific: false,
        });
        expectPosition(fragmentRef.current.compareDocumentPosition(childERef.current), {
          preceding: false,
          following: false,
          contains: false,
          containedBy: false,
          disconnected: false,
          implementationSpecific: true,
        });
      });

      it("handles empty fragments", async () => {
        const fragmentRef = React.createRef<any>();
        const childARef = React.createRef<HTMLDivElement>();
        const childBRef = React.createRef<HTMLDivElement>();

        const Test = () => {
          return (
            <>
              <div id="A" ref={childARef} />
              {createPortal(<Fragment ref={fragmentRef} />, document.body)}
              <div id="B" ref={childBRef} />
            </>
          );
        };

        const root = ReactDOMClient.createRoot(container);
        await act(() => root.render(<Test />));

        expectPosition(fragmentRef.current.compareDocumentPosition(document.body), {
          preceding: true,
          following: false,
          contains: true,
          containedBy: false,
          disconnected: false,
          implementationSpecific: true,
        });
        expectPosition(fragmentRef.current.compareDocumentPosition(childARef.current), {
          preceding: true,
          following: false,
          contains: false,
          containedBy: false,
          disconnected: false,
          implementationSpecific: true,
        });
        expectPosition(fragmentRef.current.compareDocumentPosition(childBRef.current), {
          preceding: true,
          following: false,
          contains: false,
          containedBy: false,
          disconnected: false,
          implementationSpecific: true,
        });
      });
    });
  });

  describe.skipIf(!supportsFragmentRefsScrollIntoView)("scrollIntoView", () => {
    const expectLast = (array: string[], test: string) => {
      expect(array[array.length - 1]).toBe(test);
    };

    it("does not yet support options", async () => {
      const fragmentRef = React.createRef<any>();
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Fragment ref={fragmentRef} />);
      });

      expect(() => {
        fragmentRef.current.scrollIntoView({ block: "start" });
      }).toThrowError(
        "FragmentInstance.scrollIntoView() does not support " +
          "scrollIntoViewOptions. Use the alignToTop boolean instead.",
      );
    });

    describe("with children", () => {
      it("settles scroll on the first child by default, or if alignToTop=true", async () => {
        const fragmentRef = React.createRef<any>();
        const childARef = React.createRef<HTMLDivElement>();
        const childBRef = React.createRef<HTMLDivElement>();
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(
            <React.Fragment ref={fragmentRef}>
              <div ref={childARef} id="a">
                A
              </div>
              <div ref={childBRef} id="b">
                B
              </div>
            </React.Fragment>,
          );
        });

        let logs: string[] = [];
        childARef.current!.scrollIntoView = vi.fn().mockImplementation(() => {
          logs.push("childA");
        });
        childBRef.current!.scrollIntoView = vi.fn().mockImplementation(() => {
          logs.push("childB");
        });

        fragmentRef.current.scrollIntoView();
        expectLast(logs, "childA");
        logs = [];
        fragmentRef.current.scrollIntoView(true);
        expectLast(logs, "childA");
      });

      it("calls scrollIntoView on the last child if alignToTop is false", async () => {
        const fragmentRef = React.createRef<any>();
        const childARef = React.createRef<HTMLDivElement>();
        const childBRef = React.createRef<HTMLDivElement>();
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(
            <Fragment ref={fragmentRef}>
              <div ref={childARef}>A</div>
              <div ref={childBRef}>B</div>
            </Fragment>,
          );
        });

        const logs: string[] = [];
        childARef.current!.scrollIntoView = vi.fn().mockImplementation(() => {
          logs.push("childA");
        });
        childBRef.current!.scrollIntoView = vi.fn().mockImplementation(() => {
          logs.push("childB");
        });

        fragmentRef.current.scrollIntoView(false);
        expectLast(logs, "childB");
      });

      it("handles portaled elements -- same scroll container", async () => {
        const fragmentRef = React.createRef<any>();
        const childARef = React.createRef<HTMLDivElement>();
        const childBRef = React.createRef<HTMLDivElement>();
        const root = ReactDOMClient.createRoot(container);

        const Test = () => {
          return (
            <Fragment ref={fragmentRef}>
              {createPortal(
                <div ref={childARef} id="child-a">
                  A
                </div>,
                document.body,
              )}

              <div ref={childBRef} id="child-b">
                B
              </div>
            </Fragment>
          );
        };

        await act(() => {
          root.render(<Test />);
        });

        const logs: string[] = [];
        childARef.current!.scrollIntoView = vi.fn().mockImplementation(() => {
          logs.push("childA");
        });
        childBRef.current!.scrollIntoView = vi.fn().mockImplementation(() => {
          logs.push("childB");
        });

        fragmentRef.current.scrollIntoView();
        expectLast(logs, "childA");
      });

      it("handles portaled elements -- different scroll container", async () => {
        const fragmentRef = React.createRef<any>();
        const headerChildRef = React.createRef<HTMLDivElement>();
        const childARef = React.createRef<HTMLDivElement>();
        const childBRef = React.createRef<HTMLDivElement>();
        const childCRef = React.createRef<HTMLDivElement>();
        const scrollContainerRef = React.createRef<HTMLDivElement>();
        const scrollContainerNestedRef = React.createRef<HTMLDivElement>();
        const root = ReactDOMClient.createRoot(container);

        const Test = ({ mountFragment }: { mountFragment: boolean }) => {
          return (
            <>
              <div id="header" style={{ position: "fixed" }}>
                <div id="parent-a" />
              </div>
              <div id="parent-b" />
              <div id="scroll-container" ref={scrollContainerRef} style={{ overflow: "scroll" }}>
                <div id="parent-c" />
                <div
                  id="scroll-container-nested"
                  ref={scrollContainerNestedRef}
                  style={{ overflow: "scroll" }}
                >
                  <div id="parent-d" />
                </div>
              </div>
              {mountFragment && (
                <Fragment ref={fragmentRef}>
                  {createPortal(
                    <div ref={headerChildRef} id="header-content">
                      Header
                    </div>,
                    document.querySelector("#parent-a")!,
                  )}
                  {createPortal(
                    <div ref={childARef} id="child-a">
                      A
                    </div>,
                    document.querySelector("#parent-b")!,
                  )}
                  {createPortal(
                    <div ref={childBRef} id="child-b">
                      B
                    </div>,
                    document.querySelector("#parent-b")!,
                  )}
                  {createPortal(
                    <div ref={childCRef} id="child-c">
                      C
                    </div>,
                    document.querySelector("#parent-c")!,
                  )}
                </Fragment>
              )}
            </>
          );
        };

        await act(() => {
          root.render(<Test mountFragment={false} />);
        });
        await act(() => {
          root.render(<Test mountFragment={true} />);
        });

        let logs: string[] = [];
        headerChildRef.current!.scrollIntoView = vi.fn(() => {
          logs.push("header");
        });
        childARef.current!.scrollIntoView = vi.fn(() => {
          logs.push("A");
        });
        childBRef.current!.scrollIntoView = vi.fn(() => {
          logs.push("B");
        });
        childCRef.current!.scrollIntoView = vi.fn(() => {
          logs.push("C");
        });

        fragmentRef.current.scrollIntoView();
        expectLast(logs, "header");

        (childARef.current!.scrollIntoView as ReturnType<typeof vi.fn>).mockClear();
        (childBRef.current!.scrollIntoView as ReturnType<typeof vi.fn>).mockClear();
        (childCRef.current!.scrollIntoView as ReturnType<typeof vi.fn>).mockClear();

        logs = [];

        fragmentRef.current.scrollIntoView(false);
        expectLast(logs, "C");
      });
    });

    describe("without children", () => {
      it("calls scrollIntoView on the next sibling by default, or if alignToTop=true", async () => {
        const fragmentRef = React.createRef<any>();
        const siblingARef = React.createRef<HTMLDivElement>();
        const siblingBRef = React.createRef<HTMLDivElement>();
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(
            <div>
              <Wrapper>
                <div ref={siblingARef} />
              </Wrapper>
              <Fragment ref={fragmentRef} />
              <div ref={siblingBRef} />
            </div>,
          );
        });

        siblingARef.current!.scrollIntoView = vi.fn();
        siblingBRef.current!.scrollIntoView = vi.fn();

        fragmentRef.current.scrollIntoView();
        expect(siblingARef.current!.scrollIntoView).toHaveBeenCalledTimes(0);
        expect(siblingBRef.current!.scrollIntoView).toHaveBeenCalledTimes(1);

        (siblingBRef.current!.scrollIntoView as ReturnType<typeof vi.fn>).mockClear();

        fragmentRef.current.scrollIntoView(true);
        expect(siblingARef.current!.scrollIntoView).toHaveBeenCalledTimes(0);
        expect(siblingBRef.current!.scrollIntoView).toHaveBeenCalledTimes(1);
      });

      it("calls scrollIntoView on the prev sibling if alignToTop is false", async () => {
        const fragmentRef = React.createRef<any>();
        const siblingARef = React.createRef<HTMLDivElement>();
        const siblingBRef = React.createRef<HTMLDivElement>();
        const root = ReactDOMClient.createRoot(container);
        const C = () => {
          return (
            <Wrapper>
              <div id="C" ref={siblingARef} />
            </Wrapper>
          );
        };
        const Test = () => {
          return (
            <div id="A">
              <div id="B" />
              <C />
              <Fragment ref={fragmentRef} />
              <div id="D" ref={siblingBRef} />
              <div id="E" />
            </div>
          );
        };
        await act(() => {
          root.render(<Test />);
        });

        siblingARef.current!.scrollIntoView = vi.fn();
        siblingBRef.current!.scrollIntoView = vi.fn();

        fragmentRef.current.scrollIntoView(false);
        expect(siblingARef.current!.scrollIntoView).toHaveBeenCalledTimes(1);
        expect(siblingBRef.current!.scrollIntoView).toHaveBeenCalledTimes(0);
      });

      it("calls scrollIntoView on the parent if there are no siblings", async () => {
        const fragmentRef = React.createRef<any>();
        const parentRef = React.createRef<HTMLDivElement>();
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(
            <div ref={parentRef}>
              <Wrapper>
                <Fragment ref={fragmentRef} />
              </Wrapper>
            </div>,
          );
        });

        parentRef.current!.scrollIntoView = vi.fn();
        fragmentRef.current.scrollIntoView();
        expect(parentRef.current!.scrollIntoView).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("with text nodes", () => {
    describe.skipIf(!supportsFragmentRefsTextNodes)("text node client rects", () => {
      it("getClientRects includes text node bounds", async () => {
        const restoreRange = mockRangeClientRects([{ x: 0, y: 0, width: 80, height: 16 }]);
        const fragmentRef = React.createRef<any>();
        const root = ReactDOMClient.createRoot(container);

        await act(() =>
          root.render(
            <div>
              <Fragment ref={fragmentRef}>Hello World</Fragment>
            </div>,
          ),
        );

        const rects = fragmentRef.current.getClientRects();
        expect(rects.length).toBe(1);
        expect(rects[0].width).toBe(80);
        restoreRange();
      });

      it("getClientRects includes both text and element bounds", async () => {
        const restoreRange = mockRangeClientRects([{ x: 0, y: 0, width: 60, height: 16 }]);
        const fragmentRef = React.createRef<any>();
        const childRef = React.createRef<HTMLDivElement>();
        const root = ReactDOMClient.createRoot(container);

        await act(() =>
          root.render(
            <div>
              <Fragment ref={fragmentRef}>
                Text before
                <div ref={childRef}>Element</div>
                Text after
              </Fragment>
            </div>,
          ),
        );

        setClientRects(childRef.current!, [{ x: 10, y: 10, width: 100, height: 20 }]);
        const rects = fragmentRef.current.getClientRects();
        expect(rects.length).toBe(3);
        restoreRange();
      });
    });

    it("compareDocumentPosition works with text children", async () => {
      const fragmentRef = React.createRef<any>();
      const beforeRef = React.createRef<HTMLDivElement>();
      const root = ReactDOMClient.createRoot(container);

      await act(() =>
        root.render(
          <div>
            <div ref={beforeRef} />
            <Fragment ref={fragmentRef}>Text content</Fragment>
          </div>,
        ),
      );

      const position = fragmentRef.current.compareDocumentPosition(beforeRef.current);
      expect(position & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    });

    it("focus is a no-op on text-only fragment", async () => {
      const fragmentRef = React.createRef<any>();
      const root = ReactDOMClient.createRoot(container);

      await act(() =>
        root.render(
          <div>
            <Fragment ref={fragmentRef}>Text only content</Fragment>
          </div>,
        ),
      );

      fragmentRef.current.focus();
    });

    it("focusLast is a no-op on text-only fragment", async () => {
      const fragmentRef = React.createRef<any>();
      const root = ReactDOMClient.createRoot(container);

      await act(() =>
        root.render(
          <div>
            <Fragment ref={fragmentRef}>Text only content</Fragment>
          </div>,
        ),
      );

      fragmentRef.current.focusLast();
    });

    describe.skipIf(!supportsFragmentRefsTextNodes)("text node observer warning", () => {
      beforeEach(() => {
        mockIntersectionObserver();
      });

      afterEach(() => {
        restoreIntersectionObserver();
      });

      it("warns when observeUsing is called on text-only fragment", async () => {
        const fragmentRef = React.createRef<any>();
        const root = ReactDOMClient.createRoot(container);

        await act(() =>
          root.render(
            <div>
              <Fragment ref={fragmentRef}>Text only content</Fragment>
            </div>,
          ),
        );

        const observer = new IntersectionObserver(() => {});
        fragmentRef.current.observeUsing(observer);
      });
    });

    describe.skipIf(!supportsFragmentRefsScrollIntoView)("text node scrollIntoView", () => {
      it("scrollIntoView works on text-only fragment using Range API", async () => {
        const restoreRange = mockRangeClientRects([{ x: 100, y: 200, width: 80, height: 16 }]);
        const fragmentRef = React.createRef<any>();
        const root = ReactDOMClient.createRoot(container);

        await act(() =>
          root.render(
            <div>
              <Fragment ref={fragmentRef}>Text content</Fragment>
            </div>,
          ),
        );

        const originalScrollTo = window.scrollTo;
        const scrollToMock = vi.fn();
        window.scrollTo = scrollToMock as any;

        fragmentRef.current.scrollIntoView();

        expect(scrollToMock).toHaveBeenCalled();

        window.scrollTo = originalScrollTo;
        restoreRange();
      });
    });

    it("treats passive:true and passive:false as same listener per DOM spec", async () => {
      const fragmentRef = React.createRef<any>();
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <Fragment ref={fragmentRef}>
            <div id="child" />
          </Fragment>,
        );
      });

      const logs: string[] = [];
      const handler = () => logs.push("fired");

      const child = document.querySelector("#child")!;
      const spy = vi.spyOn(child, "addEventListener");
      fragmentRef.current.addEventListener("click", handler, {
        passive: false,
      });
      fragmentRef.current.addEventListener("click", handler, {
        passive: true,
      });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("click", handler, { passive: false });

      document.querySelector<HTMLElement>("#child")!.click();
      expect(logs).toEqual(["fired"]);

      fragmentRef.current.removeEventListener("click", handler, {
        passive: true,
      });

      logs.length = 0;
      document.querySelector<HTMLElement>("#child")!.click();
      expect(logs).toEqual([]);
    });

    it("removes a listener registered with passive:false when removed with passive:true", async () => {
      const fragmentRef = React.createRef<any>();
      const InnerTest = () => {
        return (
          <>
            <div id="child-x" />
          </>
        );
      };
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <Fragment ref={fragmentRef}>
            <InnerTest />
          </Fragment>,
        );
      });
      const logs: string[] = [];
      const handler = () => {
        logs.push("fired");
      };
      fragmentRef.current.addEventListener("click", handler, {
        passive: false,
      });
      document.querySelector<HTMLElement>("#child-x")!.click();
      expect(logs).toEqual(["fired"]);
      logs.length = 0;
      fragmentRef.current.removeEventListener("click", handler, {
        passive: true,
      });
      document.querySelector<HTMLElement>("#child-x")!.click();
      expect(logs).toEqual([]);
    });
  });
});
