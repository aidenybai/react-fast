import React from "react";
import { flushSync } from "react-dom";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { describe, it, expect } from "vitest";
import { act, log, assertLog } from "./utils";

const getTestDocument = (markup?: string) => {
  const doc = document.implementation.createHTMLDocument("");
  doc.open();
  doc.write(markup || "<!doctype html><html><meta charset=utf-8><title>test doc</title>");
  doc.close();
  return doc;
};

const normalizeError = (message: string) => {
  const index = message.indexOf(".");
  if (index > -1) {
    return message.slice(0, index + 1);
  }
  return message;
};

describe("rendering React components at document", () => {
  describe("with new explicit hydration API", () => {
    it("should be able to adopt server markup", async () => {
      class Root extends React.Component<{ hello: string }> {
        render() {
          return (
            <html>
              <head>
                <title>Hello World</title>
              </head>
              <body>{"Hello " + this.props.hello}</body>
            </html>
          );
        }
      }

      const markup = renderToString(<Root hello="world" />);
      const testDocument = getTestDocument(markup);

      let root!: ReturnType<typeof hydrateRoot>;
      await act(() => {
        root = hydrateRoot(testDocument, <Root hello="world" />);
      });

      expect(testDocument.body.innerHTML).toBe("Hello world");

      await act(() => {
        root.render(<Root hello="moon" />);
      });

      expect(testDocument.body.innerHTML).toBe("Hello moon");
    });

    it("should be able to unmount component from document node, but leaves singleton nodes intact", async () => {
      class Root extends React.Component {
        render() {
          return (
            <html>
              <head>
                <title>Hello World</title>
              </head>
              <body>Hello world</body>
            </html>
          );
        }
      }

      const markup = renderToString(<Root />);
      const testDocument = getTestDocument(markup);

      let root!: ReturnType<typeof hydrateRoot>;
      await act(() => {
        root = hydrateRoot(testDocument, <Root />);
      });

      expect(testDocument.body.innerHTML).toBe("Hello world");

      const originalDocumentElement = testDocument.documentElement;
      const originalHead = testDocument.head;
      const originalBody = testDocument.body;

      root.unmount();

      expect(testDocument.documentElement).toBe(originalDocumentElement);
      expect(testDocument.head).toBe(originalHead);
      expect(testDocument.body).toBe(originalBody);
      expect(originalBody.innerHTML).toBe("");
      expect(originalHead.innerHTML).toBe("");
    });

    it("should not be able to switch root constructors", async () => {
      class Component extends React.Component {
        render() {
          return (
            <html>
              <head>
                <title>Hello World</title>
              </head>
              <body>Hello world</body>
            </html>
          );
        }
      }

      class Component2 extends React.Component {
        render() {
          return (
            <html>
              <head>
                <title>Hello World</title>
              </head>
              <body>Goodbye world</body>
            </html>
          );
        }
      }

      const markup = renderToString(<Component />);
      const testDocument = getTestDocument(markup);

      let root!: ReturnType<typeof hydrateRoot>;
      await act(() => {
        root = hydrateRoot(testDocument, <Component />);
      });

      expect(testDocument.body.innerHTML).toBe("Hello world");

      await act(() => {
        root.render(<Component2 />);
      });

      expect(testDocument.body.innerHTML).toBe("Goodbye world");
    });

    it("should be able to mount into document", async () => {
      class Component extends React.Component<{ text: string }> {
        render() {
          return (
            <html>
              <head>
                <title>Hello World</title>
              </head>
              <body>{this.props.text}</body>
            </html>
          );
        }
      }

      const markup = renderToString(<Component text="Hello world" />);
      const testDocument = getTestDocument(markup);

      await act(() => {
        hydrateRoot(testDocument, <Component text="Hello world" />);
      });

      expect(testDocument.body.innerHTML).toBe("Hello world");
    });

    it("cannot render over an existing text child at the root", async () => {
      const container = document.createElement("div");
      container.textContent = "potato";

      flushSync(() => {
        hydrateRoot(container, <div>parsnip</div>, {
          onRecoverableError: (error: unknown) => {
            log("onRecoverableError: " + normalizeError((error as { message: string }).message));
          },
        });
      });

      assertLog([
        "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
      ]);
      expect(container.textContent).toBe("parsnip");
    });

    it("renders over an existing nested text child without throwing", async () => {
      const container = document.createElement("div");
      const wrapper = document.createElement("div");
      wrapper.textContent = "potato";
      container.appendChild(wrapper);

      flushSync(() => {
        hydrateRoot(
          container,
          <div>
            <div>parsnip</div>
          </div>,
          {
            onRecoverableError: (error: unknown) => {
              log("onRecoverableError: " + normalizeError((error as { message: string }).message));
            },
          },
        );
      });

      assertLog([
        "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
      ]);
      expect(container.textContent).toBe("parsnip");
    });

    it("should give helpful errors on state desync", async () => {
      class Component extends React.Component<{ text: string }> {
        render() {
          return (
            <html>
              <head>
                <title>Hello World</title>
              </head>
              <body>{this.props.text}</body>
            </html>
          );
        }
      }

      const markup = renderToString(<Component text="Goodbye world" />);
      const testDocument = getTestDocument(markup);

      flushSync(() => {
        hydrateRoot(testDocument, <Component text="Hello world" />, {
          onRecoverableError: (error: unknown) => {
            log("onRecoverableError: " + normalizeError((error as { message: string }).message));
          },
        });
      });

      assertLog([
        "onRecoverableError: Hydration failed because the server rendered text didn't match the client.",
      ]);
      expect(testDocument.body.innerHTML).toBe("Hello world");
    });

    it("should render w/ no markup to full document", async () => {
      const testDocument = getTestDocument();

      class Component extends React.Component<{ text: string }> {
        render() {
          return (
            <html>
              <head>
                <title>Hello World</title>
              </head>
              <body>{this.props.text}</body>
            </html>
          );
        }
      }

      flushSync(() => {
        hydrateRoot(testDocument, <Component text="Hello world" />, {
          onRecoverableError: (error: unknown) => {
            log("onRecoverableError: " + normalizeError((error as { message: string }).message));
          },
        });
      });

      assertLog([
        "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
      ]);
      expect(testDocument.body.innerHTML).toBe("Hello world");
    });
  });
});
