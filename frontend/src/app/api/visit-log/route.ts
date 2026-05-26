import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://emlakportfoyhavuzu.com/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = req.headers.get("authorization");

    if (!token) {
      return NextResponse.json({ ok: false, skipped: true }, { status: 200 });
    }

    const res = await fetch(`${API_URL}/visits/log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, skipped: true }, { status: 200 });
    }

    const data = await res.json().catch(() => ({ ok: true }));

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, skipped: true }, { status: 200 });
  }
}