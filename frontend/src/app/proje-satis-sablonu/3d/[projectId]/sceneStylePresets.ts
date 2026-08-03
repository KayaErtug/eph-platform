import type {
  FacadePresetId,
  LandscapePresetId,
  ProjectFacadeStyle,
  ProjectLandscapeSettings,
  ProjectSceneElement,
} from "./projectSceneTypes";

export type FacadePalette = {
  roof: string;
  roofInset: string;
  facadeFront: string;
  facadeSide: string;
  facadeBack: string;
  frame: string;
  glass: string;
  accent: string;
};

export type LandscapePalette = {
  plot: string;
  grass: string;
  grassDeep: string;
  path: string;
  pathEdge: string;
  tree: string;
  treeLight: string;
  trunk: string;
  shrub: string;
  lamp: string;
  bench: string;
};

export type FacadePreset = {
  id: FacadePresetId;
  label: string;
  description: string;
  swatches: [string, string, string];
  style: ProjectFacadeStyle;
  palette: FacadePalette;
};

export type LandscapePreset = {
  id: LandscapePresetId;
  label: string;
  description: string;
  swatches: [string, string, string];
  palette: LandscapePalette;
};

export const FACADE_PRESETS: FacadePreset[] = [
  {
    id: "MODERN_LIGHT",
    label: "Modern Açık",
    description: "Beyaz yüzey, lacivert vurgu ve cam balkon.",
    swatches: ["#f8fafc", "#2563eb", "#dbeafe"],
    style: {
      preset: "MODERN_LIGHT",
      primaryColor: "#2563eb",
      secondaryColor: "#60a5fa",
      accentColor: "#ffffff",
      glassColor: "#dbeafe",
      roofColor: "#f8fafc",
      balconyStyle: "GLASS",
      verticalFins: false,
    },
    palette: {
      roof: "#f8fafc",
      roofInset: "#dbeafe",
      facadeFront: "#2563eb",
      facadeSide: "#60a5fa",
      facadeBack: "#93c5fd",
      frame: "#ffffff",
      glass: "#dbeafe",
      accent: "#1d4ed8",
    },
  },
  {
    id: "WARM_STONE",
    label: "Sıcak Taş",
    description: "Doğal taş tonları ve bronz doğrama hissi.",
    swatches: ["#f5f1e8", "#b08968", "#5f4937"],
    style: {
      preset: "WARM_STONE",
      primaryColor: "#b08968",
      secondaryColor: "#d6b98c",
      accentColor: "#5f4937",
      glassColor: "#dbeafe",
      roofColor: "#f5f1e8",
      balconyStyle: "SOLID",
      verticalFins: true,
    },
    palette: {
      roof: "#f5f1e8",
      roofInset: "#e7dcc8",
      facadeFront: "#b08968",
      facadeSide: "#c8a77b",
      facadeBack: "#d6b98c",
      frame: "#fffaf0",
      glass: "#cbd5e1",
      accent: "#5f4937",
    },
  },
  {
    id: "GLASS_TEAL",
    label: "Cam & Turkuaz",
    description: "Geniş cam yüzey, turkuaz ve koyu metal detay.",
    swatches: ["#0f766e", "#2dd4bf", "#0f172a"],
    style: {
      preset: "GLASS_TEAL",
      primaryColor: "#0f766e",
      secondaryColor: "#2dd4bf",
      accentColor: "#0f172a",
      glassColor: "#ccfbf1",
      roofColor: "#ecfeff",
      balconyStyle: "GLASS",
      verticalFins: true,
    },
    palette: {
      roof: "#ecfeff",
      roofInset: "#99f6e4",
      facadeFront: "#0f766e",
      facadeSide: "#14b8a6",
      facadeBack: "#5eead4",
      frame: "#f0fdfa",
      glass: "#ccfbf1",
      accent: "#0f172a",
    },
  },
  {
    id: "TERRACOTTA",
    label: "Terracotta",
    description: "Kiremit tonları, krem yüzey ve çerçeveli balkon.",
    swatches: ["#c2410c", "#fb923c", "#fff7ed"],
    style: {
      preset: "TERRACOTTA",
      primaryColor: "#c2410c",
      secondaryColor: "#fb923c",
      accentColor: "#fff7ed",
      glassColor: "#ffedd5",
      roofColor: "#fff7ed",
      balconyStyle: "FRAME",
      verticalFins: false,
    },
    palette: {
      roof: "#fff7ed",
      roofInset: "#fed7aa",
      facadeFront: "#c2410c",
      facadeSide: "#ea580c",
      facadeBack: "#fb923c",
      frame: "#fff7ed",
      glass: "#ffedd5",
      accent: "#7c2d12",
    },
  },
  {
    id: "GRAPHITE",
    label: "Grafit Premium",
    description: "Koyu grafit, metalik gri ve keskin düşey akslar.",
    swatches: ["#1e293b", "#475569", "#cbd5e1"],
    style: {
      preset: "GRAPHITE",
      primaryColor: "#1e293b",
      secondaryColor: "#475569",
      accentColor: "#e2e8f0",
      glassColor: "#bae6fd",
      roofColor: "#f8fafc",
      balconyStyle: "FRAME",
      verticalFins: true,
    },
    palette: {
      roof: "#f8fafc",
      roofInset: "#cbd5e1",
      facadeFront: "#1e293b",
      facadeSide: "#334155",
      facadeBack: "#475569",
      frame: "#e2e8f0",
      glass: "#bae6fd",
      accent: "#0f172a",
    },
  },
];

