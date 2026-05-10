import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect } from "vitest";
import { act } from "./utils";

type ExpectedChild = string | React.JSX.Element;
type ExpectedChildren = string | ExpectedChild[];

const expectChildren = (container: HTMLElement, children: ExpectedChildren) => {
  const outerNode = container.firstChild!;

  if (typeof children === "string") {
    const textNode = outerNode.firstChild;
    if (children === "") {
      expect(textNode != null).toBe(false);
    } else {
      expect(textNode != null).toBe(true);
      expect(textNode!.nodeType).toBe(3);
      expect((textNode as Text).data).toBe(String(children));
    }
  } else {
    let mountIndex = 0;
    for (const child of children) {
      if (typeof child === "string") {
        if (child === "") {
          continue;
        }
        const textNode = outerNode.childNodes[mountIndex];
        expect(textNode != null).toBe(true);
        expect(textNode.nodeType).toBe(3);
        expect((textNode as Text).data).toBe(child);
        mountIndex++;
      } else {
        const elementDOMNode = outerNode.childNodes[mountIndex] as HTMLElement;
        expect(elementDOMNode.tagName).toBe("DIV");
        mountIndex++;
      }
    }
  }
};

const testAllPermutations = async (testCases: Array<React.ReactNode | ExpectedChildren>) => {
  for (let i = 0; i < testCases.length; i += 2) {
    const renderWithChildren = testCases[i] as React.ReactNode;
    const expectedResultAfterRender = testCases[i + 1] as ExpectedChildren;

    for (let j = 0; j < testCases.length; j += 2) {
      const updateWithChildren = testCases[j] as React.ReactNode;
      const expectedResultAfterUpdate = testCases[j + 1] as ExpectedChildren;

      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => root.render(<div>{renderWithChildren}</div>));
      expectChildren(container, expectedResultAfterRender);

      await act(() => root.render(<div>{updateWithChildren}</div>));
      expectChildren(container, expectedResultAfterUpdate);
    }
  }
};

describe("ReactMultiChildText", () => {
  it("should correctly handle all possible children for render and update", async () => {
    await testAllPermutations([
      // basic values
      undefined,
      [],
      null,
      [],
      false,
      [],
      true,
      [],
      0,
      "0",
      1.2,
      "1.2",
      "",
      [],
      "foo",
      "foo",

      [],
      [],
      [undefined],
      [],
      [null],
      [],
      [false],
      [],
      [true],
      [],
      [0],
      ["0"],
      [1.2],
      ["1.2"],
      [""],
      [],
      ["foo"],
      ["foo"],
      [<div key="d" />],
      [<div key="d" />],

      // two adjacent values
      [true, 0],
      ["0"],
      [0, 0],
      ["0", "0"],
      [1.2, 0],
      ["1.2", "0"],
      [0, ""],
      ["0", ""],
      ["foo", 0],
      ["foo", "0"],
      [0, <div key="d" />],
      ["0", <div key="d" />],

      [true, 1.2],
      ["1.2"],
      [1.2, 0],
      ["1.2", "0"],
      [1.2, 1.2],
      ["1.2", "1.2"],
      [1.2, ""],
      ["1.2", ""],
      ["foo", 1.2],
      ["foo", "1.2"],
      [1.2, <div key="d" />],
      ["1.2", <div key="d" />],

      [true, ""],
      [""],
      ["", 0],
      ["", "0"],
      [1.2, ""],
      ["1.2", ""],
      ["", ""],
      ["", ""],
      ["foo", ""],
      ["foo", ""],
      ["", <div key="d" />],
      ["", <div key="d" />],

      [true, "foo"],
      ["foo"],
      ["foo", 0],
      ["foo", "0"],
      [1.2, "foo"],
      ["1.2", "foo"],
      ["foo", ""],
      ["foo", ""],
      ["foo", "foo"],
      ["foo", "foo"],
      ["foo", <div key="d" />],
      ["foo", <div key="d" />],

      // values separated by an element
      [true, <div key="d" />, true],
      [<div key="d" />],
      [1.2, <div key="d" />, 1.2],
      ["1.2", <div key="d" />, "1.2"],
      ["", <div key="d" />, ""],
      ["", <div key="d" />, ""],
      ["foo", <div key="d" />, "foo"],
      ["foo", <div key="d" />, "foo"],

      [true, 1.2, <div key="d" />, "", "foo"],
      ["1.2", <div key="d" />, "", "foo"],
      [1.2, "", <div key="d" />, "foo", true],
      ["1.2", "", <div key="d" />, "foo"],
      ["", "foo", <div key="d" />, true, 1.2],
      ["", "foo", <div key="d" />, "1.2"],

      [true, 1.2, "", <div key="d" />, "foo", true, 1.2],
      ["1.2", "", <div key="d" />, "foo", "1.2"],
      ["", "foo", true, <div key="d" />, 1.2, "", "foo"],
      ["", "foo", <div key="d" />, "1.2", "", "foo"],

      // values inside arrays
      [[true], [true]],
      [],
      [[1.2], [1.2]],
      ["1.2", "1.2"],
      [[""], [""]],
      ["", ""],
      [["foo"], ["foo"]],
      ["foo", "foo"],
      [[<div key="a" />], [<div key="b" />]],
      [<div key="a" />, <div key="b" />],

      [[true, 1.2, <div key="d" />], "", "foo"],
      ["1.2", <div key="d" />, "", "foo"],
      [1.2, "", [<div key="d" />, "foo", true]],
      ["1.2", "", <div key="d" />, "foo"],
      ["", ["foo", <div key="d" />, true], 1.2],
      ["", "foo", <div key="d" />, "1.2"],

      [true, [1.2, "", <div key="d" />, "foo"], true, 1.2],
      ["1.2", "", <div key="d" />, "foo", "1.2"],
      ["", "foo", [true, <div key="d" />, 1.2, ""], "foo"],
      ["", "foo", <div key="d" />, "1.2", "", "foo"],
    ]);
  }, 30000);

  it("should correctly handle bigint children for render and update", async () => {
    await testAllPermutations([10n, "10", [10n], ["10"]]);
  });

  it("should throw if rendering both HTML and children", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    let didThrow = false;
    try {
      await act(() => {
        root.render(<div dangerouslySetInnerHTML={{ __html: "abcdef" }}>ghjkl</div>);
      });
    } catch {
      didThrow = true;
    }
    expect(didThrow).toBe(true);
  });

  it("should render between nested components and inline children", async () => {
    let container = document.createElement("div");
    let root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <div>
          <h1>
            <span />
            <span />
          </h1>
        </div>,
      );
    });

    container = document.createElement("div");
    root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(
          <div>
            <h1>A</h1>
          </div>,
        );
      }),
    ).resolves.not.toThrow();

    container = document.createElement("div");
    root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(
          <div>
            <h1>{["A"]}</h1>
          </div>,
        );
      }),
    ).resolves.not.toThrow();

    container = document.createElement("div");
    root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(
          <div>
            <h1>{["A", "B"]}</h1>
          </div>,
        );
      }),
    ).resolves.not.toThrow();
  });
});
