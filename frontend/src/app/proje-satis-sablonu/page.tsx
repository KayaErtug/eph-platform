"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Archive,
  BadgeDollarSign,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  FolderOpen,
  Images,
  Loader2,
  Layers3,
  Landmark,
  LocateFixed,
  MapPin,
  Plus,
  Search,
  Save,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import {
  fetchDistrictOptions,
  fetchPlaceOptions,
  fetchProvinceOptions,
  type LocationOption,
} from "@/components/stok/locationData";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

import type {
  BlockForm,
  CompletionPreview,
  FloorCopyOptions,
  FloorPlanForm,
  InventoryPreview,
  NoticeState,
  PageMode,
  ProjectForm,
  ProjectLaunchCenterResponse,
  ProjectNumberingMode,
  ProjectMediaConfig,
  ProjectMediaEnsureResponse,
  ProjectMediaPackagesResponse,
  ProjectMediaPreview,
  ProjectPresentationLinkResponse,
  ProjectPublishToPoolResponse,
  ProjectRenderWorkOrderResponse,
  ProjectSalesStockDraft,
  ProjectSalesStockResponse,
  ProjectSalesStockUnit,
  ProjectSaveDestination,
  ProjectSetupResponse,
  ProjectSpaceForm,
  ProjectSpacesPreview,
  ProjectSummary,
  ProjectUnitSummary,
  StructurePreview,
  UnitGroupForm,
  WizardStep,
} from "./lib/projectSalesTypes";

import {
  FLOOR_CARD_PALETTES,
  PROJECT_SPACE_CARD_PALETTES,
  UNIT_GROUP_PALETTES,
  cardStyle,
  inputStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from "./lib/projectSalesStyles";
import { DeleteProjectModal, NoticeModal } from "./components/ProjectSalesModals";
import { Field, InfoBand, Metric, SectionTitle } from "./components/ProjectSalesPrimitives";
import { ProjectMediaCenterView } from "./components/ProjectMediaCenterView";
import { ProjectInventoryNumberingPanel } from "./components/ProjectInventoryNumberingPanel";
import { ProjectSalesLaunchFlowView } from "./components/ProjectSalesLaunchFlowView";
import { ProjectSalesStockView } from "./components/ProjectSalesStockView";
import {
  ADVANCED_GEOMETRY_OPTIONS,
  COMMERCIAL_PURPOSE_OPTIONS,
  COMPLEX_GEOMETRIES,
  FACADE_GEOMETRY_OPTIONS,
  FACADE_OPTIONS,
  NO_FACADE_OPTION,
  OPEN_AMENITY_SPACE_TYPES,
  PROJECT_SPACE_TYPE_OPTIONS,
  SALES_COMMERCIAL_PURPOSES,
  SALES_STATUS_OPTIONS,
  SPACE_COMMERCIAL_PURPOSE_OPTIONS,
  SPACE_LEGAL_STATUS_OPTIONS,
  TECHNICAL_SPACE_TYPES,
  UNIT_TYPE_OPTIONS,
} from "./lib/projectSalesOptions";
import {
  apiMessage,
  designReviewStatusLabel,
  formatBytes,
  formatCurrency,
  formatDate,
  formatSalesPriceInput,
  isEligibleRole,
  isSalesDraftDirty,
  mediaActionLabel,
  parseSalesPrice,
  roleLabel,
  salesPriceDigits,
  salesStatusLabel,
  salesStatusPalette,
  salesUnitCardPalette,
  salesUnitIdentity,
  statusLabel,
  unitTypeLabel,
} from "./lib/projectSalesFormatters";
import {
  defaultNumberPrefix,
  inferProjectNumberingMode,
} from "./lib/projectSalesNumbering";


const PROJECT_LIFECYCLE_OPTIONS = [
  {
    value: "READY",
    title: "Hazır Proje",
    description:
      "Yapımı tamamlandı; bağımsız bölümler hemen satışa veya teslime hazır.",
  },
  {
    value: "UNDER_CONSTRUCTION",
    title: "Devam Eden Proje",
    description:
      "İnşaat sürüyor; ön satış, ilerleme ve teslim tarihi yönetilecek.",
  },
  {
    value: "PLANNED",
    title: "Planlanan Proje",
    description:
      "Henüz başlamadı; ön talep, yatırımcı ve müşteri ilgisi toplanacak.",
  },
] as const;

function projectLifecycleLabel(value: string | null | undefined) {
  return (
    PROJECT_LIFECYCLE_OPTIONS.find((option) => option.value === value)?.title ||
    "Aşama Seçilmedi"
  );
}

function facadeCountForGeometry(geometryType: string) {
  const counts: Record<string, number> = {
    TEK_CEPHELI_STANDART: 1,
    CIFT_CEPHELI_STANDART: 2,
    UC_CEPHELI_STANDART: 3,
    DORT_CEPHELI_STANDART: 4,
  };

  return counts[geometryType] ?? null;
}

function blockCodeForIndex(index: number) {
  if (index < 26) return String.fromCharCode(65 + index);
  return `B${index + 1}`;
}

function createBlockForm(index: number, geometryType: string): BlockForm {
  const standardFacadeCount = facadeCountForGeometry(geometryType);

  return {
    key: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    code: blockCodeForIndex(index),
    name: `${blockCodeForIndex(index)} Blok`,
    geometryType,
    facadeViewCount: String(standardFacadeCount ?? 1),
    basementFloorCount: "0",
    hasGroundFloor: true,
    normalFloorCount: "1",
  };
}

function blockFormsFromSetup(
  setup: ProjectSetupResponse,
): BlockForm[] {
  if (!Array.isArray(setup.blocks) || setup.blocks.length === 0) {
    return [createBlockForm(0, setup.geometryType)];
  }

  return setup.blocks.map((block, index) => ({
    key: block.id || `${Date.now()}-${index}`,
    code: block.code || blockCodeForIndex(index),
    name: block.name || "",
    geometryType: block.geometryType || setup.geometryType,
    facadeViewCount: String(
      facadeCountForGeometry(block.geometryType) ?? block.facadeViewCount ?? 1,
    ),
    basementFloorCount: String(
      block.floors.filter((floor) => floor.level < 0).length,
    ),
    hasGroundFloor: block.floors.some((floor) => floor.level === 0),
    normalFloorCount: String(
      block.floors.filter((floor) => floor.level > 0).length,
    ),
  }));
}

function countValue(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function buildFloors(block: BlockForm) {
  const basementCount = countValue(block.basementFloorCount);
  const normalCount = countValue(block.normalFloorCount);
  const floors: Array<{
    level: number;
    label: string;
    floorType: string;
    sortOrder: number;
  }> = [];

  for (let level = -basementCount; level <= -1; level += 1) {
    floors.push({
      level,
      label: `${Math.abs(level)}. Bodrum Kat`,
      floorType: "BODRUM",
      sortOrder: level,
    });
  }

  if (block.hasGroundFloor) {
    floors.push({
      level: 0,
      label: "Zemin Kat",
      floorType: "ZEMIN",
      sortOrder: 0,
    });
  }

  for (let level = 1; level <= normalCount; level += 1) {
    floors.push({
      level,
      label: `${level}. Kat`,
      floorType: "NORMAL",
      sortOrder: level,
    });
  }

  return floors;
}


function createUnitGroup(defaultType = "DAIRE"): UnitGroupForm {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: defaultType,
    count: "",
    roomCount: "",
    netArea: "",
    grossArea: "",
    commercialPurpose: "SATISA_SUNULACAK",
    facades: [],
    conceptLabel: "",
  };
}

function cloneUnitGroup(group: UnitGroupForm): UnitGroupForm {
  return {
    ...group,
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    facades: [...group.facades],
  };
}

function floorNumberingFromUnits(
  floorUnits: ProjectUnitSummary[],
  floorLevel: number,
  fallbackPrefix: string,
) {
  const firstNumber = floorUnits.find((unit) => unit.number?.trim())?.number?.trim();

  if (!firstNumber) {
    return {
      numberPrefix: fallbackPrefix,
      startingSequence: "1",
    };
  }

  if (floorLevel <= 0) {
    const markers =
      floorLevel < 0
        ? [`-B${Math.abs(floorLevel)}-`, `-B${Math.abs(floorLevel)}`]
        : ["-Z-", "-Z"];
    const marker = markers.find((candidate) => firstNumber.includes(candidate));
    const markerIndex = marker ? firstNumber.lastIndexOf(marker) : -1;

    if (!marker || markerIndex <= 0) {
      return {
        numberPrefix: fallbackPrefix,
        startingSequence: "1",
      };
    }

    const rawSequence = firstNumber.slice(markerIndex + marker.length).trim();
    const parsedSequence = Number(rawSequence);

    return {
      numberPrefix: firstNumber.slice(0, markerIndex).trim() || fallbackPrefix,
      startingSequence:
        Number.isInteger(parsedSequence) && parsedSequence > 0
          ? String(parsedSequence)
          : "1",
    };
  }

  const lastDashIndex = firstNumber.lastIndexOf("-");

  if (lastDashIndex <= 0) {
    return {
      numberPrefix: fallbackPrefix,
      startingSequence: "1",
    };
  }

  const numberPrefix = firstNumber.slice(0, lastDashIndex).trim();
  const tail = firstNumber.slice(lastDashIndex + 1).trim();
  const floorCode = String(floorLevel);
  const rawSequence =
    tail.startsWith(floorCode) && tail.length > floorCode.length
      ? tail.slice(floorCode.length)
      : tail;
  const parsedSequence = Number(rawSequence);

  return {
    numberPrefix: numberPrefix || fallbackPrefix,
    startingSequence:
      Number.isInteger(parsedSequence) && parsedSequence > 0
        ? String(parsedSequence)
        : "1",
  };
}

function floorPlansFromSetup(setup: ProjectSetupResponse): FloorPlanForm[] {
  const defaultType = setup.plannedUnitTypes?.[0] || "DAIRE";
  const units = Array.isArray(setup.units) ? setup.units : [];

  return setup.blocks.flatMap((block) =>
    block.floors.map((floor) => {
      const floorUnits = units
        .filter((unit) => unit.floorId === floor.id)
        .sort(
          (first, second) =>
            first.inventorySortOrder - second.inventorySortOrder,
        );
      const groupedUnits = new Map<
        string,
        {
          sample: ProjectUnitSummary;
          count: number;
        }
      >();

      for (const unit of floorUnits) {
        const groupKey = JSON.stringify([
          unit.type,
          unit.roomCount || "",
          unit.netArea,
          unit.grossArea,
          unit.commercialPurpose,
          [...(unit.facades || [])].sort(),
          unit.conceptLabel || "",
        ]);
        const current = groupedUnits.get(groupKey);

        if (current) {
          current.count += 1;
        } else {
          groupedUnits.set(groupKey, {
            sample: unit,
            count: 1,
          });
        }
      }

      const unitGroups =
        groupedUnits.size > 0
          ? Array.from(groupedUnits.values()).map(({ sample, count }) => ({
              key: `saved-${sample.id}`,
              type: sample.type,
              count: String(count),
              roomCount: sample.roomCount || "",
              netArea:
                sample.netArea === null ? "" : String(sample.netArea),
              grossArea:
                sample.grossArea === null ? "" : String(sample.grossArea),
              commercialPurpose: sample.commercialPurpose,
              facades: Array.isArray(sample.facades)
                ? [...sample.facades]
                : [],
              conceptLabel: sample.conceptLabel || "",
            }))
          : [createUnitGroup(defaultType)];
      const numbering = floorNumberingFromUnits(
        floorUnits,
        floor.level,
        defaultNumberPrefix(block.normalizedCode || block.code),
      );

      return {
        key: `${block.id}-${floor.id}`,
        blockCode: block.code,
        blockName: block.name || `${block.code} Blok`,
        floorLevel: floor.level,
        floorLabel: floor.label,
        numberPrefix: numbering.numberPrefix,
        startingSequence: numbering.startingSequence,
        unitGroups,
      };
    }),
  );
}
function positiveInteger(value: string, fallback = 1) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function defaultSpaceLegalStatus(spaceType: string) {
  if (TECHNICAL_SPACE_TYPES.has(spaceType)) {
    return "TEKNIK_HIZMET_ALANI";
  }

  if (OPEN_AMENITY_SPACE_TYPES.has(spaceType)) {
    return "ACIK_ALAN_SOSYAL_DONATI";
  }

  return "ORTAK_KULLANIM_ALANI";
}

function defaultSpaceCommercialPurpose(legalStatus: string) {
  if (legalStatus === "TEKNIK_HIZMET_ALANI") {
    return "TEKNIK_KULLANIM";
  }

  if (legalStatus === "BAGIMSIZ_BOLUM_EKLENTISI") {
    return "SATIS_DISI";
  }

  return "ORTAK_KULLANIMA_AYRILMIS";
}

function createProjectSpaceForm(
  spaceType = "LOBI",
): ProjectSpaceForm {
  const legalStatus = defaultSpaceLegalStatus(spaceType);

  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name:
      PROJECT_SPACE_TYPE_OPTIONS.find((option) => option.value === spaceType)
        ?.label || "Proje Alanı",
    spaceType,
    customTypeName: "",
    count: "1",
    blockCode: "",
    floorLevel: "",
    grossArea: "",
    legalStatus,
    commercialPurpose: defaultSpaceCommercialPurpose(legalStatus),
    description: "",
    isCustomerVisible: true,
  };
}

function projectSpaceFormsFromSetup(
  setup: ProjectSetupResponse,
): ProjectSpaceForm[] {
  if (!Array.isArray(setup.spaces) || setup.spaces.length === 0) {
    return [];
  }

  return setup.spaces.map((space) => {
    const block = setup.blocks.find((item) => item.id === space.blockId);
    const floor = block?.floors.find((item) => item.id === space.floorId);

    return {
      key: space.id,
      name: space.name || "",
      spaceType: space.spaceType,
      customTypeName: space.customTypeName || "",
      count: "1",
      blockCode: block?.code || "",
      floorLevel: floor ? String(floor.level) : "",
      grossArea: space.grossArea === null ? "" : String(space.grossArea),
      legalStatus: space.legalStatus,
      commercialPurpose: space.commercialPurpose,
      description: space.description || "",
      isCustomerVisible: space.isCustomerVisible,
    };
  });
}

function emptyForm(): ProjectForm {
  return {
    name: "",
    code: "",
    description: "",
    lifecycleStage: "",
    city: "",
    district: "",
    neighborhood: "",
    address: "",
    adaNo: "",
    parselNo: "",
    latitude: "",
    longitude: "",
    mapAddress: "",
    declaredIndependentUnitCount: "",
    declaredSalesInventoryCount: "",
    geometryType: "DIKDORTGEN",
    plannedUnitTypes: ["DAIRE"],
  };
}

function formFromProject(project: ProjectSummary): ProjectForm {
  return {
    name: project.name || "",
    code: project.code || "",
    description: project.description || "",
    lifecycleStage: project.lifecycleStage || "",
    city: project.city || "",
    district: project.district || "",
    neighborhood: project.neighborhood || "",
    address: project.address || "",
    adaNo: project.adaNo || "",
    parselNo: project.parselNo || "",
    latitude: project.latitude === null ? "" : String(project.latitude),
    longitude: project.longitude === null ? "" : String(project.longitude),
    mapAddress: project.mapAddress || "",
    declaredIndependentUnitCount:
      project.declaredIndependentUnitCount === null
        ? ""
        : String(project.declaredIndependentUnitCount),
    declaredSalesInventoryCount:
      project.declaredSalesInventoryCount === null
        ? ""
        : String(project.declaredSalesInventoryCount),
    geometryType: project.geometryType || "DIKDORTGEN",
    plannedUnitTypes:
      project.plannedUnitTypes?.length > 0
        ? project.plannedUnitTypes
        : ["DAIRE"],
  };
}

