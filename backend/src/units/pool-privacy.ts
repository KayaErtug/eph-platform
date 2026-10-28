export function redactPoolDeedOwnerText(unit: any, value: string | null | undefined) {
  if (typeof value !== 'string') return value;
  const privateValues = [unit.deedOwnerFullName, unit.deedOwnerPhone, unit.deedOwnerEmail, unit.contactPhone, unit.whatsappPhone]
    .filter((item): item is string => typeof item === 'string' && item.trim().length >= 3);
  return privateValues.reduce((result, item) => result.split(item).join('[Özel bilgi]'), value);
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

    privateInfoUnlocked: privateUnlocked,

    // Geçiş dönemi mobil uyumluluğu.
    phoneUnlocked: privateUnlocked,
    whatsappUnlocked: privateUnlocked,
  };
}
