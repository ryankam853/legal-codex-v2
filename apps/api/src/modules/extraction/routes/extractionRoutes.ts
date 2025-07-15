import { FastifyInstance } from 'fastify';
import { ExtractionController } from '../controllers/ExtractionController';
import { TextExtractionService } from '../services/TextExtractionService';

export async function extractionRoutes(fastify: FastifyInstance) {
  // 初始化服務和控制器
  const extractionService = new TextExtractionService();
  const extractionController = new ExtractionController(extractionService);

  // 單一文本擷取
  fastify.post('/extract', {
    schema: {
      description: '擷取單一文本',
      body: {
        type: 'object',
        required: ['source', 'type'],
        properties: {
          source: { 
            type: 'string',
            description: 'URL or file path to extract from'
          },
          type: { 
            type: 'string',
            enum: ['url', 'pdf', 'docx', 'text'],
            description: 'Type of source to extract'
          },
          options: {
            type: 'object',
            properties: {
              language: {
                type: 'string',
                enum: ['zh', 'pt', 'en', 'auto'],
                description: 'Target language for extraction'
              },
              extractImages: {
                type: 'boolean',
                description: 'Whether to extract images'
              },
              preserveFormatting: {
                type: 'boolean',
                description: 'Whether to preserve original formatting'
              },
              timeout: {
                type: 'number',
                description: 'Extraction timeout in milliseconds'
              }
            }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              description: 'Extraction result'
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    },
    handler: extractionController.extractText.bind(extractionController)
  });

  // 批量文本擷取
  fastify.post('/extract/batch', {
    schema: {
      description: '批量擷取多個文本',
      body: {
        type: 'object',
        required: ['sources'],
        properties: {
          sources: {
            type: 'array',
            maxItems: 10,
            items: {
              type: 'object',
              required: ['source', 'type'],
              properties: {
                source: { type: 'string' },
                type: { 
                  type: 'string',
                  enum: ['url', 'pdf', 'docx', 'text']
                }
              }
            }
          },
          options: {
            type: 'object',
            properties: {
              language: {
                type: 'string',
                enum: ['zh', 'pt', 'en', 'auto']
              },
              extractImages: { type: 'boolean' },
              preserveFormatting: { type: 'boolean' },
              timeout: { type: 'number' }
            }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                description: 'Extraction results'
              }
            }
          }
        }
      }
    },
    handler: extractionController.extractMultiple.bind(extractionController)
  });

  // 獲取支持的擷取類型
  fastify.get('/types', {
    schema: {
      description: '獲取支持的擷取類型',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                types: {
                  type: 'array',
                  items: { type: 'string' }
                },
                descriptions: {
                  type: 'object',
                  additionalProperties: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    handler: extractionController.getSupportedTypes.bind(extractionController)
  });

  // 擷取狀態查詢
  fastify.get('/status/:id', {
    schema: {
      description: '查詢擷取任務狀態',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
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
                id: { type: 'string' },
                status: { type: 'string' },
                progress: { type: 'number' },
                result: { type: 'object' }
              }
            }
          }
        }
      }
    },
    handler: extractionController.getExtractionStatus.bind(extractionController)
  });

  // 健康檢查
  fastify.get('/health', {
    schema: {
      description: '文本擷取服務健康檢查',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                service: { type: 'string' },
                status: { type: 'string' },
                supportedTypes: {
                  type: 'array',
                  items: { type: 'string' }
                },
                timestamp: { type: 'string' }
              }
            }
          }
        },
        503: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    },
    handler: extractionController.healthCheck.bind(extractionController)
  });
} 