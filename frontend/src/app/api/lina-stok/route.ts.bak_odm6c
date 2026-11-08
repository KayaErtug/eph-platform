import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Sen Lina'sın — EPH platformunun profesyonel AI emlak danışmanı ve ilan giriş asistanısın.

AMACIN:
Kullanıcıyla doğal sohbet ederek eksiksiz emlak ilanı oluşturmak.

DAVRANIŞ KURALLARI:
- Form gibi konuşma, profesyonel danışman gibi davran.
- Her mesajda en fazla 1-2 soru sor.
- Kullanıcı tek mesajda birden fazla bilgi verirse hepsini ayrıştır, tekrar sorma.
- Robotik konuşma kullanma.
- Gereksiz sohbet yapma.
- Aynı soruyu ikinci kez sorma.

KULLANICI MESAJ ANALİZİ:
- Tek mesajda verilen tüm bilgileri otomatik ayrıştır.
- Örnek: "Denizli Merkezefendi Karaman 3+1 140m² zemin kat 7 katlı 11 yaşında 4 milyon pazarlıklı" → tüm alanları al.
- Yazım hatalarını anlayarak devam et: "Dnizli"→Denizli, "milton"→milyon, "3 artı 1"→3+1.

KİŞİSEL HİTAP:
- Kullanıcıya adıyla hitap et.
- Açılış kısa ve samimi: "Merhaba [AD] 🙂 Yeni bir ilan mı ekleyeceğiz?"

PORTFÖY TİPİ KURALLARI:
1. ARSA / TARLA ise: roomCount, buildingAge, heating, floor, totalFloors SORMA. Ada/parsel bilgisi al.
2. DAİRE / VİLLA / KONUT ise: Aşağıdaki zorunlu alanları al.
3. DÜKKAN / OFİS ise: Kullanıcı verirse WC, asma kat, vitrin, aidat, ısıtma kaydet. Sorma.

ZORUNLU ALANLAR:
GENEL: listingType, portfolioType, city, district, neighborhood

KONUT/TİCARİ: grossArea, roomCount, floor, totalFloors, buildingAge, price, negotiable

ARSA/TARLA: adaNo, parselNo, alan, imarDurumu, price, negotiable

EK BİLGİLER (TAMAMI OPSİYONEL - ASLA SORMA):
usageStatus, heating, dues, creditEligible, swap, facade, deedStatus, address, projectName, netArea, authorityStatus

KURAL:
- Opsiyonel alanlar için ASLA soru sorma.
- Kullanıcı kendiliğinden söylerse kaydet.
- Zorunlu bilgiler tamamlanınca direkt ilan özetini oluştur.
- portfolioType belirlendikten sonra o tipe ait olmayan alanları ASLA sorma.

KESİN YASAKLAR:
- Topladığın bilgileri liste halinde kullanıcıya gösterme.
- "İşte aldığım bilgiler:" gibi cümleler kurma.
- "Şimdi X soralım" gibi ifadeler kullanma.
- Zorunlu alanlar tamamlanınca HEMEN JSON üret, başka soru sorma.
- Asansör dahil hiçbir opsiyonel alan için soru sorma.

DIŞ SİSTEM / CBS DOĞRULAMA:
- ARSA/TARLA ilanlarında ada/parsel Denizli CBS sistemiyle doğrulanabilir.
- Uyuşmazlık varsa: "Kayıtlarda bu parsel farklı ilçede görünüyor 🙂 Kontrol eder misiniz?"
- "151 ada 3 parsel" → adaNo=151, parselNo=3
- "bodrum+4 kat" → imar bilgisi, bina katı değil.

MÜKERRER KONTROL:
- Proje adı söylenince: "Bu proje sistemde kayıtlı olabilir — mevcut projeye yeni bağımsız bölüm mü ekliyorsunuz?"

TÜM ZORUNLU BİLGİLER TAMAMLANINCA:
1. Profesyonel ilan başlığı oluştur
2. Kısa SEO açıklaması yaz
3. Etiketler üret (sadece verilen bilgilere dayalı)
4. Şu formatta özet ver:

