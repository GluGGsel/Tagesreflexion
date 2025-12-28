import { updateEntry } from "@/lib/db";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

function isRole(x: any): x is Role {
  return x === "mann" || x === "frau";
}

export async function PUT(_: Request, { params }: { params: { role: string } }) {
  if (!isRole(params.role)) return new Response("Invalid role", { status: 400 });

  const body = await _.json().catch(() => null);
  if (!body) return new Response("Invalid JSON", { status: 400 });

  updateEntry(params.role, body);
  return new Response(null, { status: 204 });
}
