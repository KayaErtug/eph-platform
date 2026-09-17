import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UnitType } from '@prisma/client';

import {
  CARD_PROFILE_CODES,
  CARD_PROFILES,
  CardProfileDefinition,
  CardProfileSlot,
  getCanonicalCardProfileBindingCount,
  getCardProfileBinding,
  getStructureTypeSlotLabel,
  getUnmappedUnitTypes,
  LEGACY_UNIT_TYPE_CARD_PROFILE_BINDINGS,
  NON_PUBLISHABLE_UNIT_TYPES,
  normalizePropertyCardValue,
  resolveStructureTypeValue,
  UNIT_TYPE_CARD_PROFILE_BINDINGS,
} from './property-card-profile.registry';

const PORTFOLIO_METADATA_PREFIX = '__EPH_META__:';

type ResolveCardProfileInput = {
  unitType: string;
  values?: Record<string, unknown>;
  features?: string[];
};

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseMetadata(features: unknown) {
  const metadata: Record<string, string> = {};

  if (!Array.isArray(features)) return metadata;

  for (const item of features) {
    const raw = String(item || '');
    if (!raw.startsWith(PORTFOLIO_METADATA_PREFIX)) continue;

    const payload = raw.slice(PORTFOLIO_METADATA_PREFIX.length);
    const separatorIndex = payload.indexOf(':');
    if (separatorIndex < 0) continue;

    const key = safeDecode(payload.slice(0, separatorIndex)).trim();
    const value = safeDecode(payload.slice(separatorIndex + 1)).trim();

    if (key && value) metadata[key] = value;
  }

  return metadata;
}

function isFilled(value: unknown) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim() !== '';
}

@Injectable()
export class PropertyCardProfileService {
  listProfiles() {
    return {
      version: '1.3',
      slotStandard: 8,
      canonicalUnitTypeCount: getCanonicalCardProfileBindingCount(),
      runtimeUnitTypeCount: Object.values(UnitType).length,
      profiles: CARD_PROFILE_CODES.map((code) => CARD_PROFILES[code]),
      bindings: Object.values(UNIT_TYPE_CARD_PROFILE_BINDINGS),
      legacyBindings: Object.values(LEGACY_UNIT_TYPE_CARD_PROFILE_BINDINGS),
      nonPublishableUnitTypes: [...NON_PUBLISHABLE_UNIT_TYPES],
      unmappedUnitTypes: getUnmappedUnitTypes(),
    };
  }

  getProfile(unitTypeInput: string) {
    const unitType = this.parseUnitType(unitTypeInput);

    if (unitType === UnitType.DIGER) {
      throw new BadRequestException(
        'DIGER genel bir eski tiptir. Yayınlanmadan önce somut bir gayrimenkul tipine dönüştürülmelidir.',
      );
    }

    const binding = getCardProfileBinding(unitType);
    if (!binding) {
      throw new NotFoundException(
        `${unitType} için CardProfile eşlemesi bulunamadı.`,
      );
    }

    const profile = this.withDynamicLabels(
      CARD_PROFILES[binding.profileCode],
      unitType,
    );

    return {
      version: '1.3',
      unitType,
      binding,
      profile,
    };
  }

  resolve(input: ResolveCardProfileInput) {
    const resolvedProfile = this.getProfile(input.unitType);
    const metadata = parseMetadata(input.features);
    const values: Record<string, unknown> = {
      ...metadata,
      ...(input.values || {}),
    };

    const slots = resolvedProfile.profile.slots.map((slot) => {
      const value = this.resolveSlotValue(
        resolvedProfile.unitType,
        slot,
        values,
      );

      return {
        key: slot.key,
        label: slot.label,
        value: isFilled(value) ? value : null,
        complete: isFilled(value),
      };
    });

    return {
      ...resolvedProfile,
      slots,
      completeCount: slots.filter((slot) => slot.complete).length,
      missingKeys: slots
        .filter((slot) => !slot.complete)
        .map((slot) => slot.key),
      readyForPublish: slots.every((slot) => slot.complete),
    };
  }

  private parseUnitType(value: string): UnitType {
    const normalized = String(value || '').trim().toUpperCase();

    if (!normalized) {
      throw new BadRequestException('unitType zorunludur.');
    }

    const unitType = (Object.values(UnitType) as string[]).find(
      (candidate) => candidate === normalized,
    );

    if (!unitType) {
      throw new BadRequestException(`Geçersiz UnitType: ${normalized}`);
    }

    return unitType as UnitType;
  }

  private withDynamicLabels(
    profile: CardProfileDefinition,
    unitType: UnitType,
  ): CardProfileDefinition {
    if (profile.code !== 'VILLA_MUSTAKIL') return profile;

    return {
      ...profile,
      slots: profile.slots.map((slot) =>
        slot.key === 'structureType'
          ? {
              ...slot,
              label: getStructureTypeSlotLabel(unitType),
            }
          : slot,
      ),
    };
  }

  private resolveSlotValue(
    unitType: UnitType,
    slot: CardProfileSlot,
    values: Record<string, unknown>,
  ) {
    if (slot.key === 'structureType') {
      return resolveStructureTypeValue(unitType, values);
    }

    for (const sourceKey of slot.sourceKeys) {
      const value = values[sourceKey];
      if (!isFilled(value)) continue;

      if (Array.isArray(value)) {
        return value
          .map((item) => normalizePropertyCardValue(item))
          .filter(isFilled)
          .join(', ');
      }

      return normalizePropertyCardValue(value);
    }

    return null;
  }
}
