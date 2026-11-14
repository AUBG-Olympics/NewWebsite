import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import CustomizableForm from "../src/components/CustomizableForm";
import FlameButton from "../src/components/DDayButton";
import SponsorCarousel from "../src/components/SponsorCarousel";
import DDaySchedulePage from "../src/pages/DDaySchedulePage";
import TeamPage from "../src/pages/Team";

test("closed gender categories remain visible and block submission", () => {
  const html = renderToStaticMarkup(
    <CustomizableForm
      separated_genders
      capacityInfo={{ male_is_full: true, female_is_full: true }}
    />,
  );
  assert.equal((html.match(/type="radio"/g) ?? []).length, 2);
  assert.equal((html.match(/- FULL/g) ?? []).length, 2);
  assert.match(html, /The selected gender category is full/);
  assert.match(html, /type="submit" disabled=""/);
});

test("a full category with waitlist capacity still permits submission", () => {
  const html = renderToStaticMarkup(
    <CustomizableForm
      separated_genders
      capacityInfo={{
        male_is_full: true,
        female_is_full: true,
        female_waitlist: true,
      }}
    />,
  );
  assert.match(html, /WAITLIST/);
  assert.match(html, /Female \(Waitlist\)/);
  assert.doesNotMatch(html, /type="submit" disabled/);
  assert.doesNotMatch(html, /The selected gender category is full/);
});

test("available categories permit submission", () => {
  const html = renderToStaticMarkup(
    <CustomizableForm
      separated_genders
      capacityInfo={{ male_is_full: false, female_is_full: false }}
    />,
  );
  assert.doesNotMatch(html, /type="submit" disabled/);
  assert.doesNotMatch(html, /- FULL/);
});

test("the recovered schedule displays both deployed posters", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter><DDaySchedulePage /></MemoryRouter>,
  );
  assert.match(html, /SCHEDULE D-DAY - 2\.png/);
  assert.match(html, /SCHEDULE D-DAY - 3\.png/);
  assert.match(html, /Back to D-Day Events/);
});

test("the recovered team page renders all 48 deployed members", () => {
  const html = renderToStaticMarkup(<TeamPage />);
  assert.equal((html.match(/aria-label="Select /g) ?? []).length, 48);
  assert.match(html, /Mario Boyanov/);
  assert.match(html, /c_limit,w_260\//);
});

test("the flame button supports the deployed label and flame offset props", () => {
  const html = renderToStaticMarkup(
    <FlameButton label="Schedule" flameTranslateY={-25}>Fallback</FlameButton>,
  );
  assert.match(html, /translateY\(-25%\)/);
  assert.match(html, /Schedule/);
  assert.doesNotMatch(html, /Fallback/);
  assert.doesNotMatch(html, /flameTranslateY=/);
});

test("the sponsor carousel does not render placeholder logos", () => {
  assert.equal(renderToStaticMarkup(<SponsorCarousel />), "");
});
