import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect } from "vitest";
import { act } from "./utils";

const renderIntoDocument = async (children: React.ReactNode) => {
  const container = document.createElement("div");
  const root = ReactDOMClient.createRoot(container);
  await act(async () => root.render(children));
  return container;
};

const firstChildElement = (container: HTMLDivElement) => container.firstChild as HTMLElement;

describe("ReactDOMOption", () => {
  it("should flatten children to a string", async () => {
    const stub = (
      <option>
        {1} {"foo"}
      </option>
    );
    const container = await renderIntoDocument(stub);
    expect(firstChildElement(container).innerHTML).toBe("1 foo");
  });

  it("should warn for invalid child tags", async () => {
    const element = (
      <option value="12">
        {1} <div /> {2}
      </option>
    );
    const container = await renderIntoDocument(element);
    expect(firstChildElement(container).innerHTML).toBe("1 <div></div> 2");
    await renderIntoDocument(element);
  });

  it("should warn for component child if no value prop is provided", async () => {
    const Foo = () => {
      return <>2</>;
    };
    const element = (
      <option>
        {1} <Foo /> {3}
      </option>
    );
    const container = await renderIntoDocument(element);
    expect(firstChildElement(container).innerHTML).toBe("1 2 3");
    await renderIntoDocument(element);
  });

  it("should not warn for component child if value prop is provided", async () => {
    const Foo = () => {
      return <>2</>;
    };
    const element = (
      <option value="123">
        {1} <Foo /> {3}
      </option>
    );
    const container = await renderIntoDocument(element);
    expect(firstChildElement(container).innerHTML).toBe("1 2 3");
    await renderIntoDocument(element);
  });

  it("should ignore null/undefined/false children without warning", async () => {
    const stub = (
      <option>
        {1} {false}
        {true}
        {null}
        {undefined} {2}
      </option>
    );
    const container = await renderIntoDocument(stub);
    expect(firstChildElement(container).innerHTML).toBe("1  2");
  });

  it("should throw on object children", async () => {
    await expect(async () => renderIntoDocument(<option>{{} as any}</option>)).rejects.toThrow(
      "Objects are not valid as a React child",
    );
    await expect(async () => {
      await renderIntoDocument(<option>{[{}] as any}</option>);
    }).rejects.toThrow("Objects are not valid as a React child");
    await expect(async () => {
      await renderIntoDocument(
        <option>
          {{} as any}
          <span />
        </option>,
      );
    }).rejects.toThrow("Objects are not valid as a React child");
    await expect(async () => {
      await renderIntoDocument(
        <option>
          {"1"}
          {{} as any}
          {2}
        </option>,
      );
    }).rejects.toThrow("Objects are not valid as a React child");
  });

  it("should support element-ish child", async () => {
    const obj: any = {
      $$typeof: Symbol.for("react.transitional.element"),
      type: (props: { content: string }) => props.content,
      ref: null,
      key: null,
      props: {
        content: "hello",
      },
      toString() {
        return this.props.content;
      },
    };

    let container = await renderIntoDocument(<option value="a">{obj}</option>);
    expect(firstChildElement(container).innerHTML).toBe("hello");

    container = await renderIntoDocument(<option value="b">{[obj]}</option>);
    expect(firstChildElement(container).innerHTML).toBe("hello");

    container = await renderIntoDocument(<option value={obj}>{obj}</option>);
    expect(firstChildElement(container).innerHTML).toBe("hello");
    expect((container.firstChild as HTMLOptionElement).value).toBe("hello");

    container = await renderIntoDocument(
      <option value={obj}>
        {"1"}
        {obj}
        {2}
      </option>,
    );
    expect(firstChildElement(container).innerHTML).toBe("1hello2");
    expect((container.firstChild as HTMLOptionElement).value).toBe("hello");
  });

  it("should support bigint values", async () => {
    const container = await renderIntoDocument(<option>{5n as any}</option>);
    expect(firstChildElement(container).innerHTML).toBe("5");
    expect((container.firstChild as HTMLOptionElement).value).toBe("5");
  });

  it("should be able to use dangerouslySetInnerHTML on option", async () => {
    const stub = <option dangerouslySetInnerHTML={{ __html: "foobar" }} />;
    const container = await renderIntoDocument(stub);
    expect(firstChildElement(container).innerHTML).toBe("foobar");
  });

  it("should set attribute for empty value", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<option value="" />);
    });
    let option = container.firstChild as HTMLOptionElement;
    expect(option.hasAttribute("value")).toBe(true);
    expect(option.getAttribute("value")).toBe("");

    await act(() => {
      root.render(<option value="lava" />);
    });
    option = container.firstChild as HTMLOptionElement;
    expect(option.hasAttribute("value")).toBe(true);
    expect(option.getAttribute("value")).toBe("lava");
  });

  it("should allow ignoring value on option", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    const stub = (
      <select value="giraffe" onChange={() => {}}>
        <option>monkey</option>
        <option>gir{"a"}ffe</option>
        <option>gorill{"a"}</option>
      </select>
    );
    const options = stub.props.children;

    await act(() => {
      root.render(stub);
    });
    let node = container.firstChild as HTMLSelectElement;
    expect(node.selectedIndex).toBe(1);

    await act(() => {
      root.render(<select value="gorilla">{options}</select>);
    });
    node = container.firstChild as HTMLSelectElement;
    expect(node.selectedIndex).toEqual(2);
  });
});
