import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  createContext,
  forwardRef,
  memo,
} from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, createRoot } from "react-dom/client";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "./utils";

describe("ReactServerRenderingHydration", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("should hydrate matching simple content", async () => {
    const element = <div>Hello</div>;
    container.innerHTML = renderToString(element);

    await act(() => {
      hydrateRoot(container, element);
    });

    expect(container.textContent).toBe("Hello");
  });

  it("should hydrate nested elements", async () => {
    const element = (
      <div>
        <span>Nested</span>
        <p>Content</p>
      </div>
    );
    container.innerHTML = renderToString(element);

    await act(() => {
      hydrateRoot(container, element);
    });

    expect(container.querySelector("span")!.textContent).toBe("Nested");
    expect(container.querySelector("p")!.textContent).toBe("Content");
  });

  it("should preserve existing DOM nodes after hydration", async () => {
    const element = <div id="preserved">Keep me</div>;
    container.innerHTML = renderToString(element);

    const existingNode = container.firstChild;

    await act(() => {
      hydrateRoot(container, element);
    });

    expect(container.firstChild).toBe(existingNode);
  });

  it("should attach event handlers after hydration", async () => {
    const handleClick = vi.fn();

    const Element = () => <button onClick={handleClick}>Click me</button>;

    container.innerHTML = renderToString(<Element />);

    await act(() => {
      hydrateRoot(container, <Element />);
    });

    const button = container.querySelector("button")!;
    await act(() => {
      button.click();
    });

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should support useState after hydration", async () => {
    const Counter = () => {
      const [count, setCount] = useState(0);
      return <button onClick={() => setCount((previous) => previous + 1)}>Count: {count}</button>;
    };

    container.innerHTML = renderToString(<Counter />);

    await act(() => {
      hydrateRoot(container, <Counter />);
    });

    expect(container.textContent).toBe("Count: 0");

    const button = container.querySelector("button")!;
    await act(() => {
      button.click();
    });

    expect(container.textContent).toBe("Count: 1");
  });

  it("should attach refs after hydration", async () => {
    let capturedRef: HTMLDivElement | null = null;

    const RefComponent = () => {
      const divRef = useRef<HTMLDivElement>(null);
      useEffect(() => {
        capturedRef = divRef.current;
      }, []);
      return <div ref={divRef}>With ref</div>;
    };

    container.innerHTML = renderToString(<RefComponent />);

    await act(() => {
      hydrateRoot(container, <RefComponent />);
    });

    expect(capturedRef).not.toBeNull();
    expect(capturedRef!.textContent).toBe("With ref");
  });

  it("should hydrate with context", async () => {
    const ThemeContext = createContext("light");

    const ThemedDiv = () => {
      const theme = useContext(ThemeContext);
      return <div>{theme}</div>;
    };

    const element = (
      <ThemeContext.Provider value="dark">
        <ThemedDiv />
      </ThemeContext.Provider>
    );

    container.innerHTML = renderToString(element);

    await act(() => {
      hydrateRoot(container, element);
    });

    expect(container.textContent).toBe("dark");
  });

  it("should hydrate forwardRef components", async () => {
    const FancyInput = forwardRef<HTMLInputElement, { placeholder: string }>((props, ref) => (
      <input ref={ref} placeholder={props.placeholder} />
    ));

    let inputRef: HTMLInputElement | null = null;

    const App = () => {
      const ref = useRef<HTMLInputElement>(null);
      useEffect(() => {
        inputRef = ref.current;
      }, []);
      return <FancyInput ref={ref} placeholder="Type here" />;
    };

    container.innerHTML = renderToString(<App />);

    await act(() => {
      hydrateRoot(container, <App />);
    });

    expect(inputRef).not.toBeNull();
    expect(inputRef!.placeholder).toBe("Type here");
  });

  it("should hydrate memo components", async () => {
    const MemoGreeting = memo(({ name }: { name: string }) => <span>Hello, {name}</span>);

    const element = <MemoGreeting name="World" />;

    container.innerHTML = renderToString(element);

    await act(() => {
      hydrateRoot(container, element);
    });

    expect(container.textContent).toBe("Hello, World");
  });

  it("should hydrate with children and nested components", async () => {
    const ListItem = ({ text }: { text: string }) => <li>{text}</li>;
    const List = ({ items }: { items: string[] }) => (
      <ul>
        {items.map((item) => (
          <ListItem key={item} text={item} />
        ))}
      </ul>
    );

    const element = <List items={["apple", "banana", "cherry"]} />;

    container.innerHTML = renderToString(element);

    await act(() => {
      hydrateRoot(container, element);
    });

    const listItems = container.querySelectorAll("li");
    expect(listItems).toHaveLength(3);
    expect(listItems[0].textContent).toBe("apple");
    expect(listItems[1].textContent).toBe("banana");
    expect(listItems[2].textContent).toBe("cherry");
  });

  it("should hydrate multiple independent roots", async () => {
    const containerTwo = document.createElement("div");
    document.body.appendChild(containerTwo);

    const elementOne = <div>Root One</div>;
    const elementTwo = <div>Root Two</div>;

    container.innerHTML = renderToString(elementOne);
    containerTwo.innerHTML = renderToString(elementTwo);

    await act(() => {
      hydrateRoot(container, elementOne);
      hydrateRoot(containerTwo, elementTwo);
    });

    expect(container.textContent).toBe("Root One");
    expect(containerTwo.textContent).toBe("Root Two");

    document.body.removeChild(containerTwo);
  });

  it("should render to string and hydrate with props that update", async () => {
    const Greeting = ({ name }: { name: string }) => <div>Hello, {name}!</div>;

    container.innerHTML = renderToString(<Greeting name="Server" />);

    let rootInstance: ReturnType<typeof hydrateRoot>;
    await act(() => {
      rootInstance = hydrateRoot(container, <Greeting name="Server" />);
    });

    expect(container.textContent).toBe("Hello, Server!");

    await act(() => {
      rootInstance!.render(<Greeting name="Client" />);
    });

    expect(container.textContent).toBe("Hello, Client!");
  });

  it("should not touch the DOM when rendered markup is identical", async () => {
    const element = <div id="same-content">Same content</div>;

    container.innerHTML = renderToString(element);
    const originalDomNode = container.firstChild;

    await act(() => {
      hydrateRoot(container, element);
    });

    expect(container.firstChild).toBe(originalDomNode);
    expect(container.textContent).toBe("Same content");
  });
});
