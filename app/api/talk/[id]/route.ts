import { NextResponse } from "next/server";
import { markTalkDone } from "@/lib/db";

export const dynamic = "force-dynamic";

function bad(msg: string, status = 400) {
  return new NextResponse(msg, { status });
}

export async function PATCH(_req: Request, ctx: { params: { id: string } }) {
  const id = Number(ctx.params.id);
  if (!Number.isFinite(id) || id <= 0) return bad("Invalid id", 400);

  markTalkDone(id);
  return NextResponse.json({ ok: true });
}
