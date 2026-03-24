import fs from "fs";
import path from "path";
import type { Goal, CheckIn } from "../types";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

interface DbData {
  goals: Goal[];
  checkins: CheckIn[];
}

function ensureDataDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readDb(): DbData {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) {
    return { goals: [], checkins: [] };
  }
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw) as DbData;
}

export function writeDb(data: DbData): void {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}
