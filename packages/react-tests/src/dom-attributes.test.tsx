import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect, vi, afterEach } from "vitest";
import { act } from "./utils";

const originalSetAttribute = Element.prototype.setAttribute;
Element.prototype.setAttribute = function (name: string, value: unknown) {
  return originalSetAttribute.call(this, name, "" + value);
};

const setUntrackedValue = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  "value",
)!.set!;

const setUntrackedChecked = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  "checked",
)!.set!;

afterEach(() => {
  document.body.innerHTML = "";
});

describe("DOMPropertyOperations", () => {
  describe("setValueForProperty", () => {
    it("should set values as properties by default", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div title="Tip!" />);
      });
      expect((container.firstChild as HTMLElement).title).toBe("Tip!");
    });

    it("should set values as attributes if necessary", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div role="#" />);
      });
      expect((container.firstChild as HTMLElement).getAttribute("role")).toBe("#");
    });

    it("should set values as namespace attributes if necessary", async () => {
      const container = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<image xlinkHref="about:blank" />);
      });
      expect(
        (container.firstChild as Element).getAttributeNS("http://www.w3.org/1999/xlink", "href"),
      ).toBe("about:blank");
    });

    it("should set values as boolean properties", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("div", { disabled: "disabled" }));
      });
      expect((container.firstChild as HTMLElement).getAttribute("disabled")).toBe("");
      await act(() => {
        root.render(React.createElement("div", { disabled: true }));
      });
      expect((container.firstChild as HTMLElement).getAttribute("disabled")).toBe("");
      await act(() => {
        root.render(React.createElement("div", { disabled: false }));
      });
      expect((container.firstChild as HTMLElement).getAttribute("disabled")).toBe(null);
      await act(() => {
        root.render(React.createElement("div", { disabled: true }));
      });
      await act(() => {
        root.render(React.createElement("div", { disabled: null }));
      });
      expect((container.firstChild as HTMLElement).getAttribute("disabled")).toBe(null);
      await act(() => {
        root.render(React.createElement("div", { disabled: true }));
      });
      await act(() => {
        root.render(React.createElement("div", { disabled: undefined }));
      });
      expect((container.firstChild as HTMLElement).getAttribute("disabled")).toBe(null);
    });

    it("should convert attribute values to string first", async () => {
      const objectWithToString = {
        toString() {
          return "css-class";
        },
      };

      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("div", { className: objectWithToString }));
      });
      expect((container.firstChild as HTMLElement).getAttribute("class")).toBe("css-class");
    });

    it("should not remove empty attributes for special input properties", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<input value="" onChange={() => {}} />);
      });
      expect((container.firstChild as HTMLInputElement).getAttribute("value")).toBe("");
      expect((container.firstChild as HTMLInputElement).value).toBe("");
    });

    it("should not remove empty attributes for special option properties", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <select>
            <option value="">empty</option>
            <option>filled</option>
          </select>,
        );
      });
      expect(
        (container.firstChild as HTMLSelectElement).firstChild as HTMLOptionElement,
      ).toHaveProperty("value", "");
      expect(
        (container.firstChild as HTMLSelectElement).lastChild as HTMLOptionElement,
      ).toHaveProperty("value", "filled");
    });

    it("should remove for falsey boolean properties", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("div", { allowFullScreen: false }));
      });
      expect((container.firstChild as HTMLElement).hasAttribute("allowFullScreen")).toBe(false);
    });

    it("should set credentialless boolean attribute on iframes", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("iframe", { credentialless: true }));
      });
      const iframeElement = container.firstChild as HTMLIFrameElement;
      const credentiallessValue = iframeElement.getAttribute("credentialless");
      expect(credentiallessValue === "" || credentiallessValue === null).toBe(true);
      await act(() => {
        root.render(React.createElement("iframe", { credentialless: false }));
      });
      expect((container.firstChild as HTMLIFrameElement).hasAttribute("credentialless")).toBe(
        false,
      );
    });

    it("should set credentialless attribute when passed a string", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("iframe", { credentialless: "true" }));
      });
      expect((container.firstChild as HTMLIFrameElement).hasAttribute("credentialless")).toBe(true);
    });

    it("should remove when setting custom attr to null", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div data-foo="bar" />);
      });
      expect((container.firstChild as HTMLElement).hasAttribute("data-foo")).toBe(true);
      await act(() => {
        root.render(<div data-foo={null} />);
      });
      expect((container.firstChild as HTMLElement).hasAttribute("data-foo")).toBe(false);
    });

    it("should set className to empty string instead of null", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div className="selected" />);
      });
      expect((container.firstChild as HTMLElement).className).toBe("selected");
      await act(() => {
        root.render(<div className={undefined} />);
      });
      expect((container.firstChild as HTMLElement).className).toBe("");
      expect((container.firstChild as HTMLElement).getAttribute("class")).toBe(null);
    });

    it("should remove property properly for boolean properties", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div hidden={true} />);
      });
      expect((container.firstChild as HTMLElement).hasAttribute("hidden")).toBe(true);
      await act(() => {
        root.render(<div hidden={false} />);
      });
      expect((container.firstChild as HTMLElement).hasAttribute("hidden")).toBe(false);
    });

    it("should always assign the value attribute for non-inputs", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<progress />);
      });
      vi.spyOn(container.firstChild as HTMLProgressElement, "setAttribute");
      await act(() => {
        root.render(<progress value={30} />);
      });
      await act(() => {
        root.render(<progress value="30" />);
      });
      expect((container.firstChild as HTMLProgressElement).setAttribute).toHaveBeenCalledTimes(2);
    });

    it("should return the progress to intermediate state on null value", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<progress value={30} />);
      });
      await act(() => {
        root.render(React.createElement("progress", { value: null }));
      });
      expect((container.firstChild as HTMLProgressElement).hasAttribute("value")).toBe(false);
    });

    it("custom element custom events lowercase", async () => {
      const oncustomevent = vi.fn();
      const Test = () => {
        return React.createElement("my-custom-element", {
          oncustomevent,
        });
      };
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Test />);
      });
      container.querySelector("my-custom-element")!.dispatchEvent(new Event("customevent"));
      expect(oncustomevent).toHaveBeenCalledTimes(1);
    });

    it("custom element custom events uppercase", async () => {
      const oncustomevent = vi.fn();
      const Test = () => {
        return React.createElement("my-custom-element", {
          onCustomevent: oncustomevent,
        });
      };
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Test />);
      });
      container.querySelector("my-custom-element")!.dispatchEvent(new Event("Customevent"));
      expect(oncustomevent).toHaveBeenCalledTimes(1);
    });

    it("custom element custom event with dash in name", async () => {
      const oncustomevent = vi.fn();
      const Test = () => {
        return React.createElement("my-custom-element", {
          "oncustom-event": oncustomevent,
        });
      };
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Test />);
      });
      container.querySelector("my-custom-element")!.dispatchEvent(new Event("custom-event"));
      expect(oncustomevent).toHaveBeenCalledTimes(1);
    });

    it("custom element remove event handler", async () => {
      const oncustomevent = vi.fn();
      const Test = (props: { handler: unknown }) => {
        return React.createElement("my-custom-element", {
          oncustomevent: props.handler,
        });
      };

      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Test handler={oncustomevent} />);
      });
      const customElement = container.querySelector("my-custom-element")!;
      customElement.dispatchEvent(new Event("customevent"));
      expect(oncustomevent).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(<Test handler={false} />);
      });
      expect(container.querySelector("my-custom-element")).toBe(customElement);
      customElement.dispatchEvent(new Event("customevent"));
      expect(oncustomevent).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(<Test handler={oncustomevent} />);
      });
      customElement.dispatchEvent(new Event("customevent"));
      expect(oncustomevent).toHaveBeenCalledTimes(2);

      const oncustomevent2 = vi.fn();
      await act(() => {
        root.render(<Test handler={oncustomevent2} />);
      });
      customElement.dispatchEvent(new Event("customevent"));
      expect(oncustomevent).toHaveBeenCalledTimes(2);
      expect(oncustomevent2).toHaveBeenCalledTimes(1);
    });

    it("custom elements shouldnt have non-functions for on* attributes treated as event listeners", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          React.createElement("my-custom-element", {
            onstring: "hello",
            onobj: { hello: "world" },
            onarray: ["one", "two"],
            ontrue: true,
            onfalse: false,
          }),
        );
      });
      const customElement = container.querySelector("my-custom-element")!;
      expect(customElement.getAttribute("onstring")).toBe("hello");
      expect(customElement.getAttribute("onobj")).toBe("[object Object]");
      expect(customElement.getAttribute("onarray")).toBe("one,two");
      expect(customElement.getAttribute("ontrue")).toBe("");
      expect(customElement.getAttribute("onfalse")).toBe(null);

      customElement.dispatchEvent(new Event("string"));
      customElement.dispatchEvent(new Event("obj"));
      customElement.dispatchEvent(new Event("array"));
      customElement.dispatchEvent(new Event("true"));
      customElement.dispatchEvent(new Event("false"));
    });

    it("custom elements should still have onClick treated like regular elements", async () => {
      let syntheticClickEvent: React.MouseEvent | null = null;
      const syntheticEventHandler = vi.fn(
        (event: React.MouseEvent) => (syntheticClickEvent = event),
      );
      let nativeClickEvent: Event | null = null;
      const nativeEventHandler = vi.fn((event: Event) => (nativeClickEvent = event));
      const Test = () => {
        return React.createElement("my-custom-element", {
          onClick: syntheticEventHandler,
        });
      };

      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Test />);
      });

      const customElement = container.querySelector("my-custom-element")!;
      (customElement as unknown as HTMLElement).onclick = nativeEventHandler;
      (customElement as HTMLElement).click();

      expect(nativeEventHandler).toHaveBeenCalledTimes(1);
      expect(syntheticEventHandler).toHaveBeenCalledTimes(1);
      expect(syntheticClickEvent!.nativeEvent).toBe(nativeClickEvent);
    });

    it("custom elements should have working onChange event listeners", async () => {
      let reactChangeEvent: React.ChangeEvent | null = null;
      const eventHandler = vi.fn((event: React.ChangeEvent) => (reactChangeEvent = event));
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          React.createElement("my-custom-element", {
            onChange: eventHandler,
          }),
        );
      });
      const customElement = container.querySelector("my-custom-element")!;
      let expectedHandlerCallCount = 0;

      const changeEvent = new Event("change", { bubbles: true });
      customElement.dispatchEvent(changeEvent);
      expectedHandlerCallCount++;
      expect(eventHandler).toHaveBeenCalledTimes(expectedHandlerCallCount);
      expect(reactChangeEvent!.nativeEvent).toBe(changeEvent);

      await act(() => {
        root.render(React.createElement("my-custom-element"));
      });
      customElement.dispatchEvent(new Event("change", { bubbles: true }));
      expect(eventHandler).toHaveBeenCalledTimes(expectedHandlerCallCount);
      await act(() => {
        root.render(
          React.createElement("my-custom-element", {
            onChange: eventHandler,
          }),
        );
      });
      customElement.dispatchEvent(new Event("change", { bubbles: true }));
      expectedHandlerCallCount++;
      expect(eventHandler).toHaveBeenCalledTimes(expectedHandlerCallCount);
    });

    it("custom elements should have working onInput event listeners", async () => {
      let reactInputEvent: React.FormEvent | null = null;
      const eventHandler = vi.fn((event: React.FormEvent) => (reactInputEvent = event));
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          React.createElement("my-custom-element", {
            onInput: eventHandler,
          }),
        );
      });
      const customElement = container.querySelector("my-custom-element")!;
      let expectedHandlerCallCount = 0;

      const inputEvent = new Event("input", { bubbles: true });
      customElement.dispatchEvent(inputEvent);
      expectedHandlerCallCount++;
      expect(eventHandler).toHaveBeenCalledTimes(expectedHandlerCallCount);
      expect(reactInputEvent!.nativeEvent).toBe(inputEvent);

      await act(() => {
        root.render(React.createElement("my-custom-element"));
      });
      customElement.dispatchEvent(new Event("input", { bubbles: true }));
      expect(eventHandler).toHaveBeenCalledTimes(expectedHandlerCallCount);
      await act(() => {
        root.render(
          React.createElement("my-custom-element", {
            onInput: eventHandler,
          }),
        );
      });
      customElement.dispatchEvent(new Event("input", { bubbles: true }));
      expectedHandlerCallCount++;
      expect(eventHandler).toHaveBeenCalledTimes(expectedHandlerCallCount);
    });

    it("custom elements should have separate onInput and onChange handling", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const inputEventHandler = vi.fn();
      const changeEventHandler = vi.fn();
      await act(() => {
        root.render(
          React.createElement("my-custom-element", {
            onInput: inputEventHandler,
            onChange: changeEventHandler,
          }),
        );
      });
      const customElement = container.querySelector("my-custom-element")!;

      customElement.dispatchEvent(new Event("input", { bubbles: true }));
      expect(inputEventHandler).toHaveBeenCalledTimes(1);
      expect(changeEventHandler).toHaveBeenCalledTimes(0);

      customElement.dispatchEvent(new Event("change", { bubbles: true }));
      expect(inputEventHandler).toHaveBeenCalledTimes(1);
      expect(changeEventHandler).toHaveBeenCalledTimes(1);
    });

    it("custom elements should be able to remove and re-add custom event listeners", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const eventHandler = vi.fn();
      await act(() => {
        root.render(
          React.createElement("my-custom-element", {
            oncustomevent: eventHandler,
          }),
        );
      });

      const customElement = container.querySelector("my-custom-element")!;
      customElement.dispatchEvent(new Event("customevent"));
      expect(eventHandler).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(React.createElement("my-custom-element"));
      });
      customElement.dispatchEvent(new Event("customevent"));
      expect(eventHandler).toHaveBeenCalledTimes(1);

      await act(() => {
        root.render(
          React.createElement("my-custom-element", {
            oncustomevent: eventHandler,
          }),
        );
      });
      customElement.dispatchEvent(new Event("customevent"));
      expect(eventHandler).toHaveBeenCalledTimes(2);
    });

    it("<input is=...> should have the same onChange/onInput/onClick behavior as <input>", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const regularOnInputHandler = vi.fn();
      const regularOnChangeHandler = vi.fn();
      const regularOnClickHandler = vi.fn();
      const customOnInputHandler = vi.fn();
      const customOnChangeHandler = vi.fn();
      const customOnClickHandler = vi.fn();
      const clearMocks = () => {
        regularOnInputHandler.mockClear();
        regularOnChangeHandler.mockClear();
        regularOnClickHandler.mockClear();
        customOnInputHandler.mockClear();
        customOnChangeHandler.mockClear();
        customOnClickHandler.mockClear();
      };
      await act(() => {
        root.render(
          <div>
            <input
              onInput={regularOnInputHandler}
              onChange={regularOnChangeHandler}
              onClick={regularOnClickHandler}
            />
            <input
              is="my-custom-element"
              onInput={customOnInputHandler}
              onChange={customOnChangeHandler}
              onClick={customOnClickHandler}
            />
          </div>,
        );
      });

      const regularInput = container.querySelector("input:not([is=my-custom-element])")!;
      const customInput = container.querySelector("input[is=my-custom-element]")!;
      expect(regularInput).not.toBe(customInput);

      clearMocks();
      setUntrackedValue.call(regularInput, "hello");
      regularInput.dispatchEvent(new Event("input", { bubbles: true }));
      expect(regularOnInputHandler).toHaveBeenCalledTimes(1);
      expect(regularOnChangeHandler).toHaveBeenCalledTimes(1);
      expect(regularOnClickHandler).toHaveBeenCalledTimes(0);
      setUntrackedValue.call(customInput, "hello");
      customInput.dispatchEvent(new Event("input", { bubbles: true }));
      expect(customOnInputHandler).toHaveBeenCalledTimes(1);
      expect(customOnChangeHandler).toHaveBeenCalledTimes(1);
      expect(customOnClickHandler).toHaveBeenCalledTimes(0);

      clearMocks();
      regularInput.dispatchEvent(new Event("change", { bubbles: true }));
      expect(regularOnInputHandler).toHaveBeenCalledTimes(0);
      expect(regularOnChangeHandler).toHaveBeenCalledTimes(0);
      expect(regularOnClickHandler).toHaveBeenCalledTimes(0);
      customInput.dispatchEvent(new Event("change", { bubbles: true }));
      expect(customOnInputHandler).toHaveBeenCalledTimes(0);
      expect(customOnChangeHandler).toHaveBeenCalledTimes(0);
      expect(customOnClickHandler).toHaveBeenCalledTimes(0);

      clearMocks();
      regularInput.dispatchEvent(new Event("click", { bubbles: true }));
      expect(regularOnInputHandler).toHaveBeenCalledTimes(0);
      expect(regularOnChangeHandler).toHaveBeenCalledTimes(0);
      expect(regularOnClickHandler).toHaveBeenCalledTimes(1);
      customInput.dispatchEvent(new Event("click", { bubbles: true }));
      expect(customOnInputHandler).toHaveBeenCalledTimes(0);
      expect(customOnChangeHandler).toHaveBeenCalledTimes(0);
      expect(customOnClickHandler).toHaveBeenCalledTimes(1);

      clearMocks();
      setUntrackedValue.call(regularInput, "goodbye");
      regularInput.dispatchEvent(new Event("input", { bubbles: true }));
      expect(regularOnInputHandler).toHaveBeenCalledTimes(1);
      expect(regularOnChangeHandler).toHaveBeenCalledTimes(1);
      expect(regularOnClickHandler).toHaveBeenCalledTimes(0);
      setUntrackedValue.call(customInput, "goodbye");
      customInput.dispatchEvent(new Event("input", { bubbles: true }));
      expect(customOnInputHandler).toHaveBeenCalledTimes(1);
      expect(customOnChangeHandler).toHaveBeenCalledTimes(1);
      expect(customOnClickHandler).toHaveBeenCalledTimes(0);
    });

    it("<input type=radio is=...> should have the same onChange/onInput/onClick behavior as <input type=radio>", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const regularOnInputHandler = vi.fn();
      const regularOnChangeHandler = vi.fn();
      const regularOnClickHandler = vi.fn();
      const customOnInputHandler = vi.fn();
      const customOnChangeHandler = vi.fn();
      const customOnClickHandler = vi.fn();
      const clearMocks = () => {
        regularOnInputHandler.mockClear();
        regularOnChangeHandler.mockClear();
        regularOnClickHandler.mockClear();
        customOnInputHandler.mockClear();
        customOnChangeHandler.mockClear();
        customOnClickHandler.mockClear();
      };
      await act(() => {
        root.render(
          <div>
            <input
              type="radio"
              onInput={regularOnInputHandler}
              onChange={regularOnChangeHandler}
              onClick={regularOnClickHandler}
            />
            <input
              is="my-custom-element"
              type="radio"
              onInput={customOnInputHandler}
              onChange={customOnChangeHandler}
              onClick={customOnClickHandler}
            />
          </div>,
        );
      });

      const regularInput = container.querySelector("input:not([is=my-custom-element])")!;
      const customInput = container.querySelector("input[is=my-custom-element]")!;
      expect(regularInput).not.toBe(customInput);

      clearMocks();
      setUntrackedChecked.call(regularInput, true);
      regularInput.dispatchEvent(new Event("click", { bubbles: true }));
      expect(regularOnInputHandler).toHaveBeenCalledTimes(0);
      expect(regularOnChangeHandler).toHaveBeenCalledTimes(1);
      expect(regularOnClickHandler).toHaveBeenCalledTimes(1);
      setUntrackedChecked.call(customInput, true);
      customInput.dispatchEvent(new Event("click", { bubbles: true }));
      expect(customOnInputHandler).toHaveBeenCalledTimes(0);
      expect(customOnChangeHandler).toHaveBeenCalledTimes(1);
      expect(customOnClickHandler).toHaveBeenCalledTimes(1);

      clearMocks();
      regularInput.dispatchEvent(new Event("input", { bubbles: true }));
      expect(regularOnInputHandler).toHaveBeenCalledTimes(1);
      expect(regularOnChangeHandler).toHaveBeenCalledTimes(0);
      expect(regularOnClickHandler).toHaveBeenCalledTimes(0);
      customInput.dispatchEvent(new Event("input", { bubbles: true }));
      expect(customOnInputHandler).toHaveBeenCalledTimes(1);
      expect(customOnChangeHandler).toHaveBeenCalledTimes(0);
      expect(customOnClickHandler).toHaveBeenCalledTimes(0);

      clearMocks();
      setUntrackedChecked.call(regularInput, false);
      regularInput.dispatchEvent(new Event("click", { bubbles: true }));
      expect(regularOnInputHandler).toHaveBeenCalledTimes(0);
      expect(regularOnChangeHandler).toHaveBeenCalledTimes(1);
      expect(regularOnClickHandler).toHaveBeenCalledTimes(1);
      setUntrackedChecked.call(customInput, false);
      customInput.dispatchEvent(new Event("click", { bubbles: true }));
      expect(customOnInputHandler).toHaveBeenCalledTimes(0);
      expect(customOnChangeHandler).toHaveBeenCalledTimes(1);
      expect(customOnClickHandler).toHaveBeenCalledTimes(1);
    });

    it("<select is=...> should have the same onChange/onInput/onClick behavior as <select>", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const regularOnInputHandler = vi.fn();
      const regularOnChangeHandler = vi.fn();
      const regularOnClickHandler = vi.fn();
      const customOnInputHandler = vi.fn();
      const customOnChangeHandler = vi.fn();
      const customOnClickHandler = vi.fn();
      const clearMocks = () => {
        regularOnInputHandler.mockClear();
        regularOnChangeHandler.mockClear();
        regularOnClickHandler.mockClear();
        customOnInputHandler.mockClear();
        customOnChangeHandler.mockClear();
        customOnClickHandler.mockClear();
      };
      await act(() => {
        root.render(
          <div>
            <select
              onInput={regularOnInputHandler}
              onChange={regularOnChangeHandler}
              onClick={regularOnClickHandler}
            />
            {React.createElement("select", {
              is: "my-custom-element",
              onInput: customOnInputHandler,
              onChange: customOnChangeHandler,
              onClick: customOnClickHandler,
            })}
          </div>,
        );
      });

      const regularSelect = container.querySelector("select:not([is=my-custom-element])")!;
      const customSelect = container.querySelector("select[is=my-custom-element]")!;
      expect(regularSelect).not.toBe(customSelect);

      clearMocks();
      regularSelect.dispatchEvent(new Event("click", { bubbles: true }));
      expect(regularOnInputHandler).toHaveBeenCalledTimes(0);
      expect(regularOnChangeHandler).toHaveBeenCalledTimes(0);
      expect(regularOnClickHandler).toHaveBeenCalledTimes(1);
      customSelect.dispatchEvent(new Event("click", { bubbles: true }));
      expect(customOnInputHandler).toHaveBeenCalledTimes(0);
      expect(customOnChangeHandler).toHaveBeenCalledTimes(0);
      expect(customOnClickHandler).toHaveBeenCalledTimes(1);

      clearMocks();
      regularSelect.dispatchEvent(new Event("input", { bubbles: true }));
      expect(regularOnInputHandler).toHaveBeenCalledTimes(1);
      expect(regularOnChangeHandler).toHaveBeenCalledTimes(0);
      expect(regularOnClickHandler).toHaveBeenCalledTimes(0);
      customSelect.dispatchEvent(new Event("input", { bubbles: true }));
      expect(customOnInputHandler).toHaveBeenCalledTimes(1);
      expect(customOnChangeHandler).toHaveBeenCalledTimes(0);
      expect(customOnClickHandler).toHaveBeenCalledTimes(0);

      clearMocks();
      regularSelect.dispatchEvent(new Event("change", { bubbles: true }));
      expect(regularOnInputHandler).toHaveBeenCalledTimes(0);
      expect(regularOnChangeHandler).toHaveBeenCalledTimes(1);
      expect(regularOnClickHandler).toHaveBeenCalledTimes(0);
      customSelect.dispatchEvent(new Event("change", { bubbles: true }));
      expect(customOnInputHandler).toHaveBeenCalledTimes(0);
      expect(customOnChangeHandler).toHaveBeenCalledTimes(1);
      expect(customOnClickHandler).toHaveBeenCalledTimes(0);
    });

    it("onChange/onInput/onClick on div with various types of children", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const onChangeHandler = vi.fn();
      const onInputHandler = vi.fn();
      const onClickHandler = vi.fn();
      const clearMocks = () => {
        onChangeHandler.mockClear();
        onInputHandler.mockClear();
        onClickHandler.mockClear();
      };
      await act(() => {
        root.render(
          <div onChange={onChangeHandler} onInput={onInputHandler} onClick={onClickHandler}>
            {React.createElement("my-custom-element")}
            <input />
            <input is="my-custom-element" />
          </div>,
        );
      });
      const customElement = container.querySelector("my-custom-element")!;
      const regularInput = container.querySelector('input:not([is="my-custom-element"])')!;
      const customInput = container.querySelector('input[is="my-custom-element"]')!;
      expect(regularInput).not.toBe(customInput);

      clearMocks();
      customElement.dispatchEvent(new Event("input", { bubbles: true }));
      expect(onChangeHandler).toHaveBeenCalledTimes(0);
      expect(onInputHandler).toHaveBeenCalledTimes(1);
      expect(onClickHandler).toHaveBeenCalledTimes(0);
      customElement.dispatchEvent(new Event("change", { bubbles: true }));
      expect(onChangeHandler).toHaveBeenCalledTimes(1);
      expect(onInputHandler).toHaveBeenCalledTimes(1);
      expect(onClickHandler).toHaveBeenCalledTimes(0);
      customElement.dispatchEvent(new Event("click", { bubbles: true }));
      expect(onChangeHandler).toHaveBeenCalledTimes(1);
      expect(onInputHandler).toHaveBeenCalledTimes(1);
      expect(onClickHandler).toHaveBeenCalledTimes(1);

      clearMocks();
      setUntrackedValue.call(regularInput, "hello");
      regularInput.dispatchEvent(new Event("input", { bubbles: true }));
      expect(onChangeHandler).toHaveBeenCalledTimes(1);
      expect(onInputHandler).toHaveBeenCalledTimes(1);
      expect(onClickHandler).toHaveBeenCalledTimes(0);
      regularInput.dispatchEvent(new Event("change", { bubbles: true }));
      expect(onChangeHandler).toHaveBeenCalledTimes(1);
      expect(onInputHandler).toHaveBeenCalledTimes(1);
      expect(onClickHandler).toHaveBeenCalledTimes(0);
      regularInput.dispatchEvent(new Event("click", { bubbles: true }));
      expect(onChangeHandler).toHaveBeenCalledTimes(1);
      expect(onInputHandler).toHaveBeenCalledTimes(1);
      expect(onClickHandler).toHaveBeenCalledTimes(1);

      clearMocks();
      setUntrackedValue.call(customInput, "hello");
      customInput.dispatchEvent(new Event("input", { bubbles: true }));
      expect(onChangeHandler).toHaveBeenCalledTimes(1);
      expect(onInputHandler).toHaveBeenCalledTimes(1);
      expect(onClickHandler).toHaveBeenCalledTimes(0);
      customInput.dispatchEvent(new Event("change", { bubbles: true }));
      expect(onChangeHandler).toHaveBeenCalledTimes(1);
      expect(onInputHandler).toHaveBeenCalledTimes(1);
      expect(onClickHandler).toHaveBeenCalledTimes(0);
      customInput.dispatchEvent(new Event("click", { bubbles: true }));
      expect(onChangeHandler).toHaveBeenCalledTimes(1);
      expect(onInputHandler).toHaveBeenCalledTimes(1);
      expect(onClickHandler).toHaveBeenCalledTimes(1);
    });

    it("custom element onChange/onInput/onClick with event target input child", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const onChangeHandler = vi.fn();
      const onInputHandler = vi.fn();
      const onClickHandler = vi.fn();
      await act(() => {
        root.render(
          React.createElement(
            "my-custom-element",
            {
              onChange: onChangeHandler,
              onInput: onInputHandler,
              onClick: onClickHandler,
            },
            React.createElement("input"),
          ),
        );
      });

      const input = container.querySelector("input")!;
      setUntrackedValue.call(input, "hello");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      expect(onChangeHandler).toHaveBeenCalledTimes(1);
      expect(onInputHandler).toHaveBeenCalledTimes(1);
      expect(onClickHandler).toHaveBeenCalledTimes(0);
      input.dispatchEvent(new Event("change", { bubbles: true }));
      expect(onChangeHandler).toHaveBeenCalledTimes(1);
      expect(onInputHandler).toHaveBeenCalledTimes(1);
      expect(onClickHandler).toHaveBeenCalledTimes(0);
      input.dispatchEvent(new Event("click", { bubbles: true }));
      expect(onChangeHandler).toHaveBeenCalledTimes(1);
      expect(onInputHandler).toHaveBeenCalledTimes(1);
      expect(onClickHandler).toHaveBeenCalledTimes(1);
    });

    it("custom element onChange/onInput/onClick with event target div child", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const onChangeHandler = vi.fn();
      const onInputHandler = vi.fn();
      const onClickHandler = vi.fn();
      await act(() => {
        root.render(
          React.createElement(
            "my-custom-element",
            {
              onChange: onChangeHandler,
              onInput: onInputHandler,
              onClick: onClickHandler,
            },
            React.createElement("div"),
          ),
        );
      });

      const innerDiv = container.querySelector("div")!;
      innerDiv.dispatchEvent(new Event("input", { bubbles: true }));
      expect(onChangeHandler).toHaveBeenCalledTimes(0);
      expect(onInputHandler).toHaveBeenCalledTimes(1);
      expect(onClickHandler).toHaveBeenCalledTimes(0);

      innerDiv.dispatchEvent(new Event("change", { bubbles: true }));
      expect(onChangeHandler).toHaveBeenCalledTimes(0);
      expect(onInputHandler).toHaveBeenCalledTimes(1);
      expect(onClickHandler).toHaveBeenCalledTimes(0);

      innerDiv.dispatchEvent(new Event("click", { bubbles: true }));
      expect(onChangeHandler).toHaveBeenCalledTimes(0);
      expect(onInputHandler).toHaveBeenCalledTimes(1);
      expect(onClickHandler).toHaveBeenCalledTimes(1);
    });

    it("div onChange/onInput/onClick with event target div child", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const onChangeHandler = vi.fn();
      const onInputHandler = vi.fn();
      const onClickHandler = vi.fn();
      await act(() => {
        root.render(
          <div onChange={onChangeHandler} onInput={onInputHandler} onClick={onClickHandler}>
            <div />
          </div>,
        );
      });

      const innerDiv = container.querySelector("div > div")!;
      innerDiv.dispatchEvent(new Event("input", { bubbles: true }));
      expect(onChangeHandler).toHaveBeenCalledTimes(0);
      expect(onInputHandler).toHaveBeenCalledTimes(1);
      expect(onClickHandler).toHaveBeenCalledTimes(0);

      innerDiv.dispatchEvent(new Event("change", { bubbles: true }));
      expect(onChangeHandler).toHaveBeenCalledTimes(0);
      expect(onInputHandler).toHaveBeenCalledTimes(1);
      expect(onClickHandler).toHaveBeenCalledTimes(0);

      innerDiv.dispatchEvent(new Event("click", { bubbles: true }));
      expect(onChangeHandler).toHaveBeenCalledTimes(0);
      expect(onInputHandler).toHaveBeenCalledTimes(1);
      expect(onClickHandler).toHaveBeenCalledTimes(1);
    });

    it("custom element onChange/onInput/onClick with event target custom element child", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const onChangeHandler = vi.fn();
      const onInputHandler = vi.fn();
      const onClickHandler = vi.fn();
      await act(() => {
        root.render(
          React.createElement(
            "my-custom-element",
            {
              onChange: onChangeHandler,
              onInput: onInputHandler,
              onClick: onClickHandler,
            },
            React.createElement("other-custom-element"),
          ),
        );
      });

      const customChild = container.querySelector("other-custom-element")!;
      customChild.dispatchEvent(new Event("input", { bubbles: true }));
      expect(onChangeHandler).toHaveBeenCalledTimes(0);
      expect(onInputHandler).toHaveBeenCalledTimes(1);
      expect(onClickHandler).toHaveBeenCalledTimes(0);
      customChild.dispatchEvent(new Event("change", { bubbles: true }));
      expect(onChangeHandler).toHaveBeenCalledTimes(1);
      expect(onInputHandler).toHaveBeenCalledTimes(1);
      expect(onClickHandler).toHaveBeenCalledTimes(0);
      customChild.dispatchEvent(new Event("click", { bubbles: true }));
      expect(onChangeHandler).toHaveBeenCalledTimes(1);
      expect(onInputHandler).toHaveBeenCalledTimes(1);
      expect(onClickHandler).toHaveBeenCalledTimes(1);
    });

    it("custom elements should allow custom events with capture event listeners", async () => {
      const oncustomeventCapture = vi.fn();
      const oncustomevent = vi.fn();
      const Test = () => {
        return React.createElement(
          "my-custom-element",
          {
            oncustomeventCapture,
            oncustomevent,
          },
          React.createElement("div"),
        );
      };
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Test />);
      });
      container
        .querySelector("my-custom-element > div")!
        .dispatchEvent(new Event("customevent", { bubbles: false }));
      expect(oncustomeventCapture).toHaveBeenCalledTimes(1);
      expect(oncustomevent).toHaveBeenCalledTimes(0);
    });

    it("innerHTML should not work on custom elements", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("my-custom-element", { innerHTML: "foo" }));
      });
      const customElement = container.querySelector("my-custom-element")!;
      expect(customElement.getAttribute("innerHTML")).toBe(null);
      expect(customElement.hasChildNodes()).toBe(false);

      await act(() => {
        root.render(React.createElement("my-custom-element", { innerHTML: "bar" }));
      });
      expect(customElement.getAttribute("innerHTML")).toBe(null);
      expect(customElement.hasChildNodes()).toBe(false);
    });

    it("innerText should not work on custom elements", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("my-custom-element", { innerText: "foo" }));
      });
      const customElement = container.querySelector("my-custom-element")!;
      expect(customElement.getAttribute("innerText")).toBe(null);
      expect(customElement.hasChildNodes()).toBe(false);

      await act(() => {
        root.render(React.createElement("my-custom-element", { innerText: "bar" }));
      });
      expect(customElement.getAttribute("innerText")).toBe(null);
      expect(customElement.hasChildNodes()).toBe(false);
    });

    it("textContent should not work on custom elements", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("my-custom-element", { textContent: "foo" }));
      });
      const customElement = container.querySelector("my-custom-element")!;
      expect(customElement.getAttribute("textContent")).toBe(null);
      expect(customElement.hasChildNodes()).toBe(false);

      await act(() => {
        root.render(React.createElement("my-custom-element", { textContent: "bar" }));
      });
      expect(customElement.getAttribute("textContent")).toBe(null);
      expect(customElement.hasChildNodes()).toBe(false);
    });

    it("values should not be converted to booleans when assigning into custom elements", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("my-custom-element"));
      });
      const customElement = container.querySelector("my-custom-element")! as HTMLElement &
        Record<string, unknown>;
      customElement.foo = null;

      await act(() => {
        root.render(React.createElement("my-custom-element", { foo: true }));
      });
      expect(customElement.foo).toBe(true);
      await act(() => {
        root.render(React.createElement("my-custom-element", { foo: "bar" }));
      });
      expect(customElement.foo).toBe("bar");

      await act(() => {
        root.render(React.createElement("my-custom-element", { foo: false }));
      });
      expect(customElement.foo).toBe(false);
      await act(() => {
        root.render(React.createElement("my-custom-element", { foo: "bar" }));
      });
      expect(customElement.foo).toBe("bar");

      await act(() => {
        root.render(React.createElement("my-custom-element", { foo: true }));
      });
      expect(customElement.foo).toBe(true);
      await act(() => {
        root.render(React.createElement("my-custom-element", { foo: null }));
      });
      expect(customElement.foo).toBe(null);

      await act(() => {
        root.render(React.createElement("my-custom-element", { foo: false }));
      });
      expect(customElement.foo).toBe(false);
      await act(() => {
        root.render(React.createElement("my-custom-element", { foo: null }));
      });
      expect(customElement.foo).toBe(null);
    });

    it("boolean props should not be stringified in attributes", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("my-custom-element", { foo: true }));
      });
      const customElement = container.querySelector("my-custom-element")!;

      expect(customElement.getAttribute("foo")).toBe("");

      await act(() => {
        root.render(React.createElement("my-custom-element", { foo: false }));
      });

      expect(customElement.getAttribute("foo")).toBe(null);
    });

    it("custom element custom event handlers assign multiple types", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const oncustomevent = vi.fn();

      await act(() => {
        root.render(
          React.createElement("my-custom-element", {
            oncustomevent: "foo",
          }),
        );
      });
      const customelement = container.querySelector("my-custom-element")! as HTMLElement &
        Record<string, unknown>;
      customelement.dispatchEvent(new Event("customevent"));
      expect(oncustomevent).toHaveBeenCalledTimes(0);
      expect(customelement.oncustomevent).toBe(undefined);
      expect(customelement.getAttribute("oncustomevent")).toBe("foo");

      await act(() => {
        root.render(React.createElement("my-custom-element", { oncustomevent }));
      });
      customelement.dispatchEvent(new Event("customevent"));
      expect(oncustomevent).toHaveBeenCalledTimes(1);
      expect(customelement.oncustomevent).toBe(undefined);
      expect(customelement.getAttribute("oncustomevent")).toBe(null);

      await act(() => {
        root.render(
          React.createElement("my-custom-element", {
            oncustomevent: "foo",
          }),
        );
      });
      customelement.dispatchEvent(new Event("customevent"));
      expect(oncustomevent).toHaveBeenCalledTimes(1);
      expect(customelement.oncustomevent).toBe(undefined);
      expect(customelement.getAttribute("oncustomevent")).toBe("foo");

      await act(() => {
        root.render(React.createElement("my-custom-element"));
      });
      customelement.dispatchEvent(new Event("customevent"));
      expect(oncustomevent).toHaveBeenCalledTimes(1);
      expect(customelement.oncustomevent).toBe(undefined);
      expect(customelement.getAttribute("oncustomevent")).toBe(null);

      await act(() => {
        root.render(React.createElement("my-custom-element", { oncustomevent }));
      });
      customelement.dispatchEvent(new Event("customevent"));
      expect(oncustomevent).toHaveBeenCalledTimes(2);
      expect(customelement.oncustomevent).toBe(undefined);
      expect(customelement.getAttribute("oncustomevent")).toBe(null);
    });

    it("custom element custom event handlers assign multiple types with setter", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      const oncustomevent = vi.fn();

      await act(() => {
        root.render(React.createElement("my-custom-element"));
      });
      const customelement = container.querySelector("my-custom-element")! as HTMLElement &
        Record<string, unknown>;
      Object.defineProperty(customelement, "oncustomevent", {
        set(value) {
          this._oncustomevent = value;
        },
        get() {
          return this._oncustomevent;
        },
      });
      expect(customelement.oncustomevent).toBe(undefined);

      await act(() => {
        root.render(React.createElement("my-custom-element", { oncustomevent }));
      });
      customelement.dispatchEvent(new Event("customevent"));
      expect(oncustomevent).toHaveBeenCalledTimes(1);
      expect(customelement.oncustomevent).toBe(null);
      expect(customelement.getAttribute("oncustomevent")).toBe(null);

      await act(() => {
        root.render(
          React.createElement("my-custom-element", {
            oncustomevent: "foo",
          }),
        );
      });
      customelement.dispatchEvent(new Event("customevent"));
      expect(oncustomevent).toHaveBeenCalledTimes(1);
      expect(customelement.oncustomevent).toBe("foo");
      expect(customelement.getAttribute("oncustomevent")).toBe(null);

      await act(() => {
        root.render(React.createElement("my-custom-element", { oncustomevent }));
      });
      customelement.dispatchEvent(new Event("customevent"));
      expect(oncustomevent).toHaveBeenCalledTimes(2);
      expect(customelement.oncustomevent).toBe(null);
      expect(customelement.getAttribute("oncustomevent")).toBe(null);

      await act(() => {
        root.render(React.createElement("my-custom-element"));
      });
      customelement.dispatchEvent(new Event("customevent"));
      expect(oncustomevent).toHaveBeenCalledTimes(2);
      expect(customelement.oncustomevent).toBe(undefined);
      expect(customelement.getAttribute("oncustomevent")).toBe(null);
    });

    it("assigning to a custom element property should not remove attributes", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("my-custom-element", { foo: "one" }));
      });
      const customElement = container.querySelector("my-custom-element")! as HTMLElement &
        Record<string, unknown>;
      expect(customElement.getAttribute("foo")).toBe("one");

      Object.defineProperty(customElement, "foo", {
        set(value) {
          this._foo = value;
        },
        get() {
          return this._foo;
        },
      });
      await act(() => {
        root.render(React.createElement("my-custom-element", { foo: "two" }));
      });
      expect(customElement.foo).toBe("two");
      expect(customElement.getAttribute("foo")).toBe("one");
    });

    it("custom element properties should accept functions", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("my-custom-element"));
      });
      const customElement = container.querySelector("my-custom-element")! as HTMLElement &
        Record<string, unknown>;

      Object.defineProperty(customElement, "foo", {
        set(value) {
          this._foo = value;
        },
        get() {
          return this._foo;
        },
      });
      const myFunction = () => {
        return "this is myFunction";
      };
      await act(() => {
        root.render(React.createElement("my-custom-element", { foo: myFunction }));
      });
      expect(customElement.foo).toBe(myFunction);

      await act(() => {
        root.render(React.createElement("my-custom-element"));
      });
      expect(customElement.foo).toBe(undefined);
      await act(() => {
        root.render(React.createElement("my-custom-element", { foo: myFunction }));
      });
      expect(customElement.foo).toBe(myFunction);
    });

    it("switching between null and undefined should update a property", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("my-custom-element", { foo: undefined }));
      });
      const customElement = container.querySelector("my-custom-element")! as HTMLElement &
        Record<string, unknown>;
      customElement.foo = undefined;

      await act(() => {
        root.render(React.createElement("my-custom-element", { foo: null }));
      });
      expect(customElement.foo).toBe(null);

      await act(() => {
        root.render(React.createElement("my-custom-element", { foo: undefined }));
      });
      expect(customElement.foo).toBe(undefined);
    });

    it("warns when using popoverTarget={HTMLElement}", async () => {
      const popoverTarget = document.createElement("div");
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(React.createElement("button", { key: "one", popoverTarget }, "Toggle popover"));
      });

      await act(() => {
        root.render(React.createElement("button", { key: "two", popoverTarget }, "Toggle popover"));
      });
    });
  });

  describe("deleteValueForProperty", () => {
    it("should remove attributes for normal properties", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div title="foo" />);
      });
      expect((container.firstChild as HTMLElement).getAttribute("title")).toBe("foo");
      await act(() => {
        root.render(<div />);
      });
      expect((container.firstChild as HTMLElement).getAttribute("title")).toBe(null);
    });

    it("should not remove attributes for special properties", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<input type="text" value="foo" onChange={() => {}} />);
      });
      expect((container.firstChild as HTMLInputElement).getAttribute("value")).toBe("foo");
      expect((container.firstChild as HTMLInputElement).value).toBe("foo");
      await act(() => {
        root.render(<input type="text" onChange={() => {}} />);
      });
      expect((container.firstChild as HTMLInputElement).getAttribute("value")).toBe("foo");
      expect((container.firstChild as HTMLInputElement).value).toBe("foo");
    });

    it("should not remove attributes for custom component tag", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("my-icon", { size: "5px" }));
      });
      expect((container.firstChild as Element).getAttribute("size")).toBe("5px");
    });

    it("custom elements should remove by setting undefined to restore defaults", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("my-custom-element"));
      });
      const customElement = container.querySelector("my-custom-element")! as HTMLElement &
        Record<string, unknown>;

      customElement.raw = 1;

      Object.defineProperty(customElement, "object", {
        set(value = null) {
          this._object = value;
        },
        get() {
          return this._object;
        },
      });

      Object.defineProperty(customElement, "string", {
        set(value = "") {
          this._string = value;
        },
        get() {
          return this._string;
        },
      });

      const objectValue = {};
      await act(() => {
        root.render(
          React.createElement("my-custom-element", {
            raw: 2,
            object: objectValue,
            string: "hi",
          }),
        );
      });
      expect(customElement.raw).toBe(2);
      expect(customElement.object).toBe(objectValue);
      expect(customElement.string).toBe("hi");

      await act(() => {
        root.render(React.createElement("my-custom-element"));
      });
      expect(customElement.raw).toBe(undefined);
      expect(customElement.object).toBe(null);
      expect(customElement.string).toBe("");
    });
  });
});

