import React from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi, afterEach } from "vitest";
import { act } from "./utils";

describe("ReactMount destruction and iframe", () => {
  let mainContainer: HTMLDivElement | null = null;

  afterEach(() => {
    if (mainContainer && mainContainer.parentNode) {
      mainContainer.parentNode.removeChild(mainContainer);
    }
    mainContainer = null;
  });

  it("should destroy a react root upon request", async () => {
    mainContainer = document.createElement("div");
    document.body.appendChild(mainContainer);

    const firstRootDiv = document.createElement("div");
    mainContainer.appendChild(firstRootDiv);
    const firstRoot = createRoot(firstRootDiv);
    await act(() => {
      firstRoot.render(<div className="firstReactDiv" />);
    });

    const secondRootDiv = document.createElement("div");
    mainContainer.appendChild(secondRootDiv);
    const secondRoot = createRoot(secondRootDiv);
    await act(() => {
      secondRoot.render(<div className="secondReactDiv" />);
    });

    expect((firstRootDiv.firstChild as HTMLElement).className).toBe("firstReactDiv");
    expect((secondRootDiv.firstChild as HTMLElement).className).toBe("secondReactDiv");

    await act(() => {
      firstRoot.unmount();
    });
    expect(firstRootDiv.firstChild).toBeNull();

    await act(() => {
      secondRoot.unmount();
    });
    expect(secondRootDiv.firstChild).toBeNull();
  });

  it("should trigger load events on iframe", async () => {
    const onLoadSpy = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(() => {
      root.render(React.createElement("iframe", { onLoad: onLoadSpy }));
    });

    const iframe = container.firstChild as HTMLIFrameElement;
    const loadEvent = document.createEvent("Event");
    loadEvent.initEvent("load", false, false);

    await act(() => {
      iframe.dispatchEvent(loadEvent);
    });

    expect(onLoadSpy).toHaveBeenCalled();
  });
});
