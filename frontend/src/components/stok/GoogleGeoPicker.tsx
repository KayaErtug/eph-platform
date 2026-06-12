"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, MapPin, Search, X } from "lucide-react";

type GoogleGeoLocation = {
  latitude: number;
  longitude: number;
  mapAddress: string;
  placeId?: string;
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
};

type GoogleNamespace = any;

declare global {
  interface Window {
    google?: GoogleNamespace;
    ephGoogleMapsReady?: Promise<void>;
  }
}

const DEFAULT_CENTER = { lat: 37.783, lng: 29.096 };

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

  const searchAddress = useMemo(() => normalizeAddress([address, district, city, "Türkiye"]), [address, city, district]);
  const selectedLocationText = mapAddress || pendingLocation?.mapAddress || "Henüz harita konumu seçilmedi.";

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
      const nextLocation = {
        latitude: lat,
        longitude: lng,
        mapAddress: firstResult?.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        placeId: firstResult?.place_id || "",
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

      const nextLocation = {
        latitude: location.lat(),
        longitude: location.lng(),
        mapAddress: firstResult.formatted_address || searchAddress,
        placeId: firstResult.place_id || "",
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
            fields: ["formatted_address", "geometry", "place_id", "name"],
          });

          autocompleteRef.current.addListener("place_changed", () => {
            const place = autocompleteRef.current?.getPlace?.();
            const location = place?.geometry?.location;

            if (!location) return;

            const nextLocation = {
              latitude: location.lat(),
              longitude: location.lng(),
              mapAddress: place.formatted_address || place.name || searchAddress,
              placeId: place.place_id || "",
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
      `Bu konumu portföyünüze eklemek istediğinizden emin misiniz?\n\n${pendingLocation.mapAddress}\n${pendingLocation.latitude.toFixed(6)}, ${pendingLocation.longitude.toFixed(6)}`,
    );

    if (!ok) return;

    onChange(pendingLocation);
    setOpen(false);
  };

  return (
    <div className="rounded-[24px] border border-[#DDE7F3] bg-[#F8FBFF] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#1557D6]">Konum Doğrulama</p>
          <p className="mt-1 text-[13px] font-extrabold leading-5 text-[#06194A]">{selectedLocationText}</p>
          {latitude && longitude ? (
            <p className="mt-1 text-[11px] font-bold text-[#64748B]">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </p>
          ) : (
            <p className="mt-1 text-[11px] font-bold text-amber-700">Haritadan pin seçilmeden portföy haritada görünmez.</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-[18px] bg-[#1557D6] px-3 text-[12px] font-black text-white"
        >
          <MapPin size={16} />
          Konum Seç
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[99999] flex items-end justify-center bg-[#06194A]/45 px-2 pb-2 backdrop-blur-sm">
          <section className="flex max-h-[94dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-[30px] border border-white bg-white shadow-[0_24px_70px_rgba(15,23,42,0.24)]">
            <div className="flex items-center justify-between border-b border-[#E2EAF5] px-4 py-3">
              <div className="min-w-0 flex-1 text-center">
                <h3 className="text-[19px] font-black tracking-[-0.04em] text-[#06194A]">Portföy Konumu</h3>
                <p className="text-[11px] font-bold text-[#64748B]">Adresle ara, haritada pini sürükle, sonra doğrula.</p>
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
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#1557D6]">Seçilen Konum</p>
                <p className="mt-1 text-[13px] font-extrabold leading-5 text-[#06194A]">
                  {pendingLocation?.mapAddress || "Haritada bir noktaya dokunun veya pini sürükleyin."}
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
