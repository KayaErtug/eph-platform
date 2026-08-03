"use client";

import type { PointerEvent as ReactPointerEvent } from "react";

import LandscapeLayer from "./LandscapeLayer";
import type { ProjectSceneData, ProjectSceneElement } from "./projectSceneTypes";
import { resolveFacadePalette } from "./sceneStylePresets";

export type SceneViewMode = "SITE" | "FOCUS" | "PRESENTATION";

type Point = { x: number; y: number };
type WorldPoint = { x: number; z: number };

type ScenePalette = {
  top?: string;
  side?: string;
  edge?: string;
  accent?: string;
  roof?: string;
  roofInset?: string;
  facadeFront?: string;
  facadeSide?: string;
  facadeBack?: string;
  frame?: string;
  glass?: string;
};

type SceneMetrics = {
  centerX: number;
  centerY: number;
  scaleX: number;
  scaleY: number;
  heightScale: number;
};

type PremiumProjectSceneProps = {
  sceneData: ProjectSceneData;
  selectedId: string | null;
  dragElementId: string | null;
  viewMode: SceneViewMode;
  sceneMetrics: SceneMetrics;
  toIso: (worldX: number, worldZ: number) => Point;
  onClearSelection: () => void;
  onElementPointerDown: (
    event: ReactPointerEvent<SVGGElement>,
    element: ProjectSceneElement,
  ) => void;
  onElementPointerMove: (event: ReactPointerEvent<SVGGElement>) => void;
  onElementPointerUp: (event: ReactPointerEvent<SVGGElement>) => void;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function polygonPoints(items: Point[]) {
  return items.map((item) => `${item.x},${item.y}`).join(" ");
}

function centerOf(items: Point[]): Point {
  if (!items.length) return { x: 0, y: 0 };

  return {
    x: items.reduce((total, item) => total + item.x, 0) / items.length,
    y: items.reduce((total, item) => total + item.y, 0) / items.length,
  };
}

function scalePolygon(items: Point[], factor: number): Point[] {
  const center = centerOf(items);

  return items.map((item) => ({
    x: center.x + (item.x - center.x) * factor,
    y: center.y + (item.y - center.y) * factor,
  }));
}

function geometryFootprint(element: ProjectSceneElement): WorldPoint[] {
  const halfWidth = Math.max(2, element.size.width / 2);
  const halfDepth = Math.max(2, element.size.depth / 2);
  const geometry = String(element.geometryType || "DIKDORTGEN").toUpperCase();

  if (geometry.includes("L")) {
    return [
      { x: -halfWidth, z: -halfDepth },
      { x: halfWidth, z: -halfDepth },
      { x: halfWidth, z: -halfDepth * 0.08 },
      { x: halfWidth * 0.08, z: -halfDepth * 0.08 },
      { x: halfWidth * 0.08, z: halfDepth },
      { x: -halfWidth, z: halfDepth },
    ];
  }

  if (geometry.includes("U")) {
    return [
      { x: -halfWidth, z: -halfDepth },
      { x: halfWidth, z: -halfDepth },
      { x: halfWidth, z: halfDepth },
      { x: halfWidth * 0.35, z: halfDepth },
      { x: halfWidth * 0.35, z: -halfDepth * 0.15 },
      { x: -halfWidth * 0.35, z: -halfDepth * 0.15 },
      { x: -halfWidth * 0.35, z: halfDepth },
      { x: -halfWidth, z: halfDepth },
    ];
  }

  if (geometry.includes("T")) {
    return [
      { x: -halfWidth, z: -halfDepth },
      { x: halfWidth, z: -halfDepth },
      { x: halfWidth, z: -halfDepth * 0.2 },
      { x: halfWidth * 0.28, z: -halfDepth * 0.2 },
      { x: halfWidth * 0.28, z: halfDepth },
      { x: -halfWidth * 0.28, z: halfDepth },
      { x: -halfWidth * 0.28, z: -halfDepth * 0.2 },
      { x: -halfWidth, z: -halfDepth * 0.2 },
    ];
  }

  if (geometry.includes("KARE")) {
    const half = Math.min(halfWidth, halfDepth);
    return [
      { x: -half, z: -half },
      { x: half, z: -half },
      { x: half, z: half },
      { x: -half, z: half },
    ];
  }

  return [
    { x: -halfWidth, z: -halfDepth },
    { x: halfWidth, z: -halfDepth },
    { x: halfWidth, z: halfDepth },
    { x: -halfWidth, z: halfDepth },
  ];
}

function transformFootprint(
  element: ProjectSceneElement,
  localPoints: WorldPoint[],
): WorldPoint[] {
  const angle = (element.rotationY * Math.PI) / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);

  return localPoints.map((point) => ({
    x: element.position[0] + point.x * cosine - point.z * sine,
    z: element.position[2] + point.x * sine + point.z * cosine,
  }));
}

