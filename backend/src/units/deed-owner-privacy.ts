import { PrismaService } from '../prisma/prisma.service';

// Tapu sahibi ad/telefon/e-posta ve kapı giriş bilgisini portföyü giren danışman,
// o danışmanın bağlı olduğu ofisin sahibi ve süper admin görebilir (EPH_KURALLARI §0).

export type DeedOwnerViewer = { id?: string | null; role?: string | null };

export async function getOfficeAdvisorIds(
  prisma: PrismaService,
  viewerId?: string | null,
) {
  if (!viewerId) return new Set<string>();

  const advisors = await prisma.user.findMany({
    where: { office: { ownerUserId: viewerId } },
    select: { id: true },
  });

  return new Set(advisors.map((advisor) => advisor.id));
}

export function canSeeDeedOwnerInfo(
  viewer: DeedOwnerViewer,
  listingOwnerId: string | null | undefined,
  officeAdvisorIds: Set<string>,
) {
  if (viewer.role === 'SUPER_ADMIN') return true;
  if (!viewer.id || !listingOwnerId) return false;

  return viewer.id === listingOwnerId || officeAdvisorIds.has(listingOwnerId);
}

export function redactDeedOwnerInfo<T extends object>(
  unit: T,
  listingOwnerId: string | null | undefined,
  viewer: DeedOwnerViewer,
  officeAdvisorIds: Set<string>,
): T {
  if (canSeeDeedOwnerInfo(viewer, listingOwnerId, officeAdvisorIds)) return unit;

  return {
    ...unit,
    doorAccessInfo: null,
    deedOwnerFullName: null,
    deedOwnerPhone: null,
    deedOwnerEmail: null,
  };
}
