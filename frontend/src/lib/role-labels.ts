export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  EMLAKCI: "Emlakçı",
  MUTEAHHIT: "Müteahhit",
  INSAAT_FIRMASI: "İnşaat Firması",
  MODERATOR: "Moderatör",
  ADMIN: "Admin",
  SUPER_ADMIN: "Yazılım Ekibi",
};

export function normalizeRoleKey(role?: string | null) {
  return String(role || "")
    .toLocaleUpperCase("tr-TR")
    .trim();
}

export function getRoleDisplayName(role?: string | null, fallback = "Rol yok") {
  const normalizedRole = normalizeRoleKey(role);

  if (!normalizedRole) return fallback;

  if (["MÜTEAHHİT", "MÜTAHHİT"].includes(normalizedRole)) {
    return ROLE_DISPLAY_NAMES.MUTEAHHIT;
  }

  if (normalizedRole === "İNŞAAT_FİRMASI") {
    return ROLE_DISPLAY_NAMES.INSAAT_FIRMASI;
  }

  return ROLE_DISPLAY_NAMES[normalizedRole] || role || fallback;
}

export function hideTechnicalSuperAdminText(value?: string | null) {
  if (!value) return "";

  return String(value)
    .replace(/SUPER_ADMINLER/g, "Yazılım Ekibi")
    .replace(/SUPER_ADMIN/g, "Yazılım Ekibi")
    .replace(/SUPER ADMIN/g, "Yazılım Ekibi")
    .replace(/Super Admin/g, "Yazılım Ekibi")
    .replace(/Süper Adminler/g, "Yazılım Ekibi")
    .replace(/Süper Admin/g, "Yazılım Ekibi");
}
