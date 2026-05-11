import React from "react";
import * as ReactDOMClient from "react-dom/client";
import ReactDOM from "react-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, log, assertLog, clearLog } from "./utils";

const NativeFormData = globalThis.FormData;
const FormDataPolyfill = function FormData(form?: HTMLFormElement, submitter?: HTMLElement) {
  const formData = new NativeFormData(form, submitter as HTMLButtonElement);
  const formDataEvent = new Event("formdata", {
    bubbles: true,
    cancelable: false,
  });
  (formDataEvent as any).formData = formData;
  if (form) {
    form.dispatchEvent(formDataEvent);
  }
  return formData;
} as unknown as typeof FormData;
NativeFormData.prototype.constructor = FormDataPolyfill;
globalThis.FormData = FormDataPolyfill;

const { useState, Suspense, startTransition, useTransition, use } = React;
const useFormStatus = ReactDOM.useFormStatus;
const requestFormReset = (ReactDOM as any).requestFormReset;
const useActionState = React.useActionState;

let textCache: Map<
  string,
  | {
      status: "pending";
      value: { pings: Array<(v: any) => void>; then: (resolve: (v: any) => void) => void };
    }
  | { status: "resolved"; value: string }
  | { status: "rejected"; value: unknown }
>;

function resolveText(text: string) {
  const record = textCache.get(text);
  if (record === undefined) {
    const newRecord = { status: "resolved" as const, value: text };
    textCache.set(text, newRecord);
  } else if (record.status === "pending") {
    const thenable = record.value;
    record.status = "resolved" as any;
    (record as any).value = text;
    thenable.pings.forEach((callback) => callback(text));
  }
}

function readText(text: string): string {
  const record = textCache.get(text);
  if (record !== undefined) {
    switch (record.status) {
      case "pending":
        log(`Suspend! [${text}]`);
        throw record.value;
      case "rejected":
        throw record.value;
      case "resolved":
        return record.value;
    }
  } else {
    log(`Suspend! [${text}]`);
    const thenable: { pings: Array<(v: any) => void>; then: (resolve: (v: any) => void) => void } =
      {
        pings: [],
        then(resolve) {
          if (newRecord.status === "pending") {
            thenable.pings.push(resolve);
          } else {
            Promise.resolve().then(() => resolve((newRecord as any).value));
          }
        },
      };

    const newRecord = { status: "pending" as const, value: thenable };
    textCache.set(text, newRecord);

    throw thenable;
  }
}

function getText(text: string): PromiseLike<string> {
  const record = textCache.get(text);
  if (record === undefined) {
    const thenable: { pings: Array<(v: any) => void>; then: (resolve: (v: any) => void) => void } =
      {
        pings: [],
        then(resolve) {
          if (newRecord.status === "pending") {
            thenable.pings.push(resolve);
          } else {
            Promise.resolve().then(() => resolve((newRecord as any).value));
          }
        },
      };
    const newRecord = { status: "pending" as const, value: thenable };
    textCache.set(text, newRecord);
    return thenable as unknown as PromiseLike<string>;
  } else {
    switch (record.status) {
      case "pending":
        return record.value as unknown as PromiseLike<string>;
      case "rejected":
        return Promise.reject(record.value);
      case "resolved":
        return Promise.resolve(record.value);
    }
  }
}

function Text({ text }: { text: string }) {
  log(text);
  return <>{text}</>;
}

function AsyncText({ text }: { text: string }) {
  readText(text);
  log(text);
  return <>{text}</>;
}

async function submit(submitter: HTMLFormElement | HTMLButtonElement | HTMLInputElement) {
  await act(() => {
    const form = (submitter as any).form || submitter;
    let actualSubmitter: HTMLElement | undefined = submitter as HTMLElement;
    if (!(submitter as any).form) {
      actualSubmitter = undefined;
    }
    const submitEvent = new Event("submit", {
      bubbles: true,
      cancelable: true,
    });
    (submitEvent as any).submitter = actualSubmitter;
    const returnValue = form.dispatchEvent(submitEvent);
    if (!returnValue) {
      return;
    }
    const action = (actualSubmitter && actualSubmitter.getAttribute("formaction")) || form.action;
    if (!/\s*javascript:/i.test(action)) {
      throw new Error("Navigate to: " + action);
    }
  });
}

