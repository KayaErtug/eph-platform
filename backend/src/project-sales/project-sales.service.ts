import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ProjectFloorType,
  ProjectMediaPackageType,
  UnitStatus,
  UnitType,
} from '@prisma/client';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProjectSalesBlockRow,
  ProjectSalesFeaturePackage,
  ProjectSalesFloorValue,
  ProjectSalesPhotoPackage,
  ProjectSalesPreviewResult,
  ProjectSalesProjectRow,
  ProjectSalesUnitRow,
  ProjectSalesValidationIssue,
} from './project-sales.types';

type SheetRow = unknown[];

type ExistingProject = {
  id: string;
  code: string | null;
};

type ExistingBlock = {
  id: string;
  projectId: string;
  normalizedCode: string;
};

type ExistingUnit = {
  id: string;
  projectId: string;
  inventoryCode: string | null;
};

@Injectable()
export class ProjectSalesService {
  private readonly supportedTemplateVersion = 'EPH-PROJE-SATIS-V4';
  private readonly requiredSheets = [
    'KULLANIM_REHBERI',
    'PROJE',
    'BLOKLAR',
    'BAGIMSIZ_BOLUMLER',
    'KURAL_URETIMI',
    'OZELLIK_PAKETLERI',
    'FOTOGRAF_PAKETLERI',
  ];
  private readonly allowedCurrencies = ['TRY', 'USD', 'EUR', 'GBP'];
  private readonly allowedExtensions = ['.xlsx', '.xls'];

  constructor(private readonly prisma: PrismaService) {}

  getImportConfig() {
    return {
      templateVersion: this.supportedTemplateVersion,
      maxFileSizeMb: 15,
      allowedExtensions: this.allowedExtensions,
      requiredSheets: this.requiredSheets,
      floorCodeExamples: ['B2', 'B1', 'Z', '1', '2', '3'],
    };
  }

  async previewExcel(
    userId: string,
    file: Express.Multer.File,
  ): Promise<ProjectSalesPreviewResult> {
    this.validateFile(file);

    let workbook: XLSX.WorkBook;

    try {
      workbook = XLSX.read(file.buffer, {
        type: 'buffer',
        cellDates: true,
        raw: true,
      });
    } catch {
      throw new BadRequestException('Excel dosyası okunamadı.');
    }

    this.ensureRequiredSheets(workbook);

    const issues: ProjectSalesValidationIssue[] = [];
    const templateVersion = this.readTemplateVersion(workbook);

    if (templateVersion !== this.supportedTemplateVersion) {
      issues.push({
        level: 'ERROR',
        sheet: 'KULLANIM_REHBERI',
        row: 5,
        column: 'B',
        code: 'UNSUPPORTED_TEMPLATE_VERSION',
        message: `Desteklenen şablon sürümü ${this.supportedTemplateVersion}.`,
        value: templateVersion,
      });
    }

    const featurePackages = this.parseFeaturePackages(workbook, issues);
    const photoPackages = this.parsePhotoPackages(workbook, issues);
    const projects = this.parseProjects(workbook, issues);
    const blocks = this.parseBlocks(workbook, issues);
    const units = this.parseUnits(
      workbook,
      featurePackages,
      photoPackages,
      issues,
    );

    const existing = await this.loadExistingData(
      userId,
      projects,
      blocks,
      units,
    );

    this.applyProjectChecks(projects, existing.projects, issues);
    this.applyBlockChecks(
      blocks,
      projects,
      existing.projects,
      existing.blocks,
      issues,
    );
    this.applyUnitChecks(
      units,
      projects,
      blocks,
      existing.projects,
      existing.blocks,
      existing.units,
      issues,
    );

    this.refreshValidity(projects);
    this.refreshValidity(blocks);
    this.refreshValidity(photoPackages);
    this.refreshValidity(units);

    const errorCount = issues.filter((item) => item.level === 'ERROR').length;
    const warningCount = issues.filter(
      (item) => item.level === 'WARNING',
    ).length;

    return {
      templateVersion,
      fileName: file.originalname,
      fileSize: file.size,
      valid: errorCount === 0,
      summary: {
        projectCount: projects.length,
        blockCount: blocks.length,
        unitCount: units.length,
        featurePackageCount: featurePackages.length,
        selectedFeatureCount: featurePackages.reduce(
          (total, item) => total + item.features.length,
          0,
        ),
        photoPackageCount: photoPackages.length,
        invalidPhotoPackageCount: photoPackages.filter(
          (item) => !item.valid,
        ).length,
        validUnitCount: units.filter(
          (item) => item.valid && item.action !== 'SKIP_DUPLICATE',
        ).length,
        invalidUnitCount: units.filter((item) => !item.valid).length,
        duplicateUnitCount: units.filter(
          (item) => item.action === 'SKIP_DUPLICATE',
        ).length,
        existingProjectCount: projects.filter(
          (item) => item.action === 'USE_EXISTING',
        ).length,
        existingBlockCount: blocks.filter(
          (item) => item.action === 'USE_EXISTING',
        ).length,
        errorCount,
        warningCount,
      },
      projects,
      blocks,
      units,
      featurePackages,
      photoPackages,
      issues,
    };
  }

  private validateFile(file: Express.Multer.File) {
    const lowerName = file.originalname.toLocaleLowerCase('tr-TR');
    const extension = this.allowedExtensions.find((item) =>
      lowerName.endsWith(item),
    );

    if (!extension) {
      throw new BadRequestException(
        'Yalnızca .xlsx veya .xls dosyaları yüklenebilir.',
      );
    }

    if (!file.buffer?.length) {
      throw new BadRequestException('Excel dosyası boş.');
    }
  }

  private ensureRequiredSheets(workbook: XLSX.WorkBook) {
    const missing = this.requiredSheets.filter(
      (name) => !workbook.SheetNames.includes(name),
    );

    if (missing.length > 0) {
      throw new BadRequestException(
        `Eksik Excel sayfaları: ${missing.join(', ')}`,
      );
    }
  }

