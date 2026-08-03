from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


def patch_types():
    path = ROOT / "frontend/src/app/proje-satis-sablonu/3d/[projectId]/projectSceneTypes.ts"
    text = path.read_text(encoding="utf-8")
    text = replace_once(
        text,
        '  | "GRAPHITE";',
        '  | "GRAPHITE"\n  | "PURE_WHITE";',
        "facade preset type",
    )
    path.write_text(text, encoding="utf-8")


def patch_presets():
    path = ROOT / "frontend/src/app/proje-satis-sablonu/3d/[projectId]/sceneStylePresets.ts"
    text = path.read_text(encoding="utf-8")
    marker = '''  {
    id: "GRAPHITE",
    label: "Grafit Premium",'''
    preset = '''  {
    id: "PURE_WHITE",
    label: "Bembeyaz",
    description: "Saf beyaz yüzey, açık gri gölge ve şeffaf cam balkon.",
    swatches: ["#ffffff", "#f1f5f9", "#cbd5e1"],
    style: {
      preset: "PURE_WHITE",
      primaryColor: "#ffffff",
      secondaryColor: "#f1f5f9",
      accentColor: "#94a3b8",
      glassColor: "#dbeafe",
      roofColor: "#ffffff",
      balconyStyle: "GLASS",
      verticalFins: true,
    },
    palette: {
      roof: "#ffffff",
      roofInset: "#e2e8f0",
      facadeFront: "#ffffff",
      facadeSide: "#f1f5f9",
      facadeBack: "#e2e8f0",
      frame: "#cbd5e1",
      glass: "#dbeafe",
      accent: "#64748b",
    },
  },
'''
    text = replace_once(text, marker, preset + marker, "pure white preset")
    path.write_text(text, encoding="utf-8")


