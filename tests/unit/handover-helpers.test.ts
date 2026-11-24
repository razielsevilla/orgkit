import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HANDOVER_SECTION_DEFINITIONS,
  calculateGuideCompleteness,
  canOfficerEditGuide,
  canOfficerReopenGuide,
  createEmptyHandoverSections,
} from "../../src/lib/handover/handover-helpers.ts";
import {
  saveHandoverGuideSchema,
  setHandoverStatusSchema,
} from "../../src/lib/handover/handover-validation.ts";

describe("handover-helpers: definitions and factories", () => {
  it("defines exactly 5 structured template sections", () => {
    assert.equal(HANDOVER_SECTION_DEFINITIONS.length, 5);
    const keys = HANDOVER_SECTION_DEFINITIONS.map((s) => s.key);
    assert.deepEqual(keys, [
      "what_i_do",
      "recurring_tasks",
      "key_contacts",
      "open_items",
      "where_things_are",
    ]);
  });

  it("creates empty section object with all keys initialized", () => {
    const empty = createEmptyHandoverSections();
    assert.equal(empty.what_i_do, "");
    assert.equal(empty.recurring_tasks, "");
    assert.equal(empty.key_contacts, "");
    assert.equal(empty.open_items, "");
    assert.equal(empty.where_things_are, "");
    assert.deepEqual(empty.linked_document_ids, []);
  });
});

describe("handover-helpers: calculateGuideCompleteness", () => {
  it("returns 0% for empty sections", () => {
    const empty = createEmptyHandoverSections();
    const result = calculateGuideCompleteness(empty);
    assert.equal(result.filledCount, 0);
    assert.equal(result.totalCount, 5);
    assert.equal(result.percentage, 0);
  });

  it("does not count sections with fewer than 10 characters", () => {
    const sections = {
      ...createEmptyHandoverSections(),
      what_i_do: "short",
    };
    const result = calculateGuideCompleteness(sections);
    assert.equal(result.filledCount, 0);
    assert.equal(result.percentage, 0);
  });

  it("calculates 40% when 2 sections are completed", () => {
    const sections = {
      ...createEmptyHandoverSections(),
      what_i_do: "I manage all official correspondence and records.",
      recurring_tasks: "Send weekly agendas every Monday afternoon.",
    };
    const result = calculateGuideCompleteness(sections);
    assert.equal(result.filledCount, 2);
    assert.equal(result.totalCount, 5);
    assert.equal(result.percentage, 40);
  });

  it("calculates 100% when all 5 sections are filled", () => {
    const sections = {
      what_i_do: "Oversee overall executive direction.",
      recurring_tasks: "Run weekly general meetings.",
      key_contacts: "Office of Student Activities - advisor@school.edu",
      open_items: "Permit for anniversary celebration in progress.",
      where_things_are: "Google Drive: /Executive 2026/Handover",
      linked_document_ids: [],
    };
    const result = calculateGuideCompleteness(sections);
    assert.equal(result.filledCount, 5);
    assert.equal(result.percentage, 100);
  });
});

describe("handover-helpers: permissions", () => {
  const authorId = "user-1111";
  const otherId = "user-2222";

  it("allows author to edit draft guide", () => {
    const guide = { status: "draft" as const, authorId };
    assert.equal(canOfficerEditGuide(guide, authorId, false), true);
  });

  it("blocks non-author non-admin from editing draft guide", () => {
    const guide = { status: "draft" as const, authorId };
    assert.equal(canOfficerEditGuide(guide, otherId, false), false);
  });

  it("blocks author from editing once marked ready", () => {
    const guide = { status: "ready" as const, authorId };
    assert.equal(canOfficerEditGuide(guide, authorId, false), false);
  });

  it("allows admin to edit guide even if marked ready", () => {
    const guide = { status: "ready" as const, authorId };
    assert.equal(canOfficerEditGuide(guide, otherId, true), true);
  });

  it("allows admin to reopen ready guide, but not non-admin", () => {
    const guide = { status: "ready" as const };
    assert.equal(canOfficerReopenGuide(guide, true), true);
    assert.equal(canOfficerReopenGuide(guide, false), false);
  });
});

describe("handover-validation: schemas", () => {
  it("validates valid save guide input", () => {
    const valid = {
      roleTitle: "Vice President",
      sections: {
        what_i_do: "Coordinate standing committees.",
        recurring_tasks: "",
        key_contacts: "",
        open_items: "",
        where_things_are: "",
        linked_document_ids: [],
      },
    };
    const parsed = saveHandoverGuideSchema.safeParse(valid);
    assert.equal(parsed.success, true);
  });

  it("rejects role titles shorter than 2 characters", () => {
    const invalid = {
      roleTitle: "A",
      sections: {
        what_i_do: "",
        recurring_tasks: "",
        key_contacts: "",
        open_items: "",
        where_things_are: "",
        linked_document_ids: [],
      },
    };
    const parsed = saveHandoverGuideSchema.safeParse(invalid);
    assert.equal(parsed.success, false);
  });

  it("validates set status schema for ready and draft", () => {
    const validId = "11111111-1111-4111-8111-111111111111";
    assert.equal(
      setHandoverStatusSchema.safeParse({ guideId: validId, status: "ready" }).success,
      true
    );
    assert.equal(
      setHandoverStatusSchema.safeParse({ guideId: validId, status: "draft" }).success,
      true
    );
    assert.equal(
      setHandoverStatusSchema.safeParse({ guideId: validId, status: "invalid" }).success,
      false
    );
  });
});
