'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // TODO: 實現實際的登入邏輯
      console.log('Login:', { email, password });
      // 模擬API請求
      await new Promise(resolve => setTimeout(resolve, 1000));
      // 登入成功後重定向
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            法律文本管理系統
          </h1>
          <p className="text-gray-600 mt-2">
            請登入您的帳戶
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="郵箱地址"
            type="email"
            placeholder="請輸入郵箱地址"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="密碼"
            type={showPassword ? 'text' : 'password'}
            placeholder="請輸入密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            }
          />

          <Button
            type="submit"
            className="w-full"
            loading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? '登入中...' : '登入'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            還沒有帳戶？{' '}
            <a
              href="/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              立即註冊
            </a>
          </p>
        </div>
      </div>
    </div>
  );
} 