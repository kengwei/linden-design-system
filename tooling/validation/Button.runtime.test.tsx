import * as axe from "axe-core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../../components/Button/Button.tsx";

describe("generated Button runtime", () => {
  it("rejects blank visible labels", () => {
    expect(() => Button({ label: " " })).toThrow("Button label must not be blank");
  });

  it("activates on native click, Enter, and Space", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button label="Save" onClick={onClick} />);
    const button = screen.getByRole("button", { name: "Save" });

    await user.click(button);
    button.focus();
    await user.keyboard("{Enter}");
    await user.keyboard("[Space]");

    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it.each([
    ["disabled", { disabled: true }],
    ["loading", { loading: true }],
  ] as const)("prevents activation when %s", async (_state, props) => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button label="Save" onClick={onClick} {...props} />);
    const button = screen.getByRole("button", { name: "Save" });

    await user.click(button);
    button.focus();
    await user.keyboard("{Enter}{Space}");

    expect(onClick).not.toHaveBeenCalled();
  });

  it("preserves the loading accessible name and content layout while exposing busy state", () => {
    render(<Button label="Saving" loading />);
    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector('[data-part="label"]')).toHaveTextContent("Saving");
    expect(button.querySelector('[data-part="loading-indicator-keyline"]')).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps icon keylines persistent and hides them from assistive technology", () => {
    render(<Button label="Save" leadingIcon={<svg data-testid="leading" />} trailingIcon={<svg data-testid="trailing" />} />);
    const button = screen.getByRole("button", { name: "Save" });
    expect(screen.getByTestId("leading").parentElement).toHaveAttribute("data-part", "leading-icon");
    expect(screen.getByTestId("leading").parentElement?.parentElement).toHaveAttribute("data-part", "leading-icon-keyline");
    expect(screen.getByTestId("leading").parentElement?.parentElement).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("trailing").parentElement).toHaveAttribute("data-part", "trailing-icon");
    expect(screen.getByTestId("trailing").parentElement?.parentElement).toHaveAttribute("data-part", "trailing-icon-keyline");
    expect(screen.getByTestId("trailing").parentElement?.parentElement).toHaveAttribute("aria-hidden", "true");
    expect(button.querySelector('[data-part="loading-indicator-keyline"]')).toBeInTheDocument();
  });

  it("keeps empty icon keylines in the DOM without making them visible", () => {
    render(<Button label="Save" />);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button.querySelector('[data-part="leading-icon-keyline"]')).toHaveAttribute("data-visible", "false");
    expect(button.querySelector('[data-part="trailing-icon-keyline"]')).toHaveAttribute("data-visible", "false");
  });

  it.each(["primary", "secondary", "tertiary", "danger"] as const)("has no axe violations for %s", async (variant) => {
    const { container } = render(<Button label="Save" variant={variant} />);
    const { violations } = await axe.run(container);
    expect(violations).toEqual([]);
  });
});
