import React from "react";
import { describe, expect } from "vitest";
import { itRenders } from "./ssr-integration-utils";

describe("ReactDOMServerIntegration - React.Fragment", () => {
  itRenders("a fragment with one child", async (render) => {
    const element = await render(
      <>
        <div>text1</div>
      </>,
    );
    const parent = element!.parentNode!;
    expect((parent.childNodes[0] as Element).tagName).toBe("DIV");
  });

  itRenders("a fragment with several children", async (render) => {
    const Header = () => <p>header</p>;
    const Footer = () => (
      <>
        <h2>footer</h2>
        <h3>about</h3>
      </>
    );
    const element = await render(
      <>
        <div>text1</div>
        <span>text2</span>
        <Header />
        <Footer />
      </>,
    );
    const parent = element!.parentNode!;
    expect((parent.childNodes[0] as Element).tagName).toBe("DIV");
    expect((parent.childNodes[1] as Element).tagName).toBe("SPAN");
    expect((parent.childNodes[2] as Element).tagName).toBe("P");
    expect((parent.childNodes[3] as Element).tagName).toBe("H2");
    expect((parent.childNodes[4] as Element).tagName).toBe("H3");
  });

  itRenders("a nested fragment", async (render) => {
    const element = await render(
      <>
        <>
          <div>text1</div>
        </>
        <span>text2</span>
        <>
          <>
            <>
              {null}
              <p />
            </>
            {false}
          </>
        </>
      </>,
    );
    const parent = element!.parentNode!;
    expect((parent.childNodes[0] as Element).tagName).toBe("DIV");
    expect((parent.childNodes[1] as Element).tagName).toBe("SPAN");
    expect((parent.childNodes[2] as Element).tagName).toBe("P");
  });

  itRenders("an empty fragment", async (render) => {
    const element = await render(
      <div>
        <React.Fragment />
      </div>,
    );
    expect(element!.firstChild).toBe(null);
  });
});
