import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

export type EphSchemaCatalogStatus =
  | "LINA_READY"
  | "MIGRATION_REQUIRED";

export type EphSchemaCatalogEntry = {
  id: string;
  version: number;
  entity: string;
  title: string;
  description: string;
  sourcePath: string;
  status: EphSchemaCatalogStatus;
  availableToLina: boolean;
  modes: string[];
  requiredFormFields: string[];
  conditionallyRequiredFields: string[];
  draftFieldKeys: string[];
  linaFieldKeys: string[];
  migrationReason?: string;
};

const FORUM_REQUEST_SCHEMA:
  EphSchemaCatalogEntry = {
  id: "eph.forum.request",
  version: 1,
  entity: "ForumRequest",
  title: "Talep Merkezi Kaydı",
  description:
    "Talep Merkezi kayıt girişi, filtreleme, detay görüntüleme ve Lina analizi için ortak alan sözlüğü.",
  sourcePath:
    "frontend/src/schemas/forum/forum-request.schema.ts",
  status: "MIGRATION_REQUIRED",
  availableToLina: false,
  modes: [
    "form",
    "filter",
    "detail",
    "lina",
  ],
  requiredFormFields: [
    "category",
    "requestIntent",
    "title",
    "description",
  ],
  conditionallyRequiredFields: [
    "propertyType",
  ],
  draftFieldKeys: [
    "category",
    "requestIntent",
    "propertyType",
    "title",
    "areas",
    "city",
    "district",
    "neighborhood",
    "minArea",
    "maxArea",
    "minRoom",
    "maxRoom",
    "minBudget",
    "maxBudget",
    "budget",
    "currency",
    "urgency",
    "validFor",
    "visibility",
    "description",
  ],
  linaFieldKeys: [
    "category",
    "requestIntent",
    "propertyType",
    "title",
    "city",
    "district",
    "neighborhood",
    "budget",
    "currency",
    "urgency",
    "validFor",
    "visibility",
    "description",
  ],
  migrationReason:
    "Mevcut şema frontend React tipleri, fonksiyon tabanlı görünürlük ve doğrulama kuralları içeriyor. Framework bağımsız ortak sözleşmeye taşınmadan backend OpenAI aracı olarak kullanılamaz.",
};

@Injectable()
export class EphSchemaCatalogService {
  private readonly schemas =
    new Map<
      string,
      EphSchemaCatalogEntry
    >([
      [
        FORUM_REQUEST_SCHEMA.id,
        FORUM_REQUEST_SCHEMA,
      ],
    ]);

  listSchemas():
    EphSchemaCatalogEntry[] {
    return Array.from(
      this.schemas.values(),
    )
      .map((schema) =>
        this.clone(schema),
      )
      .sort((left, right) =>
        left.id.localeCompare(right.id),
      );
  }

  getSchema(
    schemaId: string,
  ): EphSchemaCatalogEntry | null {
    const schema = this.schemas.get(
      String(schemaId || "").trim(),
    );

    return schema
      ? this.clone(schema)
      : null;
  }

  requireSchema(
    schemaId: string,
  ): EphSchemaCatalogEntry {
    const schema =
      this.getSchema(schemaId);

    if (!schema) {
      throw new NotFoundException(
        `EPH şeması bulunamadı: ${schemaId}`,
      );
    }

    return schema;
  }

  requireLinaReadySchema(
    schemaId: string,
  ): EphSchemaCatalogEntry {
    const schema =
      this.requireSchema(schemaId);

    if (
      !schema.availableToLina ||
      schema.status !== "LINA_READY"
    ) {
      throw new ConflictException(
        `EPH şeması henüz Lina aracına hazır değil: ${schema.id}`,
      );
    }

    return schema;
  }

  getSummary() {
    const schemas =
      this.listSchemas();

    return {
      registeredSchemaCount:
        schemas.length,
      linaReadySchemaCount:
        schemas.filter(
          (schema) =>
            schema.availableToLina,
        ).length,
      migrationRequiredCount:
        schemas.filter(
          (schema) =>
            schema.status ===
            "MIGRATION_REQUIRED",
        ).length,
    };
  }

  private clone(
    schema: EphSchemaCatalogEntry,
  ): EphSchemaCatalogEntry {
    return {
      ...schema,
      modes: [...schema.modes],
      requiredFormFields: [
        ...schema.requiredFormFields,
      ],
      conditionallyRequiredFields: [
        ...schema
          .conditionallyRequiredFields,
      ],
      draftFieldKeys: [
        ...schema.draftFieldKeys,
      ],
      linaFieldKeys: [
        ...schema.linaFieldKeys,
      ],
    };
  }
}
