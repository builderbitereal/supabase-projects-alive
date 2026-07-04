import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { getPublicProjectConfigs } from "@/lib/projects";
import { readLastRun } from "@/lib/status-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = getPublicProjectConfigs();
  const lastRun = await readLastRun();
  const successful = lastRun?.ok ?? 0;
  const failed = lastRun?.failed ?? 0;
  const total = projects.length;
  const lastRunTime = lastRun ? formatDate(lastRun.checkedAt) : "Not checked yet";

  const projectSlots = Array.from({ length: total }, (_, index) => index + 1);

  return (
    <main className="shell">
      <section className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <Activity size={24} strokeWidth={2.4} />
          </div>
          <div>
            <p className="eyebrow">BuilderBite uptime utility</p>
            <h1>Alive Supabase</h1>
            <p className="subtitle">
              Daily Supabase health pings for your configured projects, with a
              compact operator view for the latest run.
            </p>
          </div>
        </div>

        <form className="secret-form" action="/api/keep-alive" method="post">
          <input
            className="secret-input"
            name="secret"
            type="password"
            placeholder="Cron secret"
            aria-label="Cron secret"
            autoComplete="off"
          />
          <button className="button" type="submit" title="Run keep-alive now">
            <RefreshCw size={18} />
            Run Now
          </button>
        </form>
      </section>

      <section className="overview" aria-label="Supabase keep-alive summary">
        <Metric
          icon={<Server size={18} />}
          label="Projects"
          value={String(total)}
          note="Loaded from server env"
        />
        <Metric
          icon={<CheckCircle2 size={18} />}
          label="Healthy"
          value={String(successful)}
          note="Successful in last run"
        />
        <Metric
          icon={<AlertTriangle size={18} />}
          label="Needs Attention"
          value={String(failed)}
          note="Failed in last run"
        />
        <Metric
          icon={<Clock3 size={18} />}
          label="Last Run"
          value={lastRun ? `${lastRun.durationMs}ms` : "-"}
          note={lastRunTime}
        />
      </section>

      {total === 0 ? (
        <div className="empty-box">
          No Supabase projects are configured in the environment yet.
        </div>
      ) : null}

      <div className="section-heading">
        <h2>Projects</h2>
        <span className="timestamp">{lastRunTime}</span>
      </div>

      <section className="project-grid" aria-label="Configured projects">
        {projectSlots.map((slot) => {
          return (
            <article className="project-card protected-card" key={slot}>
              <div className="protected-blur" aria-hidden="true">
                <div className="protected-head">
                  <span className="blur-line wide" />
                  <span className="blur-pill" />
                </div>
                <div className="protected-grid">
                  <span className="blur-box" />
                  <span className="blur-box" />
                </div>
                <span className="blur-line" />
              </div>

              <div className="protected-content">
                <div className="protected-icon" aria-hidden="true">
                  <Shield size={22} />
                </div>
                <h3>Protected project</h3>
                <p>Details hidden for security</p>
                <span className="badge secure">
                  {lastRun ? "Checked" : "Pending"}
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <div className="endpoint">
        <ShieldCheck size={20} />
        <code>https://alive.your-domain.com/api/keep-alive?secret=$CRON_SECRET</code>
      </div>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="metric">
      <p className="metric-label">
        {icon}
        {label}
      </p>
      <p className="metric-value">{value}</p>
      <p className="metric-note">{note}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}
