"use client";

import { useEffect, useRef } from "react";
import type {
  Map as LeafletMap,
  Marker as LeafletMarker,
} from "leaflet";

type ProjectLocationMapProps = {
  latitude: string;
  longitude: string;
  onLocationChange: (latitude: number, longitude: number) => void;
};

type SetPointOptions = {
  notify?: boolean;
  center?: boolean;
};

const DEFAULT_CENTER: [number, number] = [39.0, 35.0];
const DEFAULT_ZOOM = 6;
const SELECTED_ZOOM = 16;

function parseCoordinate(value: string) {
  const parsed = Number(String(value || "").trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function validCoordinates(
  latitude: number | null,
  longitude: number | null,
): latitude is number {
  return (
    latitude !== null &&
    longitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function ProjectLocationMap({
  latitude,
  longitude,
  onLocationChange,
}: ProjectLocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);

  const callbackRef = useRef(onLocationChange);

  const setPointRef = useRef<
    | ((
        latitude: number,
        longitude: number,
        options?: SetPointOptions,
      ) => void)
    | null
  >(null);

  useEffect(() => {
    callbackRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    let cancelled = false;
    let createdMap: LeafletMap | null = null;
    let resizeTimer: number | null = null;

    const initializeMap = async () => {
      const container = containerRef.current;

      if (!container || mapRef.current) {
        return;
      }

      const L = await import("leaflet");

      if (cancelled || !containerRef.current) {
        return;
      }

      const initialLatitude = parseCoordinate(latitude);
      const initialLongitude = parseCoordinate(longitude);

      const hasInitialPoint = validCoordinates(
        initialLatitude,
        initialLongitude,
      );

      const initialCenter: [number, number] = hasInitialPoint
        ? [initialLatitude, initialLongitude as number]
        : DEFAULT_CENTER;

      const map = L.map(container, {
        center: initialCenter,
        zoom: hasInitialPoint ? SELECTED_ZOOM : DEFAULT_ZOOM,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
      });

      createdMap = map;
      mapRef.current = map;

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap katkıda bulunanları",
        },
      ).addTo(map);

      const markerIcon = L.divIcon({
        className: "",
        html: `
          <div
            style="
              width:34px;
              height:34px;
              border-radius:50% 50% 50% 0;
              transform:rotate(-45deg);
              display:grid;
              place-items:center;
              background:#2563EB;
              border:4px solid #FFFFFF;
              box-shadow:0 8px 22px rgba(15,23,42,.35);
            "
          >
            <div
              style="
                width:10px;
                height:10px;
                border-radius:50%;
                background:#FFFFFF;
              "
            ></div>
          </div>
        `,
        iconSize: [34, 42],
        iconAnchor: [17, 39],
      });

      const setPoint = (
        nextLatitude: number,
        nextLongitude: number,
        options: SetPointOptions = {},
      ) => {
        const point: [number, number] = [
          nextLatitude,
          nextLongitude,
        ];

        if (markerRef.current) {
          markerRef.current.setLatLng(point);
        } else {
          const marker = L.marker(point, {
            draggable: true,
            autoPan: true,
            icon: markerIcon,
            title: "Proje konumu",
            alt: "Proje konumu",
          }).addTo(map);

          marker.on("dragend", () => {
            const draggedPoint = marker.getLatLng();

            callbackRef.current(
              draggedPoint.lat,
              draggedPoint.lng,
            );
          });

          markerRef.current = marker;
        }

        if (options.center) {
          map.setView(
            point,
            Math.max(map.getZoom(), SELECTED_ZOOM),
            {
              animate: false,
            },
          );
        }

        if (options.notify) {
          callbackRef.current(nextLatitude, nextLongitude);
        }
      };

      setPointRef.current = setPoint;

      map.on("click", (event) => {
        setPoint(event.latlng.lat, event.latlng.lng, {
          notify: true,
          center: false,
        });
      });

      if (hasInitialPoint) {
        setPoint(
          initialLatitude,
          initialLongitude as number,
          {
            notify: false,
            center: false,
          },
        );
      }

      resizeTimer = window.setTimeout(() => {
        map.invalidateSize();
      }, 150);
    };

    void initializeMap();

    return () => {
      cancelled = true;

      if (resizeTimer !== null) {
        window.clearTimeout(resizeTimer);
      }

      if (createdMap) {
        createdMap.remove();
      }

      mapRef.current = null;
      markerRef.current = null;
      setPointRef.current = null;
    };
  }, []);

  useEffect(() => {
    const nextLatitude = parseCoordinate(latitude);
    const nextLongitude = parseCoordinate(longitude);

    if (
      validCoordinates(nextLatitude, nextLongitude) &&
      setPointRef.current
    ) {
      setPointRef.current(
        nextLatitude,
        nextLongitude as number,
        {
          notify: false,
          center: true,
        },
      );
    }
  }, [latitude, longitude]);

  const selectedLatitude = parseCoordinate(latitude);
  const selectedLongitude = parseCoordinate(longitude);

  const hasSelectedPoint = validCoordinates(
    selectedLatitude,
    selectedLongitude,
  );

  return (
    <div
      style={{
        width: "100%",
        marginTop: 12,
        overflow: "hidden",
        border: "1.5px solid #93C5FD",
        borderRadius: 18,
        background: "#F8FBFF",
      }}
    >
      <div
        style={{
          width: "100%",
          padding: "10px 12px",
          borderBottom: "1px solid #DBEAFE",
          textAlign: "center",
        }}
      >
        <strong
          style={{
            display: "block",
            color: "#0F2C63",
            fontSize: 12,
            lineHeight: 1.35,
            fontWeight: 950,
          }}
        >
          Haritada Proje Yerini Seç
        </strong>

        <span
          style={{
            display: "block",
            marginTop: 3,
            color: "#64748B",
            fontSize: 10,
            lineHeight: 1.45,
            fontWeight: 750,
          }}
        >
          Haritada gezin, istediğin noktaya dokun veya pini
          sürükleyerek hassas konumu belirle.
        </span>
      </div>

      <div
        ref={containerRef}
        aria-label="Proje konumu seçim haritası"
        style={{
          width: "100%",
          height: "clamp(280px, 42vh, 420px)",
          background: "#E2E8F0",
          zIndex: 1,
        }}
      />

      <div
        style={{
          width: "100%",
          minHeight: 38,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px 12px",
          textAlign: "center",
          color: hasSelectedPoint ? "#166534" : "#64748B",
          background: hasSelectedPoint ? "#F0FDF4" : "#FFFFFF",
          fontSize: 10,
          lineHeight: 1.45,
          fontWeight: 850,
        }}
      >
        {hasSelectedPoint
          ? `Seçilen konum: ${selectedLatitude?.toFixed(
              7,
            )}, ${selectedLongitude?.toFixed(7)}`
          : "Henüz konum seçilmedi. Haritada bir noktaya dokun."}
      </div>
    </div>
  );
}
