import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act } from "./utils";

interface EventConfig {
  type: string;
  reactEvent: string;
  reactEventType: string;
  nativeEvent: string;
  targetProps?: Record<string, unknown>;
  dispatch: (node: HTMLElement) => void;
}

describe("ReactDOMEventPropagation", () => {
  let container: HTMLDivElement | null = null;
  let root: ReactDOMClient.Root | null = null;

  async function cleanup() {
    if (container) {
      await act(() => {
        root!.unmount();
      });
      document.body.removeChild(container);
      container = null;
      root = null;
    }
  }

  async function render(tree: React.ReactNode) {
    await cleanup();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root!.render(tree);
    });
  }

  beforeEach(() => {
    (window as unknown as Record<string, unknown>).TextEvent = function () {};
  });

  afterEach(async () => {
    await cleanup();
  });

  describe("bubbling events", () => {
    it("onAnimationEnd", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onAnimationEnd",
        reactEventType: "animationend",
        nativeEvent: "animationend",
        dispatch(node) {
          node.dispatchEvent(new Event("animationend", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onAnimationIteration", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onAnimationIteration",
        reactEventType: "animationiteration",
        nativeEvent: "animationiteration",
        dispatch(node) {
          node.dispatchEvent(
            new Event("animationiteration", {
              bubbles: true,
              cancelable: true,
            }),
          );
        },
      });
    });

    it("onAnimationStart", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onAnimationStart",
        reactEventType: "animationstart",
        nativeEvent: "animationstart",
        dispatch(node) {
          node.dispatchEvent(new Event("animationstart", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onAuxClick", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onAuxClick",
        reactEventType: "auxclick",
        nativeEvent: "auxclick",
        dispatch(node) {
          node.dispatchEvent(new KeyboardEvent("auxclick", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onBlur", async () => {
      await testNativeBubblingEvent({
        type: "input",
        reactEvent: "onBlur",
        reactEventType: "blur",
        nativeEvent: "focusout",
        dispatch(node) {
          node.dispatchEvent(new Event("focusout", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onClick", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onClick",
        reactEventType: "click",
        nativeEvent: "click",
        dispatch(node) {
          node.click();
        },
      });
    });

    it("onContextMenu", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onContextMenu",
        reactEventType: "contextmenu",
        nativeEvent: "contextmenu",
        dispatch(node) {
          node.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onCopy", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onCopy",
        reactEventType: "copy",
        nativeEvent: "copy",
        dispatch(node) {
          node.dispatchEvent(new Event("copy", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onCut", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onCut",
        reactEventType: "cut",
        nativeEvent: "cut",
        dispatch(node) {
          node.dispatchEvent(new Event("cut", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onDoubleClick", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onDoubleClick",
        reactEventType: "dblclick",
        nativeEvent: "dblclick",
        dispatch(node) {
          node.dispatchEvent(new KeyboardEvent("dblclick", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onDrag", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onDrag",
        reactEventType: "drag",
        nativeEvent: "drag",
        dispatch(node) {
          node.dispatchEvent(new MouseEvent("drag", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onDragEnd", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onDragEnd",
        reactEventType: "dragend",
        nativeEvent: "dragend",
        dispatch(node) {
          node.dispatchEvent(new MouseEvent("dragend", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onDragEnter", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onDragEnter",
        reactEventType: "dragenter",
        nativeEvent: "dragenter",
        dispatch(node) {
          node.dispatchEvent(new MouseEvent("dragenter", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onDragExit", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onDragExit",
        reactEventType: "dragexit",
        nativeEvent: "dragexit",
        dispatch(node) {
          node.dispatchEvent(new MouseEvent("dragexit", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onDragLeave", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onDragLeave",
        reactEventType: "dragleave",
        nativeEvent: "dragleave",
        dispatch(node) {
          node.dispatchEvent(new MouseEvent("dragleave", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onDragOver", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onDragOver",
        reactEventType: "dragover",
        nativeEvent: "dragover",
        dispatch(node) {
          node.dispatchEvent(new MouseEvent("dragover", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onDragStart", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onDragStart",
        reactEventType: "dragstart",
        nativeEvent: "dragstart",
        dispatch(node) {
          node.dispatchEvent(new MouseEvent("dragstart", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onDrop", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onDrop",
        reactEventType: "drop",
        nativeEvent: "drop",
        dispatch(node) {
          node.dispatchEvent(new MouseEvent("drop", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onFocus", async () => {
      await testNativeBubblingEvent({
        type: "input",
        reactEvent: "onFocus",
        reactEventType: "focus",
        nativeEvent: "focusin",
        dispatch(node) {
          node.dispatchEvent(new Event("focusin", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onGotPointerCapture", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onGotPointerCapture",
        reactEventType: "gotpointercapture",
        nativeEvent: "gotpointercapture",
        dispatch(node) {
          node.dispatchEvent(
            new Event("gotpointercapture", {
              bubbles: true,
              cancelable: true,
            }),
          );
        },
      });
    });

    it("onKeyDown", async () => {
      await testNativeBubblingEvent({
        type: "input",
        reactEvent: "onKeyDown",
        reactEventType: "keydown",
        nativeEvent: "keydown",
        dispatch(node) {
          node.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onKeyPress", async () => {
      await testNativeBubblingEvent({
        type: "input",
        reactEvent: "onKeyPress",
        reactEventType: "keypress",
        nativeEvent: "keypress",
        dispatch(node) {
          node.dispatchEvent(
            new KeyboardEvent("keypress", {
              keyCode: 13,
              bubbles: true,
              cancelable: true,
            }),
          );
        },
      });
    });

    it("onKeyUp", async () => {
      await testNativeBubblingEvent({
        type: "input",
        reactEvent: "onKeyUp",
        reactEventType: "keyup",
        nativeEvent: "keyup",
        dispatch(node) {
          node.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onLostPointerCapture", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onLostPointerCapture",
        reactEventType: "lostpointercapture",
        nativeEvent: "lostpointercapture",
        dispatch(node) {
          node.dispatchEvent(
            new Event("lostpointercapture", {
              bubbles: true,
              cancelable: true,
            }),
          );
        },
      });
    });

    it("onMouseDown", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onMouseDown",
        reactEventType: "mousedown",
        nativeEvent: "mousedown",
        dispatch(node) {
          node.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onMouseOut", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onMouseOut",
        reactEventType: "mouseout",
        nativeEvent: "mouseout",
        dispatch(node) {
          node.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onMouseOver", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onMouseOver",
        reactEventType: "mouseover",
        nativeEvent: "mouseover",
        dispatch(node) {
          node.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onMouseUp", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onMouseUp",
        reactEventType: "mouseup",
        nativeEvent: "mouseup",
        dispatch(node) {
          node.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onPaste", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onPaste",
        reactEventType: "paste",
        nativeEvent: "paste",
        dispatch(node) {
          node.dispatchEvent(new Event("paste", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onPointerCancel", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onPointerCancel",
        reactEventType: "pointercancel",
        nativeEvent: "pointercancel",
        dispatch(node) {
          node.dispatchEvent(new Event("pointercancel", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onPointerDown", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onPointerDown",
        reactEventType: "pointerdown",
        nativeEvent: "pointerdown",
        dispatch(node) {
          node.dispatchEvent(new Event("pointerdown", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onPointerMove", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onPointerMove",
        reactEventType: "pointermove",
        nativeEvent: "pointermove",
        dispatch(node) {
          node.dispatchEvent(new Event("pointermove", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onPointerOut", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onPointerOut",
        reactEventType: "pointerout",
        nativeEvent: "pointerout",
        dispatch(node) {
          node.dispatchEvent(new Event("pointerout", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onPointerOver", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onPointerOver",
        reactEventType: "pointerover",
        nativeEvent: "pointerover",
        dispatch(node) {
          node.dispatchEvent(new Event("pointerover", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onPointerUp", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onPointerUp",
        reactEventType: "pointerup",
        nativeEvent: "pointerup",
        dispatch(node) {
          node.dispatchEvent(new Event("pointerup", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onReset", async () => {
      await testNativeBubblingEvent({
        type: "form",
        reactEvent: "onReset",
        reactEventType: "reset",
        nativeEvent: "reset",
        dispatch(node) {
          node.dispatchEvent(new Event("reset", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onSubmit", async () => {
      await testNativeBubblingEvent({
        type: "form",
        reactEvent: "onSubmit",
        reactEventType: "submit",
        nativeEvent: "submit",
        dispatch(node) {
          node.dispatchEvent(
            new SubmitEvent("submit", {
              bubbles: true,
              cancelable: true,
              submitter: null,
            }),
          );
        },
      });
    });

    it("onTouchCancel", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onTouchCancel",
        reactEventType: "touchcancel",
        nativeEvent: "touchcancel",
        dispatch(node) {
          node.dispatchEvent(new Event("touchcancel", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onTouchEnd", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onTouchEnd",
        reactEventType: "touchend",
        nativeEvent: "touchend",
        dispatch(node) {
          node.dispatchEvent(new Event("touchend", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onTouchMove", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onTouchMove",
        reactEventType: "touchmove",
        nativeEvent: "touchmove",
        dispatch(node) {
          node.dispatchEvent(new Event("touchmove", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onTouchStart", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onTouchStart",
        reactEventType: "touchstart",
        nativeEvent: "touchstart",
        dispatch(node) {
          node.dispatchEvent(new Event("touchstart", { bubbles: true, cancelable: true }));
        },
      });
    });

    it("onTransitionRun", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onTransitionRun",
        reactEventType: "transitionrun",
        nativeEvent: "transitionrun",
        dispatch(node) {
          node.dispatchEvent(new Event("transitionrun", { bubbles: true, cancelable: false }));
        },
      });
    });

    it("onTransitionStart", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onTransitionStart",
        reactEventType: "transitionstart",
        nativeEvent: "transitionstart",
        dispatch(node) {
          node.dispatchEvent(new Event("transitionstart", { bubbles: true, cancelable: false }));
        },
      });
    });

    it("onTransitionCancel", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onTransitionCancel",
        reactEventType: "transitioncancel",
        nativeEvent: "transitioncancel",
        dispatch(node) {
          node.dispatchEvent(
            new Event("transitioncancel", {
              bubbles: true,
              cancelable: false,
            }),
          );
        },
      });
    });

    it("onTransitionEnd", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onTransitionEnd",
        reactEventType: "transitionend",
        nativeEvent: "transitionend",
        dispatch(node) {
          node.dispatchEvent(new Event("transitionend", { bubbles: true, cancelable: false }));
        },
      });
    });

    it("onWheel", async () => {
      await testNativeBubblingEvent({
        type: "div",
        reactEvent: "onWheel",
        reactEventType: "wheel",
        nativeEvent: "wheel",
        dispatch(node) {
          node.dispatchEvent(new Event("wheel", { bubbles: true, cancelable: true }));
        },
      });
    });
  });

  describe("non-bubbling events that bubble in React", () => {
    it("onAbort", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onAbort",
        reactEventType: "abort",
        nativeEvent: "abort",
        dispatch(node) {
          node.dispatchEvent(new Event("abort", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onCancel", async () => {
      await testEmulatedBubblingEvent({
        type: "dialog",
        reactEvent: "onCancel",
        reactEventType: "cancel",
        nativeEvent: "cancel",
        dispatch(node) {
          node.dispatchEvent(new Event("cancel", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onCanPlay", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onCanPlay",
        reactEventType: "canplay",
        nativeEvent: "canplay",
        dispatch(node) {
          node.dispatchEvent(new Event("canplay", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onCanPlayThrough", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onCanPlayThrough",
        reactEventType: "canplaythrough",
        nativeEvent: "canplaythrough",
        dispatch(node) {
          node.dispatchEvent(new Event("canplaythrough", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onClose", async () => {
      await testEmulatedBubblingEvent({
        type: "dialog",
        reactEvent: "onClose",
        reactEventType: "close",
        nativeEvent: "close",
        dispatch(node) {
          node.dispatchEvent(new Event("close", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onDurationChange", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onDurationChange",
        reactEventType: "durationchange",
        nativeEvent: "durationchange",
        dispatch(node) {
          node.dispatchEvent(new Event("durationchange", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onEmptied", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onEmptied",
        reactEventType: "emptied",
        nativeEvent: "emptied",
        dispatch(node) {
          node.dispatchEvent(new Event("emptied", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onEncrypted", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onEncrypted",
        reactEventType: "encrypted",
        nativeEvent: "encrypted",
        dispatch(node) {
          node.dispatchEvent(new Event("encrypted", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onEnded", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onEnded",
        reactEventType: "ended",
        nativeEvent: "ended",
        dispatch(node) {
          node.dispatchEvent(new Event("ended", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onError", async () => {
      await testEmulatedBubblingEvent({
        type: "img",
        reactEvent: "onError",
        reactEventType: "error",
        nativeEvent: "error",
        dispatch(node) {
          node.dispatchEvent(new Event("error", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onInvalid", async () => {
      await testEmulatedBubblingEvent({
        type: "input",
        reactEvent: "onInvalid",
        reactEventType: "invalid",
        nativeEvent: "invalid",
        dispatch(node) {
          node.dispatchEvent(new Event("invalid", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onLoad", async () => {
      await testEmulatedBubblingEvent({
        type: "img",
        reactEvent: "onLoad",
        reactEventType: "load",
        nativeEvent: "load",
        dispatch(node) {
          node.dispatchEvent(new Event("load", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onLoadedData", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onLoadedData",
        reactEventType: "loadeddata",
        nativeEvent: "loadeddata",
        dispatch(node) {
          node.dispatchEvent(new Event("loadeddata", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onLoadedMetadata", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onLoadedMetadata",
        reactEventType: "loadedmetadata",
        nativeEvent: "loadedmetadata",
        dispatch(node) {
          node.dispatchEvent(new Event("loadedmetadata", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onLoadStart", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onLoadStart",
        reactEventType: "loadstart",
        nativeEvent: "loadstart",
        dispatch(node) {
          node.dispatchEvent(new Event("loadstart", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onPause", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onPause",
        reactEventType: "pause",
        nativeEvent: "pause",
        dispatch(node) {
          node.dispatchEvent(new Event("pause", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onPlay", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onPlay",
        reactEventType: "play",
        nativeEvent: "play",
        dispatch(node) {
          node.dispatchEvent(new Event("play", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onPlaying", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onPlaying",
        reactEventType: "playing",
        nativeEvent: "playing",
        dispatch(node) {
          node.dispatchEvent(new Event("playing", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onProgress", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onProgress",
        reactEventType: "progress",
        nativeEvent: "progress",
        dispatch(node) {
          node.dispatchEvent(new Event("progress", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onRateChange", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onRateChange",
        reactEventType: "ratechange",
        nativeEvent: "ratechange",
        dispatch(node) {
          node.dispatchEvent(new Event("ratechange", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onResize", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onResize",
        reactEventType: "resize",
        nativeEvent: "resize",
        dispatch(node) {
          node.dispatchEvent(new Event("resize", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onSeeked", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onSeeked",
        reactEventType: "seeked",
        nativeEvent: "seeked",
        dispatch(node) {
          node.dispatchEvent(new Event("seeked", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onSeeking", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onSeeking",
        reactEventType: "seeking",
        nativeEvent: "seeking",
        dispatch(node) {
          node.dispatchEvent(new Event("seeking", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onStalled", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onStalled",
        reactEventType: "stalled",
        nativeEvent: "stalled",
        dispatch(node) {
          node.dispatchEvent(new Event("stalled", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onSuspend", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onSuspend",
        reactEventType: "suspend",
        nativeEvent: "suspend",
        dispatch(node) {
          node.dispatchEvent(new Event("suspend", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onTimeUpdate", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onTimeUpdate",
        reactEventType: "timeupdate",
        nativeEvent: "timeupdate",
        dispatch(node) {
          node.dispatchEvent(new Event("timeupdate", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onToggle", async () => {
      await testEmulatedBubblingEvent({
        type: "details",
        reactEvent: "onToggle",
        reactEventType: "toggle",
        nativeEvent: "toggle",
        dispatch(node) {
          node.dispatchEvent(new Event("toggle", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onBeforeToggle Popover API", async () => {
      await testEmulatedBubblingEvent({
        type: "div",
        targetProps: { popover: "any" },
        reactEvent: "onBeforeToggle",
        reactEventType: "beforetoggle",
        nativeEvent: "beforetoggle",
        dispatch(node) {
          node.dispatchEvent(new Event("beforetoggle", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onToggle Popover API", async () => {
      await testEmulatedBubblingEvent({
        type: "div",
        targetProps: { popover: "any" },
        reactEvent: "onToggle",
        reactEventType: "toggle",
        nativeEvent: "toggle",
        dispatch(node) {
          node.dispatchEvent(new Event("toggle", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onBeforeToggle Dialog API", async () => {
      await testEmulatedBubblingEvent({
        type: "dialog",
        reactEvent: "onBeforeToggle",
        reactEventType: "beforetoggle",
        nativeEvent: "beforetoggle",
        dispatch(node) {
          node.dispatchEvent(new Event("beforetoggle", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onToggle Dialog API", async () => {
      await testEmulatedBubblingEvent({
        type: "dialog",
        reactEvent: "onToggle",
        reactEventType: "toggle",
        nativeEvent: "toggle",
        dispatch(node) {
          node.dispatchEvent(new Event("toggle", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onVolumeChange", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onVolumeChange",
        reactEventType: "volumechange",
        nativeEvent: "volumechange",
        dispatch(node) {
          node.dispatchEvent(new Event("volumechange", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onWaiting", async () => {
      await testEmulatedBubblingEvent({
        type: "video",
        reactEvent: "onWaiting",
        reactEventType: "waiting",
        nativeEvent: "waiting",
        dispatch(node) {
          node.dispatchEvent(new Event("waiting", { bubbles: false, cancelable: true }));
        },
      });
    });
  });

  describe("non-bubbling events that do not bubble in React", () => {
    it("onScroll", async () => {
      await testNonBubblingEvent({
        type: "div",
        reactEvent: "onScroll",
        reactEventType: "scroll",
        nativeEvent: "scroll",
        dispatch(node) {
          node.dispatchEvent(new Event("scroll", { bubbles: false, cancelable: true }));
        },
      });
    });

    it("onScrollEnd", async () => {
      await testNonBubblingEvent({
        type: "div",
        reactEvent: "onScrollEnd",
        reactEventType: "scrollend",
        nativeEvent: "scrollend",
        dispatch(node) {
          node.dispatchEvent(new Event("scrollend", { bubbles: false, cancelable: true }));
        },
      });
    });
  });

  describe("enter/leave events", () => {
    it("onMouseEnter and onMouseLeave", async () => {
      const log: string[] = [];
      const targetRef = React.createRef<HTMLDivElement>();
      await render(
        <Fixture
          type="div"
          targetRef={targetRef}
          targetProps={{
            onMouseEnter: () => {
              log.push("---- target enter");
            },
            onMouseLeave: () => {
              log.push("---- target leave");
            },
          }}
          parentProps={{
            onMouseEnter: () => {
              log.push("--- parent enter");
            },
            onMouseLeave: () => {
              log.push("--- parent leave");
            },
          }}
          outerProps={{
            onMouseEnter: () => {
              log.push("-- outer enter");
            },
            onMouseLeave: () => {
              log.push("-- outer leave");
            },
          }}
          outerParentProps={{
            onMouseEnter: () => {
              log.push("- outer parent enter");
            },
            onMouseLeave: () => {
              log.push("- outer parent leave");
            },
          }}
        />,
      );
      expect(log.length).toBe(0);
      targetRef.current!.dispatchEvent(
        new MouseEvent("mouseover", {
          bubbles: true,
          cancelable: true,
          relatedTarget: null,
        }),
      );
      expect(log).toEqual([
        "- outer parent enter",
        "-- outer enter",
        "--- parent enter",
        "---- target enter",
      ]);
      log.length = 0;
      targetRef.current!.dispatchEvent(
        new MouseEvent("mouseout", {
          bubbles: true,
          cancelable: true,
          relatedTarget: document.body,
        }),
      );
      expect(log).toEqual([
        "---- target leave",
        "--- parent leave",
        "-- outer leave",
        "- outer parent leave",
      ]);
    });

    it("onPointerEnter and onPointerLeave", async () => {
      const log: string[] = [];
      const targetRef = React.createRef<HTMLDivElement>();
      await render(
        <Fixture
          type="div"
          targetRef={targetRef}
          targetProps={{
            onPointerEnter: () => {
              log.push("---- target enter");
            },
            onPointerLeave: () => {
              log.push("---- target leave");
            },
          }}
          parentProps={{
            onPointerEnter: () => {
              log.push("--- parent enter");
            },
            onPointerLeave: () => {
              log.push("--- parent leave");
            },
          }}
          outerProps={{
            onPointerEnter: () => {
              log.push("-- outer enter");
            },
            onPointerLeave: () => {
              log.push("-- outer leave");
            },
          }}
          outerParentProps={{
            onPointerEnter: () => {
              log.push("- outer parent enter");
            },
            onPointerLeave: () => {
              log.push("- outer parent leave");
            },
          }}
        />,
      );
      expect(log.length).toBe(0);
      targetRef.current!.dispatchEvent(
        new Event("pointerover", {
          bubbles: true,
          cancelable: true,
        }),
      );
      expect(log).toEqual([
        "- outer parent enter",
        "-- outer enter",
        "--- parent enter",
        "---- target enter",
      ]);
      log.length = 0;
      targetRef.current!.dispatchEvent(
        new Event("pointerout", {
          bubbles: true,
          cancelable: true,
        }),
      );
      expect(log).toEqual([
        "---- target leave",
        "--- parent leave",
        "-- outer leave",
        "- outer parent leave",
      ]);
    });
  });

  const setUntrackedValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!;

  describe("polyfilled events", () => {
    it("onBeforeInput", async () => {
      const log: string[] = [];
      const targetRef = React.createRef<HTMLInputElement>();
      await render(
        <Fixture
          type="input"
          targetRef={targetRef}
          targetProps={{
            onBeforeInput: () => {
              log.push("---- target");
            },
            onBeforeInputCapture: () => {
              log.push("---- target capture");
            },
          }}
          parentProps={{
            onBeforeInput: () => {
              log.push("--- parent");
            },
            onBeforeInputCapture: () => {
              log.push("--- parent capture");
            },
          }}
          outerProps={{
            onBeforeInput: () => {
              log.push("-- outer");
            },
            onBeforeInputCapture: () => {
              log.push("-- outer capture");
            },
          }}
          outerParentProps={{
            onBeforeInput: () => {
              log.push("- outer parent");
            },
            onBeforeInputCapture: (e: React.FormEvent) => {
              expect(e.type).toBe("beforeinput");
              log.push("- outer parent capture");
            },
          }}
        />,
      );
      expect(log.length).toBe(0);
      await act(() => {
        const textInputEvent = new Event("textInput", { bubbles: true });
        (textInputEvent as unknown as Record<string, unknown>).data = "abcd";
        targetRef.current!.dispatchEvent(textInputEvent);
      });
      expect(log).toEqual([
        "- outer parent capture",
        "-- outer capture",
        "--- parent capture",
        "---- target capture",
        "---- target",
        "--- parent",
        "-- outer",
        "- outer parent",
      ]);
    });

    it("onChange", async () => {
      const log: string[] = [];
      const targetRef = React.createRef<HTMLInputElement>();
      await render(
        <Fixture
          type="input"
          targetRef={targetRef}
          targetProps={{
            onChange: () => {
              log.push("---- target");
            },
            onChangeCapture: () => {
              log.push("---- target capture");
            },
          }}
          parentProps={{
            onChange: () => {
              log.push("--- parent");
            },
            onChangeCapture: () => {
              log.push("--- parent capture");
            },
          }}
          outerProps={{
            onChange: () => {
              log.push("-- outer");
            },
            onChangeCapture: () => {
              log.push("-- outer capture");
            },
          }}
          outerParentProps={{
            onChange: () => {
              log.push("- outer parent");
            },
            onChangeCapture: (e: React.FormEvent) => {
              expect(e.type).toBe("change");
              log.push("- outer parent capture");
            },
          }}
        />,
      );
      expect(log.length).toBe(0);
      await act(() => {
        setUntrackedValue.call(targetRef.current!, "hello");
        targetRef.current!.dispatchEvent(new Event("input", { bubbles: true }));
      });
      expect(log).toEqual([
        "- outer parent capture",
        "-- outer capture",
        "--- parent capture",
        "---- target capture",
        "---- target",
        "--- parent",
        "-- outer",
        "- outer parent",
      ]);
    });

    it("onCompositionStart", async () => {
      const log: string[] = [];
      const targetRef = React.createRef<HTMLInputElement>();
      await render(
        <Fixture
          type="input"
          targetRef={targetRef}
          targetProps={{
            onCompositionStart: () => {
              log.push("---- target");
            },
            onCompositionStartCapture: () => {
              log.push("---- target capture");
            },
          }}
          parentProps={{
            onCompositionStart: () => {
              log.push("--- parent");
            },
            onCompositionStartCapture: () => {
              log.push("--- parent capture");
            },
          }}
          outerProps={{
            onCompositionStart: () => {
              log.push("-- outer");
            },
            onCompositionStartCapture: () => {
              log.push("-- outer capture");
            },
          }}
          outerParentProps={{
            onCompositionStart: () => {
              log.push("- outer parent");
            },
            onCompositionStartCapture: (e: React.CompositionEvent) => {
              expect(e.type).toBe("compositionstart");
              log.push("- outer parent capture");
            },
          }}
        />,
      );
      expect(log.length).toBe(0);
      targetRef.current!.dispatchEvent(new Event("compositionstart", { bubbles: true }));
      expect(log).toEqual([
        "- outer parent capture",
        "-- outer capture",
        "--- parent capture",
        "---- target capture",
        "---- target",
        "--- parent",
        "-- outer",
        "- outer parent",
      ]);
    });

    it("onCompositionEnd", async () => {
      const log: string[] = [];
      const targetRef = React.createRef<HTMLInputElement>();
      await render(
        <Fixture
          type="input"
          targetRef={targetRef}
          targetProps={{
            onCompositionEnd: () => {
              log.push("---- target");
            },
            onCompositionEndCapture: () => {
              log.push("---- target capture");
            },
          }}
          parentProps={{
            onCompositionEnd: () => {
              log.push("--- parent");
            },
            onCompositionEndCapture: () => {
              log.push("--- parent capture");
            },
          }}
          outerProps={{
            onCompositionEnd: () => {
              log.push("-- outer");
            },
            onCompositionEndCapture: () => {
              log.push("-- outer capture");
            },
          }}
          outerParentProps={{
            onCompositionEnd: () => {
              log.push("- outer parent");
            },
            onCompositionEndCapture: (e: React.CompositionEvent) => {
              expect(e.type).toBe("compositionend");
              log.push("- outer parent capture");
            },
          }}
        />,
      );
      expect(log.length).toBe(0);
      targetRef.current!.dispatchEvent(new Event("compositionend", { bubbles: true }));
      expect(log).toEqual([
        "- outer parent capture",
        "-- outer capture",
        "--- parent capture",
        "---- target capture",
        "---- target",
        "--- parent",
        "-- outer",
        "- outer parent",
      ]);
    });

    it("onCompositionUpdate", async () => {
      const log: string[] = [];
      const targetRef = React.createRef<HTMLInputElement>();
      await render(
        <Fixture
          type="input"
          targetRef={targetRef}
          targetProps={{
            onCompositionUpdate: () => {
              log.push("---- target");
            },
            onCompositionUpdateCapture: () => {
              log.push("---- target capture");
            },
          }}
          parentProps={{
            onCompositionUpdate: () => {
              log.push("--- parent");
            },
            onCompositionUpdateCapture: () => {
              log.push("--- parent capture");
            },
          }}
          outerProps={{
            onCompositionUpdate: () => {
              log.push("-- outer");
            },
            onCompositionUpdateCapture: () => {
              log.push("-- outer capture");
            },
          }}
          outerParentProps={{
            onCompositionUpdate: () => {
              log.push("- outer parent");
            },
            onCompositionUpdateCapture: (e: React.CompositionEvent) => {
              expect(e.type).toBe("compositionupdate");
              log.push("- outer parent capture");
            },
          }}
        />,
      );
      expect(log.length).toBe(0);
      targetRef.current!.dispatchEvent(new Event("compositionupdate", { bubbles: true }));
      expect(log).toEqual([
        "- outer parent capture",
        "-- outer capture",
        "--- parent capture",
        "---- target capture",
        "---- target",
        "--- parent",
        "-- outer",
        "- outer parent",
      ]);
    });

    it("onSelect", async () => {
      const log: string[] = [];
      const targetRef = React.createRef<HTMLInputElement>();
      await render(
        <Fixture
          type="input"
          targetRef={targetRef}
          targetProps={{
            onSelect: () => {
              log.push("---- target");
            },
            onSelectCapture: () => {
              log.push("---- target capture");
            },
          }}
          parentProps={{
            onSelect: () => {
              log.push("--- parent");
            },
            onSelectCapture: () => {
              log.push("--- parent capture");
            },
          }}
          outerProps={{
            onSelect: () => {
              log.push("-- outer");
            },
            onSelectCapture: () => {
              log.push("-- outer capture");
            },
          }}
          outerParentProps={{
            onSelect: () => {
              log.push("- outer parent");
            },
            onSelectCapture: (e: React.SyntheticEvent) => {
              expect(e.type).toBe("select");
              log.push("- outer parent capture");
            },
          }}
        />,
      );
      expect(log.length).toBe(0);
      await act(() => {
        targetRef.current!.focus();
        targetRef.current!.dispatchEvent(new Event("keydown", { bubbles: true }));
      });
      expect(log).toEqual([
        "- outer parent capture",
        "-- outer capture",
        "--- parent capture",
        "---- target capture",
        "---- target",
        "--- parent",
        "-- outer",
        "- outer parent",
      ]);
    });
  });

  async function testNativeBubblingEvent(eventConfig: EventConfig) {
    await testBubblingEventWithTargetListener(eventConfig);
    await testBubblingEventWithoutTargetListener(eventConfig);
    await testReactStopPropagationInOuterCapturePhase(eventConfig);
    await testReactStopPropagationInParentCapturePhase(eventConfig);
    await testReactStopPropagationInTargetBubblePhase(eventConfig);
    await testReactStopPropagationInOuterBubblePhase(eventConfig);
  }

  async function testEmulatedBubblingEvent(eventConfig: EventConfig) {
    await testEmulatedBubblingEventWithTargetListener(eventConfig);
    await testEmulatedBubblingEventWithoutTargetListener(eventConfig);
    await testReactStopPropagationInOuterCapturePhase(eventConfig);
    await testReactStopPropagationInParentCapturePhase(eventConfig);
    await testReactStopPropagationInTargetBubblePhase(eventConfig);
    await testReactStopPropagationInOuterBubblePhase(eventConfig);
  }

  async function testNonBubblingEvent(eventConfig: EventConfig) {
    await testNonBubblingEventWithTargetListener(eventConfig);
    await testNonBubblingEventWithoutTargetListener(eventConfig);
    await testNonBubblingReactStopPropagationInOuterCapturePhase(eventConfig);
    await testNonBubblingReactStopPropagationInParentCapturePhase(eventConfig);
  }

  async function testBubblingEventWithTargetListener(eventConfig: EventConfig) {
    const log: string[] = [];
    const targetRef = React.createRef<HTMLElement>();
    await render(
      <Fixture
        type={eventConfig.type}
        targetRef={targetRef}
        targetProps={{
          [eventConfig.reactEvent]: () => {
            log.push("---- target");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("---- target capture");
          },
        }}
        parentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("--- parent");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("--- parent capture");
          },
        }}
        outerProps={{
          [eventConfig.reactEvent]: () => {
            log.push("-- outer");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("-- outer capture");
          },
        }}
        outerParentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("- outer parent");
          },
          [eventConfig.reactEvent + "Capture"]: (e: React.SyntheticEvent) => {
            expect(e.type).toBe(eventConfig.reactEventType);
            log.push("- outer parent capture");
          },
        }}
      />,
    );
    expect(log.length).toBe(0);
    await act(() => {
      eventConfig.dispatch(targetRef.current!);
    });
    expect(log).toEqual([
      "- outer parent capture",
      "-- outer capture",
      "--- parent capture",
      "---- target capture",
      "---- target",
      "--- parent",
      "-- outer",
      "- outer parent",
    ]);
  }

  async function testEmulatedBubblingEventWithTargetListener(eventConfig: EventConfig) {
    const log: string[] = [];
    const targetRef = React.createRef<HTMLElement>();
    await render(
      <Fixture
        type={eventConfig.type}
        targetRef={targetRef}
        targetProps={{
          ...eventConfig.targetProps,
          [eventConfig.reactEvent]: () => {
            log.push("---- target");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("---- target capture");
          },
        }}
        parentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("--- parent");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("--- parent capture");
          },
        }}
        outerProps={{
          [eventConfig.reactEvent]: () => {
            log.push("-- outer");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("-- outer capture");
          },
        }}
        outerParentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("- outer parent");
          },
          [eventConfig.reactEvent + "Capture"]: (e: React.SyntheticEvent) => {
            expect(e.type).toBe(eventConfig.reactEventType);
            log.push("- outer parent capture");
          },
        }}
      />,
    );
    expect(log.length).toBe(0);
    await act(() => {
      eventConfig.dispatch(targetRef.current!);
    });
    expect(log).toEqual([
      "- outer parent capture",
      "-- outer capture",
      "--- parent capture",
      "---- target capture",
      "---- target",
      "--- parent",
      "-- outer",
      "- outer parent",
    ]);
  }

  async function testNonBubblingEventWithTargetListener(eventConfig: EventConfig) {
    const log: string[] = [];
    const targetRef = React.createRef<HTMLElement>();
    await render(
      <Fixture
        type={eventConfig.type}
        targetRef={targetRef}
        targetProps={{
          [eventConfig.reactEvent]: () => {
            log.push("---- target");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("---- target capture");
          },
        }}
        parentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("--- parent");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("--- parent capture");
          },
        }}
        outerProps={{
          [eventConfig.reactEvent]: () => {
            log.push("-- outer");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("-- outer capture");
          },
        }}
        outerParentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("- outer parent");
          },
          [eventConfig.reactEvent + "Capture"]: (e: React.SyntheticEvent) => {
            expect(e.type).toBe(eventConfig.reactEventType);
            log.push("- outer parent capture");
          },
        }}
      />,
    );
    expect(log.length).toBe(0);
    await act(() => {
      eventConfig.dispatch(targetRef.current!);
    });
    expect(log).toEqual([
      "- outer parent capture",
      "-- outer capture",
      "--- parent capture",
      "---- target capture",
      "---- target",
    ]);
  }

  async function testBubblingEventWithoutTargetListener(eventConfig: EventConfig) {
    const log: string[] = [];
    const targetRef = React.createRef<HTMLElement>();
    await render(
      <Fixture
        type={eventConfig.type}
        targetRef={targetRef}
        targetProps={{}}
        parentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("--- parent");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("--- parent capture");
          },
        }}
        outerProps={{
          [eventConfig.reactEvent]: () => {
            log.push("-- outer");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("-- outer capture");
          },
        }}
        outerParentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("- outer parent");
          },
          [eventConfig.reactEvent + "Capture"]: (e: React.SyntheticEvent) => {
            expect(e.type).toBe(eventConfig.reactEventType);
            log.push("- outer parent capture");
          },
        }}
      />,
    );
    expect(log.length).toBe(0);
    await act(() => {
      eventConfig.dispatch(targetRef.current!);
    });
    expect(log).toEqual([
      "- outer parent capture",
      "-- outer capture",
      "--- parent capture",
      "--- parent",
      "-- outer",
      "- outer parent",
    ]);
  }

  async function testEmulatedBubblingEventWithoutTargetListener(eventConfig: EventConfig) {
    const log: string[] = [];
    const targetRef = React.createRef<HTMLElement>();
    await render(
      <Fixture
        type={eventConfig.type}
        targetRef={targetRef}
        targetProps={{
          ...eventConfig.targetProps,
        }}
        parentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("--- parent");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("--- parent capture");
          },
        }}
        outerProps={{
          [eventConfig.reactEvent]: () => {
            log.push("-- outer");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("-- outer capture");
          },
        }}
        outerParentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("- outer parent");
          },
          [eventConfig.reactEvent + "Capture"]: (e: React.SyntheticEvent) => {
            expect(e.type).toBe(eventConfig.reactEventType);
            log.push("- outer parent capture");
          },
        }}
      />,
    );
    expect(log.length).toBe(0);
    await act(() => {
      eventConfig.dispatch(targetRef.current!);
    });
    expect(log).toEqual([
      "- outer parent capture",
      "-- outer capture",
      "--- parent capture",
      "--- parent",
      "-- outer",
      "- outer parent",
    ]);
  }

  async function testNonBubblingEventWithoutTargetListener(eventConfig: EventConfig) {
    const log: string[] = [];
    const targetRef = React.createRef<HTMLElement>();
    await render(
      <Fixture
        type={eventConfig.type}
        targetRef={targetRef}
        targetProps={{}}
        parentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("--- parent");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("--- parent capture");
          },
        }}
        outerProps={{
          [eventConfig.reactEvent]: () => {
            log.push("-- outer");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("-- outer capture");
          },
        }}
        outerParentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("- outer parent");
          },
          [eventConfig.reactEvent + "Capture"]: (e: React.SyntheticEvent) => {
            expect(e.type).toBe(eventConfig.reactEventType);
            log.push("- outer parent capture");
          },
        }}
      />,
    );
    expect(log.length).toBe(0);
    await act(() => {
      eventConfig.dispatch(targetRef.current!);
    });
    expect(log).toEqual(["- outer parent capture", "-- outer capture", "--- parent capture"]);
  }

  async function testReactStopPropagationInOuterCapturePhase(eventConfig: EventConfig) {
    const log: string[] = [];
    const targetRef = React.createRef<HTMLElement>();
    await render(
      <Fixture
        type={eventConfig.type}
        targetRef={targetRef}
        targetProps={{
          ...eventConfig.targetProps,
          [eventConfig.reactEvent]: () => {
            log.push("---- target");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("---- target capture");
          },
        }}
        parentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("--- parent");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("--- parent capture");
          },
        }}
        outerProps={{
          [eventConfig.reactEvent]: () => {
            log.push("-- outer");
          },
          [eventConfig.reactEvent + "Capture"]: (e: React.SyntheticEvent) => {
            e.stopPropagation();
            log.push("-- outer capture");
          },
        }}
        outerParentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("- outer parent");
          },
          [eventConfig.reactEvent + "Capture"]: (e: React.SyntheticEvent) => {
            expect(e.type).toBe(eventConfig.reactEventType);
            log.push("- outer parent capture");
          },
        }}
      />,
    );
    expect(log.length).toBe(0);
    await act(() => {
      eventConfig.dispatch(targetRef.current!);
    });
    expect(log).toEqual(["- outer parent capture", "-- outer capture"]);
  }

  async function testReactStopPropagationInParentCapturePhase(eventConfig: EventConfig) {
    const log: string[] = [];
    const targetRef = React.createRef<HTMLElement>();
    await render(
      <Fixture
        type={eventConfig.type}
        targetRef={targetRef}
        targetProps={{
          ...eventConfig.targetProps,
          [eventConfig.reactEvent]: () => {
            log.push("---- target");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("---- target capture");
          },
        }}
        parentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("--- parent");
          },
          [eventConfig.reactEvent + "Capture"]: (e: React.SyntheticEvent) => {
            e.stopPropagation();
            log.push("--- parent capture");
          },
        }}
        outerProps={{
          [eventConfig.reactEvent]: () => {
            log.push("-- outer");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("-- outer capture");
          },
        }}
        outerParentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("- outer parent");
          },
          [eventConfig.reactEvent + "Capture"]: (e: React.SyntheticEvent) => {
            expect(e.type).toBe(eventConfig.reactEventType);
            log.push("- outer parent capture");
          },
        }}
      />,
    );
    expect(log.length).toBe(0);
    await act(() => {
      eventConfig.dispatch(targetRef.current!);
    });
    expect(log).toEqual(["- outer parent capture", "-- outer capture", "--- parent capture"]);
  }

  async function testReactStopPropagationInTargetBubblePhase(eventConfig: EventConfig) {
    const log: string[] = [];
    const targetRef = React.createRef<HTMLElement>();
    await render(
      <Fixture
        type={eventConfig.type}
        targetRef={targetRef}
        targetProps={{
          ...eventConfig.targetProps,
          [eventConfig.reactEvent]: (e: React.SyntheticEvent) => {
            e.stopPropagation();
            log.push("---- target");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("---- target capture");
          },
        }}
        parentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("--- parent");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("--- parent capture");
          },
        }}
        outerProps={{
          [eventConfig.reactEvent]: () => {
            log.push("-- outer");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("-- outer capture");
          },
        }}
        outerParentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("- outer parent");
          },
          [eventConfig.reactEvent + "Capture"]: (e: React.SyntheticEvent) => {
            expect(e.type).toBe(eventConfig.reactEventType);
            log.push("- outer parent capture");
          },
        }}
      />,
    );
    expect(log.length).toBe(0);
    await act(() => {
      eventConfig.dispatch(targetRef.current!);
    });
    expect(log).toEqual([
      "- outer parent capture",
      "-- outer capture",
      "--- parent capture",
      "---- target capture",
      "---- target",
    ]);
  }

  async function testReactStopPropagationInOuterBubblePhase(eventConfig: EventConfig) {
    const log: string[] = [];
    const targetRef = React.createRef<HTMLElement>();
    await render(
      <Fixture
        type={eventConfig.type}
        targetRef={targetRef}
        targetProps={{
          ...eventConfig.targetProps,
          [eventConfig.reactEvent]: () => {
            log.push("---- target");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("---- target capture");
          },
        }}
        parentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("--- parent");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("--- parent capture");
          },
        }}
        outerProps={{
          [eventConfig.reactEvent]: (e: React.SyntheticEvent) => {
            e.stopPropagation();
            log.push("-- outer");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("-- outer capture");
          },
        }}
        outerParentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("- outer parent");
          },
          [eventConfig.reactEvent + "Capture"]: (e: React.SyntheticEvent) => {
            expect(e.type).toBe(eventConfig.reactEventType);
            log.push("- outer parent capture");
          },
        }}
      />,
    );
    expect(log.length).toBe(0);
    await act(() => {
      eventConfig.dispatch(targetRef.current!);
    });
    expect(log).toEqual([
      "- outer parent capture",
      "-- outer capture",
      "--- parent capture",
      "---- target capture",
      "---- target",
      "--- parent",
      "-- outer",
    ]);
  }

  async function testNativeStopPropagationInOuterParentCapturePhase(eventConfig: EventConfig) {
    const log: string[] = [];
    const targetRef = React.createRef<HTMLElement>();
    await render(
      <Fixture
        type={eventConfig.type}
        targetRef={targetRef}
        targetProps={{
          [eventConfig.reactEvent]: () => {
            log.push("---- target");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("---- target capture");
          },
        }}
        parentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("--- parent");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("--- parent capture");
          },
        }}
        outerProps={{
          [eventConfig.reactEvent]: () => {
            log.push("-- outer");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("-- outer capture");
          },
        }}
        outerParentRef={(node: HTMLElement | null) => {
          if (node) {
            node.addEventListener(
              eventConfig.nativeEvent,
              (nativeEventObject) => {
                log.push("- outer parent capture (native)");
                nativeEventObject.stopPropagation();
              },
              { capture: true },
            );
          }
        }}
        outerParentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("- outer parent");
          },
          [eventConfig.reactEvent + "Capture"]: (e: React.SyntheticEvent) => {
            expect(e.type).toBe(eventConfig.reactEventType);
            log.push("- outer parent capture");
          },
        }}
      />,
    );
    expect(log.length).toBe(0);
    await act(() => {
      eventConfig.dispatch(targetRef.current!);
    });
    expect(log).toEqual([
      "- outer parent capture",
      "-- outer capture",
      "--- parent capture",
      "---- target capture",
      "- outer parent capture (native)",
    ]);
  }

  async function testNativeStopPropagationInParentCapturePhase(eventConfig: EventConfig) {
    const log: string[] = [];
    const targetRef = React.createRef<HTMLElement>();
    await render(
      <Fixture
        type={eventConfig.type}
        targetRef={targetRef}
        targetProps={{
          [eventConfig.reactEvent]: () => {
            log.push("---- target");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("---- target capture");
          },
        }}
        parentRef={(node: HTMLElement | null) => {
          if (node) {
            node.addEventListener(
              eventConfig.nativeEvent,
              (nativeEventObject) => {
                log.push("--- parent capture (native)");
                nativeEventObject.stopPropagation();
              },
              { capture: true },
            );
          }
        }}
        parentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("--- parent");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("--- parent capture");
          },
        }}
        outerProps={{
          [eventConfig.reactEvent]: () => {
            log.push("-- outer");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("-- outer capture");
          },
        }}
        outerParentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("- outer parent");
          },
          [eventConfig.reactEvent + "Capture"]: (e: React.SyntheticEvent) => {
            expect(e.type).toBe(eventConfig.reactEventType);
            log.push("- outer parent capture");
          },
        }}
      />,
    );
    expect(log.length).toBe(0);
    await act(() => {
      eventConfig.dispatch(targetRef.current!);
    });
    expect(log).toEqual([
      "- outer parent capture",
      "-- outer capture",
      "--- parent capture",
      "---- target capture",
      "--- parent capture (native)",
    ]);
  }

  async function testNativeStopPropagationInTargetBubblePhase(eventConfig: EventConfig) {
    const log: string[] = [];
    const targetRef = { current: null as HTMLElement | null };
    await render(
      <Fixture
        type={eventConfig.type}
        targetRef={(node: HTMLElement | null) => {
          targetRef.current = node;
          if (node) {
            node.addEventListener(eventConfig.nativeEvent, (nativeEvt) => {
              log.push("---- target (native)");
              nativeEvt.stopPropagation();
            });
          }
        }}
        targetProps={{
          [eventConfig.reactEvent]: () => {
            log.push("---- target");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("---- target capture");
          },
        }}
        parentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("--- parent");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("--- parent capture");
          },
        }}
        outerProps={{
          [eventConfig.reactEvent]: () => {
            log.push("-- outer");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("-- outer capture");
          },
        }}
        outerParentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("- outer parent");
          },
          [eventConfig.reactEvent + "Capture"]: (e: React.SyntheticEvent) => {
            expect(e.type).toBe(eventConfig.reactEventType);
            log.push("- outer parent capture");
          },
        }}
      />,
    );
    expect(log.length).toBe(0);
    await act(() => {
      eventConfig.dispatch(targetRef.current!);
    });
    expect(log).toEqual([
      "- outer parent capture",
      "-- outer capture",
      "--- parent capture",
      "---- target capture",
      "---- target (native)",
    ]);
  }

  async function testNativeStopPropagationInOuterBubblePhase(eventConfig: EventConfig) {
    const log: string[] = [];
    const targetRef = React.createRef<HTMLElement>();
    await render(
      <Fixture
        type={eventConfig.type}
        targetRef={targetRef}
        targetProps={{
          [eventConfig.reactEvent]: () => {
            log.push("---- target");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("---- target capture");
          },
        }}
        parentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("--- parent");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("--- parent capture");
          },
        }}
        outerRef={(node: HTMLElement | null) => {
          if (node) {
            node.addEventListener(eventConfig.nativeEvent, (nativeEvt) => {
              log.push("-- outer (native)");
              nativeEvt.stopPropagation();
            });
          }
        }}
        outerProps={{
          [eventConfig.reactEvent]: () => {
            log.push("-- outer");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("-- outer capture");
          },
        }}
        outerParentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("- outer parent");
          },
          [eventConfig.reactEvent + "Capture"]: (e: React.SyntheticEvent) => {
            expect(e.type).toBe(eventConfig.reactEventType);
            log.push("- outer parent capture");
          },
        }}
      />,
    );
    expect(log.length).toBe(0);
    await act(() => {
      eventConfig.dispatch(targetRef.current!);
    });
    expect(log).toEqual([
      "- outer parent capture",
      "-- outer capture",
      "--- parent capture",
      "---- target capture",
      "---- target",
      "--- parent",
      "-- outer (native)",
    ]);
  }

  async function testNonBubblingReactStopPropagationInOuterCapturePhase(eventConfig: EventConfig) {
    const log: string[] = [];
    const targetRef = React.createRef<HTMLElement>();
    await render(
      <Fixture
        type={eventConfig.type}
        targetRef={targetRef}
        targetProps={{
          [eventConfig.reactEvent]: () => {
            log.push("---- target");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("---- target capture");
          },
        }}
        parentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("--- parent");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("--- parent capture");
          },
        }}
        outerProps={{
          [eventConfig.reactEvent]: () => {
            log.push("-- outer");
          },
          [eventConfig.reactEvent + "Capture"]: (e: React.SyntheticEvent) => {
            e.stopPropagation();
            log.push("-- outer capture");
          },
        }}
        outerParentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("- outer parent");
          },
          [eventConfig.reactEvent + "Capture"]: (e: React.SyntheticEvent) => {
            expect(e.type).toBe(eventConfig.reactEventType);
            log.push("- outer parent capture");
          },
        }}
      />,
    );
    expect(log.length).toBe(0);
    await act(() => {
      eventConfig.dispatch(targetRef.current!);
    });
    expect(log).toEqual(["- outer parent capture", "-- outer capture"]);
  }

  async function testNonBubblingReactStopPropagationInParentCapturePhase(eventConfig: EventConfig) {
    const log: string[] = [];
    const targetRef = React.createRef<HTMLElement>();
    await render(
      <Fixture
        type={eventConfig.type}
        targetRef={targetRef}
        targetProps={{
          [eventConfig.reactEvent]: () => {
            log.push("---- target");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("---- target capture");
          },
        }}
        parentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("--- parent");
          },
          [eventConfig.reactEvent + "Capture"]: (e: React.SyntheticEvent) => {
            e.stopPropagation();
            log.push("--- parent capture");
          },
        }}
        outerProps={{
          [eventConfig.reactEvent]: () => {
            log.push("-- outer");
          },
          [eventConfig.reactEvent + "Capture"]: () => {
            log.push("-- outer capture");
          },
        }}
        outerParentProps={{
          [eventConfig.reactEvent]: () => {
            log.push("- outer parent");
          },
          [eventConfig.reactEvent + "Capture"]: (e: React.SyntheticEvent) => {
            expect(e.type).toBe(eventConfig.reactEventType);
            log.push("- outer parent capture");
          },
        }}
      />,
    );
    expect(log.length).toBe(0);
    await act(() => {
      eventConfig.dispatch(targetRef.current!);
    });
    expect(log).toEqual(["- outer parent capture", "-- outer capture", "--- parent capture"]);
  }

  function Fixture({
    type,
    targetRef,
    targetProps,
    parentRef,
    parentProps,
    outerRef,
    outerProps,
    outerParentRef,
    outerParentProps,
  }: {
    type: string;
    targetRef?: React.Ref<unknown>;
    targetProps?: Record<string, unknown>;
    parentRef?: React.Ref<unknown>;
    parentProps?: Record<string, unknown>;
    outerRef?: React.Ref<unknown>;
    outerProps?: Record<string, unknown>;
    outerParentRef?: React.Ref<unknown>;
    outerParentProps?: Record<string, unknown>;
  }) {
    const TargetElement = type as unknown as React.ElementType;
    return (
      <div {...outerParentProps} ref={outerParentRef as React.Ref<HTMLDivElement>}>
        <div {...outerProps} ref={outerRef as React.Ref<HTMLDivElement>}>
          <div {...parentProps} ref={parentRef as React.Ref<HTMLDivElement>}>
            <TargetElement {...targetProps} ref={targetRef} />
          </div>
        </div>
      </div>
    );
  }
});
