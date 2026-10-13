import assert from "node:assert/strict";
import test from "node:test";
import { currentSeason, searchPublicSections, seasons } from "./content.ts";

test("BioBuzz is the only seeded season and is marked current", () => {
  assert.equal(currentSeason.name, "BioBuzz");
  assert.equal(seasons.filter(season => season.current).length, 1);
  assert.equal(seasons.length, 1);
});

test("public section search is case insensitive and trims query text", () => {
  assert.equal(searchPublicSections("  ROBOT ")[0]?.href, "/robot");
  assert.equal(searchPublicSections("software")[0]?.href, "/software");
  assert.deepEqual(searchPublicSections("no matching section"), []);
});

test("empty search does not show every section", () => {
  assert.deepEqual(searchPublicSections("  "), []);
});
