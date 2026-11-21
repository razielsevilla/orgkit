import { describe, expect, it } from "vitest";
import {
  MAX_CSV_BYTES,
  buildInviteRows,
  exceedsRowLimit,
  parseCsvBytes,
  readRoster,
  reasonLabel,
} from "@/src/lib/members/csv-import";

const enc = (text: string) => new TextEncoder().encode(text);

function rosterOf(text: string) {
  const res = readRoster(enc(text));
  if (!res.ok) throw new Error(`expected a roster, got ${res.error}`);
  return res.roster;
}

describe("parseCsvBytes", () => {
  it("reads quotes, doubled quotes, commas and line breaks inside quotes", () => {
    const res = parseCsvBytes(enc('name,email\r\n"Cruz, Ana","ana@x.edu"\r\n"He said ""hi""\nthere",b@x.edu\r\n'));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.records.map((r) => r.cells)).toEqual([
      ["name", "email"],
      ["Cruz, Ana", "ana@x.edu"],
      ['He said "hi"\nthere', "b@x.edu"],
    ]);
  });

  it("numbers rows by their line in the file, skipping blank lines and counting quoted line breaks", () => {
    const res = parseCsvBytes(enc('email\n\na@x.edu\n"b\nc"@x.edu\nd@x.edu'));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.records.map((r) => r.row)).toEqual([1, 3, 4, 6]);
  });

  it("keeps Filipino and accented names, with or without a byte order mark", () => {
    const text = "name,email\nMaría Clara Peña,mc@x.edu\nJosé Ñoño,jn@x.edu\nZoë 李雷,zl@x.edu\n";
    for (const bytes of [enc(text), new Uint8Array([0xef, 0xbb, 0xbf, ...enc(text)])]) {
      const res = parseCsvBytes(bytes);
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.records[0].cells[0]).toBe("name");
      expect(res.records.map((r) => r.cells[0])).toEqual(["name", "María Clara Peña", "José Ñoño", "Zoë 李雷"]);
    }
  });

  it("detects semicolon and tab separated files", () => {
    expect(parseCsvBytes(enc("name;email\nAna;a@x.edu")).ok && true).toBe(true);
    const semi = parseCsvBytes(enc("name;email\nAna;a@x.edu"));
    const tab = parseCsvBytes(enc("name\temail\nAna\ta@x.edu"));
    expect(semi.ok && semi.records[1].cells).toEqual(["Ana", "a@x.edu"]);
    expect(tab.ok && tab.records[1].cells).toEqual(["Ana", "a@x.edu"]);
  });

  it("refuses an empty file, a blank file, and a file with no usable rows", () => {
    expect(parseCsvBytes(new Uint8Array())).toEqual({ ok: false, error: "empty" });
    expect(parseCsvBytes(enc("  \n \r\n"))).toEqual({ ok: false, error: "empty" });
    expect(parseCsvBytes(enc(",,\n,,\n"))).toEqual({ ok: false, error: "no_rows" });
  });

  it("refuses text that is not valid UTF-8, binary files and unclosed quotes", () => {
    expect(parseCsvBytes(new Uint8Array([0xff, 0xfe, 0x41, 0x00, 0x42, 0x00]))).toEqual({ ok: false, error: "not_csv" });
    expect(parseCsvBytes(enc("PK\u0003\u0004\u0000\u0000binary"))).toEqual({ ok: false, error: "not_csv" });
    expect(parseCsvBytes(enc('email\n"a@x.edu'))).toEqual({ ok: false, error: "not_csv" });
  });

  it("refuses a file over 1 MB without reading it", () => {
    expect(parseCsvBytes(new Uint8Array(MAX_CSV_BYTES + 1))).toEqual({ ok: false, error: "too_large" });
    expect(parseCsvBytes(new Uint8Array(MAX_CSV_BYTES)).ok).toBe(false); // zeros: not too_large
  });
});

describe("readRoster", () => {
  it("uses a heading row as column names and guesses the columns", () => {
    const roster = rosterOf("Full Name,Email Address,Year\nAna Cruz,ana@x.edu,2\n");
    expect(roster.hasHeader).toBe(true);
    expect(roster.emailColumn).toBe(1);
    expect(roster.nameColumn).toBe(0);
  });

  it("guesses the email column from the data when headings are unhelpful", () => {
    const roster = rosterOf("a,b\nAna,ana@x.edu\nBen,ben@x.edu\n");
    expect(roster.hasHeader).toBe(true);
    expect(roster.emailColumn).toBe(1);
    expect(roster.nameColumn).toBeNull();
  });

  it("can tell when the first row is a person, not headings", () => {
    const roster = rosterOf("Ana Cruz,ana@x.edu\nBen Reyes,ben@x.edu\n");
    expect(roster.hasHeader).toBe(false);
    expect(roster.emailColumn).toBe(1);
  });

  it("refuses a file with no email address anywhere", () => {
    const res = readRoster(enc("name,year\nAna,2\nBen,3\n"));
    expect(res).toEqual({ ok: false, error: "no_emails" });
  });

  it("refuses a file with only headings", () => {
    expect(readRoster(enc("name,email\n"))).toEqual({ ok: false, error: "no_emails" });
  });

  it("allows 1,000 people plus a heading row, but not 1,001", () => {
    const lines = (n: number) => ["email", ...Array.from({ length: n }, (_, i) => `p${i}@x.edu`)].join("\n");
    expect(readRoster(enc(lines(1000))).ok).toBe(true);
    expect(readRoster(enc(lines(1001)))).toEqual({ ok: false, error: "too_many_rows" });
  });

  it("applies the row limit to a file whose first row is a person", () => {
    const text = Array.from({ length: 1001 }, (_, i) => `p${i}@x.edu`).join("\n");
    expect(readRoster(enc(text))).toEqual({ ok: false, error: "too_many_rows" });
    expect(exceedsRowLimit(1001, true)).toBe(false);
    expect(exceedsRowLimit(1001, false)).toBe(true);
  });
});

describe("buildInviteRows", () => {
  it("skips the heading row, trims, and keeps file line numbers", () => {
    const roster = rosterOf('name,email\n\n"  Ana  ", ANA@x.edu \nBen,\n');
    const rows = buildInviteRows(roster.records, true, 1, 0);
    expect(rows).toEqual([
      { row: 3, email: "ANA@x.edu", name: "Ana" },
      { row: 4, email: "", name: "Ben" },
    ]);
  });

  it("leaves names empty when there is no name column, and includes the first row when it is data", () => {
    const roster = rosterOf("Ana,ana@x.edu\nBen,ben@x.edu\n");
    const rows = buildInviteRows(roster.records, false, 1, null);
    expect(rows).toEqual([
      { row: 1, email: "ana@x.edu", name: "" },
      { row: 2, email: "ben@x.edu", name: "" },
    ]);
  });

  it("copes with short rows", () => {
    const roster = rosterOf("name,email\nAna\nBen,ben@x.edu\n");
    const rows = buildInviteRows(roster.records, true, 1, 0);
    expect(rows[0]).toEqual({ row: 2, email: "", name: "Ana" });
  });
});

describe("reasonLabel", () => {
  it("explains each reason the database gives, and has a fallback", () => {
    expect(reasonLabel("missing_email")).toMatch(/no email/i);
    expect(reasonLabel("invalid_email")).toMatch(/valid email/i);
    expect(reasonLabel("name_too_long")).toMatch(/too long/i);
    expect(reasonLabel("something_new")).toBeTruthy();
  });
});
