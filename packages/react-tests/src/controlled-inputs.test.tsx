// @vitest-environment jsdom
import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "./utils";

const CHECKED_DIRTY_SYMBOL = Symbol("checkedDirty");
const originalCheckedDescriptor = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  "checked",
)!;
const originalCheckedSetter = originalCheckedDescriptor.set!;
const originalCheckedGetter = originalCheckedDescriptor.get!;

const originalDefaultCheckedDescriptor = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  "defaultChecked",
)!;
const originalDefaultCheckedSetter = originalDefaultCheckedDescriptor.set!;
const originalDefaultCheckedGetter = originalDefaultCheckedDescriptor.get!;

Object.defineProperty(HTMLInputElement.prototype, "checked", {
  ...originalCheckedDescriptor,
  get() {
    return originalCheckedGetter.call(this);
  },
  set(value: boolean) {
    (this as any)[CHECKED_DIRTY_SYMBOL] = true;
    originalCheckedSetter.call(this, value);
  },
});

Object.defineProperty(HTMLInputElement.prototype, "defaultChecked", {
  ...originalDefaultCheckedDescriptor,
  get() {
    return originalDefaultCheckedGetter.call(this);
  },
  set(value: boolean) {
    originalDefaultCheckedSetter.call(this, value);
    if (!(this as any)[CHECKED_DIRTY_SYMBOL]) {
      originalCheckedSetter.call(this, value);
    }
  },
});

const originalCloneNode = HTMLInputElement.prototype.cloneNode;
HTMLInputElement.prototype.cloneNode = function (deep?: boolean) {
  const clone = originalCloneNode.call(this, deep) as HTMLInputElement;
  if ((this as any)[CHECKED_DIRTY_SYMBOL]) {
    (clone as any)[CHECKED_DIRTY_SYMBOL] = true;
  }
  return clone;
};

const emptyFunction = () => {};

