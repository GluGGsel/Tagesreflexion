import { NextResponse } from "next/server";
import { updateEntry } from "../../../../lib/db";
import type { Role } from "../../../../lib/types";

export const dynamic = "force-dynamic";

function isRole(x: unknown): x is Role {
  return x === "mann" || x === "frau";
}

export async function PUT(req: Request, ctx: { params: { role: string } }) {
  const role = ctx.params.role;

  if (!isRole(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  updateEntry(role, body);
  return new NextResponse(null, { status: 204 });
}
