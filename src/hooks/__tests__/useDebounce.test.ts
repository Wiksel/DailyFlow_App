import { renderHook, act } from '@testing-library/react-native';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    // Change value multiple times quickly
    rerender({ value: 'changed1', delay: 300 });
    rerender({ value: 'changed2', delay: 300 });
    rerender({ value: 'final', delay: 300 });

    // Value should still be initial
    expect(result.current).toBe('initial');

    // Fast forward time
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Now value should be updated
    expect(result.current).toBe('final');
  });

  it('respects custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    rerender({ value: 'changed', delay: 500 });

    // Value should not change before delay
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('initial');

    // Value should change after delay
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('changed');
  });

  it('cancels previous timeout on new value', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    rerender({ value: 'changed1', delay: 300 });

    // Wait part of the delay
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Change value again
    rerender({ value: 'changed2', delay: 300 });

    // Wait part of the new delay
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Value should still be initial
    expect(result.current).toBe('initial');

    // Wait for the full delay
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Now value should be the last one
    expect(result.current).toBe('changed2');
  });

  it('handles zero delay', () => {
    const { result } = renderHook(() => useDebounce('initial', 0));
    
    act(() => {
      result.current = 'changed';
    });
    
    // Value should change immediately with zero delay
    expect(result.current).toBe('changed');
  });

  it('handles negative delay', () => {
    const { result } = renderHook(() => useDebounce('initial', -100));
    
    act(() => {
      result.current = 'changed';
    });
    
    // Value should change immediately with negative delay
    expect(result.current).toBe('changed');
  });
});
