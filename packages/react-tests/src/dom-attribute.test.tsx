import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "./utils";

const originalSetAttribute = Element.prototype.setAttribute;
Element.prototype.setAttribute = function (name: string, value: unknown) {
  return originalSetAttribute.call(this, name, "" + value);
};

describe("ReactDOM unknown attribute", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

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

  describe("removal of attributes", () => {
    it("should remove null values", async () => {
      await testUnknownAttributeRemoval(null);
    });

    it("should remove undefined values", async () => {
      await testUnknownAttributeRemoval(undefined);
    });
  });

  describe("boolean-like handling for non-boolean attributes", () => {
    it("should remove true for non-boolean attributes", async () => {
      await testUnknownAttributeAssignment(true, null);
    });

    it("should remove false for non-boolean attributes", async () => {
      await testUnknownAttributeAssignment(false, null);
    });
  });

  describe("string values", () => {
    it("should assign an empty string", async () => {
      await testUnknownAttributeAssignment("", "");
    });

    it("should assign a string value", async () => {
      await testUnknownAttributeAssignment("hello", "hello");
    });
  });

  describe("numeric values", () => {
    it("should coerce zero to a string", async () => {
      await testUnknownAttributeAssignment(0, "0");
    });

    it("should coerce negative zero to a string", async () => {
      await testUnknownAttributeAssignment(-0, "0");
    });

    it("should coerce a positive number to a string", async () => {
      await testUnknownAttributeAssignment(42, "42");
    });

    it("should coerce a negative number to a string", async () => {
      await testUnknownAttributeAssignment(-42, "-42");
    });

    it("should coerce Infinity to a string", async () => {
      await testUnknownAttributeAssignment(Infinity, "Infinity");
    });

    it("should coerce negative Infinity to a string", async () => {
      await testUnknownAttributeAssignment(-Infinity, "-Infinity");
    });

    it("should coerce NaN to a string", async () => {
      await testUnknownAttributeAssignment(NaN, "NaN");
    });
  });

  describe("objects", () => {
    it("should coerce objects to strings", async () => {
      await testUnknownAttributeAssignment({ hello: "world" }, "[object Object]");
    });

    it("should coerce objects with custom toString", async () => {
      const objectWithToString = {
        toString() {
          return "lol";
        },
      };
      await testUnknownAttributeAssignment(objectWithToString, "lol");
    });
  });

  describe("Temporal-like objects", () => {
    it("should throw for Temporal-like objects", async () => {
      class TemporalLike {
        valueOf() {
          throw new TypeError("Cannot convert Temporal to a primitive");
        }
        toString() {
          return "2020-01-01";
        }
      }

      const testFn = () => testUnknownAttributeAssignment(new TemporalLike(), null);
      await expect(testFn).rejects.toThrowError(
        new TypeError("Cannot convert Temporal to a primitive"),
      );
    });
  });

  describe("symbols", () => {
    it("should remove symbol values", async () => {
      await testUnknownAttributeRemoval(Symbol("foo"));
    });
  });

  describe("functions", () => {
    it("should remove function values", async () => {
      await testUnknownAttributeRemoval(function someFunction() {});
    });
  });

  describe("camelCase custom attributes", () => {
    it("should allow camelCase unknown attributes", async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(React.createElement("div", { helloWorld: "something" }));
      });
      expect((container.firstChild as HTMLElement).getAttribute("helloworld")).toBe("something");
    });
  });
});