describe("ReactDOMForm", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    textCache = new Map();
    clearLog();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("should allow passing a function to form action", async () => {
    const ref = React.createRef<HTMLFormElement>();
    let foo: string | null = null;

    function action(formData: FormData) {
      foo = formData.get("foo") as string;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <form action={action} ref={ref}>
          <input type="text" name="foo" defaultValue="bar" />
        </form>,
      );
    });

    await submit(ref.current!);

    expect(foo).toBe("bar");

    function action2(formData: FormData) {
      foo = formData.get("foo") + "2";
    }

    await act(async () => {
      root.render(
        <form action={action2} ref={ref}>
          <input type="text" name="foo" defaultValue="bar" />
        </form>,
      );
    });

    await submit(ref.current!);

    expect(foo).toBe("bar2");
  });

  it("should allow passing a function to an input/button formAction", async () => {
    const inputRef = React.createRef<HTMLInputElement>();
    const buttonRef = React.createRef<HTMLButtonElement>();
    let rootActionCalled = false;
    let savedTitle: string | null = null;
    let deletedTitle: string | null = null;

    function action() {
      rootActionCalled = true;
    }

    function saveItem(formData: FormData) {
      savedTitle = formData.get("title") as string;
    }

    function deleteItem(formData: FormData) {
      deletedTitle = formData.get("title") as string;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <form action={action}>
          <input type="text" name="title" defaultValue="Hello" />
          <input type="submit" formAction={saveItem} value="Save" ref={inputRef} />
          <button formAction={deleteItem} ref={buttonRef}>
            Delete
          </button>
        </form>,
      );
    });

    expect(savedTitle).toBe(null);
    expect(deletedTitle).toBe(null);

    await submit(inputRef.current!);
    expect(savedTitle).toBe("Hello");
    expect(deletedTitle).toBe(null);
    savedTitle = null;

    await submit(buttonRef.current!);
    expect(savedTitle).toBe(null);
    expect(deletedTitle).toBe("Hello");
    deletedTitle = null;

    function saveItem2(formData: FormData) {
      savedTitle = formData.get("title") + "2";
    }

    function deleteItem2(formData: FormData) {
      deletedTitle = formData.get("title") + "2";
    }

    await act(async () => {
      root.render(
        <form action={action}>
          <input type="text" name="title" defaultValue="Hello" />
          <input type="submit" formAction={saveItem2} value="Save" ref={inputRef} />
          <button formAction={deleteItem2} ref={buttonRef}>
            Delete
          </button>
        </form>,
      );
    });

    expect(savedTitle).toBe(null);
    expect(deletedTitle).toBe(null);

    await submit(inputRef.current!);
    expect(savedTitle).toBe("Hello2");
    expect(deletedTitle).toBe(null);
    savedTitle = null;

    await submit(buttonRef.current!);
    expect(savedTitle).toBe(null);
    expect(deletedTitle).toBe("Hello2");

    expect(rootActionCalled).toBe(false);
  });

  it("should allow preventing default to block the action", async () => {
    const ref = React.createRef<HTMLFormElement>();
    let actionCalled = false;

    function action() {
      actionCalled = true;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <form action={action} ref={ref} onSubmit={(event) => event.preventDefault()}>
          <input type="text" name="foo" defaultValue="bar" />
        </form>,
      );
    });

    await submit(ref.current!);

    expect(actionCalled).toBe(false);
  });

  it("should submit the inner of nested forms", async () => {
    const ref = React.createRef<HTMLFormElement>();
    let data: string | null = null;

    function outerAction(formData: FormData) {
      data = formData.get("data") + "outer";
    }
    function innerAction(formData: FormData) {
      data = formData.get("data") + "inner";
    }

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <form action={outerAction}>
          <input type="text" name="data" defaultValue="outer" />
          <form action={innerAction} ref={ref}>
            <input type="text" name="data" defaultValue="inner" />
          </form>
        </form>,
      );
    });

    await submit(ref.current!);

    expect(data).toBe("innerinner");
  });

  it("should submit once if one root is nested inside the other", async () => {
    const ref = React.createRef<HTMLFormElement>();
    let outerCalled = 0;
    let innerCalled = 0;
    let bubbledSubmit = false;

    function outerAction() {
      outerCalled++;
    }

    function innerAction() {
      innerCalled++;
    }

    const innerContainerRef = React.createRef<HTMLDivElement>();
    const outerRoot = ReactDOMClient.createRoot(container);
    await act(async () => {
      outerRoot.render(
        <div onSubmit={() => (bubbledSubmit = true)}>
          <form action={outerAction}>
            <div ref={innerContainerRef} />
          </form>
        </div>,
      );
    });

    const innerRoot = ReactDOMClient.createRoot(innerContainerRef.current!);
    await act(async () => {
      innerRoot.render(
        <form action={innerAction} ref={ref}>
          <input type="text" name="data" defaultValue="inner" />
        </form>,
      );
    });

    await submit(ref.current!);

    expect(bubbledSubmit).toBe(true);
    expect(outerCalled).toBe(0);
    expect(innerCalled).toBe(1);
  });

  it("should submit once if a portal is nested inside its own root", async () => {
    const ref = React.createRef<HTMLFormElement>();
    let outerCalled = 0;
    let innerCalled = 0;
    let bubbledSubmit = false;

    function outerAction() {
      outerCalled++;
    }

    function innerAction() {
      innerCalled++;
    }

    const innerContainer = document.createElement("div");
    const innerContainerRef = React.createRef<HTMLDivElement>();
    const outerRoot = ReactDOMClient.createRoot(container);
    await act(async () => {
      outerRoot.render(
        <div onSubmit={() => (bubbledSubmit = true)}>
          <form action={outerAction}>
            <div ref={innerContainerRef} />
            {ReactDOM.createPortal(
              <form action={innerAction} ref={ref}>
                <input type="text" name="data" defaultValue="inner" />
              </form>,
              innerContainer,
            )}
          </form>
        </div>,
      );
    });

    innerContainerRef.current!.appendChild(innerContainer);

    await submit(ref.current!);

    expect(bubbledSubmit).toBe(true);
    expect(outerCalled).toBe(0);
    expect(innerCalled).toBe(1);
  });

  it("can read the clicked button in the formdata event", async () => {
    const inputRef = React.createRef<HTMLInputElement>();
    const buttonRef = React.createRef<HTMLButtonElement>();
    const outsideButtonRef = React.createRef<HTMLButtonElement>();
    const imageButtonRef = React.createRef<HTMLInputElement>();
    let button: string | null = null;
    let buttonX: string | null = null;
    let buttonY: string | null = null;
    let title: string | null = null;

    function action(formData: FormData) {
      button = formData.get("button") as string | null;
      buttonX = formData.get("button.x") as string | null;
      buttonY = formData.get("button.y") as string | null;
      title = formData.get("title") as string | null;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <>
          <form action={action}>
            <input type="text" name="title" defaultValue="hello" />
            <input type="submit" name="button" value="save" />
            <input type="submit" name="button" value="delete" ref={inputRef} />
            <button name="button" value="edit" ref={buttonRef}>
              Edit
            </button>
            <input type="image" name="button" ref={imageButtonRef} />
          </form>
          <form id="form" action={action}>
            <input type="text" name="title" defaultValue="hello" />
          </form>
          <button form="form" name="button" value="outside" ref={outsideButtonRef}>
            Button outside form
          </button>
        </>,
      );
    });

    container.addEventListener("formdata", (event: any) => {
      if (event.formData.get("button") === "delete") {
        event.formData.delete("title");
      }
    });

    await submit(inputRef.current!);

    expect(button).toBe("delete");
    expect(title).toBe(null);

    await submit(buttonRef.current!);

    expect(button).toBe("edit");
    expect(title).toBe("hello");

    await submit(outsideButtonRef.current!);

    expect(button).toBe("outside");
    expect(title).toBe("hello");

    await submit(imageButtonRef.current!);

    expect(title).toBe("hello");
  });

  it("excludes the submitter name when the submitter is a function action", async () => {
    const inputRef = React.createRef<HTMLInputElement>();
    const buttonRef = React.createRef<HTMLButtonElement>();
    let button: string | null = null;

    function action(formData: FormData) {
      button = formData.get("button") as string | null;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <form>
          <input type="submit" name="button" value="delete" ref={inputRef} formAction={action} />
          <button name="button" value="edit" ref={buttonRef} formAction={action}>
            Edit
          </button>
        </form>,
      );
    });

    await submit(inputRef.current!);

    expect(button).toBe(null);

    await submit(buttonRef.current!);

    expect(button).toBe(null);

    expect(inputRef.current!.getAttribute("type")).toBe("submit");
    expect(buttonRef.current!.getAttribute("type")).toBe(null);
  });

  it("allows a non-function formaction to override a function one", async () => {
    const ref = React.createRef<HTMLInputElement>();
    let actionCalled = false;

    function action() {
      actionCalled = true;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <form action={action}>
          <input type="submit" formAction="http://example.com/submit" ref={ref} />
        </form>,
      );
    });

    let nav: string | undefined;
    try {
      await submit(ref.current!);
    } catch (error: any) {
      nav = error.message;
    }
    expect(nav).toBe("Navigate to: http://example.com/submit");
    expect(actionCalled).toBe(false);
  });

  it("allows a non-react html formaction to be invoked", async () => {
    let actionCalled = false;

    function action() {
      actionCalled = true;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <form
          action={action}
          dangerouslySetInnerHTML={{
            __html: `
            <input
              type="submit"
              formAction="http://example.com/submit"
            />
          `,
          }}
        />,
      );
    });

    const node = container.getElementsByTagName("input")[0];
    let nav: string | undefined;
    try {
      await submit(node);
    } catch (error: any) {
      nav = error.message;
    }
    expect(nav).toBe("Navigate to: http://example.com/submit");
    expect(actionCalled).toBe(false);
  });

  it("form actions are transitions", async () => {
    const formRef = React.createRef<HTMLFormElement>();

    function Status() {
      const { pending } = useFormStatus();
      return pending ? <Text text="Pending..." /> : null;
    }

    function App() {
      const [state, setState] = useState("Initial");
      return (
        <form action={() => setState("Updated")} ref={formRef}>
          <Status />
          <Suspense fallback={<Text text="Loading..." />}>
            <AsyncText text={state} />
          </Suspense>
        </form>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    resolveText("Initial");
    await act(() => root.render(<App />));
    assertLog(["Initial"]);
    expect(container.textContent).toBe("Initial");

    await submit(formRef.current!);
    assertLog(["Pending...", "Suspend! [Updated]", "Loading..."]);
    expect(container.textContent).toBe("Pending...Initial");

    await act(() => resolveText("Updated"));
    assertLog(["Updated"]);
    expect(container.textContent).toBe("Updated");
  });

  it("multiple form actions", async () => {
    const formRef = React.createRef<HTMLFormElement>();

    function Status() {
      const { pending } = useFormStatus();
      return pending ? <Text text="Pending..." /> : null;
    }

    function App() {
      const [state, setState] = useState(0);
      return (
        <form action={() => setState((n) => n + 1)} ref={formRef}>
          <Status />
          <Suspense fallback={<Text text="Loading..." />}>
            <AsyncText text={"Count: " + state} />
          </Suspense>
        </form>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    resolveText("Count: 0");
    await act(() => root.render(<App />));
    assertLog(["Count: 0"]);
    expect(container.textContent).toBe("Count: 0");

    await submit(formRef.current!);
    assertLog(["Pending...", "Suspend! [Count: 1]", "Loading..."]);
    expect(container.textContent).toBe("Pending...Count: 0");

    await act(() => resolveText("Count: 1"));
    assertLog(["Count: 1"]);
    expect(container.textContent).toBe("Count: 1");

    await submit(formRef.current!);
    assertLog(["Pending...", "Suspend! [Count: 2]", "Loading..."]);
    expect(container.textContent).toBe("Pending...Count: 1");

    await act(() => resolveText("Count: 2"));
    assertLog(["Count: 2"]);
    expect(container.textContent).toBe("Count: 2");
  });

  it("form actions can be asynchronous", async () => {
    const formRef = React.createRef<HTMLFormElement>();

    function Status() {
      const { pending } = useFormStatus();
      return pending ? <Text text="Pending..." /> : null;
    }

    function App() {
      const [state, setState] = useState("Initial");
      return (
        <form
          action={async () => {
            log("Async action started");
            await getText("Wait");
            startTransition(() => setState("Updated"));
          }}
          ref={formRef}
        >
          <Status />
          <Suspense fallback={<Text text="Loading..." />}>
            <AsyncText text={state} />
          </Suspense>
        </form>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    resolveText("Initial");
    await act(() => root.render(<App />));
    assertLog(["Initial"]);
    expect(container.textContent).toBe("Initial");

    await submit(formRef.current!);
    assertLog(["Async action started", "Pending..."]);

    await act(() => resolveText("Wait"));
    assertLog(["Suspend! [Updated]", "Loading..."]);
    expect(container.textContent).toBe("Pending...Initial");

    await act(() => resolveText("Updated"));
    assertLog(["Updated"]);
    expect(container.textContent).toBe("Updated");
  });

  it("sync errors in form actions can be captured by an error boundary", async () => {
    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { error: Error | null }
    > {
      state = { error: null as Error | null };
      static getDerivedStateFromError(error: Error) {
        return { error };
      }
      render() {
        if (this.state.error !== null) {
          return <Text text={this.state.error.message} />;
        }
        return this.props.children;
      }
    }

    const formRef = React.createRef<HTMLFormElement>();

    function App() {
      return (
        <ErrorBoundary>
          <form
            action={() => {
              throw new Error("Oh no!");
            }}
            ref={formRef}
          >
            <Text text="Everything is fine" />
          </form>
        </ErrorBoundary>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));
    assertLog(["Everything is fine"]);
    expect(container.textContent).toBe("Everything is fine");

    await submit(formRef.current!);
    assertLog(["Oh no!", "Oh no!"]);
    expect(container.textContent).toBe("Oh no!");
  });

  it("async errors in form actions can be captured by an error boundary", async () => {
    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { error: Error | null }
    > {
      state = { error: null as Error | null };
      static getDerivedStateFromError(error: Error) {
        return { error };
      }
      render() {
        if (this.state.error !== null) {
          return <Text text={this.state.error.message} />;
        }
        return this.props.children;
      }
    }

    const formRef = React.createRef<HTMLFormElement>();

    function App() {
      return (
        <ErrorBoundary>
          <form
            action={async () => {
              log("Async action started");
              await getText("Wait");
              throw new Error("Oh no!");
            }}
            ref={formRef}
          >
            <Text text="Everything is fine" />
          </form>
        </ErrorBoundary>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));
    assertLog(["Everything is fine"]);
    expect(container.textContent).toBe("Everything is fine");

    await submit(formRef.current!);
    assertLog(["Async action started"]);
    expect(container.textContent).toBe("Everything is fine");

    await act(() => resolveText("Wait"));
    assertLog(["Oh no!", "Oh no!"]);
    expect(container.textContent).toBe("Oh no!");
  });

  it("useFormStatus reads the status of a pending form action", async () => {
    const formRef = React.createRef<HTMLFormElement>();

    function Status() {
      const { pending, data, action, method } = useFormStatus();
      if (!pending) {
        return <Text text="No pending action" />;
      } else {
        const foo = data!.get("foo");
        const actionName = typeof action === "function" ? action.name : action;
        return <Text text={`Pending action ${actionName}: foo is ${foo}, method is ${method}`} />;
      }
    }

    async function myAction() {
      log("Async action started");
      await getText("Wait");
      log("Async action finished");
    }

    function App() {
      return (
        <form action={myAction} ref={formRef}>
          <input type="text" name="foo" defaultValue="bar" />
          <Status />
        </form>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));
    assertLog(["No pending action"]);
    expect(container.textContent).toBe("No pending action");

    await submit(formRef.current!);
    assertLog(["Async action started", "Pending action myAction: foo is bar, method is get"]);
    expect(container.textContent).toBe("Pending action myAction: foo is bar, method is get");

    await act(() => resolveText("Wait"));
    assertLog(["Async action finished", "No pending action"]);
  });

  it("should error if submitting a form manually", async () => {
    const ref = React.createRef<HTMLFormElement>();

    let error: Error | null = null;
    let result: unknown = null;

    function emulateForceSubmit(submitter: HTMLFormElement) {
      const form = (submitter as any).form || submitter;
      const action =
        ((submitter as any).form && submitter.getAttribute("formaction")) || form.action;
      try {
        if (!/\s*javascript:/i.test(action)) {
          throw new Error("Navigate to: " + action);
        } else {
          result = Function(action.slice(11))();
        }
      } catch (thrown: any) {
        error = thrown;
      }
    }

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <form
          action={() => {}}
          ref={ref}
          onSubmit={(event) => {
            event.preventDefault();
            emulateForceSubmit(event.target as HTMLFormElement);
          }}
        >
          <input type="text" name="foo" defaultValue="bar" />
        </form>,
      );
    });

    await submit(ref.current!);
    expect(result).toBe(null);
    expect(error!.message).toContain("A React form was unexpectedly submitted.");
  });

  it("useActionState updates state asynchronously and queues multiple actions", async () => {
    let actionCounter = 0;
    async function action(state: number, type: string) {
      actionCounter++;
      log(`Async action started [${actionCounter}]`);
      await getText(`Wait [${actionCounter}]`);

      switch (type) {
        case "increment":
          return state + 1;
        case "decrement":
          return state - 1;
        default:
          return state;
      }
    }

    let dispatch: (payload: string) => void;
    function App() {
      const [state, _dispatch, isPending] = useActionState(action, 0);
      dispatch = _dispatch;
      const pending = isPending ? "Pending " : "";
      return <Text text={pending + state} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));
    assertLog(["0"]);
    expect(container.textContent).toBe("0");

    await act(() => startTransition(() => dispatch("increment")));
    assertLog(["Async action started [1]", "Pending 0"]);
    expect(container.textContent).toBe("Pending 0");

    await act(() => startTransition(() => dispatch("increment")));
    await act(() => startTransition(() => dispatch("decrement")));
    await act(() => startTransition(() => dispatch("increment")));
    assertLog([]);

    await act(() => resolveText("Wait [1]"));
    assertLog(["Async action started [2]"]);
    await act(() => resolveText("Wait [2]"));
    assertLog(["Async action started [3]"]);
    await act(() => resolveText("Wait [3]"));
    assertLog(["Async action started [4]"]);
    await act(() => resolveText("Wait [4]"));

    assertLog(["2"]);
    expect(container.textContent).toBe("2");
  });

  it("useActionState supports inline actions", async () => {
    let increment: () => void;
    function App({ stepSize }: { stepSize: number }) {
      const [state, dispatch, isPending] = useActionState(async (prevState: number) => {
        return prevState + stepSize;
      }, 0);
      increment = dispatch;
      const pending = isPending ? "Pending " : "";
      return <Text text={pending + state} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App stepSize={1} />));
    assertLog(["0"]);

    await act(() => startTransition(() => increment()));
    assertLog(["Pending 0", "1"]);

    await act(() => root.render(<App stepSize={10} />));
    assertLog(["1"]);

    await act(() => startTransition(() => increment()));
    assertLog(["Pending 1", "11"]);
  });

  it("useActionState: queues multiple actions and runs them in order", async () => {
    let action: (payload: string) => void;
    function App() {
      const [state, dispatch, isPending] = useActionState(
        async (_state: string, payload: string) => await getText(payload),
        "A",
      );
      action = dispatch;
      const pending = isPending ? "Pending " : "";
      return <Text text={pending + state} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));
    assertLog(["A"]);

    await act(() => startTransition(() => action("B")));
    assertLog(["Pending A"]);
    await act(() => startTransition(() => action("C")));
    await act(() => startTransition(() => action("D")));
    assertLog([]);

    await act(() => resolveText("B"));
    await act(() => resolveText("C"));
    await act(() => resolveText("D"));

    assertLog(["D"]);
    expect(container.textContent).toBe("D");
  });

  it(
    "useActionState: when calling a queued action, uses the implementation " +
      "that was current at the time it was dispatched, not the most recent one",
    async () => {
      let action: (payload: string) => void;
      function App({ throwIfActionIsDispatched }: { throwIfActionIsDispatched: boolean }) {
        const [state, dispatch, isPending] = useActionState(
          async (_state: string, payload: string) => {
            if (throwIfActionIsDispatched) {
              throw new Error("Oops!");
            }
            return await getText(payload);
          },
          "Initial",
        );
        action = dispatch;
        return <Text text={state + (isPending ? " (pending)" : "")} />;
      }

      const root = ReactDOMClient.createRoot(container);
      await act(() => root.render(<App throwIfActionIsDispatched={false} />));
      assertLog(["Initial"]);

      await act(() => startTransition(() => action("First action")));
      assertLog(["Initial (pending)"]);
      await act(() => startTransition(() => action("Second action")));

      await act(() => root.render(<App throwIfActionIsDispatched={true} />));
      assertLog(["Initial (pending)"]);

      await act(() => resolveText("First action"));
      await act(() => resolveText("Second action"));
      assertLog(["Second action"]);

      await expect(act(() => startTransition(() => action("Third action")))).rejects.toThrow(
        "Oops!",
      );
    },
  );

  it("useActionState: works if action is sync", async () => {
    let increment: () => void;
    function App({ stepSize }: { stepSize: number }) {
      const [state, dispatch, isPending] = useActionState((prevState: number) => {
        return prevState + stepSize;
      }, 0);
      increment = dispatch;
      const pending = isPending ? "Pending " : "";
      return <Text text={pending + state} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App stepSize={1} />));
    assertLog(["0"]);

    await act(() => startTransition(() => increment()));
    assertLog(["Pending 0", "1"]);

    await act(() => root.render(<App stepSize={10} />));
    assertLog(["1"]);

    await act(() => startTransition(() => increment()));
    assertLog(["Pending 1", "11"]);
  });

  it("useActionState: can mix sync and async actions", async () => {
    let action: (payload: any) => void;
    function App() {
      const [state, dispatch, isPending] = useActionState(
        (_state: string, payload: any) => payload as string,
        "A",
      );
      action = dispatch;
      const pending = isPending ? "Pending " : "";
      return <Text text={pending + state} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));
    assertLog(["A"]);

    await act(() => startTransition(() => action(getText("B"))));
    assertLog(["Pending A"]);
    await act(() => startTransition(() => action("C")));
    await act(() => startTransition(() => action(getText("D"))));
    await act(() => startTransition(() => action("E")));
    assertLog([]);

    await act(() => resolveText("B"));
    await act(() => resolveText("D"));
    assertLog(["E"]);
    expect(container.textContent).toBe("E");
  });

  it("useActionState: error handling (sync action)", async () => {
    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { error: Error | null }
    > {
      state = { error: null as Error | null };
      static getDerivedStateFromError(error: Error) {
        return { error };
      }
      render() {
        if (this.state.error !== null) {
          return <Text text={"Caught an error: " + this.state.error.message} />;
        }
        return this.props.children;
      }
    }

    let action: (payload: string) => void;
    function App() {
      const [state, dispatch, isPending] = useActionState((_state: string, payload: string) => {
        if (payload.endsWith("!")) {
          throw new Error(payload);
        }
        return payload;
      }, "A");
      action = dispatch;
      const pending = isPending ? "Pending " : "";
      return <Text text={pending + state} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() =>
      root.render(
        <ErrorBoundary>
          <App />
        </ErrorBoundary>,
      ),
    );
    assertLog(["A"]);

    await act(() => startTransition(() => action("Oops!")));
    assertLog(["Pending A", "Caught an error: Oops!", "Caught an error: Oops!"]);
    expect(container.textContent).toBe("Caught an error: Oops!");
  });

  it("useActionState: error handling (async action)", async () => {
    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { error: Error | null }
    > {
      state = { error: null as Error | null };
      static getDerivedStateFromError(error: Error) {
        return { error };
      }
      render() {
        if (this.state.error !== null) {
          return <Text text={"Caught an error: " + this.state.error.message} />;
        }
        return this.props.children;
      }
    }

    let action: (payload: string) => void;
    function App() {
      const [state, dispatch, isPending] = useActionState(
        async (_state: string, payload: string) => {
          const text = await getText(payload);
          if (text.endsWith("!")) {
            throw new Error(text);
          }
          return text;
        },
        "A",
      );
      action = dispatch;
      const pending = isPending ? "Pending " : "";
      return <Text text={pending + state} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() =>
      root.render(
        <ErrorBoundary>
          <App />
        </ErrorBoundary>,
      ),
    );
    assertLog(["A"]);

    await act(() => startTransition(() => action("Oops!")));
    assertLog(["Pending A"]);
    await act(() => resolveText("Oops!"));
    assertLog(["Caught an error: Oops!", "Caught an error: Oops!"]);
    expect(container.textContent).toBe("Caught an error: Oops!");
  });

  it("useActionState: when an action errors, subsequent actions are canceled", async () => {
    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { error: Error | null }
    > {
      state = { error: null as Error | null };
      static getDerivedStateFromError(error: Error) {
        return { error };
      }
      render() {
        if (this.state.error !== null) {
          return <Text text={"Caught an error: " + this.state.error.message} />;
        }
        return this.props.children;
      }
    }

    let action: (payload: string) => void;
    function App() {
      const [state, dispatch, isPending] = useActionState(
        async (_state: string, payload: string) => {
          log("Start action: " + payload);
          const text = await getText(payload);
          if (text.endsWith("!")) {
            throw new Error(text);
          }
          return text;
        },
        "A",
      );
      action = dispatch;
      const pending = isPending ? "Pending " : "";
      return <Text text={pending + state} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() =>
      root.render(
        <ErrorBoundary>
          <App />
        </ErrorBoundary>,
      ),
    );
    assertLog(["A"]);

    await act(() => startTransition(() => action("Oops!")));
    assertLog(["Start action: Oops!", "Pending A"]);

    await act(() => startTransition(() => action("Should never run")));
    assertLog([]);

    await act(() => resolveText("Oops!"));
    assertLog(["Caught an error: Oops!", "Caught an error: Oops!"]);
    expect(container.textContent).toBe("Caught an error: Oops!");

    await act(() => startTransition(() => action("This also should never run")));
    assertLog([]);
    expect(container.textContent).toBe("Caught an error: Oops!");
  });

  it("useActionState works in StrictMode", async () => {
    let actionCounter = 0;
    async function action(state: number, type: string) {
      actionCounter++;
      log(`Async action started [${actionCounter}]`);
      await getText(`Wait [${actionCounter}]`);

      switch (type) {
        case "increment":
          return state + 1;
        case "decrement":
          return state - 1;
        default:
          return state;
      }
    }

    let dispatch: (payload: string) => void;
    function App() {
      const [state, _dispatch, isPending] = useActionState(action, 0);
      dispatch = _dispatch;
      const pending = isPending ? "Pending " : "";
      return <Text text={pending + state} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() =>
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      ),
    );
    clearLog();
    expect(container.textContent).toBe("0");

    await act(() => startTransition(() => dispatch("increment")));
    assertLog(["Async action started [1]", "Pending 0", "Pending 0"]);
    expect(container.textContent).toBe("Pending 0");

    await act(() => resolveText("Wait [1]"));
    assertLog(["1", "1"]);
    expect(container.textContent).toBe("1");
  });

  it("useActionState does not wrap action in a transition unless dispatch is in a transition", async () => {
    let dispatch: () => void;
    function App() {
      const [state, _dispatch] = useActionState((prevState: number) => {
        return prevState + 1;
      }, 0);
      dispatch = _dispatch;
      return <AsyncText text={"Count: " + state} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() =>
      root.render(
        <Suspense fallback={<Text text="Loading..." />}>
          <App />
        </Suspense>,
      ),
    );
    clearLog();
    await act(() => resolveText("Count: 0"));
    assertLog(["Count: 0"]);

    await act(() => dispatch());
    clearLog();

    await act(() => resolveText("Count: 1"));
    assertLog(["Count: 1"]);
    expect(container.textContent).toBe("Count: 1");

    await act(() => startTransition(() => dispatch()));
    assertLog(["Count: 1", "Suspend! [Count: 2]", "Loading..."]);
    expect(container.textContent).toBe("Count: 1");

    await act(() => resolveText("Count: 2"));
    assertLog(["Count: 2"]);
    expect(container.textContent).toBe("Count: 2");
  });

  it("uncontrolled form inputs are reset after the action completes", async () => {
    const formRef = React.createRef<HTMLFormElement>();
    const inputRef = React.createRef<HTMLInputElement>();
    const divRef = React.createRef<HTMLDivElement>();

    let root: ReturnType<typeof ReactDOMClient.createRoot>;

    function App({ promiseForUsername }: { promiseForUsername: PromiseLike<string> }) {
      const username = use(promiseForUsername);

      return (
        <form
          ref={formRef}
          action={async (formData: FormData) => {
            const rawUsername = formData.get("username") as string;
            const normalizedUsername = rawUsername.trim().toLowerCase();

            log("Async action started");
            await getText("Wait");

            startTransition(() => {
              root.render(<App promiseForUsername={getText(normalizedUsername)} />);
            });
          }}
        >
          <input ref={inputRef} type="text" name="username" defaultValue={username} />
          <div ref={divRef}>
            <Text text={"Current username: " + username} />
          </div>
        </form>
      );
    }

    root = ReactDOMClient.createRoot(container);
    const promiseForInitialUsername = getText("(empty)");
    resolveText("(empty)");
    await act(() => root.render(<App promiseForUsername={promiseForInitialUsername} />));
    assertLog(["Current username: (empty)"]);
    expect(divRef.current!.textContent).toEqual("Current username: (empty)");

    inputRef.current!.value = "  AcdLite  ";

    await submit(formRef.current!);
    assertLog(["Async action started"]);
    expect(inputRef.current!.value).toBe("  AcdLite  ");

    await act(() => resolveText("Wait"));
    assertLog([]);
    expect(inputRef.current!.value).toBe("  AcdLite  ");
    expect(divRef.current!.textContent).toEqual("Current username: (empty)");

    await act(() => resolveText("acdlite"));
    await act(() => {});
    assertLog(["Current username: acdlite"]);
    expect(inputRef.current!.value).toBe("acdlite");
    expect(divRef.current!.textContent).toEqual("Current username: acdlite");
  });

  it("should fire onReset on automatic form reset", async () => {
    const formRef = React.createRef<HTMLFormElement>();
    const inputRef = React.createRef<HTMLInputElement>();

    let setValue: (value: number | ((prev: number) => number)) => void;
    const defaultValue = 0;
    function App() {
      const [value, _setValue] = useState(defaultValue);
      setValue = _setValue;

      return (
        <form
          ref={formRef}
          action={async () => {
            log("Async action started");
            await getText("Wait");
          }}
          onReset={() => {
            _setValue(defaultValue);
          }}
        >
          <input
            ref={inputRef}
            type="text"
            name="amount"
            value={String(value)}
            onChange={(event) => _setValue(Number(event.currentTarget.value))}
          />
        </form>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));

    await act(() => setValue(3));
    expect(inputRef.current!.value).toEqual("3");

    await submit(formRef.current!);
    assertLog(["Async action started"]);

    expect(inputRef.current!.value).toEqual("3");

    await act(() => resolveText("Wait"));
    clearLog();

    formRef.current!.dispatchEvent(new Event("reset", { bubbles: true }));
    await act(() => {});
    expect(inputRef.current!.value).toEqual("0");
  });

  it("requestFormReset schedules a form reset after transition completes", async () => {
    const formRef = React.createRef<HTMLFormElement>();
    const inputRef = React.createRef<HTMLInputElement>();
    const divRef = React.createRef<HTMLDivElement>();

    let root: ReturnType<typeof ReactDOMClient.createRoot>;

    function App({ promiseForUsername }: { promiseForUsername: PromiseLike<string> }) {
      const username = use(promiseForUsername);

      return (
        <form ref={formRef}>
          <input ref={inputRef} type="text" name="username" defaultValue={username} />
          <div ref={divRef}>
            <Text text={"Current username: " + username} />
          </div>
        </form>
      );
    }

    root = ReactDOMClient.createRoot(container);
    const promiseForInitialUsername = getText("(empty)");
    resolveText("(empty)");
    await act(() => root.render(<App promiseForUsername={promiseForInitialUsername} />));
    assertLog(["Current username: (empty)"]);
    expect(divRef.current!.textContent).toEqual("Current username: (empty)");

    inputRef.current!.value = "  AcdLite  ";

    await act(() => {
      startTransition(async () => {
        const form = formRef.current!;
        const formData = new FormData(form);
        requestFormReset(form);

        const rawUsername = formData.get("username") as string;
        const normalizedUsername = rawUsername.trim().toLowerCase();

        log("Async action started");
        await getText("Wait");

        startTransition(() => {
          root.render(<App promiseForUsername={getText(normalizedUsername)} />);
        });
      });
    });
    assertLog(["Async action started"]);
    expect(inputRef.current!.value).toBe("  AcdLite  ");

    await act(() => resolveText("Wait"));
    assertLog([]);
    expect(inputRef.current!.value).toBe("  AcdLite  ");
    expect(divRef.current!.textContent).toEqual("Current username: (empty)");

    await act(() => resolveText("acdlite"));
    await act(() => {});
    assertLog(["Current username: acdlite"]);
    expect(inputRef.current!.value).toBe("acdlite");
    expect(divRef.current!.textContent).toEqual("Current username: acdlite");
  });

  it("parallel form submissions do not throw", async () => {
    const formRef = React.createRef<HTMLFormElement>();
    let resolve: (() => void) | null = null;
    function App() {
      async function submitForm() {
        log("Action");
        if (!resolve) {
          await new Promise<void>((res) => {
            resolve = res;
          });
        }
      }
      return <form ref={formRef} action={submitForm} />;
    }
    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));

    await act(async () => {
      formRef.current!.requestSubmit();
    });
    assertLog(["Action"]);

    await act(async () => {
      formRef.current!.requestSubmit();
      resolve!();
    });
    assertLog(["Action"]);
  });

  it("requestFormReset works with inputs that are not descendants of the form element", async () => {
    const formRef = React.createRef<HTMLFormElement>();
    const inputRef = React.createRef<HTMLInputElement>();
    const divRef = React.createRef<HTMLDivElement>();

    let root: ReturnType<typeof ReactDOMClient.createRoot>;

    function App({ promiseForUsername }: { promiseForUsername: PromiseLike<string> }) {
      const username = use(promiseForUsername);

      return (
        <>
          <form id="myform" ref={formRef} />
          <input form="myform" ref={inputRef} type="text" name="username" defaultValue={username} />
          <div ref={divRef}>
            <Text text={"Current username: " + username} />
          </div>
        </>
      );
    }

    root = ReactDOMClient.createRoot(container);
    const promiseForInitialUsername = getText("(empty)");
    resolveText("(empty)");
    await act(() => root.render(<App promiseForUsername={promiseForInitialUsername} />));
    assertLog(["Current username: (empty)"]);
    expect(divRef.current!.textContent).toEqual("Current username: (empty)");

    inputRef.current!.value = "  AcdLite  ";

    await act(() => {
      startTransition(async () => {
        const form = formRef.current!;
        const formData = new FormData(form);
        requestFormReset(form);

        const rawUsername = formData.get("username") as string;
        const normalizedUsername = rawUsername.trim().toLowerCase();

        log("Async action started");
        await getText("Wait");

        startTransition(() => {
          root.render(<App promiseForUsername={getText(normalizedUsername)} />);
        });
      });
    });
    assertLog(["Async action started"]);
    expect(inputRef.current!.value).toBe("  AcdLite  ");

    await act(() => resolveText("Wait"));
    assertLog([]);
    expect(inputRef.current!.value).toBe("  AcdLite  ");
    expect(divRef.current!.textContent).toEqual("Current username: (empty)");

    await act(() => resolveText("acdlite"));
    await act(() => {});
    assertLog(["Current username: acdlite"]);
    expect(inputRef.current!.value).toBe("acdlite");
    expect(divRef.current!.textContent).toEqual("Current username: acdlite");
  });

  it("reset multiple forms in the same transition", async () => {
    const formRefA = React.createRef<HTMLFormElement>();
    const formRefB = React.createRef<HTMLFormElement>();

    let root: ReturnType<typeof ReactDOMClient.createRoot>;

    function App({
      promiseForA,
      promiseForB,
    }: {
      promiseForA: PromiseLike<string>;
      promiseForB: PromiseLike<string>;
    }) {
      const valueA = use(promiseForA);
      const valueB = use(promiseForB);
      return (
        <>
          <form ref={formRefA}>
            <input type="text" name="inputName" defaultValue={valueA} />
          </form>
          <form ref={formRefB}>
            <input type="text" name="inputName" defaultValue={valueB} />
          </form>
        </>
      );
    }

    root = ReactDOMClient.createRoot(container);
    const initialPromiseForA = getText("A1");
    const initialPromiseForB = getText("B1");
    resolveText("A1");
    resolveText("B1");
    await act(() =>
      root.render(<App promiseForA={initialPromiseForA} promiseForB={initialPromiseForB} />),
    );

    (formRefA.current!.elements.namedItem("inputName") as HTMLInputElement).value =
      "       A2       ";
    (formRefB.current!.elements.namedItem("inputName") as HTMLInputElement).value =
      "       B2       ";

    await act(() => {
      startTransition(async () => {
        const currentA = (formRefA.current!.elements.namedItem("inputName") as HTMLInputElement)
          .value;
        const currentB = (formRefB.current!.elements.namedItem("inputName") as HTMLInputElement)
          .value;

        requestFormReset(formRefA.current);
        requestFormReset(formRefB.current);

        log("Async action started");
        await getText("Wait");

        const normalizedA = currentA.trim();
        const normalizedB = currentB.trim();

        startTransition(() => {
          root.render(
            <App promiseForA={getText(normalizedA)} promiseForB={getText(normalizedB)} />,
          );
        });
      });
    });
    assertLog(["Async action started"]);

    await act(() => resolveText("Wait"));

    expect((formRefA.current!.elements.namedItem("inputName") as HTMLInputElement).value).toBe(
      "       A2       ",
    );
    expect((formRefB.current!.elements.namedItem("inputName") as HTMLInputElement).value).toBe(
      "       B2       ",
    );

    await act(() => {
      resolveText("A2");
      resolveText("B2");
    });
    await act(() => {});
    expect((formRefA.current!.elements.namedItem("inputName") as HTMLInputElement).value).toBe(
      "A2",
    );
    expect((formRefB.current!.elements.namedItem("inputName") as HTMLInputElement).value).toBe(
      "B2",
    );
  });

  it("requestFormReset throws if the form is not managed by React", async () => {
    container.innerHTML = `
      <form id="myform">
        <input id="input" type="text" name="greeting" />
      </form>
    `;

    const form = document.getElementById("myform") as HTMLFormElement;
    const input = document.getElementById("input") as HTMLInputElement;

    input.value = "Hi!!!!!!!!!!!!!";

    expect(() => requestFormReset(form)).toThrow("Invalid form element.");
    expect(input.value).toBe("Hi!!!!!!!!!!!!!");

    form.reset();
    expect(input.value).toBe("");
  });

  it("requestFormReset throws on a non-form DOM element", async () => {
    const root = ReactDOMClient.createRoot(container);
    const ref = React.createRef<HTMLDivElement>();
    await act(() => root.render(<div ref={ref}>Hi</div>));
    const div = ref.current!;
    expect(div.textContent).toBe("Hi");

    expect(() => requestFormReset(div)).toThrow("Invalid form element.");
  });

  it("warns if requestFormReset is called outside of a transition", async () => {
    const formRef = React.createRef<HTMLFormElement>();
    const inputRef = React.createRef<HTMLInputElement>();

    function App() {
      return (
        <form ref={formRef}>
          <input ref={inputRef} type="text" defaultValue="Initial" />
        </form>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));

    inputRef.current!.value = "  Updated  ";

    await act(() => {
      startTransition(async () => {
        log("Action started");
        await getText("Wait 1");
        log("Request form reset");

        requestFormReset(formRef.current);

        await getText("Wait 2");
        log("Action finished");
      });
    });
    assertLog(["Action started"]);
    expect(inputRef.current!.value).toBe("  Updated  ");

    await act(() => resolveText("Wait 1"));
    assertLog(["Request form reset"]);

    expect(inputRef.current!.value).toBe("Initial");
  });

  it("regression: submitter's formAction prop is coerced correctly before checking if it exists", async () => {
    const buttonRef = React.createRef<HTMLButtonElement>();

    function App({ submitterAction }: { submitterAction: any }) {
      return (
        <form action={() => log("Form action")}>
          <button ref={buttonRef} type="submit" formAction={submitterAction} />
        </form>
      );
    }

    const root = ReactDOMClient.createRoot(container);

    await act(() => root.render(<App submitterAction={() => log("Button action")} />));
    await submit(buttonRef.current!);
    assertLog(["Button action"]);

    await act(() => root.render(<App submitterAction={null} />));
    await submit(buttonRef.current!);
    assertLog(["Form action"]);

    await act(() => root.render(<App submitterAction={true} />));
    await submit(buttonRef.current!);
    assertLog(["Form action"]);

    await act(() => root.render(<App submitterAction="https://react.dev/" />));
    await expect(submit(buttonRef.current!)).rejects.toThrow("Navigate to: https://react.dev/");
  });

  it("useFormStatus is activated if startTransition is called inside preventDefault-ed submit event", async () => {
    const formRef = React.createRef<HTMLFormElement>();
    const inputRef = React.createRef<HTMLInputElement>();
    const outputRef = React.createRef<HTMLDivElement>();

    let root: ReturnType<typeof ReactDOMClient.createRoot>;

    function Output({ value }: { value: string }) {
      const { pending } = useFormStatus();
      return <Text text={pending ? `${value} (pending...)` : value} />;
    }

    function App({ value }: { value: string }) {
      const [, startFormTransition] = useTransition();

      function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        startFormTransition(async () => {
          const updatedValue = (event.target as HTMLFormElement).elements.namedItem(
            "search",
          ) as HTMLInputElement;
          log("Action started");
          await getText("Wait");
          log("Action finished");
          startTransition(() => root.render(<App value={updatedValue.value} />));
        });
      }
      return (
        <form ref={formRef} onSubmit={onSubmit}>
          <input ref={inputRef} type="text" name="search" defaultValue={value} />
          <div ref={outputRef}>
            <Output value={value} />
          </div>
        </form>
      );
    }

    root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App value="Initial" />));
    assertLog(["Initial"]);

    inputRef.current!.value = "Updated";

    await submit(formRef.current!);
    assertLog(["Action started", "Initial (pending...)"]);
    expect(outputRef.current!.textContent).toBe("Initial (pending...)");

    inputRef.current!.value = "Updated again after submission";

    await act(async () => {
      resolveText("Wait");
      await new Promise((r) => setTimeout(r, 10));
    });
    assertLog(["Action finished"]);

    await act(async () => {
      root.render(<App value="Updated" />);
    });
    clearLog();
    expect(outputRef.current!.textContent).toContain("Updated");
  });

  it("useFormStatus is not activated if startTransition is not called", async () => {
    const formRef = React.createRef<HTMLFormElement>();
    const inputRef = React.createRef<HTMLInputElement>();
    const outputRef = React.createRef<HTMLDivElement>();

    let root: ReturnType<typeof ReactDOMClient.createRoot>;

    function Output({ value }: { value: string }) {
      const { pending } = useFormStatus();
      return (
        <Text
          text={
            pending
              ? "Should be unreachable! This test should never activate the pending state."
              : value
          }
        />
      );
    }

    function App({ value }: { value: string }) {
      async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const updatedValue = (event.target as HTMLFormElement).elements.namedItem(
          "search",
        ) as HTMLInputElement;
        log("Async event handler started");
        await getText("Wait");
        log("Async event handler finished");
        startTransition(() => root.render(<App value={updatedValue.value} />));
      }
      return (
        <form ref={formRef} onSubmit={onSubmit}>
          <input ref={inputRef} type="text" name="search" defaultValue={value} />
          <div ref={outputRef}>
            <Output value={value} />
          </div>
        </form>
      );
    }

    root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App value="Initial" />));
    assertLog(["Initial"]);

    inputRef.current!.value = "Updated";

    await submit(formRef.current!);
    assertLog(["Async event handler started"]);
    expect(outputRef.current!.textContent).toBe("Initial");

    inputRef.current!.value = "Updated again after submission";

    await act(async () => {
      resolveText("Wait");
      await new Promise((r) => setTimeout(r, 10));
    });
    assertLog(["Async event handler finished"]);

    await act(async () => {
      root.render(<App value="Updated" />);
    });
    assertLog(["Updated"]);
    expect(outputRef.current!.textContent).toBe("Updated");
  });

  it("useFormStatus is not activated if event is not preventDefault-ed", async () => {
    const formRef = React.createRef<HTMLFormElement>();
    const inputRef = React.createRef<HTMLInputElement>();
    const outputRef = React.createRef<HTMLDivElement>();

    let root: ReturnType<typeof ReactDOMClient.createRoot>;

    function Output({ value }: { value: string }) {
      const { pending } = useFormStatus();
      return <Text text={pending ? `${value} (pending...)` : value} />;
    }

    function App({ value }: { value: string }) {
      const [, startFormTransition] = useTransition();

      function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        startFormTransition(async () => {
          const updatedValue = (event.target as HTMLFormElement).elements.namedItem(
            "search",
          ) as HTMLInputElement;
          log("Action started");
          await getText("Wait");
          log("Action finished");
          startTransition(() => root.render(<App value={updatedValue.value} />));
        });
      }
      return (
        <form ref={formRef} onSubmit={onSubmit}>
          <input ref={inputRef} type="text" name="search" defaultValue={value} />
          <div ref={outputRef}>
            <Output value={value} />
          </div>
        </form>
      );
    }

    root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App value="Initial" />));
    assertLog(["Initial"]);

    inputRef.current!.value = "Updated";

    await expect(submit(formRef.current!)).rejects.toThrow("Navigate to: http://localhost");

    assertLog(["Action started", "Initial"]);
    expect(outputRef.current!.textContent).toBe("Initial");
  });

  it("form actions should retain status when nested state changes", async () => {
    const formRef = React.createRef<HTMLFormElement>();

    let rerenderUnrelatedStatus: () => void;
    function UnrelatedStatus() {
      const { pending } = useFormStatus();
      const [counter, setCounter] = useState(0);
      rerenderUnrelatedStatus = () => setCounter((n) => n + 1);
      log(`[unrelated form] pending: ${pending}, state: ${counter}`);
      return null;
    }

    let rerenderTargetStatus: () => void;
    function TargetStatus() {
      const { pending } = useFormStatus();
      const [counter, setCounter] = useState(0);
      log(`[target form] pending: ${pending}, state: ${counter}`);
      rerenderTargetStatus = () => setCounter((n) => n + 1);
      return null;
    }

    function App() {
      async function action(): Promise<void> {
        await new Promise(() => {});
      }

      return (
        <>
          <form action={action} ref={formRef}>
            <input type="submit" />
            <TargetStatus />
          </form>
          <form>
            <UnrelatedStatus />
          </form>
        </>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App />));

    assertLog([
      "[target form] pending: false, state: 0",
      "[unrelated form] pending: false, state: 0",
    ]);

    await submit(formRef.current!);

    assertLog(["[target form] pending: true, state: 0"]);

    await act(() => rerenderTargetStatus!());

    assertLog(["[target form] pending: false, state: 1"]);

    await act(() => rerenderUnrelatedStatus!());

    assertLog(["[unrelated form] pending: false, state: 1"]);
  });
});
