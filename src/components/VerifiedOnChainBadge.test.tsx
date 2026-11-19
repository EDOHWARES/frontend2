import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { VerifiedOnChainBadge } from "./VerifiedOnChainBadge.js";

describe("VerifiedOnChainBadge", () => {
  it.each([
    ["none", "Not on-chain"],
    ["pending", "Registration pending"],
    ["registered", "Verified on-chain"],
    ["failed", "Registration failed"],
  ] as const)("renders the %s state", (status, label) => {
    render(<VerifiedOnChainBadge onchainStatus={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("falls back to a neutral unknown state for unsupported runtime values", () => {
    const unexpected = "revoked" as unknown as "none";
    render(<VerifiedOnChainBadge onchainStatus={unexpected} />);
    expect(screen.getByText("On-chain status unknown")).toBeInTheDocument();
    expect(screen.queryByText("Verified on-chain")).not.toBeInTheDocument();
  });
});
