"use client";

import type { PointerEvent as ReactPointerEvent } from "react";

import type { SceneViewMode } from "./PremiumProjectScene";
import type { ProjectSceneElement } from "./projectSceneTypes";

type Point = { x: number; y: number };
type WorldPoint = { x: number; z: number };

type SceneMetrics = {
  centerX: number;
  centerY: number;
  scaleX: number;
  scaleY: number;
  heightScale: number;
};

type AmenityGeometryProps = {
  element: ProjectSceneElement;
  selected: boolean;
  dragElementId: string | null;
  viewMode: SceneViewMode;
  sceneMetrics: SceneMetrics;
  toIso: (worldX: number, worldZ: number) => Point;
  showLabels: boolean;
  onElementPointerDown: (
    event: ReactPointerEvent<SVGGElement>,
    element: ProjectSceneElement,
  ) => void;
  onElementPointerMove: (event: ReactPointerEvent<SVGGElement>) => void;
  onElementPointerUp: (event: ReactPointerEvent<SVGGElement>) => void;
};

type AmenityKind =
  | "GATE"
  | "POOL"
  | "PARKING"
  | "TENNIS"
  | "BASKETBALL"
  | "SPORT"
  | "PLAYGROUND"
  | "LANDSCAPE"
  | "WALKWAY"
  | "PAVILION";

function normalizeToken(value?: string) {
  return String(value || "")
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I")
    .replace(/Ş/g, "S")
    .replace(/Ğ/g, "G")
    .replace(/Ü/g, "U")
    .replace(/Ö/g, "O")
    .replace(/Ç/g, "C");
}

function amenityKind(element: ProjectSceneElement): AmenityKind {
  const token = `${normalizeToken(element.spaceType)} ${normalizeToken(element.name)}`;

  if (
    token.includes("GIRIS_KAPISI") ||
    token.includes("KAPI KEMERI") ||
    token.includes("SITE_GATE") ||
    token.includes("GATE_ARCH")
  ) {
    return "GATE";
  }
  if (token.includes("HAVUZ")) return "POOL";
  if (token.includes("OTOPARK")) return "PARKING";
  if (token.includes("TENIS")) return "TENNIS";
  if (token.includes("BASKET")) return "BASKETBALL";
  if (token.includes("SAHA") || token.includes("SPOR ALANI")) return "SPORT";
  if (token.includes("COCUK") && (token.includes("PARK") || token.includes("OYUN"))) {
    return "PLAYGROUND";
  }
  if (token.includes("YURUYUS")) return "WALKWAY";
  if (
    token.includes("PEYZAJ") ||
    token.includes("BAHCE") ||
    token.includes("DINLENME") ||
    token.includes("PARK")
  ) {
    return "LANDSCAPE";
  }

  return "PAVILION";
}

