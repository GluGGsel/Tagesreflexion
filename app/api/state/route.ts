import { NextResponse } from "next/server";
import { getEntriesByDate, getTodayEntries, isISODate, listOpenTalk, todayISO } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");

  const today = todayISO();

  // If no date is provided -> today
  const requestedDate = dateParam && isISODate(dateParam) ? dateParam : today;

  // Entries for requested date (today or past)
  const base =
    requestedDate === today
      ? getTodayEntries()
      : getEntriesByDate(requestedDate);

  // Talk list is global "open items" and should be visible on TODAY only
  const talk = requestedDate === today ? listOpenTalk() : [];

  const can_next_day = false; // legacy field; kept for compatibility

  return NextResponse.json({
    day: base.day,
    today_date: today,
    entries: base.entries,
    talk,
    can_next_day,
  });
}
