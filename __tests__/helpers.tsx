import { act } from "react";
import TestRenderer from "react-test-renderer";
import { AttiaProvider, useAttia } from "../lib/store";

export type Store = ReturnType<typeof useAttia>;

// react-test-renderer needs this flag to accept act() under React 19.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Mount the REAL AttiaProvider and hand back a live handle on its context, so
 * these tests drive the same read/write paths the screens do — not a copy of
 * them. Resolves once hydration (and therefore any migration) has settled.
 */
export async function mountStore(): Promise<{
  store: () => Store;
  unmount: () => void;
}> {
  const ref: { current: Store | null } = { current: null };

  function Probe() {
    ref.current = useAttia();
    return null;
  }

  let renderer: TestRenderer.ReactTestRenderer | null = null;
  await act(async () => {
    renderer = TestRenderer.create(
      <AttiaProvider>
        <Probe />
      </AttiaProvider>
    );
  });
  // Flush the hydration promise chain (AsyncStorage.getItem -> setState).
  await act(async () => {});

  if (!ref.current?.hydrated) throw new Error("store did not hydrate");

  return {
    store: () => {
      if (!ref.current) throw new Error("store unmounted");
      return ref.current;
    },
    unmount: () => act(() => renderer?.unmount())
  };
}

/** Run a store write inside act() so React flushes it before the next assertion. */
export function write(fn: () => void): void {
  act(fn);
}