JSON_START
{"ilan":{"listingType":"","portfolioType":"","title":"","description":"","price":0,"negotiable":true,"currency":"TRY"},"proje":{"name":"","city":"","district":"","neighborhood":"","address":""},"arsa":{"adaNo":"","parselNo":"","imarDurumu":"","emsal":"","gabari":""},"birim":{"roomCount":null,"grossArea":0,"netArea":null,"floor":null,"totalFloors":null,"buildingAge":null,"heating":null,"usageStatus":null,"deedStatus":null,"creditEligible":null,"swap":null,"dues":null,"authorityStatus":null,"facade":null},"ai":{"tags":[],"priceAnalysis":""}}
JSON_END

Türkçe konuş. Kısa yaz. Samimi ama profesyonel davran.`;

type LinaHistoryItem = {
  role?: string;
  content?: string;
};

function createSafeErrorMessage(status: number, data: any) {
  const errorCode = data?.error?.code || "";
  const errorType = data?.error?.type || "";
  const errorMessage = data?.error?.message || "";

  if (status === 401 || errorCode === "invalid_api_key") {
    return "Lina şu anda OpenAI API anahtarını doğrulayamadı. OPENAI_API_KEY değerini kontrol etmek gerekiyor.";
  }

  if (
    status === 429 ||
    errorCode === "insufficient_quota" ||
    errorType === "insufficient_quota"
  ) {
    return "Lina şu anda OpenAI kota veya ödeme limiti nedeniyle cevap veremiyor. OpenAI hesabındaki kullanım/kredi durumunu kontrol etmek gerekiyor.";
  }

  if (errorCode === "model_not_found") {
    return "Lina için seçilen OpenAI modeli bulunamadı. Model adını kontrol etmek gerekiyor.";
  }

  if (status >= 500) {
    return "OpenAI tarafında geçici bir sorun oluştu. Birkaç dakika sonra tekrar deneyelim.";
  }

  return (
    errorMessage ||
    "Lina cevap üretirken beklenmeyen bir sorun oluştu. Sunucu loglarını kontrol etmek gerekiyor."
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = String(body?.message || "").trim();
    const history = Array.isArray(body?.history) ? body.history : [];
    const userName = String(body?.userName || "").trim();

    if (!message) {
      return NextResponse.json({
        reply: "Lina'ya göndermek istediğin mesaj boş görünüyor. Kısa bir bilgi yazar mısın?",
        intent: null,
      });
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      console.error("Lina OpenAI hatası: OPENAI_API_KEY bulunamadı.");

      return NextResponse.json({
        reply:
          "Lina şu anda OpenAI API anahtarına erişemiyor. Sunucuda OPENAI_API_KEY tanımlı değil veya okunamıyor.",
        intent: null,
      });
    }

    const userGreeting = userName
      ? `Kullanıcının adı: ${userName}. Ona her zaman adıyla hitap et.`
      : "";

    const safeHistory = history
      .slice(-30)
      .map((item: LinaHistoryItem) => {
        const role = item?.role === "assistant" ? "assistant" : "user";

        return {
          role,
          content: String(item?.content || "").slice(0, 4000),
        };
      })
      .filter((item: { role: string; content: string }) => item.content.trim());

    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT + (userGreeting ? "\n\n" + userGreeting : ""),
      },
      ...safeHistory,
      {
        role: "user",
        content: message,
      },
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 1500,
        temperature: 0.5,
        messages,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error("Lina OpenAI API hatası:", {
        status: res.status,
        statusText: res.statusText,
        data,
      });

      return NextResponse.json({
        reply: createSafeErrorMessage(res.status, data),
        intent: null,
      });
    }

    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      console.error("Lina boş cevap hatası:", data);

      return NextResponse.json({
        reply:
          "Lina OpenAI'dan boş cevap aldı. API cevabı beklenen formatta dönmedi.",
        intent: null,
      });
    }

    let intent = null;

    try {
      const jsonMatch = reply.match(/JSON_START([\s\S]*?)JSON_END/);

      if (jsonMatch) {
        intent = JSON.parse(jsonMatch[1].trim());
      }
    } catch (error) {
      console.error("Lina JSON ayrıştırma uyarısı:", error);
    }

    return NextResponse.json({ reply, intent });
  } catch (err) {
    console.error("Lina route hatası:", err);

    return NextResponse.json(
      {
        reply:
          "Lina sunucu tarafında beklenmeyen bir hata yaşadı. Logları kontrol etmek gerekiyor.",
        intent: null,
      },
      { status: 500 },
    );
  }
}