import { act } from "react";
import TestRenderer from "react-test-renderer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { quizQuestions } from "../data/quiz";
import { scoreQuiz } from "../lib/scoring/recommendations";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AttiaProvider } from "../lib/store";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PlaceDetailOverlay } from "../components/PlaceDetailOverlay";
import type { Activity } from "../types";

/** Real metrics rather than a mocked hook — the padding maths is real code. */
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 }
};

/**
 * Harness for the render smoke tests (OAT-92).
 *
 * The bar is deliberately low and deliberately not snapshots: does the screen
 * MOUNT and produce output. PR #26 shipped a Rules of Hooks violation that
 * rendered Profile blank with the whole suite green — a snapshot would have been
 * updated to the blank output and told us nothing. "It rendered something" is
 * the assertion that would have caught it.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** A real engine result, so seeded state is never invented. */
export function realResult() {
  const answers = Object.fromEntries(
    quizQuestions.map((q, i) => [q.id, q.options[i % q.options.length].id])
  );
  return scoreQuiz(quizQuestions, answers);
}

/** Persist a store blob so a screen mounts in the "has quiz result" state. */
export async function seedWithResult() {
  await AsyncStorage.setItem(
    "attia:v1",
    JSON.stringify({
      schemaVersion: 2,
      result: realResult(),
      saved: [
        { id: "dc-anacostia-kayak", cityId: "washington-dc" },
        { id: "dc-speakeasy-tasting", cityId: "washington-dc" }
      ],
      activityCache: {},
      streak: 2,
      lastActiveDate: null,
      cityId: "washington-dc",
      citiesExplored: ["washington-dc"]
    })
  );
}

export async function seedEmpty() {
  await AsyncStorage.clear();
}

/**
 * Mount a screen inside the real store provider and return its rendered tree.
 * Throws if the component throws — which is the whole point.
 */
export async function renderScreen(Screen: React.ComponentType) {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <AttiaProvider>
          <Screen />
        </AttiaProvider>
      </SafeAreaProvider>
    );
  });
  // Let hydration and any mount effects settle.
  await act(async () => {});
  await act(async () => {});
  return renderer;
}

/** Every string rendered anywhere in the tree. */
export function textOf(renderer: TestRenderer.ReactTestRenderer): string {
  const out: string[] = [];
  const walk = (node: TestRenderer.ReactTestRendererJSON | string | null | undefined): void => {
    if (node == null) return;
    if (typeof node === "string") { out.push(node); return; }
    (node.children ?? []).forEach(walk);
  };
  const json = renderer.toJSON();
  (Array.isArray(json) ? json : [json]).forEach(walk);
  return out.join(" ");
}

/**
 * The real captured proxy payload (OAT-108), so overlay tests run against the
 * data the screen will actually receive rather than an invented activity.
 */
export function liveActivities(): Activity[] {
  const fixture = join(__dirname, "..", "scripts", "data", "live-activities.json");
  const capture = JSON.parse(readFileSync(fixture, "utf8")) as {
    cities: Record<string, { activities: Activity[] }>;
  };
  return Object.values(capture.cities).flatMap((c) => c.activities);
}

/**
 * Mount the place detail overlay on its own (OAT-44).
 *
 * Rendered directly rather than by driving Discover's state: the overlay's
 * visibility is pure state with no animation gate, so mounting it IS the open
 * state. No provider is needed — it takes everything it renders as props.
 */
export async function renderOverlay(
  activity: Activity,
  opts: { isSaved?: boolean; reason?: string } = {}
) {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <PlaceDetailOverlay
          activity={activity}
          reason={opts.reason}
          isSaved={opts.isSaved ?? false}
          onSave={() => {}}
          onClose={() => {}}
        />
      </SafeAreaProvider>
    );
  });
  await act(async () => {});
  return renderer;
}

/** Unmount inside act(), so animation cleanup never trips the act warning. */
export async function unmountActed(r: TestRenderer.ReactTestRenderer) {
  await act(async () => {
    r.unmount();
  });
}