function amenityPalette(spaceType?: string): ScenePalette {
  const type = String(spaceType || "").toUpperCase();

  if (type.includes("HAVUZ")) {
    return {
      top: "#38bdf8",
      side: "#0284c7",
      edge: "#e0f2fe",
      accent: "#ffffff",
    };
  }

  if (type.includes("OTOPARK")) {
    return {
      top: "#64748b",
      side: "#334155",
      edge: "#e2e8f0",
      accent: "#f8fafc",
    };
  }

  if (type.includes("BASKET") || type.includes("TENIS") || type.includes("SAHA")) {
    return {
      top: type.includes("TENIS") ? "#34d399" : "#fb923c",
      side: type.includes("TENIS") ? "#047857" : "#c2410c",
      edge: "#fff7ed",
      accent: "#ffffff",
    };
  }

  if (
    type.includes("BAHCE") ||
    type.includes("PEYZAJ") ||
    type.includes("PARK") ||
    type.includes("DINLENME")
  ) {
    return {
      top: "#4ade80",
      side: "#15803d",
      edge: "#dcfce7",
      accent: "#14532d",
    };
  }

  return {
    top: "#fbbf24",
    side: "#b45309",
    edge: "#fef3c7",
    accent: "#ffffff",
  };
}

function blockPalette(
  element: ProjectSceneElement,
  selected: boolean,
  presentation: boolean,
): ScenePalette {
  return resolveFacadePalette(element, { selected, presentation });
}

function renderAmenityMarkings(
  element: ProjectSceneElement,
  top: Point[],
  clipId: string,
) {
  const type = String(element.spaceType || "").toUpperCase();
  const center = centerOf(top);
  const width = Math.max(...top.map((point) => point.x)) - Math.min(...top.map((point) => point.x));
  const height = Math.max(...top.map((point) => point.y)) - Math.min(...top.map((point) => point.y));

  if (type.includes("HAVUZ")) {
    return (
      <g clipPath={`url(#${clipId})`} opacity="0.9" pointerEvents="none">
        {[-0.18, 0, 0.18].map((offset) => (
          <path
            key={offset}
            d={`M ${center.x - width * 0.32} ${center.y + height * offset} Q ${center.x} ${center.y - 5 + height * offset} ${center.x + width * 0.32} ${center.y + height * offset}`}
            fill="none"
            stroke="#e0f2fe"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ))}
      </g>
    );
  }

  if (type.includes("OTOPARK")) {
    return (
      <g clipPath={`url(#${clipId})`} stroke="#f8fafc" strokeWidth="1.5" opacity="0.85" pointerEvents="none">
        {[-0.3, -0.1, 0.1, 0.3].map((offset) => (
          <line
            key={offset}
            x1={center.x + width * offset}
            y1={center.y - height * 0.42}
            x2={center.x + width * (offset + 0.12)}
            y2={center.y + height * 0.42}
          />
        ))}
      </g>
    );
  }

  if (type.includes("BASKET") || type.includes("TENIS") || type.includes("SAHA")) {
    return (
      <g clipPath={`url(#${clipId})`} fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" pointerEvents="none">
        <polygon points={polygonPoints(scalePolygon(top, 0.76))} />
        <line
          x1={center.x - width * 0.36}
          y1={center.y}
          x2={center.x + width * 0.36}
          y2={center.y}
        />
        <ellipse cx={center.x} cy={center.y} rx={width * 0.1} ry={Math.max(3, height * 0.14)} />
      </g>
    );
  }

  if (
    type.includes("BAHCE") ||
    type.includes("PEYZAJ") ||
    type.includes("PARK") ||
    type.includes("DINLENME")
  ) {
    return (
      <g clipPath={`url(#${clipId})`} pointerEvents="none">
        {[
          [-0.22, -0.12, 6],
          [0.05, 0.14, 5],
          [0.27, -0.08, 4],
        ].map(([xOffset, yOffset, radius], index) => (
          <g key={index}>
            <circle
              cx={center.x + width * xOffset}
              cy={center.y + height * yOffset}
              r={radius}
              fill="#166534"
              opacity="0.9"
            />
            <circle
              cx={center.x + width * xOffset - 2}
              cy={center.y + height * yOffset - 2}
              r={radius * 0.55}
              fill="#86efac"
              opacity="0.95"
            />
          </g>
        ))}
      </g>
    );
  }

  return null;
}

