import { KontorHareketTuru, KontorIslemTuru, Prisma } from '@prisma/client';

export function networkOwnerLabel(role?: string | null, capabilities?: { capability: string }[]): string {
  if (role === 'EMLAKCI' && capabilities?.some(item => item.capability === 'OFFICE_OWNER')) return 'EMLAK OFİSİ';
  switch (role) {
    case 'EMLAKCI': return 'EMLAKÇI';
    case 'OFIS_SAHIBI': return 'EMLAK OFİSİ';
    case 'MUTEAHHIT': return 'MÜTEAHHİT';
    case 'INSAAT_FIRMASI': return 'İNŞAAT FİRMASI';
    case 'TAKIM_LIDERI': return 'EMLAKÇI';
    case 'SUPER_ADMIN': return 'Yazılım Ekibi';
    default: return 'EPH ÜYESİ';
  }
}

export function networkContactPhone(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || !/^\+?[\d\s().-]+$/.test(text)) return null;
  let digits = text.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = '90' + digits.slice(1);
  else if (digits.length === 10 && /^[2-5]/.test(digits)) digits = '90' + digits;
  return /^[1-9]\d{9,14}$/.test(digits) ? '+' + digits : null;
}

export function networkPaidAccessWhere(viewerId: string, postId?: string): Prisma.KontorHareketiWhereInput {
  return {
    OR: [{ olusturanId: viewerId }, { olusturanId: null, kullaniciId: viewerId }],
    islemTuru: { in: [KontorIslemTuru.FORUM_OZEL_BILGI, KontorIslemTuru.FORUM_TELEFON, KontorIslemTuru.FORUM_WHATSAPP, KontorIslemTuru.FORUM_MESAJ] },
    hareketTuru: KontorHareketTuru.HARCAMA,
    ilgiliKayitTuru: 'NETWORK_POST',
    ...(postId ? { ilgiliKayitId: postId } : {}),
    miktar: { gt: 0 },
  };
}

export const NETWORK_CONTACT_OWNER_SELECT = {
  id: true, firstName: true, lastName: true, email: true, phone: true, role: true, companyName: true,
  capabilities: { select: { capability: true } },
  office: { select: { name: true, isActive: true } },
  ownedOffices: { where: { isActive: true }, select: { name: true, isActive: true }, orderBy: { name: 'asc' } },
} satisfies Prisma.UserSelect;

export function networkProfessionalContact(user: any) {
  const clean = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;
  const softwareTeam = user?.role === 'SUPER_ADMIN';
  const fullName = [clean(user?.firstName), clean(user?.lastName)].filter(Boolean).join(' ') || null;
  const officeNames = user?.office?.isActive === true
    ? [clean(user.office.name)]
    : (Array.isArray(user?.ownedOffices) ? user.ownedOffices : []).filter((office: any) => office?.isActive === true).map((office: any) => clean(office.name));
  return {
    name: softwareTeam ? 'Yazılım Ekibi' : fullName,
    phone: softwareTeam ? null : networkContactPhone(user?.phone),
    email: softwareTeam ? null : clean(user?.email),
    officeName: softwareTeam ? null : clean(user?.companyName) || Array.from(new Set(officeNames.filter(Boolean))).join(' / ') || null,
  };
}
