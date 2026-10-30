export function redactPoolDeedOwnerText(unit: any, value: string | null | undefined) {
  if (typeof value !== 'string') return value;
  const privateValues = [unit.deedOwnerFullName, unit.deedOwnerPhone, unit.deedOwnerEmail, unit.contactPhone, unit.whatsappPhone]
    .filter((item): item is string => typeof item === 'string' && item.trim().length >= 3);
  return privateValues.reduce((result, item) => result.split(item).join('[Özel bilgi]'), value);
}

// Ofis alanları: ofis telefonu SystemSetting EPH_OFFICE_PROFILE_<id> içindeki phone (OfficeIdentityCard kaydı);
// office.profilePhone olarak units.service tarafından eklenir, yoksa null. Ofis sahibinin cep telefonu ayrıca kullanılır.
// Adres: profildeki açık adres (office.profileAddress), yoksa Office city/district/neighborhood. Ofis yoksa null.
export function serializePoolOfficeInfo(unit: any, visible: boolean) {
  const office = unit.project?.owner?.office;
  if (!visible || !office) return { officePhone: null, officeOwnerPhone: null, officeAddress: null };
  const clean = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
  const address = clean(office.profileAddress)
    || [office.neighborhood, office.district, office.city].map(clean).filter(Boolean).join(', ');
  return {
    officePhone: clean(office.profilePhone),
    officeOwnerPhone: clean(office.owner?.phone),
    officeAddress: address || null,
  };
}

export function serializePoolPrivateInfo(
  unit: any,
  privateUnlocked: boolean,
  _phoneUnlocked = false,
  _whatsappUnlocked = false,
) {
  const features = Array.isArray(unit.features)
    ? unit.features.filter((item: unknown) => {
        const raw = String(item || '');
        if (!raw.startsWith('__EPH_META__:')) return true;

        let key = raw.slice('__EPH_META__:'.length).split(':')[0];

        try {
          key = decodeURIComponent(key);
        } catch {
          return false;
        }

        return !/(phone|whatsapp|owner|office|address|creditamount|dooraccess|latitude|longitude|placeid)/i.test(
          key,
        );
      })
    : [];
  const safeFeatures = features.map((item: string) =>
    item.startsWith('__EPH_META__:') ? item : redactPoolDeedOwnerText(unit, item),
  );

  const phoneCallAllowed = Boolean(
    unit.allowPhoneCall && String(unit.contactPhone || '').trim(),
  );

  const whatsappAllowed = Boolean(
    unit.allowWhatsapp && String(unit.whatsappPhone || '').trim(),
  );

      const officeOwner = unit.project?.owner?.office?.owner;
    const hasOfficeOwner = Boolean(officeOwner && officeOwner.phone);

    return {
      features: safeFeatures,
      description: redactPoolDeedOwnerText(unit, unit.description),

      number: privateUnlocked ? unit.number ?? null : null,
      adaNo: privateUnlocked ? unit.adaNo ?? null : null,
      parselNo: privateUnlocked ? unit.parselNo ?? null : null,

      availableCreditAmount: privateUnlocked
        ? unit.availableCreditAmount ?? null
        : null,

      doorAccessInfo: privateUnlocked
        ? unit.doorAccessInfo ?? null
        : null,

      deedOwnerFullName: null,
      deedOwnerPhone: null,
      deedOwnerEmail: null,

      listingOwnerName: privateUnlocked
        ? unit.project?.owner?.role === 'SUPER_ADMIN'
          ? 'Yazılım Ekibi'
          : hasOfficeOwner
            ? [officeOwner.firstName, officeOwner.lastName].filter(Boolean).join(' ') || unit.project?.owner?.office?.name || 'Ofis Yetkilisi'
            : [unit.project?.owner?.firstName, unit.project?.owner?.lastName].filter(Boolean).join(' ') || null
        : null,

      listingOfficeName: privateUnlocked && unit.project?.owner?.role !== 'SUPER_ADMIN'
        ? unit.project?.owner?.companyName?.trim() || unit.project?.owner?.office?.name || null
        : null,

      contactPhone:
        privateUnlocked && phoneCallAllowed
          ? hasOfficeOwner ? officeOwner.phone : (unit.contactPhone ?? null)
          : null,

      whatsappPhone:
        privateUnlocked && whatsappAllowed
          ? hasOfficeOwner ? officeOwner.phone : (unit.whatsappPhone ?? null)
          : null,

    ...serializePoolOfficeInfo(unit, privateUnlocked),

    privateInfoUnlocked: privateUnlocked,

    // Geçiş dönemi mobil uyumluluğu.
    phoneUnlocked: privateUnlocked,
    whatsappUnlocked: privateUnlocked,
  };
}
