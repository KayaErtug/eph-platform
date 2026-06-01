export type EphRole =
  | "EMLAKCI"
  | "MUTEAHHIT"
  | "INSAAT_FIRMASI"
  | "ADMIN"
  | "SUPER_ADMIN";

export function getRoleTheme(role?: string) {
  switch (role) {
    case "EMLAKCI":
      return {
        primary: "#2563EB",
        secondary: "#DBEAFE",
        text: "#172033",
      };

    case "MUTEAHHIT":
      return {
        primary: "#EA580C",
        secondary: "#FFEDD5",
        text: "#172033",
      };

    case "INSAAT_FIRMASI":
      return {
        primary: "#C9A84C",
        secondary: "#FEF3C7",
        text: "#172033",
      };

    case "SUPER_ADMIN":
      return {
        primary: "#0F766E",
        secondary: "#CCFBF1",
        text: "#172033",
      };

    case "ADMIN":
    default:
      return {
        primary: "#334155",
        secondary: "#E2E8F0",
        text: "#172033",
      };
  }
}