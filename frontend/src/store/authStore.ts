import { create } from 'zustand';

interface AuthState {
  token: string | null;
  userName: string;
  setupDone: boolean | null;
  setToken: (token: string, name?: string) => void;
  setUserName: (name: string) => void;
  setSetupDone: (done: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('siuu_token'),
  userName: localStorage.getItem('siuu_name') || '',
  setupDone: null,

  setToken: (token, name) => {
    localStorage.setItem('siuu_token', token);
    if (name) localStorage.setItem('siuu_name', name);
    set({ token, userName: name || localStorage.getItem('siuu_name') || '' });
  },

  setUserName: (name) => {
    if (name) {
      localStorage.setItem('siuu_name', name);
      set({ userName: name });
    }
  },

  setSetupDone: (done) => set({ setupDone: done }),

  logout: () => {
    localStorage.removeItem('siuu_token');
    localStorage.removeItem('siuu_name');
    set({ token: null, userName: '' });
  },
}));
