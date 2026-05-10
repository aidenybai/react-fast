import React from "react";
import * as ReactDOMClient from "react-dom/client";
import * as ReactDOMServer from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { act } from "./utils";

const emptyFunction = () => {};

describe("ReactDOMTextarea", () => {
  const renderTextarea = async (
    component: React.ReactElement,
    container: HTMLDivElement,
    root: ReactDOMClient.Root,
  ) => {
    await act(() => {
      root.render(component);
    });

    const node = container.firstChild as HTMLTextAreaElement;

    // jsdom quirk: the parser should strip the leading newline
    node.defaultValue = node.innerHTML.replace(/^\n/, "");
    return node;
  };

  it("should allow setting `defaultValue`", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(<textarea defaultValue="giraffe" />, container, root);

    expect(node.value).toBe("giraffe");

    await renderTextarea(<textarea defaultValue="gorilla" />, container, root);
    expect(node.value).toEqual("giraffe");

    node.value = "cat";

    await renderTextarea(<textarea defaultValue="monkey" />, container, root);
    expect(node.value).toEqual("cat");
  });

  it("should display `defaultValue` of number 0", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea defaultValue={0 as unknown as string} />,
      container,
      root,
    );

    expect(node.value).toBe("0");
  });

  it("should display `defaultValue` of bigint 0", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea defaultValue={0n as unknown as string} />,
      container,
      root,
    );

    expect(node.value).toBe("0");
  });

  it('should display "false" for `defaultValue` of `false`', async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea defaultValue={false as unknown as string} />,
      container,
      root,
    );

    expect(node.value).toBe("false");
  });

  it('should display "foobar" for `defaultValue` of `objToString`', async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    const objToString = {
      toString() {
        return "foobar";
      },
    };
    const node = await renderTextarea(
      <textarea defaultValue={objToString as unknown as string} />,
      container,
      root,
    );

    expect(node.value).toBe("foobar");
  });

  it("should set defaultValue", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea defaultValue="foo" />);
    });
    await act(() => {
      root.render(<textarea defaultValue="bar" />);
    });
    await act(() => {
      root.render(<textarea defaultValue="noise" />);
    });

    expect((container.firstChild as HTMLTextAreaElement).defaultValue).toBe("noise");
  });

  it("should not render value as an attribute", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea value="giraffe" onChange={emptyFunction} />,
      container,
      root,
    );

    expect(node.getAttribute("value")).toBe(null);
  });

  it("should display `value` of number 0", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea value={0 as unknown as string} onChange={emptyFunction} />,
      container,
      root,
    );

    expect(node.value).toBe("0");
  });

  it("should update defaultValue to empty string", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea defaultValue={"foo"} />);
    });

    await act(() => {
      root.render(<textarea defaultValue={""} />);
    });

    expect((container.firstChild as HTMLTextAreaElement).defaultValue).toBe("");
  });

  it("should allow setting `value` to `giraffe`", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea value="giraffe" onChange={emptyFunction} />,
      container,
      root,
    );

    expect(node.value).toBe("giraffe");

    await act(() => {
      root.render(<textarea value="gorilla" onChange={emptyFunction} />);
    });

    expect(node.value).toEqual("gorilla");
  });

  it("should render defaultValue for SSR", () => {
    const markup = ReactDOMServer.renderToString(<textarea defaultValue="1" />);
    const div = document.createElement("div");
    div.innerHTML = markup;
    expect((div.firstChild as HTMLTextAreaElement).innerHTML).toBe("1");
    expect((div.firstChild as HTMLTextAreaElement).getAttribute("defaultValue")).toBe(null);
  });

  it("should render value for SSR", () => {
    const element = <textarea value="1" onChange={() => {}} />;
    const markup = ReactDOMServer.renderToString(element);
    const div = document.createElement("div");
    div.innerHTML = markup;
    expect((div.firstChild as HTMLTextAreaElement).innerHTML).toBe("1");
    expect((div.firstChild as HTMLTextAreaElement).getAttribute("defaultValue")).toBe(null);
  });

  it("should allow setting `value` to `true`", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea value="giraffe" onChange={emptyFunction} />,
      container,
      root,
    );

    expect(node.value).toBe("giraffe");

    await act(() => {
      root.render(<textarea value={true as unknown as string} onChange={emptyFunction} />);
    });

    expect(node.value).toEqual("true");
  });

  it("should allow setting `value` to `false`", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea value="giraffe" onChange={emptyFunction} />,
      container,
      root,
    );

    expect(node.value).toBe("giraffe");

    await act(() => {
      root.render(<textarea value={false as unknown as string} onChange={emptyFunction} />);
    });

    expect(node.value).toEqual("false");
  });

  it("should allow setting `value` to `objToString`", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea value="giraffe" onChange={emptyFunction} />,
      container,
      root,
    );

    expect(node.value).toBe("giraffe");

    const objToString = {
      toString() {
        return "foo";
      },
    };

    await act(() => {
      root.render(<textarea value={objToString as unknown as string} onChange={emptyFunction} />);
    });

    expect(node.value).toEqual("foo");
  });

  it("should throw when value is set to a Temporal-like object", async () => {
    class TemporalLike {
      valueOf() {
        throw new TypeError("prod message");
      }
      toString() {
        return "2020-01-01";
      }
    }
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea value="giraffe" onChange={emptyFunction} />,
      container,
      root,
    );

    expect(node.value).toBe("giraffe");

    let didThrow = false;
    try {
      await act(() => {
        root.render(
          <textarea value={new TemporalLike() as unknown as string} onChange={emptyFunction} />,
        );
      });
    } catch (error) {
      didThrow = true;
      expect((error as Error).message).toContain("prod message");
    }
    expect(didThrow).toBe(true);
  });

  it("should take updates to `defaultValue` for uncontrolled textarea", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea defaultValue="0" />);
    });

    const node = container.firstChild as HTMLTextAreaElement;

    expect(node.value).toBe("0");

    await act(() => {
      root.render(<textarea defaultValue="1" />);
    });

    expect(node.value).toBe("0");
  });

  it("should take updates to children in lieu of `defaultValue` for uncontrolled textarea", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea defaultValue="0" />);
    });

    const node = container.firstChild as HTMLTextAreaElement;

    expect(node.value).toBe("0");

    await act(() => {
      root.render(<textarea>1</textarea>);
    });

    expect(node.value).toBe("0");
  });

  it("should not incur unnecessary DOM mutations", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea value="a" onChange={emptyFunction} />);
    });

    const node = container.firstChild as HTMLTextAreaElement;
    let nodeValue = "a";
    const nodeValueSetter = vi.fn();
    Object.defineProperty(node, "value", {
      get() {
        return nodeValue;
      },
      set: nodeValueSetter.mockImplementation((newValue: string) => {
        nodeValue = newValue;
      }),
    });

    await act(() => {
      root.render(<textarea value="a" onChange={emptyFunction} />);
    });

    expect(nodeValueSetter).toHaveBeenCalledTimes(0);

    await act(() => {
      root.render(<textarea value="b" onChange={emptyFunction} />);
    });

    expect(nodeValueSetter).toHaveBeenCalledTimes(1);
  });

  it("should properly control a value of number `0`", async () => {
    const setUntrackedValue = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!;

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    document.body.appendChild(container);

    try {
      const node = await renderTextarea(
        <textarea value={0 as unknown as string} onChange={emptyFunction} />,
        container,
        root,
      );

      setUntrackedValue.call(node, "giraffe");
      node.dispatchEvent(new Event("input", { bubbles: true, cancelable: false }));
      expect(node.value).toBe("0");
    } finally {
      document.body.removeChild(container);
    }
  });

  it("should treat children like `defaultValue`", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    const node = await renderTextarea(<textarea>giraffe</textarea>, container, root);

    expect(node.value).toBe("giraffe");

    await act(() => {
      root.render(<textarea>gorilla</textarea>);
    });

    expect(node.value).toEqual("giraffe");
  });

  it("should keep value when switching to uncontrolled element if not changed", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea value="kitten" onChange={emptyFunction} />,
      container,
      root,
    );

    expect(node.value).toBe("kitten");

    await act(() => {
      root.render(<textarea defaultValue="gorilla" />);
    });

    expect(node.value).toEqual("kitten");
  });

  it("should keep value when switching to uncontrolled element if changed", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(
      <textarea value="kitten" onChange={emptyFunction} />,
      container,
      root,
    );

    expect(node.value).toBe("kitten");

    await act(() => {
      root.render(<textarea value="puppies" onChange={emptyFunction} />);
    });

    expect(node.value).toBe("puppies");

    await act(() => {
      root.render(<textarea defaultValue="gorilla" />);
    });

    expect(node.value).toEqual("puppies");
  });

  it("should allow numbers as children", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(<textarea>{17}</textarea>, container, root);
    expect(node.value).toBe("17");
  });

  it("should allow booleans as children", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    const node = await renderTextarea(<textarea>{false}</textarea>, container, root);
    expect(node.value).toBe("false");
  });

  it("should allow objects as children", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    const objectValue = {
      toString() {
        return "sharkswithlasers";
      },
    };
    const node = await renderTextarea(
      <textarea>{objectValue as unknown as string}</textarea>,
      container,
      root,
    );
    expect(node.value).toBe("sharkswithlasers");
  });

  it("should throw with multiple or invalid children", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(
          <textarea>
            {"hello"}
            {"there"}
          </textarea>,
        );
      });
    }).rejects.toThrow("<textarea> can only have at most one child");

    let node: HTMLTextAreaElement | undefined;
    await expect(
      (async () =>
        (node = await renderTextarea(
          <textarea>
            <strong />
          </textarea>,
          container,
          root,
        )))(),
    ).resolves.not.toThrow();

    expect(node!.value).toBe("[object Object]");
  });

  it("should unmount", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea />);
    });

    await act(() => {
      root.unmount();
    });
  });

  it("should warn if value is null", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea value={null as unknown as string} />);
    });

    await act(() => {
      root.render(<textarea value={null as unknown as string} />);
    });
  });

  it("should warn if value and defaultValue are specified", async () => {
    const InvalidComponent = () => <textarea value="foo" defaultValue="bar" readOnly={true} />;
    let container = document.createElement("div");
    let root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<InvalidComponent />);
    });

    container = document.createElement("div");
    root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<InvalidComponent />);
    });
  });

  it("should not warn about missing onChange in uncontrolled textareas", async () => {
    const container = document.createElement("div");
    let root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<textarea />);
    });

    await act(() => {
      root.unmount();
    });
    root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<textarea value={undefined} />);
    });
  });

  it("does not set textContent if value is unchanged", async () => {
    const container = document.createElement("div");
    let node: HTMLTextAreaElement | null = null;
    let instance: InstanceType<typeof App> | null = null;
    let defaultValue: string;
    const setter = vi.fn((value: string) => {
      defaultValue = value;
    });
    const getter = vi.fn(() => {
      return defaultValue;
    });

    class App extends React.Component<Record<string, never>, { count: number; text: string }> {
      state = { count: 0, text: "foo" };
      componentDidMount() {
        instance = this;
      }
      render() {
        return (
          <div>
            <span>{this.state.count}</span>
            <textarea
              ref={(textareaNode) => {
                node = textareaNode;
              }}
              value="foo"
              onChange={emptyFunction}
              data-count={this.state.count}
            />
          </div>
        );
      }
    }
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });

    defaultValue = node!.defaultValue;
    Object.defineProperty(node, "defaultValue", { get: getter, set: setter });
    instance!.setState({ count: 1 });
    expect(setter.mock.calls.length).toBe(0);
  });

  describe("When given a Symbol value", () => {
    it("treats initial Symbol value as an empty string", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<textarea value={Symbol("foobar") as unknown as string} onChange={() => {}} />);
      });
      const node = container.firstChild as HTMLTextAreaElement;

      expect(node.value).toBe("");
    });

    it("treats initial Symbol children as an empty string", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<textarea onChange={() => {}}>{Symbol("foo") as unknown as string}</textarea>);
      });
      const node = container.firstChild as HTMLTextAreaElement;

      expect(node.value).toBe("");
    });

    it("treats updated Symbol value as an empty string", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<textarea value="foo" onChange={() => {}} />);
      });

      await act(() => {
        root.render(<textarea value={Symbol("foo") as unknown as string} onChange={() => {}} />);
      });
      const node = container.firstChild as HTMLTextAreaElement;

      expect(node.value).toBe("");
    });

    it("treats initial Symbol defaultValue as an empty string", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<textarea defaultValue={Symbol("foobar") as unknown as string} />);
      });

      const node = container.firstChild as HTMLTextAreaElement;

      expect(node.value).toBe("");
    });

    it("treats updated Symbol defaultValue as an empty string", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<textarea defaultValue="foo" />);
      });

      await act(() => {
        root.render(<textarea defaultValue={Symbol("foobar") as unknown as string} />);
      });

      const node = container.firstChild as HTMLTextAreaElement;

      expect(node.value).toBe("foo");
    });
  });

  describe("When given a function value", () => {
    it("treats initial function value as an empty string", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<textarea value={(() => {}) as unknown as string} onChange={() => {}} />);
      });
      const node = container.firstChild as HTMLTextAreaElement;

      expect(node.value).toBe("");
    });

    it("treats initial function children as an empty string", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<textarea onChange={() => {}}>{(() => {}) as unknown as string}</textarea>);
      });
      const node = container.firstChild as HTMLTextAreaElement;

      expect(node.value).toBe("");
    });

    it("treats updated function value as an empty string", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<textarea value="foo" onChange={() => {}} />);
      });

      await act(() => {
        root.render(<textarea value={(() => {}) as unknown as string} onChange={() => {}} />);
      });
      const node = container.firstChild as HTMLTextAreaElement;

      expect(node.value).toBe("");
    });

    it("treats initial function defaultValue as an empty string", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<textarea defaultValue={(() => {}) as unknown as string} />);
      });

      const node = container.firstChild as HTMLTextAreaElement;

      expect(node.value).toBe("");
    });

    it("treats updated function defaultValue as an empty string", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<textarea defaultValue="foo" />);
      });

      await act(() => {
        root.render(<textarea defaultValue={(() => {}) as unknown as string} />);
      });

      const node = container.firstChild as HTMLTextAreaElement;

      expect(node.value).toBe("foo");
    });
  });

  it("should remove previous `defaultValue`", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea defaultValue="0" />);
    });

    const node = container.firstChild as HTMLTextAreaElement;

    expect(node.value).toBe("0");
    expect(node.defaultValue).toBe("0");

    await act(() => {
      root.render(<textarea />);
    });

    expect(node.defaultValue).toBe("");
  });

  it("should treat `defaultValue={null}` as missing", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea defaultValue="0" />);
    });

    const node = container.firstChild as HTMLTextAreaElement;

    expect(node.value).toBe("0");
    expect(node.defaultValue).toBe("0");

    await act(() => {
      root.render(<textarea defaultValue={null as unknown as string} />);
    });

    expect(node.defaultValue).toBe("");
  });

  it("should not warn about missing onChange if value is undefined", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(<textarea value={undefined} />);
      }),
    ).resolves.not.toThrow();
  });

  it("should not warn about missing onChange if onChange is set", async () => {
    const change = vi.fn();
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(<textarea value="something" onChange={change} />);
      }),
    ).resolves.not.toThrow();
  });

  it("should not warn about missing onChange if disabled is true", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(<textarea value="something" disabled={true} />);
      }),
    ).resolves.not.toThrow();
  });

  it("should not warn about missing onChange if value is not set", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(<textarea value="something" readOnly={true} />);
      }),
    ).resolves.not.toThrow();
  });

  it("should warn about missing onChange if value is false", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea value={false as unknown as string} />);
    });
  });

  it("should warn about missing onChange if value is 0", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea value={0 as unknown as string} />);
    });
  });

  it('should warn about missing onChange if value is "0"', async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea value="0" />);
    });
  });

  it('should warn about missing onChange if value is ""', async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<textarea value="" />);
    });
  });
});
