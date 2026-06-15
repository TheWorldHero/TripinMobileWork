# CLAUDE.md

## Must Read

- Start at `.claude/INDEX.md` and open only the `.claude/*.md` files relevant to the task.
- This file holds only hard rules + done-criteria; architecture/commands/notes live under `.claude/`.

## Hard Rules

- **Secrets never enter tracked files.** SSH password lives only in the `SSH_PASS` user env var; the AMAP keys live only in server env + gitignored `apps/web/.env.local`. `ConfigController` may return only the client-safe AMAP JS key/security code — never web-service keys, DB creds, or other env.
- **Deploys touch production (Aliyun ECS, real data).** Confirm with the user before deploying, applying schema to the live DB, or editing the server compose. Do not commit/push unless asked.
- **Schema changes are additive + idempotent** (`CREATE TABLE IF NOT EXISTS`, FK guarded by `DO`/`pg_constraint` checks, `CREATE INDEX IF NOT EXISTS`). The live DB holds real data — never drop/alter existing columns without explicit approval.
- **Backend is JDBC, not JPA**; auth is an `x-user-id` header (no Spring Security/JWT). Match the existing `DbSupport` named-param + quoted-camelCase-column style.
- From git-bash, prefix SSH/SFTP file transfers with `MSYS_NO_PATHCONV=1` (see `.claude/NOTES.md`).

## Done Means

- Backend: `mvn -f services/api-java/pom.xml -DskipTests compile` (or `package`) is clean.
- Web: `cd apps/web && npx tsc --noEmit` exits 0.
- If deployed: API `/api/v1/health` returns `ok:true`, and the changed endpoints/flows are verified live (curl and/or preview). Report failures with output; don't claim done unverified.
