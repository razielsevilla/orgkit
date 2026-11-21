import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  LOCAL_SITE_URL,
  getConfiguredSiteUrl,
  getSiteUrl,
  requireSiteUrl,
} from "../../src/lib/site-url.ts";

describe("site address resolver", () => {
  const env = process.env as Record<string, string | undefined>;
  const saved = { NODE_ENV: env.NODE_ENV, NEXT_PUBLIC_SITE_URL: env.NEXT_PUBLIC_SITE_URL };

  beforeEach(() => {
    delete env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  });

  describe("in production", () => {
    beforeEach(() => {
      env.NODE_ENV = "production";
    });

    it("uses the configured address and drops trailing slashes and spaces", () => {
      env.NEXT_PUBLIC_SITE_URL = "  https://orgkit.example//  ";
      assert.equal(getSiteUrl(), "https://orgkit.example");
      assert.equal(requireSiteUrl(), "https://orgkit.example");
      assert.equal(getConfiguredSiteUrl(), "https://orgkit.example");
    });

    it("has no address when none is configured, and never falls back to localhost", () => {
      assert.equal(getConfiguredSiteUrl(), null);
      assert.equal(getSiteUrl(), null);
    });

    it("treats a blank value as not configured", () => {
      env.NEXT_PUBLIC_SITE_URL = "   ";
      assert.equal(getSiteUrl(), null);
    });

    it("fails clearly, when called, if no address is configured", () => {
      assert.throws(() => requireSiteUrl(), /NEXT_PUBLIC_SITE_URL is not set/);
    });
  });

  describe("outside production", () => {
    beforeEach(() => {
      env.NODE_ENV = "development";
    });

    it("falls back to localhost when nothing is configured", () => {
      assert.equal(getSiteUrl(), LOCAL_SITE_URL);
      assert.equal(requireSiteUrl(), LOCAL_SITE_URL);
      // ...but "configured" still means only what was set
      assert.equal(getConfiguredSiteUrl(), null);
    });

    it("prefers the configured address over localhost", () => {
      env.NEXT_PUBLIC_SITE_URL = "https://staging.orgkit.example/";
      assert.equal(getSiteUrl(), "https://staging.orgkit.example");
    });
  });
});
