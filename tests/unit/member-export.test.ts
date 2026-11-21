import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CSV_BOM,
  DEFAULT_EXPORT_FIELDS,
  DEFAULT_EXPORT_STATUSES,
  buildDataRow,
  buildHeaderRow,
  columnsFor,
  escapeCsvCell,
  exportFileName,
  formatExportDate,
  parseExportRequest,
} from "../../src/lib/members/member-export.ts";

describe("escapeCsvCell", () => {
  it("leaves plain text alone", () => {
    assert.equal(escapeCsvCell("Juan dela Cruz"), "Juan dela Cruz");
  });

  it("keeps Filipino and accented names intact", () => {
    assert.equal(escapeCsvCell("Niño Peña"), "Niño Peña");
  });

  it("quotes a comma, quote or line break and doubles inner quotes", () => {
    assert.equal(escapeCsvCell("Cruz, Juan"), '"Cruz, Juan"');
    assert.equal(escapeCsvCell('Juan "JJ" Cruz'), '"Juan ""JJ"" Cruz"');
    assert.equal(escapeCsvCell("a\nb"), '"a\nb"');
    assert.equal(escapeCsvCell("a\r\nb"), '"a\r\nb"');
  });

  it("neutralizes values a spreadsheet would run as a formula", () => {
    assert.equal(escapeCsvCell("=1+1"), "'=1+1");
    assert.equal(escapeCsvCell("+63 900"), "'+63 900");
    assert.equal(escapeCsvCell("-2"), "'-2");
    assert.equal(escapeCsvCell("@SUM(A1)"), "'@SUM(A1)");
    assert.equal(escapeCsvCell("\t=1"), "'\t=1");
  });

  it("guards first, then quotes", () => {
    assert.equal(escapeCsvCell('=HYPERLINK("x","y")'), '"\'=HYPERLINK(""x"",""y"")"');
  });

  it("writes null and undefined as empty", () => {
    assert.equal(escapeCsvCell(null), "");
    assert.equal(escapeCsvCell(undefined), "");
  });
});

describe("header and data rows", () => {
  it("uses plain labels in catalogue order, whatever order was asked for", () => {
    assert.equal(buildHeaderRow(["status", "full_name", "email"]), "Full name,Email,Status\r\n");
  });

  it("has no column for a field that is not selected", () => {
    const header = buildHeaderRow(["full_name"]);
    assert.equal(header, "Full name\r\n");
    assert.equal(columnsFor(["full_name"]), "full_name");
    assert.equal(buildDataRow({ full_name: "Ana" }, ["full_name"]), "Ana\r\n");
  });

  it("selects only the chosen columns", () => {
    assert.equal(columnsFor(["consent_at", "email"]), "email, consent_at");
  });

  it("formats dates, statuses and languages for people", () => {
    const row = buildDataRow(
      {
        full_name: "Ana",
        email: "ana@school.edu",
        status: "active",
        created_at: "2026-11-02T23:30:00.000Z",
        consent_at: "2026-11-03T00:00:00.000Z",
        consent_language: "fil",
      },
      ["full_name", "email", "status", "created_at", "consent_at", "consent_language"]
    );
    assert.equal(row, "Ana,ana@school.edu,Active,2026-11-02,2026-11-03,Filipino\r\n");
  });

  it("keeps a member with a comma and a line break in one row", () => {
    const row = buildDataRow({ full_name: "Cruz, Juan\nJr." }, ["full_name"]);
    assert.equal(row, '"Cruz, Juan\nJr."\r\n');
  });

  it("starts the file with a byte order mark so Excel reads UTF-8", () => {
    assert.equal(CSV_BOM, "﻿");
  });
});

describe("formatExportDate", () => {
  it("uses YYYY-MM-DD and tolerates bad input", () => {
    assert.equal(formatExportDate("2026-11-02T10:00:00Z"), "2026-11-02");
    assert.equal(formatExportDate("nope"), "");
    assert.equal(formatExportDate(null), "");
  });
});

describe("exportFileName", () => {
  const now = new Date("2026-11-02T12:00:00Z");

  it("names the file after the org and the date", () => {
    assert.equal(exportFileName("DevCon Laguna", now), "devcon-laguna-members-2026-11-02.csv");
  });

  it("strips characters not allowed in file names", () => {
    assert.equal(exportFileName('A/B\\C:*?"<>|  Club', now), "a-b-c-club-members-2026-11-02.csv");
  });

  it("drops accents", () => {
    assert.equal(exportFileName("Peña Niño", now), "pena-nino-members-2026-11-02.csv");
  });

  it("falls back to a generic name when nothing usable is left", () => {
    assert.equal(exportFileName("🎉🎉", now), "members-2026-11-02.csv");
    assert.equal(exportFileName("", now), "members-2026-11-02.csv");
    assert.equal(exportFileName(null, now), "members-2026-11-02.csv");
  });

  it("keeps long names to a sane length", () => {
    const name = exportFileName("x".repeat(500), now);
    assert.ok(name.length < 90);
    assert.match(name, /^x+-members-2026-11-02\.csv$/);
  });
});

describe("defaults", () => {
  it("selects only Full name, Email and Status, and Active members", () => {
    assert.deepEqual(DEFAULT_EXPORT_FIELDS, ["full_name", "email", "status"]);
    assert.deepEqual(DEFAULT_EXPORT_STATUSES, ["active"]);
  });
});

describe("parseExportRequest", () => {
  it("accepts a valid choice and de-duplicates it", () => {
    const res = parseExportRequest({
      fields: ["email", "email", "full_name"],
      statuses: ["pending", "active", "active"],
    });
    assert.deepEqual(res, {
      ok: true,
      value: { fields: ["full_name", "email"], statuses: ["pending", "active"] },
    });
  });

  it("refuses empty, unknown and malformed requests", () => {
    assert.equal(parseExportRequest(null).ok, false);
    assert.equal(parseExportRequest({}).ok, false);
    assert.equal(parseExportRequest({ fields: [], statuses: ["active"] }).ok, false);
    assert.equal(parseExportRequest({ fields: ["email"], statuses: [] }).ok, false);
    assert.equal(parseExportRequest({ fields: ["password"], statuses: ["active"] }).ok, false);
    assert.equal(parseExportRequest({ fields: ["email"], statuses: ["banned"] }).ok, false);
    assert.equal(parseExportRequest({ fields: "email", statuses: ["active"] }).ok, false);
  });
});