def patch_renderer():
    path = ROOT / "frontend/src/app/proje-satis-sablonu/3d/[projectId]/PremiumProjectScene.tsx"
    text = path.read_text(encoding="utf-8")
    old = '''                  {Array.from({ length: visibleFloorCount }).map((_, floorIndex) => {
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
                  })}'''
    new = '''                  {Array.from({ length: visibleFloorCount }).map((_, floorIndex) => {
                    const lowerRatio = floorIndex / visibleFloorCount;
                    const upperRatio = (floorIndex + 1) / visibleFloorCount;
                    const floorBottomStart = {
                      x: edgeStart.x + (topStart.x - edgeStart.x) * lowerRatio,
                      y: edgeStart.y + (topStart.y - edgeStart.y) * lowerRatio,
                    };
                    const floorBottomEnd = {
                      x: edgeEnd.x + (topEnd.x - edgeEnd.x) * lowerRatio,
                      y: edgeEnd.y + (topEnd.y - edgeEnd.y) * lowerRatio,
                    };
                    const floorTopStart = {
                      x: edgeStart.x + (topStart.x - edgeStart.x) * upperRatio,
                      y: edgeStart.y + (topStart.y - edgeStart.y) * upperRatio,
                    };
                    const floorTopEnd = {
                      x: edgeEnd.x + (topEnd.x - edgeEnd.x) * upperRatio,
                      y: edgeEnd.y + (topEnd.y - edgeEnd.y) * upperRatio,
                    };
                    const bandStart = {
                      x: floorBottomStart.x + (floorTopStart.x - floorBottomStart.x) * 0.08,
                      y: floorBottomStart.y + (floorTopStart.y - floorBottomStart.y) * 0.08,
                    };
                    const bandEnd = {
                      x: floorBottomEnd.x + (floorTopEnd.x - floorBottomEnd.x) * 0.08,
                      y: floorBottomEnd.y + (floorTopEnd.y - floorBottomEnd.y) * 0.08,
                    };
                    const balconyFloor = isFront && floorIndex > 0 && floorIndex % 2 === 1;
                    const windowCount = Math.max(2, columnCount);

                    return (
                      <g key={`${element.id}-face-${face.index}-floor-${floorIndex}`}>
                        <line
                          x1={bandStart.x}
                          y1={bandStart.y}
                          x2={bandEnd.x}
                          y2={bandEnd.y}
                          stroke={palette.frame || palette.edge}
                          strokeWidth={floorIndex === 0 ? 2.8 : 1.9}
                          opacity={0.92}
                        />

                        {Array.from({ length: windowCount }).map((__, windowIndex) => {
                          const leftRatio = (windowIndex + 0.18) / windowCount;
                          const rightRatio = (windowIndex + 0.82) / windowCount;
                          const bottomVertical = 0.22;
                          const topVertical = 0.76;
                          const point = (horizontal: number, vertical: number) => ({
                            x:
                              floorBottomStart.x +
                              (floorBottomEnd.x - floorBottomStart.x) * horizontal +
                              (floorTopStart.x - floorBottomStart.x) * vertical,
                            y:
                              floorBottomStart.y +
                              (floorBottomEnd.y - floorBottomStart.y) * horizontal +
                              (floorTopStart.y - floorBottomStart.y) * vertical,
                          });
                          const p1 = point(leftRatio, bottomVertical);
                          const p2 = point(rightRatio, bottomVertical);
                          const p3 = point(rightRatio, topVertical);
                          const p4 = point(leftRatio, topVertical);
                          return (
                            <polygon
                              key={`${element.id}-window-${face.index}-${floorIndex}-${windowIndex}`}
                              points={polygonPoints([p1, p2, p3, p4])}
                              fill={palette.glass}
                              stroke={palette.accent}
                              strokeWidth={isFront ? 1.15 : 0.8}
                              opacity={isFront ? 0.94 : 0.72}
                            />
                          );
                        })}

                        {balconyFloor && (() => {
                          const balconyStart = {
                            x: floorBottomStart.x + (floorBottomEnd.x - floorBottomStart.x) * 0.12,
                            y: floorBottomStart.y + (floorBottomEnd.y - floorBottomStart.y) * 0.12,
                          };
                          const balconyEnd = {
                            x: floorBottomStart.x + (floorBottomEnd.x - floorBottomStart.x) * 0.88,
                            y: floorBottomStart.y + (floorBottomEnd.y - floorBottomStart.y) * 0.88,
                          };
                          const pushX = (floorTopStart.y - floorBottomStart.y) * 0.07;
                          const pushY = Math.abs(floorBottomEnd.x - floorBottomStart.x) * 0.035 + 2.2;
                          const outerStart = { x: balconyStart.x - pushX, y: balconyStart.y + pushY };
                          const outerEnd = { x: balconyEnd.x - pushX, y: balconyEnd.y + pushY };
                          return (
                            <g>
                              <polygon
                                points={polygonPoints([balconyStart, balconyEnd, outerEnd, outerStart])}
                                fill="rgba(15,23,42,0.16)"
                                stroke={palette.frame}
                                strokeWidth="1.2"
                              />
                              <line
                                x1={outerStart.x}
                                y1={outerStart.y - 5}
                                x2={outerEnd.x}
                                y2={outerEnd.y - 5}
                                stroke={balconyStyle === "SOLID" ? palette.accent : palette.glass}
                                strokeWidth={balconyStyle === "FRAME" ? 3 : 2}
                                opacity="0.95"
                              />
                              {[0, 0.25, 0.5, 0.75, 1].map((railRatio) => (
                                <line
                                  key={railRatio}
                                  x1={outerStart.x + (outerEnd.x - outerStart.x) * railRatio}
                                  y1={outerStart.y - 5 + (outerEnd.y - outerStart.y) * railRatio}
                                  x2={outerStart.x + (outerEnd.x - outerStart.x) * railRatio}
                                  y2={outerStart.y + (outerEnd.y - outerStart.y) * railRatio}
                                  stroke={palette.frame}
                                  strokeWidth="0.9"
                                />
                              ))}
                            </g>
                          );
                        })()}

                        {floorIndex === 0 && isFront && (
                          <g>
                            <line
                              x1={(floorBottomStart.x + floorBottomEnd.x) / 2 - 8}
                              y1={(floorBottomStart.y + floorBottomEnd.y) / 2}
                              x2={(floorTopStart.x + floorTopEnd.x) / 2 - 8}
                              y2={(floorTopStart.y + floorTopEnd.y) / 2}
                              stroke={palette.accent}
                              strokeWidth="5"
                            />
                            <line
                              x1={(floorTopStart.x + floorTopEnd.x) / 2 - 18}
                              y1={(floorTopStart.y + floorTopEnd.y) / 2 + 4}
                              x2={(floorTopStart.x + floorTopEnd.x) / 2 + 10}
                              y2={(floorTopStart.y + floorTopEnd.y) / 2 + 4}
                              stroke={palette.frame}
                              strokeWidth="3"
                            />
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {verticalFins && Array.from({ length: columnCount - 1 }).map((_, columnIndex) => {
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
                        key={`${element.id}-face-${face.index}-fin-${columnIndex}`}
                        x1={bottom.x}
                        y1={bottom.y}
                        x2={upper.x}
                        y2={upper.y}
                        stroke={palette.accent}
                        strokeWidth="1.8"
                        opacity={isFront ? 0.84 : 0.5}
                      />
                    );
                  })}'''
    text = replace_once(text, old, new, "residential facade details")
    path.write_text(text, encoding="utf-8")


def main():
    patch_types()
    patch_presets()
    patch_renderer()
    print("Project3D residential facade realism V1 applied.")


if __name__ == "__main__":
    main()