  private readTemplateVersion(workbook: XLSX.WorkBook) {
    const rows = this.getSheetRows(workbook, 'KULLANIM_REHBERI');

    for (const row of rows) {
      if (this.normalizeKey(row[0]) === 'SABLON_SURUMU') {
        return this.text(row[1]);
      }
    }

    return '';
  }

  private parseFeaturePackages(
    workbook: XLSX.WorkBook,
    issues: ProjectSalesValidationIssue[],
  ): ProjectSalesFeaturePackage[] {
    const sheetName = 'OZELLIK_PAKETLERI';
    const rows = this.getSheetRows(workbook, sheetName);
    const headerIndex = this.findHeaderRowIndex(
      rows,
      ['OZELLIK_GRUBU', 'OZELLIK'],
      sheetName,
    );
    const header = rows[headerIndex] ?? [];
    const packageColumns: Array<{ index: number; code: string }> = [];
    const seenCodes = new Set<string>();

    for (let index = 2; index < header.length; index += 1) {
      const code = this.normalizeCode(header[index]);

      if (!code) {
        continue;
      }

      if (seenCodes.has(code)) {
        this.addIssue(issues, {
          level: 'ERROR',
          sheet: sheetName,
          row: 4,
          column: this.columnName(index),
          code: 'DUPLICATE_FEATURE_PACKAGE',
          message: 'Özellik paketi kodu tekrar ediyor.',
          value: code,
        });
        continue;
      }

      seenCodes.add(code);
      packageColumns.push({ index, code });
    }

    if (packageColumns.length === 0) {
      this.addIssue(issues, {
        level: 'ERROR',
        sheet: sheetName,
        row: 4,
        code: 'FEATURE_PACKAGE_NOT_FOUND',
        message: 'En az bir özellik paketi tanımlanmalıdır.',
      });
    }

    const packageMap = new Map<string, Set<string>>();

    for (const item of packageColumns) {
      packageMap.set(item.code, new Set<string>());
    }

    for (
      let rowIndex = headerIndex + 1;
      rowIndex < rows.length;
      rowIndex += 1
    ) {
      const row = rows[rowIndex];

      if (this.isBlankRow(row)) {
        continue;
      }

      const firstCell = this.normalizeKey(row[0]);
      const feature = this.text(row[1]);

      if (
        !feature ||
        firstCell === 'OZET' ||
        this.normalizeKey(feature) === 'SECILEN_OZELLIK_SAYISI'
      ) {
        continue;
      }

      for (const item of packageColumns) {
        if (this.isChecked(row[item.index])) {
          packageMap.get(item.code)?.add(feature);
        }
      }
    }

    return packageColumns.map((item) => ({
      code: item.code,
      features: Array.from(packageMap.get(item.code) ?? []),
    }));
  }


private parsePhotoPackages(
  workbook: XLSX.WorkBook,
  issues: ProjectSalesValidationIssue[],
): ProjectSalesPhotoPackage[] {
  const sheetName = 'FOTOGRAF_PAKETLERI';
  const rows = this.getSheetRows(workbook, sheetName);
  const headerIndex = this.findHeaderRowIndex(
    rows,
    ['PAKET_KODU', 'PAKET_ADI', 'PAKET_TURU', 'ZIP_KLASORU'],
    sheetName,
  );
  const headers = this.headerMap(rows[headerIndex] ?? []);
  const result: ProjectSalesPhotoPackage[] = [];

  for (
    let rowIndex = headerIndex + 1;
    rowIndex < rows.length;
    rowIndex += 1
  ) {
    const row = rows[rowIndex];

    if (this.isBlankRow(row)) {
      continue;
    }

    const sourceRow = rowIndex + 1;
    const rowIssues: ProjectSalesValidationIssue[] = [];
    const code = this.normalizeCode(
      this.value(row, headers, 'PAKET_KODU'),
    );
    const name = this.text(
      this.value(row, headers, 'PAKET_ADI'),
    );
    const type = this.enumValue(
      ProjectMediaPackageType,
      this.value(row, headers, 'PAKET_TURU'),
    );
    const rawUnitType = this.text(
      this.value(row, headers, 'PORTFOY_TIPI'),
    );
    const unitType = rawUnitType
      ? this.enumValue(
          UnitType,
          this.value(row, headers, 'PORTFOY_TIPI'),
        )
      : null;
    const roomCount =
      this.text(
        this.value(row, headers, 'ODA_KONSEPT'),
      ) || null;
    const zipFolder = this.text(
      this.value(row, headers, 'ZIP_KLASORU'),
    );
    const isDefault = this.booleanValue(
      this.value(row, headers, 'VARSAYILAN'),
      false,
    );
    const isActive = this.booleanValue(
      this.value(row, headers, 'AKTIF'),
      true,
    );
    const sortOrder =
      this.optionalInteger(
        this.value(row, headers, 'SIRA'),
      ) ?? 0;
    const description =
      this.text(
        this.value(row, headers, 'ACIKLAMA'),
      ) || null;

    this.requireValue(
      rowIssues,
      sheetName,
      sourceRow,
      'A',
      'PHOTO_PACKAGE_CODE_REQUIRED',
      'Paket Kodu zorunludur.',
      code,
    );
    this.requireValue(
      rowIssues,
      sheetName,
      sourceRow,
      'B',
      'PHOTO_PACKAGE_NAME_REQUIRED',
      'Paket Adı zorunludur.',
      name,
    );

    if (!type) {
      rowIssues.push({
        level: 'ERROR',
        sheet: sheetName,
        row: sourceRow,
        column: 'C',
        code: 'INVALID_PHOTO_PACKAGE_TYPE',
        message: 'Paket Türü geçerli bir EPH değeri olmalıdır.',
        value: this.value(row, headers, 'PAKET_TURU'),
      });
    }

    if (rawUnitType && !unitType) {
      rowIssues.push({
        level: 'ERROR',
        sheet: sheetName,
        row: sourceRow,
        column: 'D',
        code: 'INVALID_PHOTO_PACKAGE_UNIT_TYPE',
        message: 'Portföy Tipi geçerli bir EPH UnitType değeri olmalıdır.',
        value: rawUnitType,
      });
    }

    if (
      code &&
      !/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(code)
    ) {
      rowIssues.push({
        level: 'ERROR',
        sheet: sheetName,
        row: sourceRow,
        column: 'A',
        code: 'INVALID_PHOTO_PACKAGE_CODE',
        message:
          'Paket Kodu yalnız büyük harf, rakam ve tire içerebilir.',
        value: code,
      });
    }

    const expectedZipFolder = this.slugifyCode(code);

    if (!zipFolder) {
      rowIssues.push({
        level: 'ERROR',
        sheet: sheetName,
        row: sourceRow,
        column: 'F',
        code: 'PHOTO_PACKAGE_ZIP_FOLDER_REQUIRED',
        message: 'ZIP Klasörü zorunludur.',
      });
    } else if (
      this.slugifyCode(zipFolder) !== expectedZipFolder
    ) {
      rowIssues.push({
        level: 'ERROR',
        sheet: sheetName,
        row: sourceRow,
        column: 'F',
        code: 'PHOTO_PACKAGE_FOLDER_MISMATCH',
        message:
          'ZIP Klasörü, Paket Kodunun küçük harfli karşılığı olmalıdır.',
        value: zipFolder,
      });
    }

    if (sortOrder < 0) {
      rowIssues.push({
        level: 'ERROR',
        sheet: sheetName,
        row: sourceRow,
        column: 'I',
        code: 'INVALID_PHOTO_PACKAGE_SORT_ORDER',
        message: 'Sıra değeri negatif olamaz.',
        value: sortOrder,
      });
    }

    issues.push(...rowIssues);
    result.push({
      sourceRow,
      code,
      name,
      type,
      unitType,
      roomCount,
      zipFolder,
      isDefault,
      isActive,
      sortOrder,
      description,
      valid: !this.hasError(rowIssues),
      issues: rowIssues,
    });
  }

  this.markDuplicates(
    result,
    (item) => item.code,
    sheetName,
    'DUPLICATE_PHOTO_PACKAGE_CODE',
    'Fotoğraf Paket Kodu tekrar ediyor.',
    issues,
  );

  this.markDuplicates(
    result,
    (item) => this.slugifyCode(item.zipFolder),
    sheetName,
    'DUPLICATE_PHOTO_PACKAGE_FOLDER',
    'ZIP Klasörü tekrar ediyor.',
    issues,
  );

  const activeGeneralPackages = result.filter(
    (item) =>
      item.isActive &&
      item.type ===
        ProjectMediaPackageType.PROJECT_GENERAL,
  );
  const defaultGeneralPackages = activeGeneralPackages.filter(
    (item) => item.isDefault,
  );

  if (activeGeneralPackages.length === 0) {
    const issue: ProjectSalesValidationIssue = {
      level: 'ERROR',
      sheet: sheetName,
      row: headerIndex + 1,
      code: 'GENERAL_PHOTO_PACKAGE_REQUIRED',
      message:
        'En az bir aktif PROJECT_GENERAL fotoğraf paketi tanımlanmalıdır.',
    };
    issues.push(issue);
  }

  if (defaultGeneralPackages.length !== 1) {
    const issue: ProjectSalesValidationIssue = {
      level: 'ERROR',
      sheet: sheetName,
      row:
        defaultGeneralPackages[0]?.sourceRow ??
        activeGeneralPackages[0]?.sourceRow ??
        headerIndex + 1,
      code: 'DEFAULT_GENERAL_PHOTO_PACKAGE_REQUIRED',
      message:
        'Tam olarak bir PROJECT_GENERAL paketi Varsayılan=EVET olmalıdır.',
      value: defaultGeneralPackages.length,
    };
    issues.push(issue);

    for (const item of defaultGeneralPackages) {
      item.issues.push(issue);
    }
  }

  return result;
}
  private parseProjects(
    workbook: XLSX.WorkBook,
    issues: ProjectSalesValidationIssue[],
  ): ProjectSalesProjectRow[] {
    const sheetName = 'PROJE';
    const rows = this.getSheetRows(workbook, sheetName);
    const headerIndex = this.findHeaderRowIndex(
      rows,
      ['PROJE_KODU', 'PROJE_ADI'],
      sheetName,
    );
    const headers = this.headerMap(rows[headerIndex] ?? []);
    const result: ProjectSalesProjectRow[] = [];

    for (
      let rowIndex = headerIndex + 1;
      rowIndex < rows.length;
      rowIndex += 1
    ) {
      const row = rows[rowIndex];

      if (this.isBlankRow(row)) {
        continue;
      }

      const rowIssues: ProjectSalesValidationIssue[] = [];
      const projectCode = this.normalizeCode(
        this.value(row, headers, 'PROJE_KODU'),
      );
      const name = this.text(this.value(row, headers, 'PROJE_ADI'));
      const city = this.text(this.value(row, headers, 'IL'));
      const district = this.text(this.value(row, headers, 'ILCE'));
      const address = this.text(this.value(row, headers, 'MAHALLE'));
      const completionPercent = this.optionalNumber(
        this.value(row, headers, 'TAMAMLANMA'),
      );
      const defaultDeliveryDate = this.optionalDate(
        this.value(row, headers, 'VARSAYILAN_TESLIM_TARIHI'),
      );
      const isActive = this.booleanValue(
        this.value(row, headers, 'AKTIF'),
        true,
      );
      const description =
        this.text(this.value(row, headers, 'ACIKLAMA')) || null;
      const sourceRow = rowIndex + 1;

      this.requireValue(
        rowIssues,
        sheetName,
        sourceRow,
        'A',
        'PROJECT_CODE_REQUIRED',
        'Proje Kodu zorunludur.',
        projectCode,
      );
      this.requireValue(
        rowIssues,
        sheetName,
        sourceRow,
        'B',
        'PROJECT_NAME_REQUIRED',
        'Proje Adı zorunludur.',
        name,
      );
      this.requireValue(
        rowIssues,
        sheetName,
        sourceRow,
        'C',
        'CITY_REQUIRED',
        'İl zorunludur.',
        city,
      );
      this.requireValue(
        rowIssues,
        sheetName,
        sourceRow,
        'D',
        'DISTRICT_REQUIRED',
        'İlçe zorunludur.',
        district,
      );
      this.requireValue(
        rowIssues,
        sheetName,
        sourceRow,
        'E',
        'ADDRESS_REQUIRED',
        'Mahalle zorunludur.',
        address,
      );

      if (
        completionPercent !== null &&
        (completionPercent < 0 || completionPercent > 100)
      ) {
        rowIssues.push({
          level: 'ERROR',
          sheet: sheetName,
          row: sourceRow,
          column: 'F',
          code: 'INVALID_COMPLETION_PERCENT',
          message: 'Tamamlanma yüzdesi 0 ile 100 arasında olmalıdır.',
          value: completionPercent,
        });
      }

      issues.push(...rowIssues);
      result.push({
        sourceRow,
        projectCode,
        name,
        city,
        district,
        address,
        completionPercent,
        defaultDeliveryDate,
        isActive,
        description,
        action: 'CREATE',
        existingProjectId: null,
        valid: !this.hasError(rowIssues),
        issues: rowIssues,
      });
    }

    this.markDuplicates(
      result,
      (item) => item.projectCode,
      sheetName,
      'DUPLICATE_PROJECT_CODE',
      'Proje Kodu dosya içinde tekrar ediyor.',
      issues,
    );

    return result;
  }

