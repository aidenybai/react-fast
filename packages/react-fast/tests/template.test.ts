import { describe, it, expect } from "vitest";
import { template } from "../src/client.js";

describe("template", () => {
  it("creates elements from HTML string", () => {
    const t = template("<div>hello</div>");
    const node = t() as HTMLElement;
    expect(node.outerHTML).toBe("<div>hello</div>");
  });

  it("returns cloned nodes each time", () => {
    const t = template("<div><span>test</span></div>");
    const a = t() as HTMLElement;
    const b = t() as HTMLElement;
    expect(a).not.toBe(b);
    expect(a.outerHTML).toBe(b.outerHTML);
  });

  it("handles nested elements", () => {
    const t = template("<div><span><a></a></span><span></span></div>");
    const node = t() as HTMLElement;
    expect(node.childNodes.length).toBe(2);
    expect((node.firstChild as HTMLElement).tagName).toBe("SPAN");
  });

  it("handles self-closing-style tags", () => {
    const t = template("<input type=text>");
    const node = t() as HTMLInputElement;
    expect(node.tagName).toBe("INPUT");
    expect(node.type).toBe("text");
  });

  it("handles SVG templates", () => {
    const t = template("<svg><circle cx=50 cy=50 r=40></circle></svg>", false, true);
    const node = t() as SVGElement;
    expect(node.tagName).toBe("circle");
    expect(node.getAttribute("cx")).toBe("50");
  });

  it("handles cloneNode property for backwards compat", () => {
    const t = template("<div>test</div>");
    expect((t as any).cloneNode).toBe(t);
  });

  it("handles importNode mode", () => {
    const t = template("<div>imported</div>", true);
    const node = t() as HTMLElement;
    expect(node.outerHTML).toBe("<div>imported</div>");
  });

  it("handles complex templates", () => {
    const t = template(
      `<div id=main><h1>Welcome</h1><label for=entry>Edit:</label><input id=entry type=text>`,
    );
    const node = t() as HTMLElement;
    expect(node.id).toBe("main");
    expect(node.childNodes.length).toBe(3);
    expect((node.firstChild as HTMLElement).tagName).toBe("H1");
  });
});
