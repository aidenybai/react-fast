import React from "react";
import { describe, expect } from "vitest";
import { itRenders } from "./ssr-integration-utils";

const TEXT_NODE_TYPE = 3;

describe("ReactDOMServerIntegration - basic rendering", () => {
  itRenders("a blank div", async (render) => {
    const element = await render(<div />);
    expect(element!.nodeName).toBe("DIV");
  });

  itRenders("a self-closing tag", async (render) => {
    const element = await render(<br />);
    expect(element!.nodeName).toBe("BR");
  });

  itRenders("a self-closing tag as a child", async (render) => {
    const element = await render(
      <div>
        <br />
      </div>,
    );
    expect(element!.childNodes.length).toBe(1);
    expect((element!.firstChild as Element).tagName).toBe("BR");
  });

  itRenders("a string", async (render) => {
    const element = await render(<>Hello</>);
    expect(element!.nodeType).toBe(TEXT_NODE_TYPE);
    expect(element!.nodeValue).toMatch("Hello");
  });

  itRenders("a number", async (render) => {
    const element = await render(<>{42}</>);
    expect(element!.nodeType).toBe(TEXT_NODE_TYPE);
    expect(element!.nodeValue).toMatch("42");
  });

  itRenders("an array with one child", async (render) => {
    const element = await render(
      <div>
        <div key={1}>text1</div>
      </div>,
    );
    expect((element!.firstChild as Element).tagName).toBe("DIV");
  });

  itRenders("an array with several children", async (render) => {
    const Header = () => <p>header</p>;
    const Footer = () => (
      <>
        <h2>footer</h2>
        <h3>about</h3>
      </>
    );
    const element = await render(
      <div>
        <div>text1</div>
        <span>text2</span>
        <Header />
        <Footer />
      </div>,
    );
    expect((element!.childNodes[0] as Element).tagName).toBe("DIV");
    expect((element!.childNodes[1] as Element).tagName).toBe("SPAN");
    expect((element!.childNodes[2] as Element).tagName).toBe("P");
    expect((element!.childNodes[3] as Element).tagName).toBe("H2");
    expect((element!.childNodes[4] as Element).tagName).toBe("H3");
  });

  itRenders("a nested div structure", async (render) => {
    const element = await render(
      <div>
        <div>text1</div>
        <span>text2</span>
        <p />
      </div>,
    );
    expect((element!.childNodes[0] as Element).tagName).toBe("DIV");
    expect((element!.childNodes[1] as Element).tagName).toBe("SPAN");
    expect((element!.childNodes[2] as Element).tagName).toBe("P");
  });

  itRenders("emptyish values", async (render) => {
    const zeroElement = await render(<>{0}</>);
    expect(zeroElement!.nodeType).toBe(TEXT_NODE_TYPE);
    expect(zeroElement!.nodeValue).toMatch("0");

    const emptyStringElement = await render(<div>{""}</div>);
    expect(emptyStringElement!.textContent).toBe("");
  });
});
