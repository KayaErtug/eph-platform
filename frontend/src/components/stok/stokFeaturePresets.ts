import {
  getAllSelectionTypeKeys,
  getSelectionFeatureGroupKeys,
} from "./stokSelectionAdapter";

export const STOK_FEATURE_PRESETS: Record<string, string[]> = Object.fromEntries(
  getAllSelectionTypeKeys().map((type) => [type, getSelectionFeatureGroupKeys(type)]),
);

export function getFeaturePresetKeys(type: string) {
  return STOK_FEATURE_PRESETS[type] || STOK_FEATURE_PRESETS.DAIRE || [];
}
