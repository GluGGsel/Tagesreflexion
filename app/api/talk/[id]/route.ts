import { markTalkDone } from "@/lib/db";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

function isRole(x: any): x is Role {
  return x === "mann" || x === "frau";
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return new Response("Invalid id", { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return new Response("Invalid JSON", { status: 400 });

  if (body.is_done !== true) return new Response("Only is_done=true supported", { status: 400 });
  if (!isRole(body.done_by)) return new Response("Invalid done_by", { status: 400 });

  markTalkDone(id, body.done_by);
  return new Response(null, { status: 204 });
}
