import type {
  EPHSchemaDefinition,
  EPHSchemaField,
  EPHSchemaState,
  EPHSchemaValue,
} from "./schema.types";
import { getSchemaFields } from "./schema.utils";

export type EPHLinaMetadataItem = {
  schemaId: string;
  schemaVersion: number;
  entity: string;
  fieldId: string;
  fieldKey: string;
  label: string;
  meaning: string;
  analyticsKey: string;
  entityPath?: string;
  value: EPHSchemaValue | undefined;
  pii: boolean;
  searchable: boolean;
  comparable: boolean;
  synonyms: string[];
  unit?: string;
};

export function createLinaMetadata(
  schema: EPHSchemaDefinition,
  state: EPHSchemaState,
): EPHLinaMetadataItem[] {
  return getSchemaFields(schema, state, "lina")
    .filter((field: EPHSchemaField) => Boolean(field.lina))
    .map((field: EPHSchemaField) => ({
      schemaId: schema.id,
      schemaVersion: schema.version,
      entity: schema.entity,
      fieldId: field.id,
      fieldKey: field.key,
      label: field.label,
      meaning: field.lina!.meaning,
      analyticsKey: field.lina!.analyticsKey,
      entityPath: field.lina!.entityPath,
      value: state[field.key],
      pii: Boolean(field.lina!.pii),
      searchable: field.lina!.searchable !== false,
      comparable: field.lina!.comparable !== false,
      synonyms: field.lina!.synonyms || [],
      unit: field.lina!.unit,
    }));
}

export function createLinaEntitySnapshot(
  schema: EPHSchemaDefinition,
  state: EPHSchemaState,
) {
  return {
    schemaId: schema.id,
    schemaVersion: schema.version,
    entity: schema.entity,
    generatedAt: new Date().toISOString(),
    fields: createLinaMetadata(schema, state),
  };
}
