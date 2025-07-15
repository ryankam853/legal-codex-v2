import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { MeiliSearch } from 'meilisearch';

// PostgreSQL (Prisma)
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// MongoDB連接
export const connectMongoDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/legal_codex_v2';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Redis連接
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

// Meilisearch連接
export const meilisearch = new MeiliSearch({
  host: process.env.MEILI_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILI_MASTER_KEY || undefined,
});

// 數據庫健康檢查
export const checkDatabaseHealth = async () => {
  const health = {
    postgresql: false,
    mongodb: false,
    redis: false,
    meilisearch: false,
  };

  try {
    // PostgreSQL健康檢查
    await prisma.$queryRaw`SELECT 1`;
    health.postgresql = true;
  } catch (error) {
    console.error('PostgreSQL health check failed:', error);
  }

  try {
    // MongoDB健康檢查
    await mongoose.connection.db.admin().ping();
    health.mongodb = true;
  } catch (error) {
    console.error('MongoDB health check failed:', error);
  }

  try {
    // Redis健康檢查
    await redis.ping();
    health.redis = true;
  } catch (error) {
    console.error('Redis health check failed:', error);
  }

  try {
    // Meilisearch健康檢查
    await meilisearch.health();
    health.meilisearch = true;
  } catch (error) {
    console.error('Meilisearch health check failed:', error);
  }

  return health;
};

// 優雅關閉數據庫連接
export const closeConnections = async (): Promise<void> => {
  await Promise.allSettled([
    prisma.$disconnect(),
    mongoose.disconnect(),
    redis.disconnect(),
  ]);
  console.log('🔌 All database connections closed');
}; 