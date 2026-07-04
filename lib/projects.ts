export type SupabaseProjectConfig = {
  id: string;
  name: string;
  projectRef: string;
  maskedRef: string;
  projectUrl: string;
  anonKey: string;
};

type RawProjectConfig = {
  name?: string;
  projectRef?: string;
  ref?: string;
  projectId?: string;
  projectUrl?: string;
  url?: string;
  anonKey?: string;
  anon_key?: string;
};

const DEFAULT_MAX_INDEXED_PROJECTS = 50;

export function getSupabaseProjects(): SupabaseProjectConfig[] {
  const jsonProjects = parseJsonProjects(process.env.SUPABASE_PROJECTS_JSON);

  if (jsonProjects.length > 0) {
    return jsonProjects.map(toProjectConfig).filter(isProjectConfig);
  }

  return parseIndexedProjects().map(toProjectConfig).filter(isProjectConfig);
}

function parseJsonProjects(value: string | undefined): RawProjectConfig[] {
  if (!value?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseIndexedProjects(): RawProjectConfig[] {
  const maxProjects = Number.parseInt(
    process.env.MAX_INDEXED_PROJECTS ?? String(DEFAULT_MAX_INDEXED_PROJECTS),
    10,
  );
  const safeMax = Number.isFinite(maxProjects)
    ? Math.min(Math.max(maxProjects, 1), 200)
    : DEFAULT_MAX_INDEXED_PROJECTS;

  const projects: RawProjectConfig[] = [];

  for (let index = 1; index <= safeMax; index += 1) {
    const name = process.env[`SUPABASE_PROJECT_${index}_NAME`];
    const projectRef =
      process.env[`SUPABASE_PROJECT_${index}_REF`] ??
      process.env[`SUPABASE_PROJECT_${index}_PROJECT_ID`];
    const projectUrl = process.env[`SUPABASE_PROJECT_${index}_URL`];
    const anonKey = process.env[`SUPABASE_PROJECT_${index}_ANON_KEY`];

    if (name || projectRef || projectUrl || anonKey) {
      projects.push({
        name,
        projectRef,
        projectUrl,
        anonKey,
      });
    }
  }

  return projects;
}

function toProjectConfig(
  project: RawProjectConfig,
  index: number,
): SupabaseProjectConfig | null {
  const inputRef =
    project.projectUrl ??
    project.url ??
    project.projectRef ??
    project.ref ??
    project.projectId;
  const anonKey = project.anonKey ?? project.anon_key;

  if (!inputRef?.trim() || !anonKey?.trim()) {
    return null;
  }

  const normalized = normalizeProject(inputRef);

  return {
    id: `${normalized.projectRef}-${index}`,
    name: project.name?.trim() || `Supabase Project ${index + 1}`,
    projectRef: normalized.projectRef,
    maskedRef: maskRef(normalized.projectRef),
    projectUrl: normalized.projectUrl,
    anonKey: anonKey.trim(),
  };
}

function normalizeProject(input: string): {
  projectRef: string;
  projectUrl: string;
} {
  const value = input.trim();
  const urlValue = value.startsWith("http")
    ? value
    : value.includes(".supabase.co")
      ? `https://${value.replace(/^\/+/, "")}`
      : `https://${value}.supabase.co`;
  const url = new URL(urlValue);
  const hostnameParts = url.hostname.split(".");
  const projectRef = hostnameParts[0] || value;

  return {
    projectRef,
    projectUrl: url.origin,
  };
}

function maskRef(ref: string): string {
  if (ref.length <= 8) {
    return ref;
  }

  return `${ref.slice(0, 4)}...${ref.slice(-4)}`;
}

function isProjectConfig(
  project: SupabaseProjectConfig | null,
): project is SupabaseProjectConfig {
  return project !== null;
}

export function getPublicProjectConfigs() {
  return getSupabaseProjects().map(({ anonKey: _anonKey, ...project }) => project);
}