  private parseBlocks(
    workbook: XLSX.WorkBook,
    issues: ProjectSalesValidationIssue[],
  ): ProjectSalesBlockRow[] {
    const sheetName = 'BLOKLAR';
    const rows = this.getSheetRows(workbook, sheetName);
    const headerIndex = this.findHeaderRowIndex(
      rows,
      ['PROJE_KODU', 'BLOK_KODU'],
      sheetName,
    );
    const headers = this.headerMap(rows[headerIndex] ?? []);
    const result: ProjectSalesBlockRow[] = [];

    for (
      let rowIndex = headerIndex + 1;
      rowIndex < rows.length;
      rowIndex += 1
    ) {
      const row = rows[rowIndex];

      if (this.isBlankRow(row)) {
        continue;
      }

      const rowIssues: ProjectSalesValidationIssue[] = [];
      const projectCode = this.normalizeCode(
        this.value(row, headers, 'PROJE_KODU'),
      );
      const blockCode = this.text(this.value(row, headers, 'BLOK_KODU'));
      const normalizedBlockCode = this.normalizeCode(blockCode);
      const name =
        this.text(this.value(row, headers, 'BLOK_ADI')) || null;
      const sortOrder =
        this.optionalInteger(this.value(row, headers, 'SIRA')) ?? 0;
      const isActive = this.booleanValue(
        this.value(row, headers, 'AKTIF'),
        true,
      );
      const description =
        this.text(this.value(row, headers, 'ACIKLAMA')) || null;
      const sourceRow = rowIndex + 1;

      this.requireValue(
        rowIssues,
        sheetName,
        sourceRow,
        'A',
        'PROJECT_CODE_REQUIRED',
        'Proje Kodu zorunludur.',
        projectCode,
      );
      this.requireValue(
        rowIssues,
        sheetName,
        sourceRow,
        'B',
        'BLOCK_CODE_REQUIRED',
        'Blok Kodu zorunludur.',
        normalizedBlockCode,
      );

      issues.push(...rowIssues);
      result.push({
        sourceRow,
        projectCode,
        blockCode,
        normalizedBlockCode,
        name,
        sortOrder,
        isActive,
        description,
        action: 'CREATE',
        existingBlockId: null,
        valid: !this.hasError(rowIssues),
        issues: rowIssues,
      });
    }

    this.markDuplicates(
      result,
      (item) => `${item.projectCode}|${item.normalizedBlockCode}`,
      sheetName,
      'DUPLICATE_BLOCK_CODE',
      'Aynı proje içinde Blok Kodu tekrar ediyor.',
      issues,
    );

    return result;
  }

