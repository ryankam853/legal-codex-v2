import 'dotenv/config';
import { buildApp } from './app';
import { connectMongoDB, closeConnections } from './config/database';
import { RoleService } from './modules/auth/services/RoleService';

async function start() {
  try {
    // 連接數據庫
    await connectMongoDB();
    console.log('📦 All databases connected');

    // 初始化角色
    const roleService = new RoleService();
    await roleService.initializeRoles();
    console.log('👥 Roles initialized');

    // 構建應用
    const app = await buildApp();

    // 啟動服務器
    const port = parseInt(process.env.PORT || '5000');
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });
    console.log(`🚀 Server running at http://${host}:${port}`);
    console.log(`📚 API docs available at http://${host}:${port}/docs`);

  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

// 優雅關閉
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await closeConnections();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await closeConnections();
  process.exit(0);
});

// 處理未捕獲的異常
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

start(); 