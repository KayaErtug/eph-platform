import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token = req.headers.get("authorization") || "";

  try {
    // Proje verisi hazırla
    const projeData = {
      name: body.proje?.name || body.ilan?.title || "Yeni Proje",
      city: body.proje?.city || "",
      district: body.proje?.district || "",
      address: body.proje?.address || body.proje?.neighborhood || "",
      description: body.ilan?.description || "",
    };

    const projRes = await fetch("http://localhost:3001/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token || "" },
      body: JSON.stringify(projeData),
    });

    const proj = await projRes.json();
    console.log("Proje cevabı:", JSON.stringify(proj));

    if (!proj.id) {
      return NextResponse.json({ error: "Proje oluşturulamadı", detail: proj }, { status: 400 });
    }

    // Birim verisi hazırla
    const birimData = {
      projectId: proj.id,
      type: body.ilan?.portfolioType || body.birim?.type || "DAIRE",
      status: body.ilan?.listingType === "KİRALIK" ? "KIRALIK" : "SATILIK",
      number: body.birim?.number || "1",
      price: Number(body.ilan?.price || body.birim?.price || 0),
      area: Number(body.birim?.grossArea || body.birim?.area || 0),
      floor: Number(body.birim?.floor || 0),
      roomCount: body.birim?.roomCount || null,
      description: body.ilan?.description || "",
    };

    const unitRes = await fetch("http://localhost:3001/units", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token || "" },
      body: JSON.stringify(birimData),
    });

    const unit = await unitRes.json();
    console.log("Birim cevabı:", JSON.stringify(unit));

    return NextResponse.json({ success: true, project: proj, unit });
  } catch (err: any) {
    console.error("save-listing hatası:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
