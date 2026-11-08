import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "MOBILE_ONLY" }, { status: 410 });
}
