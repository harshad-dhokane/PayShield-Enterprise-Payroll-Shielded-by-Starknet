import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cartridgeAuth } from "@/lib/cartridge";

interface AuthState {
  isAuthenticated: boolean;
  user: {
    address: string;
    username: string;
    companyId?: string;
  } | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,

      login: async () => {
        set({ isLoading: true, error: null });

        try {
          const { address, username } = await cartridgeAuth.connect();

          // Mock fetching company data for hackathon demo
          // const response = await fetch(`/api/companies/${address}`);
          // const companyData = await response.json();

          set({
            isAuthenticated: true,
            user: {
              address,
              username,
            companyId: "mock-company-id",
          },
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Authentication failed",
            isLoading: false,
          });
        }
      },

      logout: async () => {
        await cartridgeAuth.disconnect();
        set({
          isAuthenticated: false,
          user: null,
          error: null,
        });
      },

      checkAuth: async () => {
        // Verify session on page load
        if (cartridgeAuth.isConnected()) {
          // Validate with backend if needed
          set({ isAuthenticated: true });
        }
      },
    }),
    {
      name: "shielded-auth",
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
