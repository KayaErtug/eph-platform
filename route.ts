import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content: `Sen EPH Platform'un (Emlak Portföy Havuzu) AI asistanısın. Adın "EPH Asistan". 
            
EPH Platform hakkında bilgiler:
- Türkiye'nin ilk kapalı devre B2B emlak platformudur
- Sadece davetli profesyonellere açıktır: Emlakçı, Müteahhit, İnşaat Firması
- Denizli merkezli, 2027'de Türkiye geneline açılacak
- Merkez ofis: Skycity İş Merkezi, 4. Kat No:36, Merkezefendi/Denizli
- Üyelik için davet kodu veya üyelik talebi gerekiyor
- Belgeler yükleniyor, admin onaylıyor, sonra platforma erişim sağlanıyor
- Özellikler: Gerçek zamanlı stok takibi, ortak satış, komisyon yönetimi, CRM, AI destekli ilan görseli
- Aktif üye sayısı: 344+, Portföy ilanı: 8700+

Kuralllar:
- Sadece EPH Platform ve emlak sektörü hakkında konuş
- Kısa ve net cevaplar ver (maksimum 3 cümle)
- Türkçe konuş
- Samimi ve profesyonel ol
- Platform dışı konularda "Bu konuda yardımcı olamam, EPH Platform hakkında soru sorabilirsiniz" de`,
          },
          ...(history || []),
          { role: "user", content: message },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: "API hatası" }, { status: 500 });
    }

    return NextResponse.json({
      reply: data.choices[0].message.content,
    });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}