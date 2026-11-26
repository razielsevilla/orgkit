import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_DOCUMENT_FILE_SIZE,
  addDocumentFileMetadataSchema,
  addDocumentLinkSchema,
  isAllowedDocumentFileType,
  isDocumentCategory,
  isValidExternalUrl,
} from "../../src/lib/documents/documents-validation.ts";

describe("documents validation unit tests", () => {
  describe("isValidExternalUrl", () => {
    it("accepts valid http and https URLs", () => {
      assert.equal(isValidExternalUrl("https://google.com"), true);
      assert.equal(isValidExternalUrl("http://example.org/path/to/resource"), true);
      assert.equal(isValidExternalUrl("https://drive.google.com/drive/folders/xyz?usp=sharing"), true);
    });

    it("rejects dangerous or disallowed protocols", () => {
      assert.equal(isValidExternalUrl("javascript:alert('xss')"), false);
      assert.equal(isValidExternalUrl("data:text/html,<h1>Hello</h1>"), false);
      assert.equal(isValidExternalUrl("file:///C:/secret.txt"), false);
      assert.equal(isValidExternalUrl("ftp://files.example.com"), false);
    });

    it("rejects relative paths and empty or malformed strings", () => {
      assert.equal(isValidExternalUrl(""), false);
      assert.equal(isValidExternalUrl("/workspace/123/documents"), false);
      assert.equal(isValidExternalUrl("not a url"), false);
      assert.equal(isValidExternalUrl("https://"), false);
    });
  });

  describe("addDocumentLinkSchema", () => {
    it("validates correct link input", () => {
      const parsed = addDocumentLinkSchema.safeParse({
        title: "Constitution 2026",
        category: "Legal",
        url: "https://example.com/constitution",
      });
      assert.equal(parsed.success, true);
    });

    it("rejects title under 2 characters or over 150 characters", () => {
      const tooShort = addDocumentLinkSchema.safeParse({
        title: "A",
        category: "Legal",
        url: "https://example.com",
      });
      assert.equal(tooShort.success, false);

      const tooLong = addDocumentLinkSchema.safeParse({
        title: "A".repeat(151),
        category: "Legal",
        url: "https://example.com",
      });
      assert.equal(tooLong.success, false);
    });

    it("rejects invalid categories", () => {
      const parsed = addDocumentLinkSchema.safeParse({
        title: "Some Doc",
        category: "SecretArchive",
        url: "https://example.com",
      });
      assert.equal(parsed.success, false);
    });

    it("rejects invalid URLs", () => {
      const parsed = addDocumentLinkSchema.safeParse({
        title: "Some Doc",
        category: "General",
        url: "javascript:evil()",
      });
      assert.equal(parsed.success, false);
    });
  });

  describe("isAllowedDocumentFileType", () => {
    it("permits standard document, spreadsheet, and image types", () => {
      assert.equal(isAllowedDocumentFileType("handover.pdf", "application/pdf"), true);
      assert.equal(
        isAllowedDocumentFileType(
          "budget.xlsx",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        true
      );
      assert.equal(
        isAllowedDocumentFileType(
          "bylaws.docx",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ),
        true
      );
      assert.equal(isAllowedDocumentFileType("receipt.png", "image/png"), true);
      assert.equal(isAllowedDocumentFileType("photo.jpg", "image/jpeg"), true);
      assert.equal(isAllowedDocumentFileType("roster.csv", "text/csv"), true);
      assert.equal(isAllowedDocumentFileType("notes.txt", "text/plain"), true);
    });

    it("handles uppercase extensions gracefully", () => {
      assert.equal(isAllowedDocumentFileType("DOC.PDF"), true);
      assert.equal(isAllowedDocumentFileType("IMAGE.PNG"), true);
    });

    it("strictly blocks executable, script, and dangerous extensions", () => {
      assert.equal(isAllowedDocumentFileType("virus.exe"), false);
      assert.equal(isAllowedDocumentFileType("script.sh"), false);
      assert.equal(isAllowedDocumentFileType("payload.bat"), false);
      assert.equal(isAllowedDocumentFileType("server.js"), false);
      assert.equal(isAllowedDocumentFileType("exploit.php"), false);
    });
  });

  describe("addDocumentFileMetadataSchema", () => {
    it("validates file metadata", () => {
      const parsed = addDocumentFileMetadataSchema.safeParse({
        title: "Finance Report Q1",
        category: "Finance",
      });
      assert.equal(parsed.success, true);
    });

    it("trims whitespace from title", () => {
      const parsed = addDocumentFileMetadataSchema.safeParse({
        title: "   Bank Signature Form   ",
        category: "Finance",
      });
      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.title, "Bank Signature Form");
      }
    });
  });

  describe("constants and helpers", () => {
    it("defines 15 MB max file size", () => {
      assert.equal(MAX_DOCUMENT_FILE_SIZE, 15 * 1024 * 1024);
    });

    it("checks isDocumentCategory accurately", () => {
      assert.equal(isDocumentCategory("Legal"), true);
      assert.equal(isDocumentCategory("Templates"), true);
      assert.equal(isDocumentCategory("Unknown"), false);
    });
  });
});