  private parseUnits(
    workbook: XLSX.WorkBook,
    featurePackages: ProjectSalesFeaturePackage[],
    photoPackages: ProjectSalesPhotoPackage[],
    issues: ProjectSalesValidationIssue[],
  ): ProjectSalesUnitRow[] {
    const sheetName = 'BAGIMSIZ_BOLUMLER';
    const rows = this.getSheetRows(workbook, sheetName);
    const headerIndex = this.findHeaderRowIndex(
      rows,
      ['PROJE_KODU', 'BLOK_KODU', 'KAT_KODU', 'DAIRE_NO'],
      sheetName,
    );
    const headers = this.headerMap(rows[headerIndex] ?? []);
    const packageMap = new Map(
      featurePackages.map((item) => [item.code, item.features]),
    );
    const photoPackageMap = new Map(
      photoPackages.map((item) => [item.code, item]),
    );
    const result: ProjectSalesUnitRow[] = [];

    for (
      let rowIndex = headerIndex + 1;
      rowIndex < rows.length;
      rowIndex += 1
    ) {
      const row = rows[rowIndex];

      if (this.isBlankRow(row)) {
        continue;
      }

      const sourceRow = rowIndex + 1;
      const rowIssues: ProjectSalesValidationIssue[] = [];
      const projectCode = this.normalizeCode(
        this.value(row, headers, 'PROJE_KODU'),
      );
      const blockCode = this.text(this.value(row, headers, 'BLOK_KODU'));
      const normalizedBlockCode = this.normalizeCode(blockCode);
      const floorCode = this.text(this.value(row, headers, 'KAT_KODU'));
      const floorLabel = this.text(
        this.value(row, headers, 'KAT_ETIKETI'),
      );
      const floor = this.parseFloor(
        floorCode,
        floorLabel,
        sheetName,
        sourceRow,
        rowIssues,
      );
      const number = this.text(this.value(row, headers, 'DAIRE_NO'));
      const externalRef =
        this.text(this.value(row, headers, 'HARICI_KOD')) || null;
      const type = this.enumValue(
        UnitType,
        this.value(row, headers, 'PORTFOY_TIPI'),
      );
      const roomCount =
        this.text(this.value(row, headers, 'ODA_TIPI')) || null;
      const netArea = this.optionalNumber(
        this.value(row, headers, 'NET_M2'),
      );
      const grossArea = this.optionalNumber(
        this.value(row, headers, 'BRUT_M2'),
      );
      const price = this.optionalNumber(
        this.value(row, headers, 'FIYAT'),
      );
      const priceCurrency =
        this.normalizeCode(
          this.value(row, headers, 'PARA_BIRIMI'),
        ) || 'TRY';
      const status = this.enumValue(
        UnitStatus,
        this.value(row, headers, 'DURUM'),
      );
      const facades = this.listValue(
        this.value(row, headers, 'CEPHELER'),
      );
      const deliveryDate = this.optionalDate(
        this.value(row, headers, 'TESLIM_TARIHI'),
      );
      const featurePackageCode =
        this.normalizeCode(
          this.value(row, headers, 'OZELLIK_PAKETI'),
        ) || null;
      const photoPackageCode =
        this.normalizeCode(
          this.value(row, headers, 'FOTOGRAF_PAKETI'),
        ) || null;
      const salesRepresentativeEmail =
        this.text(
          this.value(row, headers, 'SATIS_TEMSILCISI_E_POSTA'),
        ) || null;
      const description =
        this.text(this.value(row, headers, 'ACIKLAMA')) || null;
      const inventoryCode = this.inventoryCode(
        normalizedBlockCode,
        floor.level,
        number,
      );

      this.requireValue(
        rowIssues,
        sheetName,
        sourceRow,
        'A',
        'PROJECT_CODE_REQUIRED',
        'Proje Kodu zorunludur.',
        projectCode,
      );
      this.requireValue(
        rowIssues,
        sheetName,
        sourceRow,
        'B',
        'BLOCK_CODE_REQUIRED',
        'Blok Kodu zorunludur.',
        normalizedBlockCode,
      );
      this.requireValue(
        rowIssues,
        sheetName,
        sourceRow,
        'C',
        'FLOOR_CODE_REQUIRED',
        'Kat Kodu zorunludur.',
        floorCode,
      );
      this.requireValue(
        rowIssues,
        sheetName,
        sourceRow,
        'D',
        'FLOOR_LABEL_REQUIRED',
        'Kat Etiketi zorunludur.',
        floorLabel,
      );
      this.requireValue(
        rowIssues,
        sheetName,
        sourceRow,
        'E',
        'UNIT_NUMBER_REQUIRED',
        'Daire No zorunludur.',
        number,
      );

      if (!type) {
        rowIssues.push({
          level: 'ERROR',
          sheet: sheetName,
          row: sourceRow,
          column: 'G',
          code: 'INVALID_UNIT_TYPE',
          message: 'Portföy Tipi geçerli bir EPH değeri olmalıdır.',
          value: this.value(row, headers, 'PORTFOY_TIPI'),
        });
      }

      if (price === null || price <= 0) {
        rowIssues.push({
          level: 'ERROR',
          sheet: sheetName,
          row: sourceRow,
          column: 'K',
          code: 'INVALID_PRICE',
          message: 'Fiyat sıfırdan büyük olmalıdır.',
          value: this.value(row, headers, 'FIYAT'),
        });
      }

      if (!this.allowedCurrencies.includes(priceCurrency)) {
        rowIssues.push({
          level: 'ERROR',
          sheet: sheetName,
          row: sourceRow,
          column: 'L',
          code: 'INVALID_CURRENCY',
          message: 'Para Birimi TRY, USD, EUR veya GBP olmalıdır.',
          value: priceCurrency,
        });
      }

      if (!status) {
        rowIssues.push({
          level: 'ERROR',
          sheet: sheetName,
          row: sourceRow,
          column: 'M',
          code: 'INVALID_UNIT_STATUS',
          message: 'Durum geçerli bir EPH UnitStatus değeri olmalıdır.',
          value: this.value(row, headers, 'DURUM'),
        });
      }

      if (netArea !== null && netArea <= 0) {
        rowIssues.push({
          level: 'ERROR',
          sheet: sheetName,
          row: sourceRow,
          column: 'I',
          code: 'INVALID_NET_AREA',
          message: 'Net m² sıfırdan büyük olmalıdır.',
          value: netArea,
        });
      }

      if (grossArea !== null && grossArea <= 0) {
        rowIssues.push({
          level: 'ERROR',
          sheet: sheetName,
          row: sourceRow,
          column: 'J',
          code: 'INVALID_GROSS_AREA',
          message: 'Brüt m² sıfırdan büyük olmalıdır.',
          value: grossArea,
        });
      }

      if (
        netArea !== null &&
        grossArea !== null &&
        grossArea < netArea
      ) {
        rowIssues.push({
          level: 'WARNING',
          sheet: sheetName,
          row: sourceRow,
          column: 'J',
          code: 'GROSS_AREA_SMALLER_THAN_NET',
          message: 'Brüt m², net m² değerinden küçük görünüyor.',
          value: grossArea,
        });
      }

      if (
        featurePackageCode &&
        !packageMap.has(featurePackageCode)
      ) {
        rowIssues.push({
          level: 'ERROR',
          sheet: sheetName,
          row: sourceRow,
          column: 'P',
          code: 'FEATURE_PACKAGE_NOT_FOUND',
          message: 'Seçilen özellik paketi bulunamadı.',
          value: featurePackageCode,
        });
      }

      if (
        photoPackageCode &&
        !photoPackageMap.has(photoPackageCode)
      ) {
        rowIssues.push({
          level: 'ERROR',
          sheet: sheetName,
          row: sourceRow,
          column: 'S',
          code: 'PHOTO_PACKAGE_NOT_FOUND',
          message: 'Seçilen fotoğraf paketi bulunamadı.',
          value: photoPackageCode,
        });
      }

      const selectedPhotoPackage = photoPackageCode
        ? photoPackageMap.get(photoPackageCode)
        : null;

      if (
        selectedPhotoPackage?.unitType &&
        type &&
        selectedPhotoPackage.unitType !== type
      ) {
        rowIssues.push({
          level: 'ERROR',
          sheet: sheetName,
          row: sourceRow,
          column: 'S',
          code: 'PHOTO_PACKAGE_UNIT_TYPE_MISMATCH',
          message:
            'Fotoğraf paketinin Portföy Tipi, bağımsız bölümün Portföy Tipi ile uyuşmuyor.',
          value: photoPackageCode,
        });
      }

      if (
        salesRepresentativeEmail &&
        !this.isEmail(salesRepresentativeEmail)
      ) {
        rowIssues.push({
          level: 'ERROR',
          sheet: sheetName,
          row: sourceRow,
          column: 'Q',
          code: 'INVALID_SALES_REPRESENTATIVE_EMAIL',
          message: 'Satış temsilcisi e-posta adresi geçersiz.',
          value: salesRepresentativeEmail,
        });
      }

      issues.push(...rowIssues);
      result.push({
        sourceRow,
        projectCode,
        blockCode,
        normalizedBlockCode,
        floor,
        number,
        inventoryCode,
        externalRef,
        type,
        roomCount,
        netArea,
        grossArea,
        price,
        priceCurrency,
        status,
        facades,
        deliveryDate,
        featurePackageCode,
        photoPackageCode,
        features: featurePackageCode
          ? packageMap.get(featurePackageCode) ?? []
          : [],
        salesRepresentativeEmail,
        description,
        action: 'CREATE',
        existingUnitId: null,
        valid: !this.hasError(rowIssues),
        issues: rowIssues,
      });
    }

    this.markDuplicates(
      result,
      (item) => `${item.projectCode}|${item.inventoryCode}`,
      sheetName,
      'DUPLICATE_UNIT',
      'Proje + Blok + Kat + Daire No kombinasyonu tekrar ediyor.',
      issues,
    );

    this.markDuplicates(
      result.filter((item) => Boolean(item.externalRef)),
      (item) => `${item.projectCode}|${item.externalRef}`,
      sheetName,
      'DUPLICATE_EXTERNAL_REF',
      'Aynı proje içinde Harici Kod tekrar ediyor.',
      issues,
    );

    return result;
  }

