import React from "react";
import * as ReactDOMClient from "react-dom/client";
import * as ReactDOMServer from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { act } from "./utils";

const originalSetAttribute = Element.prototype.setAttribute;
Element.prototype.setAttribute = function (name: string, value: unknown) {
  return originalSetAttribute.call(this, name, "" + value);
};

describe("ReactDOMSelect", () => {
  const noop = () => {};

  it("should allow setting `defaultValue`", async () => {
    const stub = (
      <select defaultValue="giraffe">
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const options = stub.props.children;
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild as HTMLSelectElement;

    expect(node.value).toBe("giraffe");

    await act(() => {
      root.render(<select defaultValue="gorilla">{options}</select>);
    });

    expect(node.value).toEqual("giraffe");
  });

  it("should not throw with `defaultValue` and without children", () => {
    const stub = <select defaultValue="dummy" />;

    expect(async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(stub);
      });
    }).not.toThrow();
  });

  it("should not control when using `defaultValue`", async () => {
    const element = (
      <select defaultValue="giraffe">
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(element);
    });

    const node = container.firstChild as HTMLSelectElement;

    expect(node.value).toBe("giraffe");

    node.value = "monkey";
    await act(() => {
      root.render(element);
    });

    expect(node.value).toEqual("monkey");
  });

  it("should allow setting `defaultValue` with multiple", async () => {
    const stub = (
      <select multiple={true} defaultValue={["giraffe", "gorilla"]}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const options = stub.props.children;
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild as HTMLSelectElement;

    expect(node.options[0].selected).toBe(false);
    expect(node.options[1].selected).toBe(true);
    expect(node.options[2].selected).toBe(true);

    await act(() => {
      root.render(
        <select multiple={true} defaultValue={["monkey"]}>
          {options}
        </select>,
      );
    });

    expect(node.options[0].selected).toBe(false);
    expect(node.options[1].selected).toBe(true);
    expect(node.options[2].selected).toBe(true);
  });

  it("should allow setting `value`", async () => {
    const stub = (
      <select value="giraffe" onChange={noop}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const options = stub.props.children;
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild as HTMLSelectElement;

    expect(node.value).toBe("giraffe");

    await act(() => {
      root.render(
        <select value="gorilla" onChange={noop}>
          {options}
        </select>,
      );
    });

    expect(node.value).toEqual("gorilla");
  });

  it("should default to the first non-disabled option", async () => {
    const stub = (
      <select defaultValue="">
        <option disabled={true}>Disabled</option>
        <option disabled={true}>Still Disabled</option>
        <option>0</option>
        <option disabled={true}>Also Disabled</option>
      </select>
    );
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild as HTMLSelectElement;
    expect(node.options[0].selected).toBe(false);
    expect(node.options[2].selected).toBe(true);
  });

  it("should allow setting `value` to __proto__", async () => {
    const stub = (
      <select value="__proto__" onChange={noop}>
        <option value="monkey">A monkey!</option>
        <option value="__proto__">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const options = stub.props.children;
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild as HTMLSelectElement;

    expect(node.value).toBe("__proto__");

    await act(() => {
      root.render(
        <select value="gorilla" onChange={noop}>
          {options}
        </select>,
      );
    });

    expect(node.value).toEqual("gorilla");
  });

  it("should not throw with `value` and without children", () => {
    const stub = <select value="dummy" onChange={noop} />;

    expect(async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(stub);
      });
    }).not.toThrow();
  });

  it("should allow setting `value` with multiple", async () => {
    const stub = (
      <select multiple={true} value={["giraffe", "gorilla"]} onChange={noop}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const options = stub.props.children;
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild as HTMLSelectElement;

    expect(node.options[0].selected).toBe(false);
    expect(node.options[1].selected).toBe(true);
    expect(node.options[2].selected).toBe(true);

    await act(() => {
      root.render(
        <select multiple={true} value={["monkey"]} onChange={noop}>
          {options}
        </select>,
      );
    });

    expect(node.options[0].selected).toBe(true);
    expect(node.options[1].selected).toBe(false);
    expect(node.options[2].selected).toBe(false);
  });

  it("should allow setting `value` to __proto__ with multiple", async () => {
    const stub = (
      <select multiple={true} value={["__proto__", "gorilla"]} onChange={noop}>
        <option value="monkey">A monkey!</option>
        <option value="__proto__">A __proto__!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const options = stub.props.children;
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild as HTMLSelectElement;

    expect(node.options[0].selected).toBe(false);
    expect(node.options[1].selected).toBe(true);
    expect(node.options[2].selected).toBe(true);

    await act(() => {
      root.render(
        <select multiple={true} value={["monkey"]} onChange={noop}>
          {options}
        </select>,
      );
    });

    expect(node.options[0].selected).toBe(true);
    expect(node.options[1].selected).toBe(false);
    expect(node.options[2].selected).toBe(false);
  });

  it("should not select other options automatically", async () => {
    const stub = (
      <select multiple={true} value={["12"]} onChange={noop}>
        <option value="1">one</option>
        <option value="2">two</option>
        <option value="12">twelve</option>
      </select>
    );
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild as HTMLSelectElement;

    expect(node.options[0].selected).toBe(false);
    expect(node.options[1].selected).toBe(false);
    expect(node.options[2].selected).toBe(true);
  });

  it("should reset child options selected when they are changed and `value` is set", async () => {
    const stub = <select multiple={true} value={["a", "b"]} onChange={noop} />;
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild as HTMLSelectElement;

    await act(() => {
      root.render(
        <select multiple={true} value={["a", "b"]} onChange={noop}>
          <option value="a">a</option>
          <option value="b">b</option>
          <option value="c">c</option>
        </select>,
      );
    });

    expect(node.options[0].selected).toBe(true);
    expect(node.options[1].selected).toBe(true);
    expect(node.options[2].selected).toBe(false);
  });

  it("should allow setting `value` with `objectToString`", async () => {
    const objectToString = {
      animal: "giraffe",
      toString() {
        return this.animal;
      },
    };

    const element = (
      <select multiple={true} value={[objectToString] as unknown as string[]} onChange={noop}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(element);
    });

    const node = container.firstChild as HTMLSelectElement;

    expect(node.options[0].selected).toBe(false);
    expect(node.options[1].selected).toBe(true);
    expect(node.options[2].selected).toBe(false);

    objectToString.animal = "monkey";

    const element2 = (
      <select multiple={true} value={[objectToString] as unknown as string[]}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );

    await act(() => {
      root.render(element2);
    });

    expect(node.options[0].selected).toBe(true);
    expect(node.options[1].selected).toBe(false);
    expect(node.options[2].selected).toBe(false);
  });

  it("should allow switching to multiple", async () => {
    const stub = (
      <select defaultValue="giraffe">
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const options = stub.props.children;
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild as HTMLSelectElement;

    expect(node.options[0].selected).toBe(false);
    expect(node.options[1].selected).toBe(true);
    expect(node.options[2].selected).toBe(false);

    await act(() => {
      root.render(
        <select multiple={true} defaultValue={["giraffe", "gorilla"]}>
          {options}
        </select>,
      );
    });

    expect(node.options[0].selected).toBe(false);
    expect(node.options[1].selected).toBe(true);
    expect(node.options[2].selected).toBe(true);
  });

  it("should allow switching from multiple", async () => {
    const stub = (
      <select multiple={true} defaultValue={["giraffe", "gorilla"]}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const options = stub.props.children;
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild as HTMLSelectElement;

    expect(node.options[0].selected).toBe(false);
    expect(node.options[1].selected).toBe(true);
    expect(node.options[2].selected).toBe(true);

    await act(() => {
      root.render(<select defaultValue="gorilla">{options}</select>);
    });

    expect(node.options[0].selected).toBe(false);
    expect(node.options[1].selected).toBe(false);
    expect(node.options[2].selected).toBe(true);
  });

  it("does not select an item when size is initially set to greater than 1", async () => {
    const stub = (
      <select size={2}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(stub);
    });

    const selectElement = container.firstChild as HTMLSelectElement;

    expect(selectElement.options[0].selected).toBe(false);
    expect(selectElement.options[1].selected).toBe(false);
    expect(selectElement.options[2].selected).toBe(false);

    expect(selectElement.value).toBe("");
    expect(selectElement.selectedIndex).toBe(-1);
  });

  it("should remember value when switching to uncontrolled", async () => {
    const stub = (
      <select value={"giraffe"} onChange={noop}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const options = stub.props.children;
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild as HTMLSelectElement;

    expect(node.options[0].selected).toBe(false);
    expect(node.options[1].selected).toBe(true);
    expect(node.options[2].selected).toBe(false);

    await act(() => {
      root.render(<select>{options}</select>);
    });

    expect(node.options[0].selected).toBe(false);
    expect(node.options[1].selected).toBe(true);
    expect(node.options[2].selected).toBe(false);
  });

  it("should remember updated value when switching to uncontrolled", async () => {
    const stub = (
      <select value={"giraffe"} onChange={noop}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const options = stub.props.children;
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild as HTMLSelectElement;
    await act(() => {
      root.render(
        <select value="gorilla" onChange={noop}>
          {options}
        </select>,
      );
    });

    expect(node.options[0].selected).toBe(false);
    expect(node.options[1].selected).toBe(false);
    expect(node.options[2].selected).toBe(true);

    await act(() => {
      root.render(<select>{options}</select>);
    });

    expect(node.options[0].selected).toBe(false);
    expect(node.options[1].selected).toBe(false);
    expect(node.options[2].selected).toBe(true);
  });

  it("should support server-side rendering", () => {
    const stub = (
      <select value="giraffe" onChange={noop}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const container = document.createElement("div");
    container.innerHTML = ReactDOMServer.renderToString(stub);
    const options = (container.firstChild as HTMLSelectElement).options;
    expect(options[0].value).toBe("monkey");
    expect(options[0].selected).toBe(false);
    expect(options[1].value).toBe("giraffe");
    expect(options[1].selected).toBe(true);
    expect(options[2].value).toBe("gorilla");
    expect(options[2].selected).toBe(false);
  });

  it("should support server-side rendering with defaultValue", () => {
    const stub = (
      <select defaultValue="giraffe">
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const container = document.createElement("div");
    container.innerHTML = ReactDOMServer.renderToString(stub);
    const options = (container.firstChild as HTMLSelectElement).options;
    expect(options[0].value).toBe("monkey");
    expect(options[0].selected).toBe(false);
    expect(options[1].value).toBe("giraffe");
    expect(options[1].selected).toBe(true);
    expect(options[2].value).toBe("gorilla");
    expect(options[2].selected).toBe(false);
  });

  it("should support server-side rendering with dangerouslySetInnerHTML", () => {
    const stub = (
      <select defaultValue="giraffe">
        <option
          value="monkey"
          dangerouslySetInnerHTML={{
            __html: "A monkey!",
          }}
        >
          {undefined}
        </option>
        <option
          value="giraffe"
          dangerouslySetInnerHTML={{
            __html: "A giraffe!",
          }}
        >
          {null}
        </option>
        <option
          value="gorilla"
          dangerouslySetInnerHTML={{
            __html: "A gorilla!",
          }}
        />
      </select>
    );
    const container = document.createElement("div");
    container.innerHTML = ReactDOMServer.renderToString(stub);
    const options = (container.firstChild as HTMLSelectElement).options;
    expect(options[0].value).toBe("monkey");
    expect(options[0].selected).toBe(false);
    expect(options[1].value).toBe("giraffe");
    expect(options[1].selected).toBe(true);
    expect(options[2].value).toBe("gorilla");
    expect(options[2].selected).toBe(false);
  });

  it("should support server-side rendering with multiple", () => {
    const stub = (
      <select multiple={true} value={["giraffe", "gorilla"]} onChange={noop}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const container = document.createElement("div");
    container.innerHTML = ReactDOMServer.renderToString(stub);
    const options = (container.firstChild as HTMLSelectElement).options;
    expect(options[0].value).toBe("monkey");
    expect(options[0].selected).toBe(false);
    expect(options[1].value).toBe("giraffe");
    expect(options[1].selected).toBe(true);
    expect(options[2].value).toBe("gorilla");
    expect(options[2].selected).toBe(true);
  });

  it("should not control defaultValue if re-adding options", async () => {
    const container = document.createElement("div");

    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(
        <select multiple={true} defaultValue={["giraffe"]}>
          <option key="monkey" value="monkey">
            A monkey!
          </option>
          <option key="giraffe" value="giraffe">
            A giraffe!
          </option>
          <option key="gorilla" value="gorilla">
            A gorilla!
          </option>
        </select>,
      );
    });

    const node = container.firstChild as HTMLSelectElement;

    expect(node.options[0].selected).toBe(false);
    expect(node.options[1].selected).toBe(true);
    expect(node.options[2].selected).toBe(false);

    await act(() => {
      root.render(
        <select multiple={true} defaultValue={["giraffe"]}>
          <option key="monkey" value="monkey">
            A monkey!
          </option>
          <option key="gorilla" value="gorilla">
            A gorilla!
          </option>
        </select>,
      );
    });

    expect(node.options[0].selected).toBe(false);
    expect(node.options[1].selected).toBe(false);

    await act(() => {
      root.render(
        <select multiple={true} defaultValue={["giraffe"]}>
          <option key="monkey" value="monkey">
            A monkey!
          </option>
          <option key="giraffe" value="giraffe">
            A giraffe!
          </option>
          <option key="gorilla" value="gorilla">
            A gorilla!
          </option>
        </select>,
      );
    });

    expect(node.options[0].selected).toBe(false);
    expect(node.options[1].selected).toBe(false);
    expect(node.options[2].selected).toBe(false);
  });

  it("should support options with dynamic children", async () => {
    const container = document.createElement("div");

    let node: HTMLSelectElement | null = null;

    const App = ({ value }: { value: string }) => {
      return (
        <select
          value={value}
          ref={(selectNode) => {
            node = selectNode;
          }}
          onChange={noop}
        >
          <option key="monkey" value="monkey">
            A monkey {value === "monkey" ? "is chosen" : null}!
          </option>
          <option key="giraffe" value="giraffe">
            A giraffe {value === "giraffe" && "is chosen"}!
          </option>
          <option key="gorilla" value="gorilla">
            A gorilla {value === "gorilla" && "is chosen"}!
          </option>
        </select>
      );
    };

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App value="monkey" />);
    });

    expect(node!.options[0].selected).toBe(true);
    expect(node!.options[1].selected).toBe(false);
    expect(node!.options[2].selected).toBe(false);

    await act(() => {
      root.render(<App value="giraffe" />);
    });

    expect(node!.options[0].selected).toBe(false);
    expect(node!.options[1].selected).toBe(true);
    expect(node!.options[2].selected).toBe(false);
  });

  it("should warn if value is null", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <select value={null as unknown as string}>
          <option value="test" />
        </select>,
      );
    });

    await act(() => {
      root.render(
        <select value={null as unknown as string}>
          <option value="test" />
        </select>,
      );
    });
  });

  it("should warn if selected is set on <option>", async () => {
    const App = () => {
      return (
        <select>
          <option selected={true} />
          <option selected={true} />
        </select>
      );
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });

    await act(() => {
      root.render(<App />);
    });
  });

  it("should warn if value is null and multiple is true", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <select value={null as unknown as string[]} multiple={true}>
          <option value="test" />
        </select>,
      );
    });

    await act(() => {
      root.render(
        <select value={null as unknown as string[]} multiple={true}>
          <option value="test" />
        </select>,
      );
    });
  });

  it("should refresh state on change", async () => {
    const stub = (
      <select value="giraffe" onChange={noop}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );
    const container = document.createElement("div");
    document.body.appendChild(container);

    try {
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(stub);
      });

      const node = container.firstChild as HTMLSelectElement;

      await act(() => {
        node.dispatchEvent(new Event("change", { bubbles: true, cancelable: false }));
      });

      expect(node.value).toBe("giraffe");
    } finally {
      document.body.removeChild(container);
    }
  });

  it("should warn if value and defaultValue props are specified", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <select value="giraffe" defaultValue="giraffe">
          <option value="monkey">A monkey!</option>
          <option value="giraffe">A giraffe!</option>
          <option value="gorilla">A gorilla!</option>
        </select>,
      );
    });

    await act(() => {
      root.render(
        <select value="giraffe" defaultValue="giraffe">
          <option value="monkey">A monkey!</option>
          <option value="giraffe">A giraffe!</option>
          <option value="gorilla">A gorilla!</option>
        </select>,
      );
    });
  });

  it("should not warn about missing onChange in uncontrolled textareas", async () => {
    const container = document.createElement("div");
    let root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<select />);
    });

    await act(() => {
      root.unmount();
    });
    root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<select value={undefined} />);
    });
  });

  it("should be able to safely remove select onChange", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    const changeView = async () => {
      root.unmount();
    };

    const stub = (
      <select value="giraffe" onChange={changeView}>
        <option value="monkey">A monkey!</option>
        <option value="giraffe">A giraffe!</option>
        <option value="gorilla">A gorilla!</option>
      </select>
    );

    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild as HTMLSelectElement;

    await expect(
      act(() => {
        node.dispatchEvent(new Event("change", { bubbles: true, cancelable: false }));
      }),
    ).resolves.not.toThrow();

    expect(container.firstChild).toBe(null);
  });

  it("should select grandchild options nested inside an optgroup", async () => {
    const stub = (
      <select value="b" onChange={noop}>
        <optgroup label="group">
          <option value="a">a</option>
          <option value="b">b</option>
          <option value="c">c</option>
        </optgroup>
      </select>
    );
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild as HTMLSelectElement;

    expect(node.options[0].selected).toBe(false);
    expect(node.options[1].selected).toBe(true);
    expect(node.options[2].selected).toBe(false);
  });

  it("should not select first option by default when multiple is set and no defaultValue is set", async () => {
    const stub = (
      <select multiple={true} onChange={noop}>
        <option value="a">a</option>
        <option value="b">b</option>
        <option value="c">c</option>
      </select>
    );
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(stub);
    });

    const node = container.firstChild as HTMLSelectElement;

    expect(node.options[0].selected).toBe(false);
    expect(node.options[1].selected).toBe(false);
    expect(node.options[2].selected).toBe(false);
  });

  describe("When given a Symbol value", () => {
    it("treats initial Symbol value as missing", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select onChange={noop} value={Symbol("foobar") as unknown as string}>
            <option value={Symbol("foobar") as unknown as string}>A Symbol!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      const node = container.firstChild as HTMLSelectElement;
      expect(node.value).toBe("A Symbol!");
    });

    it("treats updated Symbol value as missing", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select onChange={noop} value="monkey">
            <option value={Symbol("foobar") as unknown as string}>A Symbol!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      let node = container.firstChild as HTMLSelectElement;
      expect(node.value).toBe("monkey");

      await act(() => {
        root.render(
          <select onChange={noop} value={Symbol("foobar") as unknown as string}>
            <option value={Symbol("foobar") as unknown as string}>A Symbol!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      node = container.firstChild as HTMLSelectElement;

      expect(node.value).toBe("A Symbol!");
    });

    it("treats initial Symbol defaultValue as an empty string", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select defaultValue={Symbol("foobar") as unknown as string}>
            <option value={Symbol("foobar") as unknown as string}>A Symbol!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      const node = container.firstChild as HTMLSelectElement;
      expect(node.value).toBe("A Symbol!");
    });

    it("treats updated Symbol defaultValue as an empty string", async () => {
      let container = document.createElement("div");
      let root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select defaultValue="monkey">
            <option value={Symbol("foobar") as unknown as string}>A Symbol!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      let node = container.firstChild as HTMLSelectElement;
      expect(node.value).toBe("monkey");

      container = document.createElement("div");
      root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select defaultValue={Symbol("foobar") as unknown as string}>
            <option value={Symbol("foobar") as unknown as string}>A Symbol!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      node = container.firstChild as HTMLSelectElement;
      expect(node.value).toBe("A Symbol!");
    });
  });

  describe("When given a function value", () => {
    it("treats initial function value as missing", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select onChange={noop} value={(() => {}) as unknown as string}>
            <option value={(() => {}) as unknown as string}>A function!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      const node = container.firstChild as HTMLSelectElement;
      expect(node.value).toBe("A function!");
    });

    it("treats initial function defaultValue as an empty string", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select defaultValue={(() => {}) as unknown as string}>
            <option value={(() => {}) as unknown as string}>A function!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      const node = container.firstChild as HTMLSelectElement;
      expect(node.value).toBe("A function!");
    });

    it("treats updated function value as an empty string", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select onChange={noop} value="monkey">
            <option value={(() => {}) as unknown as string}>A function!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      let node = container.firstChild as HTMLSelectElement;
      expect(node.value).toBe("monkey");

      await act(() => {
        root.render(
          <select onChange={noop} value={(() => {}) as unknown as string}>
            <option value={(() => {}) as unknown as string}>A function!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      node = container.firstChild as HTMLSelectElement;
      expect(node.value).toBe("A function!");
    });

    it("treats updated function defaultValue as an empty string", async () => {
      let container = document.createElement("div");
      let root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select defaultValue="monkey">
            <option value={(() => {}) as unknown as string}>A function!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      let node = container.firstChild as HTMLSelectElement;
      expect(node.value).toBe("monkey");

      container = document.createElement("div");
      root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select defaultValue={(() => {}) as unknown as string}>
            <option value={(() => {}) as unknown as string}>A function!</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      node = container.firstChild as HTMLSelectElement;

      expect(node.value).toBe("A function!");
    });
  });

  describe("When given a Temporal.PlainDate-like value", () => {
    class TemporalLike {
      valueOf() {
        throw new TypeError("prod message");
      }
      toString() {
        return "2020-01-01";
      }
    }

    const expectActToThrow = async (callback: () => void) => {
      let didThrow = false;
      try {
        await act(callback);
      } catch (error) {
        didThrow = true;
        const errorMessage = (error as Error).message;
        const isAggregateWithTemporalErrors =
          error instanceof AggregateError &&
          (error as AggregateError).errors.some(
            (innerError: Error) => innerError.message === "prod message",
          );
        const isDirectTemporalError = errorMessage.includes("prod message");
        expect(isDirectTemporalError || isAggregateWithTemporalErrors).toBe(true);
      }
      expect(didThrow).toBe(true);
    };

    it("throws when given a Temporal.PlainDate-like value (select)", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await expectActToThrow(() => {
        root.render(
          <select onChange={noop} value={new TemporalLike() as unknown as string}>
            <option value="2020-01-01">like a Temporal.PlainDate</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });
    });

    it("throws when given a Temporal.PlainDate-like value (option)", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await expectActToThrow(() => {
        root.render(
          <select onChange={noop} value="2020-01-01">
            <option value={new TemporalLike() as unknown as string}>
              like a Temporal.PlainDate
            </option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });
    });

    it("throws when given a Temporal.PlainDate-like value (both)", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await expectActToThrow(() => {
        root.render(
          <select onChange={noop} value={new TemporalLike() as unknown as string}>
            <option value={new TemporalLike() as unknown as string}>
              like a Temporal.PlainDate
            </option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });
    });

    it("throws with updated Temporal.PlainDate-like value (select)", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <select onChange={noop} value="monkey">
            <option value="2020-01-01">like a Temporal.PlainDate</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      await expectActToThrow(() => {
        root.render(
          <select onChange={noop} value={new TemporalLike() as unknown as string}>
            <option value="2020-01-01">like a Temporal.PlainDate</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });
    });

    it("throws with updated Temporal.PlainDate-like value (option)", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <select onChange={noop} value="2020-01-01">
            <option value="donkey">like a Temporal.PlainDate</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      await expectActToThrow(() => {
        root.render(
          <select onChange={noop} value="2020-01-01">
            <option value={new TemporalLike() as unknown as string}>
              like a Temporal.PlainDate
            </option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });
    });

    it("throws with updated Temporal.PlainDate-like value (both)", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <select onChange={noop} value="donkey">
            <option value="donkey">like a Temporal.PlainDate</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      await expectActToThrow(() => {
        root.render(
          <select onChange={noop} value={new TemporalLike() as unknown as string}>
            <option value={new TemporalLike() as unknown as string}>
              like a Temporal.PlainDate
            </option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });
    });

    it("throws when given a Temporal.PlainDate-like defaultValue (select)", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await expectActToThrow(() => {
        root.render(
          <select onChange={noop} defaultValue={new TemporalLike() as unknown as string}>
            <option value="2020-01-01">like a Temporal.PlainDate</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });
    });

    it("throws when given a Temporal.PlainDate-like defaultValue (option)", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await expectActToThrow(() => {
        root.render(
          <select onChange={noop} defaultValue="2020-01-01">
            <option value={new TemporalLike() as unknown as string}>
              like a Temporal.PlainDate
            </option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });
    });

    it("throws when given a Temporal.PlainDate-like defaultValue (both)", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await expectActToThrow(() => {
        root.render(
          <select onChange={noop} defaultValue={new TemporalLike() as unknown as string}>
            <option value={new TemporalLike() as unknown as string}>
              like a Temporal.PlainDate
            </option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });
    });

    it("throws with updated Temporal.PlainDate-like defaultValue (select)", async () => {
      let container = document.createElement("div");
      let root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select onChange={noop} defaultValue="monkey">
            <option value="2020-01-01">like a Temporal.PlainDate</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      container = document.createElement("div");
      root = ReactDOMClient.createRoot(container);
      await expectActToThrow(() => {
        root.render(
          <select onChange={noop} defaultValue={new TemporalLike() as unknown as string}>
            <option value="2020-01-01">like a Temporal.PlainDate</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });
    });

    it("throws with updated Temporal.PlainDate-like defaultValue (both)", async () => {
      let container = document.createElement("div");
      let root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(
          <select onChange={noop} defaultValue="monkey">
            <option value="donkey">like a Temporal.PlainDate</option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });

      container = document.createElement("div");
      root = ReactDOMClient.createRoot(container);
      await expectActToThrow(() => {
        root.render(
          <select onChange={noop} value={new TemporalLike() as unknown as string}>
            <option value={new TemporalLike() as unknown as string}>
              like a Temporal.PlainDate
            </option>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
          </select>,
        );
      });
    });
  });

  it("should not warn about missing onChange if value is not set", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(
          <select>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
            <option value="gorilla">A gorilla!</option>
          </select>,
        );
      }),
    ).resolves.not.toThrow();
  });

  it("should not throw an error about missing onChange if value is undefined", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(
          <select value={undefined}>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
            <option value="gorilla">A gorilla!</option>
          </select>,
        );
      }),
    ).resolves.not.toThrow();
  });

  it("should not warn about missing onChange if onChange is set", async () => {
    const change = vi.fn();
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(
          <select value="monkey" onChange={change}>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
            <option value="gorilla">A gorilla!</option>
          </select>,
        );
      }),
    ).resolves.not.toThrow();
  });

  it("should not warn about missing onChange if disabled is true", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(
          <select value="monkey" disabled={true}>
            <option value="monkey">A monkey!</option>
            <option value="giraffe">A giraffe!</option>
            <option value="gorilla">A gorilla!</option>
          </select>,
        );
      }),
    ).resolves.not.toThrow();
  });

  it("should warn about missing onChange if value is false", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <select value={false as unknown as string}>
          <option value="monkey">A monkey!</option>
          <option value="giraffe">A giraffe!</option>
          <option value="gorilla">A gorilla!</option>
        </select>,
      );
    });
  });

  it("should warn about missing onChange if value is 0", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <select value={0 as unknown as string}>
          <option value="monkey">A monkey!</option>
          <option value="giraffe">A giraffe!</option>
          <option value="gorilla">A gorilla!</option>
        </select>,
      );
    });
  });

  it('should warn about missing onChange if value is "0"', async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <select value="0">
          <option value="monkey">A monkey!</option>
          <option value="giraffe">A giraffe!</option>
          <option value="gorilla">A gorilla!</option>
        </select>,
      );
    });
  });

  it('should warn about missing onChange if value is ""', async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <select value="">
          <option value="monkey">A monkey!</option>
          <option value="giraffe">A giraffe!</option>
          <option value="gorilla">A gorilla!</option>
        </select>,
      );
    });
  });
});
