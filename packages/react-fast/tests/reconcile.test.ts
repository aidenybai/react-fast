/**
 * Tests for the reconcileArrays function (udomdiff port).
 */
import { describe, it, expect } from "vitest";
import reconcileArrays from "../src/reconcile.js";

function setup() {
  const parent = document.createElement("div");
  return parent;
}

function nodes(parent: HTMLElement, texts: string[]): Node[] {
  return texts.map((t) => {
    const el = document.createElement("span");
    el.textContent = t;
    parent.appendChild(el);
    return el;
  });
}

function html(parent: HTMLElement): string {
  return parent.innerHTML;
}

describe("reconcileArrays", () => {
  it("appends all when current is empty", () => {
    const parent = setup();
    const a: Node[] = [];
    const b = [document.createElement("span"), document.createElement("div")];
    b[0]!.textContent = "1";
    b[1]!.textContent = "2";
    reconcileArrays(parent, a, b);
    expect(html(parent)).toBe("<span>1</span><div>2</div>");
  });

  it("removes all when next is empty", () => {
    const parent = setup();
    const a = nodes(parent, ["1", "2", "3"]);
    reconcileArrays(parent, a, []);
    expect(html(parent)).toBe("");
  });

  it("handles identity (no change)", () => {
    const parent = setup();
    const a = nodes(parent, ["1", "2", "3"]);
    reconcileArrays(parent, a, [...a]);
    expect(html(parent)).toBe("<span>1</span><span>2</span><span>3</span>");
  });

  it("handles prepend", () => {
    const parent = setup();
    const a = nodes(parent, ["2", "3"]);
    const newNode = document.createElement("span");
    newNode.textContent = "1";
    reconcileArrays(parent, a, [newNode, ...a]);
    expect(html(parent)).toBe("<span>1</span><span>2</span><span>3</span>");
  });

  it("handles append", () => {
    const parent = setup();
    const a = nodes(parent, ["1", "2"]);
    const newNode = document.createElement("span");
    newNode.textContent = "3";
    reconcileArrays(parent, a, [...a, newNode]);
    expect(html(parent)).toBe("<span>1</span><span>2</span><span>3</span>");
  });

  it("handles removal from middle", () => {
    const parent = setup();
    const a = nodes(parent, ["1", "2", "3"]);
    reconcileArrays(parent, a, [a[0]!, a[2]!]);
    expect(html(parent)).toBe("<span>1</span><span>3</span>");
  });

  it("handles swap", () => {
    const parent = setup();
    const a = nodes(parent, ["1", "2", "3", "4"]);
    reconcileArrays(parent, a, [a[1]!, a[0]!, a[2]!, a[3]!]);
    expect(html(parent)).toBe("<span>2</span><span>1</span><span>3</span><span>4</span>");
  });

  it("handles reversal", () => {
    const parent = setup();
    const a = nodes(parent, ["1", "2", "3", "4"]);
    reconcileArrays(parent, a, [a[3]!, a[2]!, a[1]!, a[0]!]);
    expect(html(parent)).toBe("<span>4</span><span>3</span><span>2</span><span>1</span>");
  });

  it("handles rotation", () => {
    const parent = setup();
    const a = nodes(parent, ["1", "2", "3", "4"]);
    reconcileArrays(parent, a, [a[1]!, a[2]!, a[3]!, a[0]!]);
    expect(html(parent)).toBe("<span>2</span><span>3</span><span>4</span><span>1</span>");
  });

  it("handles complete replacement", () => {
    const parent = setup();
    const a = nodes(parent, ["1", "2", "3"]);
    const b = ["4", "5", "6"].map((t) => {
      const el = document.createElement("div");
      el.textContent = t;
      return el;
    });
    reconcileArrays(parent, a, b);
    expect(html(parent)).toBe("<div>4</div><div>5</div><div>6</div>");
  });

  it("handles mixed insert and remove", () => {
    const parent = setup();
    const a = nodes(parent, ["1", "2", "3", "4"]);
    const newNode = document.createElement("span");
    newNode.textContent = "5";
    reconcileArrays(parent, a, [a[0]!, newNode, a[3]!]);
    expect(html(parent)).toBe("<span>1</span><span>5</span><span>4</span>");
  });

  it("handles large list operations", () => {
    const parent = setup();
    const a = nodes(
      parent,
      Array.from({ length: 100 }, (_, i) => String(i)),
    );
    const b = [...a].reverse();
    reconcileArrays(parent, a, b);
    const children = Array.from(parent.childNodes);
    for (let i = 0; i < 100; i++) {
      expect((children[i] as HTMLElement).textContent).toBe(String(99 - i));
    }
  });
});
