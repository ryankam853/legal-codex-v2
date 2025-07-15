'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface ExtractionResult {
  success: boolean;
  data?: {
    success: boolean;
    data?: {
      title?: { zh?: string; pt?: string };
      content: {
        zh?: { text: string; html: string; wordCount: number };
        pt?: { text: string; html: string; wordCount: number };
      };
      metadata: {
        extractor: string;
        confidence: number;
        processingTime: number;
        language?: string;
      };
    };
  };
  error?: string;
}

export default function ExtractionPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);

  const handleExtraction = async () => {
    if (!url.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/extraction/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: url,
          type: 'url',
          options: {
            language: 'auto',
            preserveFormatting: true
          }
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            📄 文本擷取工具
          </h1>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              輸入網址或上傳文件
            </label>
            <div className="flex space-x-4">
              <Input
                type="url"
                placeholder="https://example.com/legal-document"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleExtraction}
                disabled={loading || !url.trim()}
                className="px-6"
              >
                {loading ? '擷取中...' : '開始擷取'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">支持格式</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 網頁 URL</li>
                <li>• PDF 文檔</li>
                <li>• Word 文檔</li>
                <li>• 純文本</li>
              </ul>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">智能功能</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• 自動語言檢測</li>
                <li>• 雙語內容分離</li>
                <li>• 結構化解析</li>
                <li>• 元數據擷取</li>
              </ul>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">特殊支持</h3>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• 澳門政府網站</li>
                <li>• 法律文本格式</li>
                <li>• 多語言處理</li>
                <li>• 容錯算法</li>
              </ul>
            </div>
          </div>

          {result && (
            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-4">擷取結果</h2>
              
              {result.success && result.data ? (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">擷取成功！</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">擷取器：</span>
                        <span className="text-gray-600">{result.data.data?.metadata.extractor}</span>
                      </div>
                      <div>
                        <span className="font-medium">信心度：</span>
                        <span className="text-gray-600">
                          {(result.data.data?.metadata.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">處理時間：</span>
                        <span className="text-gray-600">
                          {result.data.data?.metadata.processingTime}ms
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">語言：</span>
                        <span className="text-gray-600">{result.data.data?.metadata.language}</span>
                      </div>
                    </div>
                  </div>

                  {result.data.data?.title && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">標題</h4>
                      {result.data.data.title.zh && (
                        <p className="text-gray-800 mb-2">
                          <span className="font-medium">中文：</span>{result.data.data.title.zh}
                        </p>
                      )}
                      {result.data.data.title.pt && (
                        <p className="text-gray-800">
                          <span className="font-medium">葡文：</span>{result.data.data.title.pt}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">內容預覽</h4>
                    {result.data.data?.content.zh && (
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-700 mb-2">
                          中文內容 ({result.data.data.content.zh.wordCount} 字)
                        </h5>
                        <p className="text-gray-600 text-sm bg-white p-3 rounded border">
                          {result.data.data.content.zh.text.slice(0, 200)}
                          {result.data.data.content.zh.text.length > 200 && '...'}
                        </p>
                      </div>
                    )}
                    {result.data.data?.content.pt && (
                      <div>
                        <h5 className="font-medium text-gray-700 mb-2">
                          葡文內容 ({result.data.data.content.pt.wordCount} 字)
                        </h5>
                        <p className="text-gray-600 text-sm bg-white p-3 rounded border">
                          {result.data.data.content.pt.text.slice(0, 200)}
                          {result.data.data.content.pt.text.length > 200 && '...'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-red-900 mb-2">擷取失敗</h3>
                  <p className="text-red-700">{result.error || '未知錯誤'}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 