function numberOrNull(value: string) {
  const normalized = value.trim().replace(",", ".");

  if (!normalized) return null;

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function integerOrNull(value: string) {
  const parsed = numberOrNull(value);

  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

export default function ProjectSalesCenterPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [mode, setMode] = useState<PageMode>("list");
  const [editingProject, setEditingProject] = useState<ProjectSummary | null>(
    null,
  );
  const [form, setForm] = useState<ProjectForm>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null);
  const [structureProject, setStructureProject] =
    useState<ProjectSummary | null>(null);
  const [blocks, setBlocks] = useState<BlockForm[]>([]);
  const [structurePreview, setStructurePreview] =
    useState<StructurePreview | null>(null);
  const [inventoryProject, setInventoryProject] =
    useState<ProjectSetupResponse | null>(null);
  const [floorPlans, setFloorPlans] = useState<FloorPlanForm[]>([]);
  const [inventoryPreview, setInventoryPreview] =
    useState<InventoryPreview | null>(null);
  const [inventoryEditMode, setInventoryEditMode] = useState(false);
  const [numberingMode, setNumberingMode] =
    useState<ProjectNumberingMode>("FLOOR_CODED");
  const [spacesProject, setSpacesProject] =
    useState<ProjectSetupResponse | null>(null);
  const [projectSpaces, setProjectSpaces] = useState<ProjectSpaceForm[]>([]);
  const [spacesPreview, setSpacesPreview] =
    useState<ProjectSpacesPreview | null>(null);

  const [completionProject, setCompletionProject] =
    useState<ProjectSetupResponse | null>(null);
  const [completionPreview, setCompletionPreview] =
    useState<CompletionPreview | null>(null);
  const [designReviewMessage, setDesignReviewMessage] = useState("");
  const [salesStock, setSalesStock] =
    useState<ProjectSalesStockResponse | null>(null);
  const [salesStockDrafts, setSalesStockDrafts] = useState<
    Record<string, ProjectSalesStockDraft>
  >({});
  const [mediaProject, setMediaProject] =
    useState<ProjectSummary | null>(null);
  const [mediaConfig, setMediaConfig] =
    useState<ProjectMediaConfig | null>(null);
  const [mediaPackages, setMediaPackages] =
    useState<ProjectMediaPackagesResponse | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] =
    useState<ProjectMediaPreview | null>(null);
  const [mediaReplaceExisting, setMediaReplaceExisting] =
    useState(false);
  const [launchProject, setLaunchProject] =
    useState<ProjectSummary | null>(null);
  const [launchCenter, setLaunchCenter] =
    useState<ProjectLaunchCenterResponse | null>(null);
  const [renderWorkOrder, setRenderWorkOrder] =
    useState<ProjectRenderWorkOrderResponse | null>(null);
  const [presentationLink, setPresentationLink] =
    useState<ProjectPresentationLinkResponse | null>(null);

  const eligible = useMemo(() => isEligibleRole(user?.role), [user?.role]);

  const loadProjects = useCallback(async () => {
    if (!eligible) return;

    setLoading(true);

    try {
      const response = await api.get<ProjectSummary[]>(
        "/project-sales/projects",
      );
      setProjects(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Projeler Yüklenemedi",
        message: apiMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }, [eligible]);

  useEffect(() => {
    if (!hasHydrated || !eligible) return;
    void loadProjects();
  }, [eligible, hasHydrated, loadProjects]);

  const updateField = <K extends keyof ProjectForm>(
    field: K,
    value: ProjectForm[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleUnitType = (unitType: string) => {
    setForm((current) => {
      const selected = current.plannedUnitTypes.includes(unitType);

      if (selected && current.plannedUnitTypes.length === 1) {
        return current;
      }

      return {
        ...current,
        plannedUnitTypes: selected
          ? current.plannedUnitTypes.filter((item) => item !== unitType)
          : [...current.plannedUnitTypes, unitType],
      };
    });
  };

  const startNewProject = () => {
    setEditingProject(null);
    setForm(emptyForm());
    setMode("form");
  };

  const editProject = (project: ProjectSummary) => {
    setEditingProject(project);
    setForm(formFromProject(project));
    setMode("form");
  };

  const deleteProject = async () => {
    if (!deleteTarget) return;

    const projectId = deleteTarget.id;
    const projectName = deleteTarget.name;
    setBusyAction(`delete-${projectId}`);

    try {
      await api.delete(`/project-sales/projects/${projectId}`);
      setProjects((current) =>
        current.filter((project) => project.id !== projectId),
      );
      setDeleteTarget(null);
      setNotice({
        tone: "success",
        title: "Proje Silindi",
        message: `${projectName} ve projeye bağlı blok, kat, bağımsız bölüm ve alan kayıtları silindi. Yeni projeye sıfırdan başlayabilirsiniz.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Proje Silinemedi",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const loadMediaCenterData = async (projectCode: string) => {
    const safeCode = encodeURIComponent(projectCode);
    const [configResponse, packagesResponse] = await Promise.all([
      api.get<ProjectMediaConfig>(
        `/project-sales/media/${safeCode}/config`,
      ),
      api.get<ProjectMediaPackagesResponse>(
        `/project-sales/media/${safeCode}/packages`,
      ),
    ]);

    setMediaConfig(configResponse.data);
    setMediaPackages(packagesResponse.data);
  };

  const openMediaCenter = async (project: ProjectSummary) => {
    setBusyAction("media-load");

    try {
      const ensureResponse = await api.post<ProjectMediaEnsureResponse>(
        `/project-sales/projects/${project.id}/media-packages/ensure`,
      );
      const ensuredCode = ensureResponse.data.project.code;
      const projectWithCode = {
        ...project,
        code: ensuredCode,
      };

      setMediaProject(projectWithCode);
      setMediaFile(null);
      setMediaPreview(null);
      setMediaReplaceExisting(false);
      await loadMediaCenterData(ensuredCode);
      setMode("media");
      await loadProjects();
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Görsel Merkezi Açılamadı",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const openLaunchFlow = async (
    project: ProjectSummary,
    destination: Extract<PageMode, "render" | "presentation" | "publish">,
  ) => {
    setBusyAction(`launch-${destination}`);

    try {
      const response = await api.get<ProjectLaunchCenterResponse>(
        `/project-sales/projects/${project.id}/launch`,
      );

      setLaunchProject(project);
      setLaunchCenter(response.data);
      setRenderWorkOrder(null);
      setPresentationLink(null);
      setMode(destination);
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Lansman Merkezi Açılamadı",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const createRenderWorkOrder = async () => {
    if (!launchProject) return;

    setBusyAction("render-work-order");

    try {
      const response = await api.post<ProjectRenderWorkOrderResponse>(
        `/project-sales/projects/${launchProject.id}/launch/render-work-order`,
      );
      setRenderWorkOrder(response.data);
      setNotice({
        tone: "success",
        title: "Render İş Emri Hazır",
        message: `${response.data.scenes.length} sahne için üretim brief'i hazırlandı.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Render İş Emri Oluşturulamadı",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const createPresentationLink = async () => {
    if (!launchProject) return;

    setBusyAction("presentation-link");

    try {
      const response = await api.post<ProjectPresentationLinkResponse>(
        `/project-sales/projects/${launchProject.id}/launch/presentation-link`,
      );
      setPresentationLink(response.data);

      try {
        await navigator.clipboard.writeText(response.data.url);
      } catch {
        // Clipboard permission may be blocked; the link is still shown on screen.
      }

      setNotice({
        tone: "success",
        title: "Müşteri Sunum Linki Hazır",
        message: "Güvenli sunum linki oluşturuldu ve panoya kopyalanmaya çalışıldı.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Sunum Linki Oluşturulamadı",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const publishProjectToPool = async () => {
    if (!launchProject) return;

    setBusyAction("publish-to-pool");

    try {
      const response = await api.post<ProjectPublishToPoolResponse>(
        `/project-sales/projects/${launchProject.id}/launch/publish-to-pool`,
      );
      const launchResponse = await api.get<ProjectLaunchCenterResponse>(
        `/project-sales/projects/${launchProject.id}/launch`,
      );

      setLaunchCenter(launchResponse.data);
      setNotice({
        tone: "success",
        title: "Proje Havuza Yayınlandı",
        message: `${response.data.publishedUnitCount} bağımsız bölüm havuz görünürlüğüne açıldı.`,
      });
      void loadProjects();
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Proje Havuza Yayınlanamadı",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const previewMediaArchive = async () => {
    if (!mediaProject?.code || !mediaFile) {
      setNotice({
        tone: "warning",
        title: "ZIP Dosyası Seçilmedi",
        message:
          "Önizleme için proje klasörlerini içeren bir ZIP dosyası seçin.",
      });
      return;
    }

    setBusyAction("media-preview");

    try {
      const formData = new FormData();
      formData.append("file", mediaFile);
      formData.append(
        "replaceExisting",
        mediaReplaceExisting ? "true" : "false",
      );

      const response = await api.post<ProjectMediaPreview>(
        `/project-sales/media/${encodeURIComponent(
          mediaProject.code,
        )}/zip/preview`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 0,
        },
      );

      setMediaPreview(response.data);
      setNotice({
        tone: response.data.valid ? "success" : "warning",
        title: response.data.valid
          ? "ZIP Önizlemesi Hazır"
          : "ZIP Dosyasında Eksikler Var",
        message: response.data.valid
          ? `${response.data.summary.packageCount} klasör ve ${response.data.summary.imageCount} görsel doğrulandı.`
          : `${response.data.summary.errorCount} hata ve ${response.data.summary.warningCount} uyarı bulundu.`,
      });
    } catch (error) {
      const responseData = (error as any)?.response?.data;
      const embeddedPreview =
        responseData?.preview ||
        responseData?.message?.preview ||
        responseData?.response?.preview;

      if (embeddedPreview) {
        setMediaPreview(embeddedPreview as ProjectMediaPreview);
      }

      setNotice({
        tone: "error",
        title: "ZIP Önizlenemedi",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const uploadMediaArchive = async () => {
    if (!mediaProject?.code || !mediaFile || !mediaPreview?.valid) {
      setNotice({
        tone: "warning",
        title: "Yükleme Henüz Hazır Değil",
        message:
          "Önce ZIP dosyasını seçin ve hatasız önizleme oluşturun.",
      });
      return;
    }

    setBusyAction("media-upload");

    try {
      const formData = new FormData();
      formData.append("file", mediaFile);
      formData.append(
        "replaceExisting",
        mediaReplaceExisting ? "true" : "false",
      );

      const response = await api.post<{
        success: boolean;
        summary: {
          packageCount: number;
          uploadedAssetCount: number;
          replacedAssetCount: number;
          assignedUnitCount: number;
        };
      }>(
        `/project-sales/media/${encodeURIComponent(
          mediaProject.code,
        )}/zip/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 0,
        },
      );

      await loadMediaCenterData(mediaProject.code);
      setMediaFile(null);
      setMediaPreview(null);
      setNotice({
        tone: "success",
        title: "Proje Görselleri Yüklendi",
        message: `${response.data.summary.uploadedAssetCount} görsel, ${response.data.summary.packageCount} fotoğraf paketine kaydedildi ve ${response.data.summary.assignedUnitCount} bağımsız bölüme bağlandı.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Görseller Yüklenemedi",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const openSalesStock = async (project: ProjectSummary) => {
    setBusyAction("sales-stock-load");

    try {
      const response = await api.get<ProjectSalesStockResponse>(
        `/project-sales/projects/${project.id}/sales-stock`,
      );
      const stock = response.data;

      setSalesStock(stock);
      setSalesStockDrafts(
        Object.fromEntries(
          stock.units.map((unit) => [
            unit.id,
            {
              price: unit.price > 0 ? salesPriceDigits(unit.price) : "",
              status: unit.status,
            },
          ]),
        ),
      );
      setMode("sales");
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Satış Stoku Açılamadı",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const updateSalesStockDraft = (
    unitId: string,
    field: keyof ProjectSalesStockDraft,
    value: string,
  ) => {
    setSalesStockDrafts((current) => ({
      ...current,
      [unitId]: {
        price: current[unitId]?.price || "",
        status: current[unitId]?.status || "SATILIK",
        [field]: field === "price" ? salesPriceDigits(value) : value,
      },
    }));
  };

  const applySalesStockDrafts = (
    unitIds: string[],
    patch: Partial<ProjectSalesStockDraft>,
  ) => {
    const selectedIds = new Set(unitIds);

    setSalesStockDrafts((current) =>
      Object.fromEntries(
        Object.entries(current).map(([unitId, draft]) => [
          unitId,
          selectedIds.has(unitId)
            ? {
                ...draft,
                ...(patch.price !== undefined
                  ? { price: salesPriceDigits(patch.price) }
                  : {}),
                ...(patch.status !== undefined
                  ? { status: patch.status }
                  : {}),
              }
            : draft,
        ]),
      ),
    );
  };

  const saveSalesStockUnits = async (
    unitIds: string[],
    patch?: Partial<ProjectSalesStockDraft>,
  ) => {
    if (!salesStock) return;

    const uniqueIds = Array.from(new Set(unitIds));
    const unitsById = new Map(
      salesStock.units.map((unit) => [unit.id, unit]),
    );
    const updates = uniqueIds
      .map((unitId) => {
        const unit = unitsById.get(unitId);
        const currentDraft = salesStockDrafts[unitId];

        if (!unit || !currentDraft) return null;

        const draft: ProjectSalesStockDraft = {
          price:
            patch?.price !== undefined
              ? salesPriceDigits(patch.price)
              : currentDraft.price,
          status: patch?.status ?? currentDraft.status,
        };
        const price = parseSalesPrice(draft.price) ?? 0;

        return {
          unitId,
          price,
          priceCurrency: "TRY",
          status: draft.status,
          dirty: isSalesDraftDirty(unit, draft),
        };
      })
      .filter(Boolean) as Array<
      | {
          error: string;
        }
      | {
          unitId: string;
          price: number;
          priceCurrency: string;
          status: string;
          dirty: boolean;
        }
    >;

    const invalid = updates.find(
      (update): update is { error: string } => "error" in update,
    );

    if (invalid) {
      setNotice({
        tone: "warning",
        title: "Fiyat Eksik veya Geçersiz",
        message: invalid.error,
      });
      return;
    }

    const validUpdates = updates
      .filter(
        (
          update,
        ): update is {
          unitId: string;
          price: number;
          priceCurrency: string;
          status: string;
          dirty: boolean;
        } => "unitId" in update,
      )
      .filter((update) => update.dirty || patch !== undefined)
      .map(({ dirty: _dirty, ...update }) => update);

    if (validUpdates.length === 0) {
      setNotice({
        tone: "warning",
        title: "Kaydedilecek Değişiklik Yok",
        message:
          "Fiyat veya satış durumunda değişiklik yaptıktan sonra tekrar deneyin.",
      });
      return;
    }

    setBusyAction("sales-stock-bulk-save");

    try {
      const response = await api.patch<ProjectSalesStockResponse>(
        `/project-sales/projects/${salesStock.project.id}/sales-stock/bulk`,
        {
          updates: validUpdates,
        },
      );
      const stock = response.data;

      setSalesStock(stock);
      setSalesStockDrafts(
        Object.fromEntries(
          stock.units.map((unit) => [
            unit.id,
            {
              price:
                unit.price > 0 ? salesPriceDigits(unit.price) : "",
              status: unit.status,
            },
          ]),
        ),
      );
      setNotice({
        tone: "success",
        title: "Toplu Satış Stoku Kaydedildi",
        message: `${validUpdates.length} bağımsız bölüm tek işlemde güncellendi.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Toplu Satış Stoku Kaydedilemedi",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const saveSalesStockUnit = async (unitId: string) => {
    await saveSalesStockUnits([unitId]);
  };

  const openStructure = async (project: ProjectSummary) => {
    setBusyAction("structure-load");

    try {
      const response = await api.get<ProjectSetupResponse>(
        `/project-sales/projects/${project.id}/setup`,
      );
      const setup = response.data;

      setStructureProject(setup);
      setEditingProject(setup);
      setForm(formFromProject(setup));
      setBlocks(blockFormsFromSetup(setup));
      setStructurePreview(null);
      setMode("structure");
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Proje Yapısı Açılamadı",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const openInventory = async (project: ProjectSummary) => {
    setBusyAction("inventory-load");

    try {
      const response = await api.get<ProjectSetupResponse>(
        `/project-sales/projects/${project.id}/setup`,
      );
      const setup = response.data;

      if (!Array.isArray(setup.blocks) || setup.blocks.length === 0) {
        throw new Error(
          "Önce blok ve kat yapısını kaydedin, ardından bağımsız bölüm dağılımına geçin.",
        );
      }

      setInventoryProject(setup);
      setStructureProject(setup);
      setEditingProject(setup);
      setNumberingMode(inferProjectNumberingMode(setup.units));
      setFloorPlans(floorPlansFromSetup(setup));
      setInventoryPreview(null);
      setInventoryEditMode(false);
      setMode("inventory");
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Bağımsız Bölüm Adımı Açılamadı",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const openSpaces = async (project: ProjectSummary) => {
    setBusyAction("spaces-load");

    try {
      const response = await api.get<ProjectSetupResponse>(
        `/project-sales/projects/${project.id}/setup`,
      );
      const setup = response.data;

      if (setup._count.units === 0) {
        throw new Error(
          "Önce bağımsız bölümleri oluşturun, ardından proje alanlarına geçin.",
        );
      }

      setSpacesProject(setup);
      setInventoryProject(setup);
      setStructureProject(setup);
      setEditingProject(setup);
      setProjectSpaces(projectSpaceFormsFromSetup(setup));
      setSpacesPreview(null);
      setMode("spaces");
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Proje Alanları Açılamadı",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const openCompletion = async (project: ProjectSummary) => {
    setBusyAction("completion-load");

    try {
      const [setupResponse, previewResponse] = await Promise.all([
        api.get<ProjectSetupResponse>(
          `/project-sales/projects/${project.id}/setup`,
        ),
        api.get<CompletionPreview>(
          `/project-sales/projects/${project.id}/completion-preview`,
        ),
      ]);

      const setup = setupResponse.data;

      if (setup._count.units === 0) {
        throw new Error(
          "Son kontrolden önce bağımsız bölüm envanteri oluşturulmalıdır.",
        );
      }

      setCompletionProject(setup);
      setSpacesProject(setup);
      setInventoryProject(setup);
      setStructureProject(setup);
      setEditingProject(setup);
      setCompletionPreview(previewResponse.data);
      setDesignReviewMessage("");
      setMode("completion");
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Son Kontrol Açılamadı",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const requestDesignReview = async () => {
    if (!completionProject) return;

    setBusyAction("design-review");

    try {
      await api.post(
        `/project-sales/projects/${completionProject.id}/design-review-requests`,
        {
          userMessage: designReviewMessage.trim() || undefined,
        },
      );

      setNotice({
        tone: "success",
        title: "İnceleme Talebi Oluşturuldu",
        message:
          "Proje geometrisi Yazılım Ekibi inceleme listesine gönderildi.",
      });

      await openCompletion(completionProject);
    } catch (error) {
      setNotice({
        tone: "error",
        title: "İnceleme Talebi Oluşturulamadı",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const completeProject = async () => {
    if (!completionProject || !completionPreview?.ready) return;

    setBusyAction("complete-project");

    try {
      await api.post(
        `/project-sales/projects/${completionProject.id}/complete`,
      );

      setNotice({
        tone: "success",
        title: "Proje Kurulumu Tamamlandı",
        message:
          "Proje, bloklar, katlar, bağımsız bölümler ve proje alanları başarıyla tamamlandı.",
      });

      await loadProjects();
      await openCompletion(completionProject);
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Proje Tamamlanamadı",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const updateProjectSpace = <K extends keyof ProjectSpaceForm>(
    key: string,
    field: K,
    value: ProjectSpaceForm[K],
  ) => {
    setProjectSpaces((current) =>
      current.map((space) => {
        if (space.key !== key) return space;

        if (field === "spaceType") {
          const spaceType = String(value);
          const legalStatus = defaultSpaceLegalStatus(spaceType);

          return {
            ...space,
            spaceType,
            name:
              space.name ||
              PROJECT_SPACE_TYPE_OPTIONS.find(
                (option) => option.value === spaceType,
              )?.label ||
              "Proje Alanı",
            legalStatus,
            commercialPurpose: defaultSpaceCommercialPurpose(legalStatus),
          };
        }

        if (field === "legalStatus") {
          const legalStatus = String(value);

          return {
            ...space,
            legalStatus,
            commercialPurpose: defaultSpaceCommercialPurpose(legalStatus),
          };
        }

        if (field === "blockCode" && !value) {
          return {
            ...space,
            blockCode: "",
            floorLevel: "",
          };
        }

        return { ...space, [field]: value };
      }),
    );
    setSpacesPreview(null);
  };

  const addProjectSpace = () => {
    setProjectSpaces((current) => [...current, createProjectSpaceForm()]);
    setSpacesPreview(null);
  };

  const removeProjectSpace = (key: string) => {
    setProjectSpaces((current) =>
      current.filter((space) => space.key !== key),
    );
    setSpacesPreview(null);
  };

  const buildSpacesPayload = () => ({
    projectSpaces: projectSpaces
      .filter((space) => countValue(space.count) > 0)
      .map((space) => ({
        name: space.name.trim(),
        spaceType: space.spaceType,
        customTypeName:
          space.spaceType === "DIGER"
            ? space.customTypeName.trim() || null
            : null,
        count: countValue(space.count),
        blockCode: space.blockCode || null,
        floorLevel:
          space.blockCode && space.floorLevel !== ""
            ? Number(space.floorLevel)
            : null,
        grossArea: numberOrNull(space.grossArea),
        legalStatus: space.legalStatus,
        commercialPurpose: space.commercialPurpose,
        description: space.description.trim() || null,
        isCustomerVisible: space.isCustomerVisible,
      })),
  });

  const previewProjectSpaces = async () => {
    if (!spacesProject) return;

    setBusyAction("spaces-preview");

    try {
      const response = await api.post<ProjectSpacesPreview>(
        `/project-sales/projects/${spacesProject.id}/spaces/preview`,
        buildSpacesPayload(),
      );

      setSpacesPreview(response.data);
      setNotice({
        tone: "success",
        title: "Proje Alanları Kontrol Edildi",
        message:
          response.data.summary.projectSpaceCount > 0
            ? `${response.data.summary.projectSpaceCount} sosyal, ortak veya teknik alan doğrulandı.`
            : "Bu projede sosyal, ortak veya teknik alan bulunmadığı doğrulandı.",
      });
    } catch (error) {
      setSpacesPreview(null);
      setNotice({
        tone: "error",
        title: "Proje Alanları Doğrulanamadı",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const applyProjectSpaces = async () => {
    if (!spacesProject || !spacesPreview) return;

    setBusyAction("spaces-apply");

    try {
      await api.post(
        `/project-sales/projects/${spacesProject.id}/spaces/apply`,
        buildSpacesPayload(),
      );

      setNotice({
        tone: "success",
        title: "Proje Alanları Kaydedildi",
        message:
          spacesPreview.summary.projectSpaceCount > 0
            ? "Sosyal, ortak ve teknik alanlar başarıyla oluşturuldu. Proje son kontrol aşamasına hazır."
            : "Projede ortak, sosyal veya teknik alan olmadığı kaydedildi. Proje son kontrol aşamasına hazır.",
      });
      await loadProjects();
      await openSpaces(spacesProject);
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Proje Alanları Kaydedilemedi",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const updateFloorPlan = <K extends keyof FloorPlanForm>(
    floorKey: string,
    field: K,
    value: FloorPlanForm[K],
  ) => {
    setFloorPlans((current) =>
      current.map((floorPlan) =>
        floorPlan.key === floorKey
          ? { ...floorPlan, [field]: value }
          : floorPlan,
      ),
    );
    setInventoryPreview(null);
  };

  const updateUnitGroup = <K extends keyof UnitGroupForm>(
    floorKey: string,
    groupKey: string,
    field: K,
    value: UnitGroupForm[K],
  ) => {
    setFloorPlans((current) =>
      current.map((floorPlan) =>
        floorPlan.key === floorKey
          ? {
              ...floorPlan,
              unitGroups: floorPlan.unitGroups.map((group) =>
                group.key === groupKey ? { ...group, [field]: value } : group,
              ),
            }
          : floorPlan,
      ),
    );
    setInventoryPreview(null);
  };

  const toggleUnitFacade = (
    floorKey: string,
    groupKey: string,
    facade: string,
  ) => {
    setFloorPlans((current) =>
      current.map((floorPlan) => {
        if (floorPlan.key !== floorKey) return floorPlan;

        return {
          ...floorPlan,
          unitGroups: floorPlan.unitGroups.map((group) => {
            if (group.key !== groupKey) return group;

            if (facade === NO_FACADE_OPTION) {
              return {
                ...group,
                facades: group.facades.includes(NO_FACADE_OPTION)
                  ? []
                  : [NO_FACADE_OPTION],
              };
            }

            const facadesWithoutNoFacade = group.facades.filter(
              (item) => item !== NO_FACADE_OPTION,
            );

            return {
              ...group,
              facades: facadesWithoutNoFacade.includes(facade)
                ? facadesWithoutNoFacade.filter((item) => item !== facade)
                : [...facadesWithoutNoFacade, facade],
            };
          }),
        };
      }),
    );
    setInventoryPreview(null);
  };

  const addUnitGroup = (floorKey: string) => {
    setFloorPlans((current) =>
      current.map((floorPlan) =>
        floorPlan.key === floorKey
          ? {
              ...floorPlan,
              unitGroups: [
                ...floorPlan.unitGroups,
                createUnitGroup(
                  inventoryProject?.plannedUnitTypes?.[0] || "DAIRE",
                ),
              ],
            }
          : floorPlan,
      ),
    );
    setInventoryPreview(null);
  };

  const removeUnitGroup = (floorKey: string, groupKey: string) => {
    setFloorPlans((current) =>
      current.map((floorPlan) => {
        if (floorPlan.key !== floorKey || floorPlan.unitGroups.length === 1) {
          return floorPlan;
        }

        return {
          ...floorPlan,
          unitGroups: floorPlan.unitGroups.filter(
            (group) => group.key !== groupKey,
          ),
        };
      }),
    );
    setInventoryPreview(null);
  };

  const copyFloorDistributionToAll = (
    sourceFloorKey: string,
    options: FloorCopyOptions,
  ) => {
    const source = floorPlans.find(
      (floorPlan) => floorPlan.key === sourceFloorKey,
    );

    if (!source) return;

    const selectedLabels = [
      options.unitGroups ? "bağımsız bölüm dağılımı" : null,
      options.numberPrefix ? "numara ön eki" : null,
      options.startingSequence ? "başlangıç sıra numarası" : null,
    ].filter(Boolean);

    if (selectedLabels.length === 0) {
      setNotice({
        tone: "warning",
        title: "Kopyalanacak Alan Seçilmedi",
        message:
          "Toplu kopyalama bölümünden en az bir alan seçin.",
      });
      return;
    }

    setFloorPlans((current) =>
      current.map((floorPlan) => {
        if (
          floorPlan.key === sourceFloorKey ||
          floorPlan.blockCode !== source.blockCode
        ) {
          return floorPlan;
        }

        return {
          ...floorPlan,
          ...(options.unitGroups
            ? {
                unitGroups: source.unitGroups.map(cloneUnitGroup),
              }
            : {}),
          ...(options.numberPrefix
            ? {
                numberPrefix: source.numberPrefix,
              }
            : {}),
          ...(options.startingSequence
            ? {
                startingSequence: source.startingSequence,
              }
            : {}),
        };
      }),
    );
    setInventoryPreview(null);
    setNotice({
      tone: "success",
      title: "Seçili Alanlar Bloka Uygulandı",
      message: `${selectedLabels.join(
        ", ",
      )} aynı bloktaki diğer katlara uygulandı. Farklı bloklar değiştirilmedi.`,
    });
  };

  const buildInventoryPayload = () => ({
    numberingMode,
    floorPlans: floorPlans
      .map((floorPlan) => ({
        blockCode: floorPlan.blockCode,
        floorLevel: floorPlan.floorLevel,
        numberPrefix:
          floorPlan.numberPrefix.trim() ||
          defaultNumberPrefix(floorPlan.blockCode),
        startingSequence: positiveInteger(floorPlan.startingSequence),
        unitGroups: floorPlan.unitGroups
          .filter((group) => countValue(group.count) > 0)
          .map((group) => ({
            count: countValue(group.count),
            type: group.type,
            roomCount: group.roomCount.trim() || null,
            netArea: numberOrNull(group.netArea),
            grossArea: numberOrNull(group.grossArea),
            facades: group.facades,
            conceptLabel: group.conceptLabel.trim() || null,
            legalStatus: "TAPUDA_BAGIMSIZ_BOLUM",
            commercialPurpose: group.commercialPurpose,
          })),
      }))
      .filter((floorPlan) => floorPlan.unitGroups.length > 0),
    projectSpaces: [],
  });

  const previewInventory = async () => {
    if (!inventoryProject) return;

    setBusyAction("inventory-preview");

    try {
      const response = await api.post<InventoryPreview>(
        `/project-sales/projects/${inventoryProject.id}/inventory/preview`,
        buildInventoryPayload(),
      );

      setInventoryPreview(response.data);
      setNotice({
        tone: "success",
        title: "Envanter Kontrol Edildi",
        message: `${response.data.summary.independentUnitCount} bağımsız bölüm ve ${response.data.summary.salesInventoryCount} satış/kiralama stoku doğrulandı.`,
      });
    } catch (error) {
      setInventoryPreview(null);
      setNotice({
        tone: "error",
        title: "Envanter Doğrulanamadı",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const applyInventory = async () => {
    if (!inventoryProject || !inventoryPreview) return;

    setBusyAction("inventory-apply");

    try {
      await api.post(
        `/project-sales/projects/${inventoryProject.id}/inventory/apply`,
        buildInventoryPayload(),
      );

      setNotice({
        tone: "success",
        title: "Bağımsız Bölümler Oluşturuldu",
        message:
          "Bağımsız bölüm envanteri başarıyla oluşturuldu. Sonraki adım sosyal, ortak ve teknik alanlardır.",
      });
      await loadProjects();
      await openInventory(inventoryProject);
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Envanter Kaydedilemedi",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const startInventoryEdit = () => {
    if (!inventoryProject?._count.units) return;

    setInventoryEditMode(true);
    setInventoryPreview(null);
    setNotice({
      tone: "warning",
      title: "Düzenleme Modu Açıldı",
      message:
        "Kaydedilmiş bağımsız bölüm dağılımını değiştirebilirsiniz. Güncelleme öncesinde toplamların proje beyanıyla eşleşmesi gerekir.",
    });
  };

  const cancelInventoryEdit = () => {
    if (!inventoryProject) return;
    void openInventory(inventoryProject);
  };

  const replaceInventory = async () => {
    if (!inventoryProject) return;

    const plannedUnitCount = floorPlans.reduce(
      (total, floorPlan) =>
        total +
        floorPlan.unitGroups.reduce(
          (floorTotal, group) => floorTotal + countValue(group.count),
          0,
        ),
      0,
    );
    const plannedSalesCount = floorPlans.reduce(
      (total, floorPlan) =>
        total +
        floorPlan.unitGroups.reduce(
          (floorTotal, group) =>
            floorTotal +
            (SALES_COMMERCIAL_PURPOSES.has(group.commercialPurpose)
              ? countValue(group.count)
              : 0),
          0,
        ),
      0,
    );
    const declaredUnitCount =
      inventoryProject.declaredIndependentUnitCount;
    const declaredSalesCount =
      inventoryProject.declaredSalesInventoryCount;

    if (plannedUnitCount === 0) {
      setNotice({
        tone: "warning",
        title: "Bağımsız Bölüm Bulunamadı",
        message:
          "Güncelleme için en az bir bağımsız bölüm adedi girilmelidir.",
      });
      return;
    }

    if (
      declaredUnitCount !== null &&
      plannedUnitCount !== declaredUnitCount
    ) {
      setNotice({
        tone: "warning",
        title: "Toplam Bağımsız Bölüm Uyuşmuyor",
        message: `Beyan edilen toplam ${declaredUnitCount}, girilen toplam ${plannedUnitCount}. Güncellemeden önce değerleri eşitleyin.`,
      });
      return;
    }

    if (
      declaredSalesCount !== null &&
      plannedSalesCount !== declaredSalesCount
    ) {
      setNotice({
        tone: "warning",
        title: "Satış Stoku Uyuşmuyor",
        message: `Beyan edilen satış/kiralama stoku ${declaredSalesCount}, girilen stok ${plannedSalesCount}. Güncellemeden önce değerleri eşitleyin.`,
      });
      return;
    }

    setBusyAction("inventory-replace");

    try {
      await api.post(
        `/project-sales/projects/${inventoryProject.id}/inventory/replace`,
        buildInventoryPayload(),
      );

      const refreshedResponse = await api.get<ProjectSetupResponse>(
        `/project-sales/projects/${inventoryProject.id}/setup`,
      );
      const refreshedSetup = refreshedResponse.data;

      setInventoryProject(refreshedSetup);
      setStructureProject(refreshedSetup);
      setEditingProject(refreshedSetup);
      setNumberingMode(inferProjectNumberingMode(refreshedSetup.units));
      setFloorPlans(floorPlansFromSetup(refreshedSetup));
      setInventoryPreview(null);
      setInventoryEditMode(false);
      setMode("inventory");

      await loadProjects();

      setNotice({
        tone: "success",
        title: "Bağımsız Bölümler Güncellendi",
        message:
          "Değişiklikler kaydedildi. Güncelleme modu kapatıldı ve kayıtlı değerler yeniden yüklendi.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Envanter Güncellenemedi",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const updateBlock = <K extends keyof BlockForm>(
    key: string,
    field: K,
    value: BlockForm[K],
  ) => {
    setBlocks((current) =>
      current.map((block) => {
        if (block.key !== key) return block;

        if (field === "geometryType") {
          const geometryType = String(value);
          const standardFacadeCount = facadeCountForGeometry(geometryType);

          return {
            ...block,
            geometryType,
            facadeViewCount: String(
              standardFacadeCount ?? (countValue(block.facadeViewCount) || 1),
            ),
          };
        }

        return { ...block, [field]: value };
      }),
    );
    setStructurePreview(null);
  };

  const addBlock = () => {
    setBlocks((current) => {
      const usedCodes = new Set(
        current.map((block) => block.code.trim().toLocaleUpperCase("tr-TR")),
      );
      let nextIndex = 0;

      while (usedCodes.has(blockCodeForIndex(nextIndex))) {
        nextIndex += 1;
      }

      return [
        ...current,
        createBlockForm(
          nextIndex,
          structureProject?.geometryType || "DIKDORTGEN",
        ),
      ];
    });
    setStructurePreview(null);
  };

  const removeBlock = (key: string) => {
    setBlocks((current) =>
      current.length === 1
        ? current
        : current.filter((block) => block.key !== key),
    );
    setStructurePreview(null);
  };

  const buildStructurePayload = () => ({
    blocks: blocks.map((block, index) => ({
      code: block.code.trim(),
      name: block.name.trim() || null,
      geometryType: block.geometryType,
      facadeViewCount:
        facadeCountForGeometry(block.geometryType) ??
        countValue(block.facadeViewCount),
      sortOrder: index,
      floors: buildFloors(block),
    })),
  });

  const previewStructure = async () => {
    if (!structureProject) return;

    setBusyAction("structure-preview");

    try {
      const response = await api.post<StructurePreview>(
        `/project-sales/projects/${structureProject.id}/structure/preview`,
        buildStructurePayload(),
      );

      setStructurePreview(response.data);
      setNotice({
        tone: "success",
        title: "Yapı Kontrol Edildi",
        message: `${response.data.summary.blockCount} blok ve ${response.data.summary.floorCount} kat doğrulandı.`,
      });
    } catch (error) {
      setStructurePreview(null);
      setNotice({
        tone: "error",
        title: "Yapı Doğrulanamadı",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const applyStructure = async () => {
    if (!structureProject || !structurePreview) return;

    setBusyAction("structure-apply");

    try {
      await api.post(
        `/project-sales/projects/${structureProject.id}/structure/apply`,
        buildStructurePayload(),
      );

      setNotice({
        tone: "success",
        title: "Blok ve Katlar Kaydedildi",
        message: "Proje yapısı oluşturuldu. Sonraki adım bağımsız bölüm dağılımıdır.",
      });
      await loadProjects();
      await openStructure(structureProject);
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Proje Yapısı Kaydedilemedi",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setNotice({
        tone: "warning",
        title: "Konum Kullanılamıyor",
        message: "Bu cihaz konum bilgisini desteklemiyor.",
      });
      return;
    }

    setBusyAction("location");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(7),
          longitude: position.coords.longitude.toFixed(7),
          mapAddress: current.mapAddress || "Cihazın mevcut konumu",
        }));
        setBusyAction(null);
        setNotice({
          tone: "success",
          title: "Konum Alındı",
          message: "Enlem ve boylam bilgileri forma eklendi.",
        });
      },
      (error) => {
        setBusyAction(null);
        setNotice({
          tone: "error",
          title: "Konum Alınamadı",
          message: error.message || "Konum izni verilmedi.",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    code: form.code.trim() || undefined,
    description: form.description.trim() || null,
    lifecycleStage: form.lifecycleStage,
    city: form.city.trim(),
    district: form.district.trim(),
    neighborhood: form.neighborhood.trim(),
    address: form.address.trim(),
    adaNo: form.adaNo.trim() || null,
    parselNo: form.parselNo.trim() || null,
    latitude: numberOrNull(form.latitude),
    longitude: numberOrNull(form.longitude),
    mapAddress: form.mapAddress.trim() || null,
    declaredIndependentUnitCount: integerOrNull(
      form.declaredIndependentUnitCount,
    ),
    declaredSalesInventoryCount: integerOrNull(
      form.declaredSalesInventoryCount,
    ),
    plannedUnitTypes: form.plannedUnitTypes,
    geometryType: form.geometryType,
  });

  const saveProject = async (destination: ProjectSaveDestination) => {
    if (!form.lifecycleStage) {
      setNotice({
        tone: "warning",
        title: "Proje Aşaması Seçilmedi",
        message:
          "Projeyi kaydetmeden önce Hazır, Devam Eden veya Planlanan seçeneklerinden birini seçin.",
      });
      return;
    }

    setBusyAction("save");

    try {
      const response = editingProject
        ? await api.patch<ProjectSummary>(
            `/project-sales/projects/${editingProject.id}/setup`,
            buildPayload(),
          )
        : await api.post<ProjectSummary>(
            "/project-sales/projects",
            buildPayload(),
          );
      const savedProject = response.data;

      setEditingProject(savedProject);
      setForm(formFromProject(savedProject));
      setNotice({
        tone: "success",
        title: "Proje Kaydedildi",
        message:
          destination === "stay"
            ? "Proje bilgileri taslak olarak kaydedildi."
            : "Proje bilgileri kaydedildi. Seçilen kurulum adımına geçiliyor.",
      });

      await loadProjects();

      if (destination === "structure") {
        await openStructure(savedProject);
      } else if (destination === "inventory") {
        await openInventory(savedProject);
      } else if (destination === "spaces") {
        await openSpaces(savedProject);
      } else if (destination === "completion") {
        await openCompletion(savedProject);
      }
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Proje Kaydedilemedi",
        message: apiMessage(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const currentWizardProject =
    mode === "form"
      ? editingProject
      : mode === "structure"
        ? structureProject
        : mode === "inventory"
          ? inventoryProject
          : mode === "spaces"
            ? spacesProject
            : mode === "completion"
              ? completionProject
              : null;

  const handleWizardStepChange = (step: WizardStep) => {
    if (busyAction) return;

    if (mode === "form") {
      if (step === 1) return;

      const destinationByStep: Record<
        Exclude<WizardStep, 1>,
        Exclude<ProjectSaveDestination, "stay">
      > = {
        2: "structure",
        3: "inventory",
        4: "spaces",
        5: "completion",
      };

      void saveProject(destinationByStep[step]);
      return;
    }

    if (!currentWizardProject) return;

    if (step === 1) {
      editProject(currentWizardProject);
      return;
    }

    if (step === 2) {
      void openStructure(currentWizardProject);
      return;
    }

    if (step === 3) {
      void openInventory(currentWizardProject);
      return;
    }

    if (step === 4) {
      void openSpaces(currentWizardProject);
      return;
    }

    void openCompletion(currentWizardProject);
  };

  const spacesStepCompleted = Boolean(
    spacesProject &&
      (spacesProject._count.spaces > 0 ||
        spacesProject.wizardStep === "KONTROL" ||
        spacesProject.wizardStep === "TAMAMLANDI" ||
        spacesProject.setupStatus === "KONTROLE_HAZIR" ||
        spacesProject.setupStatus === "TAMAMLANDI"),
  );
  const completionStepCompleted = Boolean(
    completionProject &&
      (completionProject.wizardStep === "TAMAMLANDI" ||
        completionProject.setupStatus === "TAMAMLANDI"),
  );
  const canNavigateForward =
    !busyAction &&
    (mode === "form" ||
      (mode === "structure" &&
        Boolean(structureProject?._count.blocks)) ||
      (mode === "inventory" &&
        !inventoryEditMode &&
        Boolean(inventoryProject?._count.units)) ||
      (mode === "spaces" && spacesStepCompleted) ||
      (mode === "completion" && completionStepCompleted) ||
      (mode === "render" && Boolean(launchProject && launchCenter)) ||
      (mode === "presentation" && Boolean(launchProject && launchCenter)) ||
      (mode === "publish" && Boolean(launchProject && launchCenter)));

  const handleForwardNavigation = () => {
    if (!canNavigateForward) return;

    if (mode === "form") {
      void saveProject("structure");
      return;
    }

    if (mode === "structure" && structureProject) {
      void openInventory(structureProject);
      return;
    }

    if (mode === "inventory" && inventoryProject) {
      void openSpaces(inventoryProject);
      return;
    }

    if (mode === "spaces" && spacesProject) {
      void openCompletion(spacesProject);
      return;
    }

    if (mode === "completion" && completionStepCompleted) {
      setMode("list");
      void loadProjects();
      return;
    }

    if (mode === "render") {
      setMode("presentation");
      return;
    }

    if (mode === "presentation") {
      setMode("publish");
      return;
    }

    if (mode === "publish") {
      setMode("list");
      void loadProjects();
    }
  };

  if (!hasHydrated) {
    return (
      <CenteredState
        icon={<Loader2 size={28} className="eph-spin" />}
        title="Hesap Kontrol Ediliyor"
        text="Kullanıcı rolünüz doğrulanıyor."
      />
    );
  }

  if (!eligible) {
    return (
      <CenteredState
        icon={<AlertTriangle size={28} />}
        title="Bu Modüle Erişim Yetkiniz Yok"
        text={`EPH Proje Satış Merkezi yalnız Müteahhit, İnşaat Firması ve Yazılım Ekibi rollerine açıktır. Mevcut rolünüz: ${roleLabel(user?.role)}.`}
        action={
          <button 
            type="button"
            onClick={() => router.push("/uretkenlik")}
            style={primaryButtonStyle}
          >
            <ArrowLeft size={18} />
            Üretkenliğe Dön
          </button>
        }
      />
    );
  }

  return (
    <main
      style={{
        width: "100%",
        minHeight: 0,
        height: "calc(100dvh - 72px)",
        maxHeight: "calc(100dvh - 72px)",
        overflowX: "hidden",
        overflowY: "auto",
        overscrollBehaviorY: "contain",
        WebkitOverflowScrolling: "touch",
        scrollbarGutter: "stable",
        boxSizing: "border-box",
        background:
          "linear-gradient(180deg, #F4F8FF 0%, #FFFFFF 52%, #F8FAFC 100%)",
        padding:
          "calc(10px + env(safe-area-inset-top)) 12px calc(120px + env(safe-area-inset-bottom))",
        scrollPaddingBottom:
          "calc(120px + env(safe-area-inset-bottom))",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 980,
          margin: "0 auto",
          minWidth: 0,
          paddingBottom: "calc(48px + env(safe-area-inset-bottom))",
        }}
      >
        <header
          style={{
            ...cardStyle,
            display: "grid",
            gridTemplateColumns: "42px minmax(0, 1fr) 42px",
            alignItems: "center",
            gap: 10,
            padding: 9,
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (mode === "publish") {
                setMode("presentation");
                return;
              }

              if (mode === "presentation") {
                setMode("render");
                return;
              }

              if (mode === "render") {
                setMode("media");
                return;
              }

              if (mode === "media") {
                setMode("list");
                return;
              }

              if (mode === "sales") {
                setMode("list");
                return;
              }

              if (mode === "completion") {
                setMode("spaces");
                return;
              }

              if (mode === "spaces") {
                setMode("inventory");
                return;
              }

              if (mode === "inventory") {
                setMode("structure");
                return;
              }

              if (mode === "structure") {
                setMode("form");
                return;
              }

              if (mode === "form") {
                setMode("list");
                return;
              }

              router.push("/uretkenlik");
            }}
            aria-label="Geri dön"
            style={{
              width: 42,
              height: 42,
              border: "1.5px solid #D6E2F0",
              borderRadius: 13,
              display: "grid",
              placeItems: "center",
              background: "#F8FAFC",
              color: "#334155",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={19} />
          </button>

          <div style={{ minWidth: 0, textAlign: "center" }}>
            <h1
              style={{
                margin: 0,
                color: "#06194A",
                fontSize: 15,
                lineHeight: 1.25,
                fontWeight: 950,
              }}
            >
              EPH PROJE SATIŞ MERKEZİ
            </h1>
            <p
              style={{
                margin: "3px 0 0",
                color: "#64748B",
                fontSize: 11,
                lineHeight: 1.35,
                fontWeight: 750,
              }}
            >
              {mode === "list"
                ? "Proje taslakları"
                : mode === "structure"
                  ? `${structureProject?.name || "Proje"} • Blok ve katlar`
                  : mode === "inventory"
                    ? `${inventoryProject?.name || "Proje"} • Bağımsız bölümler`
                    : mode === "spaces"
                      ? `${spacesProject?.name || "Proje"} • Proje alanları`
                      : mode === "completion"
                        ? `${completionProject?.name || "Proje"} • Son kontrol`
                        : mode === "sales"
                          ? `${salesStock?.project.name || "Proje"} • Satış stoku`
                          : mode === "media"
                            ? `${mediaProject?.name || "Proje"} • Görsel paketleri`
                            : mode === "render"
                              ? `${launchProject?.name || "Proje"} • 3D render`
                              : mode === "presentation"
                                ? `${launchProject?.name || "Proje"} • Müşteri sunumu`
                                : mode === "publish"
                                  ? `${launchProject?.name || "Proje"} • Havuza yayın`
                    : editingProject
                    ? editingProject.name
                    : "Yeni proje"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleForwardNavigation}
            disabled={!canNavigateForward}
            aria-label="İleri git"
            title={
              canNavigateForward
                ? "Sonraki adıma geç"
                : "Sonraki adıma geçmek için mevcut adımı tamamlayın"
            }
            style={{
              width: 42,
              height: 42,
              border: canNavigateForward
                ? "1.5px solid #93C5FD"
                : "1.5px solid #D6E2F0",
              borderRadius: 13,
              display: "grid",
              placeItems: "center",
              background: canNavigateForward ? "#EFF6FF" : "#F8FAFC",
              color: canNavigateForward ? "#1557D6" : "#94A3B8",
              cursor: canNavigateForward ? "pointer" : "not-allowed",
              boxShadow: canNavigateForward
                ? "0 8px 18px rgba(37, 99, 235, 0.14)"
                : "none",
            }}
          >
            {busyAction ? (
              <Loader2 size={18} className="eph-spin" />
            ) : (
              <ArrowRight size={19} />
            )}
          </button>
        </header>

        {mode === "list" ? (
          <ProjectList
            projects={projects}
            loading={loading}
            busyAction={busyAction}
            onCreate={startNewProject}
            onEdit={editProject}
            onStructure={openStructure}
            onInventory={openInventory}
            onSpaces={openSpaces}
            onCompletion={openCompletion}
            onSalesStock={openSalesStock}
            onMedia={openMediaCenter}
            onLaunchFlow={openLaunchFlow}
            onDelete={setDeleteTarget}
          />
        ) : mode === "form" ? (
          <ProjectFormView
            form={form}
            editingProject={editingProject}
            busyAction={busyAction}
            onChange={updateField}
            onToggleUnitType={toggleUnitType}
            onUseCurrentLocation={useCurrentLocation}
            onSave={saveProject}
            onStepChange={handleWizardStepChange}
          />
        ) : mode === "structure" && structureProject ? (
          <ProjectStructureView
            project={structureProject}
            blocks={blocks}
            preview={structurePreview}
            busyAction={busyAction}
            onUpdateBlock={updateBlock}
            onAddBlock={addBlock}
            onRemoveBlock={removeBlock}
            onPreview={previewStructure}
            onApply={applyStructure}
            onContinue={() => void openInventory(structureProject)}
            onStepChange={handleWizardStepChange}
          />
        ) : mode === "inventory" && inventoryProject ? (
          <ProjectInventoryView
            project={inventoryProject}
            floorPlans={floorPlans}
            preview={inventoryPreview}
            busyAction={busyAction}
            editMode={inventoryEditMode}
            numberingMode={numberingMode}
            onUpdateFloorPlan={updateFloorPlan}
            onUpdateUnitGroup={updateUnitGroup}
            onToggleFacade={toggleUnitFacade}
            onAddUnitGroup={addUnitGroup}
            onRemoveUnitGroup={removeUnitGroup}
            onCopyToAll={copyFloorDistributionToAll}
            onNumberingModeChange={(nextMode) => {
              setNumberingMode(nextMode);
              setInventoryPreview(null);
            }}
            onPreview={previewInventory}
            onApply={applyInventory}
            onReplace={replaceInventory}
            onStartEdit={startInventoryEdit}
            onCancelEdit={cancelInventoryEdit}
            onContinue={() => void openSpaces(inventoryProject)}
            onStepChange={handleWizardStepChange}
          />
        ) : mode === "spaces" && spacesProject ? (
          <ProjectSpacesView
            project={spacesProject}
            spaces={projectSpaces}
            preview={spacesPreview}
            busyAction={busyAction}
            onUpdateSpace={updateProjectSpace}
            onAddSpace={addProjectSpace}
            onRemoveSpace={removeProjectSpace}
            onPreview={previewProjectSpaces}
            onApply={applyProjectSpaces}
            onContinue={() => void openCompletion(spacesProject)}
            onStepChange={handleWizardStepChange}
          />
        ) : mode === "media" &&
          mediaProject &&
          mediaConfig &&
          mediaPackages ? (
          <ProjectMediaCenterView
            project={mediaProject}
            config={mediaConfig}
            packages={mediaPackages}
            selectedFile={mediaFile}
            preview={mediaPreview}
            replaceExisting={mediaReplaceExisting}
            busyAction={busyAction}
            onFileChange={(file) => {
              setMediaFile(file);
              setMediaPreview(null);
            }}
            onReplaceExistingChange={(checked) => {
              setMediaReplaceExisting(checked);
              setMediaPreview(null);
            }}
            onPreview={previewMediaArchive}
            onUpload={uploadMediaArchive}
          />
        ) : mode === "sales" && salesStock ? (
          <ProjectSalesStockView
            stock={salesStock}
            drafts={salesStockDrafts}
            busyAction={busyAction}
            onDraftChange={updateSalesStockDraft}
            onApplyDrafts={applySalesStockDrafts}
            onSaveUnits={saveSalesStockUnits}
            onSaveUnit={saveSalesStockUnit}
          />
        ) : (mode === "render" ||
            mode === "presentation" ||
            mode === "publish") &&
          launchProject &&
          launchCenter ? (
          <ProjectSalesLaunchFlowView
            project={launchProject}
            launch={launchCenter}
            mode={mode}
            onModeChange={(nextMode) => setMode(nextMode)}
            onCreateRenderWorkOrder={createRenderWorkOrder}
            onCreatePresentationLink={createPresentationLink}
            onPublishToPool={publishProjectToPool}
            renderWorkOrder={renderWorkOrder}
            presentationLink={presentationLink}
            busyAction={busyAction}
          />
        ) : mode === "completion" &&
          completionProject &&
          completionPreview ? (
          <ProjectCompletionView
            project={completionProject}
            preview={completionPreview}
            busyAction={busyAction}
            reviewMessage={designReviewMessage}
            onReviewMessageChange={setDesignReviewMessage}
            onRefresh={() => void openCompletion(completionProject)}
            onRequestReview={requestDesignReview}
            onComplete={completeProject}
            onBackToList={() => {
              setMode("list");
              void loadProjects();
            }}
            onStepChange={handleWizardStepChange}
          />
        ) : null}
      </section>

      {deleteTarget && (
        <DeleteProjectModal
          project={deleteTarget}
          deleting={busyAction === `delete-${deleteTarget.id}`}
          onCancel={() => {
            if (!busyAction) setDeleteTarget(null);
          }}
          onConfirm={deleteProject}
        />
      )}

      {notice && (
        <NoticeModal notice={notice} onClose={() => setNotice(null)} />
      )}

      <style jsx global>{`
        @keyframes eph-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .eph-spin {
          animation: eph-spin 0.9s linear infinite;
        }


        @keyframes eph-rotate-update-text {
          0%, 20% { transform: translateY(0); }
          28%, 48% { transform: translateY(-25%); }
          56%, 76% { transform: translateY(-50%); }
          84%, 100% { transform: translateY(-75%); }
        }

        .eph-rotating-update-window {
          display: inline-block;
          height: 1.35em;
          min-width: 0;
          overflow: hidden;
          vertical-align: middle;
          line-height: 1.35;
        }

        .eph-rotating-update-track {
          display: flex;
          flex-direction: column;
          height: 400%;
          animation: eph-rotate-update-text 6.4s ease-in-out infinite;
          will-change: transform;
        }

        .eph-rotating-update-track > span {
          height: 25%;
          display: flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
        }

        @media (prefers-reduced-motion: reduce) {
          .eph-rotating-update-track { animation: none; transform: translateY(0); }
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
      `}</style>
    </main>
  );
}




function RotatingInventoryUpdateText() {
  return (
    <span
      className="eph-rotating-update-window"
      aria-label="Bağımsız Bölümleri Güncelle"
    >
      <span className="eph-rotating-update-track" aria-hidden="true">
        <span>Bağımsız Bölümleri Güncelle</span>
        <span>Kayıtlı Değerleri Düzenle</span>
        <span>Envanteri Yenile</span>
        <span>Bağımsız Bölümleri Güncelle</span>
      </span>
    </span>
  );
}

function ProjectList({
  projects,
  loading,
  busyAction,
  onCreate,
  onEdit,
  onStructure,
  onInventory,
  onSpaces,
  onCompletion,
  onSalesStock,
  onMedia,
  onLaunchFlow,
  onDelete,
}: {
  projects: ProjectSummary[];
  loading: boolean;
  busyAction: string | null;
  onCreate: () => void;
  onEdit: (project: ProjectSummary) => void;
  onStructure: (project: ProjectSummary) => void;
  onInventory: (project: ProjectSummary) => void;
  onSpaces: (project: ProjectSummary) => void;
  onCompletion: (project: ProjectSummary) => void;
  onSalesStock: (project: ProjectSummary) => void;
  onMedia: (project: ProjectSummary) => void;
  onLaunchFlow: (
    project: ProjectSummary,
    destination: Extract<PageMode, "render" | "presentation" | "publish">,
  ) => void;
  onDelete: (project: ProjectSummary) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 24,
          border: "1px solid #BFD3EE",
          background:
            "linear-gradient(135deg, #0B3B88 0%, #1557D6 58%, #2563EB 100%)",
          padding: "22px 16px",
          color: "#FFFFFF",
          boxShadow: "0 20px 50px rgba(21, 87, 214, 0.20)",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "grid",
            justifyItems: "center",
            gap: 10,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              display: "grid",
              placeItems: "center",
              borderRadius: 18,
              background: "#FFFFFF",
              color: "#1557D6",
            }}
          >
            <Building2 size={29} />
          </div>

          <div>
            <p
              style={{
                margin: 0,
                color: "#BFDBFE",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 1,
              }}
            >
              SORU-CEVAP PROJE KURULUMU
            </p>
            <h2
              style={{
                margin: "6px 0 0",
                fontSize: "clamp(23px, 6vw, 34px)",
                lineHeight: 1.15,
                fontWeight: 950,
              }}
            >
              Projenizi EPH içinde oluşturun
            </h2>
          </div>

          <p
            style={{
              maxWidth: 680,
              margin: 0,
              color: "#EAF2FF",
              fontSize: 13,
              lineHeight: 1.55,
              fontWeight: 650,
            }}
          >
            Proje, blok, kat, bağımsız bölüm ve sosyal alanları Excel
            kullanmadan adım adım yönetin.
          </p>

          <button 
            type="button"
            onClick={onCreate}
            style={{
              ...primaryButtonStyle,
              width: "100%",
              maxWidth: 360,
              background: "#FFFFFF",
              color: "#1557D6",
            }}
          >
            <Plus size={19} />
            Yeni Proje Oluştur
          </button>
        </div>
      </section>

      <section style={{ ...cardStyle, padding: 13 }}>
        <SectionTitle
          icon={<ClipboardList size={20} />}
          title="Projelerim"
          subtitle={`${projects.length} proje kaydı`}
        />

        {loading ? (
          <div
            style={{
              minHeight: 120,
              display: "grid",
              placeItems: "center",
              gap: 8,
              color: "#64748B",
              fontSize: 12,
              fontWeight: 850,
            }}
          >
            <Loader2 size={25} color="#2563EB" className="eph-spin" />
            <span>Projeler yükleniyor</span>
          </div>
        ) : projects.length === 0 ? (
          <div
            style={{
              marginTop: 12,
              border: "1.5px dashed #BFD3EE",
              borderRadius: 16,
              background: "#F8FAFC",
              padding: 18,
              textAlign: "center",
            }}
          >
            <Sparkles size={24} color="#2563EB" />
            <h3
              style={{
                margin: "8px 0 0",
                color: "#334155",
                fontSize: 13,
                fontWeight: 950,
              }}
            >
              Henüz proje yok
            </h3>
            <p
              style={{
                margin: "5px 0 0",
                color: "#64748B",
                fontSize: 11,
                lineHeight: 1.5,
                fontWeight: 700,
              }}
            >
              İlk proje taslağınızı oluşturmak için yukarıdaki butonu kullanın.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 290px), 1fr))",
              gap: 10,
              marginTop: 12,
            }}
          >
            {projects.map((project) => (
              <article
                key={project.id}
                style={{
                  minWidth: 0,
                  border: "1.5px solid #C7D6E8",
                  borderRadius: 18,
                  background: "#F8FAFC",
                  padding: 12,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      flex: "0 0 42px",
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 13,
                      background: "#EAF2FF",
                      color: "#1557D6",
                    }}
                  >
                    <Building2 size={21} />
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3
                      style={{
                        margin: 0,
                        color: "#1F2937",
                        fontSize: 14,
                        lineHeight: 1.35,
                        fontWeight: 950,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {project.name}
                    </h3>
                    <p
                      style={{
                        margin: "3px 0 0",
                        color: "#64748B",
                        fontSize: 11,
                        lineHeight: 1.45,
                        fontWeight: 700,
                      }}
                    >
                      {[project.city, project.district, project.neighborhood]
                        .filter(Boolean)
                        .join(" / ")}
                    </p>

                    <div style={{ marginTop: 6 }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 999,
                          border: "1px solid #BFDBFE",
                          background: "#EFF6FF",
                          color: "#1D4ED8",
                          padding: "4px 8px",
                          fontSize: 9,
                          fontWeight: 950,
                        }}
                      >
                        {projectLifecycleLabel(project.lifecycleStage)}
                      </span>
                    </div>
                  </div>

                  <span
                    style={{
                      borderRadius: 999,
                      background:
                        project.setupStatus === "TAMAMLANDI"
                          ? "#DCFCE7"
                          : "#EAF2FF",
                      color:
                        project.setupStatus === "TAMAMLANDI"
                          ? "#166534"
                          : "#1557D6",
                      padding: "5px 8px",
                      fontSize: 9,
                      fontWeight: 950,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {statusLabel(project.setupStatus)}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 6,
                  }}
                >
                  <Metric label="Blok" value={project._count.blocks} />
                  <Metric label="Bağımsız" value={project._count.units} />
                  <Metric label="Alan" value={project._count.spaces} />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    color: "#64748B",
                    fontSize: 10,
                    fontWeight: 750,
                  }}
                >
                  <span>{project.code || "Otomatik kod"}</span>
                  <span>{formatDate(project.updatedAt)}</span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 7,
                  }}
                >
                  <button 
                    type="button"
                    onClick={() => onEdit(project)}
                    disabled={Boolean(busyAction)}
                    style={{ ...secondaryButtonStyle, width: "100%" }}
                  >
                    <ChevronRight size={17} />
                    Proje Bilgileri
                  </button>

                  <button 
                    type="button"
                    onClick={() => onStructure(project)}
                    disabled={Boolean(busyAction)}
                    style={{ ...primaryButtonStyle, width: "100%" }}
                  >
                    {busyAction === "structure-load" ? (
                      <Loader2 size={17} className="eph-spin" />
                    ) : (
                      <Layers3 size={17} />
                    )}
                    Blok ve Katlar
                  </button>
                </div>

                {project._count.blocks > 0 && (
                  <button 
                    type="button"
                    onClick={() => onInventory(project)}
                    disabled={Boolean(busyAction)}
                    style={{
                      ...secondaryButtonStyle,
                      width: "100%",
                      borderColor: "#93C5FD",
                      background: "#EFF6FF",
                      color: "#1D4ED8",
                    }}
                  >
                    {busyAction === "inventory-load" ? (
                      <Loader2 size={17} className="eph-spin" />
                    ) : (
                      <ClipboardList size={17} />
                    )}
                    Bağımsız Bölümler
                  </button>
                )}

                {project._count.units > 0 && (
                  <button 
                    type="button"
                    onClick={() => onSpaces(project)}
                    disabled={Boolean(busyAction)}
                    style={{
                      ...secondaryButtonStyle,
                      width: "100%",
                      borderColor: "#A7F3D0",
                      background: "#F0FDF4",
                      color: "#047857",
                    }}
                  >
                    {busyAction === "spaces-load" ? (
                      <Loader2 size={17} className="eph-spin" />
                    ) : (
                      <Landmark size={17} />
                    )}
                    Proje Alanları
                  </button>
                )}

                {project._count.units > 0 && (
                  <button 
                    type="button"
                    onClick={() => onCompletion(project)}
                    disabled={Boolean(busyAction)}
                    style={{
                      ...secondaryButtonStyle,
                      width: "100%",
                      borderColor: "#C4B5FD",
                      background: "#F5F3FF",
                      color: "#6D28D9",
                    }}
                  >
                    {busyAction === "completion-load" ? (
                      <Loader2 size={17} className="eph-spin" />
                    ) : (
                      <CheckCircle2 size={17} />
                    )}
                    Son Kontrol
                  </button>
                )}

                {project.setupStatus === "TAMAMLANDI" &&
                  project._count.units > 0 && (
                    <button
                      
                      type="button"
                      onClick={() => onSalesStock(project)}
                      disabled={Boolean(busyAction)}
                      style={{
                        ...primaryButtonStyle,
                        width: "100%",
                        background:
                          "linear-gradient(135deg, #047857, #10B981)",
                        boxShadow:
                          "0 10px 24px rgba(16, 185, 129, 0.22)",
                      }}
                    >
                      {busyAction === "sales-stock-load" ? (
                        <Loader2 size={17} className="eph-spin" />
                      ) : (
                        <BadgeDollarSign size={18} />
                      )}
                      Satış Stokunu Yönet
                    </button>
                  )}

                {project.setupStatus === "TAMAMLANDI" &&
                  project._count.units > 0 && (
                    <button
                      type="button"
                      onClick={() => onMedia(project)}
                      disabled={Boolean(busyAction)}
                      style={{
                        ...secondaryButtonStyle,
                        width: "100%",
                        borderColor: "#C4B5FD",
                        background:
                          "linear-gradient(135deg, #F5F3FF, #FFF7ED)",
                        color: "#6D28D9",
                        boxShadow:
                          "0 10px 24px rgba(109, 40, 217, 0.12)",
                      }}
                    >
                      {busyAction === "media-load" ? (
                        <Loader2 size={17} className="eph-spin" />
                      ) : (
                        <Images size={18} />
                      )}
                      Görselleri Yönet
                    </button>
                  )}

                {project.setupStatus === "TAMAMLANDI" &&
                  project._count.units > 0 && (
                    <button
                      type="button"
                      onClick={() => onLaunchFlow(project, "render")}
                      disabled={Boolean(busyAction)}
                      style={{
                        ...primaryButtonStyle,
                        width: "100%",
                        background:
                          "linear-gradient(135deg, #1D4ED8, #7C3AED)",
                        boxShadow:
                          "0 10px 24px rgba(37, 99, 235, 0.2)",
                      }}
                    >
                      <Sparkles size={18} />
                      3D Render Oluştur
                    </button>
                  )}

                {project.setupStatus === "TAMAMLANDI" &&
                  project._count.units > 0 && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 7,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => onLaunchFlow(project, "presentation")}
                        disabled={Boolean(busyAction)}
                        style={{
                          ...secondaryButtonStyle,
                          width: "100%",
                          borderColor: "#BFDBFE",
                          background: "#EFF6FF",
                          color: "#1D4ED8",
                        }}
                      >
                        <ClipboardList size={17} />
                        Sunum Önizle
                      </button>

                      <button
                        type="button"
                        onClick={() => onLaunchFlow(project, "publish")}
                        disabled={Boolean(busyAction)}
                        style={{
                          ...secondaryButtonStyle,
                          width: "100%",
                          borderColor: "#A7F3D0",
                          background: "#F0FDF4",
                          color: "#047857",
                        }}
                      >
                        <UploadCloud size={17} />
                        Havuza Yayınla
                      </button>
                    </div>
                  )}

                <button 
                  type="button"
                  onClick={() => onDelete(project)}
                  disabled={Boolean(busyAction)}
                  style={{
                    ...secondaryButtonStyle,
                    width: "100%",
                    borderColor: "#FECACA",
                    background: "#FFF7F7",
                    color: "#B91C1C",
                  }}
                >
                  {busyAction === `delete-${project.id}` ? (
                    <Loader2 size={17} className="eph-spin" />
                  ) : (
                    <Trash2 size={17} />
                  )}
                  Projeyi Sil
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProjectFormView({
  form,
  editingProject,
  busyAction,
  onChange,
  onToggleUnitType,
  onUseCurrentLocation,
  onSave,
  onStepChange,
}: {
  form: ProjectForm;
  editingProject: ProjectSummary | null;
  busyAction: string | null;
  onChange: <K extends keyof ProjectForm>(
    field: K,
    value: ProjectForm[K],
  ) => void;
  onToggleUnitType: (unitType: string) => void;
  onUseCurrentLocation: () => void;
  onSave: (destination: ProjectSaveDestination) => void;
  onStepChange: (step: WizardStep) => void;
}) {
  const [provinceOptions, setProvinceOptions] = useState<LocationOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<LocationOption[]>([]);
  const [placeOptions, setPlaceOptions] = useState<LocationOption[]>([]);
  const [locationLoading, setLocationLoading] = useState({
    province: false,
    district: false,
    place: false,
  });

  const saving = busyAction === "save";
  const locating = busyAction === "location";
  const complex = COMPLEX_GEOMETRIES.has(form.geometryType);

  useEffect(() => {
    let active = true;

    setLocationLoading((current) => ({ ...current, province: true }));

    void fetchProvinceOptions()
      .then((options) => {
        if (active) setProvinceOptions(options);
      })
      .finally(() => {
        if (active) {
          setLocationLoading((current) => ({
            ...current,
            province: false,
          }));
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!form.city) {
      setDistrictOptions([]);
      setPlaceOptions([]);
      return () => {
        active = false;
      };
    }

    setLocationLoading((current) => ({ ...current, district: true }));

    void fetchDistrictOptions(form.city)
      .then((options) => {
        if (active) setDistrictOptions(options);
      })
      .finally(() => {
        if (active) {
          setLocationLoading((current) => ({
            ...current,
            district: false,
          }));
        }
      });

    return () => {
      active = false;
    };
  }, [form.city]);

  useEffect(() => {
    let active = true;

    if (!form.city || !form.district) {
      setPlaceOptions([]);
      return () => {
        active = false;
      };
    }

    const selectedDistrict = districtOptions.find(
      (option) => option.name === form.district,
    );

    setLocationLoading((current) => ({ ...current, place: true }));

    void fetchPlaceOptions(form.city, form.district, selectedDistrict?.id)
      .then((options) => {
        if (active) setPlaceOptions(options);
      })
      .finally(() => {
        if (active) {
          setLocationLoading((current) => ({
            ...current,
            place: false,
          }));
        }
      });

    return () => {
      active = false;
    };
  }, [districtOptions, form.city, form.district]);

  const visibleProvinceOptions = useMemo(() => {
    if (
      !form.city ||
      provinceOptions.some((option) => option.name === form.city)
    ) {
      return provinceOptions;
    }

    return [
      { id: `current-${form.city}`, name: form.city },
      ...provinceOptions,
    ];
  }, [form.city, provinceOptions]);

  const visibleDistrictOptions = useMemo(() => {
    if (
      !form.district ||
      districtOptions.some((option) => option.name === form.district)
    ) {
      return districtOptions;
    }

    return [
      { id: `current-${form.district}`, name: form.district },
      ...districtOptions,
    ];
  }, [districtOptions, form.district]);

  const visiblePlaceOptions = useMemo(() => {
    if (
      !form.neighborhood ||
      placeOptions.some((option) => option.name === form.neighborhood)
    ) {
      return placeOptions;
    }

    return [
      { id: `current-${form.neighborhood}`, name: form.neighborhood },
      ...placeOptions,
    ];
  }, [form.neighborhood, placeOptions]);

  return (
    <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
      <WizardProgress
        activeStep={1}
        project={editingProject}
        navigationLocked={Boolean(busyAction)}
        onStepChange={onStepChange}
      />

      <section style={{ ...cardStyle, padding: 13 }}>
        <SectionTitle
          icon={<Building2 size={20} />}
          title={editingProject ? "Proje Bilgilerini Düzenle" : "Yeni Proje"}
          subtitle="Ada ve parsel numarası opsiyoneldir."
        />

        <div
          style={{
            width: "100%",
            maxWidth: 560,
            margin: "12px auto 0",
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
            gap: 10,
          }}
        >
          <Field label="Proje adı *">
            <input
              value={form.name}
              onChange={(event) => onChange("name", event.target.value)}
              placeholder="Ör. EPH Park Evleri"
              style={inputStyle}
            />
          </Field>

          <Field label="Proje kodu">
            <input
              value={form.code}
              onChange={(event) => onChange("code", event.target.value)}
              placeholder="Boşsa otomatik üretilir"
              style={inputStyle}
            />
          </Field>
        </div>

        <div style={{ marginTop: 14 }}>
          <SectionTitle
            icon={<Building2 size={20} />}
            title="Projenin Aşaması"
            subtitle="Bu seçim projenin satış, lansman ve müşteri toplama akışını belirler."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
              gap: 9,
              marginTop: 10,
            }}
          >
            {PROJECT_LIFECYCLE_OPTIONS.map((option) => {
              const selected = form.lifecycleStage === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange("lifecycleStage", option.value)}
                  style={{
                    minHeight: 108,
                    border: selected
                      ? "2px solid #2563EB"
                      : "1.5px solid #C7D6E8",
                    borderRadius: 16,
                    background: selected ? "#EFF6FF" : "#FFFFFF",
                    color: "#1F2937",
                    padding: 12,
                    textAlign: "center",
                    cursor: "pointer",
                    boxShadow: selected
                      ? "0 10px 24px rgba(37, 99, 235, 0.14)"
                      : "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 950,
                      color: selected ? "#1D4ED8" : "#1F2937",
                    }}
                  >
                    {option.title}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: 1.45,
                      color: "#64748B",
                    }}
                  >
                    {option.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            marginTop: 10,
            border: "2px solid #8CC8F6",
            borderRadius: 18,
            background: "#EDF8FF",
            padding: 12,
            boxShadow: "0 12px 26px rgba(2, 132, 199, 0.08)",
          }}
        >
            <div
              style={{
                borderRadius: 14,
                background: "#0284C7",
                color: "#FFFFFF",
                padding: "8px 12px",
                textAlign: "center",
                fontSize: 11,
                fontWeight: 950,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Adres Bilgileri — 81 İl + KKTC
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
                gap: 10,
                marginTop: 10,
              }}
            >
              <Field label="İl / KKTC *">
                <select
                  value={form.city}
                  onChange={(event) => {
                    onChange("city", event.target.value);
                    onChange("district", "");
                    onChange("neighborhood", "");
                  }}
                  disabled={locationLoading.province}
                  style={inputStyle}
                >
                  <option value="">
                    {locationLoading.province
                      ? "İller ve KKTC yükleniyor"
                      : "İl / KKTC seçin"}
                  </option>
                  {visibleProvinceOptions.map((option) => (
                    <option key={option.id} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label={
                  form.city === "KKTC"
                    ? "KKTC Bölgesi *"
                    : "İlçe *"
                }
              >
                {!form.city ||
                locationLoading.district ||
                visibleDistrictOptions.length > 0 ? (
                  <select
                    value={form.district}
                    onChange={(event) => {
                      onChange("district", event.target.value);
                      onChange("neighborhood", "");
                    }}
                    disabled={!form.city || locationLoading.district}
                    style={inputStyle}
                  >
                    <option value="">
                      {!form.city
                        ? "Önce il / KKTC seçin"
                        : locationLoading.district
                          ? form.city === "KKTC"
                            ? "KKTC bölgeleri yükleniyor"
                            : "İlçeler yükleniyor"
                          : form.city === "KKTC"
                            ? "KKTC bölgesi seçin"
                            : "İlçe seçin"}
                    </option>
                    {visibleDistrictOptions.map((option) => (
                      <option key={option.id} value={option.name}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={form.district}
                    onChange={(event) => {
                      onChange("district", event.target.value);
                      onChange("neighborhood", "");
                    }}
                    placeholder="İlçe / bölge adını yazın"
                    style={inputStyle}
                  />
                )}
              </Field>

              <Field label="Mahalle / Köy / Mevki *">
                {!form.city ||
                !form.district ||
                locationLoading.place ||
                visiblePlaceOptions.length > 0 ? (
                  <select
                    value={form.neighborhood}
                    onChange={(event) =>
                      onChange("neighborhood", event.target.value)
                    }
                    disabled={
                      !form.city ||
                      !form.district ||
                      locationLoading.place
                    }
                    style={inputStyle}
                  >
                    <option value="">
                      {!form.district
                        ? "Önce ilçe / bölge seçin"
                        : locationLoading.place
                          ? "Mahalle / köy / mevki yükleniyor"
                          : "Mahalle / köy / mevki seçin"}
                    </option>
                    {visiblePlaceOptions.map((option) => (
                      <option key={option.id} value={option.name}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={form.neighborhood}
                    onChange={(event) =>
                      onChange("neighborhood", event.target.value)
                    }
                    placeholder="Mahalle / köy / mevki adını yazın"
                    style={inputStyle}
                  />
                )}
              </Field>
            </div>

            <div
              style={{
                marginTop: 9,
                border: "1px solid #BAE6FD",
                borderRadius: 12,
                background: "#F8FDFF",
                color: "#075985",
                padding: "8px 10px",
                textAlign: "center",
                fontSize: 11,
                fontWeight: 850,
                lineHeight: 1.45,
              }}
            >
              Portföy girişindeki ortak locationData.ts sistemi kullanılır.
              İl değişince ilçe ve mahalle; ilçe değişince mahalle otomatik
              temizlenir. Liste alınamazsa manuel giriş alanı açılır.
            </div>
          </div>

        <div
          style={{
            width: "100%",
            maxWidth: 820,
            margin: "10px auto 0",
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
            gap: 10,
          }}
        >
          <Field label="Proje geometrisi / cephe yapısı *">
            <select
              value={form.geometryType}
              onChange={(event) => onChange("geometryType", event.target.value)}
              style={inputStyle}
            >
              <optgroup label="Cephe sayısına göre">
                {FACADE_GEOMETRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Özel plan ve geometri">
                {ADVANCED_GEOMETRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </Field>

          <Field label="Ada No (Opsiyonel)">
            <input
              inputMode="numeric"
              maxLength={6}
              value={form.adaNo}
              onChange={(event) =>
                onChange("adaNo", event.target.value.replace(/\D/g, ""))
              }
              placeholder="Boş bırakılabilir"
              style={inputStyle}
            />
          </Field>

          <Field label="Parsel No (Opsiyonel)">
            <input
              inputMode="numeric"
              maxLength={6}
              value={form.parselNo}
              onChange={(event) =>
                onChange("parselNo", event.target.value.replace(/\D/g, ""))
              }
              placeholder="Boş bırakılabilir"
              style={inputStyle}
            />
          </Field>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          <Field label="Açık adres *">
            <textarea
              value={form.address}
              onChange={(event) => onChange("address", event.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </Field>

          <Field label="Proje açıklaması">
            <textarea
              value={form.description}
              onChange={(event) => onChange("description", event.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </Field>
        </div>

        {complex && (
          <InfoBand tone="warning">
            Bu geometri standart EPH şablonlarının dışında olabilir. Sonraki
            aşamalarda Yazılım Ekibi incelemesi istenecektir.
          </InfoBand>
        )}
      </section>

      <section style={{ ...cardStyle, padding: 13 }}>
        <SectionTitle
          icon={<MapPin size={20} />}
          title="Harita Konumu"
          subtitle="Bir proje için tek harita pini kullanılır."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
            gap: 10,
            marginTop: 12,
          }}
        >
          <Field label="Enlem *">
            <input
              inputMode="decimal"
              value={form.latitude}
              onChange={(event) => onChange("latitude", event.target.value)}
              placeholder="37.7765200"
              style={inputStyle}
            />
          </Field>

          <Field label="Boylam *">
            <input
              inputMode="decimal"
              value={form.longitude}
              onChange={(event) => onChange("longitude", event.target.value)}
              placeholder="29.0863900"
              style={inputStyle}
            />
          </Field>

          <Field label="Harita adresi">
            <input
              value={form.mapAddress}
              onChange={(event) => onChange("mapAddress", event.target.value)}
              placeholder="Haritada görünen adres"
              style={inputStyle}
            />
          </Field>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
            gap: 8,
            marginTop: 10,
          }}
        >
          <button 
            type="button"
            onClick={onUseCurrentLocation}
            disabled={locating}
            style={secondaryButtonStyle}
          >
            {locating ? (
              <Loader2 size={18} className="eph-spin" />
            ) : (
              <LocateFixed size={18} />
            )}
            {locating ? "Konum Alınıyor" : "Mevcut Konumumu Kullan"}
          </button>

          {form.latitude && form.longitude && (
            <a
              
              href={`https://www.google.com/maps?q=${encodeURIComponent(
                form.latitude,
              )},${encodeURIComponent(form.longitude)}`}
              target="_blank"
              rel="noreferrer"
              style={{
                ...secondaryButtonStyle,
                textDecoration: "none",
              }}
            >
              <MapPin size={18} />
              Haritada Kontrol Et
            </a>
          )}
        </div>
      </section>

      <section style={{ ...cardStyle, padding: 13 }}>
        <SectionTitle
          icon={<ClipboardList size={20} />}
          title="Envanter Beyanı"
          subtitle="Tapuda numaralı bağımsız bölümler ile satış stokunu ayrı girin."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
            gap: 10,
            marginTop: 12,
          }}
        >
          <Field label="Toplam bağımsız bölüm *">
            <input
              inputMode="numeric"
              value={form.declaredIndependentUnitCount}
              onChange={(event) =>
                onChange("declaredIndependentUnitCount", event.target.value)
              }
              placeholder="Ör. 120"
              style={inputStyle}
            />
          </Field>

          <Field label="Satış / kiralama stoku *">
            <input
              inputMode="numeric"
              value={form.declaredSalesInventoryCount}
              onChange={(event) =>
                onChange("declaredSalesInventoryCount", event.target.value)
              }
              placeholder="Ör. 96"
              style={inputStyle}
            />
          </Field>
        </div>

        <div style={{ marginTop: 12 }}>
          <Field label="Planlanan bağımsız bölüm türleri *">
            <UnitTypeMultiSelect
              selected={form.plannedUnitTypes}
              onToggle={onToggleUnitType}
            />
          </Field>
        </div>

        <InfoBand tone="info">
          Daire, stüdyo, villa, ticari ünite ve benzeri gerçek bağımsız
          bölümleri buradan çoklu seçin. Havuz, lobi, otopark ve teknik odalar
          sonraki pakette ayrı proje alanı olarak oluşturulacaktır.
        </InfoBand>
      </section>

      <div
        style={{
          ...cardStyle,
          position: "sticky",
          bottom: "calc(8px + env(safe-area-inset-bottom))",
          zIndex: 20,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 8,
          padding: 9,
        }}
      >
        <button 
          type="button"
          onClick={() => onSave("stay")}
          disabled={saving}
          style={secondaryButtonStyle}
        >
          {saving ? (
            <Loader2 size={18} className="eph-spin" />
          ) : (
            <Save size={18} />
          )}
          Taslak Kaydet
        </button>

        <button 
          type="button"
          onClick={() => onSave("structure")}
          disabled={saving}
          style={primaryButtonStyle}
        >
          {saving ? (
            <Loader2 size={18} className="eph-spin" />
          ) : (
            <CheckCircle2 size={18} />
          )}
          Kaydet ve Blok/Kat Adımına Geç
        </button>
      </div>
    </div>
  );
}

function ProjectStructureView({
  project,
  blocks,
  preview,
  busyAction,
  onUpdateBlock,
  onAddBlock,
  onRemoveBlock,
  onPreview,
  onApply,
  onContinue,
  onStepChange,
}: {
  project: ProjectSummary;
  blocks: BlockForm[];
  preview: StructurePreview | null;
  busyAction: string | null;
  onUpdateBlock: <K extends keyof BlockForm>(
    key: string,
    field: K,
    value: BlockForm[K],
  ) => void;
  onAddBlock: () => void;
  onRemoveBlock: (key: string) => void;
  onPreview: () => void;
  onApply: () => void;
  onContinue: () => void;
  onStepChange: (step: WizardStep) => void;
}) {
  const previewing = busyAction === "structure-preview";
  const applying = busyAction === "structure-apply";
  const totalFloorCount = blocks.reduce(
    (total, block) => total + buildFloors(block).length,
    0,
  );
  const totalFacadeCount = blocks.reduce(
    (total, block) =>
      total +
      (facadeCountForGeometry(block.geometryType) ??
        countValue(block.facadeViewCount)),
    0,
  );

  return (
    <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
      <WizardProgress
        activeStep={2}
        project={project}
        navigationLocked={Boolean(busyAction)}
        onStepChange={onStepChange}
      />

      <section
        style={{
          ...cardStyle,
          borderColor: "#BFD3EE",
          background: "#F8FBFF",
          padding: 13,
        }}
      >
        <SectionTitle
          icon={<Layers3 size={20} />}
          title="Blok ve Kat Kurulumu"
          subtitle={`${project.name} • Her blok farklı kat ve cephe yapısına sahip olabilir.`}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 7,
            marginTop: 12,
          }}
        >
          <Metric label="Blok" value={blocks.length} />
          <Metric label="Toplam Kat" value={totalFloorCount} />
          <Metric label="Cephe Görünümü" value={totalFacadeCount} />
        </div>

        <InfoBand tone="info">
          Bodrum, zemin ve normal kat sayılarını blok bazında tanımlayın. Aynı
          projede A Blok dört cepheli, B Blok çift cepheli olabilir.
        </InfoBand>
      </section>

      <div style={{ display: "grid", gap: 10 }}>
        {blocks.map((block, index) => {
          const standardFacadeCount = facadeCountForGeometry(
            block.geometryType,
          );
          const floors = buildFloors(block);

          return (
            <section key={block.key} style={{ ...cardStyle, padding: 13 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "42px minmax(0, 1fr) 42px",
                  alignItems: "center",
                  gap: 9,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 13,
                    background: "#EAF2FF",
                    color: "#1557D6",
                    fontSize: 15,
                    fontWeight: 950,
                  }}
                >
                  {index + 1}
                </div>

                <div style={{ minWidth: 0, textAlign: "center" }}>
                  <h3
                    style={{
                      margin: 0,
                      color: "#1F2937",
                      fontSize: 14,
                      fontWeight: 950,
                    }}
                  >
                    {block.name.trim() || `${block.code || index + 1}. Blok`}
                  </h3>
                  <p
                    style={{
                      margin: "3px 0 0",
                      color: "#64748B",
                      fontSize: 10,
                      fontWeight: 750,
                    }}
                  >
                    {floors.length} kat • {standardFacadeCount ?? block.facadeViewCount} cephe
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveBlock(block.key)}
                  disabled={blocks.length === 1 || Boolean(busyAction)}
                  aria-label="Bloğu kaldır"
                  style={{
                    width: 42,
                    height: 42,
                    border: "1.5px solid #FECACA",
                    borderRadius: 13,
                    display: "grid",
                    placeItems: "center",
                    background: blocks.length === 1 ? "#F8FAFC" : "#FEF2F2",
                    color: blocks.length === 1 ? "#94A3B8" : "#DC2626",
                    cursor: blocks.length === 1 ? "not-allowed" : "pointer",
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
                  gap: 9,
                  marginTop: 12,
                }}
              >
                <Field label="Blok kodu *">
                  <input
                    value={block.code}
                    onChange={(event) =>
                      onUpdateBlock(block.key, "code", event.target.value)
                    }
                    placeholder="A"
                    maxLength={20}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Blok adı">
                  <input
                    value={block.name}
                    onChange={(event) =>
                      onUpdateBlock(block.key, "name", event.target.value)
                    }
                    placeholder="A Blok"
                    style={inputStyle}
                  />
                </Field>

                <Field label="Blok geometrisi / cephe yapısı *">
                  <select
                    value={block.geometryType}
                    onChange={(event) =>
                      onUpdateBlock(
                        block.key,
                        "geometryType",
                        event.target.value,
                      )
                    }
                    style={inputStyle}
                  >
                    <optgroup label="Cephe sayısına göre">
                      {FACADE_GEOMETRY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Özel plan ve geometri">
                      {ADVANCED_GEOMETRY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </Field>

                <Field label="Cephe görünüm sayısı *">
                  <input
                    inputMode="numeric"
                    value={
                      standardFacadeCount === null
                        ? block.facadeViewCount
                        : String(standardFacadeCount)
                    }
                    onChange={(event) =>
                      onUpdateBlock(
                        block.key,
                        "facadeViewCount",
                        event.target.value.replace(/\D/g, "").slice(0, 1),
                      )
                    }
                    disabled={standardFacadeCount !== null}
                    placeholder="1-8"
                    style={{
                      ...inputStyle,
                      opacity: standardFacadeCount !== null ? 0.72 : 1,
                    }}
                  />
                </Field>

                <Field label="Bodrum kat sayısı">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={block.basementFloorCount}
                    onChange={(event) =>
                      onUpdateBlock(
                        block.key,
                        "basementFloorCount",
                        event.target.value,
                      )
                    }
                    style={inputStyle}
                  />
                </Field>

                <Field label="Normal kat sayısı">
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={block.normalFloorCount}
                    onChange={(event) =>
                      onUpdateBlock(
                        block.key,
                        "normalFloorCount",
                        event.target.value,
                      )
                    }
                    style={inputStyle}
                  />
                </Field>
              </div>

              <button
                type="button"
                onClick={() =>
                  onUpdateBlock(
                    block.key,
                    "hasGroundFloor",
                    !block.hasGroundFloor,
                  )
                }
                style={{
                  ...secondaryButtonStyle,
                  width: "100%",
                  marginTop: 9,
                  borderColor: block.hasGroundFloor ? "#2563EB" : "#C7D6E8",
                  background: block.hasGroundFloor ? "#EFF6FF" : "#FFFFFF",
                  color: block.hasGroundFloor ? "#1D4ED8" : "#475569",
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 6,
                    border: block.hasGroundFloor
                      ? "1px solid #2563EB"
                      : "1px solid #CBD5E1",
                    background: block.hasGroundFloor ? "#2563EB" : "#F8FAFC",
                    color: "#FFFFFF",
                  }}
                >
                  {block.hasGroundFloor && <Check size={14} strokeWidth={3} />}
                </span>
                Zemin kat {block.hasGroundFloor ? "var" : "yok"}
              </button>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: 6,
                  marginTop: 10,
                  border: "1.5px dashed #BFD3EE",
                  borderRadius: 14,
                  background: "#F8FAFC",
                  padding: 9,
                }}
              >
                {floors.length > 0 ? (
                  floors.map((floor) => (
                    <span
                      key={`${block.key}-${floor.level}`}
                      style={{
                        border: "1px solid #D6E2F0",
                        borderRadius: 999,
                        background: "#FFFFFF",
                        color: "#334155",
                        padding: "5px 8px",
                        fontSize: 9,
                        fontWeight: 850,
                      }}
                    >
                      {floor.label}
                    </span>
                  ))
                ) : (
                  <span
                    style={{
                      color: "#B91C1C",
                      fontSize: 10,
                      fontWeight: 850,
                    }}
                  >
                    En az bir kat oluşturulmalıdır.
                  </span>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <button 
        type="button"
        onClick={onAddBlock}
        disabled={blocks.length >= 50 || Boolean(busyAction)}
        style={{ ...secondaryButtonStyle, width: "100%" }}
      >
        <Plus size={18} />
        Yeni Blok Ekle
      </button>

      {preview && (
        <section
          style={{
            ...cardStyle,
            borderColor: preview.summary.complexGeometryDetected
              ? "#FED7AA"
              : "#86EFAC",
            background: preview.summary.complexGeometryDetected
              ? "#FFF7ED"
              : "#F0FDF4",
            padding: 13,
            textAlign: "center",
          }}
        >
          <CheckCircle2
            size={24}
            color={preview.summary.complexGeometryDetected ? "#C2410C" : "#15803D"}
          />
          <h3
            style={{
              margin: "7px 0 0",
              color: "#1F2937",
              fontSize: 13,
              fontWeight: 950,
            }}
          >
            Yapı önizlemesi hazır
          </h3>
          <p
            style={{
              margin: "5px 0 0",
              color: "#64748B",
              fontSize: 11,
              lineHeight: 1.5,
              fontWeight: 750,
            }}
          >
            {preview.summary.blockCount} blok ve {preview.summary.floorCount} kat doğrulandı.
            {preview.summary.complexGeometryDetected
              ? " Özel geometri nedeniyle Yazılım Ekibi incelemesi gerekecek."
              : " Standart yapı doğrulaması başarılı."}
          </p>
        </section>
      )}

      {project._count.blocks > 0 && (
        <button 
          type="button"
          onClick={onContinue}
          disabled={Boolean(busyAction)}
          style={{
            ...primaryButtonStyle,
            width: "100%",
            background: "linear-gradient(135deg, #0F766E, #14B8A6)",
          }}
        >
          <ChevronRight size={18} />
          Bağımsız Bölüm Dağılımına Geç
        </button>
      )}

      <div
        style={{
          ...cardStyle,
          position: "sticky",
          bottom: "calc(8px + env(safe-area-inset-bottom))",
          zIndex: 20,
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 8,
          padding: 9,
        }}
      >
        <button 
          type="button"
          onClick={onPreview}
          disabled={previewing || applying}
          style={secondaryButtonStyle}
        >
          {previewing ? (
            <Loader2 size={18} className="eph-spin" />
          ) : (
            <ClipboardList size={18} />
          )}
          Yapıyı Önizle
        </button>

        <button 
          type="button"
          onClick={onApply}
          disabled={!preview || previewing || applying}
          style={{
            ...primaryButtonStyle,
            opacity: !preview ? 0.55 : 1,
            cursor: !preview ? "not-allowed" : "pointer",
          }}
        >
          {applying ? (
            <Loader2 size={18} className="eph-spin" />
          ) : (
            <CheckCircle2 size={18} />
          )}
          Blok ve Katları Kaydet
        </button>
      </div>
    </div>
  );
}


function ProjectInventoryView({
  project,
  floorPlans,
  preview,
  busyAction,
  editMode,
  numberingMode,
  onUpdateFloorPlan,
  onUpdateUnitGroup,
  onToggleFacade,
  onAddUnitGroup,
  onRemoveUnitGroup,
  onCopyToAll,
  onNumberingModeChange,
  onPreview,
  onApply,
  onReplace,
  onStartEdit,
  onCancelEdit,
  onContinue,
  onStepChange,
}: {
  project: ProjectSetupResponse;
  floorPlans: FloorPlanForm[];
  preview: InventoryPreview | null;
  busyAction: string | null;
  editMode: boolean;
  numberingMode: ProjectNumberingMode;
  onUpdateFloorPlan: <K extends keyof FloorPlanForm>(
    floorKey: string,
    field: K,
    value: FloorPlanForm[K],
  ) => void;
  onUpdateUnitGroup: <K extends keyof UnitGroupForm>(
    floorKey: string,
    groupKey: string,
    field: K,
    value: UnitGroupForm[K],
  ) => void;
  onToggleFacade: (
    floorKey: string,
    groupKey: string,
    facade: string,
  ) => void;
  onAddUnitGroup: (floorKey: string) => void;
  onRemoveUnitGroup: (floorKey: string, groupKey: string) => void;
  onCopyToAll: (
    floorKey: string,
    options: FloorCopyOptions,
  ) => void;
  onNumberingModeChange: (mode: ProjectNumberingMode) => void;
  onPreview: () => void;
  onApply: () => void;
  onReplace: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onContinue: () => void;
  onStepChange: (step: WizardStep) => void;
}) {
  const previewing = busyAction === "inventory-preview";
  const applying =
    busyAction === "inventory-apply" ||
    busyAction === "inventory-replace";
  const inventoryApplied = project._count.units > 0;
  const inventoryLocked = inventoryApplied && !editMode;
  const [copyOptions, setCopyOptions] = useState<FloorCopyOptions>({
    unitGroups: true,
    numberPrefix: false,
    startingSequence: false,
  });
  const selectedCopyOptionCount = Object.values(copyOptions).filter(
    Boolean,
  ).length;
  const plannedUnitCount = floorPlans.reduce(
    (total, floorPlan) =>
      total +
      floorPlan.unitGroups.reduce(
        (floorTotal, group) => floorTotal + countValue(group.count),
        0,
      ),
    0,
  );
  const plannedSalesCount = floorPlans.reduce(
    (total, floorPlan) =>
      total +
      floorPlan.unitGroups.reduce(
        (floorTotal, group) =>
          floorTotal +
          (SALES_COMMERCIAL_PURPOSES.has(group.commercialPurpose)
            ? countValue(group.count)
            : 0),
        0,
      ),
    0,
  );
  const declaredUnitCount = project.declaredIndependentUnitCount;
  const declaredSalesCount = project.declaredSalesInventoryCount;
  const unitCountMismatch =
    declaredUnitCount !== null &&
    declaredUnitCount !== undefined &&
    plannedUnitCount !== declaredUnitCount;
  const salesCountMismatch =
    declaredSalesCount !== null &&
    declaredSalesCount !== undefined &&
    plannedSalesCount !== declaredSalesCount;

  return (
    <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
      <WizardProgress
        activeStep={3}
        project={project}
        navigationLocked={Boolean(busyAction) || editMode}
        onStepChange={onStepChange}
      />

      <section
        style={{
          ...cardStyle,
          borderColor: "#C7D6E8",
          background: "#F7FAFE",
          padding: 13,
        }}
      >
        <SectionTitle
          icon={<ClipboardList size={20} />}
          title="Bağımsız Bölüm Dağılımı"
          subtitle={`${project.name} • Her katta farklı tür ve adet tanımlanabilir.`}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 120px), 1fr))",
            gap: 7,
            marginTop: 12,
          }}
        >
          <Metric label="Kat" value={floorPlans.length} />
          <Metric label="Planlanan" value={plannedUnitCount} />
          <Metric label="Satış Stoku" value={plannedSalesCount} />
          <Metric label="Oluşan" value={project._count.units} />
        </div>

        <div
          style={{
            marginTop: 11,
            border: "1.5px solid #000000",
            borderRadius: 16,
            background: "#050505",
            color: "#FFFFFF",
            padding: 13,
            boxShadow: "0 10px 24px rgba(0, 0, 0, 0.24)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#FFFFFF",
              fontSize: 11,
              lineHeight: 1.6,
              fontWeight: 900,
              textAlign: "center",
            }}
          >
            Beyan edilen toplam bağımsız bölüm:{" "}
            {project.declaredIndependentUnitCount ?? "Belirtilmedi"} • Beyan
            edilen satış/kiralama stoku:{" "}
            {project.declaredSalesInventoryCount ?? "Belirtilmedi"}
          </p>

          {inventoryApplied && !editMode && (
            <p
              style={{
                margin: "7px 0 0",
                color: "#FFFFFF",
                fontSize: 11,
                lineHeight: 1.6,
                fontWeight: 800,
                textAlign: "center",
              }}
            >
              Kaydedilmiş {project._count.units} bağımsız bölüm forma
              yüklendi. Değerleri değiştirmek için güncelleme modunu açın.
            </p>
          )}
        </div>

        {(unitCountMismatch || salesCountMismatch) && (
          <InfoBand tone="warning">
            Toplamlar eşleşmiyor. Bağımsız bölüm: beyan{" "}
            {declaredUnitCount ?? "—"}, girilen {plannedUnitCount}. Satış / kiralama
            stoku: beyan {declaredSalesCount ?? "—"}, girilen{" "}
            {plannedSalesCount}. Envanter önizlemesi için değerleri eşitleyin.
          </InfoBand>
        )}

        {inventoryApplied && !editMode && (
          <button
            type="button"
            onClick={onStartEdit}
            disabled={Boolean(busyAction)}
            style={{
              ...secondaryButtonStyle,
              width: "100%",
              minHeight: 48,
              marginTop: 11,
              border: "2px solid #EC4899",
              background: "#FFF0F7",
              color: "#D41472",
              boxShadow: "0 10px 24px rgba(236, 72, 153, 0.18)",
              fontSize: 12,
              fontWeight: 950,
            }}
          >
            <ClipboardList size={19} />
            <RotatingInventoryUpdateText />
          </button>
        )}

        {inventoryApplied && editMode && (
          <InfoBand tone="warning">
            Düzenleme modu açık. “Güncellemeyi Kaydet” butonu tıklanınca
            toplamlar kontrol edilir. Bir uyuşmazlık varsa sistem hangi
            değerin düzeltilmesi gerektiğini açıkça bildirir.
          </InfoBand>
        )}
      </section>

      <ProjectInventoryNumberingPanel
        floorPlans={floorPlans}
        numberingMode={numberingMode}
        disabled={inventoryLocked || Boolean(busyAction)}
        onChange={onNumberingModeChange}
      />

      <section
        style={{
          ...cardStyle,
          borderColor: "#BFD3EE",
          background: "#F4F8FF",
          padding: 13,
        }}
      >
        <SectionTitle
          icon={<Layers3 size={19} />}
          title="Toplu Kat Kopyalama"
          subtitle="Bir kattaki seçili alanları aynı bloktaki diğer katlara uygular."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
            gap: 8,
            marginTop: 11,
          }}
        >
          {[
            {
              key: "unitGroups" as const,
              label: "Bağımsız bölüm dağılımı",
            },
            {
              key: "numberPrefix" as const,
              label: "Numara ön eki",
            },
            {
              key: "startingSequence" as const,
              label: "Başlangıç sıra numarası",
            },
          ].map((option) => {
            const selected = copyOptions[option.key];

            return (
              <button
                key={option.key}
                type="button"
                onClick={() =>
                  setCopyOptions((current) => ({
                    ...current,
                    [option.key]: !current[option.key],
                  }))
                }
                disabled={inventoryLocked || Boolean(busyAction)}
                aria-pressed={selected}
                style={{
                  minHeight: 42,
                  border: selected
                    ? "1.5px solid #2563EB"
                    : "1.5px solid #C7D6E8",
                  borderRadius: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "8px 10px",
                  background: selected ? "#EAF2FF" : "#FFFFFF",
                  color: selected ? "#1557D6" : "#475569",
                  fontSize: 11,
                  fontWeight: 900,
                  cursor:
                    inventoryLocked || Boolean(busyAction)
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 7,
                    display: "grid",
                    placeItems: "center",
                    border: selected
                      ? "1.5px solid #2563EB"
                      : "1.5px solid #AFC2D8",
                    background: selected ? "#2563EB" : "#FFFFFF",
                    color: "#FFFFFF",
                    flex: "0 0 auto",
                  }}
                >
                  {selected ? <Check size={14} strokeWidth={3} /> : null}
                </span>
                {option.label}
              </button>
            );
          })}
        </div>

        <p
          style={{
            margin: "9px 0 0",
            color: selectedCopyOptionCount > 0 ? "#475569" : "#B45309",
            fontSize: 10,
            lineHeight: 1.5,
            textAlign: "center",
            fontWeight: 750,
          }}
        >
          {selectedCopyOptionCount > 0
            ? `${selectedCopyOptionCount} alan seçili. Uygulamak istediğiniz katın kartındaki kopyalama butonuna basın.`
            : "Kopyalama için en az bir alan seçin."}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
            gap: 8,
            marginTop: 11,
          }}
        >
          {[
            {
              title: "Bağımsız bölüm dağılımı",
              description:
                "Bölüm türü, adet, oda sayısı, net/brüt alan, ticari amaç, konsept etiketi ve cephe seçimlerini aynı bloktaki diğer katlara kopyalar.",
              background: "#E5EFFC",
              border: "#9CB9DE",
              color: "#183D72",
            },
            {
              title: "Numara ön eki",
              description:
                "A, B, C veya BLOK-A gibi kapı numarasının başındaki proje/blok kodunu kopyalar. Kat seviyesi ve sıra numarası ayrıca eklenir.",
              background: "#E1F1E7",
              border: "#9BC5AD",
              color: "#145A35",
            },
            {
              title: "Başlangıç sıra numarası",
              description:
                "İlk bağımsız bölüm sıra numarasını diğer katlara uygular. Örneğin 5 seçilirse her katta numaralandırma o katın koduyla birlikte 5’ten başlar.",
              background: "#F7E9C9",
              border: "#D4AE62",
              color: "#704205",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                border: `1.5px solid ${item.border}`,
                borderRadius: 14,
                background: item.background,
                padding: 10,
              }}
            >
              <strong
                style={{
                  display: "block",
                  color: item.color,
                  fontSize: 11,
                  fontWeight: 950,
                }}
              >
                {item.title}
              </strong>
              <p
                style={{
                  margin: "5px 0 0",
                  color: "#334155",
                  fontSize: 10,
                  lineHeight: 1.55,
                  fontWeight: 700,
                }}
              >
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <p
          style={{
            margin: "9px 0 0",
            color: "#64748B",
            fontSize: 9,
            lineHeight: 1.5,
            textAlign: "center",
            fontWeight: 750,
          }}
        >
          Yalnız işaretlediğiniz alanlar kopyalanır. İşlem kaynak katın
          bulunduğu blokla sınırlıdır; diğer bloklar değiştirilmez.
        </p>
      </section>

      <div style={{ display: "grid", gap: 10 }}>
        {floorPlans.map((floorPlan, floorIndex) => {
          const floorUnitCount = floorPlan.unitGroups.reduce(
            (total, group) => total + countValue(group.count),
            0,
          );
          const floorPalette =
            FLOOR_CARD_PALETTES[floorIndex % FLOOR_CARD_PALETTES.length];

          return (
            <section
              key={floorPlan.key}
              style={{
                ...cardStyle,
                borderColor: floorPalette.border,
                background: floorPalette.background,
                padding: 13,
                boxShadow: "0 12px 30px rgba(15, 23, 42, 0.07)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "42px minmax(0, 1fr)",
                  alignItems: "center",
                  gap: 9,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 13,
                    background: floorPalette.badgeBackground,
                    color: floorPalette.badgeColor,
                    fontSize: 12,
                    fontWeight: 950,
                  }}
                >
                  {floorIndex + 1}
                </div>

                <div style={{ minWidth: 0, textAlign: "center" }}>
                  <h3
                    style={{
                      margin: 0,
                      color: "#1F2937",
                      fontSize: 14,
                      lineHeight: 1.3,
                      fontWeight: 950,
                    }}
                  >
                    {floorPlan.blockName} • {floorPlan.floorLabel}
                  </h3>
                  <p
                    style={{
                      margin: "3px 0 0",
                      color: "#64748B",
                      fontSize: 10,
                      fontWeight: 750,
                    }}
                  >
                    {floorUnitCount} bağımsız bölüm
                  </p>
                </div>

              </div>

              <button 
                type="button"
                onClick={() => onCopyToAll(floorPlan.key, copyOptions)}
                disabled={
                  inventoryLocked ||
                  Boolean(busyAction) ||
                  selectedCopyOptionCount === 0
                }
                style={{
                  ...secondaryButtonStyle,
                  width: "100%",
                  minHeight: 40,
                  marginTop: 9,
                  padding: "8px 10px",
                  border:
                    selectedCopyOptionCount > 0
                      ? "1.5px solid #2563EB"
                      : "1.5px solid #C7D6E8",
                  background:
                    selectedCopyOptionCount > 0 ? "#EAF2FF" : "#F8FAFC",
                  color:
                    selectedCopyOptionCount > 0 ? "#1557D6" : "#94A3B8",
                  boxShadow: "none",
                  fontSize: 11,
                  fontWeight: 950,
                }}
              >
                Seçili Alanları Bu Bloktaki Tüm Katlara Uygula
              </button>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
                  gap: 9,
                  marginTop: 12,
                }}
              >
                <Field label="Numara ön eki *">
                  <input
                    value={floorPlan.numberPrefix}
                    onChange={(event) =>
                      onUpdateFloorPlan(
                        floorPlan.key,
                        "numberPrefix",
                        event.target.value,
                      )
                    }
                    disabled={inventoryLocked}
                    placeholder={floorPlan.blockCode}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Başlangıç sıra numarası *">
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={floorPlan.startingSequence}
                    onChange={(event) =>
                      onUpdateFloorPlan(
                        floorPlan.key,
                        "startingSequence",
                        event.target.value,
                      )
                    }
                    disabled={inventoryLocked || numberingMode === "CONTINUOUS"}
                    title={
                      numberingMode === "CONTINUOUS"
                        ? "Sıralı yöntemde başlangıç numarası önceki kattan otomatik hesaplanır."
                        : undefined
                    }
                    style={inputStyle}
                  />
                </Field>
              </div>

              <div style={{ display: "grid", gap: 9, marginTop: 10 }}>
                {floorPlan.unitGroups.map((group, groupIndex) => (
                  <div
                    key={group.key}
                    style={{
                      border: `1.5px solid ${
                        UNIT_GROUP_PALETTES[
                          groupIndex % UNIT_GROUP_PALETTES.length
                        ].border
                      }`,
                      borderRadius: 16,
                      background:
                        UNIT_GROUP_PALETTES[
                          groupIndex % UNIT_GROUP_PALETTES.length
                        ].background,
                      padding: 10,
                      boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) 38px",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <strong
                        style={{
                          color: "#334155",
                          fontSize: 11,
                          fontWeight: 950,
                        }}
                      >
                        {groupIndex + 1}. Bağımsız Bölüm Grubu
                      </strong>

                      <button
                        type="button"
                        onClick={() =>
                          onRemoveUnitGroup(floorPlan.key, group.key)
                        }
                        disabled={
                          inventoryLocked ||
                          floorPlan.unitGroups.length === 1
                        }
                        aria-label="Grubu sil"
                        style={{
                          width: 38,
                          height: 38,
                          border: "1.5px solid #FECACA",
                          borderRadius: 12,
                          display: "grid",
                          placeItems: "center",
                          background:
                            inventoryLocked ||
                            floorPlan.unitGroups.length === 1
                              ? "#F8FAFC"
                              : "#FEF2F2",
                          color:
                            inventoryLocked ||
                            floorPlan.unitGroups.length === 1
                              ? "#94A3B8"
                              : "#DC2626",
                          cursor:
                            inventoryLocked ||
                            floorPlan.unitGroups.length === 1
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
                        gap: 9,
                        marginTop: 9,
                      }}
                    >
                      <Field label="Bağımsız bölüm türü *">
                        <select
                          value={group.type}
                          onChange={(event) =>
                            onUpdateUnitGroup(
                              floorPlan.key,
                              group.key,
                              "type",
                              event.target.value,
                            )
                          }
                          disabled={inventoryLocked}
                          style={inputStyle}
                        >
                          {UNIT_TYPE_OPTIONS.map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Adet *">
                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={group.count}
                          onChange={(event) =>
                            onUpdateUnitGroup(
                              floorPlan.key,
                              group.key,
                              "count",
                              event.target.value,
                            )
                          }
                          disabled={inventoryLocked}
                          style={inputStyle}
                        />
                      </Field>

                      <Field label="Oda sayısı">
                        <input
                          value={group.roomCount}
                          onChange={(event) =>
                            onUpdateUnitGroup(
                              floorPlan.key,
                              group.key,
                              "roomCount",
                              event.target.value,
                            )
                          }
                          disabled={inventoryLocked}
                          placeholder="Ör. 2+1"
                          style={inputStyle}
                        />
                      </Field>

                      <Field label="Ticari amaç *">
                        <select
                          value={group.commercialPurpose}
                          onChange={(event) =>
                            onUpdateUnitGroup(
                              floorPlan.key,
                              group.key,
                              "commercialPurpose",
                              event.target.value,
                            )
                          }
                          disabled={inventoryLocked}
                          style={inputStyle}
                        >
                          {COMMERCIAL_PURPOSE_OPTIONS.map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Net alan (m²)">
                        <input
                          inputMode="decimal"
                          value={group.netArea}
                          onChange={(event) =>
                            onUpdateUnitGroup(
                              floorPlan.key,
                              group.key,
                              "netArea",
                              event.target.value,
                            )
                          }
                          disabled={inventoryLocked}
                          placeholder="Ör. 92"
                          style={inputStyle}
                        />
                      </Field>

                      <Field label="Brüt alan (m²)">
                        <input
                          inputMode="decimal"
                          value={group.grossArea}
                          onChange={(event) =>
                            onUpdateUnitGroup(
                              floorPlan.key,
                              group.key,
                              "grossArea",
                              event.target.value,
                            )
                          }
                          disabled={inventoryLocked}
                          placeholder="Ör. 118"
                          style={inputStyle}
                        />
                      </Field>

                      <Field label="Konsept etiketi">
                        <input
                          value={group.conceptLabel}
                          onChange={(event) =>
                            onUpdateUnitGroup(
                              floorPlan.key,
                              group.key,
                              "conceptLabel",
                              event.target.value,
                            )
                          }
                          disabled={inventoryLocked}
                          placeholder="Ör. Bahçe katı"
                          style={inputStyle}
                        />
                      </Field>
                    </div>

                    <p
                      style={{
                        margin: "10px 0 7px",
                        color: "#334155",
                        fontSize: 11,
                        fontWeight: 900,
                      }}
                    >
                      Cepheler (opsiyonel)
                    </p>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                      }}
                    >
                      {FACADE_OPTIONS.map((facade) => {
                        const selected = group.facades.includes(facade);

                        return (
                          <button
                            key={facade}
                            type="button"
                            onClick={() =>
                              onToggleFacade(
                                floorPlan.key,
                                group.key,
                                facade,
                              )
                            }
                            disabled={inventoryLocked}
                            style={{
                              minHeight: 34,
                              border: selected
                                ? "1.5px solid #2563EB"
                                : "1.5px solid #C7D6E8",
                              borderRadius: 999,
                              background: selected
                                ? "#EFF6FF"
                                : "#FFFFFF",
                              color: selected ? "#1D4ED8" : "#475569",
                              padding: "6px 10px",
                              fontSize: 10,
                              fontWeight: 900,
                              cursor: inventoryLocked
                                ? "not-allowed"
                                : "pointer",
                            }}
                          >
                            {selected ? "✓ " : ""}
                            {facade}
                          </button>
                        );
                      })}
                    </div>

                    <p
                      style={{
                        margin: "7px 0 0",
                        color: "#64748B",
                        fontSize: 9,
                        lineHeight: 1.45,
                        fontWeight: 700,
                      }}
                    >
                      Kiler, kömürlük, teknik oda veya jeneratör odası gibi
                      cephesi bulunmayan bölümler için “Cephesi Yok / Kör
                      Cephe” seçilebilir. Cephe seçimi zorunlu değildir.
                    </p>
                  </div>
                ))}
              </div>

              <button 
                type="button"
                onClick={() => onAddUnitGroup(floorPlan.key)}
                disabled={inventoryLocked || Boolean(busyAction)}
                style={{
                  ...secondaryButtonStyle,
                  width: "100%",
                  marginTop: 9,
                }}
              >
                <Plus size={17} />
                Bu Kata Yeni Tür Ekle
              </button>
            </section>
          );
        })}
      </div>

      {preview && (
        <section
          style={{
            ...cardStyle,
            borderColor: "#86EFAC",
            background: "#F0FDF4",
            padding: 13,
            textAlign: "center",
          }}
        >
          <CheckCircle2 size={24} color="#15803D" />
          <h3
            style={{
              margin: "7px 0 0",
              color: "#1F2937",
              fontSize: 13,
              fontWeight: 950,
            }}
          >
            Envanter önizlemesi hazır
          </h3>
          <p
            style={{
              margin: "5px 0 0",
              color: "#64748B",
              fontSize: 11,
              lineHeight: 1.5,
              fontWeight: 750,
            }}
          >
            {preview.summary.independentUnitCount} bağımsız bölüm ve{" "}
            {preview.summary.salesInventoryCount} satış/kiralama stoku
            doğrulandı.
          </p>
        </section>
      )}

      {inventoryApplied && !editMode && (
        <button 
          type="button"
          onClick={onContinue}
          disabled={Boolean(busyAction)}
          style={{
            ...primaryButtonStyle,
            width: "100%",
            minHeight: 48,
            background: "linear-gradient(135deg, #047857, #10B981)",
          }}
        >
          <Landmark size={18} />
          Proje Alanlarına Geç
        </button>
      )}

      {inventoryApplied && editMode && (
        <button 
          type="button"
          onClick={onCancelEdit}
          disabled={Boolean(busyAction)}
          style={{
            ...secondaryButtonStyle,
            width: "100%",
            borderColor: "#FCA5A5",
            background: "#FFF7F7",
            color: "#B91C1C",
          }}
        >
          <X size={18} />
          Güncellemeyi İptal Et
        </button>
      )}

      {(editMode || !inventoryApplied) && (
        <section
          style={{
            ...cardStyle,
            position: "relative",
            borderColor: "#8DAED4",
            background:
              "linear-gradient(135deg, #E7F0FB 0%, #FFFFFF 55%, #E5EEF9 100%)",
            padding: 13,
            boxShadow: "0 14px 32px rgba(37, 99, 235, 0.14)",
          }}
        >
          <SectionTitle
            icon={<Save size={19} />}
            title="Envanter İşlemleri"
            subtitle="Önizleme isteğe bağlıdır; toplamlar eşleştiğinde güncelleme doğrudan kaydedilebilir."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
              gap: 8,
              marginTop: 11,
            }}
          >
        <button 
          type="button"
          onClick={onPreview}
          disabled={
            inventoryLocked ||
            previewing ||
            applying ||
            floorPlans.length === 0 ||
            plannedUnitCount === 0 ||
            unitCountMismatch ||
            salesCountMismatch
          }
          style={{
            ...secondaryButtonStyle,
            opacity:
              inventoryLocked ||
              plannedUnitCount === 0 ||
              unitCountMismatch ||
              salesCountMismatch
                ? 0.55
                : 1,
            cursor:
              inventoryLocked ||
              plannedUnitCount === 0 ||
              unitCountMismatch ||
              salesCountMismatch
                ? "not-allowed"
                : "pointer",
          }}
        >
          {previewing ? (
            <Loader2 size={18} className="eph-spin" />
          ) : (
            <ClipboardList size={18} />
          )}
          Envanteri Önizle
        </button>

        <button 
          type="button"
          onClick={inventoryApplied ? onReplace : onApply}
          disabled={
            inventoryLocked ||
            (!inventoryApplied && !preview) ||
            previewing ||
            applying
          }
          style={{
            ...primaryButtonStyle,
            opacity:
              inventoryLocked ||
              (!inventoryApplied && !preview) ||
              previewing ||
              applying
                ? 0.55
                : 1,
            cursor:
              inventoryLocked ||
              (!inventoryApplied && !preview) ||
              previewing ||
              applying
                ? "not-allowed"
                : "pointer",
          }}
        >
          {applying ? (
            <Loader2 size={18} className="eph-spin" />
          ) : (
            <CheckCircle2 size={18} />
          )}
          {inventoryApplied
            ? "Güncellemeyi Kaydet"
            : "Bağımsız Bölümleri Oluştur"}
        </button>
          </div>
        </section>
      )}

      {inventoryApplied && !editMode && (
        <button
          type="button"
          onClick={onStartEdit}
          disabled={Boolean(busyAction)}
          style={{
            ...secondaryButtonStyle,
            width: "100%",
            minHeight: 50,
            border: "2px solid #EC4899",
            background: "#FFF0F7",
            color: "#D41472",
            boxShadow: "0 12px 28px rgba(236, 72, 153, 0.20)",
            fontSize: 12,
            fontWeight: 950,
          }}
        >
          <ClipboardList size={19} />
          <RotatingInventoryUpdateText />
        </button>
      )}
    </div>
  );
}


function ProjectSpacesView({
  project,
  spaces,
  preview,
  busyAction,
  onUpdateSpace,
  onAddSpace,
  onRemoveSpace,
  onPreview,
  onApply,
  onContinue,
  onStepChange,
}: {
  project: ProjectSetupResponse;
  spaces: ProjectSpaceForm[];
  preview: ProjectSpacesPreview | null;
  busyAction: string | null;
  onUpdateSpace: <K extends keyof ProjectSpaceForm>(
    key: string,
    field: K,
    value: ProjectSpaceForm[K],
  ) => void;
  onAddSpace: () => void;
  onRemoveSpace: (key: string) => void;
  onPreview: () => void;
  onApply: () => void;
  onContinue: () => void;
  onStepChange: (step: WizardStep) => void;
}) {
  const previewing = busyAction === "spaces-preview";
  const applying = busyAction === "spaces-apply";
  const spacesApplied =
    project._count.spaces > 0 ||
    project.wizardStep === "KONTROL" ||
    project.wizardStep === "TAMAMLANDI" ||
    project.setupStatus === "KONTROLE_HAZIR" ||
    project.setupStatus === "TAMAMLANDI";
  const plannedSpaceCount = spaces.reduce(
    (total, space) => total + countValue(space.count),
    0,
  );

  return (
    <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
      <WizardProgress
        activeStep={4}
        project={project}
        navigationLocked={Boolean(busyAction)}
        onStepChange={onStepChange}
      />

      <section
        style={{
          ...cardStyle,
          borderColor: "#B7E4CC",
          background: "#F4FBF7",
          padding: 13,
        }}
      >
        <SectionTitle
          icon={<Landmark size={20} />}
          title="Sosyal, Ortak ve Teknik Alanlar"
          subtitle={`${project.name} • Satış stokundan ayrı proje alanları`}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 7,
            marginTop: 12,
          }}
        >
          <Metric label="Tanımlanan" value={plannedSpaceCount} />
          <Metric
            label="Ortak"
            value={preview?.summary.commonSpaceCount ?? 0}
          />
          <Metric
            label="Teknik"
            value={preview?.summary.technicalSpaceCount ?? 0}
          />
          <Metric
            label="Açık/Sosyal"
            value={preview?.summary.openAmenityCount ?? 0}
          />
        </div>

        <InfoBand tone="info">
          Havuz, otopark, lobi, sığınak, jeneratör odası, bahçe ve benzeri
          alanlar bağımsız bölüm veya satış stoku değildir. Projede bu
          alanlardan yoksa listeyi boş bırakıp adımı tamamlayabilirsiniz.
        </InfoBand>

        {spacesApplied && (
          <InfoBand tone="warning">
            Bu projede {project._count.spaces} proje alanı daha önce
            oluşturulmuş. Güvenlik nedeniyle aynı alanlar ikinci kez
            oluşturulamaz.
          </InfoBand>
        )}
      </section>

      {spaces.length === 0 ? (
        <section
          style={{
            ...cardStyle,
            borderStyle: "dashed",
            padding: 18,
            textAlign: "center",
          }}
        >
          <Landmark size={26} color="#10B981" />
          <h3
            style={{
              margin: "8px 0 0",
              color: "#1F2937",
              fontSize: 14,
              fontWeight: 950,
            }}
          >
            Henüz proje alanı eklenmedi
          </h3>
          <p
            style={{
              margin: "6px auto 0",
              maxWidth: 560,
              color: "#64748B",
              fontSize: 11,
              lineHeight: 1.55,
              fontWeight: 700,
            }}
          >
            Projede ortak, sosyal veya teknik alan varsa aşağıdaki butonla
            ekleyin. Alan yoksa doğrudan “Alanları Önizle” butonunu kullanın.
          </p>
        </section>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {spaces.map((space, index) => {
            const selectedBlock = project.blocks.find(
              (block) => block.code === space.blockCode,
            );
            const floorOptions = selectedBlock?.floors || [];
            const spacePalette =
              PROJECT_SPACE_CARD_PALETTES[
                index % PROJECT_SPACE_CARD_PALETTES.length
              ];

            return (
              <section
                key={space.key}
                style={{
                  ...cardStyle,
                  borderColor: spacePalette.border,
                  background: spacePalette.background,
                  padding: 13,
                  boxShadow: "0 10px 26px rgba(15, 23, 42, 0.06)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "42px minmax(0, 1fr) 42px",
                    alignItems: "center",
                    gap: 9,
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 13,
                      background: spacePalette.badgeBackground,
                      color: spacePalette.badgeColor,
                      fontSize: 12,
                      fontWeight: 950,
                    }}
                  >
                    {index + 1}
                  </div>

                  <div style={{ minWidth: 0, textAlign: "center" }}>
                    <h3
                      style={{
                        margin: 0,
                        color: "#1F2937",
                        fontSize: 14,
                        lineHeight: 1.3,
                        fontWeight: 950,
                      }}
                    >
                      {space.name || "Yeni Proje Alanı"}
                    </h3>
                    <p
                      style={{
                        margin: "3px 0 0",
                        color: "#64748B",
                        fontSize: 10,
                        fontWeight: 750,
                      }}
                    >
                      {countValue(space.count)} adet • Satış dışı proje alanı
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveSpace(space.key)}
                    disabled={spacesApplied || Boolean(busyAction)}
                    aria-label="Proje alanını kaldır"
                    style={{
                      width: 42,
                      height: 42,
                      border: "1.5px solid #FECACA",
                      borderRadius: 13,
                      display: "grid",
                      placeItems: "center",
                      background: "#FFF7F7",
                      color: "#DC2626",
                      cursor:
                        spacesApplied || busyAction ? "not-allowed" : "pointer",
                    }}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
                    gap: 9,
                    marginTop: 12,
                  }}
                >
                  <Field label="Alan türü *">
                    <select
                      value={space.spaceType}
                      onChange={(event) =>
                        onUpdateSpace(
                          space.key,
                          "spaceType",
                          event.target.value,
                        )
                      }
                      disabled={spacesApplied}
                      style={inputStyle}
                    >
                      {PROJECT_SPACE_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Alan adı *">
                    <input
                      value={space.name}
                      onChange={(event) =>
                        onUpdateSpace(space.key, "name", event.target.value)
                      }
                      disabled={spacesApplied}
                      placeholder="Ör. Açık Yüzme Havuzu"
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Adet *">
                    <input
                      inputMode="numeric"
                      value={space.count}
                      onChange={(event) =>
                        onUpdateSpace(space.key, "count", event.target.value)
                      }
                      disabled={spacesApplied}
                      placeholder="1"
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Brüt alan (m²)">
                    <input
                      inputMode="decimal"
                      value={space.grossArea}
                      onChange={(event) =>
                        onUpdateSpace(
                          space.key,
                          "grossArea",
                          event.target.value,
                        )
                      }
                      disabled={spacesApplied}
                      placeholder="Ör. 250"
                      style={inputStyle}
                    />
                  </Field>

                  {space.spaceType === "DIGER" && (
                    <Field label="Özel alan türü *">
                      <input
                        value={space.customTypeName}
                        onChange={(event) =>
                          onUpdateSpace(
                            space.key,
                            "customTypeName",
                            event.target.value,
                          )
                        }
                        disabled={spacesApplied}
                        placeholder="Alan türünü yazın"
                        style={inputStyle}
                      />
                    </Field>
                  )}

                  <Field label="Bağlı blok">
                    <select
                      value={space.blockCode}
                      onChange={(event) =>
                        onUpdateSpace(
                          space.key,
                          "blockCode",
                          event.target.value,
                        )
                      }
                      disabled={spacesApplied}
                      style={inputStyle}
                    >
                      <option value="">Proje geneli / Bloksuz</option>
                      {project.blocks.map((block) => (
                        <option key={block.id} value={block.code}>
                          {block.name || `${block.code} Blok`}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Bağlı kat">
                    <select
                      value={space.floorLevel}
                      onChange={(event) =>
                        onUpdateSpace(
                          space.key,
                          "floorLevel",
                          event.target.value,
                        )
                      }
                      disabled={spacesApplied || !space.blockCode}
                      style={inputStyle}
                    >
                      <option value="">Kat bağımsız / Belirtilmedi</option>
                      {floorOptions.map((floor) => (
                        <option key={floor.id} value={String(floor.level)}>
                          {floor.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Hukuki sınıf *">
                    <select
                      value={space.legalStatus}
                      onChange={(event) =>
                        onUpdateSpace(
                          space.key,
                          "legalStatus",
                          event.target.value,
                        )
                      }
                      disabled={spacesApplied}
                      style={inputStyle}
                    >
                      {SPACE_LEGAL_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Kullanım amacı *">
                    <select
                      value={space.commercialPurpose}
                      onChange={(event) =>
                        onUpdateSpace(
                          space.key,
                          "commercialPurpose",
                          event.target.value,
                        )
                      }
                      disabled={spacesApplied}
                      style={inputStyle}
                    >
                      {SPACE_COMMERCIAL_PURPOSE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div style={{ display: "grid", gap: 9, marginTop: 9 }}>
                  <Field label="Açıklama">
                    <textarea
                      value={space.description}
                      onChange={(event) =>
                        onUpdateSpace(
                          space.key,
                          "description",
                          event.target.value,
                        )
                      }
                      disabled={spacesApplied}
                      rows={2}
                      placeholder="Alanla ilgili kısa açıklama"
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                  </Field>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSpace(
                        space.key,
                        "isCustomerVisible",
                        !space.isCustomerVisible,
                      )
                    }
                    disabled={spacesApplied}
                    style={{
                      ...secondaryButtonStyle,
                      width: "100%",
                      borderColor: space.isCustomerVisible
                        ? "#86EFAC"
                        : "#C7D6E8",
                      background: space.isCustomerVisible
                        ? "#F0FDF4"
                        : "#FFFFFF",
                      color: space.isCustomerVisible
                        ? "#047857"
                        : "#475569",
                    }}
                  >
                    {space.isCustomerVisible ? (
                      <Check size={17} />
                    ) : (
                      <X size={17} />
                    )}
                    {space.isCustomerVisible
                      ? "Müşteriye Görünür"
                      : "Müşteriye Gizli"}
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {!spacesApplied && (
        <button 
          type="button"
          onClick={onAddSpace}
          disabled={Boolean(busyAction)}
          style={{
            ...secondaryButtonStyle,
            width: "100%",
            borderColor: "#A7F3D0",
            background: "#F0FDF4",
            color: "#047857",
          }}
        >
          <Plus size={18} />
          Yeni Proje Alanı Ekle
        </button>
      )}

      {preview && (
        <section
          style={{
            ...cardStyle,
            borderColor: "#86EFAC",
            background: "#F0FDF4",
            padding: 13,
            textAlign: "center",
          }}
        >
          <CheckCircle2 size={24} color="#15803D" />
          <h3
            style={{
              margin: "7px 0 0",
              color: "#1F2937",
              fontSize: 13,
              fontWeight: 950,
            }}
          >
            Proje alanları önizlemesi hazır
          </h3>
          <p
            style={{
              margin: "5px 0 0",
              color: "#64748B",
              fontSize: 11,
              lineHeight: 1.5,
              fontWeight: 750,
            }}
          >
            {preview.summary.projectSpaceCount} proje alanı doğrulandı.
            Bunların {preview.summary.customerVisibleCount} adedi müşteriye
            görünür olacak.
          </p>
        </section>
      )}

      {spacesApplied && (
        <button 
          type="button"
          onClick={onContinue}
          disabled={Boolean(busyAction)}
          style={{
            ...primaryButtonStyle,
            width: "100%",
            background: "linear-gradient(135deg, #6D28D9, #8B5CF6)",
          }}
        >
          {busyAction === "completion-load" ? (
            <Loader2 size={18} className="eph-spin" />
          ) : (
            <CheckCircle2 size={18} />
          )}
          Son Kontrole Geç
        </button>
      )}

      <div
        style={{
          ...cardStyle,
          position: "sticky",
          bottom: "calc(8px + env(safe-area-inset-bottom))",
          zIndex: 20,
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 8,
          padding: 9,
        }}
      >
        <button 
          type="button"
          onClick={onPreview}
          disabled={spacesApplied || previewing || applying}
          style={{
            ...secondaryButtonStyle,
            opacity: spacesApplied ? 0.55 : 1,
            cursor: spacesApplied ? "not-allowed" : "pointer",
          }}
        >
          {previewing ? (
            <Loader2 size={18} className="eph-spin" />
          ) : (
            <ClipboardList size={18} />
          )}
          Alanları Önizle
        </button>

        <button 
          type="button"
          onClick={onApply}
          disabled={spacesApplied || !preview || previewing || applying}
          style={{
            ...primaryButtonStyle,
            background: "linear-gradient(135deg, #047857, #10B981)",
            opacity: spacesApplied || !preview ? 0.55 : 1,
            cursor:
              spacesApplied || !preview ? "not-allowed" : "pointer",
          }}
        >
          {applying ? (
            <Loader2 size={18} className="eph-spin" />
          ) : (
            <CheckCircle2 size={18} />
          )}
          Proje Alanlarını Kaydet
        </button>
      </div>
    </div>
  );
}


function ProjectCompletionView({
  project,
  preview,
  busyAction,
  reviewMessage,
  onReviewMessageChange,
  onRefresh,
  onRequestReview,
  onComplete,
  onBackToList,
  onStepChange,
}: {
  project: ProjectSetupResponse;
  preview: CompletionPreview;
  busyAction: string | null;
  reviewMessage: string;
  onReviewMessageChange: (value: string) => void;
  onRefresh: () => void;
  onRequestReview: () => void;
  onComplete: () => void;
  onBackToList: () => void;
  onStepChange: (step: WizardStep) => void;
}) {
  const refreshing = busyAction === "completion-load";
  const requestingReview = busyAction === "design-review";
  const completing = busyAction === "complete-project";
  const completed =
    project.setupStatus === "TAMAMLANDI" ||
    project.wizardStep === "TAMAMLANDI" ||
    preview.summary.setupStatus === "TAMAMLANDI" ||
    preview.summary.wizardStep === "TAMAMLANDI";
  const reviewIssue = preview.issues.some((issue) =>
    issue.code.startsWith("SOFTWARE_TEAM_REVIEW"),
  );
  const latestReview = preview.latestDesignReview;
  const openReview = latestReview
    ? ["BEKLIYOR", "INCELEMEDE", "EK_BILGI_BEKLENIYOR"].includes(
        latestReview.status,
      )
    : false;

  return (
    <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
      <WizardProgress
        activeStep={5}
        project={project}
        navigationLocked={Boolean(busyAction)}
        onStepChange={onStepChange}
      />

      <section
        style={{
          ...cardStyle,
          borderColor: "#D6C3F0",
          background: "#FAF7FF",
          padding: 13,
        }}
      >
        <SectionTitle
          icon={<CheckCircle2 size={20} />}
          title="Son Kontrol ve Tamamlama"
          subtitle={`${project.name} • Tüm proje verileri birlikte doğrulanır.`}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
            gap: 7,
            marginTop: 12,
          }}
        >
          <Metric label="Blok" value={preview.summary.blockCount} />
          <Metric label="Kat" value={preview.summary.floorCount} />
          <Metric
            label="Bağımsız"
            value={preview.summary.independentUnitCount}
          />
          <Metric
            label="Satış Stoku"
            value={preview.summary.salesInventoryCount}
          />
          <Metric
            label="Proje Alanı"
            value={preview.summary.projectSpaceCount}
          />
        </div>

        <div
          style={{
            marginTop: 10,
            border: `1.5px solid ${
              completed || preview.ready ? "#86EFAC" : "#FDBA74"
            }`,
            borderRadius: 16,
            background:
              completed || preview.ready ? "#F0FDF4" : "#FFF7ED",
            padding: 12,
            textAlign: "center",
          }}
        >
          {completed || preview.ready ? (
            <CheckCircle2 size={25} color="#15803D" />
          ) : (
            <AlertTriangle size={25} color="#C2410C" />
          )}

          <h3
            style={{
              margin: "7px 0 0",
              color: "#1F2937",
              fontSize: 14,
              fontWeight: 950,
            }}
          >
            {completed
              ? "Proje kurulumu tamamlandı"
              : preview.ready
                ? "Proje tamamlanmaya hazır"
                : "Tamamlanması gereken kontroller var"}
          </h3>

          <p
            style={{
              margin: "5px 0 0",
              color: "#64748B",
              fontSize: 11,
              lineHeight: 1.55,
              fontWeight: 750,
            }}
          >
            {completed
              ? "Projenin tüm kurulum adımları başarıyla tamamlandı."
              : preview.ready
                ? "Beyan edilen ve oluşturulan tüm değerler birbiriyle uyumlu."
                : `${preview.issues.length} kontrol maddesi tamamlanmayı bekliyor.`}
          </p>
        </div>
      </section>

      {preview.issues.length > 0 && (
        <section style={{ ...cardStyle, padding: 13 }}>
          <SectionTitle
            icon={<AlertTriangle size={20} />}
            title="Kontrol Maddeleri"
            subtitle="Proje tamamlanmadan önce aşağıdaki maddeleri giderin."
          />

          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {preview.issues.map((issue, index) => (
              <div
                key={`${issue.code}-${index}`}
                style={{
                  border: "1.5px solid #FED7AA",
                  borderRadius: 14,
                  background: "#FFF7ED",
                  color: "#9A3412",
                  padding: 10,
                  display: "grid",
                  gridTemplateColumns: "28px minmax(0, 1fr)",
                  alignItems: "start",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 9,
                    background: "#FFEDD5",
                    color: "#C2410C",
                    fontSize: 11,
                    fontWeight: 950,
                  }}
                >
                  {index + 1}
                </span>

                <div style={{ minWidth: 0 }}>
                  <strong
                    style={{
                      display: "block",
                      color: "#7C2D12",
                      fontSize: 11,
                      fontWeight: 950,
                    }}
                  >
                    {issue.code.replaceAll("_", " ")}
                  </strong>
                  <span
                    style={{
                      display: "block",
                      marginTop: 3,
                      fontSize: 11,
                      lineHeight: 1.5,
                      fontWeight: 750,
                    }}
                  >
                    {issue.message}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(reviewIssue || latestReview) && (
        <section style={{ ...cardStyle, padding: 13 }}>
          <SectionTitle
            icon={<Sparkles size={20} />}
            title="Yazılım Ekibi İncelemesi"
            subtitle="Karmaşık geometriler standart şablon dışında ayrıca kontrol edilir."
          />

          {latestReview ? (
            <div
              style={{
                marginTop: 12,
                border: "1.5px solid #C4B5FD",
                borderRadius: 15,
                background: "#F5F3FF",
                padding: 11,
                textAlign: "center",
              }}
            >
              <strong
                style={{
                  display: "block",
                  color: "#6D28D9",
                  fontSize: 12,
                  fontWeight: 950,
                }}
              >
                {designReviewStatusLabel(latestReview.status)}
              </strong>
              <span
                style={{
                  display: "block",
                  marginTop: 4,
                  color: "#64748B",
                  fontSize: 10,
                  lineHeight: 1.5,
                  fontWeight: 750,
                }}
              >
                Talep tarihi: {formatDate(latestReview.requestedAt)}
              </span>

              {latestReview.softwareTeamNote && (
                <p
                  style={{
                    margin: "7px 0 0",
                    color: "#475569",
                    fontSize: 11,
                    lineHeight: 1.5,
                    fontWeight: 750,
                  }}
                >
                  {latestReview.softwareTeamNote}
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
              <Field label="Yazılım Ekibine not">
                <textarea
                  value={reviewMessage}
                  onChange={(event) =>
                    onReviewMessageChange(event.target.value)
                  }
                  rows={3}
                  placeholder="Geometri veya yerleşimle ilgili özel durumu kısaca açıklayın."
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </Field>

              <button 
                type="button"
                onClick={onRequestReview}
                disabled={requestingReview || Boolean(busyAction && !requestingReview)}
                style={{
                  ...primaryButtonStyle,
                  width: "100%",
                  background: "linear-gradient(135deg, #6D28D9, #8B5CF6)",
                }}
              >
                {requestingReview ? (
                  <Loader2 size={18} className="eph-spin" />
                ) : (
                  <Sparkles size={18} />
                )}
                Yazılım Ekibi İncelemesi İste
              </button>
            </div>
          )}

          {openReview && (
            <InfoBand tone="warning">
              İnceleme talebi sonuçlanmadan proje kurulumu tamamlanamaz.
            </InfoBand>
          )}
        </section>
      )}

      <div
        style={{
          ...cardStyle,
          position: "sticky",
          bottom: "calc(8px + env(safe-area-inset-bottom))",
          zIndex: 20,
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 8,
          padding: 9,
        }}
      >
        {completed ? (
          <button 
            type="button"
            onClick={onBackToList}
            style={{
              ...primaryButtonStyle,
              gridColumn: "1 / -1",
              width: "100%",
              background: "linear-gradient(135deg, #047857, #10B981)",
            }}
          >
            <CheckCircle2 size={18} />
            Proje Listesine Dön
          </button>
        ) : (
          <>
            <button 
              type="button"
              onClick={onRefresh}
              disabled={refreshing || completing}
              style={secondaryButtonStyle}
            >
              {refreshing ? (
                <Loader2 size={18} className="eph-spin" />
              ) : (
                <ClipboardList size={18} />
              )}
              Kontrolü Yenile
            </button>

            <button 
              type="button"
              onClick={onComplete}
              disabled={!preview.ready || refreshing || completing}
              style={{
                ...primaryButtonStyle,
                background: "linear-gradient(135deg, #047857, #10B981)",
                opacity: preview.ready ? 1 : 0.55,
                cursor: preview.ready ? "pointer" : "not-allowed",
              }}
            >
              {completing ? (
                <Loader2 size={18} className="eph-spin" />
              ) : (
                <CheckCircle2 size={18} />
              )}
              Projeyi Tamamla
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function WizardProgress({
  activeStep,
  project,
  navigationLocked,
  onStepChange,
}: {
  activeStep: WizardStep;
  project: ProjectSummary | null;
  navigationLocked: boolean;
  onStepChange: (step: WizardStep) => void;
}) {
  const steps: Array<{ number: WizardStep; label: string }> = [
    { number: 1, label: "Proje Bilgileri" },
    { number: 2, label: "Blok ve Katlar" },
    { number: 3, label: "Bağımsız Bölümler" },
    { number: 4, label: "Proje Alanları" },
    { number: 5, label: "Son Kontrol" },
  ];

  const isStepAvailable = (step: WizardStep) => {
    if (step === 1) return true;
    if (!project) return false;
    if (step === 2) return true;
    if (step === 3) return project._count.blocks > 0;
    return project._count.units > 0;
  };

  return (
    <section style={{ ...cardStyle, padding: 9 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 6,
        }}
      >
        {steps.map((step) => {
          const active = step.number === activeStep;
          const completed = step.number < activeStep;
          const available = isStepAvailable(step.number);
          const clickable = available && !active && !navigationLocked;

          return (
            <button
              key={step.number}
              type="button"
              onClick={() => onStepChange(step.number)}
              disabled={!clickable}
              aria-current={active ? "step" : undefined}
              title={
                active
                  ? "Bu adımdasınız"
                  : available
                    ? `${step.label} adımına git`
                    : "Önce önceki adımı tamamlayın"
              }
              style={{
                minWidth: 0,
                minHeight: 52,
                border: active
                  ? "1.5px solid #2563EB"
                  : completed
                    ? "1.5px solid #86EFAC"
                    : "1.5px solid #D6E2F0",
                borderRadius: 13,
                display: "grid",
                gridTemplateRows: "28px minmax(22px, auto)",
                placeItems: "center",
                alignContent: "center",
                gap: 4,
                background: active
                  ? "#EFF6FF"
                  : completed
                    ? "#F0FDF4"
                    : "#F8FAFC",
                padding: 7,
                fontFamily: "inherit",
                opacity: available ? 1 : 0.62,
                cursor: clickable ? "pointer" : "default",
                boxShadow: clickable
                  ? "0 6px 14px rgba(37, 99, 235, 0.08)"
                  : "none",
                transition:
                  "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 9,
                  background: active
                    ? "#2563EB"
                    : completed
                      ? "#16A34A"
                      : "#E2E8F0",
                  color: active || completed ? "#FFFFFF" : "#64748B",
                  fontSize: 11,
                  fontWeight: 950,
                }}
              >
                {completed ? <Check size={15} strokeWidth={3} /> : step.number}
              </span>
              <span
                style={{
                  minWidth: 0,
                  color: active
                    ? "#1D4ED8"
                    : completed
                      ? "#166534"
                      : "#64748B",
                  fontSize: 9,
                  lineHeight: 1.25,
                  fontWeight: 900,
                  width: "100%",
                  textAlign: "center",
                  overflowWrap: "normal",
                  wordBreak: "normal",
                }}
              >
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function UnitTypeMultiSelect({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (unitType: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  const selectedOptions = UNIT_TYPE_OPTIONS.filter((option) =>
    selected.includes(option.value),
  );

  return (
    <div ref={rootRef} style={{ position: "relative", minWidth: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        style={{
          ...inputStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selectedOptions.length === 0
            ? "Bağımsız bölüm türü seçin"
            : `${selectedOptions.length} tür seçildi`}
        </span>
        <ChevronDown
          size={18}
          style={{
            flex: "0 0 auto",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 160ms ease",
          }}
        />
      </button>

      {selectedOptions.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginTop: 7,
          }}
        >
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              style={{
                border: "1px solid #BFDBFE",
                borderRadius: 999,
                background: "#EFF6FF",
                color: "#1D4ED8",
                padding: "5px 8px",
                fontSize: 10,
                fontWeight: 900,
              }}
            >
              {option.label}
            </span>
          ))}
        </div>
      )}

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            zIndex: 80,
            maxHeight: 310,
            overflowY: "auto",
            border: "1.5px solid #C7D6E8",
            borderRadius: 16,
            background: "#FFFFFF",
            padding: 8,
            boxShadow: "0 22px 55px rgba(15, 23, 42, 0.18)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
              gap: 6,
            }}
          >
            {UNIT_TYPE_OPTIONS.map((option) => {
              const active = selected.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onToggle(option.value)}
                  style={{
                    minHeight: 40,
                    border: active
                      ? "1.5px solid #2563EB"
                      : "1.5px solid #D6E2F0",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: active ? "#EFF6FF" : "#FFFFFF",
                    color: active ? "#1D4ED8" : "#475569",
                    padding: "8px 10px",
                    textAlign: "left",
                    fontSize: 11,
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      flex: "0 0 20px",
                      display: "grid",
                      placeItems: "center",
                      border: active
                        ? "1px solid #2563EB"
                        : "1px solid #CBD5E1",
                      borderRadius: 6,
                      background: active ? "#2563EB" : "#F8FAFC",
                      color: "#FFFFFF",
                    }}
                  >
                    {active && <Check size={14} strokeWidth={3} />}
                  </span>
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>

          <p
            style={{
              margin: "8px 2px 0",
              color: "#64748B",
              fontSize: 9,
              lineHeight: 1.45,
              fontWeight: 750,
              textAlign: "center",
            }}
          >
            En az bir bağımsız bölüm türü seçili kalmalıdır.
          </p>
        </div>
      )}
    </div>
  );
}

function CenteredState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        overflowY: "auto",
        display: "grid",
        placeItems: "center",
        background: "#F4F8FF",
        padding:
          "calc(20px + env(safe-area-inset-top)) 16px calc(20px + env(safe-area-inset-bottom))",
      }}
    >
      <section
        style={{
          ...cardStyle,
          width: "100%",
          maxWidth: 430,
          padding: 22,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 58,
            height: 58,
            margin: "0 auto",
            display: "grid",
            placeItems: "center",
            borderRadius: 18,
            background: "#EAF2FF",
            color: "#1557D6",
          }}
        >
          {icon}
        </div>
        <h1
          style={{
            margin: "12px 0 0",
            color: "#1F2937",
            fontSize: 18,
            fontWeight: 950,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            margin: "7px 0 0",
            color: "#64748B",
            fontSize: 12,
            lineHeight: 1.6,
            fontWeight: 700,
          }}
        >
          {text}
        </p>
        {action && <div style={{ marginTop: 14 }}>{action}</div>}
      </section>
    </main>
  );
}
