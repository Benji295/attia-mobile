// Explicit globals: TypeScript 6 no longer auto-includes @types/*.
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { migrateBlob, SCHEMA_VERSION } from "../lib/store";
import { DEFAULT_CITY } from "../lib/cities";
import { mountStore, write } from "./helpers";

/**
 * OAT-61 legacy migration — existing testers have attia:v1 records whose saves
 * are bare id strings with no city. Those entries get stamped with the city that
 * is active at migration time, exactly once, and nothing is dropped.
 */

const STORAGE_KEY = "attia:v1";

/** A pre-OAT-61 record: saved is string[], no schemaVersion. */
function legacyBlob(overrides: Record<string, unknown> = {}) {
  return {
    result: null,
    saved: ["dc-anacostia-kayak", "dc-speakeasy-tasting", "dc-hirshhorn-after-hours"],
    activityCache: {},
    streak: 4,
    lastActiveDate: "2026-8-10",
    cityId: "miami",
    citiesExplored: ["washington-dc", "miami"],
    ...overrides
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("migrateBlob", () => {
  it("stamps every legacy save with the city active at migration time", () => {
    const { blob, migrated } = migrateBlob(legacyBlob());

    expect(migrated).toBe(3);
    expect(blob.schemaVersion).toBe(SCHEMA_VERSION);
    expect(blob.saved).toEqual([
      { id: "dc-anacostia-kayak", cityId: "miami" },
      { id: "dc-speakeasy-tasting", cityId: "miami" },
      { id: "dc-hirshhorn-after-hours", cityId: "miami" }
    ]);
  });

  it("runs exactly once — re-running stamps nothing and changes nothing", () => {
    const first = migrateBlob(legacyBlob());
    const second = migrateBlob(first.blob);

    expect(first.migrated).toBe(3);
    expect(second.migrated).toBe(0);
    expect(second.blob.saved).toEqual(first.blob.saved);

    // And a third pass is still a no-op.
    expect(migrateBlob(second.blob).migrated).toBe(0);
  });

  it("loses nothing — every id survives, and the rest of the record is preserved", () => {
    const legacy = legacyBlob();
    const { blob } = migrateBlob(legacy);

    expect(blob.saved.map((e) => e.id)).toEqual(legacy.saved);
    expect(blob.saved).toHaveLength(legacy.saved.length);
    expect(blob.streak).toBe(4);
    expect(blob.lastActiveDate).toBe("2026-8-10");
    expect(blob.cityId).toBe("miami");
    expect(blob.result).toBeNull();
  });

  it("falls back to the default city when the record has no cityId", () => {
    const { blob, migrated } = migrateBlob(legacyBlob({ cityId: undefined }));
    expect(migrated).toBe(3);
    expect(blob.saved.every((e) => e.cityId === DEFAULT_CITY)).toBe(true);
  });

  it("a user with zero legacy saves migrates 0 and still lands on the new schema", () => {
    const { blob, migrated } = migrateBlob(legacyBlob({ saved: [] }));
    expect(migrated).toBe(0);
    expect(blob.saved).toEqual([]);
    expect(blob.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("a brand-new user (no stored record at all) migrates 0", () => {
    const { blob, migrated } = migrateBlob(undefined);
    expect(migrated).toBe(0);
    expect(blob.saved).toEqual([]);
    expect(blob.cityId).toBe(DEFAULT_CITY);
    expect(blob.result).toBeNull();
  });

  it("self-heals a half-written entry instead of orphaning it", () => {
    const { blob, migrated } = migrateBlob(
      legacyBlob({
        saved: [{ id: "already-scoped", cityId: "new-york" }, { id: "no-city" }, "bare-string"]
      })
    );

    expect(migrated).toBe(2); // the city-less object + the bare string
    expect(blob.saved).toEqual([
      { id: "already-scoped", cityId: "new-york" }, // untouched
      { id: "no-city", cityId: "miami" },
      { id: "bare-string", cityId: "miami" }
    ]);
  });
});

describe("migration through the real store", () => {
  it("migrates a legacy record on hydrate, reports the count, and persists schema 2", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(legacyBlob()));
    const log = jest.spyOn(console, "log").mockImplementation(() => {});

    const { store, unmount } = await mountStore();

    // Migrated in memory...
    expect(store().saved).toEqual([
      { id: "dc-anacostia-kayak", cityId: "miami" },
      { id: "dc-speakeasy-tasting", cityId: "miami" },
      { id: "dc-hirshhorn-after-hours", cityId: "miami" }
    ]);
    expect(store().activeCityId()).toBe("miami");
    expect(store().activeSaved).toHaveLength(3);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("stamped 3 legacy saves"));

    // ...and written back under the same key, now marked schema 2.
    const persisted = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) as string);
    expect(persisted.schemaVersion).toBe(SCHEMA_VERSION);
    expect(persisted.saved).toEqual(store().saved);

    unmount();
    log.mockRestore();
  });

  it("does not re-stamp on the next launch", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(legacyBlob()));

    const first = await mountStore();
    const afterMigration = first.store().saved;
    first.unmount();

    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    const second = await mountStore();

    expect(second.store().saved).toEqual(afterMigration);
    expect(log).not.toHaveBeenCalledWith(expect.stringContaining("migration"));
    log.mockRestore();
  });

  it("migrated saves are scoped like any other: they stay in their own city", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(legacyBlob()));
    const { store } = await mountStore();

    expect(store().activeSaved).toHaveLength(3); // Miami, where they were stamped
    write(() => store().setCity("washington-dc"));
    expect(store().activeSaved).toEqual([]);
    expect(store().savedElsewhereCount).toBe(3);
  });

  it("a user with zero legacy saves gets a clean, empty, migrated record", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(legacyBlob({ saved: [] })));
    const { store } = await mountStore();

    expect(store().saved).toEqual([]);
    expect(store().activeSaved).toEqual([]);
    expect(store().savedElsewhereCount).toBe(0);
    expect(store().streak).toBeGreaterThan(0); // streak survived
  });
});
