import { NextRequest, NextResponse } from "next/server";
import { getPublicProjectConfigs } from "@/lib/projects";
import { readLastRun } from "@/lib/status-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (cronSecret) {
    const querySecret = request.nextUrl.searchParams.get("secret");
    const headerSecret = request.headers.get("x-cron-secret");
    const authHeader = request.headers.get("authorization");
    const bearerSecret = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if ((querySecret || headerSecret || bearerSecret) !== cronSecret) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized.",
        },
        { status: 401 },
      );
    }
  }

  return NextResponse.json({
    projects: getPublicProjectConfigs(),
    lastRun: await readLastRun(),
  });
}
