import { FastifyRequest, FastifyReply } from 'fastify';
import { TextExtractionService } from '../services/TextExtractionService';
import {
  ExtractionSource,
  ExtractionOptions,
  ExtractionResult
} from '../../../shared/types/extraction.types';

interface ExtractTextRequest {
  Body: {
    source: string;
    type: 'url' | 'pdf' | 'docx' | 'text';
    options?: {
      language?: 'zh' | 'pt' | 'en' | 'auto';
      extractImages?: boolean;
      preserveFormatting?: boolean;
      timeout?: number;
    };
  };
}

interface ExtractMultipleRequest {
  Body: {
    sources: Array<{
      source: string;
      type: 'url' | 'pdf' | 'docx' | 'text';
    }>;
    options?: {
      language?: 'zh' | 'pt' | 'en' | 'auto';
      extractImages?: boolean;
      preserveFormatting?: boolean;
      timeout?: number;
    };
  };
}

export class ExtractionController {
  constructor(private extractionService: TextExtractionService) {}

  // 單一文本擷取
  async extractText(
    request: FastifyRequest<ExtractTextRequest>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { source, type, options = {} } = request.body;

      // 驗證請求參數
      if (!source || !type) {
        reply.code(400).send({
          success: false,
          error: 'Source and type are required'
        });
        return;
      }

      // 構建擷取源
      const extractionSource: ExtractionSource = {
        type,
        source
      };

      // 構建擷取選項
      const extractionOptions: ExtractionOptions = {
        language: options.language || 'auto',
        extractImages: options.extractImages || false,
        preserveFormatting: options.preserveFormatting || true,
        timeout: options.timeout || 30000
      };

      // 執行擷取
      const result = await this.extractionService.extract(extractionSource, extractionOptions);

      reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Extraction failed'
      });
    }
  }

  // 批量文本擷取
  async extractMultiple(
    request: FastifyRequest<ExtractMultipleRequest>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { sources, options = {} } = request.body;

      // 驗證請求參數
      if (!sources || !Array.isArray(sources) || sources.length === 0) {
        reply.code(400).send({
          success: false,
          error: 'Sources array is required and cannot be empty'
        });
        return;
      }

      // 限制批量處理數量
      if (sources.length > 10) {
        reply.code(400).send({
          success: false,
          error: 'Cannot process more than 10 sources at once'
        });
        return;
      }

      // 構建擷取源列表
      const extractionSources: ExtractionSource[] = sources.map(({ source, type }) => ({
        type,
        source
      }));

      // 構建擷取選項
      const extractionOptions: ExtractionOptions = {
        language: options.language || 'auto',
        extractImages: options.extractImages || false,
        preserveFormatting: options.preserveFormatting || true,
        timeout: options.timeout || 30000
      };

      // 執行批量擷取
      const results = await this.extractionService.extractMultiple(
        extractionSources,
        extractionOptions
      );

      reply.send({
        success: true,
        data: results
      });
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Batch extraction failed'
      });
    }
  }

  // 獲取支持的擷取類型
  async getSupportedTypes(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const types = this.extractionService.getSupportedTypes();
      
      reply.send({
        success: true,
        data: {
          types,
          descriptions: {
            url: 'Extract text from web pages',
            pdf: 'Extract text from PDF documents',
            docx: 'Extract text from Word documents',
            text: 'Process plain text content'
          }
        }
      });
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get supported types'
      });
    }
  }

  // 檢查擷取狀態（用於長時間運行的擷取任務）
  async getExtractionStatus(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params;
      
      // 在實際實現中，這裡應該從緩存或數據庫中獲取任務狀態
      // 現在只是返回模擬狀態
      reply.send({
        success: true,
        data: {
          id,
          status: 'completed',
          progress: 100,
          result: null // 實際結果會在這裡
        }
      });
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get extraction status'
      });
    }
  }

  // 健康檢查
  async healthCheck(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const types = this.extractionService.getSupportedTypes();
      
      reply.send({
        success: true,
        data: {
          service: 'TextExtractionService',
          status: 'healthy',
          supportedTypes: types,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      reply.code(503).send({
        success: false,
        error: 'Service unhealthy'
      });
    }
  }
} 