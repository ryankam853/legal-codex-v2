# 法律文本管理系統 v2.0

基於現有電子法典應用程式開發經驗，重新設計的現代化法律文本管理和註解系統。

## 🎯 核心功能

- 🔐 **穩定的認證系統** (JWT + RBAC)
- 📄 **智能文本擷取** (URL/PDF處理)  
- 🎯 **精確註解定位** (多層定位算法)
- 🔍 **高效搜索引擎** (雙語全文檢索)

## 🏗️ 技術架構

### 後端技術棧
- **框架**: Fastify + TypeScript
- **數據庫**: PostgreSQL (關係數據) + MongoDB (文檔存儲)
- **緩存**: Redis
- **搜索**: Meilisearch
- **認證**: JWT + Passport.js
- **驗證**: Zod
- **ORM**: Prisma + Mongoose

### 前端技術棧
- **框架**: Next.js 14 (App Router)
- **語言**: TypeScript
- **樣式**: Tailwind CSS
- **狀態管理**: Zustand + TanStack Query
- **表單**: React Hook Form + Zod
- **編輯器**: 支持富文本編輯

## 📁 項目結構

```
legal-codex-v2/
├── apps/
│   ├── api/                 # 後端API服務
│   │   ├── src/
│   │   │   ├── modules/     # 功能模組
│   │   │   │   ├── auth/    # 認證模組
│   │   │   │   ├── texts/   # 文本管理
│   │   │   │   └── search/  # 搜索引擎
│   │   │   ├── config/      # 配置文件
│   │   │   └── shared/      # 共享類型和工具
│   │   └── prisma/          # 數據庫Schema
│   └── web/                 # 前端應用
│       ├── src/
│       │   ├── app/         # Next.js App Router
│       │   ├── components/  # React組件
│       │   ├── lib/         # 工具函數
│       │   ├── stores/      # 狀態管理
│       │   └── types/       # TypeScript類型
├── packages/                # 共享包
├── docker-compose.yml       # 開發環境
└── pnpm-workspace.yaml     # Monorepo配置
```

## 🚀 快速開始

### 環境要求
- Node.js 18+
- pnpm 8+
- Docker & Docker Compose

### 1. 克隆項目
```bash
git clone <repository-url>
cd legal-codex-v2
```

### 2. 安裝依賴
```bash
pnpm install
```

### 3. 啟動數據庫服務
```bash
docker-compose up -d postgres mongodb redis meilisearch
```

### 4. 配置環境變數
```bash
# 複製並編輯環境變數文件
cp env.example apps/api/.env
cp env.example apps/web/.env.local

# 編輯數據庫連接信息
# 編輯JWT密鑰等配置
```

### 5. 初始化數據庫
```bash
cd apps/api
pnpm prisma migrate dev
pnpm prisma db seed
```

### 6. 啟動開發服務器
```bash
# 啟動後端API (端口5000)
cd apps/api
pnpm dev

# 啟動前端應用 (端口3000)
cd apps/web  
pnpm dev
```

### 7. 訪問應用
- 前端應用: http://localhost:3000
- API文檔: http://localhost:5000/docs
- 健康檢查: http://localhost:5000/health

## 📝 API 文檔

API文檔使用OpenAPI 3.0標準，啟動服務後可訪問 `http://localhost:5000/docs`

### 主要端點

#### 認證相關
- `POST /api/auth/register` - 用戶註冊
- `POST /api/auth/login` - 用戶登入
- `POST /api/auth/logout` - 用戶登出
- `POST /api/auth/refresh` - 刷新令牌
- `GET /api/auth/me` - 獲取當前用戶信息

#### 文本管理
- `GET /api/texts` - 獲取文本列表
- `POST /api/texts` - 創建新文本
- `GET /api/texts/:id` - 獲取文本詳情
- `PUT /api/texts/:id` - 更新文本
- `DELETE /api/texts/:id` - 刪除文本

#### 註解系統
- `GET /api/annotations` - 獲取註解列表
- `POST /api/annotations` - 創建註解
- `PUT /api/annotations/:id` - 更新註解
- `DELETE /api/annotations/:id` - 刪除註解

#### 搜索功能
- `GET /api/search` - 全文搜索
- `GET /api/search/suggest` - 搜索建議

## 🔧 開發指南

### 代碼規範
- ESLint + Prettier 自動格式化
- TypeScript 嚴格模式
- Git 提交信息規範

### 測試
```bash
# 運行所有測試
pnpm test

# 運行特定測試
pnpm test auth

# 測試覆蓋率
pnpm test:coverage
```

### 構建部署
```bash
# 構建生產版本
pnpm build

# 啟動生產服務器
pnpm start
```

## 🐳 Docker 部署

### 開發環境
```bash
docker-compose up -d
```

### 生產環境
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 監控和日誌

- 應用監控: `/health` 端點
- 日誌管理: Winston 結構化日誌
- 性能監控: 內建指標收集

## 🔒 安全考量

- JWT + Refresh Token 雙重認證
- RBAC 角色權限控制
- 密碼強度驗證 + bcrypt 加密
- SQL 注入防護
- XSS 和 CSRF 防護
- Rate Limiting API 限流

## 📋 數據庫設計

### PostgreSQL (關係數據)
- 用戶管理 (users, roles, user_roles)
- 文本元數據 (legal_texts)
- 註解基本信息 (annotations)
- 操作日誌 (login_logs)

### MongoDB (文檔存儲)
- 文本內容 (legal_text_contents)
- 註解位置信息 (annotation_positions)
- 文本結構數據

### Redis (緩存)
- 會話存儲
- Refresh Token 管理
- 搜索結果緩存

### Meilisearch (搜索引擎)
- 全文搜索索引
- 多語言支持
- 相關性排序

## 🤝 貢獻指南

1. Fork 項目
2. 創建功能分支 (`git checkout -b feature/new-feature`)
3. 提交更改 (`git commit -am 'Add some feature'`)
4. 推送到分支 (`git push origin feature/new-feature`)
5. 創建 Pull Request

## 📄 許可證

MIT License

## 🆘 問題反饋

如有問題，請創建 [GitHub Issue](https://github.com/your-repo/issues)

---

**版本**: v2.0.0  
**最後更新**: 2025年1月  
**維護者**: 獨立開發者 