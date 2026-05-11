import React from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "./utils";

const getAriaRelatedErrors = (spy: ReturnType<typeof vi.fn>) =>
  spy.mock.calls.filter(
    (call) => !String(call[0]).includes("testing environment") && !String(call[0]).includes("act("),
  );

describe("ReactDOMInvalidARIAHook", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  const mountComponent = async (props: Record<string, unknown>) => {
    const mountContainer = document.createElement("div");
    document.body.appendChild(mountContainer);
    const root = createRoot(mountContainer);
    await act(() => {
      root.render(<div {...props} />);
    });
    await act(() => {
      root.unmount();
    });
    document.body.removeChild(mountContainer);
  };

  it("should allow valid aria-* props", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await mountComponent({ "aria-label": "Bumble bees" });

    expect(getAriaRelatedErrors(consoleErrorSpy)).toHaveLength(0);
    consoleErrorSpy.mockRestore();
  });

  it("should allow new ARIA 1.3 attributes", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await mountComponent({ "aria-braillelabel": "Bumble bees" });
    await mountComponent({ "aria-brailleroledescription": "Bumble bees" });
    await mountComponent({ "aria-colindextext": "Bumble bees" });
    await mountComponent({ "aria-rowindextext": "Bumble bees" });

    expect(getAriaRelatedErrors(consoleErrorSpy)).toHaveLength(0);
    consoleErrorSpy.mockRestore();
  });

  it("should warn for one invalid aria-* prop", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await mountComponent({ "aria-badprop": "some value" });

    expect(getAriaRelatedErrors(consoleErrorSpy).length).toBeGreaterThan(0);
    consoleErrorSpy.mockRestore();
  });

  it("should warn for many invalid aria-* props", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await mountComponent({
      "aria-badprop": "some value",
      "aria-anotherbadprop": "some other value",
    });

    expect(getAriaRelatedErrors(consoleErrorSpy).length).toBeGreaterThan(0);
    consoleErrorSpy.mockRestore();
  });

  it("should warn for an improperly cased aria-* prop", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await mountComponent({ "aria-labelledBy": "some value" });

    expect(getAriaRelatedErrors(consoleErrorSpy).length).toBeGreaterThan(0);
    consoleErrorSpy.mockRestore();
  });

  it("should warn for use of recognized camel case aria attributes", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await mountComponent({ ariaLabel: "some value" });

    expect(getAriaRelatedErrors(consoleErrorSpy).length).toBeGreaterThan(0);
    consoleErrorSpy.mockRestore();
  });

  it("should warn for use of unrecognized camel case aria attributes", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await mountComponent({ ariaFoobar: "some value" });

    expect(getAriaRelatedErrors(consoleErrorSpy).length).toBeGreaterThan(0);
    consoleErrorSpy.mockRestore();
  });
});
