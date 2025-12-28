import { addTalkItem } from "@/lib/db";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

function isRole(x: any): x is Role {
  return x === "mann" || x === "frau";
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return new Response("Invalid JSON", { status: 400 });

  const text = String(body.text ?? "");
  const created_by = body.created_by;

  if (!isRole(created_by)) return new Response("Invalid created_by", { status: 400 });

  addTalkItem(text, created_by);
  return new Response(null, { status: 204 });
}
