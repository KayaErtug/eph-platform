import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Coordinates = {
  latitude: number;
  longitude: number;
};

function isValidCoordinates(
  latitude: number,
  longitude: number,
): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function createCoordinates(
  latitudeValue: string,
  longitudeValue: string,
): Coordinates | null {
  const latitude = Number(latitudeValue.replace(",", "."));
  const longitude = Number(longitudeValue.replace(",", "."));

  if (!isValidCoordinates(latitude, longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

function decodeSafely(value: string): string {
  let current = value;

  for (let index = 0; index < 3; index += 1) {
    try {
      const decoded = decodeURIComponent(current);

      if (decoded === current) {
        break;
      }

      current = decoded;
    } catch {
      break;
    }
  }

  return current;
}

function extractFirstUrl(value: string): string {
  const match = value.match(/https?:\/\/[^\s<>"']+/i);

  return String(match?.[0] || "")
    .replace(/[),.;]+$/g, "")
    .trim();
}

function parseCoordinatesFromValue(
  value: string,
): Coordinates | null {
  const decoded = decodeSafely(value);

  const patterns = [
    /@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)(?:,|z|\/|$)/i,
    /!3d(-?\d{1,3}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/i,
    /(?:q|query|ll|sll|center|destination|daddr)=(-?\d{1,3}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)/i,
    /(?:latitude|lat)[=:]\s*(-?\d{1,3}(?:\.\d+)?)[,\s;&]+(?:longitude|lng|lon)[=:]\s*(-?\d{1,3}(?:\.\d+)?)/i,
    /(-?\d{1,3}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)/,
  ];

  for (const pattern of patterns) {
    const match = decoded.match(pattern);

    if (!match) {
      continue;
    }

    const coordinates = createCoordinates(match[1], match[2]);

    if (coordinates) {
      return coordinates;
    }
  }

  return null;
}

function isAllowedMapHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  return (
    normalized === "google.com" ||
    normalized.endsWith(".google.com") ||
    normalized === "google.com.tr" ||
    normalized.endsWith(".google.com.tr") ||
    normalized === "goo.gl" ||
    normalized.endsWith(".goo.gl") ||
    normalized === "maps.apple.com"
  );
}

function requiresRedirectResolution(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  return (
    normalized === "goo.gl" ||
    normalized.endsWith(".goo.gl")
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const value = String(body?.value || "").trim();

    if (!value) {
      return NextResponse.json(
        {
          message: "Konum bağlantısı veya koordinat bilgisi girin.",
        },
        { status: 400 },
      );
    }

    const directCoordinates =
      parseCoordinatesFromValue(value);

    if (directCoordinates) {
      return NextResponse.json({
        success: true,
        ...directCoordinates,
        resolvedUrl: extractFirstUrl(value) || null,
      });
    }

    const sharedUrl = extractFirstUrl(value);

    if (!sharedUrl) {
      return NextResponse.json(
        {
          message:
            "Geçerli bir Google Maps, Apple Maps veya koordinat bağlantısı bulunamadı.",
        },
        { status: 400 },
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(sharedUrl);
    } catch {
      return NextResponse.json(
        {
          message: "Konum bağlantısı geçerli değil.",
        },
        { status: 400 },
      );
    }

    if (
      parsedUrl.protocol !== "https:" ||
      !isAllowedMapHost(parsedUrl.hostname)
    ) {
      return NextResponse.json(
        {
          message:
            "Yalnızca Google Maps ve Apple Maps konum bağlantıları desteklenir.",
        },
        { status: 400 },
      );
    }

    if (!requiresRedirectResolution(parsedUrl.hostname)) {
      return NextResponse.json(
        {
          message:
            "Bağlantının içinde koordinat bulunamadı. Haritadan pini seçebilirsiniz.",
        },
        { status: 422 },
      );
    }

    const response = await fetch(parsedUrl.toString(), {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; EPH-MapResolver/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    const resolvedUrl = response.url;
    const resolvedCoordinates =
      parseCoordinatesFromValue(resolvedUrl);

    if (resolvedCoordinates) {
      return NextResponse.json({
        success: true,
        ...resolvedCoordinates,
        resolvedUrl,
      });
    }

    const html = (await response.text()).slice(0, 1_000_000);
    const htmlCoordinates =
      parseCoordinatesFromValue(html);

    if (htmlCoordinates) {
      return NextResponse.json({
        success: true,
        ...htmlCoordinates,
        resolvedUrl,
      });
    }

    return NextResponse.json(
      {
        message:
          "Paylaşılan bağlantı çözüldü ancak koordinat bilgisi bulunamadı.",
      },
      { status: 422 },
    );
  } catch {
    return NextResponse.json(
      {
        message:
          "Konum bağlantısı şu anda çözümlenemedi. Lütfen tekrar deneyin.",
      },
      { status: 500 },
    );
  }
}
