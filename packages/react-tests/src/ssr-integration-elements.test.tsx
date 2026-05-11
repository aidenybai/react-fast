import React from "react";
import { describe, expect } from "vitest";
import { itRenders, itClientRenders } from "./ssr-integration-utils";

const TEXT_NODE_TYPE = 3;

const expectTextNode = (node: ChildNode, text: string) => {
  expect(node).not.toBe(null);
  expect(node.nodeType).toBe(TEXT_NODE_TYPE);
  expect(node.nodeValue).toMatch(text);
};

describe("ReactDOMServerIntegration - elements and children", () => {
  describe("text children", () => {
    itRenders("a div with text", async (render) => {
      const element = await render(<div>Text</div>);
      expect((element as Element).tagName).toBe("DIV");
      expect(element!.childNodes.length).toBe(1);
      expectTextNode(element!.firstChild!, "Text");
    });

    itRenders("a div with text with flanking whitespace", async (render) => {
      const element = await render(<div>{" Text "}</div>);
      expect(element!.childNodes.length).toBe(1);
      expectTextNode(element!.childNodes[0], " Text ");
    });

    itRenders("a div with an empty text child", async (render) => {
      const element = await render(<div>{""}</div>);
      expect(element!.childNodes.length).toBe(0);
    });

    itRenders("a div with multiple empty text children", async (render) => {
      const element = await render(
        <div>
          {""}
          {""}
          {""}
        </div>,
      );
      expect(element!.childNodes.length).toBe(0);
      expect(element!.textContent).toBe("");
    });

    itRenders("a div with text sibling to a node", async (render) => {
      const element = await render(
        <div>
          Text<span>More Text</span>
        </div>,
      );
      expect(element!.childNodes.length).toBeGreaterThanOrEqual(2);
      const lastChild = element!.childNodes[element!.childNodes.length - 1] as Element;
      expect(lastChild.tagName).toBe("SPAN");
      expect(lastChild.textContent).toBe("More Text");
    });

    itRenders("a custom element with text", async (render) => {
      const element = await render(React.createElement("custom-element", null, "Text"));
      expect((element as Element).tagName).toBe("CUSTOM-ELEMENT");
      expect(element!.childNodes.length).toBe(1);
      expectTextNode(element!.firstChild!, "Text");
    });

    itRenders("a leading blank child with a text sibling", async (render) => {
      const element = await render(<div>{""}foo</div>);
      expect(element!.childNodes.length).toBe(1);
      expectTextNode(element!.childNodes[0], "foo");
    });

    itRenders("a trailing blank child with a text sibling", async (render) => {
      const element = await render(<div>foo{""}</div>);
      expect(element!.childNodes.length).toBe(1);
      expectTextNode(element!.childNodes[0], "foo");
    });
  });

  describe("number children", () => {
    itRenders("a number as single child", async (render) => {
      const element = await render(<div>{3}</div>);
      expect(element!.textContent).toBe("3");
    });

    itRenders("zero as single child", async (render) => {
      const element = await render(<div>{0}</div>);
      expect(element!.textContent).toBe("0");
    });
  });

  describe("null, false, and undefined children", () => {
    itRenders("null single child as blank", async (render) => {
      const element = await render(<div>{null}</div>);
      expect(element!.childNodes.length).toBe(0);
    });

    itRenders("false single child as blank", async (render) => {
      const element = await render(<div>{false}</div>);
      expect(element!.childNodes.length).toBe(0);
    });

    itRenders("undefined single child as blank", async (render) => {
      const element = await render(<div>{undefined}</div>);
      expect(element!.childNodes.length).toBe(0);
    });

    itClientRenders("a null component children as empty", async (render) => {
      const NullComponent = () => null;
      const element = await render(
        <div>
          <NullComponent />
        </div>,
      );
      expect(element!.childNodes.length).toBe(0);
    });

    itRenders("null children as blank", async (render) => {
      const element = await render(<div>{null}foo</div>);
      expect(element!.childNodes.length).toBe(1);
      expectTextNode(element!.childNodes[0], "foo");
    });

    itRenders("false children as blank", async (render) => {
      const element = await render(<div>{false}foo</div>);
      expect(element!.childNodes.length).toBe(1);
      expectTextNode(element!.childNodes[0], "foo");
    });

    itRenders("null and false children together as blank", async (render) => {
      const element = await render(
        <div>
          {false}
          {null}foo{null}
          {false}
        </div>,
      );
      expect(element!.childNodes.length).toBe(1);
      expectTextNode(element!.childNodes[0], "foo");
    });

    itRenders("only null and false children as blank", async (render) => {
      const element = await render(
        <div>
          {false}
          {null}
          {null}
          {false}
        </div>,
      );
      expect(element!.childNodes.length).toBe(0);
    });
  });

  describe("elements with implicit namespaces", () => {
    itRenders("an svg element", async (render) => {
      const element = await render(<svg />);
      expect(element!.childNodes.length).toBe(0);
      expect((element as Element).tagName).toBe("svg");
      expect((element as Element).namespaceURI).toBe("http://www.w3.org/2000/svg");
    });

    itRenders("svg child element with an attribute", async (render) => {
      const element = await render(<svg viewBox="0 0 0 0" />);
      expect(element!.childNodes.length).toBe(0);
      expect((element as Element).tagName).toBe("svg");
      expect((element as Element).getAttribute("viewBox")).toBe("0 0 0 0");
    });

    itRenders("svg element with a tabIndex attribute", async (render) => {
      const element = await render(<svg tabIndex={1} />);
      expect((element as HTMLElement).tabIndex).toBe(1);
    });

    itRenders("a math element", async (render) => {
      const element = await render(<math />);
      expect((element as Element).tagName.toLowerCase()).toBe("math");
    });
  });

  describe("elements and children nesting", () => {
    itRenders("a div with a child", async (render) => {
      const element = await render(
        <div id="parent">
          <div id="child" />
        </div>,
      );
      expect((element as Element).id).toBe("parent");
      expect(element!.childNodes.length).toBe(1);
      expect((element!.firstChild as Element).id).toBe("child");
      expect(element!.firstChild!.childNodes.length).toBe(0);
    });

    itRenders("a div with multiple children", async (render) => {
      const element = await render(
        <div id="parent">
          <div id="child1" />
          <div id="child2" />
        </div>,
      );
      expect((element as Element).id).toBe("parent");
      expect(element!.childNodes.length).toBe(2);
      expect((element!.childNodes[0] as Element).id).toBe("child1");
      expect((element!.childNodes[1] as Element).id).toBe("child2");
    });

    itRenders("a div with nested children", async (render) => {
      const element = await render(
        <div>
          <div>
            <div />
          </div>
        </div>,
      );
      expect(element!.childNodes.length).toBe(1);
      expect(element!.firstChild!.childNodes.length).toBe(1);
      expect(element!.firstChild!.firstChild!.childNodes.length).toBe(0);
    });

    itClientRenders("a div with a class component child", async (render) => {
      class Child extends React.Component {
        render() {
          return <div id="child" />;
        }
      }
      const element = await render(
        <div id="parent">
          <Child />
        </div>,
      );
      expect((element as Element).id).toBe("parent");
      expect(element!.childNodes.length).toBe(1);
      expect((element!.firstChild as Element).id).toBe("child");
    });

    itClientRenders("a div with a function component child", async (render) => {
      const Child = () => <div id="child" />;
      const element = await render(
        <div id="parent">
          <Child />
        </div>,
      );
      expect((element as Element).id).toBe("parent");
      expect(element!.childNodes.length).toBe(1);
      expect((element!.firstChild as Element).id).toBe("child");
    });
  });

  describe("attributes", () => {
    itRenders("simple attributes", async (render) => {
      const element = await render(<div id="foo" className="bar" />);
      expect((element as Element).id).toBe("foo");
      expect((element as Element).className).toBe("bar");
    });

    itRenders("boolean attributes", async (render) => {
      const element = await render(<input disabled={true} />);
      expect((element as HTMLInputElement).disabled).toBe(true);
    });

    itRenders("numeric attributes", async (render) => {
      const element = await render(<input tabIndex={3} />);
      expect((element as HTMLInputElement).tabIndex).toBe(3);
    });

    itRenders("style attribute with object", async (render) => {
      const element = await render(<div style={{ color: "red", fontSize: "14px" }} />);
      expect((element as HTMLElement).style.color).toBe("red");
      expect((element as HTMLElement).style.fontSize).toBe("14px");
    });

    itRenders("data attributes", async (render) => {
      const element = await render(<div data-testid="my-test" data-value="123" />);
      expect((element as Element).getAttribute("data-testid")).toBe("my-test");
      expect((element as Element).getAttribute("data-value")).toBe("123");
    });

    itRenders("aria attributes", async (render) => {
      const element = await render(<div aria-label="Close" aria-hidden={true} />);
      expect((element as Element).getAttribute("aria-label")).toBe("Close");
      expect((element as Element).getAttribute("aria-hidden")).toBe("true");
    });
  });
});