  private async loadExistingData(
    userId: string,
    projects: ProjectSalesProjectRow[],
    blocks: ProjectSalesBlockRow[],
    units: ProjectSalesUnitRow[],
  ) {
    const projectCodes = Array.from(
      new Set(
        [
          ...projects.map((item) => item.projectCode),
          ...blocks.map((item) => item.projectCode),
          ...units.map((item) => item.projectCode),
        ].filter(Boolean),
      ),
    );

    const existingProjects = projectCodes.length
      ? await this.prisma.project.findMany({
          where: {
            ownerId: userId,
            code: { in: projectCodes },
          },
          select: {
            id: true,
            code: true,
          },
        })
      : [];

    const projectIds = existingProjects.map((item) => item.id);

    const existingBlocks = projectIds.length
      ? await this.prisma.projectBlock.findMany({
          where: {
            projectId: { in: projectIds },
          },
          select: {
            id: true,
            projectId: true,
            normalizedCode: true,
          },
        })
      : [];

    const inventoryCodes = Array.from(
      new Set(units.map((item) => item.inventoryCode).filter(Boolean)),
    );

    const existingUnits =
      projectIds.length && inventoryCodes.length
        ? await this.prisma.unit.findMany({
            where: {
              projectId: { in: projectIds },
              inventoryCode: { in: inventoryCodes },
            },
            select: {
              id: true,
              projectId: true,
              inventoryCode: true,
            },
          })
        : [];

    return {
      projects: existingProjects as ExistingProject[],
      blocks: existingBlocks as ExistingBlock[],
      units: existingUnits as ExistingUnit[],
    };
  }

