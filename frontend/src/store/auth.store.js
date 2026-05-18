import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user:  null,
      token: null,

      setAuth: (user, token) => set({ user, token }),
      setUser: (user)        => set({ user }),
      logout:  ()            => set({ user: null, token: null }),

      isAuthenticated: () => {
        // Helper para verificar desde fuera del store
        const state = useAuthStore.getState();
        return Boolean(state.token && state.user);
      },
    }),
    {
      name:    'la-esperanza-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

export default useAuthStore;
