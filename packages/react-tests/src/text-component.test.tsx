import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect } from "vitest";
import { act } from "./utils";

describe("ReactDOMTextComponent", () => {
  it("updates a mounted text component in place", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <div>
          <span />
          {"foo"}
          {"bar"}
        </div>,
      );
    });
    let instance = container.firstChild!;
    let nodes = instance.childNodes;

    const foo = nodes[1];
    const bar = nodes[2];
    expect(foo.textContent).toBe("foo");
    expect(bar.textContent).toBe("bar");

    await act(() => {
      root.render(
        <div>
          <span />
          {"baz"}
          {"qux"}
        </div>,
      );
    });
    instance = container.firstChild!;
    nodes = instance.childNodes;
    expect(nodes[1]).toBe(foo);
    expect(nodes[2]).toBe(bar);
    expect(foo.textContent).toBe("baz");
    expect(bar.textContent).toBe("qux");
  });

  it("can be toggled in and out of the markup", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <div>
          {"foo"}
          <div />
          {"bar"}
        </div>,
      );
    });
    let instance = container.firstChild!;

    let childNodes = instance.childNodes;
    const childDiv = childNodes[1];

    await act(() => {
      root.render(
        <div>
          {null}
          <div />
          {null}
        </div>,
      );
    });
    instance = container.firstChild!;
    childNodes = instance.childNodes;
    expect(childNodes.length).toBe(1);
    expect(childNodes[0]).toBe(childDiv);

    await act(() => {
      root.render(
        <div>
          {"foo"}
          <div />
          {"bar"}
        </div>,
      );
    });
    instance = container.firstChild!;
    childNodes = instance.childNodes;
    expect(childNodes.length).toBe(3);
    expect(childNodes[0].textContent).toBe("foo");
    expect(childNodes[1]).toBe(childDiv);
    expect(childNodes[2].textContent).toBe("bar");
  });

  it("throws for Temporal-like text nodes", async () => {
    const container = document.createElement("div");

    class TemporalLike {
      valueOf() {
        throw new TypeError("prod message");
      }
      toString() {
        return "2020-01-01";
      }
    }

    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(<div>{new TemporalLike() as unknown as string}</div>);
      });
    }).rejects.toThrowError(
      new Error(
        "Objects are not valid as a React child (found: object with keys {})." +
          " If you meant to render a collection of children, use an array instead.",
      ),
    );
  });
});
