import { NextRequest, NextResponse } from "next/server";
import { runKeepAlive } from "@/lib/keep-alive";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = authorizeRequest(request);

  if (!auth.ok) {
    return auth.response;
  }

  const run = await runKeepAlive();
  return NextResponse.json(run);
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  let submittedSecret: string | null = null;

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    submittedSecret = String(formData.get("secret") ?? "");
  } else if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    submittedSecret = String(formData.get("secret") ?? "");
  }

  const auth = authorizeRequest(request, submittedSecret);

  if (!auth.ok) {
    return auth.response;
  }

  const run = await runKeepAlive();

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return NextResponse.redirect(new URL("/?checked=1", request.url), 303);
  }

  return NextResponse.json(run);
}

function authorizeRequest(
  request: NextRequest,
  submittedSecret?: string | null,
):
  | { ok: true }
  | {
      ok: false;
      response: NextResponse;
    } {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "CRON_SECRET is not configured.",
        },
        { status: 503 },
      ),
    };
  }

  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  const headerSecret = request.headers.get("x-cron-secret");
  const querySecret = request.nextUrl.searchParams.get("secret");
  const providedSecret =
    submittedSecret || bearerSecret || headerSecret || querySecret || "";

  if (providedSecret !== cronSecret) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "Unauthorized.",
        },
        { status: 401 },
      ),
    };
  }

  return { ok: true };
}
