import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSignedMutation } from "./useSignedMutation.js";
import { signWithFreighter } from "../lib/freighter.js";
import { checkNetwork } from "./useNetworkCheck.js";

vi.mock("../lib/freighter.js", () => ({
  signWithFreighter: vi.fn(),
}));

vi.mock("./useNetworkCheck.js", () => ({
  checkNetwork: vi.fn(),
}));

const mockedSignWithFreighter = vi.mocked(signWithFreighter);
const mockedCheckNetwork = vi.mocked(checkNetwork);

describe("useSignedMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCheckNetwork.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("completes a successful prepare/sign/submit flow with a shared idempotency key", async () => {
    const prepare = vi.fn().mockResolvedValue({ xdr: "prepared-xdr" });
    const submit = vi.fn().mockResolvedValue({ hash: "tx-hash" });
    const signedXdr = "signed-xdr";
    mockedSignWithFreighter.mockResolvedValue(signedXdr);

    const { result } = renderHook(() =>
      useSignedMutation({ prepare, submit }),
    );

    expect(result.current.status).toBe("idle");

    await act(async () => {
      await result.current.mutate();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("confirmed");
    });

    expect(result.current.result).toEqual({ hash: "tx-hash" });
    expect(result.current.error).toBeNull();

    expect(prepare).toHaveBeenCalledTimes(1);
    expect(mockedSignWithFreighter).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledTimes(1);

    const prepareArgs = prepare.mock.calls[0][0];
    const submitArgs = submit.mock.calls[0][0];

    expect(prepareArgs.idempotencyKey).toBeDefined();
    expect(submitArgs.idempotencyKey).toBeDefined();
    expect(submitArgs.idempotencyKey).toBe(prepareArgs.idempotencyKey);
    expect(submitArgs.signedXdr).toBe(signedXdr);
  });

  describe("rejection boundaries", () => {
    it.each([
      {
        name: "prepare rejects",
        setup: () => {
          const prepare = vi
            .fn()
            .mockRejectedValue(new Error("prepare failed"));
          const submit = vi.fn().mockResolvedValue({ hash: "tx-hash" });
          return { prepare, submit };
        },
        expectedMessage: "prepare failed",
        assertSkipped: () => {
          expect(mockedSignWithFreighter).not.toHaveBeenCalled();
        },
      },
      {
        name: "signing rejects",
        setup: () => {
          const prepare = vi.fn().mockResolvedValue({ xdr: "prepared-xdr" });
          const submit = vi.fn().mockResolvedValue({ hash: "tx-hash" });
          mockedSignWithFreighter.mockRejectedValue(
            new Error("signing failed"),
          );
          return { prepare, submit };
        },
        expectedMessage: "signing failed",
        assertSkipped: () => {
          // submit is captured per-case below via closure
        },
      },
      {
        name: "submit rejects",
        setup: () => {
          const prepare = vi.fn().mockResolvedValue({ xdr: "prepared-xdr" });
          const submit = vi.fn().mockRejectedValue(new Error("submit failed"));
          mockedSignWithFreighter.mockResolvedValue("signed-xdr");
          return { prepare, submit };
        },
        expectedMessage: "submit failed",
        assertSkipped: () => {
          // submit was attempted; nothing downstream to skip
        },
      },
    ])("sets error state when $name", async ({ setup, expectedMessage }) => {
      const { prepare, submit } = setup();

      const { result } = renderHook(() =>
        useSignedMutation({ prepare, submit }),
      );

      await act(async () => {
        await result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.status).toBe("error");
      });

      expect(result.current.error).toBe(expectedMessage);
      expect(result.current.result).toBeNull();

      if (expectedMessage === "prepare failed") {
        expect(mockedSignWithFreighter).not.toHaveBeenCalled();
        expect(submit).not.toHaveBeenCalled();
      }

      if (expectedMessage === "signing failed") {
        expect(prepare).toHaveBeenCalledTimes(1);
        expect(mockedSignWithFreighter).toHaveBeenCalledTimes(1);
        expect(submit).not.toHaveBeenCalled();
      }

      if (expectedMessage === "submit failed") {
        expect(prepare).toHaveBeenCalledTimes(1);
        expect(mockedSignWithFreighter).toHaveBeenCalledTimes(1);
        expect(submit).toHaveBeenCalledTimes(1);
      }
    });
  });
});