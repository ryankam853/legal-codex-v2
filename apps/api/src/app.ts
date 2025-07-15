import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';

import { connectMongoDB, checkDatabaseHealth } from './config/database';
import { authRoutes } from './modules/auth/routes/authRoutes';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
      transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          colorize: true
        }
      } : undefined
    }
  });

  // 註冊插件
  await app.register(cors, {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.CORS_ORIGINS?.split(',') || ['https://yourdomain.com']
      : true,
    credentials: true
  });

  // 註冊Swagger文檔
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Legal Codex API',
        description: '法律文本管理系統API',
        version: '2.0.0'
      },
      servers: [
        {
          url: process.env.API_URL || 'http://localhost:5000',
          description: 'Development server'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false
    },
    staticCSP: true,
    transformStaticCSP: (header) => header
  });

  // 註冊文件上傳
  await app.register(multipart, {
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB
    }
  });

  // 健康檢查端點
  app.get('/health', async (request, reply) => {
    const health = await checkDatabaseHealth();
    const allHealthy = Object.values(health).every(status => status === true);
    
    return reply
      .code(allHealthy ? 200 : 503)
      .send({
        status: allHealthy ? 'ok' : 'error',
        timestamp: new Date().toISOString(),
        services: health
      });
  });

  // 根路由
  app.get('/', async (request, reply) => {
    return {
      message: 'Legal Codex API v2.0',
      version: '2.0.0',
      docs: '/docs',
      health: '/health'
    };
  });

  // 註冊路由
  await app.register(authRoutes, { prefix: '/api/auth' });
  
  // 新實現的模組路由（條件加載避免錯誤）
  try {
    const { extractionRoutes } = await import('./modules/extraction/routes/extractionRoutes');
    await app.register(extractionRoutes, { prefix: '/api/extraction' });
    app.log.info('Extraction routes loaded');
  } catch (error) {
    app.log.warn('Failed to load extraction routes:', error);
  }

  // API概覽端點
  app.get('/api', async (request, reply) => {
    return {
      success: true,
      data: {
        message: 'Legal Codex API v2.0',
        version: '2.0.0',
        endpoints: {
          auth: '/api/auth',
          extraction: '/api/extraction',
          health: '/health',
          docs: '/docs'
        },
        modules: {
          authentication: 'JWT + RBAC',
          textExtraction: 'URL, PDF, DOCX support',
          annotationSystem: 'Multi-layer positioning',
          searchEngine: 'PostgreSQL + Meilisearch'
        }
      }
    };
  });

  // 全局錯誤處理
  app.setErrorHandler(async (error, request, reply) => {
    request.log.error(error);

    // 驗證錯誤
    if (error.validation) {
      return reply.code(400).send({
        success: false,
        error: 'Validation failed',
        details: error.validation
      });
    }

    // JWT錯誤
    if (error.message.includes('jwt') || error.message.includes('token')) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication failed'
      });
    }

    // 開發環境顯示詳細錯誤
    if (process.env.NODE_ENV === 'development') {
      return reply.code(500).send({
        success: false,
        error: error.message,
        stack: error.stack
      });
    }

    // 生產環境只顯示通用錯誤
    return reply.code(500).send({
      success: false,
      error: 'Internal server error'
    });
  });

  // 404處理
  app.setNotFoundHandler(async (request, reply) => {
    return reply.code(404).send({
      success: false,
      error: 'Route not found',
      path: request.url
    });
  });

  return app;
} 