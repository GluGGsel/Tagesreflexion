import { getState } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = getState();
  return Response.json(state);
}
