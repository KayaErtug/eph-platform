import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  capabilities?: string[];
  isApproved?: boolean;
  referralCode?: string | null;
  nominationPoints?: number;
  nominationQuota?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  hasHydrated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

function setAuthCookie(token: string) {
  if (typeof document === "undefined") return;

  document.cookie = `eph_token=${token}; path=/; max-age=${AUTH_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
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
      hasHydrated: false,

      setAuth: (user, token) => {
        setAuthCookie(token);
        set({ user, token });
      },

      logout: () => {
        clearAuthCookie();
        set({ user: null, token: null });
      },

      setHasHydrated: (value) => {
        set({ hasHydrated: value });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
