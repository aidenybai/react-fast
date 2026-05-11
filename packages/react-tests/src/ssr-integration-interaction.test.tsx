import React from "react";
import { describe, expect, it } from "vitest";
import { itClientRenders, clientCleanRender } from "./ssr-integration-utils";

describe("ReactDOMServerIntegration - user interaction", () => {
  describe("inputs", () => {
    class ControlledInput extends React.Component<
      { type?: string; initialValue?: string },
      { value: string }
    > {
      state = { value: this.props.initialValue ?? "Hello" };

      handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ value: event.target.value });
      };

      render() {
        return (
          <input
            type={this.props.type ?? "text"}
            value={this.state.value}
            onChange={this.handleChange}
          />
        );
      }
    }

    itClientRenders("a controlled text input", async (render) => {
      const element = await render(<ControlledInput />);
      expect((element as HTMLInputElement).value).toBe("Hello");
    });

    itClientRenders("a controlled text input with updated state", async (render) => {
      const element = await render(<ControlledInput initialValue="World" />);
      expect((element as HTMLInputElement).value).toBe("World");
    });

    itClientRenders("a controlled number input", async (render) => {
      const element = await render(<ControlledInput type="number" initialValue="42" />);
      expect((element as HTMLInputElement).value).toBe("42");
    });

    itClientRenders("an uncontrolled text input with default value", async (render) => {
      const element = await render(<input type="text" defaultValue="Default" />);
      expect((element as HTMLInputElement).value).toBe("Default");
    });

    itClientRenders("an uncontrolled text input with empty default", async (render) => {
      const element = await render(<input type="text" defaultValue="" />);
      expect((element as HTMLInputElement).value).toBe("");
    });
  });

  describe("textareas", () => {
    class ControlledTextArea extends React.Component<{ initialValue?: string }, { value: string }> {
      state = { value: this.props.initialValue ?? "Hello" };

      handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        this.setState({ value: event.target.value });
      };

      render() {
        return <textarea value={this.state.value} onChange={this.handleChange} />;
      }
    }

    itClientRenders("a controlled textarea", async (render) => {
      const element = await render(<ControlledTextArea />);
      expect((element as HTMLTextAreaElement).value).toBe("Hello");
    });

    itClientRenders("a controlled textarea with updated value", async (render) => {
      const element = await render(<ControlledTextArea initialValue="Goodbye" />);
      expect((element as HTMLTextAreaElement).value).toBe("Goodbye");
    });

    itClientRenders("an uncontrolled textarea with default value", async (render) => {
      const element = await render(<textarea defaultValue="Default" />);
      expect((element as HTMLTextAreaElement).value).toBe("Default");
    });
  });

  describe("checkboxes", () => {
    class ControlledCheckbox extends React.Component<
      { initialChecked?: boolean },
      { checked: boolean }
    > {
      state = { checked: this.props.initialChecked ?? false };

      handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ checked: event.target.checked });
      };

      render() {
        return <input type="checkbox" checked={this.state.checked} onChange={this.handleChange} />;
      }
    }

    itClientRenders("a controlled checkbox (unchecked)", async (render) => {
      const element = await render(<ControlledCheckbox />);
      expect((element as HTMLInputElement).checked).toBe(false);
    });

    itClientRenders("a controlled checkbox (checked)", async (render) => {
      const element = await render(<ControlledCheckbox initialChecked={true} />);
      expect((element as HTMLInputElement).checked).toBe(true);
    });

    itClientRenders("an uncontrolled checkbox with defaultChecked", async (render) => {
      const element = await render(<input type="checkbox" defaultChecked={true} />);
      expect((element as HTMLInputElement).checked).toBe(true);
    });
  });

  describe("selects", () => {
    class ControlledSelect extends React.Component<{ initialValue?: string }, { value: string }> {
      state = { value: this.props.initialValue ?? "a" };

      handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        this.setState({ value: event.target.value });
      };

      render() {
        return (
          <select value={this.state.value} onChange={this.handleChange}>
            <option value="a">Option A</option>
            <option value="b">Option B</option>
            <option value="c">Option C</option>
          </select>
        );
      }
    }

    itClientRenders("a controlled select", async (render) => {
      const element = await render(<ControlledSelect />);
      expect((element as HTMLSelectElement).value).toBe("a");
    });

    itClientRenders("a controlled select with non-default value", async (render) => {
      const element = await render(<ControlledSelect initialValue="b" />);
      expect((element as HTMLSelectElement).value).toBe("b");
    });

    it("renders an uncontrolled select with defaultValue", async () => {
      const element = await clientCleanRender(
        <select defaultValue="c">
          <option value="a">A</option>
          <option value="b">B</option>
          <option value="c">C</option>
        </select>,
      );
      expect((element as HTMLSelectElement).value).toBe("c");
    });
  });
});
