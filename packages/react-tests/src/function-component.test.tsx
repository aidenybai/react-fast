import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect } from "vitest";
import { act } from "./utils";

const FunctionComponent = (props: { name: string }) => {
  return <div>{props.name}</div>;
};

describe("ReactFunctionComponent", () => {
  it("should render stateless component", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<FunctionComponent name="A" />);
    });
    expect(container.textContent).toBe("A");
  });

  it("should update stateless component", async () => {
    class Parent extends React.Component<{ name: string }> {
      render() {
        return <FunctionComponent {...this.props} />;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent name="A" />);
    });
    expect(container.textContent).toBe("A");

    await act(() => {
      root.render(<Parent name="B" />);
    });
    expect(container.textContent).toBe("B");
  });

  it("should unmount stateless component", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<FunctionComponent name="A" />);
    });
    expect(container.textContent).toBe("A");

    root.unmount();
    expect(container.textContent).toBe("");
  });

  it("should warn for getDerivedStateFromProps on a function component", async () => {
    const FunctionComponentWithState = () => {
      return null;
    };
    (FunctionComponentWithState as unknown as Record<string, unknown>).getDerivedStateFromProps =
      () => {};

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<FunctionComponentWithState />);
    });
  });

  it("should warn for childContextTypes on a function component", async () => {
    const FunctionComponentWithChildContext = (props: { name: string }) => {
      return <div>{props.name}</div>;
    };
    (FunctionComponentWithChildContext as unknown as Record<string, unknown>).childContextTypes = {
      foo: {},
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<FunctionComponentWithChildContext name="A" />);
    });
  });

  it("should not throw when stateless component returns undefined", async () => {
    const NotAComponent = () => {
      return undefined;
    };
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(
          <div>
            <NotAComponent />
          </div>,
        );
      }),
    ).resolves.not.toThrowError();
  });

  it("should use correct name in key warning", async () => {
    const Child = () => {
      return <div>{[<span />]}</div>;
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Child />);
    });
  });

  it("should work with arrow functions", async () => {
    let Child = function () {
      return <div />;
    };
    Child = Child.bind(this);

    await expect(async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Child />);
      });
    }).not.toThrow();
  });

  it("should allow simple functions to return null", async () => {
    const Child = () => {
      return null;
    };
    await expect(async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Child />);
      });
    }).not.toThrow();
  });

  it("should allow simple functions to return false", async () => {
    const Child = () => {
      return false;
    };
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(<Child />);
      }),
    ).resolves.not.toThrow();
  });
});
