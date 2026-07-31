from __future__ import annotations

from datetime import datetime
from pathlib import Path
import shutil

ROOT = Path("/var/www/eph")
TARGET = (
    ROOT
    / "frontend/src/app/proje-satis-sablonu/3d/[projectId]/Project3DStudioClient.tsx"
)

source = TARGET.read_text(encoding="utf-8")

if "renderSiteShell" in source and "OTOPARK GİRİŞİ" in source:
    raise SystemExit("Site Kabuğu V1 zaten uygulanmış görünüyor.")

required_tokens = (
    '    if (element.type !== "BLOCK") {',
    "    const floorCount = Math.max(1, Math.min(element.floorCount || 1, 24));",
    "  const renderElement = (element: ProjectSceneElement) => {",
    "                <g>{sortedElements.map(renderElement)}</g>",
)

for token in required_tokens:
    if token not in source:
        raise SystemExit(f"Beklenen kod bulunamadı: {token}")

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup = TARGET.with_name(f"{TARGET.name}.bak.{stamp}")
shutil.copy2(TARGET, backup)

shell_code = r'''
  const renderSiteShell = () => {
    const halfWidth = sceneData.plot.width / 2;
    const halfDepth = sceneData.plot.depth / 2;
    const backLeft = toIso(-halfWidth, -halfDepth);
    const backRight = toIso(halfWidth, -halfDepth);
    const frontRight = toIso(halfWidth, halfDepth);
    const frontLeft = toIso(-halfWidth, halfDepth);
    const frontGateLeft = mixPoint(frontLeft, frontRight, 0.39);
    const frontGateRight = mixPoint(frontLeft, frontRight, 0.61);
    const gateCenter = mixPoint(frontGateLeft, frontGateRight, 0.5);
    const gateAngle =
      (Math.atan2(
        frontGateRight.y - frontGateLeft.y,
        frontGateRight.x - frontGateLeft.x,
      ) *
        180) /
      Math.PI;
    const siteName = (
      response?.project.name?.trim() || "EPH PROJESİ"
    ).slice(0, 28);
    const hasSecuritySpace = sceneData.elements.some((element) => {
      const value = `${element.spaceType || ""} ${element.name || ""}`
        .toLocaleUpperCase("tr-TR");
      return (
        value.includes("GÜVENLİK") ||
        value.includes("GUVENLIK")
      );
    });
    const roadPoints = [
      toIso(-4.2, halfDepth - 4),
      toIso(4.2, halfDepth - 4),
      toIso(4.2, 1),
      toIso(-4.2, 1),
    ];
    const pedestrianPoints = [
      toIso(5.4, halfDepth - 4),
      toIso(7.2, halfDepth - 4),
      toIso(7.2, 2),
      toIso(5.4, 2),
    ];
    const boothAnchor = toIso(9.5, halfDepth - 8);
    const wallSegments: Array<[SvgPoint, SvgPoint]> = [
      [backLeft, backRight],
      [backRight, frontRight],
      [frontRight, frontGateRight],
      [frontGateLeft, frontLeft],
      [frontLeft, backLeft],
    ];
    const postPoints = [
      ...Array.from({ length: 7 }, (_, index) =>
        mixPoint(backLeft, backRight, index / 6),
      ),
      ...Array.from({ length: 6 }, (_, index) =>
        mixPoint(backRight, frontRight, index / 5),
      ),
      ...Array.from({ length: 5 }, (_, index) =>
        mixPoint(frontLeft, frontGateLeft, index / 4),
      ),
      ...Array.from({ length: 5 }, (_, index) =>
        mixPoint(frontGateRight, frontRight, index / 4),
      ),
      ...Array.from({ length: 6 }, (_, index) =>
        mixPoint(frontLeft, backLeft, index / 5),
      ),
    ];

    return (
      <g pointerEvents="none">
        <polygon
          points={svgPoints(roadPoints)}
          fill="#475569"
          stroke="#1e293b"
          strokeWidth="2"
          opacity="0.96"
        />
        <line
          x1={mixPoint(roadPoints[0], roadPoints[1], 0.5).x}
          y1={mixPoint(roadPoints[0], roadPoints[1], 0.5).y}
          x2={mixPoint(roadPoints[3], roadPoints[2], 0.5).x}
          y2={mixPoint(roadPoints[3], roadPoints[2], 0.5).y}
          stroke="#f8fafc"
          strokeWidth="1.5"
          strokeDasharray="9 8"
          opacity="0.9"
        />
        <polygon
          points={svgPoints(pedestrianPoints)}
          fill="#d6d3d1"
          stroke="#a8a29e"
          strokeWidth="1.5"
        />
        {Array.from({ length: 7 }, (_, index) => {
          const ratio = 0.08 + index * 0.14;
          const first = mixPoint(
            pedestrianPoints[0],
            pedestrianPoints[3],
            ratio,
          );
          const second = mixPoint(
            pedestrianPoints[1],
            pedestrianPoints[2],
            ratio,
          );
          return (
            <line
              key={`walkway-${index}`}
              x1={first.x}
              y1={first.y}
              x2={second.x}
              y2={second.y}
              stroke="#f5f5f4"
              strokeWidth="1"
            />
          );
        })}

        {wallSegments.map(([start, end], index) => (
          <g key={`site-wall-${index}`}>
            <line
              x1={start.x}
              y1={start.y - 7}
              x2={end.x}
              y2={end.y - 7}
              stroke="#334155"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <line
              x1={start.x}
              y1={start.y - 13}
              x2={end.x}
              y2={end.y - 13}
              stroke="#64748b"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        ))}

        {postPoints.map((point, index) => (
          <g
            key={`site-post-${index}`}
            transform={`translate(${point.x} ${point.y})`}
          >
            <rect
              x="-3"
              y="-18"
              width="6"
              height="18"
              rx="1.5"
              fill="#475569"
            />
            <rect
              x="-4"
              y="-21"
              width="8"
              height="4"
              rx="1.5"
              fill="#cbd5e1"
            />
          </g>
        ))}

        <g
          transform={`translate(${gateCenter.x} ${gateCenter.y - 2}) rotate(${gateAngle})`}
        >
          <rect
            x="-62"
            y="-40"
            width="11"
            height="40"
            rx="3"
            fill="#475569"
            stroke="#e2e8f0"
            strokeWidth="2"
          />
          <rect
            x="51"
            y="-40"
            width="11"
            height="40"
            rx="3"
            fill="#475569"
            stroke="#e2e8f0"
            strokeWidth="2"
          />
          <path
            d="M-54 -31 Q0 -69 54 -31 L54 -18 Q0 -50 -54 -18 Z"
            fill="#0f172a"
            stroke="#f8fafc"
            strokeWidth="2"
          />
          <rect
            x="-49"
            y="-14"
            width="98"
            height="5"
            rx="2.5"
            fill="#f8fafc"
          />
          <text
            x="0"
            y="-27"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="10.5"
            fontWeight="900"
            letterSpacing="0.5"
          >
            {siteName}
          </text>
          <rect
            x="-45"
            y="-7"
            width="42"
            height="3"
            rx="1.5"
            fill="#ef4444"
          />
          <rect
            x="3"
            y="-7"
            width="42"
            height="3"
            rx="1.5"
            fill="#ef4444"
          />
        </g>

        {!hasSecuritySpace && (
          <g
            transform={`translate(${boothAnchor.x} ${boothAnchor.y - 8})`}
          >
            <ellipse
              cx="3"
              cy="18"
              rx="24"
              ry="8"
              fill="rgba(15,23,42,0.18)"
            />
            <polygon
              points="-23,0 1,-12 26,0 2,12"
              fill="#f8fafc"
              stroke="#64748b"
              strokeWidth="1.5"
            />
            <polygon
              points="-23,0 2,12 2,36 -23,24"
              fill="#cbd5e1"
              stroke="#64748b"
              strokeWidth="1.5"
            />
            <polygon
              points="2,12 26,0 26,24 2,36"
              fill="#94a3b8"
              stroke="#475569"
              strokeWidth="1.5"
            />
            <polygon
              points="-27,-3 1,-18 30,-3 2,12"
              fill="#1e3a8a"
              stroke="#dbeafe"
              strokeWidth="1.5"
            />
            <polygon
              points="6,16 20,9 20,19 6,26"
              fill="#bae6fd"
              stroke="#334155"
              strokeWidth="1"
            />
            <rect
              x="-41"
              y="39"
              width="82"
              height="19"
              rx="9.5"
              fill="rgba(15,23,42,0.88)"
            />
            <text
              x="0"
              y="52"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="10"
              fontWeight="800"
            >
              Güvenlik
            </text>
          </g>
        )}
      </g>
    );
  };

'''

