import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { KeepAliveRun } from "./keep-alive";

const DATA_DIR = path.join(process.cwd(), ".data");
const LAST_RUN_PATH = path.join(DATA_DIR, "last-run.json");

export async function saveLastRun(run: KeepAliveRun): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(LAST_RUN_PATH, JSON.stringify(run, null, 2), "utf8");
}

export async function readLastRun(): Promise<KeepAliveRun | null> {
  try {
    const raw = await readFile(LAST_RUN_PATH, "utf8");
    return JSON.parse(raw) as KeepAliveRun;
  } catch {
    return null;
  }
}
