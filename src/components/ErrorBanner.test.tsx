import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorBanner } from "./ErrorBanner.js";

describe("ErrorBanner", () => {
  it("retries once without submitting a surrounding form", async () => {
    const onRetry = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });
    const user = userEvent.setup();

    render(
      <form onSubmit={onSubmit}>
        <ErrorBanner message="Request failed" onRetry={onRetry} />
      </form>,
    );

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
