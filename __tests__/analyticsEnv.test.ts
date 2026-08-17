// Explicit globals: TypeScript 6 no longer auto-includes @types/*.
import { describe, expect, it, jest } from "@jest/globals";
import { planAnalytics } from "../lib/analyticsEnv";

/**
 * OAT-94 — three buckets, not two.
 *
 * The load-bearing assertion is the first one: a development build must send
 * NOTHING. Stakeholder and developer traffic landing in the production project
 * is what corrupts quiz_chapter_reached, whose whole job is abandonment.
 */

const KEY = "phc_test_key_not_a_real_project";

describe("development sends nothing", () => {
  it("plans console output, never a send — with or without a key present", () => {
    expect(planAnalytics("development", KEY)).toEqual({ mode: "console" });
    expect(planAnalytics("development", undefined)).toEqual({ mode: "console" });
    // Even a key sitting in the environment cannot promote dev to sending.
    expect(planAnalytics("development", KEY).mode).not.toBe("send");
  });

  it("constructs no client at all in development", () => {
    // jest-expo runs with __DEV__ true, so importing the real module resolves to
    // the development bucket: `posthog` must be null, not a muted client.
    const { posthog } = require("../lib/analytics") as { posthog: unknown };
    expect(posthog).toBeNull();
  });

  it("track() emits to the console and returns without sending", () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    const { track } = require("../lib/analytics") as {
      track: (e: string, p?: Record<string, string | number | boolean | null>) => void;
    };
    track("quiz_chapter_reached", { chapter_id: 3, chapter_name: "How You Move" });
    expect(log).toHaveBeenCalledWith(
      "[attia analytics] quiz_chapter_reached",
      { chapter_id: 3, chapter_name: "How You Move" }
    );
    log.mockRestore();
  });
});

describe("preview and production each send to their own key", () => {
  it("sends with the key it is given", () => {
    expect(planAnalytics("preview", "phc_preview")).toEqual({ mode: "send", key: "phc_preview" });
    expect(planAnalytics("production", "phc_prod")).toEqual({ mode: "send", key: "phc_prod" });
  });

  it("keeps the two buckets distinct — the key is the only thing routing them", () => {
    const preview = planAnalytics("preview", "phc_preview");
    const production = planAnalytics("production", "phc_prod");
    expect(preview).not.toEqual(production);
  });

  it("trims whitespace, which is how a pasted dashboard value usually breaks", () => {
    expect(planAnalytics("production", "  phc_prod\n")).toEqual({ mode: "send", key: "phc_prod" });
  });
});

describe("a missing key fails loudly, never silently", () => {
  it("disables with a warning rather than pretending to send", () => {
    for (const env of ["preview", "production"] as const) {
      const plan = planAnalytics(env, undefined);
      expect(plan.mode).toBe("disabled");
      if (plan.mode !== "disabled") throw new Error("unreachable");
      expect(plan.warning).toContain("EXPO_PUBLIC_POSTHOG_KEY");
      expect(plan.warning).toContain(env);
      expect(plan.warning).toContain("NO events");
    }
  });

  it("treats an empty or whitespace key as missing", () => {
    expect(planAnalytics("production", "").mode).toBe("disabled");
    expect(planAnalytics("production", "   ").mode).toBe("disabled");
  });
});
