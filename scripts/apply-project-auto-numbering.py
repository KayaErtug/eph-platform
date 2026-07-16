from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"{label} anchor not found")
    return text.replace(old, new, 1)


# -------------------- TYPES --------------------
types_path = Path("frontend/src/app/proje-satis-sablonu/lib/projectSalesTypes.ts")
types = types_path.read_text(encoding="utf-8-sig")
types = replace_once(
    types,
    "export type WizardStep = 1 | 2 | 3 | 4 | 5;\n",
    'export type WizardStep = 1 | 2 | 3 | 4 | 5;\nexport type ProjectNumberingMode = "FLOOR_CODED" | "CONTINUOUS";\n',
    "numbering mode type",
)
types_path.write_text(types, encoding="utf-8")


# -------------------- FRONTEND PAGE --------------------
page_path = Path("frontend/src/app/proje-satis-sablonu/page.tsx")
page = page_path.read_text(encoding="utf-8-sig")

page = replace_once(
    page,
    "  ProjectLaunchCenterResponse,\n",
    "  ProjectLaunchCenterResponse,\n  ProjectNumberingMode,\n",
    "page type import",
)
page = replace_once(
    page,
    'import { ProjectMediaCenterView } from "./components/ProjectMediaCenterView";\n',
    'import { ProjectMediaCenterView } from "./components/ProjectMediaCenterView";\nimport { ProjectInventoryNumberingPanel } from "./components/ProjectInventoryNumberingPanel";\n',
    "numbering panel import",
)
page = replace_once(
    page,
    '} from "./lib/projectSalesFormatters";\n',
    '} from "./lib/projectSalesFormatters";\nimport {\n  defaultNumberPrefix,\n  inferProjectNumberingMode,\n} from "./lib/projectSalesNumbering";\n',
    "numbering helper import",
)

old_floor_numbering = '''function floorNumberingFromUnits(
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

  const floorMarker =
    floorLevel < 0
      ? `-B${Math.abs(floorLevel)}`
      : floorLevel === 0
        ? "-Z"
        : `-${floorLevel}`;
  const markerIndex = firstNumber.lastIndexOf(floorMarker);

  if (markerIndex <= 0) {
    return {
      numberPrefix: fallbackPrefix,
      startingSequence: "1",
    };
  }

  const numberPrefix = firstNumber.slice(0, markerIndex).trim();
  const rawSequence = firstNumber
    .slice(markerIndex + floorMarker.length)
    .trim();
  const parsedSequence = Number(rawSequence);

  return {
    numberPrefix: numberPrefix || fallbackPrefix,
    startingSequence:
      Number.isInteger(parsedSequence) && parsedSequence > 0
        ? String(parsedSequence)
        : "1",
  };
}
'''
new_floor_numbering = '''function floorNumberingFromUnits(
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
'''
page = replace_once(page, old_floor_numbering, new_floor_numbering, "floor numbering parser")

