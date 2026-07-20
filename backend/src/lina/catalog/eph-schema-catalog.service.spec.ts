import {
  ConflictException,
  NotFoundException,
} from "@nestjs/common";

import {
  EphSchemaCatalogService,
} from "./eph-schema-catalog.service";

describe("EphSchemaCatalogService", () => {
  let service:
    EphSchemaCatalogService;

  beforeEach(() => {
    service =
      new EphSchemaCatalogService();
  });

  it("reports only the schema that is actually registered", () => {
    expect(
      service.listSchemas(),
    ).toHaveLength(1);

    expect(
      service.getSchema(
        "eph.forum.request",
      ),
    ).toEqual(
      expect.objectContaining({
        id: "eph.forum.request",
        version: 1,
        entity: "ForumRequest",
        title:
          "Talep Merkezi Kaydı",
        sourcePath:
          "frontend/src/schemas/forum/forum-request.schema.ts",
      }),
    );
  });

  it("does not falsely expose the frontend-only schema as Lina-ready", () => {
    const schema =
      service.requireSchema(
        "eph.forum.request",
      );

    expect(
      schema.availableToLina,
    ).toBe(false);

    expect(schema.status).toBe(
      "MIGRATION_REQUIRED",
    );

    expect(() =>
      service.requireLinaReadySchema(
        "eph.forum.request",
      ),
    ).toThrow(
      ConflictException,
    );
  });

  it("preserves the audited draft and Lina field contracts", () => {
    const schema =
      service.requireSchema(
        "eph.forum.request",
      );

    expect(
      schema.requiredFormFields,
    ).toEqual([
      "category",
      "requestIntent",
      "title",
      "description",
    ]);

    expect(
      schema.conditionallyRequiredFields,
    ).toEqual([
      "propertyType",
    ]);

    expect(
      schema.draftFieldKeys,
    ).toEqual(
      expect.arrayContaining([
        "areas",
        "minBudget",
        "maxBudget",
        "currency",
        "visibility",
      ]),
    );

    expect(
      schema.linaFieldKeys,
    ).toEqual(
      expect.arrayContaining([
        "category",
        "requestIntent",
        "propertyType",
        "city",
        "district",
        "neighborhood",
        "description",
      ]),
    );
  });

  it("rejects unknown schemas", () => {
    expect(() =>
      service.requireSchema(
        "eph.unknown.schema",
      ),
    ).toThrow(
      NotFoundException,
    );
  });

  it("returns an honest readiness summary", () => {
    expect(
      service.getSummary(),
    ).toEqual({
      registeredSchemaCount: 1,
      linaReadySchemaCount: 0,
      migrationRequiredCount: 1,
    });
  });
});
