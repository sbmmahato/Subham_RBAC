import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

process.env.DATABASE_URL = "file:./test.db";
process.env.JWT_SECRET = "test-jwt-secret-at-least-16";
process.env.NODE_ENV = "test";

const dbFile = path.join(root, "test.db");
for (const f of [dbFile, `${dbFile}-journal`, `${dbFile}-wal`, `${dbFile}-shm`]) {
  try {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  } catch {
    /* ignore */
  }
}

const env = { ...process.env };

execSync("npx prisma db push", {
  cwd: root,
  stdio: "pipe",
  env,
});

execSync("npx prisma db seed", {
  cwd: root,
  stdio: "pipe",
  env,
});