page = replace_once(
    page,
    "        block.normalizedCode || block.code,\n",
    "        defaultNumberPrefix(block.normalizedCode || block.code),\n",
    "default block prefix",
)
page = replace_once(
    page,
    "  const [inventoryEditMode, setInventoryEditMode] = useState(false);\n",
    '  const [inventoryEditMode, setInventoryEditMode] = useState(false);\n  const [numberingMode, setNumberingMode] =\n    useState<ProjectNumberingMode>("FLOOR_CODED");\n',
    "numbering state",
)
page = replace_once(
    page,
    "      setInventoryProject(setup);\n      setStructureProject(setup);\n      setEditingProject(setup);\n      setFloorPlans(floorPlansFromSetup(setup));\n",
    "      setInventoryProject(setup);\n      setStructureProject(setup);\n      setEditingProject(setup);\n      setNumberingMode(inferProjectNumberingMode(setup.units));\n      setFloorPlans(floorPlansFromSetup(setup));\n",
    "open inventory numbering mode",
)
page = replace_once(
    page,
    "      setInventoryProject(refreshedSetup);\n      setStructureProject(refreshedSetup);\n      setEditingProject(refreshedSetup);\n      setFloorPlans(floorPlansFromSetup(refreshedSetup));\n",
    "      setInventoryProject(refreshedSetup);\n      setStructureProject(refreshedSetup);\n      setEditingProject(refreshedSetup);\n      setNumberingMode(inferProjectNumberingMode(refreshedSetup.units));\n      setFloorPlans(floorPlansFromSetup(refreshedSetup));\n",
    "replace inventory numbering mode",
)
page = replace_once(
    page,
    "  const buildInventoryPayload = () => ({\n    floorPlans:",
    "  const buildInventoryPayload = () => ({\n    numberingMode,\n    floorPlans:",
    "inventory payload mode",
)
page = replace_once(
    page,
    "        numberPrefix: floorPlan.numberPrefix.trim() || floorPlan.blockCode,\n",
    "        numberPrefix:\n          floorPlan.numberPrefix.trim() ||\n          defaultNumberPrefix(floorPlan.blockCode),\n",
    "payload default prefix",
)
page = replace_once(
    page,
    "            editMode={inventoryEditMode}\n",
    "            editMode={inventoryEditMode}\n            numberingMode={numberingMode}\n",
    "inventory view mode prop",
)
page = replace_once(
    page,
    "            onCopyToAll={copyFloorDistributionToAll}\n",
    "            onCopyToAll={copyFloorDistributionToAll}\n            onNumberingModeChange={(nextMode) => {\n              setNumberingMode(nextMode);\n              setInventoryPreview(null);\n            }}\n",
    "inventory view mode handler",
)
page = replace_once(
    page,
    "  editMode,\n  onUpdateFloorPlan,\n",
    "  editMode,\n  numberingMode,\n  onUpdateFloorPlan,\n",
    "view destructuring mode",
)
page = replace_once(
    page,
    "  onCopyToAll,\n  onPreview,\n",
    "  onCopyToAll,\n  onNumberingModeChange,\n  onPreview,\n",
    "view destructuring handler",
)
page = replace_once(
    page,
    "  editMode: boolean;\n  onUpdateFloorPlan:",
    "  editMode: boolean;\n  numberingMode: ProjectNumberingMode;\n  onUpdateFloorPlan:",
    "view prop type mode",
)
page = replace_once(
    page,
    "  onCopyToAll: (\n    floorKey: string,\n    options: FloorCopyOptions,\n  ) => void;\n  onPreview:",
    "  onCopyToAll: (\n    floorKey: string,\n    options: FloorCopyOptions,\n  ) => void;\n  onNumberingModeChange: (mode: ProjectNumberingMode) => void;\n  onPreview:",
    "view prop type handler",
)

copy_section = '''      <section
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
'''
numbering_panel = '''      <ProjectInventoryNumberingPanel
        floorPlans={floorPlans}
        numberingMode={numberingMode}
        disabled={inventoryLocked || Boolean(busyAction)}
        onChange={onNumberingModeChange}
      />

''' + copy_section
page = replace_once(page, copy_section, numbering_panel, "numbering panel placement")

old_starting = '''                    value={floorPlan.startingSequence}
                    onChange={(event) =>
                      onUpdateFloorPlan(
                        floorPlan.key,
                        "startingSequence",
                        event.target.value,
                      )
                    }
                    disabled={inventoryLocked}
                    style={inputStyle}
'''
new_starting = '''                    value={floorPlan.startingSequence}
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
'''
page = replace_once(page, old_starting, new_starting, "starting sequence lock")
page_path.write_text(page, encoding="utf-8")


# -------------------- BACKEND --------------------
backend_path = Path("backend/src/project-sales/project-sales-inventory.service.ts")
backend = backend_path.read_text(encoding="utf-8-sig")

