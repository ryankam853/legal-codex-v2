import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthAPI, TokenManager } from '@/lib/api';
import { User, LoginCredentials, RegisterData } from '@/types/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // 初始狀態
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // 登入
      login: async (credentials: LoginCredentials) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await AuthAPI.login(credentials);
          
          if (response.success && response.data) {
            set({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
          } else {
            throw new Error('Login failed');
          }
        } catch (error: any) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.response?.data?.error || error.message || 'Login failed'
          });
          throw error;
        }
      },

      // 註冊
      register: async (data: RegisterData) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await AuthAPI.register(data);
          
          if (response.success) {
            set({
              isLoading: false,
              error: null
            });
          } else {
            throw new Error('Registration failed');
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.error || error.message || 'Registration failed'
          });
          throw error;
        }
      },

      // 登出
      logout: async () => {
        try {
          await AuthAPI.logout();
        } catch (error) {
          // 忽略登出錯誤
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            error: null
          });
        }
      },

      // 獲取當前用戶
      getCurrentUser: async () => {
        try {
          const token = TokenManager.getAccessToken();
          if (!token) {
            set({
              user: null,
              isAuthenticated: false
            });
            return;
          }

          set({ isLoading: true });
          
          const response = await AuthAPI.getCurrentUser();
          
          if (response.success && response.data) {
            set({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
          } else {
            throw new Error('Failed to get user info');
          }
        } catch (error: any) {
          // Token可能已過期，清除狀態
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        }
      },

      // 清除錯誤
      clearError: () => {
        set({ error: null });
      },

      // 設置載入狀態
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

// 認證狀態選擇器
export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    getCurrentUser,
    clearError
  } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    getCurrentUser,
    clearError
  };
}; 