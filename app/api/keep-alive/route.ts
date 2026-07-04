import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/auth";
import { runKeepAlive } from "@/lib/keep-alive";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = authorizeCronRequest(request);

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

  const auth = authorizeCronRequest(request, submittedSecret);

  if (!auth.ok) {
    return auth.response;
  }

  const run = await runKeepAlive();

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return NextResponse.redirect(new URL("/?checked=1", request.url), 303);
  }

  return NextResponse.json(run);
}