  private applyProjectChecks(
    projects: ProjectSalesProjectRow[],
    existingProjects: ExistingProject[],
    issues: ProjectSalesValidationIssue[],
  ) {
    const existingMap = new Map(
      existingProjects
        .filter((item) => item.code)
        .map((item) => [this.normalizeCode(item.code), item]),
    );

    for (const project of projects) {
      const existing = existingMap.get(project.projectCode);

      if (!existing) {
        continue;
      }

      project.action = 'USE_EXISTING';
      project.existingProjectId = existing.id;

      this.attachIssue(project, issues, {
        level: 'WARNING',
        sheet: 'PROJE',
        row: project.sourceRow,
        column: 'A',
        code: 'PROJECT_ALREADY_EXISTS',
        message: 'Proje Kodu mevcut projeyle eşleşti; mevcut proje kullanılacak.',
        value: project.projectCode,
      });
    }
  }

  private applyBlockChecks(
    blocks: ProjectSalesBlockRow[],
    projects: ProjectSalesProjectRow[],
    existingProjects: ExistingProject[],
    existingBlocks: ExistingBlock[],
    issues: ProjectSalesValidationIssue[],
  ) {
    const workbookProjectCodes = new Set(
      projects.map((item) => item.projectCode),
    );
    const existingProjectMap = new Map(
      existingProjects
        .filter((item) => item.code)
        .map((item) => [this.normalizeCode(item.code), item.id]),
    );
    const existingBlockMap = new Map(
      existingBlocks.map((item) => [
        `${item.projectId}|${item.normalizedCode}`,
        item,
      ]),
    );

    for (const block of blocks) {
      const projectExistsInWorkbook = workbookProjectCodes.has(
        block.projectCode,
      );
      const existingProjectId = existingProjectMap.get(
        block.projectCode,
      );

      if (!projectExistsInWorkbook && !existingProjectId) {
        this.attachIssue(block, issues, {
          level: 'ERROR',
          sheet: 'BLOKLAR',
          row: block.sourceRow,
          column: 'A',
          code: 'PROJECT_REFERENCE_NOT_FOUND',
          message: 'Blok satırındaki Proje Kodu bulunamadı.',
          value: block.projectCode,
        });
        continue;
      }

      if (!existingProjectId) {
        continue;
      }

      const existingBlock = existingBlockMap.get(
        `${existingProjectId}|${block.normalizedBlockCode}`,
      );

      if (!existingBlock) {
        continue;
      }

      block.action = 'USE_EXISTING';
      block.existingBlockId = existingBlock.id;

      this.attachIssue(block, issues, {
        level: 'WARNING',
        sheet: 'BLOKLAR',
        row: block.sourceRow,
        column: 'B',
        code: 'BLOCK_ALREADY_EXISTS',
        message: 'Blok Kodu mevcut blokla eşleşti; mevcut blok kullanılacak.',
        value: block.blockCode,
      });
    }
  }

