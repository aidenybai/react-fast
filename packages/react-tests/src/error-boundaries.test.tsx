import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, log, assertLog, clearLog } from "./utils";

interface ChildrenProps {
  children?: React.ReactNode;
}

interface ErrorTextProps extends ChildrenProps {
  errorText?: string;
}

interface NormalProps extends ChildrenProps {
  logName?: string;
}

interface ErrorBoundaryProps extends ChildrenProps {
  logName?: string;
  errorMessageRef?: React.Ref<HTMLDivElement>;
  forceRetry?: boolean;
  renderError?: (error: Error, props: ErrorBoundaryProps) => React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

interface ErrorMessageProps {
  message: string;
}

interface BrokenBoundaryProps extends ChildrenProps {
  renderError?: (error: Error) => React.ReactNode;
}

describe("ReactErrorBoundaries", () => {
  class BrokenConstructor extends React.Component<ChildrenProps> {
    constructor(props: ChildrenProps) {
      super(props);
      log("BrokenConstructor constructor [!]");
      throw new Error("Hello");
    }
    render() {
      log("BrokenConstructor render");
      return <div>{this.props.children}</div>;
    }
    UNSAFE_componentWillMount() {
      log("BrokenConstructor componentWillMount");
    }
    componentDidMount() {
      log("BrokenConstructor componentDidMount");
    }
    UNSAFE_componentWillReceiveProps() {
      log("BrokenConstructor componentWillReceiveProps");
    }
    UNSAFE_componentWillUpdate() {
      log("BrokenConstructor componentWillUpdate");
    }
    componentDidUpdate() {
      log("BrokenConstructor componentDidUpdate");
    }
    componentWillUnmount() {
      log("BrokenConstructor componentWillUnmount");
    }
  }

  class BrokenComponentWillMount extends React.Component<ChildrenProps> {
    constructor(props: ChildrenProps) {
      super(props);
      log("BrokenComponentWillMount constructor");
    }
    render() {
      log("BrokenComponentWillMount render");
      return <div>{this.props.children}</div>;
    }
    UNSAFE_componentWillMount() {
      log("BrokenComponentWillMount componentWillMount [!]");
      throw new Error("Hello");
    }
    componentDidMount() {
      log("BrokenComponentWillMount componentDidMount");
    }
    UNSAFE_componentWillReceiveProps() {
      log("BrokenComponentWillMount componentWillReceiveProps");
    }
    UNSAFE_componentWillUpdate() {
      log("BrokenComponentWillMount componentWillUpdate");
    }
    componentDidUpdate() {
      log("BrokenComponentWillMount componentDidUpdate");
    }
    componentWillUnmount() {
      log("BrokenComponentWillMount componentWillUnmount");
    }
  }

  class BrokenComponentDidMount extends React.Component<ChildrenProps> {
    constructor(props: ChildrenProps) {
      super(props);
      log("BrokenComponentDidMount constructor");
    }
    render() {
      log("BrokenComponentDidMount render");
      return <div>{this.props.children}</div>;
    }
    UNSAFE_componentWillMount() {
      log("BrokenComponentDidMount componentWillMount");
    }
    componentDidMount() {
      log("BrokenComponentDidMount componentDidMount [!]");
      throw new Error("Hello");
    }
    UNSAFE_componentWillReceiveProps() {
      log("BrokenComponentDidMount componentWillReceiveProps");
    }
    UNSAFE_componentWillUpdate() {
      log("BrokenComponentDidMount componentWillUpdate");
    }
    componentDidUpdate() {
      log("BrokenComponentDidMount componentDidUpdate");
    }
    componentWillUnmount() {
      log("BrokenComponentDidMount componentWillUnmount");
    }
  }

  class BrokenComponentWillReceiveProps extends React.Component<ChildrenProps> {
    constructor(props: ChildrenProps) {
      super(props);
      log("BrokenComponentWillReceiveProps constructor");
    }
    render() {
      log("BrokenComponentWillReceiveProps render");
      return <div>{this.props.children}</div>;
    }
    UNSAFE_componentWillMount() {
      log("BrokenComponentWillReceiveProps componentWillMount");
    }
    componentDidMount() {
      log("BrokenComponentWillReceiveProps componentDidMount");
    }
    UNSAFE_componentWillReceiveProps() {
      log(
        "BrokenComponentWillReceiveProps componentWillReceiveProps [!]",
      );
      throw new Error("Hello");
    }
    UNSAFE_componentWillUpdate() {
      log("BrokenComponentWillReceiveProps componentWillUpdate");
    }
    componentDidUpdate() {
      log("BrokenComponentWillReceiveProps componentDidUpdate");
    }
    componentWillUnmount() {
      log("BrokenComponentWillReceiveProps componentWillUnmount");
    }
  }

  class BrokenComponentWillUpdate extends React.Component<ChildrenProps> {
    constructor(props: ChildrenProps) {
      super(props);
      log("BrokenComponentWillUpdate constructor");
    }
    render() {
      log("BrokenComponentWillUpdate render");
      return <div>{this.props.children}</div>;
    }
    UNSAFE_componentWillMount() {
      log("BrokenComponentWillUpdate componentWillMount");
    }
    componentDidMount() {
      log("BrokenComponentWillUpdate componentDidMount");
    }
    UNSAFE_componentWillReceiveProps() {
      log("BrokenComponentWillUpdate componentWillReceiveProps");
    }
    UNSAFE_componentWillUpdate() {
      log("BrokenComponentWillUpdate componentWillUpdate [!]");
      throw new Error("Hello");
    }
    componentDidUpdate() {
      log("BrokenComponentWillUpdate componentDidUpdate");
    }
    componentWillUnmount() {
      log("BrokenComponentWillUpdate componentWillUnmount");
    }
  }

  class BrokenComponentDidUpdate extends React.Component<ErrorTextProps> {
    static defaultProps = {
      errorText: "Hello",
    };
    constructor(props: ErrorTextProps) {
      super(props);
      log("BrokenComponentDidUpdate constructor");
    }
    render() {
      log("BrokenComponentDidUpdate render");
      return <div>{this.props.children}</div>;
    }
    UNSAFE_componentWillMount() {
      log("BrokenComponentDidUpdate componentWillMount");
    }
    componentDidMount() {
      log("BrokenComponentDidUpdate componentDidMount");
    }
    UNSAFE_componentWillReceiveProps() {
      log("BrokenComponentDidUpdate componentWillReceiveProps");
    }
    UNSAFE_componentWillUpdate() {
      log("BrokenComponentDidUpdate componentWillUpdate");
    }
    componentDidUpdate() {
      log("BrokenComponentDidUpdate componentDidUpdate [!]");
      throw new Error(this.props.errorText);
    }
    componentWillUnmount() {
      log("BrokenComponentDidUpdate componentWillUnmount");
    }
  }

  class BrokenComponentWillUnmount extends React.Component<ErrorTextProps> {
    static defaultProps = {
      errorText: "Hello",
    };
    constructor(props: ErrorTextProps) {
      super(props);
      log("BrokenComponentWillUnmount constructor");
    }
    render() {
      log("BrokenComponentWillUnmount render");
      return <div>{this.props.children}</div>;
    }
    UNSAFE_componentWillMount() {
      log("BrokenComponentWillUnmount componentWillMount");
    }
    componentDidMount() {
      log("BrokenComponentWillUnmount componentDidMount");
    }
    UNSAFE_componentWillReceiveProps() {
      log("BrokenComponentWillUnmount componentWillReceiveProps");
    }
    UNSAFE_componentWillUpdate() {
      log("BrokenComponentWillUnmount componentWillUpdate");
    }
    componentDidUpdate() {
      log("BrokenComponentWillUnmount componentDidUpdate");
    }
    componentWillUnmount() {
      log("BrokenComponentWillUnmount componentWillUnmount [!]");
      throw new Error(this.props.errorText);
    }
  }

  class BrokenComponentWillMountErrorBoundary extends React.Component<
    ChildrenProps,
    ErrorBoundaryState
  > {
    constructor(props: ChildrenProps) {
      super(props);
      this.state = { error: null };
      log("BrokenComponentWillMountErrorBoundary constructor");
    }
    render() {
      if (this.state.error) {
        log("BrokenComponentWillMountErrorBoundary render error");
        return <div>Caught an error: {this.state.error.message}.</div>;
      }
      log("BrokenComponentWillMountErrorBoundary render success");
      return <div>{this.props.children}</div>;
    }
    UNSAFE_componentWillMount() {
      log(
        "BrokenComponentWillMountErrorBoundary componentWillMount [!]",
      );
      throw new Error("Hello");
    }
    componentDidMount() {
      log("BrokenComponentWillMountErrorBoundary componentDidMount");
    }
    componentWillUnmount() {
      log(
        "BrokenComponentWillMountErrorBoundary componentWillUnmount",
      );
    }
    static getDerivedStateFromError(error: Error) {
      log(
        "BrokenComponentWillMountErrorBoundary static getDerivedStateFromError",
      );
      return { error };
    }
  }

  class BrokenComponentDidMountErrorBoundary extends React.Component<
    BrokenBoundaryProps,
    ErrorBoundaryState
  > {
    constructor(props: BrokenBoundaryProps) {
      super(props);
      this.state = { error: null };
      log("BrokenComponentDidMountErrorBoundary constructor");
    }
    render() {
      if (this.state.error) {
        log("BrokenComponentDidMountErrorBoundary render error");
        return <div>Caught an error: {this.state.error.message}.</div>;
      }
      log("BrokenComponentDidMountErrorBoundary render success");
      return <div>{this.props.children}</div>;
    }
    UNSAFE_componentWillMount() {
      log(
        "BrokenComponentDidMountErrorBoundary componentWillMount",
      );
    }
    componentDidMount() {
      log(
        "BrokenComponentDidMountErrorBoundary componentDidMount [!]",
      );
      throw new Error("Hello");
    }
    componentWillUnmount() {
      log(
        "BrokenComponentDidMountErrorBoundary componentWillUnmount",
      );
    }
    static getDerivedStateFromError(error: Error) {
      log(
        "BrokenComponentDidMountErrorBoundary static getDerivedStateFromError",
      );
      return { error };
    }
  }

  class BrokenRenderErrorBoundary extends React.Component<
    ChildrenProps,
    ErrorBoundaryState
  > {
    constructor(props: ChildrenProps) {
      super(props);
      this.state = { error: null };
      log("BrokenRenderErrorBoundary constructor");
    }
    render() {
      if (this.state.error) {
        log("BrokenRenderErrorBoundary render error [!]");
        throw new Error("Hello");
      }
      log("BrokenRenderErrorBoundary render success");
      return <div>{this.props.children}</div>;
    }
    UNSAFE_componentWillMount() {
      log("BrokenRenderErrorBoundary componentWillMount");
    }
    componentDidMount() {
      log("BrokenRenderErrorBoundary componentDidMount");
    }
    componentWillUnmount() {
      log("BrokenRenderErrorBoundary componentWillUnmount");
    }
    static getDerivedStateFromError(error: Error) {
      log(
        "BrokenRenderErrorBoundary static getDerivedStateFromError",
      );
      return { error };
    }
  }

  class BrokenRender extends React.Component<ChildrenProps> {
    constructor(props: ChildrenProps) {
      super(props);
      log("BrokenRender constructor");
    }
    render(): React.ReactNode {
      log("BrokenRender render [!]");
      throw new Error("Hello");
    }
    UNSAFE_componentWillMount() {
      log("BrokenRender componentWillMount");
    }
    componentDidMount() {
      log("BrokenRender componentDidMount");
    }
    UNSAFE_componentWillReceiveProps() {
      log("BrokenRender componentWillReceiveProps");
    }
    UNSAFE_componentWillUpdate() {
      log("BrokenRender componentWillUpdate");
    }
    componentDidUpdate() {
      log("BrokenRender componentDidUpdate");
    }
    componentWillUnmount() {
      log("BrokenRender componentWillUnmount");
    }
  }

  const BrokenUseEffect = ({ children }: ChildrenProps) => {
    log("BrokenUseEffect render");

    React.useEffect(() => {
      log("BrokenUseEffect useEffect [!]");
      throw new Error("Hello");
    });

    return children;
  };

  const BrokenUseLayoutEffect = ({ children }: ChildrenProps) => {
    log("BrokenUseLayoutEffect render");

    React.useLayoutEffect(() => {
      log("BrokenUseLayoutEffect useLayoutEffect [!]");
      throw new Error("Hello");
    });

    return children;
  };

  class NoopErrorBoundary extends React.Component<ChildrenProps> {
    constructor(props: ChildrenProps) {
      super(props);
      log("NoopErrorBoundary constructor");
    }
    render() {
      log("NoopErrorBoundary render");
      return <BrokenRender />;
    }
    UNSAFE_componentWillMount() {
      log("NoopErrorBoundary componentWillMount");
    }
    componentDidMount() {
      log("NoopErrorBoundary componentDidMount");
    }
    componentWillUnmount() {
      log("NoopErrorBoundary componentWillUnmount");
    }
    static getDerivedStateFromError() {
      log("NoopErrorBoundary static getDerivedStateFromError");
      return null;
    }
  }

  class Normal extends React.Component<NormalProps> {
    static defaultProps = {
      logName: "Normal",
    };
    constructor(props: NormalProps) {
      super(props);
      log(`${this.props.logName} constructor`);
    }
    render() {
      log(`${this.props.logName} render`);
      return <div>{this.props.children}</div>;
    }
    UNSAFE_componentWillMount() {
      log(`${this.props.logName} componentWillMount`);
    }
    componentDidMount() {
      log(`${this.props.logName} componentDidMount`);
    }
    UNSAFE_componentWillReceiveProps() {
      log(`${this.props.logName} componentWillReceiveProps`);
    }
    UNSAFE_componentWillUpdate() {
      log(`${this.props.logName} componentWillUpdate`);
    }
    componentDidUpdate() {
      log(`${this.props.logName} componentDidUpdate`);
    }
    componentWillUnmount() {
      log(`${this.props.logName} componentWillUnmount`);
    }
  }

  class ErrorBoundary extends React.Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
  > {
    static defaultProps = {
      logName: "ErrorBoundary",
      renderError: (error: Error, props: ErrorBoundaryProps) => (
        <div ref={props.errorMessageRef}>
          Caught an error: {error.message}.
        </div>
      ),
    };
    constructor(props: ErrorBoundaryProps) {
      super(props);
      this.state = { error: null };
      log(`${this.props.logName} constructor`);
    }
    render() {
      if (this.state.error && !this.props.forceRetry) {
        log(`${this.props.logName} render error`);
        return this.props.renderError!(this.state.error, this.props);
      }
      log(`${this.props.logName} render success`);
      return <div>{this.props.children}</div>;
    }
    static getDerivedStateFromError(error: Error) {
      log("ErrorBoundary static getDerivedStateFromError");
      return { error };
    }
    UNSAFE_componentWillMount() {
      log(`${this.props.logName} componentWillMount`);
    }
    componentDidMount() {
      log(`${this.props.logName} componentDidMount`);
    }
    UNSAFE_componentWillReceiveProps() {
      log(`${this.props.logName} componentWillReceiveProps`);
    }
    UNSAFE_componentWillUpdate() {
      log(`${this.props.logName} componentWillUpdate`);
    }
    componentDidUpdate() {
      log(`${this.props.logName} componentDidUpdate`);
    }
    componentWillUnmount() {
      log(`${this.props.logName} componentWillUnmount`);
    }
  }

  class RetryErrorBoundary extends React.Component<ChildrenProps> {
    constructor(props: ChildrenProps) {
      super(props);
      log("RetryErrorBoundary constructor");
    }
    render() {
      log("RetryErrorBoundary render");
      return <BrokenRender />;
    }
    UNSAFE_componentWillMount() {
      log("RetryErrorBoundary componentWillMount");
    }
    componentDidMount() {
      log("RetryErrorBoundary componentDidMount");
    }
    componentWillUnmount() {
      log("RetryErrorBoundary componentWillUnmount");
    }
    static getDerivedStateFromError() {
      log(
        "RetryErrorBoundary static getDerivedStateFromError [!]",
      );
      return {};
    }
  }

  class ErrorMessage extends React.Component<ErrorMessageProps> {
    constructor(props: ErrorMessageProps) {
      super(props);
      log("ErrorMessage constructor");
    }
    UNSAFE_componentWillMount() {
      log("ErrorMessage componentWillMount");
    }
    componentDidMount() {
      log("ErrorMessage componentDidMount");
    }
    componentWillUnmount() {
      log("ErrorMessage componentWillUnmount");
    }
    render() {
      log("ErrorMessage render");
      return <div>Caught an error: {this.props.message}.</div>;
    }
  }

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    clearLog();
    vi.restoreAllMocks();
  });

