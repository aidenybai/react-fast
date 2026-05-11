import React from "react";
import { describe, expect, vi } from "vitest";
import { itClientRenders } from "./ssr-integration-utils";

describe("ReactDOMServerIntegration - special types", () => {
  itClientRenders("a forwardedRef component and its children", async (render) => {
    const FunctionComponent = ({
      label,
      forwardedRef,
    }: {
      label: string;
      forwardedRef: React.Ref<HTMLDivElement>;
    }) => <div ref={forwardedRef}>{label}</div>;
    const WrappedFunctionComponent = React.forwardRef<HTMLDivElement, { label: string }>(
      (props, ref) => <FunctionComponent {...props} forwardedRef={ref} />,
    );

    const ref = React.createRef<HTMLDivElement>();
    const element = await render(<WrappedFunctionComponent ref={ref} label="Test" />);
    const parent = element!.parentNode!;
    const div = parent.childNodes[0] as HTMLDivElement;
    expect(div.tagName).toBe("DIV");
    expect(div.textContent).toBe("Test");
  });

  itClientRenders("a Profiler component and its children", async (render) => {
    const element = await render(
      <React.Profiler id="profiler" onRender={vi.fn()}>
        <div>Test</div>
      </React.Profiler>,
    );
    const parent = element!.parentNode!;
    const div = parent.childNodes[0] as HTMLDivElement;
    expect(div.tagName).toBe("DIV");
    expect(div.textContent).toBe("Test");
  });

  describe("memoized function components", () => {
    const Text = ({ text }: { text: string }) => <span>{text}</span>;
    const Counter = ({ count }: { count: number }) => <Text text={"Count: " + count} />;

    itClientRenders("basic memo render", async (render) => {
      const MemoCounter = React.memo(Counter);
      const domNode = await render(<MemoCounter count={0} />);
      expect(domNode!.textContent).toEqual("Count: 0");
    });

    itClientRenders("memo composition with forwardRef", async (render) => {
      const RefCounter = React.forwardRef<HTMLSpanElement, { count: number }>(({ count }, ref) => (
        <span ref={ref}>{`Count: ${count}`}</span>
      ));
      const MemoRefCounter = React.memo(RefCounter);

      const ref = React.createRef<HTMLSpanElement>();
      const domNode = await render(<MemoRefCounter ref={ref} count={0} />);
      expect(domNode!.textContent).toEqual("Count: 0");
    });
  });
});
