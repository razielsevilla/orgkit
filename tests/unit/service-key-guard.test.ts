import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * T4: the service role key bypasses row level security, so it must only ever
 * live in server-side configuration. These checks read the project's files and
 * fail the build if that stops being true. They cannot see the hosting
 * dashboard: docs/backup-and-access.md has the checks for that.
 */

const ROOT = join(import.meta.dirname, "../..");

const SKIP = new Set(["node_modules", ".next", ".git", "coverage"]);
const CODE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const TEXT = /\.(ts|tsx|js|jsx|mjs|cjs|md|json|yml|yaml|sql|example|env)$/;

function walk(dir: string, accept: RegExp, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, accept, out);
    else if (accept.test(name)) out.push(path);
  }
  return out;
}

const rel = (path: string) => relative(ROOT, path).replaceAll("\\", "/");
const read = (path: string) => readFileSync(path, "utf8");

/** Files a person could publish or ship: code, docs, scripts, CI and the env example */
function projectTextFiles(): string[] {
  const files = ["src", "scripts", "docs", "tests", ".github"].flatMap((dir) =>
    walk(join(ROOT, dir), TEXT)
  );
  for (const name of ["README.md", ".env.example", "next.config.ts"]) {
    const path = join(ROOT, name);
    if (existsSync(path)) files.push(path);
  }
  return files;
}

/** A client component starts with a "use client" directive, before any import */
export function isClientComponent(source: string): boolean {
  const head = source
    .replace(/^﻿/, "")
    .replace(/^(\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*/, "");
  return /^(["'])use client\1/.test(head);
}

/** Environment variable names that would be sent to the browser but sound secret */
export const PUBLIC_SECRET_NAME = /NEXT_PUBLIC_[A-Z0-9_]*(SERVICE|SECRET|PASSWORD|PRIVATE)[A-Z0-9_]*/g;

/** A JWT (how Supabase keys look) or a new-style secret key */
export const KEY_SHAPED = /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]{10,}/g;

describe("service role key stays on the server", () => {
  it("is only reachable through a server-only module", () => {
    const source = read(join(ROOT, "src/lib/supabase/service-role.ts"));
    const firstLine = source.split("\n").find((line) => line.trim() !== "");
    assert.equal(
      firstLine?.trim(),
      'import "server-only";',
      "service-role.ts must start with import \"server-only\", so a client import fails the build"
    );
  });

  it("is never imported or named by a client component", () => {
    const offenders: string[] = [];
    for (const file of walk(join(ROOT, "src"), CODE)) {
      const source = read(file);
      if (!isClientComponent(source)) continue;
      if (/supabase\/service-role|getServiceRoleKey|SERVICE_ROLE|createAdminClient/.test(source)) {
        offenders.push(rel(file));
      }
    }
    assert.deepEqual(offenders, [], `client components must not use the service role key: ${offenders.join(", ")}`);
  });

  it("is read from the environment only by the env module and the rate-limit fallback", () => {
    const readers = walk(join(ROOT, "src"), CODE)
      .filter((file) => /process\.env\.SUPABASE_SERVICE_ROLE_KEY/.test(read(file)))
      .map(rel)
      .sort();
    // env.ts is the reader; config.ts only uses it as the fallback for the rate-limit secret
    assert.deepEqual(readers, ["src/lib/config.ts", "src/lib/supabase/env.ts"]);
  });

  it("is never given a name that sends it to the browser", () => {
    const offenders: string[] = [];
    for (const file of projectTextFiles()) {
      // This file holds the pattern itself
      if (rel(file) === "tests/unit/service-key-guard.test.ts") continue;
      const matches = read(file).match(PUBLIC_SECRET_NAME);
      if (matches) offenders.push(`${rel(file)}: ${[...new Set(matches)].join(", ")}`);
    }
    assert.deepEqual(offenders, [], "a NEXT_PUBLIC_ variable is sent to the browser: never put a secret in one");
  });

  it("does not appear as a key-shaped value anywhere in the project", () => {
    const offenders: string[] = [];
    for (const file of projectTextFiles()) {
      if (rel(file) === "tests/unit/service-key-guard.test.ts") continue;
      if (new RegExp(KEY_SHAPED.source).test(read(file))) offenders.push(rel(file));
    }
    assert.deepEqual(offenders, [], `a key-looking value is committed in: ${offenders.join(", ")}`);
  });

  it("is not set in the CI workflow, which only needs placeholder values", () => {
    for (const file of walk(join(ROOT, ".github"), /\.ya?ml$/)) {
      assert.ok(!/SERVICE_ROLE/.test(read(file)), `${rel(file)} must not mention the service role key`);
    }
  });

  it("keeps env files out of git, apart from the empty example", () => {
    const ignore = read(join(ROOT, ".gitignore"));
    assert.match(ignore, /^\.env\*$/m, ".gitignore must ignore .env*");
    assert.match(ignore, /^!\.env\.example$/m);

    const example = read(join(ROOT, ".env.example"));
    assert.match(example, /^SUPABASE_SERVICE_ROLE_KEY=$/m, ".env.example must leave the key empty");
  });
});

describe("the checks themselves catch what they should", () => {
  // Built at runtime so this file does not contain a key-shaped string itself
  const fakeJwt = ["eyJ", "a".repeat(30), ".", "b".repeat(30)].join("");

  it("recognises a client component, even after a comment", () => {
    assert.equal(isClientComponent('"use client";\nimport x from "y";'), true);
    assert.equal(isClientComponent("'use client'\nexport const a = 1;"), true);
    assert.equal(isClientComponent('// note\n"use client";\n'), true);
    assert.equal(isClientComponent('import x from "y";\n"use client";'), false);
    assert.equal(isClientComponent("export const a = 1;"), false);
  });

  it("flags a public variable that sounds secret, and not the real public ones", () => {
    const bad = ["NEXT_PUBLIC_", "SERVICE_ROLE_KEY"].join("");
    assert.ok(`x=${bad}`.match(PUBLIC_SECRET_NAME));
    assert.equal("NEXT_PUBLIC_SUPABASE_ANON_KEY".match(PUBLIC_SECRET_NAME), null);
    assert.equal("NEXT_PUBLIC_SITE_URL".match(PUBLIC_SECRET_NAME), null);
  });

  it("flags a JWT or secret key, and not ordinary text", () => {
    assert.ok(new RegExp(KEY_SHAPED.source).test(`key = "${fakeJwt}"`));
    assert.ok(new RegExp(KEY_SHAPED.source).test("sb_secret_" + "x".repeat(20)));
    assert.equal(new RegExp(KEY_SHAPED.source).test("placeholder"), false);
  });
});
