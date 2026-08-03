export type SceneVector3 = [number, number, number];

export type FacadePresetId =
  | "MODERN_LIGHT"
  | "WARM_STONE"
  | "GLASS_TEAL"
  | "TERRACOTTA"
  | "GRAPHITE";

export type BalconyStyle = "GLASS" | "SOLID" | "FRAME";

export type ProjectFacadeStyle = {
  preset: FacadePresetId | string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  glassColor?: string;
  roofColor?: string;
  balconyStyle?: BalconyStyle | string;
  verticalFins?: boolean;
};

export type LandscapePresetId =
  | "URBAN_MODERN"
  | "NATURAL_GREEN"
  | "MEDITERRANEAN"
  | "FAMILY_GARDEN";

export type ProjectLandscapeSettings = {
  preset: LandscapePresetId | string;
  density: number;
  showTrees: boolean;
  showPaths: boolean;
  showLighting: boolean;
  showBenches: boolean;
  showShrubs: boolean;
};

export type ProjectSceneElement = {
  id: string;
  type: "BLOCK" | "AMENITY" | string;
  sourceId: string;
  name: string;
  code?: string;
  geometryType?: string;
  facadeViewCount?: number;
  floorCount?: number;
  spaceType?: string;
  grossArea?: number | null;
  blockId?: string | null;
  floorId?: string | null;
  position: SceneVector3;
  rotationY: number;
  size: {
    width: number;
    depth: number;
    height: number;
  };
  stylePreset?: string;
  facadeStyle?: ProjectFacadeStyle;
  floors?: Array<{
    id: string;
    level: number;
    label: string;
    floorType: string;
  }>;
};

export type ProjectSceneData = {
  schemaVersion: number;
  skipped?: boolean;
  plot: {
    width: number;
    depth: number;
    northRotation: number;
  };
  camera: {
    mode: string;
    position: SceneVector3;
    target: SceneVector3;
    zoom: number;
  };
  settings: {
    showGrid: boolean;
    showLabels: boolean;
    quality: string;
  };
  landscape: ProjectLandscapeSettings;
  elements: ProjectSceneElement[];
};

export type ProjectSceneRecord = {
  id: string;
  projectId: string;
  schemaVersion: number;
  version: number;
  status: "TASLAK" | "TAMAMLANDI" | "ATLANDI" | string;
  sceneData: ProjectSceneData;
  thumbnailUrl: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSceneResponse = {
  initialized: boolean;
  project: {
    id: string;
    name: string;
    code: string | null;
    city: string;
    district: string;
    neighborhood: string | null;
    geometryType: string;
    setupStatus: string;
    blockCount: number;
    visibleSpaceCount: number;
  };
  scene: ProjectSceneRecord | null;
};
