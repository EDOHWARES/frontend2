# Testing with Fake Timers

Some hooks rely on `setTimeout` or `setInterval` to schedule work. Running real
timers in tests makes the suite slow and non-deterministic. Vitest's fake-timer
API lets you control time directly and verify timer cleanup without waiting for
real milliseconds to pass.

## Example — `useDebouncedValue`

`useDebouncedValue` (source: `src/hooks/useDebouncedValue.ts`) delays
propagating a value until it has been stable for `delayMs`. Its `useEffect`
schedules a `setTimeout` and returns a cleanup that calls `clearTimeout`, so
stale timers never fire after the component unmounts or the value changes again.

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedValue } from "./useDebouncedValue.js";

describe("useDebouncedValue", () => {
  afterEach(() => {
    vi.useRealTimers(); // restore global timer functions after each test
  });

  it("returns the initial value immediately", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDebouncedValue("initial", 300));
    expect(result.current).toBe("initial");
  });

  it("does not update before the delay has elapsed", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "alice@example.test" } },
    );

    rerender({ value: "bob@example.test" });
    act(() => { vi.advanceTimersByTime(299); }); // just before the threshold

    expect(result.current).toBe("alice@example.test");
  });

  it("updates after the full delay has elapsed", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "alice@example.test" } },
    );

    rerender({ value: "bob@example.test" });
    act(() => { vi.advanceTimersByTime(300); }); // exactly at the threshold

    expect(result.current).toBe("bob@example.test");
  });

  it("resets the timer when the value changes mid-flight", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "alice@example.test" } },
    );

    rerender({ value: "bob@example.test" });
    act(() => { vi.advanceTimersByTime(200); }); // 200 ms in — not yet settled

    rerender({ value: "carol@example.test" }); // new value resets the clock
    act(() => { vi.advanceTimersByTime(200); }); // only 200 ms since the last change

    expect(result.current).toBe("alice@example.test"); // neither intermediate value fired

    act(() => { vi.advanceTimersByTime(100); }); // now 300 ms since "carol"
    expect(result.current).toBe("carol@example.test");
  });

  it("cleans up the timer on unmount so the state setter is never called", () => {
    vi.useFakeTimers();
    const setStateSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { rerender, unmount } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "alice@example.test" } },
    );

    rerender({ value: "bob@example.test" });
    unmount(); // cleanup runs; clearTimeout is called before the timer fires

    // Advancing time after unmount must not trigger a React state-update warning.
    act(() => { vi.advanceTimersByTime(300); });

    expect(setStateSpy).not.toHaveBeenCalled();
    setStateSpy.mockRestore();
  });
});
```

## Key points

**Call `vi.useFakeTimers()` before the hook renders.** The hook installs its
`setTimeout` during the first render, so fake timers must already be in place or
the real `setTimeout` is captured instead.

**Wrap `vi.advanceTimersByTime` in `act`.** Timer callbacks update React state.
`act` flushes those updates so assertions see the final rendered output.

**Restore with `vi.useRealTimers()` in `afterEach`.** Fake timers leak across
tests when the timer state is global. An `afterEach` guard ensures every other
test suite starts clean.

**The cleanup path matters.** The unmount test verifies that `clearTimeout` is
called before the timer fires, which is the main correctness guarantee of the
hook's cleanup function. Without it, a component that unmounts while a debounce
is in-flight would attempt to update state on an unmounted component.
