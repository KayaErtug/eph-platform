import type { EPHSchemaDefinition } from "./schema.types";

const schemaRegistry = new Map<string, EPHSchemaDefinition>();

export function registerEPHSchema(schema: EPHSchemaDefinition) {
  const current = schemaRegistry.get(schema.id);

  if (current && current.version > schema.version) {
    throw new Error(
      `${schema.id} için daha yeni bir şema zaten kayıtlı: v${current.version}`,
    );
  }

  schemaRegistry.set(schema.id, schema);
  return schema;
}

export function getEPHSchema(schemaId: string) {
  return schemaRegistry.get(schemaId) || null;
}

export function requireEPHSchema(schemaId: string) {
  const schema = getEPHSchema(schemaId);

  if (!schema) {
    throw new Error(`EPH şeması bulunamadı: ${schemaId}`);
  }

  return schema;
}

export function listEPHSchemas() {
  return Array.from(schemaRegistry.values()).sort((a, b) =>
    a.id.localeCompare(b.id),
  );
}

export function clearEPHSchemaRegistry() {
  schemaRegistry.clear();
}
