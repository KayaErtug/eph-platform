"use client";

import { useMemo } from "react";

import {
  AdvancedFilterCenter,
  type AdvancedFilterState,
  type AdvancedFilterTheme,
} from "@/components/advanced-filter";

import { schemaToAdvancedFilterSections } from "./advanced-filter-adapter";
import type {
  EPHSchemaDefinition,
  EPHSchemaState,
} from "./schema.types";
import { createSchemaInitialState } from "./schema.utils";

export default function SchemaFilterEngine({
  open,
  schema,
  value,
  resultCount,
  theme,
  title,
  subtitle,
  onApply,
  onClose,
}: {
  open: boolean;
  schema: EPHSchemaDefinition;
  value: EPHSchemaState;
  resultCount?: number;
  theme?: Partial<AdvancedFilterTheme>;
  title?: string;
  subtitle?: string;
  onApply: (value: EPHSchemaState) => void;
  onClose: () => void;
}) {
  const defaultValue = useMemo(
    () => createSchemaInitialState(schema, {}, "filter"),
    [schema],
  );

  const normalizedValue = useMemo(
    () => createSchemaInitialState(schema, value, "filter"),
    [schema, value],
  );

  const sections = useMemo(
    () =>
      schemaToAdvancedFilterSections(
        schema,
        normalizedValue as AdvancedFilterState,
      ),
    [normalizedValue, schema],
  );

  return (
    <AdvancedFilterCenter
      open={open}
      title={title || schema.title}
      subtitle={
        subtitle ||
        schema.description ||
        "Kayıtları ortak EPH veri alanlarına göre süzün."
      }
      sections={sections}
      value={normalizedValue as AdvancedFilterState}
      defaultValue={defaultValue as AdvancedFilterState}
      resultCount={resultCount}
      theme={theme}
      onApply={(nextValue) => onApply(nextValue as EPHSchemaState)}
      onClose={onClose}
    />
  );
}
