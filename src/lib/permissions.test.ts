import assert from "node:assert/strict";
import test from "node:test";
import { canEditEntry, canMakeMediaPublic, canManageCmsUsers, canPublishContent } from "./permissions.ts";

test("only admins can publish and manage CMS users", () => {
  assert.equal(canPublishContent("editor"), false);
  assert.equal(canManageCmsUsers("editor"), false);
  assert.equal(canPublishContent("admin"), true);
  assert.equal(canManageCmsUsers("admin"), true);
});

test("editors can work on drafts but cannot modify published records", () => {
  assert.equal(canEditEntry("editor", "draft"), true);
  assert.equal(canEditEntry("editor", "published"), false);
  assert.equal(canEditEntry("editor", "scheduled"), false);
  assert.equal(canEditEntry("admin", "published"), true);
});

test("editors cannot make uploaded media public", () => {
  assert.equal(canMakeMediaPublic("editor"), false);
  assert.equal(canMakeMediaPublic("admin"), true);
});