export default function PremiumProjectScene({
  sceneData,
  selectedId,
  dragElementId,
  viewMode,
  sceneMetrics,
  toIso,
  onClearSelection,
  onElementPointerDown,
  onElementPointerMove,
  onElementPointerUp,
}: PremiumProjectSceneProps) {
  const halfPlotWidth = sceneData.plot.width / 2;
  const halfPlotDepth = sceneData.plot.depth / 2;
  const plotPoints = [
    toIso(-halfPlotWidth, -halfPlotDepth),
    toIso(halfPlotWidth, -halfPlotDepth),
    toIso(halfPlotWidth, halfPlotDepth),
    toIso(-halfPlotWidth, halfPlotDepth),
  ];
  const innerPlotPoints = scalePolygon(plotPoints, 0.94);
  const selectedElement =
    sceneData.elements.find((element) => element.id === selectedId) || null;
  const focusedBlockId =
    viewMode === "FOCUS" && selectedElement?.type === "BLOCK"
      ? selectedElement.id
      : null;
  const sortedElements = [...sceneData.elements].sort(
    (first, second) =>
      first.position[0] + first.position[2] -
      (second.position[0] + second.position[2]),
  );

  const renderElement = (element: ProjectSceneElement) => {
    const selected = selectedId === element.id;
    const isBlock = element.type === "BLOCK";
    const localFootprint = geometryFootprint(element);
    const worldFootprint = transformFootprint(element, localFootprint);
    const ground = worldFootprint.map((point) => toIso(point.x, point.z));
    const visualHeight = isBlock
      ? clamp(element.size.height * sceneMetrics.heightScale, 36, 230)
      : clamp(element.size.height * sceneMetrics.heightScale, 5, 12);
    const top = ground.map((point) => ({ x: point.x, y: point.y - visualHeight }));
    const roofThickness = isBlock ? 7 : 3;
    const roofTop = top.map((point) => ({ x: point.x, y: point.y - roofThickness }));
    const roofInset = scalePolygon(roofTop, isBlock ? 0.86 : 0.92);
    const clipId = `scene-shape-${element.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
    const labelPoint = centerOf(roofTop);
    const palette = isBlock
      ? blockPalette(element, selected, viewMode === "PRESENTATION")
      : amenityPalette(element.spaceType);
    const dimmed = Boolean(focusedBlockId && element.id !== focusedBlockId);
    const elementOpacity = dimmed ? (isBlock ? 0.24 : 0.12) : 1;
    const faces = ground
      .map((point, index) => {
        const nextIndex = (index + 1) % ground.length;
        return {
          index,
          nextIndex,
          averageY: (point.y + ground[nextIndex].y) / 2,
          points: [point, ground[nextIndex], top[nextIndex], top[index]],
        };
      })
      .sort((first, second) => first.averageY - second.averageY);
    const frontThreshold = [...faces]
      .sort((first, second) => second.averageY - first.averageY)
      .slice(0, Math.max(1, Math.ceil(faces.length / 2)))
      .map((face) => face.index);
    const floorCount = Math.max(1, element.floorCount || 1);
    const visibleFloorCount = Math.min(floorCount, 24);
    const balconyStyle = element.facadeStyle?.balconyStyle || "GLASS";
    const verticalFins = element.facadeStyle?.verticalFins ?? false;
    const showLabel =
      sceneData.settings.showLabels &&
      (selected || (isBlock && viewMode === "SITE"));

    return (
      <g
        key={element.id}
        role="button"
        aria-label={element.name}
        tabIndex={0}
        opacity={elementOpacity}
        onPointerDown={(event) => onElementPointerDown(event, element)}
        onPointerMove={onElementPointerMove}
        onPointerUp={onElementPointerUp}
        onPointerCancel={onElementPointerUp}
        style={{
          cursor:
            dragElementId === element.id
              ? "grabbing"
              : viewMode === "PRESENTATION"
                ? "pointer"
                : "grab",
          transition: "opacity 180ms ease",
        }}
      >
        <defs>
          <clipPath id={clipId}>
            <polygon points={polygonPoints(roofTop)} />
          </clipPath>
        </defs>

        <polygon
          points={polygonPoints(scalePolygon(ground, isBlock ? 1.08 : 1.12))}
          fill="rgba(15,23,42,0.14)"
          transform="translate(0 7)"
          pointerEvents="none"
        />

        {faces.map((face, faceOrder) => {
          const isFront = frontThreshold.includes(face.index);
          const faceFill = isBlock
            ? isFront
              ? palette.facadeFront
              : faceOrder === 0
                ? palette.facadeBack
                : palette.facadeSide
            : palette.side;
          const edgeStart = ground[face.index];
          const edgeEnd = ground[face.nextIndex];
          const topStart = top[face.index];
          const topEnd = top[face.nextIndex];
          const edgeLength = Math.hypot(edgeEnd.x - edgeStart.x, edgeEnd.y - edgeStart.y);
          const columnCount = clamp(Math.round(edgeLength / 24), 2, 7);

          return (
            <g key={`${element.id}-face-${face.index}`}>
              <polygon
                points={polygonPoints(face.points)}
                fill={faceFill}
                stroke={selected ? "#1d4ed8" : palette.frame || palette.edge}
                strokeWidth={selected ? 2.8 : 1.35}
                strokeLinejoin="round"
              />

              {isBlock && (
                <g pointerEvents="none">
                  {Array.from({ length: visibleFloorCount }).map((_, floorIndex) => {
                    const ratio = (floorIndex + 1) / visibleFloorCount;
                    const first = {
                      x: edgeStart.x + (topStart.x - edgeStart.x) * ratio,
                      y: edgeStart.y + (topStart.y - edgeStart.y) * ratio,
                    };
                    const second = {
                      x: edgeEnd.x + (topEnd.x - edgeEnd.x) * ratio,
                      y: edgeEnd.y + (topEnd.y - edgeEnd.y) * ratio,
                    };
                    const balconyFloor = isFront && floorIndex % 2 === 0;

                    return (
                      <line
                        key={`${element.id}-face-${face.index}-floor-${floorIndex}`}
                        x1={first.x}
                        y1={first.y}
                        x2={second.x}
                        y2={second.y}
                        stroke={
                          balconyFloor
                            ? palette.frame || palette.accent
                            : "rgba(255,255,255,0.55)"
                        }
                        strokeWidth={
                          balconyFloor
                            ? balconyStyle === "FRAME"
                              ? 3.2
                              : balconyStyle === "SOLID"
                                ? 2.7
                                : 2.2
                            : 1
                        }
                      />
                    );
                  })}

                  {Array.from({ length: columnCount - 1 }).map((_, columnIndex) => {
                    const ratio = (columnIndex + 1) / columnCount;
                    const bottom = {
                      x: edgeStart.x + (edgeEnd.x - edgeStart.x) * ratio,
                      y: edgeStart.y + (edgeEnd.y - edgeStart.y) * ratio,
                    };
                    const upper = {
                      x: topStart.x + (topEnd.x - topStart.x) * ratio,
                      y: topStart.y + (topEnd.y - topStart.y) * ratio,
                    };

                    return (
                      <line
                        key={`${element.id}-face-${face.index}-column-${columnIndex}`}
                        x1={bottom.x}
                        y1={bottom.y}
                        x2={upper.x}
                        y2={upper.y}
                        stroke={verticalFins ? palette.accent : palette.glass}
                        strokeWidth={verticalFins ? 2.15 : 1.15}
                        opacity={verticalFins ? (isFront ? 0.9 : 0.58) : isFront ? 0.72 : 0.45}
                      />
                    );
                  })}
                </g>
              )}
            </g>
          );
        })}

        {roofTop.map((point, index) => {
          const nextIndex = (index + 1) % roofTop.length;
          return (
            <polygon
              key={`${element.id}-roof-edge-${index}`}
              points={polygonPoints([
                top[index],
                top[nextIndex],
                roofTop[nextIndex],
                point,
              ])}
              fill={isBlock ? "#cbd5e1" : palette.side}
              stroke={selected ? "#1d4ed8" : palette.frame || palette.edge}
              strokeWidth={selected ? 2.2 : 1.1}
            />
          );
        })}

        <polygon
          points={polygonPoints(roofTop)}
          fill={isBlock ? palette.roof : palette.top}
          stroke={selected ? "#1d4ed8" : palette.frame || palette.edge}
          strokeWidth={selected ? 3 : 1.5}
          strokeLinejoin="round"
        />

        {isBlock ? (
          <>
            <polygon
              points={polygonPoints(roofInset)}
              fill={palette.roofInset}
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="1.4"
            />
            <ellipse
              cx={centerOf(roofInset).x}
              cy={centerOf(roofInset).y}
              rx="8"
              ry="4"
              fill="#94a3b8"
              opacity="0.65"
            />
          </>
        ) : (
          renderAmenityMarkings(element, roofTop, clipId)
        )}

        {showLabel && (
          <g pointerEvents="none">
            <rect
              x={labelPoint.x - (selected ? 58 : 46)}
              y={labelPoint.y - 31}
              width={selected ? 116 : 92}
              height="25"
              rx="12.5"
              fill={selected ? "#0f172a" : "rgba(255,255,255,0.94)"}
              stroke={selected ? "#60a5fa" : "#bfdbfe"}
              strokeWidth="1.2"
            />
            <text
              x={labelPoint.x}
              y={labelPoint.y - 14}
              textAnchor="middle"
              fill={selected ? "#ffffff" : "#1e3a8a"}
              fontSize={selected ? "12" : "11"}
              fontWeight="800"
            >
              {element.name.length > 17
                ? `${element.name.slice(0, 16)}…`
                : element.name}
            </text>
          </g>
        )}
      </g>
    );
  };

  return (
    <svg
      viewBox="0 0 1000 700"
      className="absolute inset-0 h-full w-full select-none"
      style={{ touchAction: "none" }}
      onPointerDown={onClearSelection}
      aria-label="Premium izometrik proje sahnesi"
    >
      <defs>
        <filter id="premium-scene-shadow" x="-25%" y="-25%" width="150%" height="165%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#0f172a" floodOpacity="0.19" />
        </filter>
        <filter id="premium-soft-shadow" x="-25%" y="-25%" width="150%" height="165%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.14" />
        </filter>
        <linearGradient id="premium-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={viewMode === "PRESENTATION" ? "#dbeafe" : "#eaf3ff"} />
          <stop offset="100%" stopColor={viewMode === "PRESENTATION" ? "#bfdbfe" : "#dbeafe"} />
        </linearGradient>
        <linearGradient id="premium-plot" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8eef6" />
        </linearGradient>
      </defs>

      <rect width="1000" height="700" fill="url(#premium-sky)" />
      <ellipse
        cx="500"
        cy="560"
        rx="375"
        ry="100"
        fill="rgba(15,23,42,0.13)"
        filter="url(#premium-scene-shadow)"
      />
      <polygon
        points={polygonPoints(plotPoints)}
        fill="url(#premium-plot)"
        stroke="#94a3b8"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <polygon
        points={polygonPoints(innerPlotPoints)}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="8"
        strokeLinejoin="round"
        opacity="0.8"
      />

      <LandscapeLayer sceneData={sceneData} viewMode={viewMode} toIso={toIso} />

      {sceneData.settings.showGrid && viewMode !== "PRESENTATION" && (
        <g stroke="#cbd5e1" strokeWidth="1" opacity="0.62">
          {Array.from({ length: Math.floor(sceneData.plot.width / 10) + 1 }).map(
            (_, index) => {
              const worldX = -halfPlotWidth + index * 10;
              const start = toIso(worldX, -halfPlotDepth);
              const end = toIso(worldX, halfPlotDepth);
              return (
                <line
                  key={`premium-grid-x-${worldX}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                />
              );
            },
          )}
          {Array.from({ length: Math.floor(sceneData.plot.depth / 10) + 1 }).map(
            (_, index) => {
              const worldZ = -halfPlotDepth + index * 10;
              const start = toIso(-halfPlotWidth, worldZ);
              const end = toIso(halfPlotWidth, worldZ);
              return (
                <line
                  key={`premium-grid-z-${worldZ}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                />
              );
            },
          )}
        </g>
      )}

      <g filter="url(#premium-soft-shadow)">{sortedElements.map(renderElement)}</g>

      <g pointerEvents="none" transform="translate(90 92)">
        <circle r="31" fill="rgba(15,23,42,0.9)" />
        <circle r="23" fill="none" stroke="rgba(255,255,255,0.2)" />
        <path d="M0 -20 L9 10 L0 5 L-9 10 Z" fill="#ffffff" />
        <text x="0" y="47" textAnchor="middle" fill="#334155" fontSize="12" fontWeight="900">
          KUZEY
        </text>
      </g>

      {viewMode === "FOCUS" && !focusedBlockId && (
        <g pointerEvents="none">
          <rect x="333" y="620" width="334" height="42" rx="21" fill="rgba(15,23,42,0.9)" />
          <text x="500" y="646" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="800">
            Odaklamak için bir blok seçin
          </text>
        </g>
      )}
    </svg>
  );
}
