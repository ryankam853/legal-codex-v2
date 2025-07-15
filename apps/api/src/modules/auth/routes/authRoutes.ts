import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/AuthController';
import { AuthMiddleware } from '../middleware/authMiddleware';

export async function authRoutes(fastify: FastifyInstance) {
  const authController = new AuthController();
  const authMiddleware = new AuthMiddleware();

  // 註冊
  fastify.post('/register', {
    schema: {
      tags: ['Auth'],
      summary: '用戶註冊',
      body: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 50 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    username: { type: 'string' },
                    email: { type: 'string' },
                    status: { type: 'string' },
                    createdAt: { type: 'string' }
                  }
                }
              }
            },
            message: { type: 'string' }
          }
        }
      }
    }
  }, authController.register.bind(authController));

  // 登入
  fastify.post('/login', {
    schema: {
      tags: ['Auth'],
      summary: '用戶登入',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    username: { type: 'string' },
                    email: { type: 'string' },
                    status: { type: 'string' },
                    roles: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          description: { type: 'string' }
                        }
                      }
                    }
                  }
                },
                tokens: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    expiresIn: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, authController.login.bind(authController));

  // 刷新令牌
  fastify.post('/refresh', {
    schema: {
      tags: ['Auth'],
      summary: '刷新訪問令牌',
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' }
        }
      }
    }
  }, authController.refreshToken.bind(authController));

  // 登出
  fastify.post('/logout', {
    schema: {
      tags: ['Auth'],
      summary: '用戶登出',
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' }
        }
      }
    }
  }, authController.logout.bind(authController));

  // 獲取當前用戶信息
  fastify.get('/me', {
    schema: {
      tags: ['Auth'],
      summary: '獲取當前用戶信息',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    username: { type: 'string' },
                    email: { type: 'string' },
                    status: { type: 'string' },
                    roles: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    preHandler: authMiddleware.requireAuth()
  }, authController.me.bind(authController));
} 