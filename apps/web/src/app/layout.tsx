import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/lib/providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '法律文本管理系統',
  description: '現代化的法律文本管理和註解系統',
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#0ea5e9',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
} 