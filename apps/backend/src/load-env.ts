import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Resolve root env path based on nesting in dist or src
const pathsToTry = [
  path.resolve(__dirname, "../../../.env"),
  path.resolve(__dirname, "../../../../../.env"), // in case nested in dist/apps/backend/src
  path.join(process.cwd(), ".env"),
  path.join(process.cwd(), "../../.env"),
];

for (const p of pathsToTry) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    console.log(`[NEXUS Env] Successfully loaded env from: ${p}`);
    break;
  }
}

// Guarantee relative SQLite paths resolve to absolute path relative to process.cwd()
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("file:.")) {
  const relPath = process.env.DATABASE_URL.replace(/^file:/, "");
  const absPath = path.resolve(process.cwd(), relPath).replace(/\\/g, "/");
  process.env.DATABASE_URL = `file:${absPath}`;
}

