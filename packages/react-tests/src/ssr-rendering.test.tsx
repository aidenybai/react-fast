// @vitest-environment node
import React from "react";
import { renderToString, renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

describe("escapeTextForBrowser", () => {
  it("should escape ampersand in text content", () => {
    const result = renderToString(<span>{"&"}</span>);
    expect(result).toContain("&amp;");
  });

  it("should escape double quote in text content", () => {
    const result = renderToString(<span>{'"'}</span>);
    expect(result).toContain("&quot;");
  });

  it("should escape single quote in text content", () => {
    const result = renderToString(<span>{"'"}</span>);
    expect(result).toContain("&#x27;");
  });

  it("should escape greater than in text content", () => {
    const result = renderToString(<span>{">"}</span>);
    expect(result).toContain("&gt;");
  });

  it("should escape less than in text content", () => {
    const result = renderToString(<span>{"<"}</span>);
    expect(result).toContain("&lt;");
  });

  it("should render number as text content", () => {
    const result = renderToString(<span>{42}</span>);
    expect(result).toContain("42");
  });

  it("should render number in attribute as string", () => {
    const result = renderToString(<img data-attr={42} />);
    expect(result).toContain('data-attr="42"');
  });

  it("should escape script tag in text content", () => {
    const result = renderToString(<span>{'<script type="">alert("hi")</script>'}</span>);
    expect(result).not.toContain("<script");
    expect(result).toContain("&lt;script");
  });
});

describe("quoteAttributeValueForBrowser", () => {
  it("should escape ampersand in attribute value", () => {
    const result = renderToString(<img data-attr="&" />);
    expect(result).toContain("&amp;");
  });

  it("should escape double quote in attribute value", () => {
    const result = renderToString(<img data-attr={'"'} />);
    expect(result).toContain("&quot;");
  });

  it("should escape single quote in attribute value", () => {
    const result = renderToString(<img data-attr="'" />);
    expect(result).toContain("&#x27;");
  });

  it("should escape greater than in attribute value", () => {
    const result = renderToString(<img data-attr=">" />);
    expect(result).toContain("&gt;");
  });

  it("should escape less than in attribute value", () => {
    const result = renderToString(<img data-attr="<" />);
    expect(result).toContain("&lt;");
  });

  it("should render number in attribute value", () => {
    const result = renderToString(<img data-attr={42} />);
    expect(result).toContain('data-attr="42"');
  });

  it("should render object with toString in attribute value", () => {
    const objectWithToString = {
      toString() {
        return "hello world";
      },
    };
    const result = renderToString(<img data-attr={objectWithToString as unknown as string} />);
    expect(result).toContain('data-attr="hello world"');
  });

  it("should escape script tag in attribute value", () => {
    const result = renderToString(<img data-attr={'<script type="">alert("hi")</script>'} />);
    expect(result).not.toContain("<script");
    expect(result).toContain("&lt;script");
  });
});

describe("ReactServerRendering - renderToString", () => {
  it("should generate simple markup", () => {
    const result = renderToString(<span>hello world</span>);
    expect(result).toContain("<span>hello world</span>");
  });

  it("should generate simple markup for self-closing tags", () => {
    const result = renderToString(<img />);
    expect(result).toContain("<img");
  });

  it("should return empty string for component that returns null", () => {
    const NullComponent = () => null;
    const result = renderToString(<NullComponent />);
    expect(result).toBe("");
  });

  it("should render composite components", () => {
    const Child = (props: { name: string }) => <span>My name is {props.name}</span>;
    const Parent = () => <Child name="child" />;
    const result = renderToString(<Parent />);
    expect(result).toContain("<span>My name is <!-- -->child</span>");
  });

  it("should only execute certain lifecycle methods", () => {
    const lifecycleCalls: string[] = [];

    class TestComponent extends React.Component {
      constructor(props: object) {
        super(props);
        this.state = { name: "TestComponent" };
        lifecycleCalls.push("getInitialState");
      }

      UNSAFE_componentWillMount() {
        lifecycleCalls.push("componentWillMount");
      }

      componentDidMount() {
        lifecycleCalls.push("componentDidMount");
      }

      render() {
        lifecycleCalls.push("render");
        return <span>Component</span>;
      }

      componentWillUnmount() {
        lifecycleCalls.push("componentWillUnmount");
      }
    }

    renderToString(<TestComponent />);
    expect(lifecycleCalls).toEqual(["getInitialState", "componentWillMount", "render"]);
  });

  it("should throw with silly args", () => {
    expect(() => {
      renderToString(<div>{{ text: "objects are not valid" } as unknown as React.ReactNode}</div>);
    }).toThrow();
  });

  it("should throw prop mapping error for an iframe with invalid props", () => {
    expect(() => {
      renderToString(<iframe style="border:none;" />);
    }).toThrow();
  });
});

describe("ReactServerRendering - renderToStaticMarkup", () => {
  it("should not put checksum and React ID on components", () => {
    const result = renderToStaticMarkup(<span>hello world</span>);
    expect(result).toBe("<span>hello world</span>");
    expect(result).not.toContain("data-reactroot");
    expect(result).not.toContain("data-react");
  });

  it("should not put checksum and React ID on text components", () => {
    const result = renderToStaticMarkup(
      <span>
        {"hello"} {"world"}
      </span>,
    );
    expect(result).toBe("<span>hello world</span>");
    expect(result).not.toContain("data-reactroot");
    expect(result).not.toContain("data-react");
  });

  it("should not use comments for empty nodes", () => {
    const NullComponent = () => null;
    const result = renderToStaticMarkup(<NullComponent />);
    expect(result).toBe("");
    expect(result).not.toContain("<!--");
  });

  it("should only execute certain lifecycle methods", () => {
    const lifecycleCalls: string[] = [];

    class TestComponent extends React.Component {
      constructor(props: object) {
        super(props);
        this.state = { name: "TestComponent" };
        lifecycleCalls.push("getInitialState");
      }

      UNSAFE_componentWillMount() {
        lifecycleCalls.push("componentWillMount");
      }

      componentDidMount() {
        lifecycleCalls.push("componentDidMount");
      }

      render() {
        lifecycleCalls.push("render");
        return <span>Component</span>;
      }

      componentWillUnmount() {
        lifecycleCalls.push("componentWillUnmount");
      }
    }

    renderToStaticMarkup(<TestComponent />);
    expect(lifecycleCalls).toEqual(["getInitialState", "componentWillMount", "render"]);
  });

  it("should throw with silly args", () => {
    expect(() => {
      renderToStaticMarkup(
        <div>{{ text: "objects are not valid" } as unknown as React.ReactNode}</div>,
      );
    }).toThrow();
  });

  it("should allow nested lists", () => {
    const result = renderToStaticMarkup(
      <ul>
        {[
          [<li key="a">a</li>, <li key="b">b</li>],
          [<li key="c">c</li>, <li key="d">d</li>],
        ]}
      </ul>,
    );
    expect(result).toBe("<ul><li>a</li><li>b</li><li>c</li><li>d</li></ul>");
  });

  it("should render a forwardRef component", () => {
    const InnerComponent = (props: { label: string }, ref: React.Ref<HTMLSpanElement>) => (
      <span ref={ref}>{props.label}</span>
    );

    const ForwardRefComponent = React.forwardRef(InnerComponent);
    const result = renderToStaticMarkup(<ForwardRefComponent label="hello" />);
    expect(result).toBe("<span>hello</span>");
  });

  it("should render suspense fallback for a lazy component", () => {
    const LazyInner = () => <span>lazy content</span>;
    const LazyComponent = React.lazy(() => Promise.resolve({ default: LazyInner }));

    const result = renderToStaticMarkup(
      <React.Suspense fallback={<span>loading</span>}>
        <LazyComponent />
      </React.Suspense>,
    );
    expect(result).toBe("<span>loading</span>");
  });

  it("should render a memo component", () => {
    const InnerComponent = (props: { label: string }) => <span>{props.label}</span>;
    const MemoComponent = React.memo(InnerComponent);
    const result = renderToStaticMarkup(<MemoComponent label="memo" />);
    expect(result).toBe("<span>memo</span>");
  });

  it("should render a memo forwardRef component", () => {
    const InnerComponent = (props: { label: string }, ref: React.Ref<HTMLSpanElement>) => (
      <span ref={ref}>{props.label}</span>
    );

    const MemoForwardRefComponent = React.memo(React.forwardRef(InnerComponent));
    const result = renderToStaticMarkup(<MemoForwardRefComponent label="memo-ref" />);
    expect(result).toBe("<span>memo-ref</span>");
  });
});
