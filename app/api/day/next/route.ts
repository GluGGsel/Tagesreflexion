import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Deprecated: "Nächster Tag" wird nicht mehr manuell getriggert.
 * Der Tag wechselt automatisch anhand der Serverzeit (siehe /api/state + lib/db todayISO()).
 *
 * Diese Route bleibt als No-Op erhalten, damit Builds/Deployments nicht wegen alter Imports brechen
 * und alte Clients nicht 404en.
 */
export async function POST() {
  return NextResponse.json({
    ok: true,
    deprecated: true,
    message: "Tagwechsel erfolgt automatisch anhand der Serverzeit."
  });
}
