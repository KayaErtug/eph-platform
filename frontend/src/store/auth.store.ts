import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isApproved?: boolean;
  referralCode?: string | null;
  nominationPoints?: number;
  nominationQuota?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

function setAuthCookie(token: string) {
  if (typeof document === "undefined") return;

  document.cookie = `eph_token=${token}; path=/; max-age=604800; SameSite=Lax`;
}

function clearAuthCookie() {
  if (typeof document === "undefined") return;

  document.cookie = "eph_token=; path=/; max-age=0; SameSite=Lax";
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,

      setAuth: (user, token) => {
        setAuthCookie(token);
        set({ user, token });
      },

      logout: () => {
        clearAuthCookie();
        set({ user: null, token: null });
      },
    }),
    {
      name: "auth-storage",
    }
  )
);