import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import { toast } from 'react-hot-toast';

import { 
  AuthTokens, 
  LoginCredentials, 
  RegisterData, 
  AuthResponse, 
  ApiResponse,
  User 
} from '@/types/auth';

// API配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// 創建axios實例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token管理
class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';

  static getAccessToken(): string | null {
    return Cookies.get(this.ACCESS_TOKEN_KEY) || null;
  }

  static getRefreshToken(): string | null {
    return Cookies.get(this.REFRESH_TOKEN_KEY) || null;
  }

  static setTokens(tokens: AuthTokens): void {
    const expiresInDays = tokens.expiresIn / (24 * 60 * 60); // 轉換為天數
    
    Cookies.set(this.ACCESS_TOKEN_KEY, tokens.accessToken, {
      expires: expiresInDays,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    Cookies.set(this.REFRESH_TOKEN_KEY, tokens.refreshToken, {
      expires: 7, // refresh token通常有效期更長
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
  }

  static clearTokens(): void {
    Cookies.remove(this.ACCESS_TOKEN_KEY);
    Cookies.remove(this.REFRESH_TOKEN_KEY);
  }
}

// 請求攔截器
apiClient.interceptors.request.use(
  (config) => {
    const token = TokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 響應攔截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 如果是401錯誤且不是重試請求
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = TokenManager.getRefreshToken();
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken
          });

          if (response.data.success) {
            const newTokens = response.data.data.tokens;
            TokenManager.setTokens(newTokens);
            
            // 重試原始請求
            originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
            return apiClient(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh失敗，清除tokens並重定向到登入頁
        TokenManager.clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    // 顯示錯誤訊息
    if (error.response?.data?.error) {
      toast.error(error.response.data.error);
    } else if (error.message) {
      toast.error(error.message);
    }

    return Promise.reject(error);
  }
);

// API類
export class AuthAPI {
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/auth/login', credentials);
    
    if (response.data.success && response.data.data.tokens) {
      TokenManager.setTokens(response.data.data.tokens);
    }
    
    return response.data;
  }

  static async register(data: RegisterData): Promise<ApiResponse<{ user: User }>> {
    const response = await apiClient.post<ApiResponse<{ user: User }>>('/api/auth/register', data);
    return response.data;
  }

  static async logout(): Promise<void> {
    const refreshToken = TokenManager.getRefreshToken();
    
    if (refreshToken) {
      try {
        await apiClient.post('/api/auth/logout', { refreshToken });
      } catch (error) {
        // 忽略登出錯誤
      }
    }
    
    TokenManager.clearTokens();
  }

  static async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    const response = await apiClient.get<ApiResponse<{ user: User }>>('/api/auth/me');
    return response.data;
  }

  static async refreshToken(): Promise<AuthResponse> {
    const refreshToken = TokenManager.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<AuthResponse>('/api/auth/refresh', {
      refreshToken
    });

    if (response.data.success && response.data.data.tokens) {
      TokenManager.setTokens(response.data.data.tokens);
    }

    return response.data;
  }
}

// 通用API客戶端
export class ApiClient {
  static async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await apiClient.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  static async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await apiClient.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  static async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await apiClient.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  static async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await apiClient.delete<ApiResponse<T>>(url, config);
    return response.data;
  }
}

export { TokenManager };
export default apiClient; 