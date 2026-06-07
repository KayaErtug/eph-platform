export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  EMLAKCI: "Emlakçı",
  MUTEAHHIT: "Müteahhit",
  INSAAT_FIRMASI: "İnşaat Firması",
  MODERATOR: "Moderatör",
  ADMIN: "Admin",
  SUPER_ADMIN: "Yazılım Ekibi",
};

export function getRoleDisplayName(role?: string | null) {
  if (!role) return "-";

  return ROLE_DISPLAY_NAMES[role] || role;
}

export function hideTechnicalSuperAdminText(value?: string | null) {
  if (!value) return "";

  return value
    .replace(/SUPER_ADMIN/g, "Yazılım Ekibi")
    .replace(/SUPER ADMIN/g, "Yazılım Ekibi")
    .replace(/Super Admin/g, "Yazılım Ekibi")
    .replace(/Süper Admin/g, "Yazılım Ekibi");
}
