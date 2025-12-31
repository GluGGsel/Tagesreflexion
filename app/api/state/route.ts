import { NextResponse } from "next/server";
import { getTodayEntries, listOpenTalk } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const { day, entries } = getTodayEntries();
  const talk = listOpenTalk();

  // "can_next_day" bleibt im Typ evtl. drin – aber UI nutzt es nicht mehr.
  // Wir liefern es als true, damit nichts an anderer Stelle knallt.
  return NextResponse.json({
    day,
    entries,
    talk,
    can_next_day: true
  });
}