  private applyUnitChecks(
    units: ProjectSalesUnitRow[],
    projects: ProjectSalesProjectRow[],
    blocks: ProjectSalesBlockRow[],
    existingProjects: ExistingProject[],
    existingBlocks: ExistingBlock[],
    existingUnits: ExistingUnit[],
    issues: ProjectSalesValidationIssue[],
  ) {
    const workbookProjectCodes = new Set(
      projects.map((item) => item.projectCode),
    );
    const workbookBlockKeys = new Set(
      blocks.map(
        (item) => `${item.projectCode}|${item.normalizedBlockCode}`,
      ),
    );
    const existingProjectMap = new Map(
      existingProjects
        .filter((item) => item.code)
        .map((item) => [this.normalizeCode(item.code), item.id]),
    );
    const existingBlockKeys = new Set(
      existingBlocks.map(
        (item) => `${item.projectId}|${item.normalizedCode}`,
      ),
    );
    const existingUnitMap = new Map(
      existingUnits
        .filter((item) => item.inventoryCode)
        .map((item) => [
          `${item.projectId}|${item.inventoryCode}`,
          item,
        ]),
    );

    for (const unit of units) {
      const projectExistsInWorkbook = workbookProjectCodes.has(
        unit.projectCode,
      );
      const existingProjectId = existingProjectMap.get(
        unit.projectCode,
      );

      if (!projectExistsInWorkbook && !existingProjectId) {
        this.attachIssue(unit, issues, {
          level: 'ERROR',
          sheet: 'BAGIMSIZ_BOLUMLER',
          row: unit.sourceRow,
          column: 'A',
          code: 'PROJECT_REFERENCE_NOT_FOUND',
          message: 'Bağımsız bölümün Proje Kodu bulunamadı.',
          value: unit.projectCode,
        });
        continue;
      }

      const workbookBlockKey =
        `${unit.projectCode}|${unit.normalizedBlockCode}`;
      const blockExistsInWorkbook =
        workbookBlockKeys.has(workbookBlockKey);
      const blockExistsInDatabase =
        existingProjectId &&
        existingBlockKeys.has(
          `${existingProjectId}|${unit.normalizedBlockCode}`,
        );

      if (!blockExistsInWorkbook && !blockExistsInDatabase) {
        this.attachIssue(unit, issues, {
          level: 'ERROR',
          sheet: 'BAGIMSIZ_BOLUMLER',
          row: unit.sourceRow,
          column: 'B',
          code: 'BLOCK_REFERENCE_NOT_FOUND',
          message: 'Bağımsız bölümün Blok Kodu bulunamadı.',
          value: unit.blockCode,
        });
      }

      if (!existingProjectId) {
        continue;
      }

      const existingUnit = existingUnitMap.get(
        `${existingProjectId}|${unit.inventoryCode}`,
      );

      if (!existingUnit) {
        continue;
      }

      unit.action = 'SKIP_DUPLICATE';
      unit.existingUnitId = existingUnit.id;

      this.attachIssue(unit, issues, {
        level: 'WARNING',
        sheet: 'BAGIMSIZ_BOLUMLER',
        row: unit.sourceRow,
        column: 'E',
        code: 'UNIT_ALREADY_EXISTS',
        message: 'Bağımsız bölüm daha önce kaydedilmiş; tekrar oluşturulmayacak.',
        value: unit.inventoryCode,
      });
    }
  }

  private parseFloor(
    rawCode: unknown,
    rawLabel: unknown,
    sheet: string,
    row: number,
    issues: ProjectSalesValidationIssue[],
  ): ProjectSalesFloorValue {
    const code = this.text(rawCode).toLocaleUpperCase('tr-TR');
    const suppliedLabel = this.text(rawLabel);

    if (code === 'Z') {
      return {
        code,
        level: 0,
        label: suppliedLabel || 'Zemin',
        floorType: ProjectFloorType.ZEMIN,
      };
    }

    const basementMatch = code.match(/^B([1-9][0-9]?)$/);

    if (basementMatch) {
      const basement = Number(basementMatch[1]);

      return {
        code,
        level: -basement,
        label: suppliedLabel || `${basement}. Bodrum`,
        floorType: ProjectFloorType.BODRUM,
      };
    }

    if (/^[1-9][0-9]{0,2}$/.test(code)) {
      const level = Number(code);

      return {
        code,
        level,
        label: suppliedLabel || `${level}. Kat`,
        floorType: ProjectFloorType.NORMAL,
      };
    }

    issues.push({
      level: 'ERROR',
      sheet,
      row,
      column: 'C',
      code: 'INVALID_FLOOR_CODE',
      message: 'Kat Kodu B1, B2, Z, 1, 2 biçiminde olmalıdır.',
      value: rawCode,
    });

    return {
      code,
      level: 0,
      label: suppliedLabel || '',
      floorType: ProjectFloorType.DIGER,
    };
  }

