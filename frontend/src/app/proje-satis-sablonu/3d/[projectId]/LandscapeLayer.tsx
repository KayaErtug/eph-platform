"use client";

import type { SceneViewMode } from "./PremiumProjectScene";
import type { ProjectSceneData } from "./projectSceneTypes";
import { landscapePresetById } from "./sceneStylePresets";

type Point = { x: number; y: number };
type WorldPoint = { x: number; z: number };

type LandscapeLayerProps = {
  sceneData: ProjectSceneData;
  viewMode: SceneViewMode;
  toIso: (worldX: number, worldZ: number) => Point;
};

function polygonPoints(items: Point[]) {
  return items.map((item) => `${item.x},${item.y}`).join(" ");
}

function centerOf(items: Point[]): Point {
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

function perimeterPoint(
  index: number,
  count: number,
  halfWidth: number,
  halfDepth: number,
  inset: number,
): WorldPoint {
  const distance = ((index + 0.5) / count) * 4;
  const side = Math.floor(distance) % 4;
  const ratio = distance - Math.floor(distance);
  const width = Math.max(4, halfWidth - inset);
  const depth = Math.max(4, halfDepth - inset);

  if (side === 0) return { x: -width + ratio * width * 2, z: -depth };
  if (side === 1) return { x: width, z: -depth + ratio * depth * 2 };
  if (side === 2) return { x: width - ratio * width * 2, z: depth };
  return { x: -width, z: depth - ratio * depth * 2 };
}

function routePath(points: Point[]) {
  if (points.length < 2) return "";
  const [first, ...rest] = points;
  return rest.reduce(
    (path, point, index) => {
      const previous = points[index];
      const controlX = (previous.x + point.x) / 2;
      return `${path} Q ${controlX} ${previous.y} ${point.x} ${point.y}`;
    },
    `M ${first.x} ${first.y}`,
  );
}

function Tree({
  point,
  index,
  palette,
  presentation,
}: {
  point: Point;
  index: number;
  palette: ReturnType<typeof landscapePresetById>["palette"];
  presentation: boolean;
}) {
  const size = 7 + (index % 3) * 1.5 + (presentation ? 1 : 0);

  return (
    <g transform={`translate(${point.x} ${point.y})`}>
      <ellipse cx="0" cy="4" rx={size * 0.95} ry={size * 0.38} fill="rgba(15,23,42,0.12)" />
      <rect x="-1.6" y={-size * 1.25} width="3.2" height={size * 1.35} rx="1.5" fill={palette.trunk} />
      <circle cx="0" cy={-size * 1.55} r={size} fill={palette.tree} />
      <circle cx={-size * 0.38} cy={-size * 1.85} r={size * 0.56} fill={palette.treeLight} opacity="0.92" />
      <circle cx={size * 0.4} cy={-size * 1.42} r={size * 0.52} fill={palette.grassDeep} opacity="0.88" />
    </g>
  );
}

function Lamp({
  point,
  palette,
}: {
  point: Point;
  palette: ReturnType<typeof landscapePresetById>["palette"];
}) {
  return (
    <g transform={`translate(${point.x} ${point.y})`}>
      <ellipse cx="0" cy="2" rx="4" ry="1.8" fill="rgba(15,23,42,0.12)" />
      <rect x="-1" y="-13" width="2" height="15" rx="1" fill={palette.lamp} />
      <circle cx="0" cy="-14" r="3.6" fill="#fef3c7" stroke="#ffffff" strokeWidth="1.2" />
    </g>
  );
}

function Bench({
  point,
  palette,
}: {
  point: Point;
  palette: ReturnType<typeof landscapePresetById>["palette"];
}) {
  return (
    <g transform={`translate(${point.x} ${point.y})`}>
      <ellipse cx="0" cy="3" rx="9" ry="2.5" fill="rgba(15,23,42,0.1)" />
      <rect x="-8" y="-4" width="16" height="4" rx="1.5" fill={palette.bench} />
      <rect x="-7" y="0" width="2" height="5" rx="1" fill="#475569" />
      <rect x="5" y="0" width="2" height="5" rx="1" fill="#475569" />
    </g>
  );
}

export default function LandscapeLayer({
  sceneData,
  viewMode,
  toIso,
}: LandscapeLayerProps) {
  const landscape = sceneData.landscape;
  const preset = landscapePresetById(landscape?.preset);
  const palette = preset.palette;
  const halfWidth = sceneData.plot.width / 2;
  const halfDepth = sceneData.plot.depth / 2;
  const plot = [
    toIso(-halfWidth, -halfDepth),
    toIso(halfWidth, -halfDepth),
    toIso(halfWidth, halfDepth),
    toIso(-halfWidth, halfDepth),
  ];
  const grassPlot = scalePolygon(plot, 0.885);
  const density = Math.min(5, Math.max(1, Number(landscape?.density) || 3));
  const treeCount = 6 + density * 4;
  const treePoints = Array.from({ length: treeCount }).map((_, index) =>
    perimeterPoint(index, treeCount, halfWidth, halfDepth, 6 + (index % 2) * 2),
  );
  const pathOne = [
    toIso(-halfWidth + 8, -halfDepth + 9),
    toIso(-halfWidth * 0.18, -halfDepth * 0.12),
    toIso(halfWidth * 0.25, halfDepth * 0.05),
    toIso(halfWidth - 9, halfDepth - 8),
  ];
  const pathTwo = [
    toIso(-halfWidth + 10, halfDepth - 8),
    toIso(-halfWidth * 0.2, halfDepth * 0.18),
    toIso(halfWidth * 0.18, -halfDepth * 0.16),
    toIso(halfWidth - 10, -halfDepth + 8),
  ];
  const presentation = viewMode === "PRESENTATION";

  return (
    <g pointerEvents="none" opacity={viewMode === "FOCUS" ? 0.7 : 1}>
      <polygon
        points={polygonPoints(grassPlot)}
        fill={palette.plot}
        stroke={palette.grassDeep}
        strokeWidth="1.2"
        opacity={presentation ? 0.98 : 0.88}
      />
      <polygon
        points={polygonPoints(scalePolygon(grassPlot, 0.97))}
        fill={palette.grass}
        opacity={presentation ? 0.28 : 0.2}
      />

      {landscape?.showPaths && (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {[pathOne, pathTwo].map((path, index) => (
            <g key={`landscape-route-${index}`}>
              <path
                d={routePath(path)}
                stroke={palette.pathEdge}
                strokeWidth={presentation ? 13 : 11}
                opacity="0.72"
              />
              <path
                d={routePath(path)}
                stroke={palette.path}
                strokeWidth={presentation ? 9 : 7}
                opacity="0.96"
              />
            </g>
          ))}
        </g>
      )}

      {landscape?.showShrubs && (
        <g>
          {treePoints
            .filter((_, index) => index % 2 === 0)
            .map((worldPoint, index) => {
              const point = toIso(worldPoint.x * 0.9, worldPoint.z * 0.9);
              return (
                <g key={`landscape-shrub-${index}`} transform={`translate(${point.x} ${point.y})`}>
                  <ellipse cx="0" cy="1" rx="7" ry="3" fill="rgba(15,23,42,0.1)" />
                  <circle cx="-3" cy="-3" r="4.2" fill={palette.shrub} />
                  <circle cx="2" cy="-4" r="4.8" fill={palette.grassDeep} />
                  <circle cx="5" cy="-1" r="3.4" fill={palette.treeLight} />
                </g>
              );
            })}
        </g>
      )}

      {landscape?.showTrees && (
        <g>
          {treePoints.map((worldPoint, index) => (
            <Tree
              key={`landscape-tree-${index}`}
              point={toIso(worldPoint.x, worldPoint.z)}
              index={index}
              palette={palette}
              presentation={presentation}
            />
          ))}
        </g>
      )}

      {landscape?.showLighting && (
        <g>
          {treePoints
            .filter((_, index) => index % Math.max(2, 6 - density) === 0)
            .map((worldPoint, index) => (
              <Lamp
                key={`landscape-lamp-${index}`}
                point={toIso(worldPoint.x * 0.82, worldPoint.z * 0.82)}
                palette={palette}
              />
            ))}
        </g>
      )}

      {landscape?.showBenches && (
        <g>
          {treePoints
            .filter((_, index) => index % 5 === 2)
            .map((worldPoint, index) => (
              <Bench
                key={`landscape-bench-${index}`}
                point={toIso(worldPoint.x * 0.72, worldPoint.z * 0.72)}
                palette={palette}
              />
            ))}
        </g>
      )}
    </g>
  );
}
