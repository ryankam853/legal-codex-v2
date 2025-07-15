export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  user: PublicUser;
  tokens: AuthTokens;
}

export interface PublicUser {
  id: string;
  username: string;
  email: string;
  status: string;
  roles: Role[];
  createdAt: Date;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
}

export interface Permission {
  resource: string;
  action: string;
  condition?: Record<string, any>;
}

export interface TokenPayload {
  id: string;
  email: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  id: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

export interface LoginActivity {
  userId: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  timestamp: Date;
} 