backend = replace_once(
    backend,
    "type InventoryBody = {\n  floorPlans?: unknown;\n  projectSpaces?: unknown;\n};\n",
    "type ProjectNumberingMode = 'FLOOR_CODED' | 'CONTINUOUS';\n\ntype InventoryBody = {\n  numberingMode?: unknown;\n  floorPlans?: unknown;\n  projectSpaces?: unknown;\n};\n",
    "backend numbering type",
)
backend = replace_once(
    backend,
    "    const floorPlans = this.arrayValue(body.floorPlans, 'Kat dağılımı');\n    const projectSpaces = this.optionalArrayValue(body.projectSpaces);\n",
    "    const floorPlans = this.arrayValue(body.floorPlans, 'Kat dağılımı');\n    const projectSpaces = this.optionalArrayValue(body.projectSpaces);\n    const numberingMode = this.projectNumberingMode(body.numberingMode);\n",
    "backend mode parse",
)
backend = replace_once(
    backend,
    "    const usedFloorKeys = new Set<string>();\n    const units: PreparedUnit[] = [];\n",
    "    const usedFloorKeys = new Set<string>();\n    const continuousSequences = new Map<string, number>();\n    const units: PreparedUnit[] = [];\n",
    "continuous counters",
)
backend = replace_once(
    backend,
    '''      let sequence = this.integerValue(
        rawFloorPlan.startingSequence,
        1,
        9999,
        `${block.code} ${floor.label} başlangıç sıra numarası`,
        1,
      );
''',
    '''      let floorSequence = this.integerValue(
        rawFloorPlan.startingSequence,
        1,
        9999,
        `${block.code} ${floor.label} başlangıç sıra numarası`,
        1,
      );
      let continuousSequence = continuousSequences.get(block.id) ?? 1;
''',
    "sequence variables",
)
backend = replace_once(
    backend,
    '''          const number = this.createUnitNumber(
            numberPrefix,
            floor.level,
            sequence,
          );
''',
    '''          const sequence =
            numberingMode === 'CONTINUOUS' && floor.level >= 0
              ? continuousSequence
              : floorSequence;
          const number = this.createUnitNumber(
            numberPrefix,
            floor.level,
            sequence,
            numberingMode,
          );
''',
    "unit number creation",
)
backend = replace_once(
    backend,
    '''          sequence += 1;
          unitSortOrder += 1;
        }
      }
    }

    const spaceCodeCounters = new Map<string, number>();
''',
    '''          if (numberingMode === 'CONTINUOUS' && floor.level >= 0) {
            continuousSequence += 1;
          } else {
            floorSequence += 1;
          }
          unitSortOrder += 1;
        }
      }

      if (numberingMode === 'CONTINUOUS' && floor.level >= 0) {
        continuousSequences.set(block.id, continuousSequence);
      }
    }

    const spaceCodeCounters = new Map<string, number>();
''',
    "sequence increments",
)

old_create_number = '''  private createUnitNumber(
    prefix: string,
    floorLevel: number,
    sequence: number,
  ) {
    const normalizedPrefix = this.normalizeCode(prefix);
    const itemSequence = String(sequence).padStart(2, '0');

    if (floorLevel < 0) {
      return `${normalizedPrefix}-B${Math.abs(floorLevel)}${itemSequence}`;
    }

    if (floorLevel === 0) {
      return `${normalizedPrefix}-Z${itemSequence}`;
    }

    return `${normalizedPrefix}-${floorLevel}${itemSequence}`;
  }
'''
new_create_number = '''  private createUnitNumber(
    prefix: string,
    floorLevel: number,
    sequence: number,
    numberingMode: ProjectNumberingMode,
  ) {
    const normalizedPrefix = this.normalizeCode(prefix);

    if (floorLevel < 0) {
      return `${normalizedPrefix}-B${Math.abs(floorLevel)}-${sequence}`;
    }

    if (floorLevel === 0) {
      return `${normalizedPrefix}-Z-${sequence}`;
    }

    if (numberingMode === 'CONTINUOUS') {
      return `${normalizedPrefix}-${sequence}`;
    }

    return `${normalizedPrefix}-${floorLevel}${String(sequence).padStart(2, '0')}`;
  }
'''
backend = replace_once(backend, old_create_number, new_create_number, "create unit number")
backend = replace_once(
    backend,
    "  private defaultSpaceLegalStatus(spaceType: ProjectSpaceType) {\n",
    '''  private projectNumberingMode(value: unknown): ProjectNumberingMode {
    if (value === null || value === undefined || value === '') {
      return 'FLOOR_CODED';
    }

    if (value === 'FLOOR_CODED' || value === 'CONTINUOUS') {
      return value;
    }

    throw new BadRequestException('Geçersiz bağımsız bölüm numaralandırma yöntemi.');
  }

  private defaultSpaceLegalStatus(spaceType: ProjectSpaceType) {
''',
    "numbering mode validator",
)
backend_path.write_text(backend, encoding="utf-8")
