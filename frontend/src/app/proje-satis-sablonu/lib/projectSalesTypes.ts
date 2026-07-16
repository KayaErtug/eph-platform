export type NoticeState = {
  tone: "success" | "warning" | "error";
  title: string;
  message: string;
} | null;

export type ProjectCount = {
  blocks: number;
  units: number;
  spaces: number;
  designReviewRequests: number;
};

export type ProjectSummary = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  city: string;
  district: string;
  neighborhood: string | null;
  address: string;
  adaNo: string | null;
  parselNo: string | null;
  latitude: number | null;
  longitude: number | null;
  mapAddress: string | null;
  declaredIndependentUnitCount: number | null;
  declaredSalesInventoryCount: number | null;
  plannedUnitTypes: string[];
  geometryType: string;
  setupStatus: string;
  wizardStep: string;
  needsSoftwareTeamReview: boolean;
  updatedAt: string;
  _count: ProjectCount;
};

export type ProjectForm = {
  name: string;
  code: string;
  description: string;
  city: string;
  district: string;
  neighborhood: string;
  address: string;
  adaNo: string;
  parselNo: string;
  latitude: string;
  longitude: string;
  mapAddress: string;
  declaredIndependentUnitCount: string;
  declaredSalesInventoryCount: string;
  geometryType: string;
  plannedUnitTypes: string[];
};

export type PageMode =
  | "list"
  | "form"
  | "structure"
  | "inventory"
  | "spaces"
  | "completion"
  | "sales"
  | "media"
  | "render"
  | "presentation"
  | "publish";

export type WizardStep = 1 | 2 | 3 | 4 | 5;
export type ProjectNumberingMode = "FLOOR_CODED" | "CONTINUOUS";
export type ProjectSaveDestination =
  | "stay"
  | "structure"
  | "inventory"
  | "spaces"
  | "completion";

export type ProjectFloorSummary = {
  id: string;
  level: number;
  label: string;
  floorType: string;
  sortOrder: number;
};

export type ProjectBlockSummary = {
  id: string;
  code: string;
  normalizedCode: string;
  name: string | null;
  geometryType: string;
  facadeViewCount: number;
  sortOrder: number;
  floors: ProjectFloorSummary[];
};

export type ProjectSpaceSummary = {
  id: string;
  blockId: string | null;
  floorId: string | null;
  code: string;
  name: string;
  spaceType: string;
  customTypeName: string | null;
  legalStatus: string;
  commercialPurpose: string;
  grossArea: number | null;
  description: string | null;
  isCustomerVisible: boolean;
  sortOrder: number;
};

export type ProjectUnitSummary = {
  id: string;
  blockId: string | null;
  floorId: string | null;
  inventoryCode: string | null;
  inventorySortOrder: number;
  type: string;
  floor: number | null;
  floorLabel: string | null;
  number: string | null;
  roomCount: string | null;
  netArea: number | null;
  grossArea: number | null;
  facades: string[];
  conceptLabel: string | null;
  legalStatus: string;
  commercialPurpose: string;
  isSalesInventory: boolean;
};

export type ProjectSetupResponse = ProjectSummary & {
  blocks: ProjectBlockSummary[];
  units: ProjectUnitSummary[];
  spaces: ProjectSpaceSummary[];
};

export type ProjectSalesStockUnit = {
  id: string;
  projectId: string;
  blockId: string | null;
  floorId: string | null;
  inventoryCode: string | null;
  inventorySortOrder: number;
  type: string;
  legalStatus: string;
  commercialPurpose: string;
  floor: number | null;
  floorLabel: string | null;
  number: string | null;
  roomCount: string | null;
  conceptLabel: string | null;
  netArea: number | null;
  grossArea: number | null;
  facades: string[];
  deliveryDate: string | null;
  price: number;
  priceCurrency: string | null;
  status: string;
  isOffMarket: boolean;
  updatedAt: string;
  block: {
    id: string;
    code: string;
    name: string | null;
    sortOrder: number;
  } | null;
  projectFloor: {
    id: string;
    level: number;
    label: string;
    sortOrder: number;
  } | null;
};

