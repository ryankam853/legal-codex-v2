import bcrypt from 'bcryptjs';
import { prisma } from '@/config/database';
import { TokenService } from './TokenService';
import { RoleService } from './RoleService';
import { 
  LoginDto, 
  RegisterDto, 
  AuthResult, 
  PublicUser, 
  LoginActivity 
} from '@/shared/types/auth.types';

export class AuthService {
  constructor(
    private tokenService: TokenService,
    private roleService: RoleService
  ) {}

  async login(credentials: LoginDto, clientInfo: { ipAddress: string; userAgent: string }): Promise<AuthResult> {
    // 1. 驗證用戶憑證
    const user = await this.validateCredentials(credentials);
    
    // 2. 檢查用戶狀態
    this.validateUserStatus(user);
    
    // 3. 獲取用戶角色
    const userWithRoles = await this.getUserWithRoles(user.id);
    
    // 4. 生成令牌
    const tokens = await this.tokenService.generateTokens(userWithRoles);
    
    // 5. 記錄登入日誌
    await this.logLoginActivity({
      userId: user.id,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      success: true,
      timestamp: new Date()
    });
    
    return {
      user: this.toPublicUser(userWithRoles),
      tokens
    };
  }

  async register(userData: RegisterDto): Promise<PublicUser> {
    // 1. 驗證註冊數據
    await this.validateRegistrationData(userData);
    
    // 2. 創建用戶
    const hashedPassword = await this.hashPassword(userData.password);
    const user = await prisma.user.create({
      data: {
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        status: 'PENDING_APPROVAL'
      }
    });
    
    // 3. 分配默認角色
    await this.roleService.assignDefaultRole(user.id);
    
    // 4. 獲取完整用戶信息
    const userWithRoles = await this.getUserWithRoles(user.id);
    
    return this.toPublicUser(userWithRoles);
  }

  async refreshToken(refreshToken: string): Promise<AuthResult> {
    // 1. 驗證refresh token
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    
    // 2. 獲取用戶信息
    const userWithRoles = await this.getUserWithRoles(payload.id);
    
    // 3. 生成新的令牌
    const tokens = await this.tokenService.generateTokens(userWithRoles);
    
    return {
      user: this.toPublicUser(userWithRoles),
      tokens
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokenService.revokeRefreshToken(refreshToken);
  }

  async validateCredentials(credentials: LoginDto) {
    const user = await prisma.user.findUnique({
      where: { email: credentials.email }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    return user;
  }

  private validateUserStatus(user: any): void {
    if (user.status === 'SUSPENDED') {
      throw new Error('Account suspended');
    }
    
    if (user.status === 'INACTIVE') {
      throw new Error('Account inactive');
    }
    
    if (user.status === 'PENDING_APPROVAL') {
      throw new Error('Account pending approval');
    }
  }

  private async validateRegistrationData(userData: RegisterDto): Promise<void> {
    // 檢查用戶名是否已存在
    const existingUsername = await prisma.user.findUnique({
      where: { username: userData.username }
    });
    
    if (existingUsername) {
      throw new Error('Username already exists');
    }

    // 檢查郵箱是否已存在
    const existingEmail = await prisma.user.findUnique({
      where: { email: userData.email }
    });
    
    if (existingEmail) {
      throw new Error('Email already exists');
    }

    // 驗證密碼強度
    this.validatePasswordStrength(userData.password);
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  private async getUserWithRoles(userId: string) {
    return prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });
  }

  private toPublicUser(userWithRoles: any): PublicUser {
    return {
      id: userWithRoles.id,
      username: userWithRoles.username,
      email: userWithRoles.email,
      status: userWithRoles.status,
      roles: userWithRoles.userRoles.map((ur: any) => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
        permissions: ur.role.permissions
      })),
      createdAt: userWithRoles.createdAt
    };
  }

  private async logLoginActivity(activity: LoginActivity): Promise<void> {
    await prisma.loginLog.create({
      data: {
        userId: activity.userId,
        ipAddress: activity.ipAddress,
        userAgent: activity.userAgent,
        success: activity.success,
        loginAt: activity.timestamp
      }
    });
  }
} 