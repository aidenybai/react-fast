// @vitest-environment jsdom
import React from "react";
import ReactDOM from "react-dom";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "./utils";

describe("ReactDOMComponent", () => {
  describe("updateDOM", () => {
    it("should handle className", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div style={{}} />);
      });

      await act(() => {
        root.render(<div className={"foo"} />);
      });
      expect((container.firstChild as HTMLElement).className).toEqual("foo");
      await act(() => {
        root.render(<div className={"bar"} />);
      });
      expect((container.firstChild as HTMLElement).className).toEqual("bar");
      await act(() => {
        root.render(<div className={undefined} />);
      });
      expect((container.firstChild as HTMLElement).className).toEqual("");
    });

    it("should gracefully handle various style value types", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div style={{}} />);
      });
      const stubStyle = (container.firstChild as HTMLElement).style;

      const setup = {
        display: "block",
        left: "1px",
        top: 2,
        fontFamily: "Arial",
      };
      await act(() => {
        root.render(<div style={setup as React.CSSProperties} />);
      });
      expect(stubStyle.display).toEqual("block");
      expect(stubStyle.left).toEqual("1px");
      expect(stubStyle.top).toEqual("2px");
      expect(stubStyle.fontFamily).toEqual("Arial");

      const reset = {
        display: "",
        left: null,
        top: false,
        fontFamily: true,
      };
      await act(() => {
        root.render(<div style={reset as unknown as React.CSSProperties} />);
      });
      expect(stubStyle.display).toEqual("");
      expect(stubStyle.left).toEqual("");
      expect(stubStyle.top).toEqual("");
      expect(stubStyle.fontFamily).toEqual("");
    });

    it("should not update styles when mutating a proxy style object", async () => {
      const styleStore = {
        display: "none",
        fontFamily: "Arial",
        lineHeight: 1.2 as string | number,
      };
      const styles = {
        get display() {
          return styleStore.display;
        },
        set display(value: string) {
          styleStore.display = value;
        },
        get fontFamily() {
          return styleStore.fontFamily;
        },
        set fontFamily(value: string) {
          styleStore.fontFamily = value;
        },
        get lineHeight() {
          return styleStore.lineHeight;
        },
        set lineHeight(value: string | number) {
          styleStore.lineHeight = value;
        },
      };
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div style={styles as unknown as React.CSSProperties} />);
      });

      const stubStyle = (container.firstChild as HTMLElement).style;
      stubStyle.display = styles.display;
      stubStyle.fontFamily = styles.fontFamily;

      styles.display = "block";

      await act(() => {
        root.render(<div style={styles as unknown as React.CSSProperties} />);
      });
      expect(stubStyle.display).toEqual("none");
      expect(stubStyle.fontFamily).toEqual("Arial");
      expect(stubStyle.lineHeight).toEqual("1.2");

      styles.fontFamily = "Helvetica";

      await act(() => {
        root.render(<div style={styles as unknown as React.CSSProperties} />);
      });
      expect(stubStyle.display).toEqual("none");
      expect(stubStyle.fontFamily).toEqual("Arial");
      expect(stubStyle.lineHeight).toEqual("1.2");

      styles.lineHeight = 0.5;

      await act(() => {
        root.render(<div style={styles as unknown as React.CSSProperties} />);
      });
      expect(stubStyle.display).toEqual("none");
      expect(stubStyle.fontFamily).toEqual("Arial");
      expect(stubStyle.lineHeight).toEqual("1.2");

      await act(() => {
        root.render(<div style={undefined} />);
      });
      expect(stubStyle.display).toBe("");
      expect(stubStyle.fontFamily).toBe("");
      expect(stubStyle.lineHeight).toBe("");
    });

    it("should warn for unknown string event handlers", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("div", { onUnknown: 'alert("hack")' }));
      });
      expect((container.firstChild as HTMLElement).hasAttribute("onUnknown")).toBe(false);
      expect((container.firstChild as HTMLElement as any).onUnknown).toBe(undefined);
      await act(() => {
        root.render(React.createElement("div", { onunknown: 'alert("hack")' }));
      });
      expect((container.firstChild as HTMLElement).hasAttribute("onunknown")).toBe(false);
      expect((container.firstChild as HTMLElement as any).onunknown).toBe(undefined);

      await act(() => {
        root.render(React.createElement("div", { "on-unknown": 'alert("hack")' }));
      });
      expect((container.firstChild as HTMLElement).hasAttribute("on-unknown")).toBe(false);
      expect((container.firstChild as any)["on-unknown"]).toBe(undefined);
    });

    it("should warn for unknown function event handlers", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("div", { onUnknown: function () {} }));
      });
      expect((container.firstChild as HTMLElement).hasAttribute("onUnknown")).toBe(false);
      expect((container.firstChild as HTMLElement as any).onUnknown).toBe(undefined);
      await act(() => {
        root.render(React.createElement("div", { onunknown: function () {} }));
      });
      expect((container.firstChild as HTMLElement).hasAttribute("onunknown")).toBe(false);
      expect((container.firstChild as HTMLElement as any).onunknown).toBe(undefined);
      await act(() => {
        root.render(React.createElement("div", { "on-unknown": function () {} }));
      });
      expect((container.firstChild as HTMLElement).hasAttribute("on-unknown")).toBe(false);
      expect((container.firstChild as any)["on-unknown"]).toBe(undefined);
    });

    it("should warn for badly cased React attributes", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("div", { CHILDREN: "5" }));
      });
      expect((container.firstChild as HTMLElement).getAttribute("CHILDREN")).toBe("5");
    });

    it("should not warn for '0' as a unitless style value", async () => {
      class Component extends React.Component {
        render() {
          return <div style={{ margin: "0" }} />;
        }
      }

      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Component />);
      });
    });

    it("throws with Temporal-like objects as style values", async () => {
      class TemporalLike {
        valueOf() {
          throw new TypeError("prod message");
        }
        toString() {
          return "2020-01-01";
        }
      }
      const style = { fontSize: new TemporalLike() };
      const root = ReactDOMClient.createRoot(document.createElement("div"));
      await expect(async () => {
        await act(() => {
          root.render(<span style={style as unknown as React.CSSProperties} />);
        });
      }).rejects.toThrowError(new TypeError("prod message"));
    });

    it("should update styles if initially null", async () => {
      let styles: React.CSSProperties | null = null;
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div style={styles as unknown as React.CSSProperties} />);
      });

      const stubStyle = (container.firstChild as HTMLElement).style;

      styles = { display: "block" };

      await act(() => {
        root.render(<div style={styles!} />);
      });
      expect(stubStyle.display).toEqual("block");
    });

    it("should update styles if updated to null multiple times", async () => {
      let styles: React.CSSProperties | null = null;
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div style={styles as unknown as React.CSSProperties} />);
      });

      styles = { display: "block" };
      const stubStyle = (container.firstChild as HTMLElement).style;

      await act(() => {
        root.render(<div style={styles!} />);
      });
      expect(stubStyle.display).toEqual("block");

      await act(() => {
        root.render(<div style={null as unknown as React.CSSProperties} />);
      });
      expect(stubStyle.display).toEqual("");

      await act(() => {
        root.render(<div style={styles!} />);
      });
      expect(stubStyle.display).toEqual("block");

      await act(() => {
        root.render(<div style={null as unknown as React.CSSProperties} />);
      });
      expect(stubStyle.display).toEqual("");
    });

    it("should allow named slot projection on both web components and regular DOM elements", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          React.createElement(
            "my-component",
            null,
            React.createElement("my-second-component", { slot: "first" }),
            React.createElement("button", { slot: "second" }, "Hello"),
          ),
        );
      });

      const lightDOM = container.firstChild!.childNodes;

      expect((lightDOM[0] as HTMLElement).getAttribute("slot")).toBe("first");
      expect((lightDOM[1] as HTMLElement).getAttribute("slot")).toBe("second");
    });

    it("should skip reserved props on web components", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          React.createElement("my-component", {
            children: ["foo"],
            suppressContentEditableWarning: true,
            suppressHydrationWarning: true,
          }),
        );
      });
      expect((container.firstChild as HTMLElement).hasAttribute("children")).toBe(false);
      expect(
        (container.firstChild as HTMLElement).hasAttribute("suppressContentEditableWarning"),
      ).toBe(false);
      expect((container.firstChild as HTMLElement).hasAttribute("suppressHydrationWarning")).toBe(
        false,
      );

      await act(() => {
        root.render(
          React.createElement("my-component", {
            children: ["bar"],
            suppressContentEditableWarning: false,
            suppressHydrationWarning: false,
          }),
        );
      });
      expect((container.firstChild as HTMLElement).hasAttribute("children")).toBe(false);
      expect(
        (container.firstChild as HTMLElement).hasAttribute("suppressContentEditableWarning"),
      ).toBe(false);
      expect((container.firstChild as HTMLElement).hasAttribute("suppressHydrationWarning")).toBe(
        false,
      );
    });

    it("should skip dangerouslySetInnerHTML on web components", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          React.createElement("my-component", {
            dangerouslySetInnerHTML: { __html: "hi" },
          }),
        );
      });
      expect((container.firstChild as HTMLElement).hasAttribute("dangerouslySetInnerHTML")).toBe(
        false,
      );

      await act(() => {
        root.render(
          React.createElement("my-component", {
            dangerouslySetInnerHTML: { __html: "bye" },
          }),
        );
      });
      expect((container.firstChild as HTMLElement).hasAttribute("dangerouslySetInnerHTML")).toBe(
        false,
      );
    });

    it("should render null and undefined as empty but print other falsy values", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div dangerouslySetInnerHTML={{ __html: "textContent" }} />);
      });
      expect(container.textContent).toEqual("textContent");

      await act(() => {
        root.render(<div dangerouslySetInnerHTML={{ __html: 0 as unknown as string }} />);
      });
      expect(container.textContent).toEqual("0");

      await act(() => {
        root.render(<div dangerouslySetInnerHTML={{ __html: false as unknown as string }} />);
      });
      expect(container.textContent).toEqual("false");

      await act(() => {
        root.render(<div dangerouslySetInnerHTML={{ __html: "" }} />);
      });
      expect(container.textContent).toEqual("");

      await act(() => {
        root.render(<div dangerouslySetInnerHTML={{ __html: null as unknown as string }} />);
      });
      expect(container.textContent).toEqual("");

      await act(() => {
        root.render(
          <div
            dangerouslySetInnerHTML={{
              __html: undefined as unknown as string,
            }}
          />,
        );
      });
      expect(container.textContent).toEqual("");
    });

    it("should remove attributes", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<img height="17" />);
      });

      expect((container.firstChild as HTMLElement).hasAttribute("height")).toBe(true);
      await act(() => {
        root.render(<img />);
      });
      expect((container.firstChild as HTMLElement).hasAttribute("height")).toBe(false);
    });

    it("should remove properties", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div className="monkey" />);
      });

      expect((container.firstChild as HTMLElement).className).toEqual("monkey");
      await act(() => {
        root.render(<div />);
      });
      expect((container.firstChild as HTMLElement).className).toEqual("");
    });

    it("should not set null/undefined attributes", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <img src={null as unknown as string} data-foo={undefined as unknown as string} />,
        );
      });
      const node = container.firstChild as HTMLElement;
      expect(node.hasAttribute("src")).toBe(false);
      expect(node.hasAttribute("data-foo")).toBe(false);
      await act(() => {
        root.render(
          <img src={undefined as unknown as string} data-foo={null as unknown as string} />,
        );
      });
      expect(node.hasAttribute("src")).toBe(false);
      expect(node.hasAttribute("data-foo")).toBe(false);
      await act(() => {
        root.render(
          <img src={null as unknown as string} data-foo={undefined as unknown as string} />,
        );
      });
      expect(node.hasAttribute("src")).toBe(false);
      expect(node.hasAttribute("data-foo")).toBe(false);
      await act(() => {
        root.render(<img />);
      });
      expect(node.hasAttribute("src")).toBe(false);
      expect(node.hasAttribute("data-foo")).toBe(false);
      await act(() => {
        root.render(
          <img src={undefined as unknown as string} data-foo={null as unknown as string} />,
        );
      });
      expect(node.hasAttribute("src")).toBe(false);
      expect(node.hasAttribute("data-foo")).toBe(false);
    });

    it("should not add an empty src attribute", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<img src="" />);
      });
      const node = container.firstChild as HTMLElement;
      expect(node.hasAttribute("src")).toBe(false);

      await act(() => {
        root.render(<img src="abc" />);
      });
      expect(node.hasAttribute("src")).toBe(true);

      await act(() => {
        root.render(<img src="" />);
      });
      expect(node.hasAttribute("src")).toBe(false);
    });

    it("should not add an empty href attribute", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<link href="" />);
      });
      const node = container.firstChild as HTMLElement;
      expect(node.hasAttribute("href")).toBe(false);

      await act(() => {
        root.render(<link href="abc" />);
      });
      expect(node.hasAttribute("href")).toBe(true);

      await act(() => {
        root.render(<link href="" />);
      });
      expect(node.hasAttribute("href")).toBe(false);
    });

    it("should allow an empty href attribute on anchors", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<a href="" />);
      });
      const node = container.firstChild as HTMLElement;
      expect(node.getAttribute("href")).toBe("");
    });

    it("should allow an empty action attribute", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<form action="" />);
      });
      const node = container.firstChild as HTMLElement;
      expect(node.getAttribute("action")).toBe("");

      await act(() => {
        root.render(<form action="abc" />);
      });
      expect(node.hasAttribute("action")).toBe(true);

      await act(() => {
        root.render(<form action="" />);
      });
      expect(node.getAttribute("action")).toBe("");
    });

    it("allows empty string of a formAction to override the default of a parent", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <form action="hello">
            <button formAction="" />
          </form>,
        );
      });
      const node = container.firstChild!.firstChild as HTMLElement;
      expect(node.hasAttribute("formaction")).toBe(true);
      expect(node.getAttribute("formaction")).toBe("");
    });

    it("should not filter attributes for custom elements", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          React.createElement("some-custom-element", {
            action: "",
            formAction: "",
            href: "",
            src: "",
          }),
        );
      });
      const node = container.firstChild as HTMLElement;
      expect(node.hasAttribute("action")).toBe(true);
      expect(node.hasAttribute("formAction")).toBe(true);
      expect(node.hasAttribute("href")).toBe(true);
      expect(node.hasAttribute("src")).toBe(true);
    });

    it("should apply React-specific aliases to HTML elements", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<form acceptCharset="foo" />);
      });
      const node = container.firstChild as HTMLElement;
      expect(node.getAttribute("accept-charset")).toBe("foo");
      expect(node.hasAttribute("acceptCharset")).toBe(false);
      await act(() => {
        root.render(<form acceptCharset="boo" />);
      });
      expect(node.getAttribute("accept-charset")).toBe("boo");
      expect(node.hasAttribute("acceptCharset")).toBe(false);
      await act(() => {
        root.render(<form acceptCharset={null as unknown as string} />);
      });
      expect(node.hasAttribute("accept-charset")).toBe(false);
      expect(node.hasAttribute("acceptCharset")).toBe(false);
      await act(() => {
        root.render(<form acceptCharset="foo" />);
      });
      expect(node.getAttribute("accept-charset")).toBe("foo");
      expect(node.hasAttribute("acceptCharset")).toBe(false);
      await act(() => {
        root.render(<form acceptCharset={undefined as unknown as string} />);
      });
      expect(node.hasAttribute("accept-charset")).toBe(false);
      expect(node.hasAttribute("acceptCharset")).toBe(false);
      await act(() => {
        root.render(<form acceptCharset="foo" />);
      });
      expect(node.getAttribute("accept-charset")).toBe("foo");
      expect(node.hasAttribute("acceptCharset")).toBe(false);
      await act(() => {
        root.render(<form />);
      });
      expect(node.hasAttribute("accept-charset")).toBe(false);
      expect(node.hasAttribute("acceptCharset")).toBe(false);
    });

    it("should apply React-specific aliases to SVG elements", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("svg", { arabicForm: "foo" }));
      });
      const node = container.firstChild as SVGElement;
      expect(node.getAttribute("arabic-form")).toBe("foo");
      expect(node.hasAttribute("arabicForm")).toBe(false);
      await act(() => {
        root.render(React.createElement("svg", { arabicForm: "boo" }));
      });
      expect(node.getAttribute("arabic-form")).toBe("boo");
      expect(node.hasAttribute("arabicForm")).toBe(false);
      await act(() => {
        root.render(React.createElement("svg", { arabicForm: null }));
      });
      expect(node.hasAttribute("arabic-form")).toBe(false);
      expect(node.hasAttribute("arabicForm")).toBe(false);
      await act(() => {
        root.render(React.createElement("svg", { arabicForm: "foo" }));
      });
      expect(node.getAttribute("arabic-form")).toBe("foo");
      expect(node.hasAttribute("arabicForm")).toBe(false);
      await act(() => {
        root.render(React.createElement("svg", { arabicForm: undefined }));
      });
      expect(node.hasAttribute("arabic-form")).toBe(false);
      expect(node.hasAttribute("arabicForm")).toBe(false);
      await act(() => {
        root.render(React.createElement("svg", { arabicForm: "foo" }));
      });
      expect(node.getAttribute("arabic-form")).toBe("foo");
      expect(node.hasAttribute("arabicForm")).toBe(false);
      await act(() => {
        root.render(React.createElement("svg"));
      });
      expect(node.hasAttribute("arabic-form")).toBe(false);
      expect(node.hasAttribute("arabicForm")).toBe(false);
    });

    it("should properly update custom attributes on custom elements", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("some-custom-element", { foo: "bar" }));
      });
      expect((container.firstChild as HTMLElement).getAttribute("foo")).toBe("bar");
      await act(() => {
        root.render(React.createElement("some-custom-element", { bar: "buzz" }));
      });
      expect((container.firstChild as HTMLElement).hasAttribute("foo")).toBe(false);
      expect((container.firstChild as HTMLElement).getAttribute("bar")).toBe("buzz");
      const node = container.firstChild as HTMLElement;
      expect(node.hasAttribute("foo")).toBe(false);
      expect(node.getAttribute("bar")).toBe("buzz");
    });

    it("should not apply React-specific aliases to custom elements", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          React.createElement("some-custom-element", {
            arabicForm: "foo",
          }),
        );
      });
      const node = container.firstChild as HTMLElement;
      expect(node.getAttribute("arabicForm")).toBe("foo");
      expect(node.hasAttribute("arabic-form")).toBe(false);
      await act(() => {
        root.render(
          React.createElement("some-custom-element", {
            arabicForm: "boo",
          }),
        );
      });
      expect(node.getAttribute("arabicForm")).toBe("boo");
      await act(() => {
        root.render(
          React.createElement("some-custom-element", {
            acceptCharset: "buzz",
          }),
        );
      });
      expect(node.hasAttribute("arabicForm")).toBe(false);
      expect(node.getAttribute("acceptCharset")).toBe("buzz");
      expect(node.hasAttribute("accept-charset")).toBe(false);
    });

    it("should clear a single style prop when changing `style`", async () => {
      let styles: React.CSSProperties = { display: "none", color: "red" };
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div style={styles} />);
      });

      const stubStyle = (container.firstChild as HTMLElement).style;

      styles = { color: "green" };
      await act(() => {
        root.render(<div style={styles} />);
      });
      expect(stubStyle.display).toEqual("");
      expect(stubStyle.color).toEqual("green");
    });

    it("should reject attribute key injection attack on mount for regular DOM", async () => {
      for (let i = 0; i < 3; i++) {
        const container = document.createElement("div");
        let root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(
            React.createElement("div", { 'blah" onclick="beevil" noise="hi': "selected" }, null),
          );
        });

        expect((container.firstChild as HTMLElement).attributes.length).toBe(0);
        await act(() => {
          root.unmount();
        });
        root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(
            React.createElement(
              "div",
              {
                '></div><script>alert("hi")</script>': "selected",
              },
              null,
            ),
          );
        });

        expect((container.firstChild as HTMLElement).attributes.length).toBe(0);
      }
    });

    it("should reject attribute key injection attack on mount for custom elements", async () => {
      for (let i = 0; i < 3; i++) {
        const container = document.createElement("div");
        let root = ReactDOMClient.createRoot(container);

        await act(() => {
          root.render(
            React.createElement(
              "x-foo-component",
              { 'blah" onclick="beevil" noise="hi': "selected" },
              null,
            ),
          );
        });

        expect((container.firstChild as HTMLElement).attributes.length).toBe(0);
        await act(() => {
          root.unmount();
        });

        root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(
            React.createElement(
              "x-foo-component",
              {
                '></x-foo-component><script>alert("hi")</script>': "selected",
              },
              null,
            ),
          );
        });

        expect((container.firstChild as HTMLElement).attributes.length).toBe(0);
      }
    });

    it("should reject attribute key injection attack on update for regular DOM", async () => {
      for (let i = 0; i < 3; i++) {
        const container = document.createElement("div");
        const beforeUpdate = React.createElement("div", {}, null);
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(beforeUpdate);
        });
        await act(() => {
          root.render(
            React.createElement("div", { 'blah" onclick="beevil" noise="hi': "selected" }, null),
          );
        });

        expect((container.firstChild as HTMLElement).attributes.length).toBe(0);
        await act(() => {
          root.render(
            React.createElement(
              "div",
              {
                '></div><script>alert("hi")</script>': "selected",
              },
              null,
            ),
          );
        });

        expect((container.firstChild as HTMLElement).attributes.length).toBe(0);
      }
    });

    it("should reject attribute key injection attack on update for custom elements", async () => {
      for (let i = 0; i < 3; i++) {
        const container = document.createElement("div");
        const beforeUpdate = React.createElement("x-foo-component", {}, null);
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(beforeUpdate);
        });
        await act(() => {
          root.render(
            React.createElement(
              "x-foo-component",
              { 'blah" onclick="beevil" noise="hi': "selected" },
              null,
            ),
          );
        });

        expect((container.firstChild as HTMLElement).attributes.length).toBe(0);
        await act(() => {
          root.render(
            React.createElement(
              "x-foo-component",
              {
                '></x-foo-component><script>alert("hi")</script>': "selected",
              },
              null,
            ),
          );
        });

        expect((container.firstChild as HTMLElement).attributes.length).toBe(0);
      }
    });

    it("should update arbitrary attributes for tags containing dashes", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      const beforeUpdate = React.createElement("x-foo-component", {}, null);
      await act(() => {
        root.render(beforeUpdate);
      });

      const afterUpdate = React.createElement("x-foo-component", {
        myattr: "myval",
      });
      await act(() => {
        root.render(afterUpdate);
      });

      expect((container.childNodes[0] as HTMLElement).getAttribute("myattr")).toBe("myval");
    });

    it("should clear all the styles when removing `style`", async () => {
      const styles = { display: "none", color: "red" };
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div style={styles} />);
      });

      const stubStyle = (container.firstChild as HTMLElement).style;

      await act(() => {
        root.render(<div />);
      });
      expect(stubStyle.display).toEqual("");
      expect(stubStyle.color).toEqual("");
    });

    it("should update styles when `style` changes from null to object", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      const styles = { color: "red" };
      await act(() => {
        root.render(<div style={styles} />);
      });
      const stubStyle = (container.firstChild as HTMLElement).style;
      expect(stubStyle.color).toBe("red");
      await act(() => {
        root.render(<div />);
      });
      expect(stubStyle.color).toBe("");
      await act(() => {
        root.render(<div style={styles} />);
      });

      expect(stubStyle.color).toBe("red");
    });

    it("should not reset innerHTML for when children is null", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div />);
      });
      (container.firstChild as HTMLElement).innerHTML = "bonjour";
      expect((container.firstChild as HTMLElement).innerHTML).toEqual("bonjour");

      await act(() => {
        root.render(<div />);
      });
      expect((container.firstChild as HTMLElement).innerHTML).toEqual("bonjour");
    });

    it("should reset innerHTML when switching from a direct text child to an empty child", async () => {
      const transitionToValues = [null, undefined, false];
      for (const transitionToValue of transitionToValues) {
        const container = document.createElement("div");
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(<div>bonjour</div>);
        });
        expect((container.firstChild as HTMLElement).innerHTML).toEqual("bonjour");

        await act(() => {
          root.render(<div>{transitionToValue}</div>);
        });
        expect((container.firstChild as HTMLElement).innerHTML).toEqual("");
      }
    });

    it("should empty element when removing innerHTML", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div dangerouslySetInnerHTML={{ __html: ":)" }} />);
      });

      expect((container.firstChild as HTMLElement).innerHTML).toEqual(":)");
      await act(() => {
        root.render(<div />);
      });
      expect((container.firstChild as HTMLElement).innerHTML).toEqual("");
    });

    it("should transition from string content to innerHTML", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div>hello</div>);
      });

      expect((container.firstChild as HTMLElement).innerHTML).toEqual("hello");
      await act(() => {
        root.render(<div dangerouslySetInnerHTML={{ __html: "goodbye" }} />);
      });
      expect((container.firstChild as HTMLElement).innerHTML).toEqual("goodbye");
    });

    it("should transition from innerHTML to string content", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div dangerouslySetInnerHTML={{ __html: "bonjour" }} />);
      });

      expect((container.firstChild as HTMLElement).innerHTML).toEqual("bonjour");
      await act(() => {
        root.render(<div>adieu</div>);
      });
      expect((container.firstChild as HTMLElement).innerHTML).toEqual("adieu");
    });

    it("should transition from innerHTML to children in nested el", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div>
            <div dangerouslySetInnerHTML={{ __html: "bonjour" }} />
          </div>,
        );
      });

      expect(container.textContent).toEqual("bonjour");
      await act(() => {
        root.render(
          <div>
            <div>
              <span>adieu</span>
            </div>
          </div>,
        );
      });
      expect(container.textContent).toEqual("adieu");
    });

    it("should transition from children to innerHTML in nested el", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div>
            <div>
              <span>adieu</span>
            </div>
          </div>,
        );
      });

      expect(container.textContent).toEqual("adieu");
      await act(() => {
        root.render(
          <div>
            <div dangerouslySetInnerHTML={{ __html: "bonjour" }} />
          </div>,
        );
      });
      expect(container.textContent).toEqual("bonjour");
    });

    it("should not incur unnecessary DOM mutations for attributes", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div id="" />);
      });

      const node = container.firstChild as HTMLElement;
      const nodeSetAttribute = node.setAttribute.bind(node);
      node.setAttribute = vi.fn().mockImplementation(nodeSetAttribute);

      const nodeRemoveAttribute = node.removeAttribute.bind(node);
      node.removeAttribute = vi.fn().mockImplementation(nodeRemoveAttribute);

      await act(() => {
        root.render(<div id="" />);
      });
      expect(node.setAttribute).toHaveBeenCalledTimes(0);
      expect(node.removeAttribute).toHaveBeenCalledTimes(0);

      await act(() => {
        root.render(<div id="foo" />);
      });
      expect(node.setAttribute).toHaveBeenCalledTimes(1);
      expect(node.removeAttribute).toHaveBeenCalledTimes(0);

      await act(() => {
        root.render(<div id="foo" />);
      });
      expect(node.setAttribute).toHaveBeenCalledTimes(1);
      expect(node.removeAttribute).toHaveBeenCalledTimes(0);

      await act(() => {
        root.render(<div />);
      });
      expect(node.setAttribute).toHaveBeenCalledTimes(1);
      expect(node.removeAttribute).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(<div id="" />);
      });
      expect(node.setAttribute).toHaveBeenCalledTimes(2);
      expect(node.removeAttribute).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(<div />);
      });
      expect(node.setAttribute).toHaveBeenCalledTimes(2);
      expect(node.removeAttribute).toHaveBeenCalledTimes(2);
    });

    it("should not incur unnecessary DOM mutations for string properties", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("div", { value: "" }));
      });

      const node = container.firstChild as HTMLElement;

      const nodeValueSetter = vi.fn();

      const oldSetAttribute = node.setAttribute.bind(node);
      node.setAttribute = function (key: string, value: string) {
        oldSetAttribute(key, value);
        nodeValueSetter(key, value);
      };

      await act(() => {
        root.render(React.createElement("div", { value: "foo" }));
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(React.createElement("div", { value: "foo" }));
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(<div />);
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(React.createElement("div", { value: null }));
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(React.createElement("div", { value: "" }));
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(2);

      await act(() => {
        root.render(<div />);
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(2);
    });

    it("should not incur unnecessary DOM mutations for controlled string properties", async () => {
      const onChange = () => {};
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<input value="" onChange={onChange} />);
      });

      const node = container.firstChild as HTMLInputElement;

      let nodeValue = "";
      const nodeValueSetter = vi.fn();
      Object.defineProperty(node, "value", {
        get: function () {
          return nodeValue;
        },
        set: nodeValueSetter.mockImplementation(function (newValue: string) {
          nodeValue = newValue;
        }),
      });

      await act(() => {
        root.render(<input value="foo" onChange={onChange} />);
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(<input value="foo" data-unrelated={true} onChange={onChange} />);
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(<input onChange={onChange} />);
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(<input value={null as unknown as string} onChange={onChange} />);
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(<input value="" onChange={onChange} />);
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(2);

      await act(() => {
        root.render(<input onChange={onChange} />);
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(2);
    });

    it("should not incur unnecessary DOM mutations for boolean properties", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<audio muted={true} />);
      });

      const node = container.firstChild as HTMLAudioElement;
      let nodeValue = true;
      const nodeValueSetter = vi.fn();
      Object.defineProperty(node, "muted", {
        get: function () {
          return nodeValue;
        },
        set: nodeValueSetter.mockImplementation(function (newValue: boolean) {
          nodeValue = newValue;
        }),
      });

      await act(() => {
        root.render(<audio muted={true} data-unrelated="yes" />);
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(0);

      await act(() => {
        root.render(<audio muted={false} data-unrelated="ok" />);
      });
      expect(nodeValueSetter).toHaveBeenCalledTimes(1);
    });

    it("should ignore attribute list for elements with the 'is' attribute", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          React.createElement("button", {
            is: "test",
            cowabunga: "chevynova",
          }),
        );
      });
      expect((container.firstChild as HTMLElement).hasAttribute("cowabunga")).toBe(true);
    });

    it("should not update when switching between null/undefined", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div />);
      });

      const setter = vi.fn();
      (container.firstChild as HTMLElement).setAttribute = setter;

      await act(() => {
        root.render(<div dir={undefined as unknown as string} />);
      });
      await act(() => {
        root.render(<div dir={undefined as unknown as string} />);
      });
      await act(() => {
        root.render(<div />);
      });
      expect(setter).toHaveBeenCalledTimes(0);
      await act(() => {
        root.render(<div dir="ltr" />);
      });
      expect(setter).toHaveBeenCalledTimes(1);
    });

    it("handles multiple child updates without interference", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <div>
            <div key="one">
              <div key="A">A</div>
              <div key="B">B</div>
            </div>
            <div key="two">
              <div key="C">C</div>
              <div key="D">D</div>
            </div>
          </div>,
        );
      });
      await act(() => {
        root.render(
          <div>
            <div key="one">
              <div key="B">B</div>
              <div key="A">A</div>
            </div>
            <div key="two">
              <div key="D">D</div>
              <div key="C">C</div>
            </div>
          </div>,
        );
      });

      expect(container.textContent).toBe("BADC");
    });
  });

  describe("mountComponent", () => {
    let mountComponent: (props: Record<string, unknown>) => Promise<void>;

    beforeEach(() => {
      mountComponent = async (props) => {
        const container = document.createElement("div");
        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(<div {...props} />);
        });
      };
    });

    it("should throw on children for void elements", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await expect(async () => {
        await act(() => {
          root.render(React.createElement("input", null, "children"));
        });
      }).rejects.toThrowError(
        "input is a void element tag and must neither have `children` nor " +
          "use `dangerouslySetInnerHTML`.",
      );
    });

    it("should throw on dangerouslySetInnerHTML for void elements", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await expect(async () => {
        await act(() => {
          root.render(
            <input dangerouslySetInnerHTML={{ __html: "content" } as unknown as undefined} />,
          );
        });
      }).rejects.toThrowError(
        "input is a void element tag and must neither have `children` nor " +
          "use `dangerouslySetInnerHTML`.",
      );
    });

    it("should validate against multiple children props", async () => {
      await expect(async () => {
        await mountComponent({
          children: "",
          dangerouslySetInnerHTML: "",
        });
      }).rejects.toThrowError(
        "`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. " +
          "Please visit https://react.dev/link/dangerously-set-inner-html for more information.",
      );
    });

    it("should validate use of dangerouslySetInnerHTML with JSX", async () => {
      await expect(async () => {
        await mountComponent({
          dangerouslySetInnerHTML: "<span>Hi Jim!</span>",
        });
      }).rejects.toThrowError(
        "`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. " +
          "Please visit https://react.dev/link/dangerously-set-inner-html for more information.",
      );
    });

    it("should validate use of dangerouslySetInnerHTML with object", async () => {
      await expect(async () => {
        await mountComponent({
          dangerouslySetInnerHTML: { foo: "bar" },
        });
      }).rejects.toThrowError(
        "`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. " +
          "Please visit https://react.dev/link/dangerously-set-inner-html for more information.",
      );
    });

    it("should allow {__html: null}", async () => {
      await expect(async () => {
        await mountComponent({
          dangerouslySetInnerHTML: { __html: null },
        });
      }).not.toThrow();
    });

    it("should respect suppressContentEditableWarning", async () => {
      await mountComponent({
        contentEditable: true,
        children: "",
        suppressContentEditableWarning: true,
      });
    });

    it("should validate against invalid styles", async () => {
      await expect(async () => {
        await mountComponent({ style: "display: none" });
      }).rejects.toThrowError(
        "The `style` prop expects a mapping from style properties to values, " +
          "not a string. For example, style={{marginRight: spacing + 'em'}} " +
          "when using JSX.",
      );
    });

    it("should throw for children on void elements", async () => {
      class X extends React.Component {
        render() {
          return React.createElement("input", null, "moo");
        }
      }

      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await expect(async () => {
        await act(() => {
          root.render(<X />);
        });
      }).rejects.toThrowError(
        "input is a void element tag and must neither have `children` " +
          "nor use `dangerouslySetInnerHTML`.",
      );
    });

    it("should support custom elements which extend native elements", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      const spy = vi.spyOn(document, "createElement");
      await act(() => {
        root.render(<div is="custom-div" />);
      });
      expect(spy).toHaveBeenCalledWith("div", { is: "custom-div" });
      spy.mockRestore();
    });

    it("should receive a load event on <link> elements", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      const onLoad = vi.fn();

      await act(() => {
        root.render(<link href="http://example.org/link" onLoad={onLoad} />);
      });

      const loadEvent = document.createEvent("Event");
      const link = container.getElementsByTagName("link")[0];

      loadEvent.initEvent("load", false, false);
      link.dispatchEvent(loadEvent);

      expect(onLoad).toHaveBeenCalledTimes(1);
    });

    it("should receive an error event on <link> elements", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      const onError = vi.fn();

      await act(() => {
        root.render(<link href="http://example.org/link" onError={onError} />);
      });

      const errorEvent = document.createEvent("Event");
      const link = container.getElementsByTagName("link")[0];

      errorEvent.initEvent("error", false, false);
      link.dispatchEvent(errorEvent);

      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateComponent", () => {
    let container: HTMLDivElement;
    let root: ReturnType<typeof ReactDOMClient.createRoot>;

    beforeEach(() => {
      container = document.createElement("div");
      root = ReactDOMClient.createRoot(container);
    });

    it("should warn against children for void elements", async () => {
      await act(() => {
        root.render(<input />);
      });

      await expect(async () => {
        await act(() => {
          root.render(React.createElement("input", null, "children"));
        });
      }).rejects.toThrowError(
        "input is a void element tag and must neither have `children` nor use " +
          "`dangerouslySetInnerHTML`.",
      );
    });

    it("should warn against dangerouslySetInnerHTML for void elements", async () => {
      await act(() => {
        root.render(<input />);
      });

      await expect(async () => {
        await act(() => {
          root.render(
            <input dangerouslySetInnerHTML={{ __html: "content" } as unknown as undefined} />,
          );
        });
      }).rejects.toThrowError(
        "input is a void element tag and must neither have `children` nor use " +
          "`dangerouslySetInnerHTML`.",
      );
    });

    it("should validate against multiple children props", async () => {
      await act(() => {
        root.render(<div />);
      });

      await expect(async () => {
        await act(() => {
          root.render(<div children="" dangerouslySetInnerHTML={{ __html: "" }} />);
        });
      }).rejects.toThrowError("Can only set one of `children` or `props.dangerouslySetInnerHTML`.");
    });

    it("should validate against invalid styles", async () => {
      await act(() => {
        root.render(<div />);
      });

      await expect(async () => {
        await act(() => {
          root.render(<div style={1 as unknown as React.CSSProperties} />);
        });
      }).rejects.toThrowError(
        "The `style` prop expects a mapping from style properties to values, " +
          "not a string. For example, style={{marginRight: spacing + 'em'}} " +
          "when using JSX.",
      );
    });

    it("should report component containing invalid styles", async () => {
      class Animal extends React.Component {
        render() {
          return <div style={1 as unknown as React.CSSProperties} />;
        }
      }

      await expect(async () => {
        await act(() => {
          root.render(<Animal />);
        });
      }).rejects.toThrowError(
        "The `style` prop expects a mapping from style properties to values, " +
          "not a string. For example, style={{marginRight: spacing + 'em'}} " +
          "when using JSX.",
      );
    });
  });

  describe("tag sanitization", () => {
    it("should throw when an invalid tag name is used", async () => {
      const hackzor = React.createElement("script tag");
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await expect(async () => {
        await act(() => {
          root.render(hackzor);
        });
      }).rejects.toThrow();
    });

    it("should throw when an attack vector is used", async () => {
      const hackzor = React.createElement("div><img /><div");
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await expect(async () => {
        await act(() => {
          root.render(hackzor);
        });
      }).rejects.toThrow();
    });
  });

  describe("nesting validation", () => {
    it("warns on invalid nesting", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div>
            <tr />
            <tr />
          </div>,
        );
      });
    });

    it("warns on invalid nesting at root", async () => {
      const paragraph = document.createElement("p");
      const root = ReactDOMClient.createRoot(paragraph);

      await act(() => {
        root.render(
          <span>
            <p />
          </span>,
        );
      });
    });

    it("warns nicely for table rows", async () => {
      class Row extends React.Component {
        render() {
          return <tr>x</tr>;
        }
      }

      class Foo extends React.Component {
        render() {
          return (
            <table>
              <Row />{" "}
            </table>
          );
        }
      }

      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<Foo />);
      });
    });

    it("should warn about incorrect casing on properties", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          React.createElement("input", {
            type: "text",
            tabindex: "1",
          }),
        );
      });
    });

    it("should warn about incorrect casing on event handlers", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          React.createElement("input", {
            type: "text",
            oninput: "1",
          }),
        );
      });

      await act(() => {
        root.render(
          React.createElement("input", {
            type: "text",
            onKeydown: "1",
          }),
        );
      });
    });

    it("should warn about class", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("div", { class: "muffins" }));
      });
    });

    it("should warn about props that are no longer supported", async () => {
      let container = document.createElement("div");
      let root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div />);
      });

      container = document.createElement("div");
      root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(React.createElement("div", { onFocusIn: () => {} }));
      });

      container = document.createElement("div");
      root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("div", { onFocusOut: () => {} }));
      });
    });

    it("should warn about props that are no longer supported without case sensitivity", async () => {
      let container = document.createElement("div");
      let root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div />);
      });

      container = document.createElement("div");
      root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("div", { onfocusin: () => {} }));
      });

      container = document.createElement("div");
      root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("div", { onfocusout: () => {} }));
      });
    });

    it("gives source code refs for unknown prop warning", async () => {
      let container = document.createElement("div");
      let root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("div", { class: "paladin" }));
      });

      container = document.createElement("div");
      root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          React.createElement("input", {
            type: "text",
            onclick: "1",
          }),
        );
      });
    });

    it("gives source code refs for unknown prop warning for update render", async () => {
      let container = document.createElement("div");
      let root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div className="paladin" />);
      });

      container = document.createElement("div");
      root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("div", { class: "paladin" }));
      });
    });

    it("gives source code refs for unknown prop warning for exact elements", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div className="foo1">
            {React.createElement("span", { class: "foo2" })}
            <div onClick={() => {}} />
            {React.createElement("strong", { onclick: () => {} })}
            <div className="foo5" />
            <div className="foo6" />
          </div>,
        );
      });
    });

    it("gives source code refs for unknown prop warning for exact elements in composition", async () => {
      class Parent extends React.Component {
        render() {
          return (
            <div>
              <Child1 />
              <Child2 />
              <Child3 />
              <Child4 />
            </div>
          );
        }
      }

      class Child1 extends React.Component {
        render() {
          return React.createElement("span", { class: "paladin" }, "Child1");
        }
      }

      class Child2 extends React.Component {
        render() {
          return <div>Child2</div>;
        }
      }

      class Child3 extends React.Component {
        render() {
          return React.createElement("strong", { onclick: "1" }, "Child3");
        }
      }

      class Child4 extends React.Component {
        render() {
          return <div>Child4</div>;
        }
      }

      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Parent />);
      });
    });

    it("should suggest property name if available", async () => {
      let container = document.createElement("div");
      let root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("label", { for: "test" }));
      });

      container = document.createElement("div");
      root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          React.createElement("input", {
            type: "text",
            autofocus: true,
          }),
        );
      });
    });
  });

  describe("whitespace", () => {
    it("renders innerHTML and preserves whitespace", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      const html = "\n  \t  <span>  \n  testContent  \t  </span>  \n  \t";
      const elem = <div dangerouslySetInnerHTML={{ __html: html }} />;

      await act(() => {
        root.render(elem);
      });
      expect((container.firstChild as HTMLElement).innerHTML).toBe(html);
    });

    it("render and then updates innerHTML and preserves whitespace", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      const html = "\n  \t  <span>  \n  testContent1  \t  </span>  \n  \t";
      const elem = <div dangerouslySetInnerHTML={{ __html: html }} />;
      await act(() => {
        root.render(elem);
      });

      const html2 = "\n  \t  <div>  \n  testContent2  \t  </div>  \n  \t";
      const elem2 = <div dangerouslySetInnerHTML={{ __html: html2 }} />;
      await act(() => {
        root.render(elem2);
      });

      expect((container.firstChild as HTMLElement).innerHTML).toBe(html2);
    });
  });

  describe("Attributes with aliases", () => {
    it("sets aliased attributes on HTML attributes", async () => {
      let element: HTMLElement | null = null;
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          React.createElement("div", {
            class: "test",
            ref: (current: HTMLElement | null) => {
              element = current;
            },
          }),
        );
      });

      expect(element!.className).toBe("test");
    });

    it("sets incorrectly cased aliased attributes on HTML attributes with a warning", async () => {
      let element: HTMLElement | null = null;
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          React.createElement("div", {
            cLASS: "test",
            ref: (current: HTMLElement | null) => {
              element = current;
            },
          }),
        );
      });

      expect(element!.className).toBe("test");
    });

    it("sets aliased attributes on SVG elements with a warning", async () => {
      let svgElement: SVGElement | null = null;
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          React.createElement(
            "svg",
            {
              ref: (current: SVGElement | null) => {
                svgElement = current;
              },
            },
            React.createElement("text", { "arabic-form": "initial" }),
          ),
        );
      });
      const text = svgElement!.querySelector("text")!;

      expect(text.hasAttribute("arabic-form")).toBe(true);
    });

    it("sets aliased attributes on custom elements", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          React.createElement("div", {
            is: "custom-element",
            class: "test",
          }),
        );
      });

      const element = container.firstChild as HTMLElement;
      expect(element.getAttribute("class")).toBe("test");
    });

    it("aliased attributes on custom elements with bad casing", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          React.createElement("div", {
            is: "custom-element",
            claSS: "test",
          }),
        );
      });

      const element = container.firstChild as HTMLElement;

      expect(element.getAttribute("class")).toBe("test");
    });

    it("updates aliased attributes on custom elements", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          React.createElement("div", {
            is: "custom-element",
            class: "foo",
          }),
        );
      });
      await act(() => {
        root.render(
          React.createElement("div", {
            is: "custom-element",
            class: "bar",
          }),
        );
      });

      expect((container.firstChild as HTMLElement).getAttribute("class")).toBe("bar");
    });
  });

  describe("Custom attributes", () => {
    it("allows assignment of custom attributes with string values", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(React.createElement("div", { whatever: "30" }));
      });

      const element = container.firstChild as HTMLElement;

      expect(element.getAttribute("whatever")).toBe("30");
    });

    it("removes custom attributes", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("div", { whatever: "30" }));
      });

      expect((container.firstChild as HTMLElement).getAttribute("whatever")).toBe("30");

      await act(() => {
        root.render(React.createElement("div", { whatever: null }));
      });

      expect((container.firstChild as HTMLElement).hasAttribute("whatever")).toBe(false);
    });

    it("does not assign a boolean custom attributes as a string", async () => {
      let element: HTMLElement | null = null;
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          React.createElement("div", {
            whatever: true,
            ref: (current: HTMLElement | null) => {
              element = current;
            },
          }),
        );
      });

      expect(element!.hasAttribute("whatever")).toBe(false);
    });

    it("does not assign an implicit boolean custom attributes", async () => {
      let element: HTMLElement | null = null;
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          React.createElement("div", {
            whatever: true,
            ref: (current: HTMLElement | null) => {
              element = current;
            },
          }),
        );
      });

      expect(element!.hasAttribute("whatever")).toBe(false);
    });

    it("assigns a numeric custom attributes as a string", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(React.createElement("div", { whatever: 3 }));
      });

      const element = container.firstChild as HTMLElement;

      expect(element.getAttribute("whatever")).toBe("3");
    });

    it("will not assign a function custom attributes", async () => {
      let element: HTMLElement | null = null;
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          React.createElement("div", {
            whatever: () => {},
            ref: (current: HTMLElement | null) => {
              element = current;
            },
          }),
        );
      });

      expect(element!.hasAttribute("whatever")).toBe(false);
    });

    it("will assign an object custom attributes", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(React.createElement("div", { whatever: {} }));
      });

      const element = container.firstChild as HTMLElement;
      expect(element.getAttribute("whatever")).toBe("[object Object]");
    });

    it("allows Temporal-like objects as HTML (they are not coerced to strings first)", async () => {
      class TemporalLike {
        valueOf() {
          throw new TypeError("prod message");
        }
        toString() {
          return "2020-01-01";
        }
      }

      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div
            dangerouslySetInnerHTML={{
              __html: new TemporalLike() as unknown as string,
            }}
          />,
        );
      });
      expect((container.firstChild as HTMLElement).innerHTML).toEqual("2020-01-01");
    });

    it("allows cased data attributes", async () => {
      let element: HTMLElement | null = null;
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          React.createElement("div", {
            "data-fooBar": "true",
            ref: (current: HTMLElement | null) => {
              element = current;
            },
          }),
        );
      });
      expect(element!.getAttribute("data-foobar")).toBe("true");
    });

    it("allows cased custom attributes", async () => {
      let element: HTMLElement | null = null;
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          React.createElement("div", {
            fooBar: "true",
            ref: (current: HTMLElement | null) => {
              element = current;
            },
          }),
        );
      });
      expect(element!.getAttribute("foobar")).toBe("true");
    });

    it("warns on NaN attributes", async () => {
      let element: HTMLElement | null = null;
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          React.createElement("div", {
            whatever: NaN,
            ref: (current: HTMLElement | null) => {
              element = current;
            },
          }),
        );
      });

      expect(element!.getAttribute("whatever")).toBe("NaN");
    });

    it("removes a property when it becomes invalid", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("div", { whatever: 0 }));
      });
      await act(() => {
        root.render(React.createElement("div", { whatever: () => {} }));
      });
      const element = container.firstChild as HTMLElement;
      expect(element.hasAttribute("whatever")).toBe(false);
    });

    it("warns on bad casing of known HTML attributes", async () => {
      let element: HTMLElement | null = null;
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          React.createElement("div", {
            SiZe: "30",
            ref: (current: HTMLElement | null) => {
              element = current;
            },
          }),
        );
      });

      expect(element!.getAttribute("size")).toBe("30");
    });
  });

  describe("Object stringification", () => {
    it("allows objects on known properties", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<form acceptCharset={{} as unknown as string} />);
      });

      const element = container.firstChild as HTMLElement;
      expect(element.getAttribute("accept-charset")).toBe("[object Object]");
    });

    it("should pass objects as attributes if they define toString", async () => {
      const obj = {
        toString() {
          return "hello";
        },
      };
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<img src={obj as unknown as string} />);
      });
      expect((container.firstChild as HTMLImageElement).src).toContain("/hello");

      await act(() => {
        root.render(React.createElement("svg", { arabicForm: obj }));
      });
      expect((container.firstChild as SVGElement).getAttribute("arabic-form")).toBe("hello");

      await act(() => {
        root.render(React.createElement("div", { unknown: obj }));
      });
      expect((container.firstChild as HTMLElement).getAttribute("unknown")).toBe("hello");
    });

    it("passes objects on known SVG attributes if they do not define toString", async () => {
      const obj = {};
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(React.createElement("svg", { arabicForm: obj }));
      });
      expect((container.firstChild as SVGElement).getAttribute("arabic-form")).toBe(
        "[object Object]",
      );
    });

    it("passes objects on custom attributes if they do not define toString", async () => {
      const obj = {};
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(React.createElement("div", { unknown: obj }));
      });
      expect((container.firstChild as HTMLElement).getAttribute("unknown")).toBe("[object Object]");
    });

    it("allows objects that inherit a custom toString method", async () => {
      const parent = { toString: () => "hello.jpg" };
      const child = Object.create(parent);
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<img src={child} />);
      });

      const element = container.firstChild as HTMLImageElement;

      expect(element.src).toContain("/hello.jpg");
    });

    it("assigns ajaxify (an important internal FB attribute)", async () => {
      const options = { toString: () => "ajaxy" };
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(React.createElement("div", { ajaxify: options }));
      });

      const element = container.firstChild as HTMLElement;

      expect(element.getAttribute("ajaxify")).toBe("ajaxy");
    });
  });

  describe("String boolean attributes", () => {
    it("does not assign string boolean attributes for custom attributes", async () => {
      let element: HTMLElement | null = null;
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          React.createElement("div", {
            whatever: true,
            ref: (current: HTMLElement | null) => {
              element = current;
            },
          }),
        );
      });

      expect(element!.hasAttribute("whatever")).toBe(false);
    });

    it("stringifies the boolean true for allowed attributes", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div spellCheck={true} />);
      });

      const element = container.firstChild as HTMLElement;

      expect(element.getAttribute("spellcheck")).toBe("true");
    });

    it("stringifies the boolean false for allowed attributes", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div spellCheck={false} />);
      });

      const element = container.firstChild as HTMLElement;

      expect(element.getAttribute("spellcheck")).toBe("false");
    });

    it("stringifies implicit booleans for allowed attributes", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div spellCheck />);
      });

      const element = container.firstChild as HTMLElement;

      expect(element.getAttribute("spellcheck")).toBe("true");
    });
  });

  describe("Boolean attributes", () => {
    it("warns on the ambiguous string value 'false'", async () => {
      let element: HTMLElement | null = null;
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <div
            hidden={"false" as unknown as boolean}
            ref={(current) => {
              element = current;
            }}
          />,
        );
      });

      expect(element!.getAttribute("hidden")).toBe("");
    });

    it("warns on the potentially-ambiguous string value 'true'", async () => {
      let element: HTMLElement | null = null;
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <div
            hidden={"true" as unknown as boolean}
            ref={(current) => {
              element = current;
            }}
          />,
        );
      });

      expect(element!.getAttribute("hidden")).toBe("");
    });
  });

  describe("Hyphenated SVG elements", () => {
    it("the font-face element is not a custom element", async () => {
      let svgElement: SVGElement | null = null;
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          React.createElement(
            "svg",
            {
              ref: (current: SVGElement | null) => {
                svgElement = current;
              },
            },
            React.createElement("font-face", { "x-height": false }),
          ),
        );
      });

      expect(svgElement!.querySelector("font-face")!.hasAttribute("x-height")).toBe(false);
    });

    it("the font-face element does not allow unknown boolean values", async () => {
      let svgElement: SVGElement | null = null;
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          React.createElement(
            "svg",
            {
              ref: (current: SVGElement | null) => {
                svgElement = current;
              },
            },
            React.createElement("font-face", { whatever: false }),
          ),
        );
      });

      expect(svgElement!.querySelector("font-face")!.hasAttribute("whatever")).toBe(false);
    });
  });

  describe("Custom elements", () => {
    it("does not strip unknown boolean attributes", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("some-custom-element", { foo: true }));
      });
      const node = container.firstChild as HTMLElement;
      expect(node.getAttribute("foo")).toBe("");
      await act(() => {
        root.render(React.createElement("some-custom-element", { foo: false }));
      });
      expect(node.getAttribute("foo")).toBe(null);
      await act(() => {
        root.render(React.createElement("some-custom-element"));
      });
      expect(node.hasAttribute("foo")).toBe(false);
      await act(() => {
        root.render(React.createElement("some-custom-element", { foo: true }));
      });
      expect(node.hasAttribute("foo")).toBe(true);
    });

    it("does not strip the on* attributes", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("some-custom-element", { onx: "bar" }));
      });
      const node = container.firstChild as HTMLElement;
      expect(node.getAttribute("onx")).toBe("bar");
      await act(() => {
        root.render(React.createElement("some-custom-element", { onx: "buzz" }));
      });
      expect(node.getAttribute("onx")).toBe("buzz");
      await act(() => {
        root.render(React.createElement("some-custom-element"));
      });
      expect(node.hasAttribute("onx")).toBe(false);
      await act(() => {
        root.render(React.createElement("some-custom-element", { onx: "bar" }));
      });
      expect(node.getAttribute("onx")).toBe("bar");
    });
  });

  it("receives events in specific order", async () => {
    const eventOrder: string[] = [];
    const track = (tag: string) => () => eventOrder.push(tag);
    const outerRef = React.createRef<HTMLDivElement>();
    const innerRef = React.createRef<HTMLDivElement>();

    function OuterReactApp() {
      return (
        <div
          ref={outerRef}
          onClick={track("outer bubble")}
          onClickCapture={track("outer capture")}
        />
      );
    }

    function InnerReactApp() {
      return (
        <div
          ref={innerRef}
          onClick={track("inner bubble")}
          onClickCapture={track("inner capture")}
        />
      );
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    document.body.appendChild(container);

    try {
      await act(() => {
        root.render(<OuterReactApp />);
      });
      const innerRoot = ReactDOMClient.createRoot(outerRef.current!);
      await act(() => {
        innerRoot.render(<InnerReactApp />);
      });

      document.addEventListener("click", track("document bubble"));
      document.addEventListener("click", track("document capture"), true);

      innerRef.current!.click();

      expect(eventOrder).toEqual([
        "document capture",
        "outer capture",
        "inner capture",
        "inner bubble",
        "outer bubble",
        "document bubble",
      ]);
    } finally {
      document.body.removeChild(container);
    }
  });

  describe("iOS Tap Highlight", () => {
    it("adds onclick handler to elements with onClick prop", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      const elementRef = React.createRef<HTMLDivElement>();
      function Component() {
        return <div ref={elementRef} onClick={() => {}} />;
      }

      await act(() => {
        root.render(<Component />);
      });
      expect(typeof (elementRef.current as any).onclick).toBe("function");
    });

    it("adds onclick handler to a portal root", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      const portalContainer = document.createElement("div");

      function Component() {
        return ReactDOM.createPortal(<div onClick={() => {}} />, portalContainer);
      }

      await act(() => {
        root.render(<Component />);
      });
      expect(typeof (portalContainer as any).onclick).toBe("function");
    });
  });
});
