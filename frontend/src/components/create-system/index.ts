export { default as CreateSystemShell } from "./CreateSystemShell";
export { default as EPHLocationMultiField } from "./EPHLocationMultiField";

export {
  EPH_CREATE_SYSTEM_VERSION,
  type EPHCreateContext,
  type EPHCreateDefinition,
  type EPHCreateDomain,
  type EPHCreateIssue,
  type EPHCreateIssueSeverity,
  type EPHCreateMode,
  type EPHCreateStep,
  type EPHCreateStepContext,
  type EPHCreateValidationResult,
} from "./create-system.types";

export {
  EPH_LOCATION_VERSION,
  type EPHLegacyLocationFields,
  type EPHLocationArea,
  type EPHLocationAreaInput,
  type EPHLocationScope,
} from "./location.types";

export {
  buildLocationSummary,
  deriveLegacyLocationFields,
  formatLocationArea,
  getLocationAreaKey,
  getLocationScope,
  getPrimaryLocationArea,
  isLocationAreaMatch,
  mergeLocationAreas,
  normalizeLocationArea,
  normalizeLocationAreas,
} from "./location.utils";

export {
  getFirstBlockingTextSafetyMessage,
  validateEPHPublicDescription,
  validateEPHPublicTitle,
  type EPHTextSafetyIssue,
  type EPHTextSafetyResult,
} from "./text-safety";

export {
  isEPHLandPropertyType,
  propertyTypeSupportsEPHDemandRoomRange,
  validateEPHPropertyField,
  type EPHPropertyNumericField,
} from "./property-validation";
