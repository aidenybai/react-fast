import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect } from "vitest";
import { act } from "./utils";

describe("ReactDOMSVG", () => {
  it("creates elements with SVG namespace inside SVG tag during mount", async () => {
    const node = document.createElement("div");
    const refs: Record<string, Element | null> = {};
    const root = ReactDOMClient.createRoot(node);
    await act(() => {
      root.render(
        <div>
          <svg
            ref={(element) => {
              refs.svg = element;
            }}
          >
            <g
              ref={(element) => {
                refs.g = element;
              }}
              strokeWidth="5"
            >
              <svg
                ref={(element) => {
                  refs.svg2 = element;
                }}
              >
                <foreignObject
                  ref={(element) => {
                    refs.foreignObject = element;
                  }}
                >
                  <svg
                    ref={(element) => {
                      refs.svg3 = element;
                    }}
                  >
                    <svg
                      ref={(element) => {
                        refs.svg4 = element;
                      }}
                    />
                    <image
                      ref={(element) => {
                        refs.image = element;
                      }}
                      xlinkHref="http://i.imgur.com/w7GCRPb.png"
                    />
                  </svg>
                  <div
                    ref={(element) => {
                      refs.div = element;
                    }}
                  />
                </foreignObject>
              </svg>
              <image
                ref={(element) => {
                  refs.image2 = element;
                }}
                xlinkHref="http://i.imgur.com/w7GCRPb.png"
              />
              <foreignObject
                ref={(element) => {
                  refs.foreignObject2 = element;
                }}
              >
                <div
                  ref={(element) => {
                    refs.div2 = element;
                  }}
                />
              </foreignObject>
            </g>
          </svg>
          <p
            ref={(element) => {
              refs.p = element;
            }}
          >
            <svg>
              <image
                ref={(element) => {
                  refs.image3 = element;
                }}
                xlinkHref="http://i.imgur.com/w7GCRPb.png"
              />
            </svg>
          </p>
          <div
            ref={(element) => {
              refs.div3 = element;
            }}
          />
        </div>,
      );
    });
    [refs.svg, refs.svg2, refs.svg3, refs.svg4].forEach((element) => {
      expect(element!.namespaceURI).toBe("http://www.w3.org/2000/svg");
      expect(element!.tagName).toBe("svg");
    });
    expect(refs.g!.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(refs.g!.tagName).toBe("g");
    expect(refs.g!.getAttribute("stroke-width")).toBe("5");
    expect(refs.p!.namespaceURI).toBe("http://www.w3.org/1999/xhtml");
    expect(refs.p!.tagName).toBe("P");
    [refs.image, refs.image2, refs.image3].forEach((element) => {
      expect(element!.namespaceURI).toBe("http://www.w3.org/2000/svg");
      expect(element!.tagName).toBe("image");
      expect(element!.getAttributeNS("http://www.w3.org/1999/xlink", "href")).toBe(
        "http://i.imgur.com/w7GCRPb.png",
      );
    });
    [refs.foreignObject, refs.foreignObject2].forEach((element) => {
      expect(element!.namespaceURI).toBe("http://www.w3.org/2000/svg");
      expect(element!.tagName).toBe("foreignObject");
    });
    [refs.div, refs.div2, refs.div3].forEach((element) => {
      expect(element!.namespaceURI).toBe("http://www.w3.org/1999/xhtml");
      expect(element!.tagName).toBe("DIV");
    });
  });

  it("creates elements with SVG namespace inside SVG tag during update", async () => {
    const refs: Record<string, Element | null> = {};
    let triggerUpdate: (() => void) | null = null;

    const App = () => {
      const [step, setStep] = React.useState(0);
      triggerUpdate = () => setStep(1);

      if (step === 0) {
        return null;
      }
      return (
        <g
          ref={(element) => {
            refs.g = element;
          }}
          strokeWidth="5"
        >
          <svg
            ref={(element) => {
              refs.svg2 = element;
            }}
          >
            <foreignObject
              ref={(element) => {
                refs.foreignObject = element;
              }}
            >
              <svg
                ref={(element) => {
                  refs.svg3 = element;
                }}
              >
                <svg
                  ref={(element) => {
                    refs.svg4 = element;
                  }}
                />
                <image
                  ref={(element) => {
                    refs.image = element;
                  }}
                  xlinkHref="http://i.imgur.com/w7GCRPb.png"
                />
              </svg>
              <div
                ref={(element) => {
                  refs.div = element;
                }}
              />
            </foreignObject>
          </svg>
          <image
            ref={(element) => {
              refs.image2 = element;
            }}
            xlinkHref="http://i.imgur.com/w7GCRPb.png"
          />
          <foreignObject
            ref={(element) => {
              refs.foreignObject2 = element;
            }}
          >
            <div
              ref={(element) => {
                refs.div2 = element;
              }}
            />
          </foreignObject>
        </g>
      );
    };

    const node = document.createElement("div");
    const root = ReactDOMClient.createRoot(node);
    await act(() => {
      root.render(
        <svg
          ref={(element) => {
            refs.svg = element;
          }}
        >
          <App />
        </svg>,
      );
    });
    await act(() => {
      triggerUpdate!();
    });

    [refs.svg, refs.svg2, refs.svg3, refs.svg4].forEach((element) => {
      expect(element!.namespaceURI).toBe("http://www.w3.org/2000/svg");
      expect(element!.tagName).toBe("svg");
    });
    expect(refs.g!.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(refs.g!.tagName).toBe("g");
    expect(refs.g!.getAttribute("stroke-width")).toBe("5");
    [refs.image, refs.image2].forEach((element) => {
      expect(element!.namespaceURI).toBe("http://www.w3.org/2000/svg");
      expect(element!.tagName).toBe("image");
      expect(element!.getAttributeNS("http://www.w3.org/1999/xlink", "href")).toBe(
        "http://i.imgur.com/w7GCRPb.png",
      );
    });
    [refs.foreignObject, refs.foreignObject2].forEach((element) => {
      expect(element!.namespaceURI).toBe("http://www.w3.org/2000/svg");
      expect(element!.tagName).toBe("foreignObject");
    });
    [refs.div, refs.div2].forEach((element) => {
      expect(element!.namespaceURI).toBe("http://www.w3.org/1999/xhtml");
      expect(element!.tagName).toBe("DIV");
    });
  });

  it("can render SVG into a non-React SVG tree", async () => {
    const outerSVGRoot = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const container = document.createElementNS("http://www.w3.org/2000/svg", "g");
    outerSVGRoot.appendChild(container);
    const refs: Record<string, Element | null> = {};
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <image
          ref={(element) => {
            refs.image = element;
          }}
        />,
      );
    });
    expect(refs.image!.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(refs.image!.tagName).toBe("image");
  });

  it("can render HTML into a foreignObject in non-React SVG tree", async () => {
    const outerSVGRoot = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const container = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    outerSVGRoot.appendChild(container);
    const refs: Record<string, Element | null> = {};
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <div
          ref={(element) => {
            refs.div = element;
          }}
        />,
      );
    });
    expect(refs.div!.namespaceURI).toBe("http://www.w3.org/1999/xhtml");
    expect(refs.div!.tagName).toBe("DIV");
  });
});
