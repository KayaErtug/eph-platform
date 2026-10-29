// Proje adresi, harita konumu ve proje yetkilisi; proje sahibi, ofis sahibi, süper admin
// ve "İletişime Geç" ile açan kullanıcı görür (EPH_KURALLARI §0, §3).

export type ProjectPrivateViewer = { id?: string | null; role?: string | null };

export function canSeeProjectPrivateInfo(
  viewer: ProjectPrivateViewer,
  projectOwnerId: string | null | undefined,
  officeOwnerId: string | null | undefined,
  unlocked: boolean,
) {
  if (viewer.role === 'SUPER_ADMIN' || unlocked) return true;
  if (!viewer.id) return false;

  return viewer.id === projectOwnerId || viewer.id === officeOwnerId;
}

// Yetkisiz görünümde koordinat mahalle düzeyine (2 ondalık) yuvarlanır; yetkilide kesin kalır.
export function approximateCoordinate(value: unknown) {
  const number = Number(value);
  return value == null || !Number.isFinite(number) || number === 0 ? null : Math.round(number * 100) / 100;
}

export function projectLocationFields(
  source: object,
  canSee: boolean,
) {
  const project = source as { address?: unknown; mapAddress?: unknown; latitude?: unknown; longitude?: unknown };
  return canSee
    ? {
        address: project.address ?? null,
        mapAddress: project.mapAddress ?? null,
        latitude: project.latitude ?? null,
        longitude: project.longitude ?? null,
        locationApproximate: false,
      }
    : {
        address: null,
        mapAddress: null,
        latitude: approximateCoordinate(project.latitude),
        longitude: approximateCoordinate(project.longitude),
        locationApproximate: true,
      };
}

export function redactProjectPrivateInfo<T extends object>(project: T, canSee: boolean): T {
  const source = project as T & { authorizedContact?: unknown; placeId?: unknown };
  const location = projectLocationFields(source, canSee);
  if (canSee) return { ...project, ...location } as T;

  const { authorizedContact, ...rest } = source;

  return {
    ...rest,
    ...location,
    ...('placeId' in rest ? { placeId: null } : {}),
  } as unknown as T;
}