export type ProjectSalesStockResponse = {
  project: {
    id: string;
    name: string;
    code: string | null;
    city: string;
    district: string;
    neighborhood: string | null;
    setupStatus: string;
    wizardStep: string;
    declaredSalesInventoryCount: number | null;
    updatedAt: string;
  };
  summary: {
    total: number;
    available: number;
    reserved: number;
    closed: number;
    passive: number;
    priced: number;
    totalListValue: number;
  };
  units: ProjectSalesStockUnit[];
};

export type ProjectSalesStockDraft = {
  price: string;
  status: string;
};

export type ProjectMediaFolder = {
  packageId: string;
  code: string;
  folder: string;
  name: string;
  type: string;
  unitType: string | null;
  roomCount: string | null;
  isDefault: boolean;
  existingAssetCount: number;
  assignedUnitCount: number;
};

export type ProjectMediaConfig = {
  project: {
    id: string;
    code: string;
    name: string;
  };
  limits: {
    maxZipSizeMb: number;
    maxImageSizeMb: number;
    maxImageCount: number;
    maxPackageCount: number;
    allowedImageExtensions: string[];
    generalImageCount: {
      min: number;
      max: number;
    };
    recommendedStandardImageCount: number;
    maxStandardImageCount: number;
  };
  folders: ProjectMediaFolder[];
};

export type ProjectMediaIssue = {
  level: "ERROR" | "WARNING" | string;
  code: string;
  message: string;
  path?: string | null;
  value?: unknown;
};

export type ProjectMediaPreviewPackage = {
  packageId: string;
  sourceFolder: string;
  code: string;
  name: string;
  type: string;
  unitType: string | null;
  roomCount: string | null;
  fileCount: number;
  totalSize: number;
  existingAssetCount: number;
  assignedUnitCount: number;
  action: string;
  files: Array<{
    fileName: string;
    originalPath: string;
    size: number;
    mimetype: string;
    isCover: boolean;
    sortOrder: number;
  }>;
};

export type ProjectMediaPreview = {
  valid: boolean;
  project: {
    id: string;
    code: string;
    name: string;
  };
  archive: {
    fileName: string;
    fileSize: number;
    totalImageSize: number;
    compressionRatio: number;
  };
  summary: {
    packageCount: number;
    imageCount: number;
    totalImageSize: number;
    existingPackageCount: number;
    existingAssetCount: number;
    assignedUnitCount: number;
    errorCount: number;
    warningCount: number;
  };
  packages: ProjectMediaPreviewPackage[];
  issues: ProjectMediaIssue[];
};

export type ProjectMediaAsset = {
  id: string;
  url: string;
  supabaseUrl: string | null;
  path: string;
  originalName: string | null;
  mimetype: string | null;
  size: number | null;
  isCover: boolean;
  sortOrder: number;
};

export type ProjectMediaPackageRecord = {
  id: string;
  code: string;
  name: string;
  type: string;
  unitType: string | null;
  roomCount: string | null;
  isDefault: boolean;
  sortOrder: number;
  assets: ProjectMediaAsset[];
  _count: {
    assets: number;
    units: number;
  };
  zipFolder: string;
};

export type ProjectMediaPackagesResponse = {
  project: {
    id: string;
    code: string;
    name: string;
  };
  packages: ProjectMediaPackageRecord[];
};

export type ProjectMediaEnsureResponse = {
  success: boolean;
  project: {
    id: string;
    code: string;
    name: string;
    setupStatus: string;
  };
  summary: {
    packageCount: number;
    standardPackageCount: number;
    assignedUnitCount: number;
  };
};

export type ProjectLaunchCenterResponse = {
  project: {
    id: string;
    name: string;
    code: string | null;
    city: string;
    district: string;
    neighborhood: string | null;
    setupStatus: string;
    updatedAt: string;
  };
  renderBrief: {
    architecturalStyle: string;
    projectCharacter: string[];
    renderScenes: Array<{
      key: string;
      title: string;
      prompt: string;
    }>;
    negativePrompt: string;
    sourceData: {
      blocks: string[];
      unitTypes: string[];
      roomCounts: string[];
      customerVisibleSpaces: string[];
    };
  };
  presentation: {
    title: string;
    subtitle: string;
    coverUrl: string | null;
    metrics: {
      totalUnits: number;
      availableUnits: number;
      reservedUnits: number;
      closedUnits: number;
      imageCount: number;
    };
    highlights: string[];
    highlightedUnits: Array<{
      id: string;
      title: string;
      type: string;
      roomCount: string | null;
      netArea: number | null;
      grossArea: number | null;
      price: number;
      priceCurrency: string | null;
      status: string;
      coverUrl: string | null;
    }>;
  };
  publishReadiness: {
    ready: boolean;
    checks: Array<{
      key: string;
      label: string;
      passed: boolean;
      detail?: string;
    }>;
    nextAction: string;
    warning: string;
  };
};

