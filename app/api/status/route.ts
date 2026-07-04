import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/auth";
import { getPublicProjectConfigs } from "@/lib/projects";
import { readLastRun } from "@/lib/status-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (cronSecret) {
    const auth = authorizeCronRequest(request);

    if (!auth.ok) {
      return auth.response;
    }
  }

  return NextResponse.json({
    projects: getPublicProjectConfigs(),
    lastRun: await readLastRun(),
  });
}
