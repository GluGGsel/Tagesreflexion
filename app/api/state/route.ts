import { NextResponse } from "next/server";
import { getEntriesByDate, getTodayEntries, isISODate, listOpenTalk, todayISO } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qDate = url.searchParams.get("date");

  const today = todayISO();

  let day;
  let entries;

  if (qDate && isISODate(qDate)) {
    const res = getEntriesByDate(qDate);
    day = res.day;
    entries = res.entries;
  } else {
    const res = getTodayEntries();
    day = res.day;
    entries = res.entries;
  }

  const talk = listOpenTalk();

  return NextResponse.json({
    day,
    today_date: today,
    entries,
    talk,
    can_next_day: true
  });
}
