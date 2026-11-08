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

export function redactProjectPrivateInfo<T extends object>(project: T, canSee: boolean): T {
  if (canSee) return project;

  const { authorizedContact, ...rest } = project as T & { authorizedContact?: unknown };

  return {
    ...rest,
    address: null,
    mapAddress: null,
    latitude: null,
    longitude: null,
  } as unknown as T;
}
