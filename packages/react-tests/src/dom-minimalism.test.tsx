import React from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect } from "vitest";
import { act } from "./utils";

describe("ReactCompositeComponentDOMMinimalism", () => {
  class LowerLevelComposite extends React.Component<{
    children?: React.ReactNode;
  }> {
    render() {
      return <div>{this.props.children}</div>;
    }
  }

  class MyCompositeComponent extends React.Component<{
    children?: React.ReactNode;
  }> {
    render() {
      return <LowerLevelComposite>{this.props.children}</LowerLevelComposite>;
    }
  }

  it("should not render extra nodes for non-interpolated text", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(() => {
      root.render(<MyCompositeComponent>A string child</MyCompositeComponent>);
    });

    const instance = container.firstChild as HTMLElement;
    expect(instance.tagName).toBe("DIV");
    expect(instance.children.length).toBe(0);
  });

  it("should not render extra nodes for interpolated text", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(() => {
      root.render(<MyCompositeComponent>{"Interpolated String Child"}</MyCompositeComponent>);
    });

    const instance = container.firstChild as HTMLElement;
    expect(instance.tagName).toBe("DIV");
    expect(instance.children.length).toBe(0);
  });

  it("should not render extra nodes for interpolated text children", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(() => {
      root.render(
        <MyCompositeComponent>
          <ul>This text causes no children in ul, just innerHTML</ul>
        </MyCompositeComponent>,
      );
    });

    const instance = container.firstChild as HTMLElement;
    expect(instance.tagName).toBe("DIV");
    expect(instance.children.length).toBe(1);
    expect(instance.children[0].tagName).toBe("UL");
    expect(instance.children[0].children.length).toBe(0);
  });
});
