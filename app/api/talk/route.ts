import { NextResponse } from "next/server";
import { addTalk, listOpenTalk } from "@/lib/db";

export const dynamic = "force-dynamic";

function bad(msg: string, status = 400) {
  return new NextResponse(msg, { status });
}

export async function GET() {
  return NextResponse.json({ talk: listOpenTalk() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as any;
  if (!body) return bad("Invalid JSON", 400);

  const created_by = body.created_by;
  if (created_by !== "mann" && created_by !== "frau") return bad("Invalid created_by", 400);

  const text = String(body.text ?? "").trim();
  if (!text) return bad("Missing text", 400);

  addTalk(created_by, text);
  return NextResponse.json({ ok: true });
}