function polygonPoints(points: Point[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function centerOf(points: Point[]): Point {
  if (!points.length) return { x: 0, y: 0 };
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function scalePolygon(points: Point[], factor: number) {
  const center = centerOf(points);
  return points.map((point) => ({
    x: center.x + (point.x - center.x) * factor,
    y: center.y + (point.y - center.y) * factor,
  }));
}

function rotateLocal(element: ProjectSceneElement, point: WorldPoint): WorldPoint {
  const angle = (element.rotationY * Math.PI) / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);

  return {
    x: element.position[0] + point.x * cosine - point.z * sine,
    z: element.position[2] + point.x * sine + point.z * cosine,
  };
}

function projectLocal(
  element: ProjectSceneElement,
  point: WorldPoint,
  height: number,
  sceneMetrics: SceneMetrics,
  toIso: (worldX: number, worldZ: number) => Point,
): Point {
  const world = rotateLocal(element, point);
  const projected = toIso(world.x, world.z);
  return {
    x: projected.x,
    y: projected.y - height * sceneMetrics.heightScale,
  };
}

function projectShape(
  element: ProjectSceneElement,
  points: WorldPoint[],
  height: number,
  sceneMetrics: SceneMetrics,
  toIso: (worldX: number, worldZ: number) => Point,
) {
  return points.map((point) =>
    projectLocal(element, point, height, sceneMetrics, toIso),
  );
}

function rectangle(width: number, depth: number): WorldPoint[] {
  return [
    { x: -width / 2, z: -depth / 2 },
    { x: width / 2, z: -depth / 2 },
    { x: width / 2, z: depth / 2 },
    { x: -width / 2, z: depth / 2 },
  ];
}

function chamferedRectangle(width: number, depth: number): WorldPoint[] {
  const cut = Math.min(width, depth) * 0.14;
  return [
    { x: -width / 2 + cut, z: -depth / 2 },
    { x: width / 2 - cut, z: -depth / 2 },
    { x: width / 2, z: -depth / 2 + cut },
    { x: width / 2, z: depth / 2 - cut },
    { x: width / 2 - cut, z: depth / 2 },
    { x: -width / 2 + cut, z: depth / 2 },
    { x: -width / 2, z: depth / 2 - cut },
    { x: -width / 2, z: -depth / 2 + cut },
  ];
}

function ellipsePoints(width: number, depth: number, count = 16): WorldPoint[] {
  return Array.from({ length: count }).map((_, index) => {
    const angle = (Math.PI * 2 * index) / count;
    return {
      x: Math.cos(angle) * width * 0.5,
      z: Math.sin(angle) * depth * 0.5,
    };
  });
}

function organicPoints(width: number, depth: number, count = 14): WorldPoint[] {
  return Array.from({ length: count }).map((_, index) => {
    const angle = (Math.PI * 2 * index) / count;
    const pulse = index % 2 === 0 ? 1 : 0.82;
    return {
      x: Math.cos(angle) * width * 0.5 * pulse,
      z: Math.sin(angle) * depth * 0.5 * (index % 3 === 0 ? 0.88 : 1),
    };
  });
}

function labelText(value: string, max = 24) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function renderSelectedLabel(
  element: ProjectSceneElement,
  anchor: Point,
  selected: boolean,
  showLabels: boolean,
) {
  if (!selected || !showLabels || amenityKind(element) === "GATE") return null;

  const width = Math.min(190, Math.max(100, element.name.length * 7.2));
  return (
    <g pointerEvents="none">
      <rect
        x={anchor.x - width / 2}
        y={anchor.y - 36}
        width={width}
        height="27"
        rx="13.5"
        fill="#0f172a"
        stroke="#60a5fa"
        strokeWidth="1.3"
      />
      <text
        x={anchor.x}
        y={anchor.y - 18}
        textAnchor="middle"
        fill="#ffffff"
        fontSize="11"
        fontWeight="850"
      >
        {labelText(element.name)}
      </text>
    </g>
  );
}

function renderPool(
  element: ProjectSceneElement,
  selected: boolean,
  sceneMetrics: SceneMetrics,
  toIso: (worldX: number, worldZ: number) => Point,
) {
  const width = Math.max(10, element.size.width);
  const depth = Math.max(7, element.size.depth);
  const deck = projectShape(
    element,
    chamferedRectangle(width, depth),
    0.18,
    sceneMetrics,
    toIso,
  );
  const water = scalePolygon(deck, 0.78);
  const center = centerOf(water);
  const bounds = {
    width: Math.max(...water.map((point) => point.x)) - Math.min(...water.map((point) => point.x)),
    height: Math.max(...water.map((point) => point.y)) - Math.min(...water.map((point) => point.y)),
  };

  return (
    <>
      <polygon
        points={polygonPoints(deck)}
        fill="#f8fafc"
        stroke={selected ? "#1d4ed8" : "#cbd5e1"}
        strokeWidth={selected ? 2.8 : 1.6}
      />
      <polygon
        points={polygonPoints(water)}
        fill="#38bdf8"
        stroke="#e0f2fe"
        strokeWidth="2.4"
      />
      {[-0.2, 0, 0.2].map((offset) => (
        <path
          key={offset}
          d={`M ${center.x - bounds.width * 0.28} ${center.y + bounds.height * offset} Q ${center.x} ${center.y - 5 + bounds.height * offset} ${center.x + bounds.width * 0.28} ${center.y + bounds.height * offset}`}
          fill="none"
          stroke="rgba(255,255,255,0.82)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ))}
      <g stroke="#64748b" strokeWidth="2" fill="none">
        <path d={`M ${center.x + bounds.width * 0.28} ${center.y - 4} v 15`} />
        <path d={`M ${center.x + bounds.width * 0.34} ${center.y - 2} v 15`} />
        <path d={`M ${center.x + bounds.width * 0.28} ${center.y + 6} h ${bounds.width * 0.06}`} />
      </g>
      {[-0.38, 0.38].map((side) => (
        <g key={side} transform={`translate(${center.x + bounds.width * side} ${center.y - bounds.height * 0.58})`}>
          <rect x="-11" y="-3" width="22" height="6" rx="2" fill="#f8fafc" stroke="#94a3b8" />
          <line x1="-8" y1="3" x2="-11" y2="8" stroke="#64748b" strokeWidth="1.5" />
          <line x1="8" y1="3" x2="11" y2="8" stroke="#64748b" strokeWidth="1.5" />
        </g>
      ))}
    </>
  );
}

function renderParking(
  element: ProjectSceneElement,
  selected: boolean,
  sceneMetrics: SceneMetrics,
  toIso: (worldX: number, worldZ: number) => Point,
) {
  const width = Math.max(12, element.size.width);
  const depth = Math.max(8, element.size.depth);
  const surface = projectShape(element, rectangle(width, depth), 0.12, sceneMetrics, toIso);
  const stallCount = Math.max(4, Math.min(10, Math.round(width / 2.8)));
  const carColors = ["#0ea5e9", "#f8fafc", "#ef4444", "#64748b"];

  return (
    <>
      <polygon
        points={polygonPoints(surface)}
        fill="#475569"
        stroke={selected ? "#1d4ed8" : "#cbd5e1"}
        strokeWidth={selected ? 2.8 : 1.5}
      />
      {Array.from({ length: stallCount + 1 }).map((_, index) => {
        const x = -width / 2 + (width * index) / stallCount;
        const start = projectLocal(element, { x, z: -depth / 2 + 0.8 }, 0.18, sceneMetrics, toIso);
        const end = projectLocal(element, { x, z: -0.7 }, 0.18, sceneMetrics, toIso);
        const start2 = projectLocal(element, { x, z: 0.7 }, 0.18, sceneMetrics, toIso);
        const end2 = projectLocal(element, { x, z: depth / 2 - 0.8 }, 0.18, sceneMetrics, toIso);
        return (
          <g key={`parking-stall-${index}`} stroke="#f8fafc" strokeWidth="1.2" opacity="0.86">
            <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
            <line x1={start2.x} y1={start2.y} x2={end2.x} y2={end2.y} />
          </g>
        );
      })}
      <line
        x1={projectLocal(element, { x: -width / 2 + 1, z: 0 }, 0.2, sceneMetrics, toIso).x}
        y1={projectLocal(element, { x: -width / 2 + 1, z: 0 }, 0.2, sceneMetrics, toIso).y}
        x2={projectLocal(element, { x: width / 2 - 1, z: 0 }, 0.2, sceneMetrics, toIso).x}
        y2={projectLocal(element, { x: width / 2 - 1, z: 0 }, 0.2, sceneMetrics, toIso).y}
        stroke="#fbbf24"
        strokeWidth="1.4"
        strokeDasharray="6 5"
      />
      {[1, 3, 5].filter((index) => index < stallCount).map((index, carIndex) => {
        const x = -width / 2 + (width * (index + 0.5)) / stallCount;
        const car = projectShape(
          element,
          [
            { x: x - 0.8, z: -depth * 0.34 },
            { x: x + 0.8, z: -depth * 0.34 },
            { x: x + 0.8, z: -depth * 0.15 },
            { x: x - 0.8, z: -depth * 0.15 },
          ],
          0.35,
          sceneMetrics,
          toIso,
        );
        return (
          <polygon
            key={`parking-car-${index}`}
            points={polygonPoints(car)}
            fill={carColors[carIndex % carColors.length]}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        );
      })}
    </>
  );
}

function renderCourt(
  element: ProjectSceneElement,
  kind: "TENNIS" | "BASKETBALL" | "SPORT",
  selected: boolean,
  sceneMetrics: SceneMetrics,
  toIso: (worldX: number, worldZ: number) => Point,
) {
  const width = Math.max(13, element.size.width);
  const depth = Math.max(8, element.size.depth);
  const surface = projectShape(element, rectangle(width, depth), 0.14, sceneMetrics, toIso);
  const inner = scalePolygon(surface, 0.86);
  const center = centerOf(surface);
  const left = projectLocal(element, { x: -width * 0.43, z: 0 }, 0.22, sceneMetrics, toIso);
  const right = projectLocal(element, { x: width * 0.43, z: 0 }, 0.22, sceneMetrics, toIso);
  const fill = kind === "TENNIS" ? "#16a34a" : kind === "BASKETBALL" ? "#c2410c" : "#0284c7";

  return (
    <>
      <polygon
        points={polygonPoints(surface)}
        fill={fill}
        stroke={selected ? "#1d4ed8" : "#f8fafc"}
        strokeWidth={selected ? 2.8 : 2}
      />
      <polygon points={polygonPoints(inner)} fill="none" stroke="#ffffff" strokeWidth="1.7" />
      <line x1={left.x} y1={left.y} x2={right.x} y2={right.y} stroke="#ffffff" strokeWidth="1.5" />
      {kind === "TENNIS" && (
        <g>
          <line x1={center.x - 2} y1={center.y - 14} x2={center.x - 2} y2={center.y + 13} stroke="#f8fafc" strokeWidth="1.4" />
          <line x1={center.x + 2} y1={center.y - 14} x2={center.x + 2} y2={center.y + 13} stroke="#f8fafc" strokeWidth="1.4" />
          <line x1={center.x - 2} y1={center.y - 9} x2={center.x + 2} y2={center.y - 9} stroke="#cbd5e1" />
          <line x1={center.x - 2} y1={center.y - 3} x2={center.x + 2} y2={center.y - 3} stroke="#cbd5e1" />
          <line x1={center.x - 2} y1={center.y + 3} x2={center.x + 2} y2={center.y + 3} stroke="#cbd5e1" />
          <line x1={center.x - 2} y1={center.y + 9} x2={center.x + 2} y2={center.y + 9} stroke="#cbd5e1" />
        </g>
      )}
      {kind === "BASKETBALL" && (
        <g fill="none" stroke="#ffffff" strokeWidth="1.5">
          <ellipse cx={center.x} cy={center.y} rx="13" ry="6" />
          <path d={`M ${left.x + 8} ${left.y - 8} Q ${left.x + 24} ${left.y} ${left.x + 8} ${left.y + 8}`} />
          <path d={`M ${right.x - 8} ${right.y - 8} Q ${right.x - 24} ${right.y} ${right.x - 8} ${right.y + 8}`} />
          <circle cx={left.x + 2} cy={left.y - 10} r="3" />
          <circle cx={right.x - 2} cy={right.y - 10} r="3" />
        </g>
      )}
    </>
  );
}

function renderPlayground(
  element: ProjectSceneElement,
  selected: boolean,
  sceneMetrics: SceneMetrics,
  toIso: (worldX: number, worldZ: number) => Point,
) {
  const width = Math.max(10, element.size.width);
  const depth = Math.max(8, element.size.depth);
  const base = projectShape(element, organicPoints(width, depth), 0.14, sceneMetrics, toIso);
  const slideTop = projectLocal(element, { x: -1.8, z: -0.8 }, 2.6, sceneMetrics, toIso);
  const slideBottom = projectLocal(element, { x: 2.2, z: 1.2 }, 0.25, sceneMetrics, toIso);
  const swingLeft = projectLocal(element, { x: -width * 0.3, z: depth * 0.2 }, 2.3, sceneMetrics, toIso);
  const swingRight = projectLocal(element, { x: width * 0.05, z: depth * 0.2 }, 2.3, sceneMetrics, toIso);

  return (
    <>
      <polygon
        points={polygonPoints(base)}
        fill="#f59e0b"
        stroke={selected ? "#1d4ed8" : "#fde68a"}
        strokeWidth={selected ? 2.8 : 2}
      />
      <circle cx={slideTop.x} cy={slideTop.y} r="8" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
      <path
        d={`M ${slideTop.x + 5} ${slideTop.y + 4} Q ${(slideTop.x + slideBottom.x) / 2} ${(slideTop.y + slideBottom.y) / 2 - 7} ${slideBottom.x} ${slideBottom.y}`}
        fill="none"
        stroke="#38bdf8"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <g stroke="#475569" strokeWidth="2" fill="none">
        <line x1={swingLeft.x} y1={swingLeft.y} x2={swingLeft.x - 8} y2={swingLeft.y + 27} />
        <line x1={swingRight.x} y1={swingRight.y} x2={swingRight.x + 8} y2={swingRight.y + 27} />
        <line x1={swingLeft.x} y1={swingLeft.y} x2={swingRight.x} y2={swingRight.y} />
        <line x1={(swingLeft.x + swingRight.x) / 2} y1={swingLeft.y} x2={(swingLeft.x + swingRight.x) / 2} y2={swingLeft.y + 19} />
      </g>
      <rect
        x={(swingLeft.x + swingRight.x) / 2 - 5}
        y={swingLeft.y + 18}
        width="10"
        height="4"
        rx="2"
        fill="#ef4444"
      />
    </>
  );
}

function renderLandscapeAmenity(
  element: ProjectSceneElement,
  kind: "LANDSCAPE" | "WALKWAY",
  selected: boolean,
  sceneMetrics: SceneMetrics,
  toIso: (worldX: number, worldZ: number) => Point,
) {
  const width = Math.max(9, element.size.width);
  const depth = Math.max(7, element.size.depth);
  const base = projectShape(
    element,
    kind === "WALKWAY" ? chamferedRectangle(width, depth) : organicPoints(width, depth),
    0.1,
    sceneMetrics,
    toIso,
  );
  const center = centerOf(base);
  const treeOffsets: WorldPoint[] = [
    { x: -width * 0.25, z: -depth * 0.18 },
    { x: width * 0.18, z: -depth * 0.2 },
    { x: width * 0.28, z: depth * 0.18 },
  ];

  return (
    <>
      <polygon
        points={polygonPoints(base)}
        fill={kind === "WALKWAY" ? "#d6d3d1" : "#86efac"}
        stroke={selected ? "#1d4ed8" : "#15803d"}
        strokeWidth={selected ? 2.8 : 1.8}
      />
      {kind === "WALKWAY" ? (
        <path
          d={`M ${center.x - 34} ${center.y + 7} Q ${center.x - 8} ${center.y - 18} ${center.x + 34} ${center.y - 5}`}
          fill="none"
          stroke="#f8fafc"
          strokeWidth="7"
          strokeLinecap="round"
        />
      ) : (
        <>
          {treeOffsets.map((offset, index) => {
            const point = projectLocal(element, offset, 0.2, sceneMetrics, toIso);
            return (
              <g key={`amenity-tree-${index}`} transform={`translate(${point.x} ${point.y})`}>
                <rect x="-1.4" y="-15" width="2.8" height="16" rx="1" fill="#713f12" />
                <circle cx="0" cy="-19" r="8" fill="#15803d" />
                <circle cx="-3" cy="-22" r="4.5" fill="#86efac" />
              </g>
            );
          })}
          <g transform={`translate(${center.x} ${center.y})`}>
            <rect x="-17" y="-20" width="34" height="5" rx="2" fill="#92400e" />
            <line x1="-14" y1="-15" x2="-17" y2="2" stroke="#78350f" strokeWidth="2" />
            <line x1="14" y1="-15" x2="17" y2="2" stroke="#78350f" strokeWidth="2" />
            <line x1="-17" y1="-10" x2="17" y2="-10" stroke="#fef3c7" strokeWidth="2" />
          </g>
        </>
      )}
    </>
  );
}

function renderGate(
  element: ProjectSceneElement,
  selected: boolean,
  sceneMetrics: SceneMetrics,
  toIso: (worldX: number, worldZ: number) => Point,
) {
  const width = Math.max(16, element.size.width);
  const depth = Math.max(5, element.size.depth);
  const gateHeight = Math.max(4.2, element.size.height || 5.2);
  const road = projectShape(element, rectangle(width * 1.35, depth), 0.06, sceneMetrics, toIso);
  const leftBase = projectLocal(element, { x: -width * 0.42, z: 0 }, 0, sceneMetrics, toIso);
  const rightBase = projectLocal(element, { x: width * 0.42, z: 0 }, 0, sceneMetrics, toIso);
  const leftBeam = projectLocal(element, { x: -width * 0.42, z: 0 }, gateHeight * 0.68, sceneMetrics, toIso);
  const rightBeam = projectLocal(element, { x: width * 0.42, z: 0 }, gateHeight * 0.68, sceneMetrics, toIso);
  const leftTop = projectLocal(element, { x: -width * 0.42, z: 0 }, gateHeight, sceneMetrics, toIso);
  const rightTop = projectLocal(element, { x: width * 0.42, z: 0 }, gateHeight, sceneMetrics, toIso);
  const archCenter = {
    x: (leftTop.x + rightTop.x) / 2,
    y: (leftTop.y + rightTop.y) / 2 - 14,
  };
  const titleCenter = {
    x: (leftBeam.x + rightBeam.x) / 2,
    y: (leftBeam.y + rightBeam.y) / 2 - 7,
  };
  const projectName = labelText(element.projectName || element.name, 28);
  const booth = projectShape(
    element,
    rectangle(Math.max(3.5, width * 0.2), Math.max(3, depth * 0.72)).map((point) => ({
      x: point.x + width * 0.52,
      z: point.z,
    })),
    0.12,
    sceneMetrics,
    toIso,
  );
  const boothTop = booth.map((point) => ({ x: point.x, y: point.y - 18 }));
  const barrierStart = projectLocal(element, { x: -width * 0.23, z: depth * 0.18 }, 0.7, sceneMetrics, toIso);
  const barrierEnd = projectLocal(element, { x: width * 0.22, z: depth * 0.18 }, 0.7, sceneMetrics, toIso);

  return (
    <>
      <polygon
        points={polygonPoints(road)}
        fill="#475569"
        stroke={selected ? "#1d4ed8" : "#94a3b8"}
        strokeWidth={selected ? 3 : 1.8}
      />
      <line
        x1={projectLocal(element, { x: -width * 0.62, z: 0 }, 0.1, sceneMetrics, toIso).x}
        y1={projectLocal(element, { x: -width * 0.62, z: 0 }, 0.1, sceneMetrics, toIso).y}
        x2={projectLocal(element, { x: width * 0.62, z: 0 }, 0.1, sceneMetrics, toIso).x}
        y2={projectLocal(element, { x: width * 0.62, z: 0 }, 0.1, sceneMetrics, toIso).y}
        stroke="#fbbf24"
        strokeWidth="1.5"
        strokeDasharray="8 5"
      />

      {[{ base: leftBase, top: leftTop }, { base: rightBase, top: rightTop }].map((column, index) => (
        <g key={`gate-column-${index}`}>
          <polygon
            points={polygonPoints([
              { x: column.base.x - 7, y: column.base.y },
              { x: column.base.x + 7, y: column.base.y },
              { x: column.top.x + 6, y: column.top.y },
              { x: column.top.x - 6, y: column.top.y },
            ])}
            fill="#f8fafc"
            stroke="#1e3a8a"
            strokeWidth="1.8"
          />
          <rect x={column.top.x - 8} y={column.top.y - 4} width="16" height="7" rx="2" fill="#1e3a8a" />
        </g>
      ))}

      <path
        d={`M ${leftBeam.x - 6} ${leftBeam.y} L ${leftTop.x - 6} ${leftTop.y} Q ${archCenter.x} ${archCenter.y} ${rightTop.x + 6} ${rightTop.y} L ${rightBeam.x + 6} ${rightBeam.y} Z`}
        fill="#1e3a8a"
        stroke="#fbbf24"
        strokeWidth="2.2"
      />
      <path
        d={`M ${leftTop.x + 3} ${leftTop.y + 6} Q ${archCenter.x} ${archCenter.y + 10} ${rightTop.x - 3} ${rightTop.y + 6}`}
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.4"
        opacity="0.8"
      />
      <text
        x={titleCenter.x}
        y={titleCenter.y}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={projectName.length > 21 ? "9" : "11"}
        fontWeight="900"
        letterSpacing="0.4"
        paintOrder="stroke"
        stroke="#1e3a8a"
        strokeWidth="2"
      >
        {projectName}
      </text>

      <polygon points={polygonPoints(booth)} fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1.4" />
      <polygon points={polygonPoints(boothTop)} fill="#f8fafc" stroke="#1d4ed8" strokeWidth="1.4" />
      <rect
        x={centerOf(boothTop).x - 7}
        y={centerOf(boothTop).y + 8}
        width="14"
        height="8"
        rx="2"
        fill="#38bdf8"
        opacity="0.9"
      />
      <line x1={barrierStart.x} y1={barrierStart.y} x2={barrierEnd.x} y2={barrierEnd.y} stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
      <line x1={barrierStart.x} y1={barrierStart.y} x2={barrierEnd.x} y2={barrierEnd.y} stroke="#ffffff" strokeWidth="1.2" strokeDasharray="7 6" />
      <circle cx={barrierStart.x} cy={barrierStart.y} r="4" fill="#334155" />
    </>
  );
}

function renderPavilion(
  element: ProjectSceneElement,
  selected: boolean,
  sceneMetrics: SceneMetrics,
  toIso: (worldX: number, worldZ: number) => Point,
) {
  const width = Math.max(8, element.size.width);
  const depth = Math.max(6, element.size.depth);
  const height = Math.max(2.5, Math.min(5.5, element.size.height || 3.5));
  const ground = projectShape(element, rectangle(width, depth), 0, sceneMetrics, toIso);
  const top = projectShape(element, rectangle(width, depth), height, sceneMetrics, toIso);
  const faces = ground.map((point, index) => {
    const next = (index + 1) % ground.length;
    return [point, ground[next], top[next], top[index]];
  });

  return (
    <>
      {faces.map((face, index) => (
        <polygon
          key={`pavilion-face-${index}`}
          points={polygonPoints(face)}
          fill={index % 2 === 0 ? "#e2e8f0" : "#cbd5e1"}
          stroke={selected ? "#1d4ed8" : "#94a3b8"}
          strokeWidth={selected ? 2.5 : 1.2}
        />
      ))}
      <polygon points={polygonPoints(top)} fill="#f8fafc" stroke={selected ? "#1d4ed8" : "#64748b"} strokeWidth="1.6" />
      <polygon points={polygonPoints(scalePolygon(top, 0.75))} fill="#dbeafe" stroke="#60a5fa" strokeWidth="1.2" />
      <text
        x={centerOf(top).x}
        y={centerOf(top).y + 4}
        textAnchor="middle"
        fill="#1e3a8a"
        fontSize="9"
        fontWeight="850"
      >
        {labelText(element.name, 16)}
      </text>
    </>
  );
}

export default function AmenityGeometry({
  element,
  selected,
  dragElementId,
  viewMode,
  sceneMetrics,
  toIso,
  showLabels,
  onElementPointerDown,
  onElementPointerMove,
  onElementPointerUp,
}: AmenityGeometryProps) {
  const kind = amenityKind(element);
  const anchor = projectLocal(element, { x: 0, z: 0 }, 0, sceneMetrics, toIso);
  const presentation = viewMode === "PRESENTATION";
  const opacity = viewMode === "FOCUS" && !selected ? 0.58 : 1;

  return (
    <g
      role="button"
      aria-label={element.name}
      tabIndex={0}
      opacity={opacity}
      onPointerDown={(event) => onElementPointerDown(event, element)}
      onPointerMove={onElementPointerMove}
      onPointerUp={onElementPointerUp}
      onPointerCancel={onElementPointerUp}
      style={{
        cursor: dragElementId === element.id ? "grabbing" : presentation ? "pointer" : "grab",
        transition: "opacity 180ms ease",
      }}
    >
      <ellipse
        cx={anchor.x}
        cy={anchor.y + 9}
        rx={Math.max(18, element.size.width * 2.1)}
        ry={Math.max(6, element.size.depth * 0.55)}
        fill="rgba(15,23,42,0.12)"
        pointerEvents="none"
      />

      {kind === "GATE" && renderGate(element, selected, sceneMetrics, toIso)}
      {kind === "POOL" && renderPool(element, selected, sceneMetrics, toIso)}
      {kind === "PARKING" && renderParking(element, selected, sceneMetrics, toIso)}
      {(kind === "TENNIS" || kind === "BASKETBALL" || kind === "SPORT") &&
        renderCourt(element, kind, selected, sceneMetrics, toIso)}
      {kind === "PLAYGROUND" && renderPlayground(element, selected, sceneMetrics, toIso)}
      {(kind === "LANDSCAPE" || kind === "WALKWAY") &&
        renderLandscapeAmenity(element, kind, selected, sceneMetrics, toIso)}
      {kind === "PAVILION" && renderPavilion(element, selected, sceneMetrics, toIso)}

      {renderSelectedLabel(element, anchor, selected, showLabels)}
    </g>
  );
}