  it("does not swallow exceptions on mounting without boundaries", async () => {
    let container = document.createElement("div");
    let root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(async () => {
        root.render(<BrokenRender />);
      });
    }).rejects.toThrow("Hello");

    clearLog();
    container = document.createElement("div");
    root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(async () => {
        root.render(<BrokenComponentWillMount />);
      });
    }).rejects.toThrow("Hello");

    clearLog();
    container = document.createElement("div");
    root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(async () => {
        root.render(<BrokenComponentDidMount />);
      });
    }).rejects.toThrow("Hello");
  });

  it("does not swallow exceptions on updating without boundaries", async () => {
    let container = document.createElement("div");
    let root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<BrokenComponentWillUpdate />);
    });
    clearLog();
    await expect(async () => {
      await act(async () => {
        root.render(<BrokenComponentWillUpdate />);
      });
    }).rejects.toThrow("Hello");

    clearLog();
    container = document.createElement("div");
    root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<BrokenComponentWillReceiveProps />);
    });
    clearLog();
    await expect(async () => {
      await act(async () => {
        root.render(<BrokenComponentWillReceiveProps />);
      });
    }).rejects.toThrow("Hello");

    clearLog();
    container = document.createElement("div");
    root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<BrokenComponentDidUpdate />);
    });
    clearLog();
    await expect(async () => {
      await act(async () => {
        root.render(<BrokenComponentDidUpdate />);
      });
    }).rejects.toThrow("Hello");
  });

  it("does not swallow exceptions on unmounting without boundaries", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<BrokenComponentWillUnmount />);
    });
    clearLog();
    await expect(async () => {
      await act(() => root.unmount());
    }).rejects.toThrow("Hello");
  });

  it("prevents errors from leaking into other roots", async () => {
    const container1 = document.createElement("div");
    const root1 = ReactDOMClient.createRoot(container1);
    const container2 = document.createElement("div");
    const root2 = ReactDOMClient.createRoot(container2);
    const container3 = document.createElement("div");
    const root3 = ReactDOMClient.createRoot(container3);

    await act(async () => {
      root1.render(<span>Before 1</span>);
    });
    await expect(async () => {
      await act(async () => {
        root2.render(<BrokenRender />);
      });
    }).rejects.toThrow("Hello");

    assertLog([
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
    ]);
    await act(async () => {
      root3.render(
        <ErrorBoundary>
          <BrokenRender />
        </ErrorBoundary>,
      );
    });
    expect(container1.firstChild?.textContent).toBe("Before 1");
    expect(container2.firstChild).toBe(null);
    expect(container3.firstChild?.textContent).toBe(
      "Caught an error: Hello.",
    );

    clearLog();
    await act(async () => {
      root1.render(<span>After 1</span>);
    });
    clearLog();
    await act(async () => {
      root2.render(<span>After 2</span>);
    });
    clearLog();
    await act(async () => {
      root3.render(
        <ErrorBoundary forceRetry={true}>After 3</ErrorBoundary>,
      );
    });
    expect(container1.firstChild?.textContent).toBe("After 1");
    expect(container2.firstChild?.textContent).toBe("After 2");
    expect(container3.firstChild?.textContent).toBe("After 3");
    root1.unmount();
    root2.unmount();
    root3.unmount();
    expect(container1.firstChild).toBe(null);
    expect(container2.firstChild).toBe(null);
    expect(container3.firstChild).toBe(null);
  });

  it("logs a single error when using error boundary", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <BrokenRender />
        </ErrorBoundary>,
      );
    });

    expect(container.firstChild?.textContent).toBe(
      "Caught an error: Hello.",
    );
    assertLog([
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render error",
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render error",
      "ErrorBoundary componentDidMount",
    ]);

    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("renders an error state if child throws in render", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <BrokenRender />
        </ErrorBoundary>,
      );
    });
    expect(container.firstChild?.textContent).toBe(
      "Caught an error: Hello.",
    );
    assertLog([
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render error",
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render error",
      "ErrorBoundary componentDidMount",
    ]);

    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("renders an error state if child throws in constructor", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <BrokenConstructor />
        </ErrorBoundary>,
      );
    });
    expect(container.firstChild?.textContent).toBe(
      "Caught an error: Hello.",
    );
    assertLog([
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "BrokenConstructor constructor [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render error",
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "BrokenConstructor constructor [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render error",
      "ErrorBoundary componentDidMount",
    ]);

    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("renders an error state if child throws in componentWillMount", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <BrokenComponentWillMount />
        </ErrorBoundary>,
      );
    });
    expect(container.firstChild?.textContent).toBe(
      "Caught an error: Hello.",
    );
    assertLog([
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "BrokenComponentWillMount constructor",
      "BrokenComponentWillMount componentWillMount [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render error",
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "BrokenComponentWillMount constructor",
      "BrokenComponentWillMount componentWillMount [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render error",
      "ErrorBoundary componentDidMount",
    ]);

    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("mounts the error message if mounting fails", async () => {
    const renderError = (error: Error) => (
      <ErrorMessage message={error.message} />
    );

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary renderError={renderError}>
          <BrokenRender />
        </ErrorBoundary>,
      );
    });
    assertLog([
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render error",
      "ErrorMessage constructor",
      "ErrorMessage componentWillMount",
      "ErrorMessage render",
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render error",
      "ErrorMessage constructor",
      "ErrorMessage componentWillMount",
      "ErrorMessage render",
      "ErrorMessage componentDidMount",
      "ErrorBoundary componentDidMount",
    ]);

    root.unmount();
    assertLog([
      "ErrorBoundary componentWillUnmount",
      "ErrorMessage componentWillUnmount",
    ]);
  });

  it("propagates errors on retry on mounting", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <RetryErrorBoundary>
            <BrokenRender />
          </RetryErrorBoundary>
        </ErrorBoundary>,
      );
    });
    expect(container.firstChild?.textContent).toBe(
      "Caught an error: Hello.",
    );
    assertLog([
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "RetryErrorBoundary constructor",
      "RetryErrorBoundary componentWillMount",
      "RetryErrorBoundary render",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "RetryErrorBoundary static getDerivedStateFromError [!]",
      "RetryErrorBoundary componentWillMount",
      "RetryErrorBoundary render",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render error",
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "RetryErrorBoundary constructor",
      "RetryErrorBoundary componentWillMount",
      "RetryErrorBoundary render",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "RetryErrorBoundary static getDerivedStateFromError [!]",
      "RetryErrorBoundary componentWillMount",
      "RetryErrorBoundary render",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render error",
      "ErrorBoundary componentDidMount",
    ]);

    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("propagates errors inside boundary during componentWillMount", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <BrokenComponentWillMountErrorBoundary />
        </ErrorBoundary>,
      );
    });
    expect(container.firstChild?.textContent).toBe(
      "Caught an error: Hello.",
    );
    assertLog([
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "BrokenComponentWillMountErrorBoundary constructor",
      "BrokenComponentWillMountErrorBoundary componentWillMount [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render error",
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "BrokenComponentWillMountErrorBoundary constructor",
      "BrokenComponentWillMountErrorBoundary componentWillMount [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render error",
      "ErrorBoundary componentDidMount",
    ]);

    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("propagates errors inside boundary while rendering error state", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <BrokenRenderErrorBoundary>
            <BrokenRender />
          </BrokenRenderErrorBoundary>
        </ErrorBoundary>,
      );
    });
    expect(container.firstChild?.textContent).toBe(
      "Caught an error: Hello.",
    );
    assertLog([
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "BrokenRenderErrorBoundary constructor",
      "BrokenRenderErrorBoundary componentWillMount",
      "BrokenRenderErrorBoundary render success",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "BrokenRenderErrorBoundary static getDerivedStateFromError",
      "BrokenRenderErrorBoundary componentWillMount",
      "BrokenRenderErrorBoundary render error [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render error",
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "BrokenRenderErrorBoundary constructor",
      "BrokenRenderErrorBoundary componentWillMount",
      "BrokenRenderErrorBoundary render success",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "BrokenRenderErrorBoundary static getDerivedStateFromError",
      "BrokenRenderErrorBoundary componentWillMount",
      "BrokenRenderErrorBoundary render error [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render error",
      "ErrorBoundary componentDidMount",
    ]);

    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("does not call componentWillUnmount when aborting initial mount", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <Normal />
          <BrokenRender />
          <Normal />
        </ErrorBoundary>,
      );
    });
    expect(container.firstChild?.textContent).toBe(
      "Caught an error: Hello.",
    );
    assertLog([
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "Normal constructor",
      "Normal componentWillMount",
      "Normal render",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render error",
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "Normal constructor",
      "Normal componentWillMount",
      "Normal render",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render error",
      "ErrorBoundary componentDidMount",
    ]);

    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("resets callback refs if mounting aborts", async () => {
    const childRef = (element: HTMLDivElement | null) => {
      log("Child ref is set to " + element);
    };
    const errorMessageRef = (element: HTMLDivElement | null) => {
      log("Error message ref is set to " + element);
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary errorMessageRef={errorMessageRef}>
          <div ref={childRef} />
          <BrokenRender />
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).toBe("Caught an error: Hello.");
    assertLog([
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render error",
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render error",
      "Error message ref is set to [object HTMLDivElement]",
      "ErrorBoundary componentDidMount",
    ]);

    root.unmount();
    assertLog([
      "ErrorBoundary componentWillUnmount",
      "Error message ref is set to null",
    ]);
  });

  it("resets object refs if mounting aborts", async () => {
    const childRef = React.createRef<HTMLDivElement>();
    const errorMessageRef = React.createRef<HTMLDivElement>();

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary errorMessageRef={errorMessageRef}>
          <div ref={childRef} />
          <BrokenRender />
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).toBe("Caught an error: Hello.");
    assertLog([
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render error",
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render error",
      "ErrorBoundary componentDidMount",
    ]);
    expect(errorMessageRef.current?.toString()).toEqual(
      "[object HTMLDivElement]",
    );

    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
    expect(errorMessageRef.current).toEqual(null);
  });

  it("successfully mounts if no error occurs", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <div>Mounted successfully.</div>
        </ErrorBoundary>,
      );
    });
    expect(container.firstChild?.textContent).toBe(
      "Mounted successfully.",
    );
    assertLog([
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "ErrorBoundary componentDidMount",
    ]);

    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("catches if child throws in constructor during update", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <Normal />
        </ErrorBoundary>,
      );
    });
    clearLog();
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <Normal />
          <Normal logName="Normal2" />
          <BrokenConstructor />
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).toBe("Caught an error: Hello.");
    assertLog([
      "ErrorBoundary componentWillReceiveProps",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render success",
      "Normal componentWillReceiveProps",
      "Normal componentWillUpdate",
      "Normal render",
      "Normal2 constructor",
      "Normal2 componentWillMount",
      "Normal2 render",
      "BrokenConstructor constructor [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render error",
      "ErrorBoundary componentWillReceiveProps",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render success",
      "Normal componentWillReceiveProps",
      "Normal componentWillUpdate",
      "Normal render",
      "Normal2 constructor",
      "Normal2 componentWillMount",
      "Normal2 render",
      "BrokenConstructor constructor [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render error",
      "Normal componentWillUnmount",
      "ErrorBoundary componentDidUpdate",
    ]);

    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("catches if child throws in componentWillMount during update", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <Normal />
        </ErrorBoundary>,
      );
    });

    clearLog();
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <Normal />
          <Normal logName="Normal2" />
          <BrokenComponentWillMount />
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).toBe("Caught an error: Hello.");
    assertLog([
      "ErrorBoundary componentWillReceiveProps",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render success",
      "Normal componentWillReceiveProps",
      "Normal componentWillUpdate",
      "Normal render",
      "Normal2 constructor",
      "Normal2 componentWillMount",
      "Normal2 render",
      "BrokenComponentWillMount constructor",
      "BrokenComponentWillMount componentWillMount [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render error",
      "ErrorBoundary componentWillReceiveProps",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render success",
      "Normal componentWillReceiveProps",
      "Normal componentWillUpdate",
      "Normal render",
      "Normal2 constructor",
      "Normal2 componentWillMount",
      "Normal2 render",
      "BrokenComponentWillMount constructor",
      "BrokenComponentWillMount componentWillMount [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render error",
      "Normal componentWillUnmount",
      "ErrorBoundary componentDidUpdate",
    ]);

    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("catches if child throws in componentWillReceiveProps during update", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <Normal />
          <BrokenComponentWillReceiveProps />
        </ErrorBoundary>,
      );
    });

    clearLog();
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <Normal />
          <BrokenComponentWillReceiveProps />
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).toBe("Caught an error: Hello.");
    assertLog([
      "ErrorBoundary componentWillReceiveProps",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render success",
      "Normal componentWillReceiveProps",
      "Normal componentWillUpdate",
      "Normal render",
      "BrokenComponentWillReceiveProps componentWillReceiveProps [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render error",
      "ErrorBoundary componentWillReceiveProps",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render success",
      "Normal componentWillReceiveProps",
      "Normal componentWillUpdate",
      "Normal render",
      "BrokenComponentWillReceiveProps componentWillReceiveProps [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render error",
      "Normal componentWillUnmount",
      "BrokenComponentWillReceiveProps componentWillUnmount",
      "ErrorBoundary componentDidUpdate",
    ]);

    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("catches if child throws in componentWillUpdate during update", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <Normal />
          <BrokenComponentWillUpdate />
        </ErrorBoundary>,
      );
    });

    clearLog();
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <Normal />
          <BrokenComponentWillUpdate />
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).toBe("Caught an error: Hello.");
    assertLog([
      "ErrorBoundary componentWillReceiveProps",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render success",
      "Normal componentWillReceiveProps",
      "Normal componentWillUpdate",
      "Normal render",
      "BrokenComponentWillUpdate componentWillReceiveProps",
      "BrokenComponentWillUpdate componentWillUpdate [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render error",
      "ErrorBoundary componentWillReceiveProps",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render success",
      "Normal componentWillReceiveProps",
      "Normal componentWillUpdate",
      "Normal render",
      "BrokenComponentWillUpdate componentWillReceiveProps",
      "BrokenComponentWillUpdate componentWillUpdate [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render error",
      "Normal componentWillUnmount",
      "BrokenComponentWillUpdate componentWillUnmount",
      "ErrorBoundary componentDidUpdate",
    ]);

    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("catches if child throws in render during update", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <Normal />
        </ErrorBoundary>,
      );
    });

    clearLog();
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <Normal />
          <Normal logName="Normal2" />
          <BrokenRender />
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).toBe("Caught an error: Hello.");
    assertLog([
      "ErrorBoundary componentWillReceiveProps",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render success",
      "Normal componentWillReceiveProps",
      "Normal componentWillUpdate",
      "Normal render",
      "Normal2 constructor",
      "Normal2 componentWillMount",
      "Normal2 render",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render error",
      "ErrorBoundary componentWillReceiveProps",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render success",
      "Normal componentWillReceiveProps",
      "Normal componentWillUpdate",
      "Normal render",
      "Normal2 constructor",
      "Normal2 componentWillMount",
      "Normal2 render",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render error",
      "Normal componentWillUnmount",
      "ErrorBoundary componentDidUpdate",
    ]);

    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("keeps refs up-to-date during updates", async () => {
    const child1Ref = (element: HTMLDivElement | null) => {
      log("Child1 ref is set to " + element);
    };
    const child2Ref = (element: HTMLDivElement | null) => {
      log("Child2 ref is set to " + element);
    };
    const errorMessageRef = (element: HTMLDivElement | null) => {
      log("Error message ref is set to " + element);
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary errorMessageRef={errorMessageRef}>
          <div ref={child1Ref} />
        </ErrorBoundary>,
      );
    });
    assertLog([
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "Child1 ref is set to [object HTMLDivElement]",
      "ErrorBoundary componentDidMount",
    ]);

    await act(async () => {
      root.render(
        <ErrorBoundary errorMessageRef={errorMessageRef}>
          <div ref={child1Ref} />
          <div ref={child2Ref} />
          <BrokenRender />
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).toBe("Caught an error: Hello.");
    assertLog([
      "ErrorBoundary componentWillReceiveProps",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render success",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render error",
      "ErrorBoundary componentWillReceiveProps",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render success",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render error",
      "Child1 ref is set to null",
      "Error message ref is set to [object HTMLDivElement]",
      "ErrorBoundary componentDidUpdate",
    ]);

    root.unmount();
    assertLog([
      "ErrorBoundary componentWillUnmount",
      "Error message ref is set to null",
    ]);
  });

  it("recovers from componentWillUnmount errors on update", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <BrokenComponentWillUnmount />
          <BrokenComponentWillUnmount />
          <Normal />
        </ErrorBoundary>,
      );
    });

    clearLog();
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <BrokenComponentWillUnmount />
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).toBe("Caught an error: Hello.");
    assertLog([
      "ErrorBoundary componentWillReceiveProps",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render success",
      "BrokenComponentWillUnmount componentWillReceiveProps",
      "BrokenComponentWillUnmount componentWillUpdate",
      "BrokenComponentWillUnmount render",
      "BrokenComponentWillUnmount componentWillUnmount [!]",
      "Normal componentWillUnmount",
      "BrokenComponentWillUnmount componentDidUpdate",
      "ErrorBoundary componentDidUpdate",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render error",
      "BrokenComponentWillUnmount componentWillUnmount [!]",
      "ErrorBoundary componentDidUpdate",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render error",
      "ErrorBoundary componentDidUpdate",
    ]);

    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("recovers from nested componentWillUnmount errors on update", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <Normal>
            <BrokenComponentWillUnmount />
          </Normal>
          <BrokenComponentWillUnmount />
        </ErrorBoundary>,
      );
    });

    clearLog();
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <Normal>
            <BrokenComponentWillUnmount />
          </Normal>
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).toBe("Caught an error: Hello.");
    assertLog([
      "ErrorBoundary componentWillReceiveProps",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render success",
      "Normal componentWillReceiveProps",
      "Normal componentWillUpdate",
      "Normal render",
      "BrokenComponentWillUnmount componentWillReceiveProps",
      "BrokenComponentWillUnmount componentWillUpdate",
      "BrokenComponentWillUnmount render",
      "BrokenComponentWillUnmount componentWillUnmount [!]",
      "BrokenComponentWillUnmount componentDidUpdate",
      "Normal componentDidUpdate",
      "ErrorBoundary componentDidUpdate",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render error",
      "Normal componentWillUnmount",
      "BrokenComponentWillUnmount componentWillUnmount [!]",
      "ErrorBoundary componentDidUpdate",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render error",
      "ErrorBoundary componentDidUpdate",
    ]);

    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("picks the right boundary when handling unmounting errors", async () => {
    const renderInnerError = (error: Error) => (
      <div>Caught an inner error: {error.message}.</div>
    );
    const renderOuterError = (error: Error) => (
      <div>Caught an outer error: {error.message}.</div>
    );

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary
          logName="OuterErrorBoundary"
          renderError={renderOuterError}>
          <ErrorBoundary
            logName="InnerErrorBoundary"
            renderError={renderInnerError}>
            <BrokenComponentWillUnmount />
          </ErrorBoundary>
        </ErrorBoundary>,
      );
    });

    clearLog();
    await act(async () => {
      root.render(
        <ErrorBoundary
          logName="OuterErrorBoundary"
          renderError={renderOuterError}>
          <ErrorBoundary
            logName="InnerErrorBoundary"
            renderError={renderInnerError}
          />
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).toBe(
      "Caught an inner error: Hello.",
    );
    assertLog([
      "OuterErrorBoundary componentWillReceiveProps",
      "OuterErrorBoundary componentWillUpdate",
      "OuterErrorBoundary render success",
      "InnerErrorBoundary componentWillReceiveProps",
      "InnerErrorBoundary componentWillUpdate",
      "InnerErrorBoundary render success",
      "BrokenComponentWillUnmount componentWillUnmount [!]",
      "InnerErrorBoundary componentDidUpdate",
      "OuterErrorBoundary componentDidUpdate",
      "ErrorBoundary static getDerivedStateFromError",
      "InnerErrorBoundary componentWillUpdate",
      "InnerErrorBoundary render error",
      "InnerErrorBoundary componentDidUpdate",
    ]);

    root.unmount();
    assertLog([
      "OuterErrorBoundary componentWillUnmount",
      "InnerErrorBoundary componentWillUnmount",
    ]);
  });

  it("can recover from error state", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <BrokenRender />
        </ErrorBoundary>,
      );
    });

    clearLog();
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <Normal />
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).toBe("Caught an error: Hello.");

    clearLog();
    await act(async () => {
      root.render(
        <ErrorBoundary forceRetry={true}>
          <Normal />
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).not.toContain("Caught an error");
    assertLog([
      "ErrorBoundary componentWillReceiveProps",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render success",
      "Normal constructor",
      "Normal componentWillMount",
      "Normal render",
      "Normal componentDidMount",
      "ErrorBoundary componentDidUpdate",
    ]);

    root.unmount();
    assertLog([
      "ErrorBoundary componentWillUnmount",
      "Normal componentWillUnmount",
    ]);
  });

  it("can update multiple times in error state", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <BrokenRender />
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).toBe("Caught an error: Hello.");
    clearLog();

    await act(async () => {
      root.render(
        <ErrorBoundary>
          <BrokenRender />
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).toBe("Caught an error: Hello.");
    clearLog();

    await act(async () => {
      root.render(<div>Other screen</div>);
    });
    expect(container.textContent).toBe("Other screen");

    root.unmount();
  });

  it("doesn't get into inconsistent state during removals", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <Normal />
          <BrokenComponentWillUnmount />
          <Normal />
        </ErrorBoundary>,
      );
    });
    clearLog();
    await act(async () => {
      root.render(<ErrorBoundary />);
    });
    expect(container.textContent).toBe("Caught an error: Hello.");

    clearLog();
    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("doesn't get into inconsistent state during additions", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<ErrorBoundary />);
    });
    assertLog([
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "ErrorBoundary componentDidMount",
    ]);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <Normal />
          <BrokenRender />
          <Normal />
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).toBe("Caught an error: Hello.");

    clearLog();
    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("doesn't get into inconsistent state during reorders", async () => {
    const getAMixOfNormalAndBrokenRenderElements = () => {
      const elements: React.ReactElement[] = [];
      for (let index = 0; index < 100; index++) {
        elements.push(<Normal key={index} />);
      }
      elements.push(<MaybeBrokenRender key={100} />);

      let currentIndex = elements.length;
      while (0 !== currentIndex) {
        const randomIndex = Math.floor(
          Math.random() * currentIndex,
        );
        currentIndex -= 1;
        const temporaryValue = elements[currentIndex];
        elements[currentIndex] = elements[randomIndex];
        elements[randomIndex] = temporaryValue;
      }
      return elements;
    };

    class MaybeBrokenRender extends React.Component<ChildrenProps> {
      render() {
        if (didFailRender) {
          throw new Error("Hello");
        }
        return <div>{this.props.children}</div>;
      }
    }

    let didFailRender = false;
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          {getAMixOfNormalAndBrokenRenderElements()}
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).not.toContain("Caught an error");

    didFailRender = true;
    clearLog();
    await act(async () => {
      root.render(
        <ErrorBoundary>
          {getAMixOfNormalAndBrokenRenderElements()}
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).toBe("Caught an error: Hello.");

    clearLog();
    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("catches errors originating downstream", async () => {
    let didFailRender = false;
    class Stateful extends React.Component<ChildrenProps> {
      state = { shouldThrow: false };

      render() {
        if (didFailRender) {
          log("Stateful render [!]");
          throw new Error("Hello");
        }
        return <div>{this.props.children}</div>;
      }
    }

    let statefulInstance: Stateful | null = null;
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <Stateful
            ref={(instance) => {
              statefulInstance = instance;
            }}
          />
        </ErrorBoundary>,
      );
    });

    clearLog();
    expect(() => {
      didFailRender = true;
      statefulInstance!.forceUpdate();
    }).not.toThrow();
    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("catches errors in componentDidMount", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <BrokenComponentWillUnmount>
            <Normal />
          </BrokenComponentWillUnmount>
          <BrokenComponentDidMount />
          <Normal logName="LastChild" />
        </ErrorBoundary>,
      );
    });
    assertLog([
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "BrokenComponentWillUnmount constructor",
      "BrokenComponentWillUnmount componentWillMount",
      "BrokenComponentWillUnmount render",
      "Normal constructor",
      "Normal componentWillMount",
      "Normal render",
      "BrokenComponentDidMount constructor",
      "BrokenComponentDidMount componentWillMount",
      "BrokenComponentDidMount render",
      "LastChild constructor",
      "LastChild componentWillMount",
      "LastChild render",
      "Normal componentDidMount",
      "BrokenComponentWillUnmount componentDidMount",
      "BrokenComponentDidMount componentDidMount [!]",
      "LastChild componentDidMount",
      "ErrorBoundary componentDidMount",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render error",
      "BrokenComponentWillUnmount componentWillUnmount [!]",
      "Normal componentWillUnmount",
      "BrokenComponentDidMount componentWillUnmount",
      "LastChild componentWillUnmount",
      "ErrorBoundary componentDidUpdate",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render error",
      "ErrorBoundary componentDidUpdate",
    ]);

    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("catches errors in componentDidUpdate", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <BrokenComponentDidUpdate />
        </ErrorBoundary>,
      );
    });

    clearLog();
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <BrokenComponentDidUpdate />
        </ErrorBoundary>,
      );
    });
    assertLog([
      "ErrorBoundary componentWillReceiveProps",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render success",
      "BrokenComponentDidUpdate componentWillReceiveProps",
      "BrokenComponentDidUpdate componentWillUpdate",
      "BrokenComponentDidUpdate render",
      "BrokenComponentDidUpdate componentDidUpdate [!]",
      "ErrorBoundary componentDidUpdate",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render error",
      "BrokenComponentDidUpdate componentWillUnmount",
      "ErrorBoundary componentDidUpdate",
    ]);

    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("catches errors in useEffect", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <ErrorBoundary>
          <BrokenUseEffect>Initial value</BrokenUseEffect>
        </ErrorBoundary>,
      );
    });

    assertLog([
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "BrokenUseEffect render",
      "ErrorBoundary componentDidMount",
      "BrokenUseEffect useEffect [!]",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render error",
      "ErrorBoundary componentDidUpdate",
    ]);
    expect(container.firstChild?.textContent).toBe(
      "Caught an error: Hello.",
    );
  });

  it("catches errors in useLayoutEffect", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <BrokenUseLayoutEffect>Initial value</BrokenUseLayoutEffect>
        </ErrorBoundary>,
      );
    });
    assertLog([
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "BrokenUseLayoutEffect render",
      "BrokenUseLayoutEffect useLayoutEffect [!]",
      "ErrorBoundary componentDidMount",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render error",
      "ErrorBoundary componentDidUpdate",
    ]);

    expect(container.firstChild?.textContent).toBe(
      "Caught an error: Hello.",
    );
  });

  it("propagates errors inside boundary during componentDidMount", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <BrokenComponentDidMountErrorBoundary
            renderError={(error: Error) => (
              <div>
                We should never catch our own error: {error.message}.
              </div>
            )}
          />
        </ErrorBoundary>,
      );
    });
    expect(container.firstChild?.textContent).toBe(
      "Caught an error: Hello.",
    );
    assertLog([
      "ErrorBoundary constructor",
      "ErrorBoundary componentWillMount",
      "ErrorBoundary render success",
      "BrokenComponentDidMountErrorBoundary constructor",
      "BrokenComponentDidMountErrorBoundary componentWillMount",
      "BrokenComponentDidMountErrorBoundary render success",
      "BrokenComponentDidMountErrorBoundary componentDidMount [!]",
      "ErrorBoundary componentDidMount",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary componentWillUpdate",
      "ErrorBoundary render error",
      "BrokenComponentDidMountErrorBoundary componentWillUnmount",
      "ErrorBoundary componentDidUpdate",
    ]);

    root.unmount();
    assertLog(["ErrorBoundary componentWillUnmount"]);
  });

  it("calls static getDerivedStateFromError for each error that is captured", async () => {
    const renderUnmountError = (error: Error) => (
      <div>Caught an unmounting error: {error.message}.</div>
    );
    const renderUpdateError = (error: Error) => (
      <div>Caught an updating error: {error.message}.</div>
    );

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary logName="OuterErrorBoundary">
          <ErrorBoundary
            logName="InnerUnmountBoundary"
            renderError={renderUnmountError}>
            <BrokenComponentWillUnmount errorText="E1" />
            <BrokenComponentWillUnmount errorText="E2" />
          </ErrorBoundary>
          <ErrorBoundary
            logName="InnerUpdateBoundary"
            renderError={renderUpdateError}>
            <BrokenComponentDidUpdate errorText="E3" />
            <BrokenComponentDidUpdate errorText="E4" />
          </ErrorBoundary>
        </ErrorBoundary>,
      );
    });

    clearLog();
    await act(async () => {
      root.render(
        <ErrorBoundary logName="OuterErrorBoundary">
          <ErrorBoundary
            logName="InnerUnmountBoundary"
            renderError={renderUnmountError}
          />
          <ErrorBoundary
            logName="InnerUpdateBoundary"
            renderError={renderUpdateError}>
            <BrokenComponentDidUpdate errorText="E3" />
            <BrokenComponentDidUpdate errorText="E4" />
          </ErrorBoundary>
        </ErrorBoundary>,
      );
    });

    expect(container.firstChild?.textContent).toBe(
      "Caught an unmounting error: E2." +
        "Caught an updating error: E4.",
    );
    assertLog([
      "OuterErrorBoundary componentWillReceiveProps",
      "OuterErrorBoundary componentWillUpdate",
      "OuterErrorBoundary render success",
      "InnerUnmountBoundary componentWillReceiveProps",
      "InnerUnmountBoundary componentWillUpdate",
      "InnerUnmountBoundary render success",
      "InnerUpdateBoundary componentWillReceiveProps",
      "InnerUpdateBoundary componentWillUpdate",
      "InnerUpdateBoundary render success",
      "BrokenComponentDidUpdate componentWillReceiveProps",
      "BrokenComponentDidUpdate componentWillUpdate",
      "BrokenComponentDidUpdate render",
      "BrokenComponentDidUpdate componentWillReceiveProps",
      "BrokenComponentDidUpdate componentWillUpdate",
      "BrokenComponentDidUpdate render",
      "BrokenComponentWillUnmount componentWillUnmount [!]",
      "BrokenComponentWillUnmount componentWillUnmount [!]",
      "InnerUnmountBoundary componentDidUpdate",
      "BrokenComponentDidUpdate componentDidUpdate [!]",
      "BrokenComponentDidUpdate componentDidUpdate [!]",
      "InnerUpdateBoundary componentDidUpdate",
      "OuterErrorBoundary componentDidUpdate",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary static getDerivedStateFromError",
      "InnerUnmountBoundary componentWillUpdate",
      "InnerUnmountBoundary render error",
      "ErrorBoundary static getDerivedStateFromError",
      "ErrorBoundary static getDerivedStateFromError",
      "InnerUpdateBoundary componentWillUpdate",
      "InnerUpdateBoundary render error",
      "BrokenComponentDidUpdate componentWillUnmount",
      "BrokenComponentDidUpdate componentWillUnmount",
      "InnerUnmountBoundary componentDidUpdate",
      "InnerUpdateBoundary componentDidUpdate",
    ]);

    root.unmount();
    assertLog([
      "OuterErrorBoundary componentWillUnmount",
      "InnerUnmountBoundary componentWillUnmount",
      "InnerUpdateBoundary componentWillUnmount",
    ]);
  });

  it("discards a bad root if the root component fails", async () => {
    const NullComponent = null;
    const UndefinedComponent = undefined;

    await expect(async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(async () => {
        // @ts-expect-error testing invalid element type
        root.render(<NullComponent />);
      });
    }).rejects.toThrow(
      "Element type is invalid: " +
        "expected a string (for built-in components) or a " +
        "class/function (for composite components) but got: null.",
    );

    await expect(async () => {
      const container = document.createElement("div");
      const root = ReactDOMClient.createRoot(container);
      await act(async () => {
        // @ts-expect-error testing invalid element type
        root.render(<UndefinedComponent />);
      });
    }).rejects.toThrow(
      "Element type is invalid: " +
        "expected a string (for built-in components) or a " +
        "class/function (for composite components) but got: undefined.",
    );
  });

  it("renders empty output if error boundary does not handle the error", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await expect(async () => {
      await act(async () => {
        root.render(
          <div>
            Sibling
            <NoopErrorBoundary>
              <BrokenRender />
            </NoopErrorBoundary>
          </div>,
        );
      });
    }).rejects.toThrow("Hello");

    expect(container.innerHTML).toBe("");
    assertLog([
      "NoopErrorBoundary constructor",
      "NoopErrorBoundary componentWillMount",
      "NoopErrorBoundary render",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "NoopErrorBoundary static getDerivedStateFromError",
      "NoopErrorBoundary render",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "NoopErrorBoundary constructor",
      "NoopErrorBoundary componentWillMount",
      "NoopErrorBoundary render",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
      "NoopErrorBoundary static getDerivedStateFromError",
      "NoopErrorBoundary render",
      "BrokenRender constructor",
      "BrokenRender componentWillMount",
      "BrokenRender render [!]",
    ]);
  });

  it("passes an aggregate error when two errors happen in commit", async () => {
    const errors: string[] = [];
    let caughtError: (Error & { errors?: unknown[] }) | undefined;
    class Parent extends React.Component<ChildrenProps> {
      render() {
        return <Child />;
      }
      componentDidMount() {
        errors.push("parent sad");
        throw new Error("parent sad");
      }
    }
    class Child extends React.Component {
      render() {
        return <div />;
      }
      componentDidMount() {
        errors.push("child sad");
        throw new Error("child sad");
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    try {
      await act(async () => {
        root.render(<Parent />);
      });
    } catch (error) {
      caughtError = error as Error & { errors?: unknown[] };
    }

    expect(errors).toEqual(["child sad", "parent sad"]);
    expect(caughtError?.errors).toEqual([
      expect.objectContaining({ message: "child sad" }),
      expect.objectContaining({ message: "parent sad" }),
    ]);
  });

  it("propagates uncaught error inside unbatched initial mount", async () => {
    const Foo = () => {
      throw new Error("foo error");
    };
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(async () => {
        root.render(<Foo />);
      });
    }).rejects.toThrow("foo error");
  });

  it("handles errors that occur in before-mutation commit hook", async () => {
    const errors: string[] = [];
    let caughtError: (Error & { errors?: unknown[] }) | undefined;
    class Parent extends React.Component<{ value?: number }> {
      getSnapshotBeforeUpdate() {
        errors.push("parent sad");
        throw new Error("parent sad");
      }
      componentDidUpdate() {}
      render() {
        return <Child {...this.props} />;
      }
    }
    class Child extends React.Component<{ value?: number }> {
      getSnapshotBeforeUpdate() {
        errors.push("child sad");
        throw new Error("child sad");
      }
      componentDidUpdate() {}
      render() {
        return <div />;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<Parent value={1} />);
    });
    try {
      await act(async () => {
        root.render(<Parent value={2} />);
      });
    } catch (error) {
      caughtError = error as Error & { errors?: unknown[] };
    }

    expect(errors).toEqual(["child sad", "parent sad"]);
    expect(caughtError?.errors).toEqual([
      expect.objectContaining({ message: "child sad" }),
      expect.objectContaining({ message: "parent sad" }),
    ]);
  });

  it("should warn if an error boundary with only componentDidCatch does not update state", async () => {
    class InvalidErrorBoundary extends React.Component<ChildrenProps> {
      componentDidCatch() {}
      render() {
        return this.props.children;
      }
    }

    const Throws = () => {
      throw new Error("expected");
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <InvalidErrorBoundary>
          <Throws />
        </InvalidErrorBoundary>,
      );
    });
    expect(container.textContent).toBe("");
  });

  it("should call both componentDidCatch and getDerivedStateFromError if both exist on a component", async () => {
    let componentDidCatchError: Error | undefined;
    let getDerivedStateFromErrorError: Error | undefined;
    class ErrorBoundaryWithBothMethods extends React.Component<
      ChildrenProps,
      { error: Error | null }
    > {
      state = { error: null };
      static getDerivedStateFromError(error: Error) {
        getDerivedStateFromErrorError = error;
        return { error };
      }
      componentDidCatch(error: Error) {
        componentDidCatchError = error;
      }
      render() {
        return this.state.error
          ? "ErrorBoundary"
          : this.props.children;
      }
    }

    const thrownError = new Error("expected");
    const Throws = () => {
      throw thrownError;
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundaryWithBothMethods>
          <Throws />
        </ErrorBoundaryWithBothMethods>,
      );
    });
    expect(container.textContent).toBe("ErrorBoundary");
    expect(componentDidCatchError).toBe(thrownError);
    expect(getDerivedStateFromErrorError).toBe(thrownError);
  });

  it("should catch errors from invariants in completion phase", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <input>
            <div />
          </input>
        </ErrorBoundary>,
      );
    });
    expect(container.textContent).toContain(
      "Caught an error: input is a void element tag",
    );
  });

  it("should catch errors from errors in the throw phase from boundaries", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    const thrownError = new Error("original error");
    const Throws = () => {
      throw thrownError;
    };

    class EvilErrorBoundary extends React.Component<ChildrenProps> {
      render() {
        return this.props.children;
      }
    }
    Object.defineProperty(
      EvilErrorBoundary.prototype,
      "componentDidCatch",
      {
        get() {
          throw new Error("gotta catch em all");
        },
      },
    );

    await act(async () => {
      root.render(
        <ErrorBoundary>
          <EvilErrorBoundary>
            <Throws />
          </EvilErrorBoundary>
        </ErrorBoundary>,
      );
    });

    expect(container.textContent).toContain(
      "Caught an error: gotta catch em all",
    );
  });

  it("should protect errors from errors in the stack generation", async () => {
    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    const evilError = {
      message: "gotta catch em all",
      get stack() {
        throw new Error("gotta catch em all");
      },
    };
    const Throws = () => {
      throw evilError;
    };

    const Wrapper = () => <Throws />;

    // React 19 catches the error in the error boundary even when the
    // thrown object has an evil stack getter. The displayName getter test
    // was removed because React 19's DEV logging accesses it outside the
    // commit phase, causing an uncatchable exception.
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <Wrapper />
        </ErrorBoundary>,
      );
    });

    expect(container.textContent).toContain(
      "Caught an error: gotta catch em all.",
    );
  });

  it("catches errors thrown in componentWillUnmount", async () => {
    class LocalErrorBoundary extends React.Component<
      { children?: React.ReactNode; id: string; fallbackID: string },
      ErrorBoundaryState
    > {
      state: ErrorBoundaryState = { error: null };
      static getDerivedStateFromError(error: Error) {
        log("ErrorBoundary static getDerivedStateFromError");
        return { error };
      }
      render() {
        const { children, id, fallbackID } = this.props;
        const { error } = this.state;
        if (error) {
          log(`${id} render error`);
          return <LocalComponent id={fallbackID} />;
        }
        log(`${id} render success`);
        return children || null;
      }
    }

    class LocalComponent extends React.Component<{ id: string }> {
      render() {
        const { id } = this.props;
        log("Component render " + id);
        return id;
      }
    }

    class LocalBrokenComponentWillUnmount extends React.Component {
      componentWillUnmount() {
        log("BrokenComponentWillUnmount componentWillUnmount");
        throw Error("Expected");
      }

      render() {
        log("BrokenComponentWillUnmount render");
        return "broken";
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(async () => {
      root.render(
        <LocalErrorBoundary
          id="OuterBoundary"
          fallbackID="OuterFallback">
          <LocalComponent id="sibling" />
          <LocalErrorBoundary
            id="InnerBoundary"
            fallbackID="InnerFallback">
            <LocalBrokenComponentWillUnmount />
          </LocalErrorBoundary>
        </LocalErrorBoundary>,
      );
    });

    expect(container.firstChild?.textContent).toBe("sibling");
    expect(container.lastChild?.textContent).toBe("broken");
    assertLog([
      "OuterBoundary render success",
      "Component render sibling",
      "InnerBoundary render success",
      "BrokenComponentWillUnmount render",
    ]);

    await act(async () => {
      root.render(
        <LocalErrorBoundary
          id="OuterBoundary"
          fallbackID="OuterFallback">
          <LocalComponent id="sibling" />
        </LocalErrorBoundary>,
      );
    });

    expect(container.firstChild?.textContent).toBe("OuterFallback");
    expect(container.lastChild?.textContent).toBe("OuterFallback");
    assertLog([
      "OuterBoundary render success",
      "Component render sibling",
      "BrokenComponentWillUnmount componentWillUnmount",
      "ErrorBoundary static getDerivedStateFromError",
      "OuterBoundary render error",
      "Component render OuterFallback",
    ]);
  });

  it("catches errors thrown while detaching refs", async () => {
    class LocalErrorBoundary extends React.Component<
      { children?: React.ReactNode; id: string; fallbackID: string },
      ErrorBoundaryState
    > {
      state: ErrorBoundaryState = { error: null };
      static getDerivedStateFromError(error: Error) {
        log("ErrorBoundary static getDerivedStateFromError");
        return { error };
      }
      render() {
        const { children, id, fallbackID } = this.props;
        const { error } = this.state;
        if (error) {
          log(`${id} render error`);
          return <LocalComponent id={fallbackID} />;
        }
        log(`${id} render success`);
        return children || null;
      }
    }

    class LocalComponent extends React.Component<{ id: string }> {
      render() {
        const { id } = this.props;
        log("Component render " + id);
        return id;
      }
    }

    class LocalBrokenCallbackRef extends React.Component {
      _ref = (ref: HTMLDivElement | null) => {
        log("LocalBrokenCallbackRef ref " + Boolean(ref));
        if (ref === null) {
          throw Error("Expected");
        }
      };

      render() {
        log("LocalBrokenCallbackRef render");
        return <div ref={this._ref}>ref</div>;
      }
    }

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);

    await act(async () => {
      root.render(
        <LocalErrorBoundary
          id="OuterBoundary"
          fallbackID="OuterFallback">
          <LocalComponent id="sibling" />
          <LocalErrorBoundary
            id="InnerBoundary"
            fallbackID="InnerFallback">
            <LocalBrokenCallbackRef />
          </LocalErrorBoundary>
        </LocalErrorBoundary>,
      );
    });

    expect(container.firstChild?.textContent).toBe("sibling");
    expect(container.lastChild?.textContent).toBe("ref");
    assertLog([
      "OuterBoundary render success",
      "Component render sibling",
      "InnerBoundary render success",
      "LocalBrokenCallbackRef render",
      "LocalBrokenCallbackRef ref true",
    ]);

    await act(async () => {
      root.render(
        <LocalErrorBoundary
          id="OuterBoundary"
          fallbackID="OuterFallback">
          <LocalComponent id="sibling" />
        </LocalErrorBoundary>,
      );
    });

    expect(container.firstChild?.textContent).toBe("OuterFallback");
    expect(container.lastChild?.textContent).toBe("OuterFallback");
    assertLog([
      "OuterBoundary render success",
      "Component render sibling",
      "LocalBrokenCallbackRef ref false",
      "ErrorBoundary static getDerivedStateFromError",
      "OuterBoundary render error",
      "Component render OuterFallback",
    ]);
  });
});
