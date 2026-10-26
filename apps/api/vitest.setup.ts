import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// M8 (TEST-M8-2): give every test file its own throwaway SQLite DB so the unit suite is isolated
// and never touches the real data/doc-assistant.db. db.ts reads DATABASE_PATH at import time, and
// vitest runs setup files before each test file's module graph loads — so this takes effect first.
process.env.DATABASE_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "m8-api-")), "test.db");
