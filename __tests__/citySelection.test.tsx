// Explicit globals: TypeScript 6 no longer auto-includes @types/*.
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act } from "react";
import TestRenderer from "react-test-renderer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CITIES } from "../lib/cities";
import { color } from "../lib/theme";
import { AttiaProvider, useAttia } from "../lib/store";
import { mountStore, write, type Store } from "./helpers";

/**
 * OAT-96 — the active city must be REACTIVE state, not an accessor call.
 *
 * React Compiler is enabled on this project. It memoized `activeCityId()` on the
 * callee's identity, and the accessor was a `useCallback(..., [])` reading a ref
 * — permanently stable — so every screen that rendered from it froze on the city
 * it first saw.
 *
 * ---------------------------------------------------------------------------
 * WHAT THESE TESTS CANNOT DO — read before trusting them.
 *
 * jest-expo does NOT apply babel-plugin-react-compiler (verified: the jest
 * transform emits no compiler-runtime import). So the test environment runs
 * UNCOMPILED code, and the freeze cannot be reproduced here — these tests pass
 * against the broken code too. They pin the shape that makes the bug impossible
 * (the city is reactive state; the ref accessor is not reachable from a screen),
 * not the bug itself. Catching the freeze needs a compiler-enabled render
 * environment: OAT-97, with the jest setup in OAT-92.
 * ---------------------------------------------------------------------------
 */

const DC = "washington-dc";
const MIAMI = "miami";

jest.mock("../lib/analytics", () => ({
  trackCitySelected: jest.fn(),
  trackAppOpened: jest.fn()
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const analytics = require("../lib/analytics") as {
  trackCitySelected: jest.Mock;
  trackAppOpened: jest.Mock;
};

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Pill = { label: string; selected: boolean; press: () => void };

/** Read the rendered pill row: which is highlighted, and how to tap each. */
function pillsOf(r: TestRenderer.ReactTestRenderer): Pill[] {
  const nodes = r.root.findAll(
    (n) =>
      typeof n.type !== "string" &&
      typeof n.props?.onPress === "function" &&
      typeof n.props?.className === "string"
  );
  return nodes.map((n, i) => ({
    label: CITIES[i].label,
    // Selection is a filled pill: backgroundColor === the `text` token, per the
    // dark pill spec (OAT-71). It was a `bg-neutral-900` class pre-dark-shell —
    // same behaviour, different expression.
    selected: flatten(n.props.style).backgroundColor === color.text,
    press: n.props.onPress as () => void
  }));
}

/** RN style props can be arrays/nested; flatten to one object. */
function flatten(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatten));
  return (style && typeof style === "object" ? style : {}) as Record<string, unknown>;
}

async function mountSelector() {
  const { CitySelector } = require("../components/CitySelector") as {
    CitySelector: () => React.ReactElement;
  };
  const ref: { current: Store | null } = { current: null };
  function Probe() {
    ref.current = useAttia();
    return null;
  }
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(
      <AttiaProvider>
        <Probe />
        <CitySelector />
      </AttiaProvider>
    );
  });
  await act(async () => {});
  return { r, store: () => ref.current as Store };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  analytics.trackCitySelected.mockClear();
});

describe("the value screens render from tracks setCity", () => {
  it("changes synchronously with setCity, in the same tick", async () => {
    const { store } = await mountStore();
    expect(store().cityId).toBe(DC);

    write(() => store().setCity(MIAMI));
    expect(store().cityId).toBe(MIAMI); // no extra render/tick needed

    write(() => store().setCity("new-york"));
    expect(store().cityId).toBe("new-york");
  });

  it("stays in lockstep with what a write stamps in the same tick", async () => {
    // The rendered value and the write-time stamp are now two consumers of one
    // state. This is the invariant that replaced the single accessor: if they
    // ever disagree, a save lands under a city the UI is not showing.
    const { store } = await mountStore();

    write(() => {
      store().setCity(MIAMI);
      store().toggleSave("miami-place-under-test"); // same tick as the switch
    });

    expect(store().cityId).toBe(MIAMI);
    expect(store().saved).toEqual([{ id: "miami-place-under-test", cityId: MIAMI }]);
    expect(store().activeSaved).toHaveLength(1);
  });

  it("does not expose the ref accessor, so no screen can render from it", async () => {
    // The structural guard: OAT-96 was only possible because a screen could
    // reach a stable, ref-backed accessor. Putting it back on the context is
    // how this regression would return.
    const { store } = await mountStore();

    expect(Object.keys(store())).toContain("cityId");
    expect(Object.keys(store())).not.toContain("activeCityId");
    expect((store() as unknown as Record<string, unknown>).activeCityId).toBeUndefined();
  });
});

describe("CitySelector", () => {
  it("highlights the active city, and follows setCity", async () => {
    const { r, store } = await mountSelector();

    expect(pillsOf(r).find((p) => p.selected)?.label).toBe("Washington DC");

    await act(async () => store().setCity(MIAMI));

    const after = pillsOf(r);
    expect(after.find((p) => p.selected)?.label).toBe("Miami");
    expect(after.filter((p) => p.selected)).toHaveLength(1);
  });

  it("tapping a pill selects that city and emits exactly one city_selected", async () => {
    const { r, store } = await mountSelector();

    await act(async () => pillsOf(r)[2].press()); // Miami

    expect(store().cityId).toBe(MIAMI);
    expect(pillsOf(r).find((p) => p.selected)?.label).toBe("Miami");
    expect(analytics.trackCitySelected).toHaveBeenCalledTimes(1);
    expect(analytics.trackCitySelected).toHaveBeenCalledWith(MIAMI);
  });

  it("tapping the already-selected pill emits nothing", async () => {
    // The duplicate city_selected in the wild was two human taps 0.5s apart:
    // the pill did not move, so the user tapped again, and this guard was
    // comparing against the frozen city so it could not suppress the second.
    const { r, store } = await mountSelector();

    await act(async () => pillsOf(r)[2].press()); // Miami
    expect(analytics.trackCitySelected).toHaveBeenCalledTimes(1);

    await act(async () => pillsOf(r)[2].press()); // Miami again
    await act(async () => pillsOf(r)[2].press()); // and again

    expect(analytics.trackCitySelected).toHaveBeenCalledTimes(1);
    expect(store().cityId).toBe(MIAMI);
  });

  it("switching away and back emits one event per real change", async () => {
    const { r } = await mountSelector();

    await act(async () => pillsOf(r)[2].press()); // Miami
    await act(async () => pillsOf(r)[0].press()); // DC
    await act(async () => pillsOf(r)[2].press()); // Miami

    expect(analytics.trackCitySelected).toHaveBeenCalledTimes(3);
    expect(analytics.trackCitySelected.mock.calls.map((c) => c[0])).toEqual([MIAMI, DC, MIAMI]);
  });
});