describe("ReactDOM unknown attribute", () => {
  const testUnknownAttributeRemoval = async (givenValue: unknown) => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(React.createElement("div", { unknown: "something" }));
    });

    expect((container.firstChild as HTMLElement).getAttribute("unknown")).toBe("something");

    await act(() => {
      root.render(React.createElement("div", { unknown: givenValue }));
    });

    expect((container.firstChild as HTMLElement).hasAttribute("unknown")).toBe(false);
  };

  const testUnknownAttributeAssignment = async (
    givenValue: unknown,
    expectedDOMValue: string | null,
  ) => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(React.createElement("div", { unknown: "something" }));
    });

    expect((container.firstChild as HTMLElement).getAttribute("unknown")).toBe("something");

    await act(() => {
      root.render(React.createElement("div", { unknown: givenValue }));
    });

    if (expectedDOMValue === null) {
      expect((container.firstChild as HTMLElement).hasAttribute("unknown")).toBe(false);
    } else {
      expect((container.firstChild as HTMLElement).getAttribute("unknown")).toBe(expectedDOMValue);
    }
  };

  describe("unknown attributes", () => {
    it("removes values null and undefined", async () => {
      await testUnknownAttributeRemoval(null);
      await testUnknownAttributeRemoval(undefined);
    });

    it("changes values true, false to null", async () => {
      await testUnknownAttributeAssignment(true, null);
      await testUnknownAttributeAssignment(false, null);
    });

    it("removes unknown attributes that were rendered but are now missing", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(React.createElement("div", { unknown: "something" }));
      });

      expect((container.firstChild as HTMLElement).getAttribute("unknown")).toBe("something");

      await act(() => {
        root.render(React.createElement("div"));
      });

      expect((container.firstChild as HTMLElement).hasAttribute("unknown")).toBe(false);
    });

    it("removes new boolean props", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<div inert={true} />);
      });

      expect((container.firstChild as HTMLElement).getAttribute("inert")).toBe("");
    });

    it("warns once for empty strings in new boolean props", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(React.createElement("div", { inert: "" }));
      });

      await act(() => {
        root.render(React.createElement("div", { inert: "" }));
      });
    });

    it("passes through strings", async () => {
      await testUnknownAttributeAssignment("a string", "a string");
    });

    it("coerces numbers to strings", async () => {
      await testUnknownAttributeAssignment(0, "0");
      await testUnknownAttributeAssignment(-1, "-1");
      await testUnknownAttributeAssignment(42, "42");
      await testUnknownAttributeAssignment(9000.99, "9000.99");
    });

    it("coerces NaN to strings", async () => {
      await testUnknownAttributeAssignment(NaN, "NaN");
    });

    it("coerces objects to strings", async () => {
      const lol = {
        toString() {
          return "lol";
        },
      };

      await testUnknownAttributeAssignment({ hello: "world" }, "[object Object]");
      await testUnknownAttributeAssignment(lol, "lol");
    });

    it("throws with Temporal-like objects", async () => {
      class TemporalLike {
        valueOf() {
          throw new TypeError("prod message");
        }
        toString() {
          return "2020-01-01";
        }
      }
      const testFn = () => testUnknownAttributeAssignment(new TemporalLike(), null);

      await expect(testFn).rejects.toThrowError(new TypeError("prod message"));
    });

    it("removes symbols", async () => {
      await testUnknownAttributeRemoval(Symbol("foo"));
    });

    it("removes functions", async () => {
      await testUnknownAttributeRemoval(function someFunction() {});
    });

    it("allows camelCase unknown attributes", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(React.createElement("div", { helloWorld: "something" }));
      });

      expect((container.firstChild as HTMLElement).getAttribute("helloworld")).toBe("something");
    });
  });
});
