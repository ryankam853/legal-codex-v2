import { FastifyRequest, FastifyReply } from 'fastify';
import { TokenService } from '../services/TokenService';
import { RoleService } from '../services/RoleService';
import { prisma } from '@/config/database';

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string;
    username: string;
    roles: string[];
  };
}

export class AuthMiddleware {
  private tokenService: TokenService;
  private roleService: RoleService;

  constructor() {
    this.tokenService = new TokenService();
    this.roleService = new RoleService();
  }

  requireAuth = () => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // 1. 提取令牌
        const token = this.extractToken(request);
        if (!token) {
          return reply.code(401).send({
            success: false,
            error: 'Authentication token required'
          });
        }

        // 2. 驗證令牌
        const payload = await this.tokenService.verifyAccessToken(token);

        // 3. 獲取用戶信息
        const user = await prisma.user.findUnique({
          where: { id: payload.id },
          include: {
            userRoles: {
              include: { role: true }
            }
          }
        });

        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'User not found'
          });
        }

        // 4. 檢查用戶狀態
        if (user.status !== 'ACTIVE') {
          return reply.code(403).send({
            success: false,
            error: 'Account not active'
          });
        }

        // 5. 設置用戶上下文
        (request as any).user = {
          id: user.id,
          email: user.email,
          username: user.username,
          roles: user.userRoles.map(ur => ur.role.name)
        };

      } catch (error) {
        return reply.code(401).send({
          success: false,
          error: error instanceof Error ? error.message : 'Authentication failed'
        });
      }
    };
  };

  requirePermission = (resource: string, action: string) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Authentication required'
          });
        }

        const hasPermission = await this.roleService.hasPermission(user.id, resource, action);
        if (!hasPermission) {
          return reply.code(403).send({
            success: false,
            error: `Insufficient permissions for ${action} on ${resource}`
          });
        }
      } catch (error) {
        return reply.code(403).send({
          success: false,
          error: error instanceof Error ? error.message : 'Permission check failed'
        });
      }
    };
  };

  requireRole = (roleName: string) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Authentication required'
          });
        }

        if (!user.roles.includes(roleName)) {
          return reply.code(403).send({
            success: false,
            error: `Role ${roleName} required`
          });
        }
      } catch (error) {
        return reply.code(403).send({
          success: false,
          error: error instanceof Error ? error.message : 'Role check failed'
        });
      }
    };
  };

  optionalAuth = () => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const token = this.extractToken(request);
        if (!token) {
          return; // 繼續處理，但沒有用戶上下文
        }

        const payload = await this.tokenService.verifyAccessToken(token);
        const user = await prisma.user.findUnique({
          where: { id: payload.id },
          include: {
            userRoles: {
              include: { role: true }
            }
          }
        });

        if (user && user.status === 'ACTIVE') {
          (request as any).user = {
            id: user.id,
            email: user.email,
            username: user.username,
            roles: user.userRoles.map(ur => ur.role.name)
          };
        }
      } catch (error) {
        // 忽略錯誤，繼續處理但沒有用戶上下文
      }
    };
  };

  private extractToken(request: FastifyRequest): string | null {
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
} 