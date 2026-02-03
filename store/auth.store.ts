import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { clearKeypair, isSessionValid, getSessionExpiryInfo, refreshSession } from '@/lib/keypair';

interface User {
  id: string;
  email: string;
  name: string;
  address: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  checkSession: () => boolean;
  refreshUserSession: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: true }),

      setToken: (token) => set({ token }),

      login: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
        }),

      logout: () => {
        // Clear keypair from storage when logging out
        clearKeypair();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),

      // Check if session (keypair) is still valid
      checkSession: () => {
        const state = get();
        if (!state.isAuthenticated) return false;
        
        const valid = isSessionValid();
        if (!valid && state.isAuthenticated) {
          // Session expired, logout user
          console.warn('Session expired, logging out...');
          get().logout();
          return false;
        }
        return valid;
      },

      // Refresh user session
      refreshUserSession: () => {
        const state = get();
        if (!state.isAuthenticated) return false;
        return refreshSession();
      },
    }),
    {
      name: 'auth-storage',
      // Use sessionStorage for auth data too (more secure)
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

// Helper hook to get session info
export function getAuthSessionInfo() {
  return getSessionExpiryInfo();
}
