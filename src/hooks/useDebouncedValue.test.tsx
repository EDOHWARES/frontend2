import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('only emits the latest value after the configured quiet period', () => {
    const { result, rerender } = renderHook(
      ({ value, delayMs }) => useDebouncedValue(value, delayMs),
      { initialProps: { value: 'a', delayMs: 300 } },
    );

    expect(result.current).toBe('a');

    rerender({ value: 'ab', delayMs: 300 });
    rerender({ value: 'abc', delayMs: 300 });
    rerender({ value: 'abcd', delayMs: 300 });

    // Before the quiet period elapses, the debounced value is unchanged.
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('abcd');
  });

  it('replaces the pending timer when the delay changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delayMs }) => useDebouncedValue(value, delayMs),
      { initialProps: { value: 'initial', delayMs: 200 } },
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delayMs: 500 });

    // Advancing by the old delay should not trigger an update.
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('initial');

    // Advancing by the new delay should trigger the update.
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('updated');
  });

  it('clears pending work on unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value, delayMs }) => useDebouncedValue(value, delayMs),
      { initialProps: { value: 'start', delayMs: 300 } },
    );

    expect(result.current).toBe('start');

    rerender({ value: 'pending', delayMs: 300 });
    expect(result.current).toBe('start');

    unmount();

    // Advancing timers after unmount must not throw or warn about state updates.
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }).not.toThrow();

    expect(result.current).toBe('start');
  });
});