import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "./utils";

const getRelevantErrors = (spy: ReturnType<typeof vi.fn>) =>
  spy.mock.calls.filter(
    (call) => !String(call[0]).includes("testing environment") && !String(call[0]).includes("act("),
  );

describe("ReactChildReconciler", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  const createIterable = (array: React.ReactNode[]): Iterable<React.ReactNode> => ({
    [Symbol.iterator]() {
      let index = 0;
      return {
        next(): IteratorResult<React.ReactNode> {
          const isDone = index === array.length;
          const value = isDone ? undefined : array[index];
          index++;
          return { value, done: isDone } as IteratorResult<React.ReactNode>;
        },
      };
    },
  });

  it("does not treat functions as iterables", async () => {
    const functionChild: React.ReactNode = (() => {}) as unknown as React.ReactNode;
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <div>
          <h1>{functionChild}</h1>
        </div>,
      );
    });
    const node = container.firstChild as HTMLElement;
    expect(node.innerHTML).toContain("");
  });

  it("warns for duplicated array keys", async () => {
    class Component extends React.Component {
      render() {
        return <div>{[<div key="1" />, <div key="1" />]}</div>;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });

    const relevantErrors = getRelevantErrors(consoleErrorSpy);
    expect(relevantErrors.length).toBeGreaterThan(0);
    expect(relevantErrors[0][0]).toEqual(
      expect.stringContaining("Encountered two children with the same key"),
    );
  });

  it("warns for duplicated array keys with component stack info", async () => {
    class Component extends React.Component {
      render() {
        return <div>{[<div key="1" />, <div key="1" />]}</div>;
      }
    }

    class Parent extends React.Component<{ child: React.ReactElement }> {
      render() {
        return React.cloneElement(this.props.child);
      }
    }

    class GrandParent extends React.Component {
      render() {
        return <Parent child={<Component />} />;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<GrandParent />);
    });

    const relevantErrors = getRelevantErrors(consoleErrorSpy);
    expect(relevantErrors.length).toBeGreaterThan(0);
    expect(relevantErrors[0][0]).toEqual(
      expect.stringContaining("Encountered two children with the same key"),
    );
  });

  it("warns for duplicated iterable keys", async () => {
    class Component extends React.Component {
      render() {
        return <div>{createIterable([<div key="1" />, <div key="1" />])}</div>;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });

    const relevantErrors = getRelevantErrors(consoleErrorSpy);
    expect(relevantErrors.length).toBeGreaterThan(0);
    expect(relevantErrors[0][0]).toEqual(
      expect.stringContaining("Encountered two children with the same key"),
    );
  });

  it("warns for duplicated iterable keys with component stack info", async () => {
    class Component extends React.Component {
      render() {
        return <div>{createIterable([<div key="1" />, <div key="1" />])}</div>;
      }
    }

    class Parent extends React.Component<{ child: React.ReactElement }> {
      render() {
        return React.cloneElement(this.props.child);
      }
    }

    class GrandParent extends React.Component {
      render() {
        return <Parent child={<Component />} />;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<GrandParent />);
    });

    const relevantErrors = getRelevantErrors(consoleErrorSpy);
    expect(relevantErrors.length).toBeGreaterThan(0);
    expect(relevantErrors[0][0]).toEqual(
      expect.stringContaining("Encountered two children with the same key"),
    );
  });
});
