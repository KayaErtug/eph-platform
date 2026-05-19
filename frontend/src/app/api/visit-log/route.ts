import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token = req.headers.get("authorization");
  
  const res = await fetch(`http://localhost:3001/visits/log`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token || "" },
    body: JSON.stringify(body),
  });
  
  const data = await res.json();
  return NextResponse.json(data);
}