export const LANDSCAPE_PRESETS: LandscapePreset[] = [
  {
    id: "URBAN_MODERN",
    label: "Modern Kent",
    description: "Net yürüyüş aksları, düzenli ağaçlar ve gece aydınlatması.",
    swatches: ["#86efac", "#e2e8f0", "#334155"],
    palette: {
      plot: "#eef4ee",
      grass: "#86efac",
      grassDeep: "#22c55e",
      path: "#e2e8f0",
      pathEdge: "#94a3b8",
      tree: "#15803d",
      treeLight: "#86efac",
      trunk: "#7c2d12",
      shrub: "#4ade80",
      lamp: "#334155",
      bench: "#92400e",
    },
  },
  {
    id: "NATURAL_GREEN",
    label: "Doğal Yeşil",
    description: "Yoğun bitki dokusu, kıvrımlı yollar ve doğal gölgeleme.",
    swatches: ["#4ade80", "#166534", "#d6d3d1"],
    palette: {
      plot: "#ecfdf5",
      grass: "#4ade80",
      grassDeep: "#15803d",
      path: "#d6d3d1",
      pathEdge: "#78716c",
      tree: "#166534",
      treeLight: "#6ee7b7",
      trunk: "#713f12",
      shrub: "#22c55e",
      lamp: "#57534e",
      bench: "#78350f",
    },
  },
  {
    id: "MEDITERRANEAN",
    label: "Akdeniz",
    description: "Açık taş yollar, zeytin tonları ve sıcak bahçe dili.",
    swatches: ["#a3b18a", "#f5e6ca", "#9a6b3f"],
    palette: {
      plot: "#fbf7ed",
      grass: "#a3b18a",
      grassDeep: "#588157",
      path: "#f5e6ca",
      pathEdge: "#c6a77d",
      tree: "#3a5a40",
      treeLight: "#a3b18a",
      trunk: "#6b4423",
      shrub: "#84a98c",
      lamp: "#6b7280",
      bench: "#9a6b3f",
    },
  },
  {
    id: "FAMILY_GARDEN",
    label: "Aile Bahçesi",
    description: "Canlı yeşil alan, oturma cepleri ve dengeli donatılar.",
    swatches: ["#65a30d", "#fef3c7", "#0ea5e9"],
    palette: {
      plot: "#f7fee7",
      grass: "#bef264",
      grassDeep: "#65a30d",
      path: "#fef3c7",
      pathEdge: "#d6d3d1",
      tree: "#3f6212",
      treeLight: "#a3e635",
      trunk: "#854d0e",
      shrub: "#84cc16",
      lamp: "#475569",
      bench: "#a16207",
    },
  },
];

export const defaultLandscapeSettings: ProjectLandscapeSettings = {
  preset: "URBAN_MODERN",
  density: 3,
  showTrees: true,
  showPaths: true,
  showLighting: true,
  showBenches: true,
  showShrubs: true,
};

export function normalizeLandscapeSettings(
  value?: Partial<ProjectLandscapeSettings> | null,
): ProjectLandscapeSettings {
  return {
    ...defaultLandscapeSettings,
    ...value,
    density: Math.min(5, Math.max(1, Number(value?.density) || 3)),
    showTrees: value?.showTrees ?? true,
    showPaths: value?.showPaths ?? true,
    showLighting: value?.showLighting ?? true,
    showBenches: value?.showBenches ?? true,
    showShrubs: value?.showShrubs ?? true,
  };
}

export function facadeStyleForPreset(
  presetId: FacadePresetId | string,
): ProjectFacadeStyle {
  const preset =
    FACADE_PRESETS.find((item) => item.id === presetId) || FACADE_PRESETS[0];

  return { ...preset.style };
}

export function facadePresetForElement(element: ProjectSceneElement) {
  const presetId = element.facadeStyle?.preset || element.stylePreset || "MODERN_LIGHT";
  return FACADE_PRESETS.find((item) => item.id === presetId) || FACADE_PRESETS[0];
}

export function resolveFacadePalette(
  element: ProjectSceneElement,
  state: { selected: boolean; presentation: boolean },
): FacadePalette {
  const preset = facadePresetForElement(element);
  const style = element.facadeStyle;
  const base = {
    ...preset.palette,
    roof: style?.roofColor || preset.palette.roof,
    facadeFront: style?.primaryColor || preset.palette.facadeFront,
    facadeSide: style?.secondaryColor || preset.palette.facadeSide,
    glass: style?.glassColor || preset.palette.glass,
    accent: style?.accentColor || preset.palette.accent,
  };

  if (state.selected) {
    return {
      ...base,
      frame: "#1d4ed8",
      roofInset: "#bfdbfe",
    };
  }

  if (state.presentation) {
    return {
      ...base,
      frame: "#ffffff",
    };
  }

  return base;
}

export function landscapePresetById(presetId?: string) {
  return (
    LANDSCAPE_PRESETS.find((item) => item.id === presetId) ||
    LANDSCAPE_PRESETS[0]
  );
}
