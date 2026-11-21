import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

/**
 * Shared setup for the SQL tests that check row level security and who may
 * call which function. Unlike invites.test.ts, which runs as a superuser, these
 * tests switch to the same roles Supabase uses (anon, authenticated,
 * service_role), because a superuser skips row level security and would make
 * every isolation test pass for the wrong reason.
 *
 * Not a test file (no ".test.ts" suffix), so the test runner does not pick it up.
 */

const MIGRATIONS_DIR = join(import.meta.dirname, "../../supabase/migrations");

// What Supabase provides that the migrations lean on. The default privileges
// come BEFORE the migrations, as on a real project: new tables and functions
// are open to the API roles, and each migration then revokes what it must.
const SUPABASE_STUBS = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role anon;
  create role authenticated;
  create role service_role;
  create schema extensions;

  grant usage on schema public, auth to anon, authenticated, service_role;
  alter default privileges in schema public
    grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public
    grant execute on functions to anon, authenticated, service_role;
`;

export type ApiRole = "anon" | "authenticated" | "service_role";

let db: PGlite;
let seq = 0;

/** Starts a fresh in-process Postgres with every migration applied. */
export async function startDb(): Promise<PGlite> {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SUPABASE_STUBS);
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
  return db;
}

export function getDb(): PGlite {
  return db;
}

const hex = (n: number) => n.toString(16).padStart(12, "0");
export const newUuid = () => `00000000-0000-4000-8000-${hex(++seq)}`;
export const nextSeq = () => ++seq;

/** Sets what auth.uid() returns for following calls. */
async function setUser(userId: string | null) {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? ""]);
}

/**
 * Runs `fn` as an API role, the way a request from the browser or the server
 * would reach the database, then returns to the superuser. Row level security
 * and grants apply inside `fn`.
 */
export async function as<T>(role: ApiRole, userId: string | null, fn: () => Promise<T>): Promise<T> {
  await setUser(userId);
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}

/** Setup helpers run as the superuser: they are test fixtures, not requests. */
export async function addOfficer(email: string, fullName = "Test Officer") {
  const id = newUuid();
  await db.query(`insert into auth.users (id) values ($1)`, [id]);
  await db.query(
    `insert into public.officers (id, google_sub, email, full_name, consent_version, consent_at)
     values ($1, $2, $3, $4, 'v1', now())`,
    [id, `sub-${id}`, email, fullName]
  );
  return id;
}

/** Creates an org through create_organization, so the creator becomes admin. */
export async function addOrg(adminId: string, name = `Org ${++seq}`) {
  await setUser(adminId);
  const res = await db.query<{ create_organization: string }>(
    `select public.create_organization($1, null)`,
    [name]
  );
  return res.rows[0].create_organization;
}

/** Adds an officer to an org with a given role. */
export async function addMember(orgId: string, email: string, role: string) {
  const id = await addOfficer(email);
  await db.query(`insert into public.org_officers (org_id, officer_id, role) values ($1, $2, $3)`, [
    orgId,
    id,
    role,
  ]);
  return id;
}

/** Runs a statement and returns the error message, or null if it succeeded. */
export async function errorOf(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}
