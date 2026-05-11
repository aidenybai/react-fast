import React from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, afterEach } from "vitest";
import { act } from "./utils";

describe("ReactDOMComponentTree", () => {
  let container: HTMLDivElement;

  const simulateMouseEvent = (element: Element, eventType: string) => {
    const event = new MouseEvent(eventType, { bubbles: true });
    element.dispatchEvent(event);
  };

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it("finds nodes for instances on events", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const mouseOverId = "mouseOverID";
    const clickId = "clickID";
    let currentTargetId: string | null = null;

    const Component = () => {
      const handler = (event: React.MouseEvent) => {
        currentTargetId = event.currentTarget.id;
      };

      return (
        <div id={mouseOverId} onMouseOver={handler}>
          <div id={clickId} onClick={handler} />
        </div>
      );
    };

    const root = createRoot(container);
    await act(() => {
      root.render(<Component />);
    });

    expect(currentTargetId).toBe(null);
    simulateMouseEvent(document.getElementById(mouseOverId)!, "mouseover");
    expect(currentTargetId).toBe(mouseOverId);
    simulateMouseEvent(document.getElementById(clickId)!, "click");
    expect(currentTargetId).toBe(clickId);
  });

  it("finds closest instance for node when an event happens", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const nonReactElementId = "aID";
    const innerHTML = { __html: `<div id="${nonReactElementId}"></div>` };
    const closestInstanceId = "closestInstance";
    let currentTargetId: string | null = null;

    const ClosestInstance = () => {
      const onClick = (event: React.MouseEvent) => {
        currentTargetId = event.currentTarget.id;
      };

      return <div id={closestInstanceId} onClick={onClick} dangerouslySetInnerHTML={innerHTML} />;
    };

    const root = createRoot(container);
    await act(() => {
      root.render(
        <section>
          <ClosestInstance />
        </section>,
      );
    });

    expect(currentTargetId).toBe(null);
    const clickEvent = new MouseEvent("click", { bubbles: true });
    document.getElementById(nonReactElementId)!.dispatchEvent(clickEvent);
    expect(currentTargetId).toBe(closestInstanceId);
  });

  it("updates event handlers from fiber props", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    let action = "";
    let flipHandler: (() => void) | null = null;
    const handlerA = () => {
      action = "A";
    };
    const handlerB = () => {
      action = "B";
    };

    const HandlerFlipper = () => {
      const [isFlipped, setIsFlipped] = React.useState(false);
      flipHandler = () => setIsFlipped(true);

      return <div id="update" onMouseOver={isFlipped ? handlerB : handlerA} />;
    };

    const root = createRoot(container);
    await act(() => {
      root.render(<HandlerFlipper key="1" />);
    });
    const node = container.firstChild as HTMLElement;

    await act(() => {
      simulateMouseEvent(node, "mouseover");
    });
    expect(action).toEqual("A");
    action = "";

    await act(() => {
      flipHandler!();
    });
    await act(() => {
      simulateMouseEvent(node, "mouseover");
    });
    expect(action).toEqual("B");
  });
});
