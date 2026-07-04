import { getSupabaseProjects, type SupabaseProjectConfig } from "./projects";
import { saveLastRun } from "./status-store";

export type KeepAliveResult = {
  id: string;
  name: string;
  projectRef: string;
  maskedRef: string;
  ok: boolean;
  status: number | null;
  statusText: string;
  latencyMs: number;
  checkedAt: string;
  error?: string;
};

export type KeepAliveRun = {
  checkedAt: string;
  total: number;
  ok: number;
  failed: number;
  durationMs: number;
  results: KeepAliveResult[];
};

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_CONCURRENCY = 5;
const DEFAULT_PING_PATH = "/auth/v1/health";

export async function runKeepAlive(): Promise<KeepAliveRun> {
  const started = Date.now();
  const projects = getSupabaseProjects();
  const results = await mapWithConcurrency(
    projects,
    getConcurrency(),
    pingProject,
  );
  const checkedAt = new Date().toISOString();
  const ok = results.filter((result) => result.ok).length;

  const run: KeepAliveRun = {
    checkedAt,
    total: results.length,
    ok,
    failed: results.length - ok,
    durationMs: Date.now() - started,
    results,
  };

  await saveLastRun(run);

  return run;
}

async function pingProject(
  project: SupabaseProjectConfig,
): Promise<KeepAliveResult> {
  const endpoint = new URL(getPingPath(), project.projectUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());
  const started = Date.now();
  const checkedAt = new Date().toISOString();

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        accept: "application/json",
        apikey: project.anonKey,
        authorization: `Bearer ${project.anonKey}`,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    return {
      id: project.id,
      name: project.name,
      projectRef: project.projectRef,
      maskedRef: project.maskedRef,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText || (response.ok ? "OK" : "Failed"),
      latencyMs: Date.now() - started,
      checkedAt,
      error: response.ok
        ? undefined
        : `Supabase keep-alive endpoint returned HTTP ${response.status}.`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to reach Supabase.";

    return {
      id: project.id,
      name: project.name,
      projectRef: project.projectRef,
      maskedRef: project.maskedRef,
      ok: false,
      status: null,
      statusText: "Network error",
      latencyMs: Date.now() - started,
      checkedAt,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function getPingPath(): string {
  const path = process.env.SUPABASE_PING_PATH?.trim() || DEFAULT_PING_PATH;

  return path.startsWith("/") ? path : `/${path}`;
}

function getTimeoutMs(): number {
  const value = Number.parseInt(
    process.env.PING_TIMEOUT_MS ?? String(DEFAULT_TIMEOUT_MS),
    10,
  );

  return Number.isFinite(value) ? Math.max(value, 1000) : DEFAULT_TIMEOUT_MS;
}

function getConcurrency(): number {
  const value = Number.parseInt(
    process.env.PING_CONCURRENCY ?? String(DEFAULT_CONCURRENCY),
    10,
  );

  return Number.isFinite(value)
    ? Math.min(Math.max(value, 1), 25)
    : DEFAULT_CONCURRENCY;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}
