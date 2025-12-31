import { NextResponse } from "next/server";
import { upsertEntryForToday } from "@/lib/db";

export const dynamic = "force-dynamic";

function bad(msg: string, status = 400) {
  return new NextResponse(msg, { status });
}

export async function PUT(req: Request, ctx: { params: { role: string } }) {
  const role = ctx.params.role;
  if (role !== "mann" && role !== "frau") return bad("Invalid role", 400);

  const body = await req.json().catch(() => null) as any;
  if (!body) return bad("Invalid JSON", 400);

  // Backend vertraut auf UI-Validator, aber wir sind nicht komplett naiv:
  const general_1 = String(body.general_1 ?? "").trim();
  const general_2 = String(body.general_2 ?? "").trim();
  const partner_specific = String(body.partner_specific ?? "").trim();
  const children_gratitude = String(body.children_gratitude ?? "").trim();

  if (!general_1 || !general_2 || !partner_specific || !children_gratitude) {
    return bad("#1–#4 dankbar müssen ausgefüllt werden.", 400);
  }

  upsertEntryForToday(role, { general_1, general_2, partner_specific, children_gratitude });
  return NextResponse.json({ ok: true });
}
