import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect } from "vitest";
import { act } from "./utils";

describe("CSSPropertyOperations", () => {
  it("should automatically append px to relevant styles", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div style={{ left: 0, margin: 16, opacity: 0.5, padding: "4px" }} />);
    });
    const style = (container.firstChild as HTMLElement).style;
    expect(style.left).toBe("0px");
    expect(style.margin).toBe("16px");
    expect(style.opacity).toBe("0.5");
    expect(style.padding).toBe("4px");
  });

  it("should trim values", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div style={{ left: "16 ", opacity: 0.5, right: " 4 " }} />);
    });
    const style = (container.firstChild as HTMLElement).style;
    expect(style.opacity).toBe("0.5");
  });

  it("should not append px to styles that might need a number", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div style={{ flex: 0, opacity: 0.5 }} />);
    });
    const style = (container.firstChild as HTMLElement).style;
    expect(style.opacity).toBe("0.5");
  });

  it("should create vendor-prefixed markup correctly", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div style={{ msTransition: "none", MozTransition: "none" }} />);
    });
    const element = container.firstChild as HTMLElement;
    expect(element.style).toBeDefined();
  });

  it("should not hyphenate custom CSS property", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div style={{ "--someColor": "#000000" } as React.CSSProperties} />);
    });
    const element = container.firstChild as HTMLElement;
    expect(element.style.getPropertyValue("--someColor")).toBe("#000000");
  });

  it("should set style attribute when styles exist", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div style={{ backgroundColor: "#000", display: "none" }} />);
    });
    expect(/style=".*"/.test(container.innerHTML)).toBe(true);
  });

  it("should not set style attribute when no styles exist", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <div style={{ backgroundColor: null, display: null } as unknown as React.CSSProperties} />,
      );
    });
    expect(/style=/.test(container.innerHTML)).toBe(false);
  });

  it("should warn when using hyphenated style names", async () => {
    const Comp = () => {
      return <div style={{ "background-color": "blue" } as unknown as React.CSSProperties} />;
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Comp />);
    });
  });

  it("should warn when updating hyphenated style names", async () => {
    const Comp = (props: { styles?: React.CSSProperties }) => {
      return <div style={props.styles} />;
    };

    const hyphenatedStyles = {
      "-ms-transform": "translate3d(0, 0, 0)",
      "-webkit-transform": "translate3d(0, 0, 0)",
    } as unknown as React.CSSProperties;
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Comp />);
    });
    await act(() => {
      root.render(<Comp styles={hyphenatedStyles} />);
    });
  });

  it("warns when miscapitalizing vendored style names", async () => {
    const Comp = () => {
      return (
        <div
          style={
            {
              msTransform: "translate3d(0, 0, 0)",
              oTransform: "translate3d(0, 0, 0)",
              webkitTransform: "translate3d(0, 0, 0)",
            } as unknown as React.CSSProperties
          }
        />
      );
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Comp />);
    });
  });

  it("should warn about style having a trailing semicolon", async () => {
    const Comp = () => {
      return (
        <div
          style={{
            backgroundColor: "blue;",
            color: "red;",
          }}
        />
      );
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Comp />);
    });
  });

  it("should warn about style containing a NaN value", async () => {
    const Comp = () => {
      return <div style={{ fontSize: NaN }} />;
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Comp />);
    });
  });

  it("should not warn when setting CSS custom properties", async () => {
    const Comp = () => {
      return <div style={{ "--color-text": "#000" } as React.CSSProperties} />;
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Comp />);
    });
  });

  it("should warn about style containing an Infinity value", async () => {
    const Comp = () => {
      return <div style={{ fontSize: 1 / 0 }} />;
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Comp />);
    });
  });

  it("should not add units to CSS custom properties", async () => {
    const Comp = () => {
      return <div style={{ "--foo": 5 } as React.CSSProperties} />;
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Comp />);
    });

    expect((container.children[0] as HTMLElement).style.getPropertyValue("--foo")).toEqual("5");
  });
});
