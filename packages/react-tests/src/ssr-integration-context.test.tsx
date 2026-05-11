import React from "react";
import { describe, expect } from "vitest";
import { itClientRenders } from "./ssr-integration-utils";

describe("ReactDOMServerIntegration - new context", () => {
  itClientRenders("a provider and consumer pair", async (render) => {
    const Context = React.createContext("default");

    const element = await render(
      <Context.Provider value="hello">
        <Context.Consumer>{(value) => <span>{value}</span>}</Context.Consumer>
      </Context.Provider>,
    );
    expect(element!.textContent).toBe("hello");
  });

  itClientRenders("default value when no provider", async (render) => {
    const Context = React.createContext("default");

    const element = await render(
      <Context.Consumer>{(value) => <span>{value}</span>}</Context.Consumer>,
    );
    expect(element!.textContent).toBe("default");
  });

  itClientRenders("nested providers", async (render) => {
    const Context = React.createContext("default");

    const element = await render(
      <Context.Provider value="outer">
        <div>
          <Context.Provider value="inner">
            <Context.Consumer>{(value) => <span id="inner">{value}</span>}</Context.Consumer>
          </Context.Provider>
          <Context.Consumer>{(value) => <span id="outer">{value}</span>}</Context.Consumer>
        </div>
      </Context.Provider>,
    );
    const innerSpan = (element as Element).querySelector("#inner");
    const outerSpan = (element as Element).querySelector("#outer");
    expect(innerSpan!.textContent).toBe("inner");
    expect(outerSpan!.textContent).toBe("outer");
  });

  itClientRenders("multiple consumers for same provider", async (render) => {
    const Context = React.createContext("default");

    const element = await render(
      <Context.Provider value="shared">
        <div>
          <Context.Consumer>{(value) => <span className="first">{value}</span>}</Context.Consumer>
          <Context.Consumer>{(value) => <span className="second">{value}</span>}</Context.Consumer>
        </div>
      </Context.Provider>,
    );
    const first = (element as Element).querySelector(".first");
    const second = (element as Element).querySelector(".second");
    expect(first!.textContent).toBe("shared");
    expect(second!.textContent).toBe("shared");
  });

  itClientRenders("useContext hook", async (render) => {
    const Context = React.createContext("default");

    const Consumer = () => {
      const value = React.useContext(Context);
      return <span>{value}</span>;
    };

    const element = await render(
      <Context.Provider value="hook value">
        <Consumer />
      </Context.Provider>,
    );
    expect(element!.textContent).toBe("hook value");
  });

  itClientRenders("useContext with default value", async (render) => {
    const Context = React.createContext("my default");

    const Consumer = () => {
      const value = React.useContext(Context);
      return <span>{value}</span>;
    };

    const element = await render(<Consumer />);
    expect(element!.textContent).toBe("my default");
  });

  itClientRenders("context with object value", async (render) => {
    const Context = React.createContext({ theme: "light", lang: "en" });

    const Consumer = () => {
      const { theme, lang } = React.useContext(Context);
      return (
        <span>
          {theme}-{lang}
        </span>
      );
    };

    const element = await render(
      <Context.Provider value={{ theme: "dark", lang: "fr" }}>
        <Consumer />
      </Context.Provider>,
    );
    expect(element!.textContent).toBe("dark-fr");
  });
});
