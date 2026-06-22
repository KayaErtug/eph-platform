"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, MapPin, Search, X } from "lucide-react";

type GoogleGeoLocation = {
  latitude: number;
  longitude: number;
  mapAddress: string;
  placeId?: string;
  city?: string;
  district?: string;
  address?: string;
};

type GoogleGeoPickerProps = {
  city: string;
  district: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  mapAddress?: string;
  placeId?: string;
  onChange: (location: GoogleGeoLocation) => void;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  modalTitle?: string;
  modalSubtitle?: string;
  selectedLabel?: string;
  emptyText?: string;
  confirmMessageTitle?: string;
};

type GoogleNamespace = any;

declare global {
  interface Window {
    google?: GoogleNamespace;
    ephGoogleMapsReady?: Promise<void>;
  }
}

const DEFAULT_CENTER = { lat: 37.783, lng: 29.096 };

type MapTypeKey = "roadmap" | "satellite" | "hybrid" | "terrain";

const MAP_TYPE_OPTIONS: Array<{ key: MapTypeKey; label: string; icon: string }> = [
  { key: "roadmap", label: "Standart", icon: "🗺️" },
  { key: "satellite", label: "Uydu", icon: "🛰️" },
  { key: "hybrid", label: "Hibrit", icon: "🌐" },
  { key: "terrain", label: "Arazi", icon: "🏔️" },
];

function getMapsApiKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
}

function loadGoogleMapsScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("Tarayıcı ortamı bulunamadı."));
  if (window.google?.maps) return Promise.resolve();
  if (window.ephGoogleMapsReady) return window.ephGoogleMapsReady;

  const apiKey = getMapsApiKey();

  if (!apiKey) {
    return Promise.reject(new Error("Google Maps API anahtarı tanımlı değil."));
  }

  window.ephGoogleMapsReady = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-eph-google-maps="true"]');

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () => reject(new Error("Google Maps yüklenemedi.")));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=tr&region=TR`;
    script.async = true;
    script.defer = true;
    script.dataset.ephGoogleMaps = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps yüklenemedi."));
    document.head.appendChild(script);
  });

  return window.ephGoogleMapsReady;
}

function normalizeAddress(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
}

function getAddressComponent(result: any, types: string[]) {
  const components = Array.isArray(result?.address_components)
    ? result.address_components
    : [];

  const found = components.find((component: any) => {
    const componentTypes = Array.isArray(component?.types) ? component.types : [];
    return types.some((type) => componentTypes.includes(type));
  });

  return String(found?.long_name || "").trim();
}

function getLocationPartsFromGoogleResult(result: any) {
  if (!result) {
    return {
      city: "",
      district: "",
      address: "",
    };
  }

  const city = getAddressComponent(result, ["administrative_area_level_1"]);
  const district =
    getAddressComponent(result, ["administrative_area_level_2"]) ||
    getAddressComponent(result, ["locality"]);
  const neighborhood =
    getAddressComponent(result, ["neighborhood"]) ||
    getAddressComponent(result, ["sublocality_level_1"]) ||
    getAddressComponent(result, ["sublocality"]) ||
    getAddressComponent(result, ["administrative_area_level_4"]) ||
    getAddressComponent(result, ["route"]);

  return {
    city,
    district,
    address: neighborhood,
  };
}


export default function GoogleGeoPicker({
  city,
  district,
  address,
  latitude,
  longitude,
  mapAddress,
  placeId,
  onChange,
  onOpenChange,
  title = "Konum Doğrulama",
  subtitle = "Haritadan pin seçilmeden portföy haritada görünmez.",
  buttonLabel = "Konum Seç",
  modalTitle = "Portföy Konumu",
  modalSubtitle = "Adresle ara, haritada pini sürükle, sonra doğrula.",
  selectedLabel = "Seçilen Konum",
  emptyText = "Haritada bir noktaya dokunun veya pini sürükleyin.",
  confirmMessageTitle = "Bu konumu portföyünüze eklemek istediğinizden emin misiniz?",
}: GoogleGeoPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const autocompleteInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);

  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingLocation, setPendingLocation] = useState<GoogleGeoLocation | null>(
    latitude && longitude
      ? {
          latitude,
          longitude,
          mapAddress: mapAddress || normalizeAddress([address, district, city]),
          placeId: placeId || "",
        }
      : null,
  );
  const [selectedMapType, setSelectedMapType] = useState<MapTypeKey>("roadmap");

  const searchAddress = useMemo(() => normalizeAddress([address, district, city, "Türkiye"]), [address, city, district]);
  const selectedLocationText = mapAddress || pendingLocation?.mapAddress || "Henüz harita konumu seçilmedi.";

  const handleMapTypeChange = (mapType: MapTypeKey) => {
    setSelectedMapType(mapType);
    mapRef.current?.setMapTypeId?.(mapType);
  };

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const updateMarker = (location: GoogleGeoLocation, zoom = 17) => {
    if (!window.google?.maps || !mapRef.current) return;

    const latLng = { lat: location.latitude, lng: location.longitude };
    mapRef.current.setCenter(latLng);
    mapRef.current.setZoom(zoom);

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        position: latLng,
        map: mapRef.current,
        draggable: true,
        title: "Portföy Konumu",
      });

      markerRef.current.addListener("dragend", () => {
        const position = markerRef.current?.getPosition?.();
        if (!position) return;
        reverseGeocode(position.lat(), position.lng());
      });
    } else {
      markerRef.current.setPosition(latLng);
    }
  };

  const reverseGeocode = (lat: number, lng: number) => {
    if (!geocoderRef.current) {
      const nextLocation = {
        latitude: lat,
        longitude: lng,
        mapAddress: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        placeId: "",
      };
      setPendingLocation(nextLocation);
      return;
    }

    geocoderRef.current.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
      const firstResult = Array.isArray(results) ? results[0] : null;
      const locationParts = getLocationPartsFromGoogleResult(firstResult);
      const nextLocation = {
        latitude: lat,
        longitude: lng,
        mapAddress: firstResult?.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        placeId: firstResult?.place_id || "",
        ...locationParts,
      };

      setPendingLocation(nextLocation);
      updateMarker(nextLocation, mapRef.current?.getZoom?.() || 17);
    });
  };

  const geocodeCurrentAddress = () => {
    if (!geocoderRef.current || !searchAddress.trim()) return;

    setLoading(true);
    setError("");

    geocoderRef.current.geocode({ address: searchAddress }, (results: any[], status: string) => {
      setLoading(false);
      const firstResult = Array.isArray(results) ? results[0] : null;
      const location = firstResult?.geometry?.location;

      if (status !== "OK" || !location) {
        setError("Adres haritada bulunamadı. Haritayı elle yakınlaştırıp pini doğru noktaya taşıyın.");
        return;
      }

      const locationParts = getLocationPartsFromGoogleResult(firstResult);
      const nextLocation = {
        latitude: location.lat(),
        longitude: location.lng(),
        mapAddress: firstResult.formatted_address || searchAddress,
        placeId: firstResult.place_id || "",
        ...locationParts,
      };

      setPendingLocation(nextLocation);
      updateMarker(nextLocation, 17);
    });
  };


  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Bu cihaz konum servisini desteklemiyor.");
      return;
    }

    setLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        reverseGeocode(lat, lng);

        if (mapRef.current) {
          mapRef.current.setCenter({ lat, lng });
          mapRef.current.setZoom(18);
        }

        setLoading(false);
      },
      () => {
        setLoading(false);
        setError("Konum alınamadı. Lütfen cihazınızda konum izni veriniz.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  };

  useEffect(() => {
    if (!open) return;

    let alive = true;
    setLoading(true);
    setError("");

    loadGoogleMapsScript()
      .then(() => {
        if (!alive || !window.google?.maps || !mapContainerRef.current) return;

        setReady(true);
        geocoderRef.current = new window.google.maps.Geocoder();

        const initialCenter = latitude && longitude ? { lat: latitude, lng: longitude } : DEFAULT_CENTER;

        mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
          center: initialCenter,
          zoom: latitude && longitude ? 17 : 12,
          mapTypeId: selectedMapType,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: true,
          gestureHandling: "greedy",
        });

        mapRef.current.addListener("click", (event: any) => {
          const clicked = event?.latLng;
          if (!clicked) return;
          reverseGeocode(clicked.lat(), clicked.lng());
        });

        if (autocompleteInputRef.current) {
          autocompleteRef.current = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
            componentRestrictions: { country: "tr" },
            fields: ["formatted_address", "geometry", "place_id", "name", "address_components"],
          });

          autocompleteRef.current.addListener("place_changed", () => {
            const place = autocompleteRef.current?.getPlace?.();
            const location = place?.geometry?.location;

            if (!location) return;

            const locationParts = getLocationPartsFromGoogleResult(place);
            const nextLocation = {
              latitude: location.lat(),
              longitude: location.lng(),
              mapAddress: place.formatted_address || place.name || searchAddress,
              placeId: place.place_id || "",
              ...locationParts,
            };

            setPendingLocation(nextLocation);
            updateMarker(nextLocation, 17);
          });
        }

        if (latitude && longitude) {
          updateMarker(
            {
              latitude,
              longitude,
              mapAddress: mapAddress || searchAddress,
              placeId: placeId || "",
              city,
              district,
              address,
            },
            17,
          );
        } else {
          geocodeCurrentAddress();
        }
      })
      .catch((err: Error) => {
        setError(err.message || "Harita yüklenemedi.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [open]);

  const handleConfirm = () => {
    if (!pendingLocation) {
      setError("Lütfen harita üzerinde portföy konumunu seçin.");
      return;
    }

    const ok = window.confirm(
      `${confirmMessageTitle}\n\n${pendingLocation.mapAddress}\n${pendingLocation.latitude.toFixed(6)}, ${pendingLocation.longitude.toFixed(6)}`,
    );

    if (!ok) return;

    onChange(pendingLocation);
    setOpen(false);
  };

  return (
    <div className="rounded-[24px] border-2 border-[#C7D6E8] bg-gradient-to-b from-[#F8FBFF] to-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-[44px] min-w-[142px] items-center justify-center gap-2 rounded-[18px] bg-[#1557D6] px-4 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(21,87,214,0.22)] transition active:scale-[0.98]"
        >
          <MapPin size={16} />
          {buttonLabel}
        </button>

        <div className="min-w-0 text-center">
          <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#1557D6]">{title}</p>
          <p className="mx-auto mt-1 max-w-[280px] text-[13px] font-extrabold leading-5 text-[#06194A]">{selectedLocationText}</p>
          {latitude && longitude ? (
            <p className="mt-1 text-[11px] font-bold text-[#64748B]">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </p>
          ) : (
            <p className="mx-auto mt-1 max-w-[280px] text-[11px] font-bold leading-4 text-amber-700">{subtitle}</p>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[99999] flex items-end justify-center bg-[#06194A]/45 px-2 pb-2 backdrop-blur-sm">
          <section className="flex max-h-[94dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-[30px] border border-white bg-white shadow-[0_24px_70px_rgba(15,23,42,0.24)]">
            <div className="flex items-center justify-between border-b border-[#E2EAF5] px-4 py-3">
              <div className="min-w-0 flex-1 text-center">
                <h3 className="text-[19px] font-black tracking-[-0.04em] text-[#06194A]">{modalTitle}</h3>
                <p className="text-[11px] font-bold text-[#64748B]">{modalSubtitle}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F1F5FB] text-[#06194A]">
                <X size={19} />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto p-3 pb-4">
              <div className="flex items-center gap-2 rounded-[20px] border border-[#DDE7F3] bg-white px-3 py-2">
                <Search size={17} className="text-[#64748B]" />
                <input
                  ref={autocompleteInputRef}
                  defaultValue={searchAddress}
                  className="min-w-0 flex-1 bg-transparent text-[13px] font-bold text-[#06194A] outline-none"
                  placeholder="Adres, mahalle veya proje adı ara"
                />
                <button type="button" onClick={geocodeCurrentAddress} className="rounded-[14px] bg-[#EFF6FF] px-3 py-2 text-[11px] font-black text-[#1557D6]">
                  Bul
                </button>
              </div>

              <button
                type="button"
                onClick={getCurrentLocation}
                className="w-full rounded-[18px] bg-emerald-600 px-4 py-3 text-[13px] font-black text-white"
              >
                📍 Şu Anki Konumum
              </button>

              {error && <div className="rounded-[18px] border border-rose-100 bg-rose-50 px-3 py-2 text-center text-[12px] font-black text-rose-700">{error}</div>}

              <div className="relative h-[330px] overflow-hidden rounded-[24px] border border-[#DDE7F3] bg-[#EEF5FF]">
                <div ref={mapContainerRef} className="h-full w-full" />
                <div className="absolute left-2 right-2 top-2 z-10 grid grid-cols-4 gap-1 rounded-[18px] border border-white/80 bg-white/92 p-1 shadow-[0_10px_24px_rgba(15,23,42,0.16)] backdrop-blur">
                  {MAP_TYPE_OPTIONS.map((option) => {
                    const active = selectedMapType === option.key;

                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => handleMapTypeChange(option.key)}
                        className={`flex min-h-[38px] items-center justify-center gap-1 rounded-[14px] px-1 text-[10px] font-black transition active:scale-[0.98] ${
                          active
                            ? "bg-[#1557D6] text-white shadow-[0_8px_18px_rgba(21,87,214,0.24)]"
                            : "bg-[#F8FBFF] text-[#06194A]"
                        }`}
                      >
                        <span aria-hidden="true">{option.icon}</span>
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
                {(loading || !ready) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/72 backdrop-blur-sm">
                    <div className="text-center">
                      <Loader2 size={26} className="mx-auto animate-spin text-[#1557D6]" />
                      <p className="mt-2 text-[12px] font-black text-[#64748B]">Harita yükleniyor...</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-[22px] border border-[#DDE7F3] bg-[#F8FBFF] p-3 text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#1557D6]">{selectedLabel}</p>
                <p className="mt-1 text-[13px] font-extrabold leading-5 text-[#06194A]">
                  {pendingLocation?.mapAddress || emptyText}
                </p>
                {pendingLocation && (
                  <p className="mt-1 text-[11px] font-bold text-[#64748B]">
                    {pendingLocation.latitude.toFixed(6)}, {pendingLocation.longitude.toFixed(6)}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-[#E2EAF5] bg-white p-3">
              <button type="button" onClick={() => setOpen(false)} className="min-h-[48px] rounded-[20px] border border-[#DDE7F3] bg-white text-[13px] font-black text-[#06194A]">
                Tekrar Seç
              </button>
              <button type="button" onClick={handleConfirm} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[20px] bg-[#1557D6] text-[13px] font-black text-white">
                <CheckCircle2 size={18} />
                Evet, Kaydet
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
