import React from "react";
import { flushSync } from "react-dom";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect } from "vitest";
import { act } from "./utils";

describe("ReactEmptyComponent", () => {
  describe.each([null, undefined])("when %s", (nullOrUndefined: null | undefined) => {
    it("should not throw when rendering", () => {
      const EmptyComponent = () => {
        return nullOrUndefined;
      };

      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      expect(() => {
        flushSync(() => {
          root.render(<EmptyComponent />);
        });
      }).not.toThrowError();
    });

    it("should not produce child DOM nodes for nullish and false", async () => {
      const Component1 = () => {
        return nullOrUndefined;
      };

      const Component2 = () => {
        return false;
      };

      const container1 = document.createElement("div");
      const root1 = ReactDOMClient.createRoot(container1);
      await act(() => {
        root1.render(<Component1 />);
      });
      expect(container1.children.length).toBe(0);

      const container2 = document.createElement("div");
      const root2 = ReactDOMClient.createRoot(container2);
      await act(() => {
        root2.render(<Component2 />);
      });
      expect(container2.children.length).toBe(0);
    });

    it("should be able to switch between rendering nullish and a normal tag", async () => {
      const Toggler = ({ showDiv }: { showDiv: boolean }) => {
        return showDiv ? <div>content</div> : nullOrUndefined;
      };

      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<Toggler showDiv={false} />);
      });
      expect(container.innerHTML).toBe("");

      await act(() => {
        root.render(<Toggler showDiv={true} />);
      });
      expect(container.innerHTML).toBe("<div>content</div>");

      await act(() => {
        root.render(<Toggler showDiv={false} />);
      });
      expect(container.innerHTML).toBe("");
    });

    it("should be able to switch in a list of children", async () => {
      const Toggler = ({ showDiv }: { showDiv: boolean }) => {
        return showDiv ? <div>content</div> : nullOrUndefined;
      };

      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div>
            <Toggler showDiv={false} />
            <Toggler showDiv={false} />
            <Toggler showDiv={false} />
          </div>,
        );
      });
      expect(container.firstChild!.childNodes.length).toBe(0);

      await act(() => {
        root.render(
          <div>
            <Toggler showDiv={true} />
            <Toggler showDiv={true} />
            <Toggler showDiv={true} />
          </div>,
        );
      });
      expect(container.firstChild!.childNodes.length).toBe(3);
    });

    it("should distinguish between a script placeholder and an actual script tag", async () => {
      const Toggler = ({ tag }: { tag: string | null }) => {
        if (tag === null) return nullOrUndefined;
        return React.createElement(tag);
      };

      const container1 = document.createElement("div");
      const root1 = ReactDOMClient.createRoot(container1);
      await act(() => {
        root1.render(<Toggler tag={null} />);
      });
      expect(container1.innerHTML).toBe("");

      await act(() => {
        root1.render(<Toggler tag="script" />);
      });
      expect(container1.innerHTML).toBe("<script></script>");

      const container2 = document.createElement("div");
      const root2 = ReactDOMClient.createRoot(container2);
      await act(() => {
        root2.render(<Toggler tag="script" />);
      });
      expect(container2.innerHTML).toBe("<script></script>");

      await act(() => {
        root2.render(<Toggler tag={null} />);
      });
      expect(container2.innerHTML).toBe("");
    });

    it("should render no DOM when multiple layers of composite components render nullish", async () => {
      const GrandChild = () => nullOrUndefined;
      const Child = () => <GrandChild />;

      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<Child />);
      });
      expect(container.innerHTML).toBe("");

      await act(() => {
        root.render(<div />);
      });
      expect(container.innerHTML).toBe("<div></div>");

      await act(() => {
        root.render(<Child />);
      });
      expect(container.innerHTML).toBe("");
    });

    it("works when switching components", async () => {
      const innerRef = React.createRef<HTMLSpanElement>();

      const Wrapper = ({ showInner }: { showInner: boolean }) => {
        return showInner ? <span ref={innerRef} /> : nullOrUndefined;
      };

      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Wrapper showInner={true} />);
      });
      expect(innerRef.current).not.toBe(null);

      await act(() => {
        root.render(<Wrapper showInner={false} />);
      });
      expect(innerRef.current).toBe(null);

      await act(() => {
        root.render(<Wrapper showInner={true} />);
      });
      expect(innerRef.current).not.toBe(null);
    });

    it("can render nullish at the top level", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(nullOrUndefined);
      });
      expect(container.innerHTML).toBe("");
    });

    it("does not break when updating during mount", () => {
      class Child extends React.Component<{
        visible: boolean;
        onMount?: () => void;
      }> {
        componentDidMount() {
          if (this.props.onMount) {
            this.props.onMount();
          }
        }

        render() {
          if (!this.props.visible) {
            return nullOrUndefined;
          }
          return <div>hello world</div>;
        }
      }

      class Parent extends React.Component {
        update = () => {
          this.forceUpdate();
        };

        render() {
          return (
            <div>
              <Child key="1" visible={false} />
              <Child key="0" visible={true} onMount={this.update} />
              <Child key="2" visible={false} />
            </div>
          );
        }
      }

      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      expect(() => {
        flushSync(() => {
          root.render(<Parent />);
        });
      }).not.toThrow();
    });

    it("preserves the dom node during updates", async () => {
      const Empty = () => {
        return nullOrUndefined;
      };

      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Empty />);
      });
      expect(container.firstChild).toBe(null);

      await act(() => {
        root.render(<Empty />);
      });
      expect(container.firstChild).toBe(null);
    });

    it("should not warn about React.forwardRef that returns nullish", () => {
      const Empty = React.forwardRef(() => {
        return nullOrUndefined;
      });

      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      expect(() => {
        flushSync(() => {
          root.render(<Empty />);
        });
      }).not.toThrowError();
    });

    it("should not warn about React.memo that returns nullish", () => {
      const Empty = React.memo(() => {
        return nullOrUndefined;
      });

      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      expect(() => {
        flushSync(() => {
          root.render(<Empty />);
        });
      }).not.toThrowError();
    });
  });
});