export type ProjectRenderWorkOrderResponse = {
  id: string;
  status: string;
  createdAt: string;
  project: ProjectLaunchCenterResponse["project"];
  scenes: Array<{
    key: string;
    title: string;
    prompt: string;
    outputName: string;
    aspectRatio: string;
    quality: string;
  }>;
  negativePrompt: string;
  nextAction: string;
};

export type ProjectPresentationLinkResponse = {
  token: string;
  expiresAt: string;
  url: string;
  presentation: ProjectLaunchCenterResponse["presentation"];
  publishReadiness: ProjectLaunchCenterResponse["publishReadiness"];
};

export type ProjectPublishToPoolResponse = {
  success: boolean;
  publishedAt: string;
  publishedUnitCount: number;
  project: ProjectLaunchCenterResponse["project"];
  publishReadiness: ProjectLaunchCenterResponse["publishReadiness"];
};

export type BlockForm = {
  key: string;
  code: string;
  name: string;
  geometryType: string;
  facadeViewCount: string;
  basementFloorCount: string;
  hasGroundFloor: boolean;
  normalFloorCount: string;
};

export type StructurePreview = {
  valid: boolean;
  summary: {
    blockCount: number;
    floorCount: number;
    complexGeometryDetected: boolean;
  };
};

export type UnitGroupForm = {
  key: string;
  type: string;
  count: string;
  roomCount: string;
  netArea: string;
  grossArea: string;
  commercialPurpose: string;
  facades: string[];
  conceptLabel: string;
};

export type FloorPlanForm = {
  key: string;
  blockCode: string;
  blockName: string;
  floorLevel: number;
  floorLabel: string;
  numberPrefix: string;
  startingSequence: string;
  unitGroups: UnitGroupForm[];
};

export type FloorCopyOptions = {
  unitGroups: boolean;
  numberPrefix: boolean;
  startingSequence: boolean;
};

export type InventoryPreview = {
  valid: boolean;
  summary: {
    independentUnitCount: number;
    salesInventoryCount: number;
    nonSalesIndependentUnitCount: number;
    projectSpaceCount: number;
    commonSpaceCount: number;
    technicalSpaceCount: number;
    openAmenityCount: number;
  };
};

export type ProjectSpaceForm = {
  key: string;
  name: string;
  spaceType: string;
  customTypeName: string;
  count: string;
  blockCode: string;
  floorLevel: string;
  grossArea: string;
  legalStatus: string;
  commercialPurpose: string;
  description: string;
  isCustomerVisible: boolean;
};

export type ProjectSpacesPreview = {
  valid: boolean;
  summary: {
    projectSpaceCount: number;
    commonSpaceCount: number;
    technicalSpaceCount: number;
    openAmenityCount: number;
    attachmentCount: number;
    customerVisibleCount: number;
  };
};

export type CompletionIssue = {
  code: string;
  message: string;
};

export type DesignReviewSummary = {
  id: string;
  status: string;
  geometryNotes: string | null;
  userMessage: string | null;
  softwareTeamNote: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  completedAt: string | null;
};

export type CompletionPreview = {
  ready: boolean;
  issues: CompletionIssue[];
  summary: {
    blockCount: number;
    floorCount: number;
    independentUnitCount: number;
    salesInventoryCount: number;
    nonSalesIndependentUnitCount: number;
    projectSpaceCount: number;
    declaredIndependentUnitCount: number | null;
    declaredSalesInventoryCount: number | null;
    geometryType: string;
    needsSoftwareTeamReview: boolean;
    setupStatus: string;
    wizardStep: string;
  };
  latestDesignReview: DesignReviewSummary | null;
};

