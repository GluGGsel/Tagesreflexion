import { nextDay } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    nextDay();
    return new Response(null, { status: 204 });
  } catch (e: any) {
    return new Response(String(e?.message ?? "Nächster Tag nicht möglich."), { status: 400 });
  }
}