describe("ReactDOMInput", () => {
  let setUntrackedValue: ((value: string) => void) | undefined;
  let setUntrackedChecked: ((value: boolean) => void) | undefined;
  let container: HTMLDivElement;
  let root: ReturnType<typeof ReactDOMClient.createRoot>;

  const dispatchEventOnNode = (node: Node, type: string) => {
    node.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
  };

  const isValueDirty = (node: HTMLInputElement) => {
    const copy = node.cloneNode() as HTMLInputElement;
    copy.type = "text";
    copy.defaultValue += Math.random();
    return copy.value === node.value;
  };

  const isCheckedDirty = (node: HTMLInputElement) => {
    if (node.checked !== node.defaultChecked) {
      return true;
    }
    const copy = node.cloneNode() as HTMLInputElement;
    copy.type = "checkbox";
    copy.defaultChecked = !copy.defaultChecked;
    return copy.checked === node.checked;
  };

  beforeEach(() => {
    setUntrackedValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set;
    setUntrackedChecked = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "checked",
    )!.set;

    container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOMClient.createRoot(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  it("should render controlled value of 0", async () => {
    await act(() => {
      root.render(<input type="text" value={0} onChange={emptyFunction} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.value).toBe("0");
  });

  it("should render controlled value of empty string", async () => {
    await act(() => {
      root.render(<input type="text" value="" onChange={emptyFunction} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.value).toBe("");
  });

  it("should render controlled checkbox with checked false", async () => {
    await act(() => {
      root.render(<input type="checkbox" checked={false} onChange={emptyFunction} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.checked).toBe(false);
  });

  it("should not warn about missing onChange in uncontrolled inputs", async () => {
    await act(() => {
      root.render(<input />);
    });
    root.unmount();
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<input value={undefined} />);
    });
    root.unmount();
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<input type="text" />);
    });
    root.unmount();
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<input type="text" value={undefined} />);
    });
    root.unmount();
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<input type="checkbox" />);
    });
    root.unmount();
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<input type="checkbox" checked={undefined} />);
    });
  });

  it("should not warn with value and onInput handler", async () => {
    await act(() => {
      root.render(<input value="..." onInput={() => {}} />);
    });
  });

  it("should properly control a value even if no event listener exists", async () => {
    await act(() => {
      root.render(<input type="text" value="lion" readOnly />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(isValueDirty(node)).toBe(true);

    setUntrackedValue!.call(node, "giraffe");

    await act(() => {
      dispatchEventOnNode(node, "input");
    });

    expect(node.value).toBe("lion");
    expect(isValueDirty(node)).toBe(true);
  });

  it("should control a value in reentrant events", async () => {
    class ControlledInputs extends React.Component<object, { value: string }> {
      state = { value: "lion" };
      a: HTMLInputElement | null = null;
      b: HTMLInputElement | null = null;
      switchedFocus = false;
      change(newValue: string) {
        this.setState({ value: newValue });
        dispatchEventOnNode(this.a!, "input");
        this.b!.focus();
      }
      blur(currentValue: string) {
        this.switchedFocus = true;
        this.setState({ value: currentValue });
      }
      render() {
        return (
          <div>
            <input
              type="text"
              ref={(n) => {
                this.a = n;
              }}
              value={this.state.value}
              onChange={(e) => this.change(e.target.value)}
              onBlur={(e) => this.blur(e.target.value)}
            />
            <input
              type="text"
              ref={(n) => {
                this.b = n;
              }}
            />
          </div>
        );
      }
    }

    const ref = React.createRef<ControlledInputs>();
    await act(() => {
      root.render(<ControlledInputs ref={ref} />);
    });
    const instance = ref.current!;

    await act(() => {
      instance.a!.focus();
    });
    setUntrackedValue!.call(instance.a, "giraffe");
    await act(() => {
      dispatchEventOnNode(instance.a!, "input");
    });
    await act(() => {
      dispatchEventOnNode(instance.a!, "blur");
    });
    await act(() => {
      dispatchEventOnNode(instance.a!, "focusout");
    });

    expect(instance.a!.value).toBe("giraffe");
    expect(instance.switchedFocus).toBe(true);
  });

  it("should control values in reentrant events with different targets", async () => {
    class ControlledInputs extends React.Component {
      state = { value: "lion" };
      a: HTMLInputElement | null = null;
      b: HTMLInputElement | null = null;
      change(_newValue: string) {
        this.b!.click();
      }
      render() {
        return (
          <div>
            <input
              type="text"
              ref={(n) => {
                this.a = n;
              }}
              value="lion"
              onChange={(e) => this.change(e.target.value)}
            />
            <input
              type="checkbox"
              ref={(n) => {
                this.b = n;
              }}
              checked={true}
              onChange={() => {}}
            />
          </div>
        );
      }
    }

    const ref = React.createRef<ControlledInputs>();
    await act(() => {
      root.render(<ControlledInputs ref={ref} />);
    });
    const instance = ref.current!;

    setUntrackedValue!.call(instance.a, "giraffe");
    await act(() => {
      dispatchEventOnNode(instance.a!, "input");
    });

    expect(instance.a!.value).toBe("lion");
    expect(instance.b!.checked).toBe(true);
  });

  describe("switching text inputs between numeric and string numbers", () => {
    it('does change the number 2 to "2.0" with no change handler', async () => {
      await act(() => {
        root.render(<input type="text" value={2} onChange={vi.fn()} />);
      });
      const node = container.firstChild as HTMLInputElement;

      setUntrackedValue!.call(node, "2.0");
      dispatchEventOnNode(node, "input");

      expect(node.value).toBe("2");
      expect(node.getAttribute("value")).toBe("2");
    });

    it('does change the string "2" to "2.0" with no change handler', async () => {
      await act(() => {
        root.render(<input type="text" value={"2"} onChange={vi.fn()} />);
      });
      const node = container.firstChild as HTMLInputElement;

      setUntrackedValue!.call(node, "2.0");
      dispatchEventOnNode(node, "input");

      expect(node.value).toBe("2");
      expect(node.getAttribute("value")).toBe("2");
    });

    it('changes the number 2 to "2.0" using a change handler', async () => {
      class Stub extends React.Component<object, { value: number | string }> {
        state = { value: 2 as number | string };
        onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
          this.setState({ value: event.target.value });
        };
        render() {
          const { value } = this.state;
          return <input type="text" value={value} onChange={this.onChange} />;
        }
      }

      await act(() => {
        root.render(<Stub />);
      });
      const node = container.firstChild as HTMLInputElement;

      setUntrackedValue!.call(node, "2.0");
      dispatchEventOnNode(node, "input");

      expect(node.value).toBe("2.0");
      expect(node.getAttribute("value")).toBe("2.0");
    });
  });

  it('does change the string ".98" to "0.98" with no change handler', async () => {
    class Stub extends React.Component<object, { value: string }> {
      state = { value: ".98" };
      render() {
        return <input type="number" value={this.state.value} readOnly />;
      }
    }

    const ref = React.createRef<Stub>();
    await act(() => {
      root.render(<Stub ref={ref} />);
    });
    const node = container.firstChild as HTMLInputElement;
    await act(() => {
      ref.current!.setState({ value: "0.98" });
    });

    expect(node.value).toEqual("0.98");
  });

  it('performs a state change from "" to 0', async () => {
    class Stub extends React.Component<object, { value: string | number }> {
      state = { value: "" as string | number };
      render() {
        return <input type="number" value={this.state.value} readOnly={true} />;
      }
    }

    const ref = React.createRef<Stub>();
    await act(() => {
      root.render(<Stub ref={ref} />);
    });
    const node = container.firstChild as HTMLInputElement;
    await act(() => {
      ref.current!.setState({ value: 0 });
    });

    expect(node.value).toEqual("0");
  });

  it('updates the value on radio buttons from "" to 0', async () => {
    await act(() => {
      root.render(<input type="radio" value="" onChange={emptyFunction} />);
    });
    await act(() => {
      root.render(<input type="radio" value={0} onChange={emptyFunction} />);
    });
    expect((container.firstChild as HTMLInputElement).value).toBe("0");
    expect((container.firstChild as HTMLInputElement).getAttribute("value")).toBe("0");
  });

  it('updates the value on checkboxes from "" to 0', async () => {
    await act(() => {
      root.render(<input type="checkbox" value="" onChange={emptyFunction} />);
    });
    await act(() => {
      root.render(<input type="checkbox" value={0} onChange={emptyFunction} />);
    });
    expect((container.firstChild as HTMLInputElement).value).toBe("0");
    expect((container.firstChild as HTMLInputElement).getAttribute("value")).toBe("0");
  });

  it("distinguishes precision for extra zeroes in string number values", async () => {
    class Stub extends React.Component<object, { value: string }> {
      state = { value: "3.0000" };
      render() {
        return <input type="number" value={this.state.value} readOnly />;
      }
    }

    const ref = React.createRef<Stub>();
    await act(() => {
      root.render(<Stub ref={ref} />);
    });
    const node = container.firstChild as HTMLInputElement;
    await act(() => {
      ref.current!.setState({ value: "3" });
    });

    expect(node.value).toEqual("3");
  });

  it("should display `defaultValue` of number 0", async () => {
    await act(() => {
      root.render(<input type="text" defaultValue={0} />);
    });
    const node = container.firstChild as HTMLInputElement;

    expect(node.getAttribute("value")).toBe("0");
    expect(node.value).toBe("0");
  });

  it("only assigns defaultValue if it changes", async () => {
    class Test extends React.Component {
      render() {
        return <input defaultValue="0" />;
      }
    }

    const ref = React.createRef<Test>();
    await act(() => {
      root.render(<Test ref={ref} />);
    });
    const node = container.firstChild as HTMLInputElement;

    Object.defineProperty(node, "defaultValue", {
      get() {
        return "0";
      },
      set(_value: string) {
        throw new Error(`defaultValue was assigned ${_value}, but it did not change!`);
      },
    });

    await act(() => {
      ref.current!.forceUpdate();
    });
  });

  it('should display "true" for `defaultValue` of `true`', async () => {
    await act(() => {
      root.render(<input type="text" defaultValue={true as unknown as string} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.value).toBe("true");
  });

  it('should display "false" for `defaultValue` of `false`', async () => {
    await act(() => {
      root.render(<input type="text" defaultValue={false as unknown as string} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.value).toBe("false");
  });

  it("should update `defaultValue` for uncontrolled input", async () => {
    await act(() => {
      root.render(<input type="text" defaultValue="0" />);
    });
    const node = container.firstChild as HTMLInputElement;

    expect(node.value).toBe("0");
    expect(node.defaultValue).toBe("0");
    expect(isValueDirty(node)).toBe(true);

    await act(() => {
      root.render(<input type="text" defaultValue="1" />);
    });

    expect(node.value).toBe("0");
    expect(node.defaultValue).toBe("1");
    expect(isValueDirty(node)).toBe(true);
  });

  it("should update `defaultValue` for uncontrolled date/time input", async () => {
    await act(() => {
      root.render(<input type="date" defaultValue="1980-01-01" />);
    });
    const node = container.firstChild as HTMLInputElement;

    expect(node.value).toBe("1980-01-01");
    expect(node.defaultValue).toBe("1980-01-01");

    await act(() => {
      root.render(<input type="date" defaultValue="2000-01-01" />);
    });

    expect(node.value).toBe("1980-01-01");
    expect(node.defaultValue).toBe("2000-01-01");

    await act(() => {
      root.render(<input type="date" />);
    });
  });

  it("should take `defaultValue` when changing to uncontrolled input", async () => {
    await act(() => {
      root.render(<input type="text" value="0" readOnly={true} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.value).toBe("0");
    expect(isValueDirty(node)).toBe(true);
    await act(() => {
      root.render(<input type="text" defaultValue="1" />);
    });
    expect(node.value).toBe("0");
    expect(isValueDirty(node)).toBe(true);
  });

  it("should render defaultValue for SSR", () => {
    const markup = renderToString(<input type="text" defaultValue="1" />);
    const div = document.createElement("div");
    div.innerHTML = markup;
    const input = div.firstChild as HTMLInputElement;
    expect(input.getAttribute("value")).toBe("1");
    expect(input.getAttribute("defaultValue")).toBe(null);
  });

  it("should render bigint defaultValue for SSR", () => {
    const markup = renderToString(<input type="text" defaultValue={5n as unknown as string} />);
    const div = document.createElement("div");
    div.innerHTML = markup;
    const input = div.firstChild as HTMLInputElement;
    expect(input.getAttribute("value")).toBe("5");
    expect(input.getAttribute("defaultValue")).toBe(null);
  });

  it("should render value for SSR", () => {
    const element = <input type="text" value="1" onChange={() => {}} />;
    const markup = renderToString(element);
    const div = document.createElement("div");
    div.innerHTML = markup;
    const input = div.firstChild as HTMLInputElement;
    expect(input.getAttribute("value")).toBe("1");
    expect(input.getAttribute("defaultValue")).toBe(null);
  });

  it("should render bigint value for SSR", () => {
    const element = <input type="text" value={5n as unknown as string} onChange={() => {}} />;
    const markup = renderToString(element);
    const div = document.createElement("div");
    div.innerHTML = markup;
    const input = div.firstChild as HTMLInputElement;
    expect(input.getAttribute("value")).toBe("5");
    expect(input.getAttribute("defaultValue")).toBe(null);
  });

  it("should render name attribute if it is supplied", async () => {
    await act(() => {
      root.render(<input type="text" name="name" />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.name).toBe("name");
    expect(node.getAttribute("name")).toBe("name");
  });

  it("should render name attribute if it is supplied for SSR", () => {
    const markup = renderToString(<input type="text" name="name" />);
    const div = document.createElement("div");
    div.innerHTML = markup;
    expect((div.firstChild as HTMLInputElement).getAttribute("name")).toBe("name");
  });

  it("should not render name attribute if it is not supplied", async () => {
    await act(() => {
      root.render(<input type="text" />);
    });
    expect((container.firstChild as HTMLInputElement).getAttribute("name")).toBe(null);
  });

  it("should not render name attribute if it is not supplied for SSR", () => {
    const markup = renderToString(<input type="text" />);
    const div = document.createElement("div");
    div.innerHTML = markup;
    expect((div.firstChild as HTMLInputElement).getAttribute("name")).toBe(null);
  });

  it("should display 'foobar' for `defaultValue` of `objToString`", async () => {
    const objToString = {
      toString: function () {
        return "foobar";
      },
    };

    await act(() => {
      root.render(<input type="text" defaultValue={objToString as unknown as string} />);
    });
    const node = container.firstChild as HTMLInputElement;

    expect(node.value).toBe("foobar");
  });

  it("should throw for date inputs if `defaultValue` is an object where valueOf() throws", async () => {
    class TemporalLike {
      valueOf() {
        throw new TypeError("prod message");
      }
      toString() {
        return "2020-01-01";
      }
    }
    await expect(async () => {
      await act(() => {
        root.render(<input defaultValue={new TemporalLike() as unknown as string} type="date" />);
      });
    }).rejects.toThrowError(new TypeError("prod message"));
  });

  it("should throw for text inputs if `defaultValue` is an object where valueOf() throws", async () => {
    class TemporalLike {
      valueOf() {
        throw new TypeError("prod message");
      }
      toString() {
        return "2020-01-01";
      }
    }
    await expect(async () => {
      await act(() => {
        root.render(<input defaultValue={new TemporalLike() as unknown as string} type="text" />);
      });
    }).rejects.toThrowError(new TypeError("prod message"));
  });

  it("should throw for date inputs if `value` is an object where valueOf() throws", async () => {
    class TemporalLike {
      valueOf() {
        throw new TypeError("prod message");
      }
      toString() {
        return "2020-01-01";
      }
    }
    await expect(async () => {
      await act(() => {
        root.render(
          <input value={new TemporalLike() as unknown as string} type="date" onChange={() => {}} />,
        );
      });
    }).rejects.toThrowError(new TypeError("prod message"));
  });

  it("should throw for text inputs if `value` is an object where valueOf() throws", async () => {
    class TemporalLike {
      valueOf() {
        throw new TypeError("prod message");
      }
      toString() {
        return "2020-01-01";
      }
    }
    await expect(async () => {
      await act(() => {
        root.render(
          <input value={new TemporalLike() as unknown as string} type="text" onChange={() => {}} />,
        );
      });
    }).rejects.toThrowError(new TypeError("prod message"));
  });

  it("should display `value` of number 0", async () => {
    await act(() => {
      root.render(<input type="text" value={0} onChange={emptyFunction} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.value).toBe("0");
  });

  it("should display `value` of bigint 5", async () => {
    await act(() => {
      root.render(<input type="text" value={5n as unknown as string} onChange={emptyFunction} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.value).toBe("5");
  });

  it("should allow setting `value` to `true`", async () => {
    await act(() => {
      root.render(<input type="text" value="yolo" onChange={emptyFunction} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.value).toBe("yolo");

    await act(() => {
      root.render(<input type="text" value={true as unknown as string} onChange={emptyFunction} />);
    });
    expect(node.value).toEqual("true");
  });

  it("should allow setting `value` to `false`", async () => {
    await act(() => {
      root.render(<input type="text" value="yolo" onChange={emptyFunction} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.value).toBe("yolo");

    await act(() => {
      root.render(
        <input type="text" value={false as unknown as string} onChange={emptyFunction} />,
      );
    });
    expect(node.value).toEqual("false");
  });

  it("should allow setting `value` to `objToString`", async () => {
    await act(() => {
      root.render(<input type="text" value="foo" onChange={emptyFunction} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.value).toBe("foo");

    const objToString = {
      toString: function () {
        return "foobar";
      },
    };
    await act(() => {
      root.render(
        <input type="text" value={objToString as unknown as string} onChange={emptyFunction} />,
      );
    });
    expect(node.value).toEqual("foobar");
  });

  it("should not incur unnecessary DOM mutations", async () => {
    await act(() => {
      root.render(<input value="a" onChange={() => {}} />);
    });

    const node = container.firstChild as HTMLInputElement;
    let nodeValue = "a";
    const nodeValueSetter = vi.fn();
    Object.defineProperty(node, "value", {
      get: function () {
        return nodeValue;
      },
      set: nodeValueSetter.mockImplementation(function (newValue: string) {
        nodeValue = newValue;
      }),
    });

    await act(() => {
      root.render(<input value="a" onChange={() => {}} />);
    });
    expect(nodeValueSetter).toHaveBeenCalledTimes(0);

    await act(() => {
      root.render(<input value="b" onChange={() => {}} />);
    });
    expect(nodeValueSetter).toHaveBeenCalledTimes(1);
  });

  it("should not incur unnecessary DOM mutations for numeric type conversion", async () => {
    await act(() => {
      root.render(<input value="0" onChange={() => {}} />);
    });

    const node = container.firstChild as HTMLInputElement;
    let nodeValue = "0";
    const nodeValueSetter = vi.fn();
    Object.defineProperty(node, "value", {
      get: function () {
        return nodeValue;
      },
      set: nodeValueSetter.mockImplementation(function (newValue: string) {
        nodeValue = newValue;
      }),
    });

    await act(() => {
      root.render(<input value={0} onChange={() => {}} />);
    });
    expect(nodeValueSetter).toHaveBeenCalledTimes(0);
  });

  it("should not incur unnecessary DOM mutations for the boolean type conversion", async () => {
    await act(() => {
      root.render(<input value="true" onChange={() => {}} />);
    });

    const node = container.firstChild as HTMLInputElement;
    let nodeValue = "true";
    const nodeValueSetter = vi.fn();
    Object.defineProperty(node, "value", {
      get: function () {
        return nodeValue;
      },
      set: nodeValueSetter.mockImplementation(function (newValue: string) {
        nodeValue = newValue;
      }),
    });

    await act(() => {
      root.render(<input value={true as unknown as string} onChange={() => {}} />);
    });
    expect(nodeValueSetter).toHaveBeenCalledTimes(0);
  });

  it("should properly control a value of number `0`", async () => {
    await act(() => {
      root.render(<input type="text" value={0} onChange={emptyFunction} />);
    });
    const node = container.firstChild as HTMLInputElement;

    setUntrackedValue!.call(node, "giraffe");
    dispatchEventOnNode(node, "input");
    expect(node.value).toBe("0");
  });

  it("should properly control 0.0 for a text input", async () => {
    await act(() => {
      root.render(<input type="text" value={0} onChange={emptyFunction} />);
    });
    const node = container.firstChild as HTMLInputElement;

    setUntrackedValue!.call(node, "0.0");
    await act(() => {
      dispatchEventOnNode(node, "input");
    });
    expect(node.value).toBe("0");
  });

  it("should properly control 0.0 for a number input", async () => {
    await act(() => {
      root.render(<input type="number" value={0} onChange={emptyFunction} />);
    });
    const node = container.firstChild as HTMLInputElement;

    setUntrackedValue!.call(node, "0.0");
    await act(() => {
      dispatchEventOnNode(node, "input");
    });

    dispatchEventOnNode(node, "blur");
    dispatchEventOnNode(node, "focusout");

    expect(node.value).toBe("0.0");
    expect(node.getAttribute("value")).toBe("0.0");
  });

  it("should properly transition from an empty value to 0", async () => {
    await act(() => {
      root.render(<input type="text" value="" onChange={emptyFunction} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(isValueDirty(node)).toBe(false);

    await act(() => {
      root.render(<input type="text" value={0} onChange={emptyFunction} />);
    });

    expect(node.value).toBe("0");
    expect(isValueDirty(node)).toBe(true);
    expect(node.defaultValue).toBe("0");
  });

  it("should properly transition from 0 to an empty value", async () => {
    await act(() => {
      root.render(<input type="text" value={0} onChange={emptyFunction} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(isValueDirty(node)).toBe(true);

    await act(() => {
      root.render(<input type="text" value="" onChange={emptyFunction} />);
    });

    expect(node.value).toBe("");
    expect(node.defaultValue).toBe("");
    expect(isValueDirty(node)).toBe(true);
  });

  it("should properly transition a text input from 0 to an empty 0.0", async () => {
    await act(() => {
      root.render(<input type="text" value={0} onChange={emptyFunction} />);
    });
    await act(() => {
      root.render(<input type="text" value="0.0" onChange={emptyFunction} />);
    });

    const node = container.firstChild as HTMLInputElement;

    expect(node.value).toBe("0.0");
    expect(node.defaultValue).toBe("0.0");
  });

  it('should properly transition a number input from "" to 0', async () => {
    await act(() => {
      root.render(<input type="number" value="" onChange={emptyFunction} />);
    });
    await act(() => {
      root.render(<input type="number" value={0} onChange={emptyFunction} />);
    });

    const node = container.firstChild as HTMLInputElement;

    expect(node.value).toBe("0");
    expect(node.defaultValue).toBe("0");
  });

  it('should properly transition a number input from "" to "0"', async () => {
    await act(() => {
      root.render(<input type="number" value="" onChange={emptyFunction} />);
    });
    await act(() => {
      root.render(<input type="number" value="0" onChange={emptyFunction} />);
    });

    const node = container.firstChild as HTMLInputElement;

    expect(node.value).toBe("0");
    expect(node.defaultValue).toBe("0");
  });

  it("should have the correct target value", async () => {
    let handled = false;
    const handler = function (event: React.ChangeEvent<HTMLInputElement>) {
      expect(event.target.nodeName).toBe("INPUT");
      handled = true;
    };
    await act(() => {
      root.render(<input type="text" value={0} onChange={handler} />);
    });
    const node = container.firstChild as HTMLInputElement;

    setUntrackedValue!.call(node, "giraffe");

    await act(() => {
      dispatchEventOnNode(node, "input");
    });

    expect(handled).toBe(true);
  });

  it("should restore uncontrolled inputs to last defaultValue upon reset", async () => {
    const inputRef = React.createRef<HTMLInputElement>();
    await act(() => {
      root.render(
        <form>
          <input defaultValue="default1" ref={inputRef} />
          <input type="reset" />
        </form>,
      );
    });
    expect(inputRef.current!.value).toBe("default1");
    expect(isValueDirty(inputRef.current!)).toBe(true);

    setUntrackedValue!.call(inputRef.current, "changed");
    dispatchEventOnNode(inputRef.current!, "input");
    expect(inputRef.current!.value).toBe("changed");
    expect(isValueDirty(inputRef.current!)).toBe(true);

    await act(() => {
      root.render(
        <form>
          <input defaultValue="default2" ref={inputRef} />
          <input type="reset" />
        </form>,
      );
    });
    expect(inputRef.current!.value).toBe("changed");
    expect(isValueDirty(inputRef.current!)).toBe(true);

    (container.firstChild as HTMLFormElement).reset();
    expect(inputRef.current!.value).toBe("default2");
    expect(isValueDirty(inputRef.current!)).toBe(false);
  });

  it("should not set a value for submit buttons unnecessarily", async () => {
    await act(() => {
      root.render(<input type="submit" />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.hasAttribute("value")).toBe(false);
  });

  it("should remove the value attribute on submit inputs when value is updated to undefined", async () => {
    await act(() => {
      root.render(<input type="submit" value="foo" onChange={emptyFunction} />);
    });

    await act(() => {
      root.render(<input type="submit" value={undefined} onChange={emptyFunction} />);
    });

    const node = container.firstChild as HTMLInputElement;
    expect(node.getAttribute("value")).toBe(null);
  });

  it("should remove the value attribute on reset inputs when value is updated to undefined", async () => {
    await act(() => {
      root.render(<input type="reset" value="foo" onChange={emptyFunction} />);
    });

    await act(() => {
      root.render(<input type="reset" value={undefined} onChange={emptyFunction} />);
    });

    const node = container.firstChild as HTMLInputElement;
    expect(node.getAttribute("value")).toBe(null);
  });

  it("should set a value on a submit input", async () => {
    await act(() => {
      root.render(<input type="submit" value="banana" />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.getAttribute("value")).toBe("banana");
  });

  it("should not set an undefined value on a submit input", async () => {
    await act(() => {
      root.render(<input type="submit" value={undefined} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.getAttribute("value")).toBe(null);

    await act(() => {
      root.render(<input type="submit" value={undefined} />);
    });
    expect(node.getAttribute("value")).toBe(null);
  });

  it("should not set an undefined value on a reset input", async () => {
    await act(() => {
      root.render(<input type="reset" value={undefined} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.getAttribute("value")).toBe(null);

    await act(() => {
      root.render(<input type="reset" value={undefined} />);
    });
    expect(node.getAttribute("value")).toBe(null);
  });

  it("should not set a null value on a submit input", async () => {
    await act(() => {
      root.render(<input type="submit" value={null as unknown as string} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.getAttribute("value")).toBe(null);

    await act(() => {
      root.render(<input type="submit" value={null as unknown as string} />);
    });
    expect(node.getAttribute("value")).toBe(null);
  });

  it("should not set a null value on a reset input", async () => {
    await act(() => {
      root.render(<input type="reset" value={null as unknown as string} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.getAttribute("value")).toBe(null);

    await act(() => {
      root.render(<input type="reset" value={null as unknown as string} />);
    });
    expect(node.getAttribute("value")).toBe(null);
  });

  it("should set a value on a reset input", async () => {
    await act(() => {
      root.render(<input type="reset" value="banana" />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.getAttribute("value")).toBe("banana");
  });

  it("should set an empty string value on a submit input", async () => {
    await act(() => {
      root.render(<input type="submit" value="" />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.getAttribute("value")).toBe("");
  });

  it("should set an empty string value on a reset input", async () => {
    await act(() => {
      root.render(<input type="reset" value="" />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.getAttribute("value")).toBe("");
  });

  it("should control radio buttons", async () => {
    class RadioGroup extends React.Component {
      aRef = React.createRef<HTMLInputElement>();
      bRef = React.createRef<HTMLInputElement>();
      cRef = React.createRef<HTMLInputElement>();

      render() {
        return (
          <div>
            <input
              ref={this.aRef}
              type="radio"
              name="fruit"
              checked={true}
              onChange={emptyFunction}
              data-which="a"
            />
            A
            <input
              ref={this.bRef}
              type="radio"
              name="fruit"
              onChange={emptyFunction}
              data-which="b"
            />
            B
            <form>
              <input
                ref={this.cRef}
                type="radio"
                name="fruit"
                defaultChecked={true}
                onChange={emptyFunction}
                data-which="c"
              />
            </form>
          </div>
        );
      }
    }

    const ref = React.createRef<RadioGroup>();
    await act(() => {
      root.render(<RadioGroup ref={ref} />);
    });
    const stub = ref.current!;
    const aNode = stub.aRef.current!;
    const bNode = stub.bRef.current!;
    const cNode = stub.cRef.current!;

    expect(aNode.checked).toBe(true);
    expect(bNode.checked).toBe(false);
    expect(cNode.checked).toBe(true);

    expect(aNode.hasAttribute("checked")).toBe(true);
    expect(bNode.hasAttribute("checked")).toBe(false);
    expect(cNode.hasAttribute("checked")).toBe(true);

    expect(isCheckedDirty(aNode)).toBe(true);
    expect(isCheckedDirty(bNode)).toBe(true);
    expect(isCheckedDirty(cNode)).toBe(true);

    setUntrackedChecked!.call(bNode, true);
    expect(aNode.checked).toBe(false);
    expect(cNode.checked).toBe(true);

    expect(aNode.hasAttribute("checked")).toBe(true);
    expect(bNode.hasAttribute("checked")).toBe(false);
    expect(cNode.hasAttribute("checked")).toBe(true);

    await act(() => {
      dispatchEventOnNode(bNode, "click");
    });

    expect(aNode.checked).toBe(true);
    expect(cNode.checked).toBe(true);

    expect(isCheckedDirty(aNode)).toBe(true);
    expect(isCheckedDirty(bNode)).toBe(true);
    expect(isCheckedDirty(cNode)).toBe(true);
  });

  it("should check the correct radio when the selected name moves", async () => {
    class App extends React.Component<object, { updated: boolean }> {
      state = { updated: false };
      onClick = () => {
        this.setState({ updated: !this.state.updated });
      };
      render() {
        const { updated } = this.state;
        const radioName = updated ? "secondName" : "firstName";
        return (
          <div>
            <button type="button" onClick={this.onClick} />
            <input
              type="radio"
              name={radioName}
              onChange={emptyFunction}
              checked={updated === true}
            />
            <input
              type="radio"
              name={radioName}
              onChange={emptyFunction}
              checked={updated === false}
            />
          </div>
        );
      }
    }

    await act(() => {
      root.render(<App />);
    });
    const node = container.firstChild as HTMLDivElement;
    const buttonNode = node.childNodes[0] as HTMLButtonElement;
    const firstRadioNode = node.childNodes[1] as HTMLInputElement;
    expect(isCheckedDirty(firstRadioNode)).toBe(true);
    expect(firstRadioNode.checked).toBe(false);
    await act(() => {
      dispatchEventOnNode(buttonNode, "click");
    });
    expect(firstRadioNode.checked).toBe(true);
    await act(() => {
      dispatchEventOnNode(buttonNode, "click");
    });
    expect(firstRadioNode.checked).toBe(false);
  });

  it("shouldn't get tricked by changing radio names, part 2", async () => {
    await act(() => {
      root.render(
        <div>
          <input type="radio" name="a" value="1" checked={true} onChange={() => {}} />
          <input type="radio" name="a" value="2" checked={false} onChange={() => {}} />
        </div>,
      );
    });
    const one = container.querySelector('input[name="a"][value="1"]') as HTMLInputElement;
    const two = container.querySelector('input[name="a"][value="2"]') as HTMLInputElement;
    expect(one.checked).toBe(true);
    expect(two.checked).toBe(false);
    expect(isCheckedDirty(one)).toBe(true);
    expect(isCheckedDirty(two)).toBe(true);

    await act(() => {
      root.render(
        <div>
          <input type="radio" name="a" value="1" checked={true} onChange={() => {}} />
          <input type="radio" name="b" value="2" checked={true} onChange={() => {}} />
        </div>,
      );
    });
    expect(one.checked).toBe(true);
    expect(two.checked).toBe(true);
    expect(isCheckedDirty(one)).toBe(true);
    expect(isCheckedDirty(two)).toBe(true);
  });

  it("should control radio buttons if the tree updates during render (case 2; #26876)", async () => {
    let thunk: (() => void) | null = null;
    function App() {
      const [disabled, setDisabled] = React.useState(false);
      const [value, setValue] = React.useState("one");
      function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setDisabled(true);
        thunk = () => {
          setDisabled(false);
          setValue(e.target.value);
        };
      }
      return (
        <>
          <input
            type="radio"
            name="fruit"
            value="one"
            checked={value === "one"}
            onChange={handleChange}
            disabled={disabled}
          />
          <input
            type="radio"
            name="fruit"
            value="two"
            checked={value === "two"}
            onChange={handleChange}
            disabled={disabled}
          />
        </>
      );
    }
    await act(() => {
      root.render(<App />);
    });
    const [one, two] = container.querySelectorAll("input");
    expect(one.checked).toBe(true);
    expect(two.checked).toBe(false);
    expect(isCheckedDirty(one)).toBe(true);
    expect(isCheckedDirty(two)).toBe(true);

    setUntrackedChecked!.call(two, true);
    await act(() => {
      dispatchEventOnNode(two, "click");
    });
    expect(one.checked).toBe(true);
    expect(two.checked).toBe(false);
    expect(isCheckedDirty(one)).toBe(true);
    expect(isCheckedDirty(two)).toBe(true);

    await act(thunk!);
    expect(one.checked).toBe(false);
    expect(two.checked).toBe(true);
    expect(isCheckedDirty(one)).toBe(true);
    expect(isCheckedDirty(two)).toBe(true);

    setUntrackedChecked!.call(one, true);
    await act(() => {
      dispatchEventOnNode(one, "click");
    });
    expect(one.checked).toBe(false);
    expect(two.checked).toBe(true);
    expect(isCheckedDirty(one)).toBe(true);
    expect(isCheckedDirty(two)).toBe(true);

    await act(thunk!);
    expect(one.checked).toBe(true);
    expect(two.checked).toBe(false);
    expect(isCheckedDirty(one)).toBe(true);
    expect(isCheckedDirty(two)).toBe(true);
  });

  it("should warn with value and no onChange handler with readOnly specified", async () => {
    await act(() => {
      root.render(<input type="text" value="zoink" readOnly={true} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.value).toBe("zoink");
  });

  it("should have a this value of undefined if bind is not used", async () => {
    expect.assertions(1);
    const unboundInputOnChange = function (this: unknown) {
      expect(this).toBe(undefined);
    };

    await act(() => {
      root.render(<input type="text" onChange={unboundInputOnChange} />);
    });
    const node = container.firstChild as HTMLInputElement;

    setUntrackedValue!.call(node, "giraffe");
    await act(() => {
      dispatchEventOnNode(node, "input");
    });
  });

  it("should update defaultValue to empty string", async () => {
    await act(() => {
      root.render(<input type="text" defaultValue={"foo"} />);
    });
    expect(isValueDirty(container.firstChild as HTMLInputElement)).toBe(true);
    await act(() => {
      root.render(<input type="text" defaultValue={""} />);
    });
    expect((container.firstChild as HTMLInputElement).defaultValue).toBe("");
    expect(isValueDirty(container.firstChild as HTMLInputElement)).toBe(true);
  });

  it("should warn if value is null", async () => {
    await act(() => {
      root.render(<input type="text" value={null as unknown as string} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.value).toBe("");
  });

  it("should warn if checked and defaultChecked props are specified", async () => {
    await act(() => {
      root.render(<input type="radio" checked={true} defaultChecked={true} readOnly={true} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.checked).toBe(true);
  });

  it("should warn if value and defaultValue props are specified", async () => {
    await act(() => {
      root.render(<input type="text" value="foo" defaultValue="bar" readOnly={true} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.value).toBe("foo");
  });

  it("should warn if controlled input switches to uncontrolled (value is undefined)", async () => {
    await act(() => {
      root.render(<input type="text" value="controlled" onChange={emptyFunction} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.value).toBe("controlled");
    await act(() => {
      root.render(<input type="text" />);
    });
    expect(node.value).toBe("controlled");
  });

  it("should warn if controlled input switches to uncontrolled (value is null)", async () => {
    await act(() => {
      root.render(<input type="text" value="controlled" onChange={emptyFunction} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.value).toBe("controlled");
    await act(() => {
      root.render(<input type="text" value={null as unknown as string} />);
    });
    expect(node.value).toBe("controlled");
  });

  it("should warn if controlled input switches to uncontrolled with defaultValue", async () => {
    await act(() => {
      root.render(<input type="text" value="controlled" onChange={emptyFunction} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.value).toBe("controlled");
    await act(() => {
      root.render(<input type="text" defaultValue="uncontrolled" />);
    });
    expect(node.value).toBe("controlled");
  });

  it("should warn if uncontrolled input (value is undefined) switches to controlled", async () => {
    await act(() => {
      root.render(<input type="text" />);
    });
    const node = container.firstChild as HTMLInputElement;
    await act(() => {
      root.render(<input type="text" value="controlled" readOnly />);
    });
    expect(node.value).toBe("controlled");
  });

  it("should warn if uncontrolled input (value is null) switches to controlled", async () => {
    await act(() => {
      root.render(<input type="text" value={null as unknown as string} />);
    });
    const node = container.firstChild as HTMLInputElement;
    await act(() => {
      root.render(<input type="text" value="controlled" readOnly />);
    });
    expect(node.value).toBe("controlled");
  });

  it("should warn if controlled checkbox switches to uncontrolled (checked is undefined)", async () => {
    await act(() => {
      root.render(<input type="checkbox" checked={true} onChange={emptyFunction} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.checked).toBe(true);
    await act(() => {
      root.render(<input type="checkbox" />);
    });
    expect(node.checked).toBe(true);
  });

  it("should warn if controlled checkbox switches to uncontrolled (checked is null)", async () => {
    await act(() => {
      root.render(<input type="checkbox" checked={true} onChange={emptyFunction} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.checked).toBe(true);
    await act(() => {
      root.render(<input type="checkbox" checked={null as unknown as boolean} />);
    });
    expect(node.checked).toBe(true);
  });

  it("should warn if controlled checkbox switches to uncontrolled with defaultChecked", async () => {
    await act(() => {
      root.render(<input type="checkbox" checked={true} onChange={emptyFunction} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.checked).toBe(true);
    await act(() => {
      root.render(<input type="checkbox" defaultChecked={true} />);
    });
    expect(node.checked).toBe(true);
  });

  it("should warn if uncontrolled checkbox (checked is undefined) switches to controlled", async () => {
    await act(() => {
      root.render(<input type="checkbox" />);
    });
    const node = container.firstChild as HTMLInputElement;
    await act(() => {
      root.render(<input type="checkbox" checked={true} readOnly />);
    });
    expect(node.checked).toBe(true);
  });

  it("should warn if uncontrolled checkbox (checked is null) switches to controlled", async () => {
    await act(() => {
      root.render(<input type="checkbox" checked={null as unknown as boolean} />);
    });
    const node = container.firstChild as HTMLInputElement;
    await act(() => {
      root.render(<input type="checkbox" checked={true} readOnly />);
    });
    expect(node.checked).toBe(true);
  });

  it("should warn if controlled radio switches to uncontrolled (checked is undefined)", async () => {
    await act(() => {
      root.render(<input type="radio" checked={true} onChange={emptyFunction} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.checked).toBe(true);
    await act(() => {
      root.render(<input type="radio" />);
    });
    expect(node.checked).toBe(true);
  });

  it("should warn if controlled radio switches to uncontrolled (checked is null)", async () => {
    await act(() => {
      root.render(<input type="radio" checked={true} onChange={emptyFunction} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.checked).toBe(true);
    await act(() => {
      root.render(<input type="radio" checked={null as unknown as boolean} />);
    });
    expect(node.checked).toBe(true);
  });

  it("should warn if controlled radio switches to uncontrolled with defaultChecked", async () => {
    await act(() => {
      root.render(<input type="radio" checked={true} onChange={emptyFunction} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.checked).toBe(true);
    await act(() => {
      root.render(<input type="radio" defaultChecked={true} />);
    });
    expect(node.checked).toBe(true);
  });

  it("should warn if uncontrolled radio (checked is undefined) switches to controlled", async () => {
    await act(() => {
      root.render(<input type="radio" />);
    });
    const node = container.firstChild as HTMLInputElement;
    await act(() => {
      root.render(<input type="radio" checked={true} readOnly />);
    });
    expect(node.checked).toBe(true);
  });

  it("should warn if uncontrolled radio (checked is null) switches to controlled", async () => {
    await act(() => {
      root.render(<input type="radio" checked={null as unknown as boolean} />);
    });
    const node = container.firstChild as HTMLInputElement;
    await act(() => {
      root.render(<input type="radio" checked={true} readOnly />);
    });
    expect(node.checked).toBe(true);
  });

  it("should not warn if radio value changes but never becomes controlled", async () => {
    await act(() => {
      root.render(<input type="radio" value="value" />);
    });
    await act(() => {
      root.render(<input type="radio" />);
    });
    await act(() => {
      root.render(<input type="radio" value="value" defaultChecked={true} />);
    });
    await act(() => {
      root.render(<input type="radio" value="value" onChange={() => null} />);
    });
    await act(() => {
      root.render(<input type="radio" />);
    });
  });

  it("should not warn if radio value changes but never becomes uncontrolled", async () => {
    await act(() => {
      root.render(<input type="radio" checked={false} onChange={() => null} />);
    });
    const input = container.querySelector("input") as HTMLInputElement;
    expect(isCheckedDirty(input)).toBe(true);
    await act(() => {
      root.render(
        <input
          type="radio"
          value="value"
          defaultChecked={true}
          checked={false}
          onChange={() => null}
        />,
      );
    });
    expect(isCheckedDirty(input)).toBe(true);
  });

  it("should warn if radio checked false changes to become uncontrolled", async () => {
    await act(() => {
      root.render(<input type="radio" value="value" checked={false} onChange={() => null} />);
    });
    const node = container.firstChild as HTMLInputElement;
    expect(node.checked).toBe(false);
    await act(() => {
      root.render(<input type="radio" value="value" />);
    });
  });

  it("sets value properly with type coming later in props", async () => {
    await act(() => {
      root.render(<input value="hi" type="radio" readOnly />);
    });
    expect((container.firstChild as HTMLInputElement).value).toBe("hi");
  });

  it("does not raise a validation warning when it switches types", async () => {
    class Input extends React.Component<object, { type: string; value: string | number }> {
      state = { type: "number", value: 1000 as string | number };

      render() {
        const { value, type } = this.state;
        return <input onChange={() => {}} type={type} value={value} />;
      }
    }

    const ref = React.createRef<Input>();
    await act(() => {
      root.render(<Input ref={ref} />);
    });
    const node = container.firstChild as HTMLInputElement;

    await act(() => {
      ref.current!.setState({ type: "text", value: "Test" });
    });
    expect(node.value).toEqual("Test");
  });

  describe("assigning the value attribute on controlled inputs", function () {
    const getTestInput = () => {
      return class extends React.Component<
        { type?: string; value?: string | null },
        { value: string }
      > {
        state = {
          value: this.props.value == null ? "" : this.props.value,
        };
        onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
          this.setState({ value: event.target.value });
        };
        render() {
          const type = this.props.type;
          const value = this.state.value;
          return <input type={type} value={value} onChange={this.onChange} />;
        }
      };
    };

    it("always sets the attribute when values change on text inputs", async () => {
      const Input = getTestInput();
      await act(() => {
        root.render(<Input type="text" />);
      });
      const node = container.firstChild as HTMLInputElement;
      expect(isValueDirty(node)).toBe(false);

      setUntrackedValue!.call(node, "2");
      await act(() => {
        dispatchEventOnNode(node, "input");
      });

      expect(isValueDirty(node)).toBe(true);
      expect(node.getAttribute("value")).toBe("2");
    });

    it("does not set the value attribute on number inputs if focused", async () => {
      const Input = getTestInput();
      await act(() => {
        root.render(<Input type="number" value="1" />);
      });
      const node = container.firstChild as HTMLInputElement;
      expect(isValueDirty(node)).toBe(true);

      node.focus();

      setUntrackedValue!.call(node, "2");
      dispatchEventOnNode(node, "input");

      expect(isValueDirty(node)).toBe(true);
      expect(node.getAttribute("value")).toBe("1");
    });

    it("sets the value attribute on number inputs on blur", async () => {
      const Input = getTestInput();
      await act(() => {
        root.render(<Input type="number" value="1" />);
      });
      const node = container.firstChild as HTMLInputElement;
      expect(isValueDirty(node)).toBe(true);

      node.focus();
      setUntrackedValue!.call(node, "2");
      dispatchEventOnNode(node, "input");
      node.blur();

      expect(isValueDirty(node)).toBe(true);
      expect(node.value).toBe("2");
      expect(node.getAttribute("value")).toBe("2");
    });

    it("an uncontrolled number input will not update the value attribute on blur", async () => {
      await act(() => {
        root.render(<input type="number" defaultValue="1" />);
      });
      const node = container.firstChild as HTMLInputElement;
      expect(isValueDirty(node)).toBe(true);

      node.focus();
      setUntrackedValue!.call(node, "4");
      dispatchEventOnNode(node, "input");
      node.blur();

      expect(isValueDirty(node)).toBe(true);
      expect(node.getAttribute("value")).toBe("1");
    });

    it("an uncontrolled text input will not update the value attribute on blur", async () => {
      await act(() => {
        root.render(<input type="text" defaultValue="1" />);
      });
      const node = container.firstChild as HTMLInputElement;
      expect(isValueDirty(node)).toBe(true);

      node.focus();
      setUntrackedValue!.call(node, "4");
      dispatchEventOnNode(node, "input");
      node.blur();

      expect(isValueDirty(node)).toBe(true);
      expect(node.getAttribute("value")).toBe("1");
    });
  });

  describe("setting a controlled input to undefined", () => {
    let input: HTMLInputElement;

    const renderInputWithStringThenWithUndefined = async () => {
      let setValueToUndefined: () => void;
      class Input extends React.Component<object, { value: string | undefined }> {
        constructor(props: object) {
          super(props);
          setValueToUndefined = () => this.setState({ value: undefined });
        }
        state = { value: "first" as string | undefined };
        render() {
          return (
            <input
              onChange={(e) => this.setState({ value: e.target.value })}
              value={this.state.value}
            />
          );
        }
      }

      await act(() => {
        root.render(<Input />);
      });
      input = container.firstChild as HTMLInputElement;
      setUntrackedValue!.call(input, "latest");
      dispatchEventOnNode(input, "input");
      await act(() => {
        setValueToUndefined!();
      });
    };

    it("reverts the value attribute to the initial value", async () => {
      await renderInputWithStringThenWithUndefined();
      expect(input.getAttribute("value")).toBe("latest");
    });

    it("preserves the value property", async () => {
      await renderInputWithStringThenWithUndefined();
      expect(input.value).toBe("latest");
    });
  });

  describe("setting a controlled input to null", () => {
    let input: HTMLInputElement;

    const renderInputWithStringThenWithNull = async () => {
      let setValueToNull: () => void;
      class Input extends React.Component<object, { value: string | null }> {
        constructor(props: object) {
          super(props);
          setValueToNull = () => this.setState({ value: null });
        }
        state = { value: "first" as string | null };
        render() {
          return (
            <input
              onChange={(e) => this.setState({ value: e.target.value })}
              value={this.state.value as string}
            />
          );
        }
      }

      await act(() => {
        root.render(<Input />);
      });
      input = container.firstChild as HTMLInputElement;
      setUntrackedValue!.call(input, "latest");
      dispatchEventOnNode(input, "input");
      await act(() => {
        setValueToNull!();
      });
    };

    it("reverts the value attribute to the initial value", async () => {
      await renderInputWithStringThenWithNull();
      expect(input.getAttribute("value")).toBe("latest");
    });

    it("preserves the value property", async () => {
      await renderInputWithStringThenWithNull();
      expect(input.value).toBe("latest");
    });
  });

  describe("When given a Symbol value", function () {
    it("treats initial Symbol value as an empty string", async () => {
      await act(() => {
        root.render(<input value={Symbol("foobar") as unknown as string} onChange={() => {}} />);
      });
      const node = container.firstChild as HTMLInputElement;
      expect(node.value).toBe("");
    });

    it("treats updated Symbol value as an empty string", async () => {
      await act(() => {
        root.render(<input value="foo" onChange={() => {}} />);
      });
      await act(() => {
        root.render(<input value={Symbol("foobar") as unknown as string} onChange={() => {}} />);
      });
      const node = container.firstChild as HTMLInputElement;
      expect(node.value).toBe("");
    });

    it("treats initial Symbol defaultValue as an empty string", async () => {
      await act(() => {
        root.render(<input defaultValue={Symbol("foobar") as unknown as string} />);
      });
      const node = container.firstChild as HTMLInputElement;
      expect(node.value).toBe("");
      expect(node.getAttribute("value")).toBe("");
    });

    it("treats updated Symbol defaultValue as an empty string", async () => {
      await act(() => {
        root.render(<input defaultValue="foo" />);
      });
      await act(() => {
        root.render(<input defaultValue={Symbol("foobar") as unknown as string} />);
      });
      const node = container.firstChild as HTMLInputElement;
      expect(node.value).toBe("foo");
      expect(node.getAttribute("value")).toBe("");
    });
  });

  describe("When given a function value", function () {
    it("treats initial function value as an empty string", async () => {
      await act(() => {
        root.render(<input value={(() => {}) as unknown as string} onChange={() => {}} />);
      });
      const node = container.firstChild as HTMLInputElement;
      expect(node.value).toBe("");
    });

    it("treats updated function value as an empty string", async () => {
      await act(() => {
        root.render(<input value="foo" onChange={() => {}} />);
      });
      await act(() => {
        root.render(<input value={(() => {}) as unknown as string} onChange={() => {}} />);
      });
      const node = container.firstChild as HTMLInputElement;
      expect(node.value).toBe("");
    });

    it("treats initial function defaultValue as an empty string", async () => {
      await act(() => {
        root.render(<input defaultValue={(() => {}) as unknown as string} />);
      });
      const node = container.firstChild as HTMLInputElement;
      expect(node.value).toBe("");
      expect(node.getAttribute("value")).toBe("");
    });

    it("treats updated function defaultValue as an empty string", async () => {
      await act(() => {
        root.render(<input defaultValue="foo" />);
      });
      await act(() => {
        root.render(<input defaultValue={(() => {}) as unknown as string} />);
      });
      const node = container.firstChild as HTMLInputElement;
      expect(node.value).toBe("foo");
      expect(node.getAttribute("value")).toBe("");
    });
  });

  describe("checked inputs without a value property", function () {
    it('does not add "on" in absence of value on a checkbox', async () => {
      await act(() => {
        root.render(<input type="checkbox" defaultChecked={true} />);
      });
      const node = container.firstChild as HTMLInputElement;

      expect(node.value).toBe("on");
      expect(node.hasAttribute("value")).toBe(false);
    });

    it('does not add "on" in absence of value on a radio', async () => {
      await act(() => {
        root.render(<input type="radio" defaultChecked={true} />);
      });
      const node = container.firstChild as HTMLInputElement;

      expect(node.value).toBe("on");
      expect(node.hasAttribute("value")).toBe(false);
    });
  });

  it("should remove previous `defaultValue`", async () => {
    await act(() => {
      root.render(<input type="text" defaultValue="0" />);
    });
    const node = container.firstChild as HTMLInputElement;

    expect(node.value).toBe("0");
    expect(node.defaultValue).toBe("0");

    await act(() => {
      root.render(<input type="text" />);
    });
    expect(node.defaultValue).toBe("");
  });

  it("should treat `defaultValue={null}` as missing", async () => {
    await act(() => {
      root.render(<input type="text" defaultValue="0" />);
    });
    const node = container.firstChild as HTMLInputElement;

    expect(node.value).toBe("0");
    expect(node.defaultValue).toBe("0");

    await act(() => {
      root.render(<input type="text" defaultValue={null as unknown as string} />);
    });
    expect(node.defaultValue).toBe("");
  });

  it("should notice input changes when reverting back to original value", async () => {
    const log: string[] = [];
    function onChange(e: React.ChangeEvent<HTMLInputElement>) {
      log.push(e.target.value);
    }
    await act(() => {
      root.render(<input type="text" value="" onChange={onChange} />);
    });
    await act(() => {
      root.render(<input type="text" value="a" onChange={onChange} />);
    });

    const node = container.firstChild as HTMLInputElement;
    setUntrackedValue!.call(node, "");
    dispatchEventOnNode(node, "input");

    expect(log).toEqual([""]);
    expect(node.value).toBe("a");
  });
});
