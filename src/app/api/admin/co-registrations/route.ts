import { NextResponse } from "next/server";
import { readAll } from "@/lib/coRegistry";

export async function GET() {
  // IMPORTANTE: luego le metemos auth/admin real
  const rows = readAll();
  return NextResponse.json({ ok: true, rows });
}

