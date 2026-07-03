import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
  LinaDistancePointDto,
  LinaDistanceRequestDto,
} from "./lina-distance.dto";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type ResolvedPoint = Coordinates & {
  label: string;
  formattedAddress?: string;
  placeId?: string;
  locationType?: string;
  source: "INPUT_COORDINATES" | "GOOGLE_GEOCODING";
};

type GoogleGeocodingResponse = {
  status?: string;
  error_message?: string;
  results?: Array<{
    formatted_address?: string;
    place_id?: string;
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
      location_type?: string;
    };
  }>;
};

type GoogleRoutesApiError = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type GoogleComputedRoute = {
  distanceMeters?: number;
  duration?: string;
  staticDuration?: string;
  description?: string;
  warnings?: string[];
};

type GoogleComputeRoutesResponse = GoogleRoutesApiError & {
  routes?: GoogleComputedRoute[];
  fallbackInfo?: Record<string, unknown>;
};

type CachedDrivingRoute = {
  route: GoogleComputedRoute;
  fallbackInfo?: Record<string, unknown>;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

@Injectable()
export class LinaDistanceService {
  private readonly geocodeCache = new Map<string, CacheEntry<ResolvedPoint>>();
  private readonly routeCache = new Map<
    string,
    CacheEntry<CachedDrivingRoute>
  >();

  private readonly geocodeCacheTtlMs = 24 * 60 * 60 * 1000;
  private readonly routeCacheTtlMs = 15 * 60 * 1000;
  private readonly requestTimeoutMs = 10_000;

  constructor(private readonly configService: ConfigService) {}

  async calculate(input: LinaDistanceRequestDto) {
    if (!input?.origin || !input?.destination) {
      throw new BadRequestException(
        "Başlangıç ve varış konumu birlikte gönderilmelidir.",
      );
    }

    const [origin, destination] = await Promise.all([
      this.resolvePoint(input.origin, "Başlangıç"),
      this.resolvePoint(input.destination, "Varış"),
    ]);

    const straightLineMeters = this.calculateHaversineMeters(
      origin,
      destination,
    );

    const apiKey = this.getServerApiKey();

    if (!apiKey) {
      return this.buildPartialResult(
        origin,
        destination,
        straightLineMeters,
        "ROUTES_API_NOT_CONFIGURED",
        "GOOGLE_MAPS_SERVER_API_KEY tanımlı olmadığı için araç rotası hesaplanamadı.",
      );
    }

    const routingPreference =
      input.routingPreference === "TRAFFIC_UNAWARE"
        ? "TRAFFIC_UNAWARE"
        : "TRAFFIC_AWARE";

    const routeModifiers = {
      avoidFerries: input.avoidFerries ?? true,
      avoidTolls: input.avoidTolls ?? false,
      avoidHighways: input.avoidHighways ?? false,
    };

    try {
      const routeResult = await this.computeDrivingRoute(
        origin,
        destination,
        routingPreference,
        routeModifiers,
        apiKey,
      );
      const route = routeResult.route;

      if (typeof route.distanceMeters !== "number") {
        return this.buildPartialResult(
          origin,
          destination,
          straightLineMeters,
          "DRIVING_ROUTE_NOT_FOUND",
          "Google Routes API iki konum arasında araç rotası bulamadı.",
        );
      }

      const drivingDistanceMeters = Math.max(
        0,
        Math.round(route.distanceMeters),
      );
      const trafficDurationSeconds = this.parseGoogleDuration(route.duration);
      const staticDurationSeconds = this.parseGoogleDuration(
        route.staticDuration,
      );
      const routeExcessMeters = Math.max(
        0,
        drivingDistanceMeters - straightLineMeters,
      );
      const detourFactor =
        straightLineMeters > 0
          ? drivingDistanceMeters / straightLineMeters
          : 1;

      return {
        success: true,
        origin,
        destination,
        routePolicy: {
          travelMode: "DRIVE",
          routingPreference,
          avoidFerries: routeModifiers.avoidFerries,
          avoidTolls: routeModifiers.avoidTolls,
          avoidHighways: routeModifiers.avoidHighways,
        },
        straightLine: {
          distanceMeters: straightLineMeters,
          distanceKm: this.toKm(straightLineMeters),
          role: "AUXILIARY_SIGNAL",
        },
        driving: {
          available: true,
          distanceMeters: drivingDistanceMeters,
          distanceKm: this.toKm(drivingDistanceMeters),
          durationSeconds: trafficDurationSeconds,
          durationMinutes: this.toMinutes(trafficDurationSeconds),
          staticDurationSeconds,
          staticDurationMinutes: this.toMinutes(staticDurationSeconds),
          trafficAware: routingPreference === "TRAFFIC_AWARE",
          source: "GOOGLE_ROUTES_API",
          method: "COMPUTE_ROUTES",
          condition: "ROUTE_EXISTS",
          description: route.description || null,
          warnings: Array.isArray(route.warnings) ? route.warnings : [],
          fallbackInfo: routeResult.fallbackInfo || null,
        },
        comparison: {
          routeExcessMeters,
          routeExcessKm: this.toKm(routeExcessMeters),
          detourFactor: Number(detourFactor.toFixed(2)),
          roadNetworkBarrierSignal:
            detourFactor >= 2 ||
            routeExcessMeters >= 5_000,
        },
        decision: {
          ready: true,
          primaryMetric: "DRIVING_DISTANCE",
          primaryDistanceMeters: drivingDistanceMeters,
          primaryDistanceKm: this.toKm(drivingDistanceMeters),
          rule:
            "Yakınlık ve eşleştirme kararlarında araçla gidilen mesafe esas alınır. Kuş uçuşu mesafe yalnız yardımcı sinyaldir.",
        },
      };
    } catch (error) {
      return this.buildPartialResult(
        origin,
        destination,
        straightLineMeters,
        "ROUTES_API_ERROR",
        error instanceof Error
          ? error.message
          : "Araç rotası hesaplanırken bilinmeyen hata oluştu.",
      );
    }
  }

  private async resolvePoint(
    input: LinaDistancePointDto,
    fallbackLabel: string,
  ): Promise<ResolvedPoint> {
    const hasLatitude =
      typeof input.latitude === "number" &&
      Number.isFinite(input.latitude);
    const hasLongitude =
      typeof input.longitude === "number" &&
      Number.isFinite(input.longitude);

    if (hasLatitude !== hasLongitude) {
      throw new BadRequestException(
        `${fallbackLabel} için enlem ve boylam birlikte gönderilmelidir.`,
      );
    }

    if (hasLatitude && hasLongitude) {
      return {
        latitude: input.latitude as number,
        longitude: input.longitude as number,
        label: this.getPointLabel(input, fallbackLabel),
        formattedAddress: this.buildAddressQuery(input) || undefined,
        placeId: input.placeId?.trim() || undefined,
        source: "INPUT_COORDINATES",
      };
    }

    const apiKey = this.getServerApiKey();

    if (!apiKey) {
      throw new BadRequestException(
        `${fallbackLabel} koordinat içermiyor. Adresi koordinata çevirmek için GOOGLE_MAPS_SERVER_API_KEY tanımlanmalıdır.`,
      );
    }

    const placeId = String(input.placeId || "").trim();
    const addressQuery = this.buildAddressQuery(input);

    if (!placeId && !addressQuery) {
      throw new BadRequestException(
        `${fallbackLabel} için koordinat, placeId veya adres bilgisi gönderilmelidir.`,
      );
    }

    const cacheKey = placeId
      ? `place:${placeId}`
      : `address:${this.normalizeCacheKey(addressQuery)}`;
    const cached = this.getCache(this.geocodeCache, cacheKey);

    if (cached) {
      return {
        ...cached,
        label: this.getPointLabel(input, cached.label || fallbackLabel),
      };
    }

    const params = new URLSearchParams({
      key: apiKey,
      language: "tr",
      region: "tr",
    });

    if (placeId) {
      params.set("place_id", placeId);
    } else {
      params.set("address", addressQuery);
    }

    const response = await this.fetchWithTimeout(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    const payload = (await response.json()) as GoogleGeocodingResponse;

    if (!response.ok || payload.status !== "OK") {
      throw new BadRequestException(
        payload.error_message ||
          `Google Geocoding konumu çözemedi: ${payload.status || response.status}`,
      );
    }

    const first = payload.results?.[0];
    const latitude = first?.geometry?.location?.lat;
    const longitude = first?.geometry?.location?.lng;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      throw new BadRequestException(
        `${fallbackLabel} için geçerli koordinat bulunamadı.`,
      );
    }

    const resolved: ResolvedPoint = {
      latitude,
      longitude,
      label: this.getPointLabel(
        input,
        first?.formatted_address || fallbackLabel,
      ),
      formattedAddress: first?.formatted_address,
      placeId: first?.place_id,
      locationType: first?.geometry?.location_type,
      source: "GOOGLE_GEOCODING",
    };

    this.setCache(
      this.geocodeCache,
      cacheKey,
      resolved,
      this.geocodeCacheTtlMs,
    );

    return resolved;
  }

  private async computeDrivingRoute(
    origin: Coordinates,
    destination: Coordinates,
    routingPreference: "TRAFFIC_AWARE" | "TRAFFIC_UNAWARE",
    routeModifiers: {
      avoidFerries: boolean;
      avoidTolls: boolean;
      avoidHighways: boolean;
    },
    apiKey: string,
  ): Promise<CachedDrivingRoute> {
    const cacheKey = [
      origin.latitude.toFixed(6),
      origin.longitude.toFixed(6),
      destination.latitude.toFixed(6),
      destination.longitude.toFixed(6),
      routingPreference,
      routeModifiers.avoidFerries,
      routeModifiers.avoidTolls,
      routeModifiers.avoidHighways,
    ].join("|");

    const cached = this.getCache(this.routeCache, cacheKey);

    if (cached) {
      return cached;
    }

    const response = await this.fetchWithTimeout(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "routes.distanceMeters,routes.duration,routes.staticDuration,routes.description,routes.warnings,fallbackInfo",
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: origin.latitude,
                longitude: origin.longitude,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: destination.latitude,
                longitude: destination.longitude,
              },
            },
          },
          travelMode: "DRIVE",
          routingPreference,
          computeAlternativeRoutes: false,
          routeModifiers,
          languageCode: "tr-TR",
          regionCode: "tr",
          units: "METRIC",
        }),
      },
    );

    const payload = (await response.json()) as GoogleComputeRoutesResponse;

    if (!response.ok) {
      throw new Error(
        payload.error?.message ||
          `Google Routes API isteği başarısız: HTTP ${response.status}`,
      );
    }

    const route = payload.routes?.[0];

    if (!route) {
      throw new Error(
        "Google Routes API iki konum arasında araç rotası döndürmedi.",
      );
    }

    const result: CachedDrivingRoute = {
      route,
      fallbackInfo: payload.fallbackInfo,
    };

    this.setCache(
      this.routeCache,
      cacheKey,
      result,
      this.routeCacheTtlMs,
    );

    return result;
  }

  private buildPartialResult(
    origin: ResolvedPoint,
    destination: ResolvedPoint,
    straightLineMeters: number,
    errorCode: string,
    message: string,
  ) {
    return {
      success: true,
      origin,
      destination,
      routePolicy: {
        travelMode: "DRIVE",
        primaryMetric: "DRIVING_DISTANCE",
      },
      straightLine: {
        distanceMeters: straightLineMeters,
        distanceKm: this.toKm(straightLineMeters),
        role: "AUXILIARY_SIGNAL",
      },
      driving: {
        available: false,
        errorCode,
        message,
      },
      decision: {
        ready: false,
        primaryMetric: "DRIVING_DISTANCE",
        rule:
          "Araçla gidilen mesafe bulunmadan yakınlık veya eşleşme kararı verilmez. Kuş uçuşu mesafe tek başına karar ölçütü değildir.",
      },
    };
  }

  private calculateHaversineMeters(
    origin: Coordinates,
    destination: Coordinates,
  ): number {
    const earthRadiusMeters = 6_371_000;
    const latitudeDelta = this.toRadians(
      destination.latitude - origin.latitude,
    );
    const longitudeDelta = this.toRadians(
      destination.longitude - origin.longitude,
    );
    const originLatitude = this.toRadians(origin.latitude);
    const destinationLatitude = this.toRadians(destination.latitude);

    const haversine =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(originLatitude) *
        Math.cos(destinationLatitude) *
        Math.sin(longitudeDelta / 2) ** 2;

    const angularDistance =
      2 *
      Math.atan2(
        Math.sqrt(haversine),
        Math.sqrt(1 - haversine),
      );

    return Math.round(earthRadiusMeters * angularDistance);
  }

  private buildAddressQuery(input: LinaDistancePointDto): string {
    const parts = [
      input.address,
      input.neighborhood
        ? this.ensureAdministrativeSuffix(
            input.neighborhood,
            "Mahallesi",
          )
        : "",
      input.district,
      input.city,
      "Türkiye",
    ]
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    return Array.from(new Set(parts)).join(", ");
  }

  private ensureAdministrativeSuffix(
    value: string,
    suffix: string,
  ): string {
    const clean = String(value || "").trim();

    if (!clean) {
      return "";
    }

    const normalized = clean.toLocaleLowerCase("tr-TR");

    if (
      normalized.includes("mahallesi") ||
      normalized.endsWith(" mah.") ||
      normalized.endsWith(" mah")
    ) {
      return clean;
    }

    return `${clean} ${suffix}`;
  }

  private getPointLabel(
    input: LinaDistancePointDto,
    fallback: string,
  ): string {
    return (
      String(input.label || "").trim() ||
      [
        input.neighborhood,
        input.district,
        input.city,
      ]
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .join(" / ") ||
      String(input.address || "").trim() ||
      fallback
    );
  }

  private getServerApiKey(): string {
    return String(
      this.configService.get<string>("GOOGLE_MAPS_SERVER_API_KEY") ||
        this.configService.get<string>("GOOGLE_MAPS_API_KEY") ||
        "",
    ).trim();
  }

  private parseGoogleDuration(value?: string): number | null {
    const match = String(value || "").match(/^([\d.]+)s$/);

    if (!match) {
      return null;
    }

    const seconds = Number(match[1]);

    return Number.isFinite(seconds)
      ? Math.max(0, Math.round(seconds))
      : null;
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }

  private toKm(value: number | null): number | null {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return null;
    }

    return Number((value / 1000).toFixed(2));
  }

  private toMinutes(value: number | null): number | null {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return null;
    }

    return Math.max(1, Math.round(value / 60));
  }

  private normalizeCacheKey(value: string): string {
    return String(value || "")
      .trim()
      .toLocaleLowerCase("tr-TR")
      .replace(/\s+/g, " ");
  }

  private getCache<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
  ): T | null {
    const entry = cache.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      cache.delete(key);
      return null;
    }

    return entry.value;
  }

  private setCache<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
    value: T,
    ttlMs: number,
  ): void {
    cache.set(key, {
      expiresAt: Date.now() + ttlMs,
      value,
    });
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.requestTimeoutMs,
    );

    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        throw new Error(
          "Google harita servisi zaman aşımına uğradı.",
        );
      }

      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
