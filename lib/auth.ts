import { NextRequest, NextResponse } from "next/server";

export function authorizeCronRequest(
  request: NextRequest,
  submittedSecret?: string | null,
):
  | { ok: true }
  | {
      ok: false;
      response: NextResponse;
    } {
  const cronSecret = normalizeSecret(process.env.CRON_SECRET);

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

  const providedSecret = getProvidedSecret(request, submittedSecret);

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

function getProvidedSecret(
  request: NextRequest,
  submittedSecret?: string | null,
): string {
  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  const headerSecret = request.headers.get("x-cron-secret");
  const querySecret = request.nextUrl.searchParams.get("secret");

  return (
    normalizeSecret(submittedSecret) ||
    normalizeSecret(bearerSecret) ||
    normalizeSecret(headerSecret) ||
    normalizeSecret(querySecret) ||
    ""
  );
}

function normalizeSecret(value: string | null | undefined): string {
  return value?.trim() ?? "";
}
