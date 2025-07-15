import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/AuthService';
import { TokenService } from '../services/TokenService';
import { RoleService } from '../services/RoleService';

// 驗證schema
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const RegisterSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8)
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1)
});

export class AuthController {
  private authService: AuthService;

  constructor() {
    const tokenService = new TokenService();
    const roleService = new RoleService();
    this.authService = new AuthService(tokenService, roleService);
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = LoginSchema.parse(request.body);
      
      const clientInfo = {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || 'Unknown'
      };

      const result = await this.authService.login(body, clientInfo);

      return reply.code(200).send({
        success: true,
        data: result
      });
    } catch (error) {
      return reply.code(401).send({
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      });
    }
  }

  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = RegisterSchema.parse(request.body);
      
      const user = await this.authService.register(body);

      return reply.code(201).send({
        success: true,
        data: { user },
        message: 'Registration successful. Please wait for account approval.'
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      });
    }
  }

  async refreshToken(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = RefreshTokenSchema.parse(request.body);
      
      const result = await this.authService.refreshToken(body.refreshToken);

      return reply.code(200).send({
        success: true,
        data: result
      });
    } catch (error) {
      return reply.code(401).send({
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed'
      });
    }
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = RefreshTokenSchema.parse(request.body);
      
      await this.authService.logout(body.refreshToken);

      return reply.code(200).send({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed'
      });
    }
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    try {
      // 用戶信息在中間件中已經設置
      const user = (request as any).user;
      
      return reply.code(200).send({
        success: true,
        data: { user }
      });
    } catch (error) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required'
      });
    }
  }
} 