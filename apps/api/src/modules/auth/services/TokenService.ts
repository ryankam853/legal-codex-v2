import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { redis } from '@/config/database';
import { 
  AuthTokens, 
  TokenPayload, 
  RefreshTokenPayload, 
  PublicUser 
} from '@/shared/types/auth.types';

export class TokenService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET || 'your-access-token-secret';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret';
    this.accessTokenExpiresIn = process.env.JWT_EXPIRES_IN || '1h';
    this.refreshTokenExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  async generateTokens(user: any): Promise<AuthTokens> {
    const payload: TokenPayload = {
      id: user.id,
      email: user.email,
      roles: user.userRoles.map((ur: any) => ur.role.name)
    };

    // 生成Access Token
    const accessToken = jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiresIn
    });

    // 生成Refresh Token
    const tokenId = randomUUID();
    const refreshPayload: RefreshTokenPayload = {
      id: user.id,
      tokenId
    };

    const refreshToken = jwt.sign(refreshPayload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiresIn
    });

    // 存儲refresh token到Redis
    await this.storeRefreshToken(user.id, tokenId, refreshToken);

    // 計算過期時間
    const expiresIn = this.parseExpiresIn(this.accessTokenExpiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn
    };
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret) as TokenPayload;
      return payload;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = jwt.verify(token, this.refreshTokenSecret) as RefreshTokenPayload;
      
      // 檢查refresh token是否在Redis中存在
      const storedToken = await redis.get(`refresh_token:${payload.id}:${payload.tokenId}`);
      if (!storedToken || storedToken !== token) {
        throw new Error('Refresh token not found or revoked');
      }

      return payload;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async revokeRefreshToken(token: string): Promise<void> {
    try {
      const payload = jwt.verify(token, this.refreshTokenSecret) as RefreshTokenPayload;
      await redis.del(`refresh_token:${payload.id}:${payload.tokenId}`);
    } catch (error) {
      // 忽略錯誤，可能token已經過期或無效
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    const keys = await redis.keys(`refresh_token:${userId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  private async storeRefreshToken(userId: string, tokenId: string, token: string): Promise<void> {
    const key = `refresh_token:${userId}:${tokenId}`;
    const ttl = this.parseExpiresIn(this.refreshTokenExpiresIn);
    await redis.setex(key, ttl, token);
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expires in format: ${expiresIn}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      default: throw new Error(`Unknown time unit: ${unit}`);
    }
  }
} 