insert_marker = "  const renderElement = (element: ProjectSceneElement) => {"
source = source.replace(
    insert_marker,
    shell_code + insert_marker,
    1,
)

amenity_start = source.find('    if (element.type !== "BLOCK") {')
amenity_end = source.find(
    "\n    const floorCount = Math.max(1, Math.min(element.floorCount || 1, 24));",
    amenity_start,
)

if amenity_start == -1 or amenity_end == -1:
    raise SystemExit("Proje alanı renderer sınırları bulunamadı.")

amenity_branch = r'''    if (element.type !== "BLOCK") {
      const palette = amenityPalette(element.spaceType);
      const normalizedType = `${element.spaceType || ""} ${element.name || ""}`
        .toLocaleUpperCase("tr-TR");
      const inner = scalePolygon(ground, 0.84);
      const center = inner.reduce(
        (result, point) => ({
          x: result.x + point.x / inner.length,
          y: result.y + point.y / inner.length,
        }),
        { x: 0, y: 0 },
      );
      const isPool = normalizedType.includes("HAVUZ");
      const isGarden =
        normalizedType.includes("BAHCE") ||
        normalizedType.includes("BAHÇE") ||
        normalizedType.includes("PEYZAJ") ||
        normalizedType.includes("PARK");
      const isClosedParking =
        normalizedType.includes("OTOPARK") &&
        (normalizedType.includes("KAPALI") ||
          normalizedType.includes("YERALTI") ||
          normalizedType.includes("YER ALTI"));
      const isOpenParking =
        normalizedType.includes("OTOPARK") && !isClosedParking;
      const isSports =
        normalizedType.includes("SPOR") ||
        normalizedType.includes("SAHA") ||
        normalizedType.includes("TENIS") ||
        normalizedType.includes("TENİS");
      const isMarket =
        normalizedType.includes("MARKET") ||
        normalizedType.includes("BÜFE") ||
        normalizedType.includes("BUFE");
      const isSecurity =
        normalizedType.includes("GÜVENLİK") ||
        normalizedType.includes("GUVENLIK");
      const isShelter =
        normalizedType.includes("SIĞINAK") ||
        normalizedType.includes("SIGINAK");
      const isTechnical =
        normalizedType.includes("MEKANİK") ||
        normalizedType.includes("MEKANIK") ||
        normalizedType.includes("JENERATÖR") ||
        normalizedType.includes("JENERATOR") ||
        normalizedType.includes("TRAFO") ||
        normalizedType.includes("TEKNİK") ||
        normalizedType.includes("TEKNIK");
      const isSmallBuilding =
        isMarket || isSecurity || isTechnical;
      const labelY =
        isSmallBuilding || isShelter || isClosedParking
          ? center.y + 38
          : center.y + 17;

      const interactionProps = {
        role: "button" as const,
        "aria-label": element.name,
        tabIndex: 0,
        onPointerDown: (event: ReactPointerEvent<SVGGElement>) =>
          handlePointerDown(event, element),
        onPointerMove: handlePointerMove,
        onPointerUp: finishDrag,
        onPointerCancel: finishDrag,
      };

      if (isClosedParking) {
        const ramp = scalePolygon(inner, 0.8);
        const rampTop = mixPoint(ramp[0], ramp[1], 0.5);
        const rampBottom = mixPoint(ramp[3], ramp[2], 0.5);

        return (
          <g
            key={element.id}
            {...interactionProps}
            style={{
              cursor:
                dragState?.elementId === element.id
                  ? "grabbing"
                  : "grab",
            }}
          >
            <polygon
              points={svgPoints(ground)}
              fill="#d6d3d1"
              stroke={selected ? "#1d4ed8" : "#78716c"}
              strokeWidth={selected ? 4 : 2}
            />
            <polygon
              points={svgPoints(ramp)}
              fill="#1f2937"
              stroke="#f8fafc"
              strokeWidth="2"
            />
            {Array.from({ length: 5 }, (_, index) => {
              const ratio = 0.14 + index * 0.17;
              const first = mixPoint(ramp[0], ramp[3], ratio);
              const second = mixPoint(ramp[1], ramp[2], ratio);
              return (
                <line
                  key={`${element.id}-ramp-${index}`}
                  x1={first.x}
                  y1={first.y}
                  x2={second.x}
                  y2={second.y}
                  stroke="rgba(255,255,255,0.26)"
                  strokeWidth="1.4"
                />
              );
            })}
            <path
              d={`M${rampTop.x} ${rampTop.y + 2} L${rampBottom.x} ${rampBottom.y - 5}`}
              stroke="#facc15"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d={`M${rampBottom.x} ${rampBottom.y - 5} l-8 -3 l3 8 z`}
              fill="#facc15"
            />
            <rect
              x={center.x - 34}
              y={center.y - 25}
              width="68"
              height="17"
              rx="8.5"
              fill="#0f172a"
              stroke="#f8fafc"
            />
            <text
              x={center.x}
              y={center.y - 13}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="9.5"
              fontWeight="900"
            >
              OTOPARK GİRİŞİ
            </text>
            {sceneData.settings.showLabels && (
              <g pointerEvents="none">
                <rect
                  x={center.x - 58}
                  y={labelY}
                  width="116"
                  height="22"
                  rx="11"
                  fill="rgba(15,23,42,0.88)"
                />
                <text
                  x={center.x}
                  y={labelY + 15}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10.5"
                  fontWeight="800"
                >
                  {element.name.length > 20
                    ? `${element.name.slice(0, 19)}…`
                    : element.name}
                </text>
              </g>
            )}
          </g>
        );
      }

      if (isSmallBuilding) {
        const buildingGround = scalePolygon(ground, 0.72);
        const buildingHeight = isSecurity ? 30 : isMarket ? 38 : 27;
        const buildingTop = buildingGround.map((point) => ({
          x: point.x,
          y: point.y - buildingHeight,
        }));
        const leftFace = [
          buildingGround[3],
          buildingGround[2],
          buildingTop[2],
          buildingTop[3],
        ];
        const rightFace = [
          buildingGround[1],
          buildingGround[2],
          buildingTop[2],
          buildingTop[1],
        ];
        const roof = scalePolygon(buildingTop, 1.08);
        const signText = isSecurity
          ? "GÜVENLİK"
          : isMarket
            ? "MARKET"
            : "TEKNİK";

        return (
          <g
            key={element.id}
            {...interactionProps}
            style={{
              cursor:
                dragState?.elementId === element.id
                  ? "grabbing"
                  : "grab",
            }}
          >
            <ellipse
              cx={center.x + 5}
              cy={center.y + 18}
              rx="32"
              ry="10"
              fill="rgba(15,23,42,0.16)"
            />
            <polygon
              points={svgPoints(leftFace)}
              fill={
                isMarket
                  ? "#fef3c7"
                  : isSecurity
                    ? "#dbeafe"
                    : "#d6d3d1"
              }
              stroke={selected ? "#1d4ed8" : "#64748b"}
              strokeWidth={selected ? 4 : 1.5}
            />
            <polygon
              points={svgPoints(rightFace)}
              fill={
                isMarket
                  ? "#fbbf24"
                  : isSecurity
                    ? "#93c5fd"
                    : "#a8a29e"
              }
              stroke={selected ? "#1d4ed8" : "#475569"}
              strokeWidth={selected ? 4 : 1.5}
            />
            <polygon
              points={svgPoints(roof)}
              fill={
                isMarket
                  ? "#b91c1c"
                  : isSecurity
                    ? "#1e3a8a"
                    : "#475569"
              }
              stroke="#f8fafc"
              strokeWidth="1.5"
            />
            <polygon
              points={svgPoints(
                faceCellPoints(
                  rightFace[0],
                  rightFace[1],
                  rightFace[2],
                  rightFace[3],
                  0.16,
                  0.84,
                  0.28,
                  0.76,
                ),
              )}
              fill={isTechnical ? "#334155" : "#bae6fd"}
              stroke="#475569"
              strokeWidth="1"
            />
            {isMarket && (
              <polygon
                points={svgPoints([
                  mixPoint(rightFace[0], rightFace[3], 0.72),
                  mixPoint(rightFace[1], rightFace[2], 0.72),
                  {
                    x: mixPoint(rightFace[1], rightFace[2], 0.72).x + 4,
                    y: mixPoint(rightFace[1], rightFace[2], 0.72).y + 7,
                  },
                  {
                    x: mixPoint(rightFace[0], rightFace[3], 0.72).x + 4,
                    y: mixPoint(rightFace[0], rightFace[3], 0.72).y + 7,
                  },
                ])}
                fill="#dc2626"
                stroke="#ffffff"
                strokeWidth="1"
              />
            )}
            <rect
              x={center.x - 31}
              y={center.y - buildingHeight - 22}
              width="62"
              height="17"
              rx="8.5"
              fill="#0f172a"
            />
            <text
              x={center.x}
              y={center.y - buildingHeight - 10}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="9.5"
              fontWeight="900"
            >
              {signText}
            </text>
            {sceneData.settings.showLabels && (
              <g pointerEvents="none">
                <rect
                  x={center.x - 58}
                  y={labelY}
                  width="116"
                  height="22"
                  rx="11"
                  fill="rgba(15,23,42,0.88)"
                />
                <text
                  x={center.x}
                  y={labelY + 15}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10.5"
                  fontWeight="800"
                >
                  {element.name.length > 20
                    ? `${element.name.slice(0, 19)}…`
                    : element.name}
                </text>
              </g>
            )}
          </g>
        );
      }

      if (isShelter) {
        const hatch = scalePolygon(inner, 0.72);

        return (
          <g
            key={element.id}
            {...interactionProps}
            style={{
              cursor:
                dragState?.elementId === element.id
                  ? "grabbing"
                  : "grab",
            }}
          >
            <polygon
              points={svgPoints(ground)}
              fill="#e7e5e4"
              stroke={selected ? "#1d4ed8" : "#78716c"}
              strokeWidth={selected ? 4 : 2}
            />
            <polygon
              points={svgPoints(hatch)}
              fill="#57534e"
              stroke="#d6d3d1"
              strokeWidth="2"
            />
            {Array.from({ length: 4 }, (_, index) => {
              const ratio = 0.18 + index * 0.21;
              const first = mixPoint(hatch[0], hatch[1], ratio);
              const second = mixPoint(hatch[3], hatch[2], ratio);
              return (
                <line
                  key={`${element.id}-shelter-${index}`}
                  x1={first.x}
                  y1={first.y}
                  x2={second.x}
                  y2={second.y}
                  stroke="#a8a29e"
                  strokeWidth="2"
                />
              );
            })}
            <circle
              cx={center.x}
              cy={center.y}
              r="11"
              fill="#f59e0b"
              stroke="#78350f"
              strokeWidth="2"
            />
            <path
              d={`M${center.x - 5} ${center.y + 3} L${center.x} ${center.y - 6} L${center.x + 5} ${center.y + 3} Z`}
              fill="#ffffff"
            />
            {sceneData.settings.showLabels && (
              <g pointerEvents="none">
                <rect
                  x={center.x - 58}
                  y={labelY}
                  width="116"
                  height="22"
                  rx="11"
                  fill="rgba(15,23,42,0.88)"
                />
                <text
                  x={center.x}
                  y={labelY + 15}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10.5"
                  fontWeight="800"
                >
                  {element.name.length > 20
                    ? `${element.name.slice(0, 19)}…`
                    : element.name}
                </text>
              </g>
            )}
          </g>
        );
      }

      return (
        <g
          key={element.id}
          {...interactionProps}
          style={{
            cursor:
              dragState?.elementId === element.id
                ? "grabbing"
                : "grab",
          }}
        >
          <polygon
            points={svgPoints(ground)}
            fill="#f8fafc"
            stroke={selected ? "#1d4ed8" : "#cbd5e1"}
            strokeWidth={selected ? 4 : 2}
          />
          <polygon
            points={svgPoints(inner)}
            fill={palette.top}
            stroke={palette.border}
            strokeWidth="2"
          />

          {isPool && (
            <g pointerEvents="none">
              <polygon
                points={svgPoints(scalePolygon(inner, 0.86))}
                fill="url(#water-gradient)"
                stroke="#e0f2fe"
                strokeWidth="2"
              />
            </g>
          )}

          {isGarden && (
            <g pointerEvents="none">
              {[
                [-18, -5],
                [5, -13],
                [18, 3],
                [-2, 8],
              ].map(([xOffset, yOffset], index) => (
                <g
                  key={`${element.id}-tree-${index}`}
                  transform={`translate(${center.x + xOffset} ${
                    center.y + yOffset
                  })`}
                >
                  <ellipse
                    cx="2"
                    cy="12"
                    rx="9"
                    ry="4"
                    fill="rgba(15,23,42,0.18)"
                  />
                  <rect
                    x="-1.5"
                    y="0"
                    width="3"
                    height="11"
                    rx="1.5"
                    fill="#854d0e"
                  />
                  <circle cx="0" cy="-3" r="8" fill="#4d7c0f" />
                  <circle cx="-5" cy="0" r="6" fill="#65a30d" />
                  <circle cx="5" cy="0" r="6" fill="#84cc16" />
                </g>
              ))}
            </g>
          )}

          {isOpenParking && (
            <g pointerEvents="none">
              {Array.from({ length: 5 }).map((_, index) => {
                const ratio = 0.12 + index * 0.19;
                const start = mixPoint(inner[0], inner[1], ratio);
                const end = mixPoint(inner[3], inner[2], ratio);
                return (
                  <line
                    key={`${element.id}-parking-line-${index}`}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth="1.6"
                  />
                );
              })}
            </g>
          )}

          {isSports && (
            <g
              pointerEvents="none"
              fill="none"
              stroke={palette.accent}
              strokeWidth="1.8"
            >
              <polygon
                points={svgPoints(scalePolygon(inner, 0.82))}
              />
              <line
                x1={mixPoint(inner[0], inner[1], 0.5).x}
                y1={mixPoint(inner[0], inner[1], 0.5).y}
                x2={mixPoint(inner[3], inner[2], 0.5).x}
                y2={mixPoint(inner[3], inner[2], 0.5).y}
              />
              <ellipse
                cx={center.x}
                cy={center.y}
                rx="12"
                ry="5"
              />
            </g>
          )}

          {!isPool &&
            !isGarden &&
            !isOpenParking &&
            !isSports && (
              <g pointerEvents="none">
                <circle
                  cx={center.x}
                  cy={center.y - 2}
                  r="9"
                  fill={palette.accent}
                  opacity="0.92"
                />
                <path
                  d={`M${center.x - 5} ${center.y + 2} L${
                    center.x
                  } ${center.y - 6} L${center.x + 5} ${
                    center.y + 2
                  } Z`}
                  fill={palette.border}
                />
              </g>
            )}

          {sceneData.settings.showLabels && (
            <g pointerEvents="none">
              <rect
                x={center.x - 54}
                y={labelY}
                width="108"
                height="22"
                rx="11"
                fill="rgba(15,23,42,0.86)"
              />
              <text
                x={center.x}
                y={labelY + 15}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="11"
                fontWeight="800"
              >
                {element.name.length > 18
                  ? `${element.name.slice(0, 17)}…`
                  : element.name}
              </text>
            </g>
          )}
        </g>
      );
    }
'''

