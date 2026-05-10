import { describe, it, expect } from "vitest";
import {
  setProperty,
  setAttribute,
  setAttributeNS,
  setBoolAttribute,
  className,
  classList,
  style,
  setStyleProperty,
  spread,
  assign,
  use,
} from "../src/client.js";

describe("setProperty", () => {
  it("sets a DOM property directly", () => {
    const input = document.createElement("input");
    setProperty(input, "value", "hello");
    expect(input.value).toBe("hello");
  });

  it("sets checked property", () => {
    const input = document.createElement("input");
    input.type = "checkbox";
    setProperty(input, "checked", true);
    expect(input.checked).toBe(true);
  });
});

describe("setAttribute", () => {
  it("sets an attribute", () => {
    const el = document.createElement("div");
    setAttribute(el, "id", "test");
    expect(el.getAttribute("id")).toBe("test");
  });

  it("removes attribute when value is null", () => {
    const el = document.createElement("div");
    el.setAttribute("id", "test");
    setAttribute(el, "id", null);
    expect(el.hasAttribute("id")).toBe(false);
  });

  it("removes attribute when value is undefined", () => {
    const el = document.createElement("div");
    el.setAttribute("title", "hi");
    setAttribute(el, "title", undefined);
    expect(el.hasAttribute("title")).toBe(false);
  });
});

describe("setAttributeNS", () => {
  it("sets a namespaced attribute", () => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "use");
    setAttributeNS(el, "http://www.w3.org/1999/xlink", "xlink:href", "#icon");
    expect(el.getAttributeNS("http://www.w3.org/1999/xlink", "href")).toBe("#icon");
  });

  it("removes namespaced attribute when null", () => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "use");
    el.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#icon");
    setAttributeNS(el, "http://www.w3.org/1999/xlink", "href", null);
    expect(el.hasAttributeNS("http://www.w3.org/1999/xlink", "href")).toBe(false);
  });
});

describe("setBoolAttribute", () => {
  it("sets attribute as empty string for truthy", () => {
    const el = document.createElement("div");
    setBoolAttribute(el, "hidden", true);
    expect(el.getAttribute("hidden")).toBe("");
  });

  it("removes attribute for falsy", () => {
    const el = document.createElement("div");
    el.setAttribute("hidden", "");
    setBoolAttribute(el, "hidden", false);
    expect(el.hasAttribute("hidden")).toBe(false);
  });
});

describe("className", () => {
  it("sets className", () => {
    const el = document.createElement("div");
    className(el, "foo bar");
    expect(el.className).toBe("foo bar");
  });

  it("removes class when null", () => {
    const el = document.createElement("div");
    el.className = "foo";
    className(el, null);
    expect(el.hasAttribute("class")).toBe(false);
  });

  it("removes class when undefined", () => {
    const el = document.createElement("div");
    el.className = "foo";
    className(el, undefined);
    expect(el.hasAttribute("class")).toBe(false);
  });
});

describe("classList", () => {
  it("adds classes for truthy values", () => {
    const el = document.createElement("div");
    classList(el, { foo: true, bar: true });
    expect(el.classList.contains("foo")).toBe(true);
    expect(el.classList.contains("bar")).toBe(true);
  });

  it("removes classes that are no longer truthy", () => {
    const el = document.createElement("div");
    const prev = classList(el, { foo: true, bar: true });
    classList(el, { foo: true, bar: false }, prev);
    expect(el.classList.contains("foo")).toBe(true);
    expect(el.classList.contains("bar")).toBe(false);
  });

  it("handles multi-word class keys", () => {
    const el = document.createElement("div");
    classList(el, { "foo bar": true });
    expect(el.classList.contains("foo")).toBe(true);
    expect(el.classList.contains("bar")).toBe(true);
  });
});

describe("style", () => {
  it("sets styles from object", () => {
    const el = document.createElement("div");
    style(el, { color: "red", "font-size": "14px" });
    expect(el.style.color).toBe("red");
    expect(el.style.fontSize).toBe("14px");
  });

  it("sets style from string", () => {
    const el = document.createElement("div");
    style(el, "color: blue");
    expect(el.style.cssText).toContain("color: blue");
  });

  it("removes previous styles not in new value", () => {
    const el = document.createElement("div");
    const prev = style(el, { color: "red", padding: "10px" });
    style(el, { color: "blue" }, prev);
    expect(el.style.color).toBe("blue");
    expect(el.style.padding).toBe("");
  });

  it("removes style attribute when value is null/undefined", () => {
    const el = document.createElement("div");
    style(el, { color: "red" });
    style(el, null, { color: "red" });
    expect(el.hasAttribute("style")).toBe(false);
  });
});

describe("setStyleProperty", () => {
  it("sets a single style property", () => {
    const el = document.createElement("div");
    setStyleProperty(el, "color", "red");
    expect(el.style.color).toBe("red");
  });

  it("removes a style property when null", () => {
    const el = document.createElement("div");
    el.style.color = "red";
    setStyleProperty(el, "color", null);
    expect(el.style.color).toBe("");
  });
});

describe("use", () => {
  it("calls function with element", () => {
    const el = document.createElement("div");
    let captured: Element | null = null;
    use((node) => {
      captured = node;
    }, el);
    expect(captured).toBe(el);
  });

  it("passes arg to function", () => {
    const el = document.createElement("div");
    let receivedArg: any;
    use(
      (_node, arg) => {
        receivedArg = arg;
      },
      el,
      "hello",
    );
    expect(receivedArg).toBe("hello");
  });
});

describe("assign", () => {
  it("assigns multiple props to element", () => {
    const el = document.createElement("div");
    assign(el, { id: "test", title: "hello" });
    expect(el.getAttribute("id")).toBe("test");
    expect(el.getAttribute("title")).toBe("hello");
  });

  it("handles class prop", () => {
    const el = document.createElement("div");
    assign(el, { class: "foo bar" });
    expect(el.className).toBe("foo bar");
  });

  it("handles style prop", () => {
    const el = document.createElement("div");
    assign(el, { style: { color: "red" } });
    expect(el.style.color).toBe("red");
  });

  it("handles event handlers (on prefix)", () => {
    const el = document.createElement("div");
    const handler = () => {};
    assign(el, { onClick: handler });
    expect((el as any)["$$click"]).toBe(handler);
  });

  it("removes props not in new set", () => {
    const el = document.createElement("div");
    const prevProps = {};
    assign(el, { id: "a", title: "b" }, false, false, prevProps);
    assign(el, { id: "a" }, false, false, prevProps);
    expect(el.hasAttribute("title")).toBe(false);
  });
});

describe("spread", () => {
  it("spreads props onto element", () => {
    const el = document.createElement("span");
    spread(el, { href: "/", class: "link" });
    expect(el.getAttribute("href")).toBe("/");
    expect(el.className).toBe("link");
  });

  it("handles classList in spread", () => {
    const el = document.createElement("span");
    spread(el, { classList: { danger: true } }, false, true);
    expect(el.classList.contains("danger")).toBe(true);
  });

  it("handles style object in spread", () => {
    const el = document.createElement("span");
    spread(el, { style: { color: "red" } }, false, true);
    expect(el.style.color).toBe("red");
  });
});
