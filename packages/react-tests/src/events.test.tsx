import React from "react";
import * as ReactDOMClient from "react-dom/client";
import * as ReactDOMServer from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { act } from "./utils";

describe("ReactDOMEventListener", () => {
  describe("Propagation", () => {
    it("should propagate events one level down", async () => {
      const mouseOut = vi.fn();
      const onMouseOut = (event: React.MouseEvent) => mouseOut(event.currentTarget);

      const childContainer = document.createElement("div");
      const parentContainer = document.createElement("div");

      const childRoot = ReactDOMClient.createRoot(childContainer);
      const parentRoot = ReactDOMClient.createRoot(parentContainer);

      await act(() => {
        childRoot.render(<div onMouseOut={onMouseOut}>Child</div>);
        parentRoot.render(<div onMouseOut={onMouseOut}>Parent</div>);
      });

      const parentNode = parentContainer.firstChild!;
      const childNode = childContainer.firstChild!;

      parentNode.appendChild(childContainer);
      document.body.appendChild(parentContainer);

      try {
        childNode.dispatchEvent(new Event("mouseout", { bubbles: true, cancelable: true }));

        expect(mouseOut).toHaveBeenCalledTimes(2);
        expect(mouseOut).toHaveBeenNthCalledWith(1, childNode);
        expect(mouseOut).toHaveBeenNthCalledWith(2, parentNode);
      } finally {
        document.body.removeChild(parentContainer);
      }
    });

    it("should propagate events two levels down", async () => {
      const mouseOut = vi.fn();
      const onMouseOut = (event: React.MouseEvent) => mouseOut(event.currentTarget);

      const childContainer = document.createElement("div");
      const parentContainer = document.createElement("div");
      const grandParentContainer = document.createElement("div");

      const childRoot = ReactDOMClient.createRoot(childContainer);
      const parentRoot = ReactDOMClient.createRoot(parentContainer);
      const grandParentRoot = ReactDOMClient.createRoot(grandParentContainer);

      await act(() => {
        childRoot.render(<div onMouseOut={onMouseOut}>Child</div>);
        parentRoot.render(<div onMouseOut={onMouseOut}>Parent</div>);
        grandParentRoot.render(<div onMouseOut={onMouseOut}>Grandparent</div>);
      });

      const childNode = childContainer.firstChild!;
      const parentNode = parentContainer.firstChild!;
      const grandParentNode = grandParentContainer.firstChild!;

      parentNode.appendChild(childContainer);
      grandParentNode.appendChild(parentContainer);
      document.body.appendChild(grandParentContainer);

      try {
        childNode.dispatchEvent(new Event("mouseout", { bubbles: true, cancelable: true }));

        expect(mouseOut).toHaveBeenCalledTimes(3);
        expect(mouseOut).toHaveBeenNthCalledWith(1, childNode);
        expect(mouseOut).toHaveBeenNthCalledWith(2, parentNode);
        expect(mouseOut).toHaveBeenNthCalledWith(3, grandParentNode);
      } finally {
        document.body.removeChild(grandParentContainer);
      }
    });

    it("should not get confused by disappearing elements", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);

      try {
        const MyComponent = () => {
          const [clicked, setClicked] = React.useState(false);
          if (clicked) {
            return <span>clicked!</span>;
          }
          return <button onClick={() => setClicked(true)}>not yet clicked</button>;
        };

        const root = ReactDOMClient.createRoot(container);
        await act(() => {
          root.render(<MyComponent />);
        });
        await act(() => {
          container.firstChild!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });
        expect((container.firstChild as HTMLElement).textContent).toBe("clicked!");
      } finally {
        document.body.removeChild(container);
      }
    });

    it("should batch between handlers from different roots (discrete)", async () => {
      const mock = vi.fn();

      const childContainer = document.createElement("div");
      const parentContainer = document.createElement("main");

      const childRoot = ReactDOMClient.createRoot(childContainer);
      const parentRoot = ReactDOMClient.createRoot(parentContainer);
      let childSetState: React.Dispatch<React.SetStateAction<string | number>>;

      const Parent = () => {
        const [state] = React.useState("Parent");
        const handleClick = () => {
          childSetState(2);
          mock(childContainer.firstChild!.textContent);
        };
        return <section onClick={handleClick}>{state}</section>;
      };

      const Child = () => {
        const [state, setState] = React.useState<string | number>("Child");
        childSetState = setState;
        const handleClick = () => {
          setState(1);
          mock(childContainer.firstChild!.textContent);
        };
        return <span onClick={handleClick}>{state}</span>;
      };

      await act(() => {
        childRoot.render(<Child />);
        parentRoot.render(<Parent />);
      });

      const childNode = childContainer.firstChild!;
      const parentNode = parentContainer.firstChild!;

      parentNode.appendChild(childContainer);
      document.body.appendChild(parentContainer);

      try {
        await act(() => {
          childNode.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });

        expect(mock).toHaveBeenCalledTimes(2);
        expect(mock.mock.calls[0][0]).toBe("Child");
        expect(childNode.textContent).toBe("2");
      } finally {
        document.body.removeChild(parentContainer);
      }
    });

    it("should batch between handlers from different roots (continuous)", async () => {
      const mock = vi.fn();

      const childContainer = document.createElement("div");
      const parentContainer = document.createElement("main");

      const childRoot = ReactDOMClient.createRoot(childContainer);
      const parentRoot = ReactDOMClient.createRoot(parentContainer);
      let childSetState: React.Dispatch<React.SetStateAction<string | number>>;

      const Parent = () => {
        const [state] = React.useState("Parent");
        const handleMouseOut = () => {
          childSetState(2);
          mock(childContainer.firstChild!.textContent);
        };
        return <section onMouseOut={handleMouseOut}>{state}</section>;
      };

      const Child = () => {
        const [state, setState] = React.useState<string | number>("Child");
        childSetState = setState;
        const handleMouseOut = () => {
          setState(1);
          mock(childContainer.firstChild!.textContent);
        };
        return <span onMouseOut={handleMouseOut}>{state}</span>;
      };

      await act(() => {
        childRoot.render(<Child />);
        parentRoot.render(<Parent />);
      });

      const childNode = childContainer.firstChild!;
      const parentNode = parentContainer.firstChild!;

      parentNode.appendChild(childContainer);
      document.body.appendChild(parentContainer);

      try {
        await act(() => {
          childNode.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
        });

        expect(mock).toHaveBeenCalledTimes(2);
        expect(mock.mock.calls[0][0]).toBe("Child");
        expect(mock.mock.calls[1][0]).toBe("Child");
        expect(childNode.textContent).toBe("2");
      } finally {
        document.body.removeChild(parentContainer);
      }
    });
  });

  it("should not fire duplicate events for a React DOM tree", async () => {
    const mouseOut = vi.fn();
    const onMouseOut = (event: React.MouseEvent) => mouseOut(event.target);

    const innerRef = React.createRef<HTMLDivElement>();

    class Wrapper extends React.Component {
      render() {
        return (
          <div>
            <div onMouseOut={onMouseOut} id="outer">
              <div ref={innerRef}>Inner</div>
            </div>
          </div>
        );
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Wrapper />);
    });

    document.body.appendChild(container);

    try {
      await act(() => {
        innerRef.current!.dispatchEvent(new Event("mouseout", { bubbles: true, cancelable: true }));
      });

      expect(mouseOut).toHaveBeenCalledWith(innerRef.current);
    } finally {
      document.body.removeChild(container);
    }
  });

  it("should not fire form events twice", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const formRef = React.createRef<HTMLFormElement>();
    const inputRef = React.createRef<HTMLInputElement>();

    const handleInvalid = vi.fn();
    const handleReset = vi.fn();
    const handleSubmit = vi.fn();

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <form ref={formRef} onReset={handleReset} onSubmit={handleSubmit}>
          <input ref={inputRef} onInvalid={handleInvalid} />
        </form>,
      );
    });

    await act(() => {
      inputRef.current!.dispatchEvent(new Event("invalid", { bubbles: false }));
    });
    expect(handleInvalid).toHaveBeenCalledTimes(1);

    await act(() => {
      formRef.current!.dispatchEvent(new Event("reset", { bubbles: true }));
    });
    expect(handleReset).toHaveBeenCalledTimes(1);

    await act(() => {
      formRef.current!.dispatchEvent(new Event("submit", { bubbles: true }));
    });
    expect(handleSubmit).toHaveBeenCalledTimes(1);

    await act(() => {
      formRef.current!.dispatchEvent(new Event("submit", { bubbles: true }));
    });
    expect(handleSubmit).toHaveBeenCalledTimes(2);

    document.body.removeChild(container);
  });

  it("should not receive submit events if native, interim DOM handler prevents it", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    try {
      const formRef = React.createRef<HTMLFormElement>();
      const interimRef = React.createRef<HTMLDivElement>();

      const handleSubmit = vi.fn();
      const handleReset = vi.fn();
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div ref={interimRef}>
            <form ref={formRef} onSubmit={handleSubmit} onReset={handleReset} />
          </div>,
        );
      });

      interimRef.current!.onsubmit = (nativeEvent) => nativeEvent.stopPropagation();
      interimRef.current!.onreset = (nativeEvent) => nativeEvent.stopPropagation();

      await act(() => {
        formRef.current!.dispatchEvent(new Event("submit", { bubbles: true }));
        formRef.current!.dispatchEvent(new Event("reset", { bubbles: true }));
      });

      expect(handleSubmit).not.toHaveBeenCalled();
      expect(handleReset).not.toHaveBeenCalled();
    } finally {
      document.body.removeChild(container);
    }
  });

  it("should dispatch loadstart only for media elements", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    try {
      const imgRef = React.createRef<HTMLImageElement>();
      const videoRef = React.createRef<HTMLVideoElement>();

      const handleImgLoadStart = vi.fn();
      const handleVideoLoadStart = vi.fn();
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div>
            <img ref={imgRef} onLoadStart={handleImgLoadStart} />
            <video ref={videoRef} onLoadStart={handleVideoLoadStart} />
          </div>,
        );
      });

      await act(() => {
        imgRef.current!.dispatchEvent(new ProgressEvent("loadstart", { bubbles: false }));
      });
      expect(handleImgLoadStart).toHaveBeenCalledTimes(0);

      await act(() => {
        videoRef.current!.dispatchEvent(new ProgressEvent("loadstart", { bubbles: false }));
      });
      expect(handleVideoLoadStart).toHaveBeenCalledTimes(1);
    } finally {
      document.body.removeChild(container);
    }
  });

  it("should not attempt to listen to unnecessary events on the top level", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const videoRef = React.createRef<HTMLVideoElement>();
    const handleVideoPlay = vi.fn();
    const handleVideoPlayDelegated = vi.fn();
    const mediaEvents = {
      onAbort() {},
      onCanPlay() {},
      onCanPlayThrough() {},
      onDurationChange() {},
      onEmptied() {},
      onEncrypted() {},
      onEnded() {},
      onError() {},
      onLoadedData() {},
      onLoadedMetadata() {},
      onLoadStart() {},
      onPause() {},
      onPlay() {},
      onPlaying() {},
      onProgress() {},
      onRateChange() {},
      onResize() {},
      onSeeked() {},
      onSeeking() {},
      onStalled() {},
      onSuspend() {},
      onTimeUpdate() {},
      onVolumeChange() {},
      onWaiting() {},
    };

    const originalDocAddEventListener = document.addEventListener;
    const originalRootAddEventListener = container.addEventListener;
    document.addEventListener = function (type: string) {
      switch (type) {
        case "selectionchange":
          break;
        default:
          throw new Error(
            `Did not expect to add a document-level listener for the "${type}" event.`,
          );
      }
    } as typeof document.addEventListener;
    container.addEventListener = function (
      type: string,
      _handler: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (options && (options === true || (typeof options === "object" && options.capture))) {
        return;
      }
      const mediaEventTypes = [
        "abort",
        "canplay",
        "canplaythrough",
        "durationchange",
        "emptied",
        "encrypted",
        "ended",
        "error",
        "loadeddata",
        "loadedmetadata",
        "loadstart",
        "pause",
        "play",
        "playing",
        "progress",
        "ratechange",
        "resize",
        "seeked",
        "seeking",
        "stalled",
        "suspend",
        "timeupdate",
        "volumechange",
        "waiting",
      ];
      if (mediaEventTypes.includes(type)) {
        throw new Error(`Did not expect to add a root-level listener for the "${type}" event.`);
      }
    } as typeof container.addEventListener;

    try {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div onPlay={handleVideoPlayDelegated}>
            <video ref={videoRef} {...mediaEvents} onPlay={handleVideoPlay} />
            <audio {...mediaEvents}>
              <source {...mediaEvents} />
            </audio>
          </div>,
        );
      });
      await act(() => {
        videoRef.current!.dispatchEvent(new Event("play", { bubbles: false }));
      });
      expect(handleVideoPlay).toHaveBeenCalledTimes(1);
      expect(handleVideoPlayDelegated).toHaveBeenCalledTimes(1);
    } finally {
      document.addEventListener = originalDocAddEventListener;
      container.addEventListener = originalRootAddEventListener;
      document.body.removeChild(container);
    }
  });

  it("should dispatch load for embed elements", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    try {
      const embedRef = React.createRef<HTMLEmbedElement>();
      const handleLoad = vi.fn();
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div>
            <embed ref={embedRef} onLoad={handleLoad} />
          </div>,
        );
      });
      await act(() => {
        embedRef.current!.dispatchEvent(new ProgressEvent("load", { bubbles: false }));
      });

      expect(handleLoad).toHaveBeenCalledTimes(1);
    } finally {
      document.body.removeChild(container);
    }
  });

  it("should delegate media events even without a direct listener", async () => {
    const container = document.createElement("div");
    const videoRef = React.createRef<HTMLVideoElement>();
    const handleVideoPlayDelegated = vi.fn();
    document.body.appendChild(container);
    try {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div onPlay={handleVideoPlayDelegated}>
            <video ref={videoRef} />
          </div>,
        );
      });

      await act(() => {
        videoRef.current!.dispatchEvent(new Event("play", { bubbles: false }));
      });
      expect(handleVideoPlayDelegated).toHaveBeenCalledTimes(1);
    } finally {
      document.body.removeChild(container);
    }
  });

  it("should delegate dialog events even without a direct listener", async () => {
    const container = document.createElement("div");
    const dialogRef = React.createRef<HTMLDialogElement>();
    const onCancel = vi.fn();
    const onClose = vi.fn();
    document.body.appendChild(container);
    try {
      const root = ReactDOMClient.createRoot(container);
      const cancelCloseProps = { onCancel, onClose };
      await act(() => {
        root.render(
          <div {...cancelCloseProps}>
            <dialog ref={dialogRef} />
          </div>,
        );
      });
      await act(() => {
        dialogRef.current!.dispatchEvent(new Event("close", { bubbles: false }));
        dialogRef.current!.dispatchEvent(new Event("cancel", { bubbles: false }));
      });
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      document.body.removeChild(container);
    }
  });

  it("should bubble non-native bubbling toggle events", async () => {
    const container = document.createElement("div");
    const detailsRef = React.createRef<HTMLDetailsElement>();
    const onToggle = vi.fn();
    document.body.appendChild(container);
    try {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div onToggle={onToggle}>
            <details ref={detailsRef} onToggle={onToggle} />
          </div>,
        );
      });
      await act(() => {
        detailsRef.current!.dispatchEvent(new Event("toggle", { bubbles: false }));
      });
      expect(onToggle).toHaveBeenCalledTimes(2);
    } finally {
      document.body.removeChild(container);
    }
  });

  it("should bubble non-native bubbling cancel/close events", async () => {
    const container = document.createElement("div");
    const dialogRef = React.createRef<HTMLDialogElement>();
    const onCancel = vi.fn();
    const onClose = vi.fn();
    document.body.appendChild(container);
    try {
      const root = ReactDOMClient.createRoot(container);
      const cancelCloseProps = { onCancel, onClose };
      await act(() => {
        root.render(
          <div {...cancelCloseProps}>
            <dialog ref={dialogRef} {...cancelCloseProps} />
          </div>,
        );
      });
      await act(() => {
        dialogRef.current!.dispatchEvent(new Event("cancel", { bubbles: false }));
        dialogRef.current!.dispatchEvent(new Event("close", { bubbles: false }));
      });
      expect(onCancel).toHaveBeenCalledTimes(2);
      expect(onClose).toHaveBeenCalledTimes(2);
    } finally {
      document.body.removeChild(container);
    }
  });

  it("should bubble non-native bubbling media events events", async () => {
    const container = document.createElement("div");
    const videoRef = React.createRef<HTMLVideoElement>();
    const onPlay = vi.fn();
    document.body.appendChild(container);
    try {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div onPlay={onPlay}>
            <video ref={videoRef} onPlay={onPlay} />
          </div>,
        );
      });
      await act(() => {
        videoRef.current!.dispatchEvent(new Event("play", { bubbles: false }));
      });
      expect(onPlay).toHaveBeenCalledTimes(2);
    } finally {
      document.body.removeChild(container);
    }
  });

  it("should bubble non-native bubbling invalid events", async () => {
    const container = document.createElement("div");
    const inputRef = React.createRef<HTMLInputElement>();
    const onInvalid = vi.fn();
    document.body.appendChild(container);
    try {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <form onInvalid={onInvalid}>
            <input ref={inputRef} onInvalid={onInvalid} />
          </form>,
        );
      });

      await act(() => {
        inputRef.current!.dispatchEvent(new Event("invalid", { bubbles: false }));
      });
      expect(onInvalid).toHaveBeenCalledTimes(2);
    } finally {
      document.body.removeChild(container);
    }
  });

  it("should handle non-bubbling capture events correctly", async () => {
    const container = document.createElement("div");
    const innerRef = React.createRef<HTMLDivElement>();
    const outerRef = React.createRef<HTMLDivElement>();
    const eventTargets: EventTarget[] = [];
    const onPlayCapture = vi.fn((event: React.SyntheticEvent) =>
      eventTargets.push(event.currentTarget),
    );
    document.body.appendChild(container);
    try {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div ref={outerRef} onPlayCapture={onPlayCapture}>
            <div onPlayCapture={onPlayCapture}>
              <div ref={innerRef} onPlayCapture={onPlayCapture} />
            </div>
          </div>,
        );
      });
      await act(() => {
        innerRef.current!.dispatchEvent(new Event("play", { bubbles: false }));
      });
      expect(onPlayCapture).toHaveBeenCalledTimes(3);
      expect(eventTargets).toEqual([
        outerRef.current,
        outerRef.current!.firstChild,
        innerRef.current,
      ]);
      await act(() => {
        outerRef.current!.dispatchEvent(new Event("play", { bubbles: false }));
      });
      expect(onPlayCapture).toHaveBeenCalledTimes(4);
      expect(eventTargets).toEqual([
        outerRef.current,
        outerRef.current!.firstChild,
        innerRef.current,
        outerRef.current,
      ]);
    } finally {
      document.body.removeChild(container);
    }
  });

  it("should not emulate bubbling of scroll events", async () => {
    const container = document.createElement("div");
    const childRef = React.createRef<HTMLDivElement>();
    const eventLog: [string, string, string][] = [];
    const onScroll = vi.fn((event: React.UIEvent<HTMLDivElement>) =>
      eventLog.push(["onScroll", "bubble", event.currentTarget.className]),
    );
    const onScrollCapture = vi.fn((event: React.UIEvent<HTMLDivElement>) =>
      eventLog.push(["onScroll", "capture", event.currentTarget.className]),
    );
    const onScrollEnd = vi.fn((event: React.UIEvent<HTMLDivElement>) =>
      eventLog.push(["onScrollEnd", "bubble", event.currentTarget.className]),
    );
    const onScrollEndCapture = vi.fn((event: React.UIEvent<HTMLDivElement>) =>
      eventLog.push(["onScrollEnd", "capture", event.currentTarget.className]),
    );
    document.body.appendChild(container);
    try {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div
            className="grand"
            onScroll={onScroll}
            onScrollCapture={onScrollCapture}
            onScrollEnd={onScrollEnd}
            onScrollEndCapture={onScrollEndCapture}
          >
            <div
              className="parent"
              onScroll={onScroll}
              onScrollCapture={onScrollCapture}
              onScrollEnd={onScrollEnd}
              onScrollEndCapture={onScrollEndCapture}
            >
              <div
                className="child"
                onScroll={onScroll}
                onScrollCapture={onScrollCapture}
                onScrollEnd={onScrollEnd}
                onScrollEndCapture={onScrollEndCapture}
                ref={childRef}
              />
            </div>
          </div>,
        );
      });

      await act(() => {
        childRef.current!.dispatchEvent(new Event("scroll", { bubbles: false }));
        childRef.current!.dispatchEvent(new Event("scrollend", { bubbles: false }));
      });
      expect(eventLog).toEqual([
        ["onScroll", "capture", "grand"],
        ["onScroll", "capture", "parent"],
        ["onScroll", "capture", "child"],
        ["onScroll", "bubble", "child"],
        ["onScrollEnd", "capture", "grand"],
        ["onScrollEnd", "capture", "parent"],
        ["onScrollEnd", "capture", "child"],
        ["onScrollEnd", "bubble", "child"],
      ]);
    } finally {
      document.body.removeChild(container);
    }
  });

  it("should not emulate bubbling of scroll events (no own handler)", async () => {
    const container = document.createElement("div");
    const childRef = React.createRef<HTMLDivElement>();
    const eventLog: [string, string, string][] = [];
    const onScroll = vi.fn((event: React.UIEvent<HTMLDivElement>) =>
      eventLog.push(["onScroll", "bubble", event.currentTarget.className]),
    );
    const onScrollCapture = vi.fn((event: React.UIEvent<HTMLDivElement>) =>
      eventLog.push(["onScroll", "capture", event.currentTarget.className]),
    );
    const onScrollEnd = vi.fn((event: React.UIEvent<HTMLDivElement>) =>
      eventLog.push(["onScrollEnd", "bubble", event.currentTarget.className]),
    );
    const onScrollEndCapture = vi.fn((event: React.UIEvent<HTMLDivElement>) =>
      eventLog.push(["onScrollEnd", "capture", event.currentTarget.className]),
    );
    document.body.appendChild(container);
    try {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div
            className="grand"
            onScroll={onScroll}
            onScrollCapture={onScrollCapture}
            onScrollEnd={onScrollEnd}
            onScrollEndCapture={onScrollEndCapture}
          >
            <div
              className="parent"
              onScroll={onScroll}
              onScrollCapture={onScrollCapture}
              onScrollEnd={onScrollEnd}
              onScrollEndCapture={onScrollEndCapture}
            >
              <div className="child" ref={childRef} />
            </div>
          </div>,
        );
      });
      await act(() => {
        childRef.current!.dispatchEvent(new Event("scroll", { bubbles: false }));
        childRef.current!.dispatchEvent(new Event("scrollend", { bubbles: false }));
      });
      expect(eventLog).toEqual([
        ["onScroll", "capture", "grand"],
        ["onScroll", "capture", "parent"],
        ["onScrollEnd", "capture", "grand"],
        ["onScrollEnd", "capture", "parent"],
      ]);
    } finally {
      document.body.removeChild(container);
    }
  });

  it("should subscribe to scroll during updates", async () => {
    const container = document.createElement("div");
    const childRef = React.createRef<HTMLDivElement>();
    const eventLog: [string, string, string][] = [];
    const onScroll = vi.fn((event: React.UIEvent<HTMLDivElement>) =>
      eventLog.push(["onScroll", "bubble", event.currentTarget.className]),
    );
    const onScrollCapture = vi.fn((event: React.UIEvent<HTMLDivElement>) =>
      eventLog.push(["onScroll", "capture", event.currentTarget.className]),
    );
    const onScrollEnd = vi.fn((event: React.UIEvent<HTMLDivElement>) =>
      eventLog.push(["onScrollEnd", "bubble", event.currentTarget.className]),
    );
    const onScrollEndCapture = vi.fn((event: React.UIEvent<HTMLDivElement>) =>
      eventLog.push(["onScrollEnd", "capture", event.currentTarget.className]),
    );
    document.body.appendChild(container);
    try {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div>
            <div>
              <div />
            </div>
          </div>,
        );
      });

      await act(() => {
        root.render(
          <div
            className="grand"
            onScroll={(event) => onScroll(event)}
            onScrollCapture={(event) => onScrollCapture(event)}
            onScrollEnd={(event) => onScrollEnd(event)}
            onScrollEndCapture={(event) => onScrollEndCapture(event)}
          >
            <div
              className="parent"
              onScroll={(event) => onScroll(event)}
              onScrollCapture={(event) => onScrollCapture(event)}
              onScrollEnd={(event) => onScrollEnd(event)}
              onScrollEndCapture={(event) => onScrollEndCapture(event)}
            >
              <div
                className="child"
                onScroll={(event) => onScroll(event)}
                onScrollCapture={(event) => onScrollCapture(event)}
                onScrollEnd={(event) => onScrollEnd(event)}
                onScrollEndCapture={(event) => onScrollEndCapture(event)}
                ref={childRef}
              />
            </div>
          </div>,
        );
      });

      await act(() => {
        childRef.current!.dispatchEvent(new Event("scroll", { bubbles: false }));
        childRef.current!.dispatchEvent(new Event("scrollend", { bubbles: false }));
      });
      expect(eventLog).toEqual([
        ["onScroll", "capture", "grand"],
        ["onScroll", "capture", "parent"],
        ["onScroll", "capture", "child"],
        ["onScroll", "bubble", "child"],
        ["onScrollEnd", "capture", "grand"],
        ["onScrollEnd", "capture", "parent"],
        ["onScrollEnd", "capture", "child"],
        ["onScrollEnd", "bubble", "child"],
      ]);

      eventLog.length = 0;
      await act(() => {
        root.render(
          <div
            className="grand"
            onScroll={(event) => onScroll(event)}
            onScrollCapture={(event) => onScrollCapture(event)}
            onScrollEnd={(event) => onScrollEnd(event)}
            onScrollEndCapture={(event) => onScrollEndCapture(event)}
          >
            <div
              className="parent"
              onScroll={(event) => onScroll(event)}
              onScrollCapture={(event) => onScrollCapture(event)}
              onScrollEnd={(event) => onScrollEnd(event)}
              onScrollEndCapture={(event) => onScrollEndCapture(event)}
            >
              <div
                className="child"
                onScroll={(event) => onScroll(event)}
                onScrollCapture={(event) => onScrollCapture(event)}
                onScrollEnd={(event) => onScrollEnd(event)}
                onScrollEndCapture={(event) => onScrollEndCapture(event)}
                ref={childRef}
              />
            </div>
          </div>,
        );
      });
      await act(() => {
        childRef.current!.dispatchEvent(new Event("scroll", { bubbles: false }));
        childRef.current!.dispatchEvent(new Event("scrollend", { bubbles: false }));
      });
      expect(eventLog).toEqual([
        ["onScroll", "capture", "grand"],
        ["onScroll", "capture", "parent"],
        ["onScroll", "capture", "child"],
        ["onScroll", "bubble", "child"],
        ["onScrollEnd", "capture", "grand"],
        ["onScrollEnd", "capture", "parent"],
        ["onScrollEnd", "capture", "child"],
        ["onScrollEnd", "bubble", "child"],
      ]);

      eventLog.length = 0;
      await act(() => {
        root.render(
          <div>
            <div>
              <div ref={childRef} />
            </div>
          </div>,
        );
      });
      await act(() => {
        childRef.current!.dispatchEvent(new Event("scroll", { bubbles: false }));
        childRef.current!.dispatchEvent(new Event("scrollend", { bubbles: false }));
      });
      expect(eventLog).toEqual([]);
    } finally {
      document.body.removeChild(container);
    }
  });

  it("should subscribe to scroll during hydration", async () => {
    const container = document.createElement("div");
    const childRef = React.createRef<HTMLDivElement>();
    const eventLog: [string, string, string][] = [];
    const onScroll = vi.fn((event: React.UIEvent<HTMLDivElement>) =>
      eventLog.push(["onScroll", "bubble", event.currentTarget.className]),
    );
    const onScrollCapture = vi.fn((event: React.UIEvent<HTMLDivElement>) =>
      eventLog.push(["onScroll", "capture", event.currentTarget.className]),
    );
    const onScrollEnd = vi.fn((event: React.UIEvent<HTMLDivElement>) =>
      eventLog.push(["onScrollEnd", "bubble", event.currentTarget.className]),
    );
    const onScrollEndCapture = vi.fn((event: React.UIEvent<HTMLDivElement>) =>
      eventLog.push(["onScrollEnd", "capture", event.currentTarget.className]),
    );

    const tree = (
      <div
        className="grand"
        onScroll={onScroll}
        onScrollCapture={onScrollCapture}
        onScrollEnd={onScrollEnd}
        onScrollEndCapture={onScrollEndCapture}
      >
        <div
          className="parent"
          onScroll={onScroll}
          onScrollCapture={onScrollCapture}
          onScrollEnd={onScrollEnd}
          onScrollEndCapture={onScrollEndCapture}
        >
          <div
            className="child"
            onScroll={onScroll}
            onScrollCapture={onScrollCapture}
            onScrollEnd={onScrollEnd}
            onScrollEndCapture={onScrollEndCapture}
            ref={childRef}
          />
        </div>
      </div>
    );
    document.body.appendChild(container);
    try {
      container.innerHTML = ReactDOMServer.renderToString(tree);
      let root: ReturnType<typeof ReactDOMClient.hydrateRoot>;
      await act(() => {
        root = ReactDOMClient.hydrateRoot(container, tree);
      });
      await act(() => {
        childRef.current!.dispatchEvent(new Event("scroll", { bubbles: false }));
        childRef.current!.dispatchEvent(new Event("scrollend", { bubbles: false }));
      });
      expect(eventLog).toEqual([
        ["onScroll", "capture", "grand"],
        ["onScroll", "capture", "parent"],
        ["onScroll", "capture", "child"],
        ["onScroll", "bubble", "child"],
        ["onScrollEnd", "capture", "grand"],
        ["onScrollEnd", "capture", "parent"],
        ["onScrollEnd", "capture", "child"],
        ["onScrollEnd", "bubble", "child"],
      ]);

      eventLog.length = 0;
      await act(() => {
        root!.render(
          <div>
            <div>
              <div ref={childRef} />
            </div>
          </div>,
        );
      });
      await act(() => {
        childRef.current!.dispatchEvent(new Event("scroll", { bubbles: false }));
        childRef.current!.dispatchEvent(new Event("scrollend", { bubbles: false }));
      });
      expect(eventLog).toEqual([]);
    } finally {
      document.body.removeChild(container);
    }
  });

  it("should not subscribe to selectionchange twice", async () => {
    const selectionchangeLog: (boolean | AddEventListenerOptions | undefined)[] = [];

    const originalDocAddEventListener = document.addEventListener;
    document.addEventListener = function (
      this: Document,
      type: string,
      handler: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (type === "selectionchange") {
        selectionchangeLog.push(options);
      }
      return originalDocAddEventListener.call(this, type, handler, options);
    } as typeof document.addEventListener;
    try {
      const rootOne = ReactDOMClient.createRoot(document.createElement("div"));
      const rootTwo = ReactDOMClient.createRoot(document.createElement("div"));

      await act(() => {
        rootOne.render(<input />);
        rootTwo.render(<input />);
      });
    } finally {
      document.addEventListener = originalDocAddEventListener;
    }

    expect(selectionchangeLog.length).toBeLessThanOrEqual(1);
  });
});