source = (
    source[:amenity_start]
    + amenity_branch
    + source[amenity_end:]
)

scene_marker = "                <g>{sortedElements.map(renderElement)}</g>"
source = source.replace(
    scene_marker,
    "                {renderSiteShell()}\n\n" + scene_marker,
    1,
)

checks = (
    "const renderSiteShell = () =>",
    "OTOPARK GİRİŞİ",
    "const isMarket =",
    "const isSecurity =",
    "const isShelter =",
    "const isTechnical =",
    "{renderSiteShell()}",
    "Güvenlik",
)

for token in checks:
    if token not in source:
        raise SystemExit(f"Yeni kod kontrolü başarısız: {token}")

TARGET.write_text(source, encoding="utf-8")

print("✅ Site çevre duvarı ve çit katmanı eklendi.")
print("✅ Proje adını taşıyan kemerli ana giriş eklendi.")
print("✅ Ana araç yolu ve yaya yolu eklendi.")
print("✅ Giriş yanına otomatik güvenlik kulübesi eklendi.")
print("✅ Kapalı otopark rampa görünümüne dönüştürüldü.")
print("✅ Site marketi küçük kiosk modeline dönüştürüldü.")
print("✅ Sığınak teknik erişim kapağına dönüştürüldü.")
print("✅ Mekanik/trafo/jeneratör alanları teknik yapıya dönüştürüldü.")
print(f"✅ Yedek oluşturuldu: {backup}")
