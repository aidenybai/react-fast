import { describe, it, expect, beforeEach } from "vitest";
import { delegateEvents, clearDelegatedEvents, addEventListener } from "../src/client.js";

describe("delegateEvents", () => {
  beforeEach(() => {
    clearDelegatedEvents(document);
  });

  it("delegates click events to handler on element", () => {
    delegateEvents(["click"]);
    const div = document.createElement("div");
    document.body.appendChild(div);
    let clicked = false;
    (div as any)["$$click"] = () => {
      clicked = true;
    };
    div.click();
    expect(clicked).toBe(true);
    document.body.removeChild(div);
  });

  it("supports event data", () => {
    delegateEvents(["click"]);
    const div = document.createElement("div");
    document.body.appendChild(div);
    let receivedData: any;
    (div as any)["$$click"] = (data: any, _e: Event) => {
      receivedData = data;
    };
    (div as any)["$$clickData"] = { id: 42 };
    div.click();
    expect(receivedData).toEqual({ id: 42 });
    document.body.removeChild(div);
  });

  it("events bubble up through parents", () => {
    delegateEvents(["click"]);
    const parent = document.createElement("div");
    const child = document.createElement("span");
    parent.appendChild(child);
    document.body.appendChild(parent);

    let parentClicked = false;
    (parent as any)["$$click"] = () => {
      parentClicked = true;
    };
    child.click();
    expect(parentClicked).toBe(true);
    document.body.removeChild(parent);
  });

  it("respects stopPropagation via cancelBubble", () => {
    delegateEvents(["click"]);
    const parent = document.createElement("div");
    const child = document.createElement("span");
    parent.appendChild(child);
    document.body.appendChild(parent);

    let parentClicked = false;
    (parent as any)["$$click"] = () => {
      parentClicked = true;
    };
    (child as any)["$$click"] = (e: Event) => {
      e.stopPropagation();
    };
    child.click();
    expect(parentClicked).toBe(false);
    document.body.removeChild(parent);
  });

  it("does not fire after clearDelegatedEvents", () => {
    delegateEvents(["click"]);
    clearDelegatedEvents(document);
    const div = document.createElement("div");
    document.body.appendChild(div);
    let clicked = false;
    (div as any)["$$click"] = () => {
      clicked = true;
    };
    div.click();
    expect(clicked).toBe(false);
    document.body.removeChild(div);
  });

  it("skips disabled elements", () => {
    delegateEvents(["click"]);
    const btn = document.createElement("button");
    btn.disabled = true;
    document.body.appendChild(btn);
    let clicked = false;
    (btn as any)["$$click"] = () => {
      clicked = true;
    };
    btn.click();
    expect(clicked).toBe(false);
    document.body.removeChild(btn);
  });
});

describe("addEventListener", () => {
  it("adds delegated event handler", () => {
    const node = document.createElement("div");
    const handler = () => {};
    addEventListener(node, "click", handler, true);
    expect(node["$$click" as any]).toBe(handler);
  });

  it("adds delegated event with data (array form)", () => {
    const node = document.createElement("div");
    const handler = () => {};
    addEventListener(node, "click", [handler, "data"], true);
    expect(node["$$click" as any]).toBe(handler);
    expect(node["$$clickData" as any]).toBe("data");
  });

  it("adds non-delegated event handler directly", () => {
    const node = document.createElement("div");
    let called = false;
    const handler = () => {
      called = true;
    };
    addEventListener(node, "custom", handler, false);
    node.dispatchEvent(new Event("custom"));
    expect(called).toBe(true);
  });
});
