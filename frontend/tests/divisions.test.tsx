import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CustomizableForm from "../src/components/CustomizableForm";
import DivisionEditor from "../src/components/DivisionEditor";
import type { Division } from "../src/types/divisions";
import { eventDivisionDrafts } from "../src/types/divisions";
import { resolveApiBaseUrl } from "../src/util/api";
import { API_BASE_URL, loginWithGoogle } from "../src/util/auth";

const divisions: Division[] = [
  { id: 1, name: "Men's singles", min_teammates: 0, max_teammates: 0, max_participants: 16, waitlist_max_participants: 0 },
  { id: 2, name: "Women's singles", min_teammates: 0, max_teammates: 0, max_participants: 16, waitlist_max_participants: 0 },
  { id: 3, name: "Doubles", min_teammates: 1, max_teammates: 1, max_participants: 8, waitlist_max_participants: 2 },
];

test("all clients default to the local API in development and production API in production", () => {
  assert.equal(resolveApiBaseUrl(undefined, true), "http://localhost:4000");
  assert.equal(resolveApiBaseUrl(undefined, false), "https://api.aubgolympics.com");
  assert.equal(resolveApiBaseUrl(" https://staging.example.com/ ", true), "https://staging.example.com");
  assert.equal(resolveApiBaseUrl("   ", true), "http://localhost:4000");
});

test("Google login uses the same API origin as admin and registration requests", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const fake = { location: { href: "" } };
  Object.defineProperty(globalThis, "window", { value: fake, configurable: true });
  try {
    loginWithGoogle();
    assert.equal(fake.location.href, `${API_BASE_URL}/api/auth/login`);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("an older event response produces a compatibility error before draft state is replaced", () => {
  assert.throws(() => eventDivisionDrafts({}), /connected backend does not support divisions/);
  assert.throws(() => eventDivisionDrafts(null), /connected backend does not support divisions/);
  const drafts = eventDivisionDrafts({ divisions });
  assert.equal(drafts.length, 3);
  assert.equal(drafts[2].id, 3);
  assert.equal(drafts[2].min_teammates, 1);
  assert.equal(eventDivisionDrafts({ divisions: [] })[0].name, "Open");
});

test("registration displays every named division without a gender selector", () => {
  const html = renderToStaticMarkup(<CustomizableForm divisions={divisions} />);
  assert.equal((html.match(/name="division"/g) ?? []).length, 3);
  assert.match(html, /Doubles/);
  assert.doesNotMatch(html, /Select Gender/);
  assert.doesNotMatch(html, /placeholder="Team name/);
  assert.doesNotMatch(html, /placeholder="Teammate 1"/);
});

test("doubles shows exactly one teammate and requires the configured minimum", () => {
  const html = renderToStaticMarkup(<CustomizableForm divisions={[divisions[2]]} />);
  assert.match(html, /Team Name/);
  assert.match(html, /Min 1 teammates required/);
  assert.match(html, /placeholder="Teammate 1"/);
  assert.doesNotMatch(html, /placeholder="Teammate 2"/);
});

test("a full division does not prevent selecting an available division", () => {
  const capacityInfo = { divisions: [
    { id: 1, full: true, closed: true, waitlist: false },
    { id: 2, full: false, closed: false, waitlist: false },
  ] };
  const html = renderToStaticMarkup(<CustomizableForm divisions={divisions} capacityInfo={capacityInfo} />);
  assert.match(html, /<input(?=[^>]*value="2")(?=[^>]*checked="")[^>]*>/);
  assert.doesNotMatch(html, /type="submit" disabled/);
});

test("closed divisions block submission while waitlist divisions remain open", () => {
  const closed = renderToStaticMarkup(<CustomizableForm divisions={[divisions[2]]}
    capacityInfo={{ divisions: [{ id: 3, full: true, closed: true, waitlist: false }] }} />);
  assert.match(closed, /type="submit" disabled/);
  const waitlist = renderToStaticMarkup(<CustomizableForm divisions={[divisions[2]]}
    capacityInfo={{ divisions: [{ id: 3, full: true, closed: false, waitlist: true }] }} />);
  assert.match(waitlist, /WAITLIST/);
  assert.doesNotMatch(waitlist, /type="submit" disabled/);
});

test("admin editor renders independent teammate and capacity settings", () => {
  const html = renderToStaticMarkup(<DivisionEditor
    divisions={divisions.map((division) => ({ ...division, clientKey: String(division.id) }))} onChange={() => {}} />);
  assert.match(html, /Divisions \(3\)/);
  assert.equal((html.match(/Minimum Teammates/g) ?? []).length, 3);
  assert.equal((html.match(/Maximum Teammates/g) ?? []).length, 3);
  assert.equal((html.match(/Registration Limit/g) ?? []).length, 3);
  assert.equal((html.match(/Waitlist Entries/g) ?? []).length, 3);
  assert.match(html, /Existing registrations are kept/);
});