  private getSheetRows(
    workbook: XLSX.WorkBook,
    sheetName: string,
  ): SheetRow[] {
    const sheet = workbook.Sheets[sheetName];

    return XLSX.utils.sheet_to_json<SheetRow>(sheet, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: true,
    });
  }

  private findHeaderRowIndex(
    rows: SheetRow[],
    requiredKeys: string[],
    sheetName: string,
  ) {
    const index = rows.findIndex((row) => {
      const keys = new Set(row.map((value) => this.normalizeKey(value)));
      return requiredKeys.every((key) => keys.has(key));
    });

    if (index === -1) {
      throw new BadRequestException(
        `${sheetName} sayfasında beklenen sütun başlıkları bulunamadı: ${requiredKeys.join(', ')}`,
      );
    }

    return index;
  }

  private headerMap(headerRow: SheetRow) {
    const result = new Map<string, number>();

    headerRow.forEach((value, index) => {
      const key = this.normalizeKey(value);

      if (key) {
        result.set(key, index);
      }
    });

    return result;
  }

  private value(
    row: SheetRow,
    headers: Map<string, number>,
    key: string,
  ) {
    const index = headers.get(key);
    return index === undefined ? null : row[index];
  }

  private normalizeKey(value: unknown) {
    return this.text(value)
      .replace(/\*/g, '')
      .toLocaleUpperCase('tr-TR')
      .replace(/Ç/g, 'C')
      .replace(/Ğ/g, 'G')
      .replace(/İ/g, 'I')
      .replace(/Ö/g, 'O')
      .replace(/Ş/g, 'S')
      .replace(/Ü/g, 'U')
      .replace(/²/g, '2')
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private normalizeCode(value: unknown) {
    return this.normalizeKey(value).replace(/_+/g, '-');
  }

  private slugifyCode(value: unknown) {
    return this.text(value)
      .toLocaleLowerCase('tr-TR')
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u')
      .replace(/\+/g, '-')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private text(value: unknown) {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value).trim();
  }

  private optionalNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    const raw = this.text(value).replace(/\s/g, '');
    const normalized = raw.includes(',')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private optionalInteger(value: unknown): number | null {
    const number = this.optionalNumber(value);

    if (number === null || !Number.isInteger(number)) {
      return null;
    }

    return number;
  }

  private optionalDate(value: unknown): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString();
    }

    if (typeof value === 'number') {
      const parsed = XLSX.SSF.parse_date_code(value);

      if (parsed) {
        return new Date(
          Date.UTC(parsed.y, parsed.m - 1, parsed.d),
        ).toISOString();
      }
    }

    const text = this.text(value);
    const trMatch = text.match(
      /^([0-3]?\d)[./-]([01]?\d)[./-](\d{4})$/,
    );

    if (trMatch) {
      const date = new Date(
        Date.UTC(
          Number(trMatch[3]),
          Number(trMatch[2]) - 1,
          Number(trMatch[1]),
        ),
      );

      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }

    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private booleanValue(value: unknown, defaultValue: boolean) {
    const normalized = this.normalizeKey(value);

    if (!normalized) {
      return defaultValue;
    }

    return ['EVET', 'TRUE', '1', 'AKTIF'].includes(normalized);
  }

  private listValue(value: unknown) {
    return Array.from(
      new Set(
        this.text(value)
          .split(/[;,]/)
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
  }

  private enumValue<T extends Record<string, string>>(
    enumObject: T,
    value: unknown,
  ): T[keyof T] | null {
    const normalized = this.normalizeKey(value);
    const values = Object.values(enumObject) as string[];
    const matched = values.find(
      (item) => this.normalizeKey(item) === normalized,
    );

    return (matched as T[keyof T]) ?? null;
  }

  private isChecked(value: unknown) {
    const normalized = this.normalizeKey(value);

    return [
      'X',
      'EVET',
      'TRUE',
      '1',
    ].includes(normalized) || this.text(value) === '☑';
  }

  private isBlankRow(row: SheetRow) {
    return row.every(
      (value) =>
        value === null ||
        value === undefined ||
        this.text(value) === '',
    );
  }

  private inventoryCode(
    normalizedBlockCode: string,
    floorLevel: number,
    number: string,
  ) {
    const normalizedNumber = this.normalizeCode(number);
    return `${normalizedBlockCode}|${floorLevel}|${normalizedNumber}`;
  }

  private requireValue(
    issues: ProjectSalesValidationIssue[],
    sheet: string,
    row: number,
    column: string,
    code: string,
    message: string,
    value: unknown,
  ) {
    if (this.text(value)) {
      return;
    }

    issues.push({
      level: 'ERROR',
      sheet,
      row,
      column,
      code,
      message,
      value,
    });
  }

  private markDuplicates<T extends {
    sourceRow: number;
    issues: ProjectSalesValidationIssue[];
  }>(
    rows: T[],
    keyFactory: (row: T) => string,
    sheet: string,
    code: string,
    message: string,
    issues: ProjectSalesValidationIssue[],
  ) {
    const seen = new Map<string, T>();

    for (const row of rows) {
      const key = keyFactory(row);

      if (!key || key.includes('||')) {
        continue;
      }

      const first = seen.get(key);

      if (!first) {
        seen.set(key, row);
        continue;
      }

      const issue: ProjectSalesValidationIssue = {
        level: 'ERROR',
        sheet,
        row: row.sourceRow,
        code,
        message,
        value: key,
      };

      row.issues.push(issue);
      issues.push(issue);
    }
  }

  private attachIssue<
    T extends { issues: ProjectSalesValidationIssue[] },
  >(
    row: T,
    issues: ProjectSalesValidationIssue[],
    issue: ProjectSalesValidationIssue,
  ) {
    row.issues.push(issue);
    issues.push(issue);
  }

  private refreshValidity<
    T extends {
      valid: boolean;
      issues: ProjectSalesValidationIssue[];
    },
  >(rows: T[]) {
    for (const row of rows) {
      row.valid = !this.hasError(row.issues);
    }
  }

  private hasError(issues: ProjectSalesValidationIssue[]) {
    return issues.some((item) => item.level === 'ERROR');
  }

  private addIssue(
    issues: ProjectSalesValidationIssue[],
    issue: ProjectSalesValidationIssue,
  ) {
    issues.push(issue);
  }

  private isEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private columnName(index: number) {
    let number = index + 1;
    let result = '';

    while (number > 0) {
      const remainder = (number - 1) % 26;
      result = String.fromCharCode(65 + remainder) + result;
      number = Math.floor((number - 1) / 26);
    }

    return result;
  }
}
