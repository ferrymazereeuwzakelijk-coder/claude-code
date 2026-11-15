import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'node',
    globalSetup: ['./tests/global-setup.ts'],
    fileParallelism: false, // integration tests share one database
    testTimeout: 30_000,
    env: {
      APP_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://klusmatch:klusmatch@localhost:5432/klusmatch_test',
      AI_PROVIDER: 'rules',
      WHATSAPP_MODE: 'simulator',
      WHATSAPP_APP_SECRET: 'test-app-secret-123',
      WHATSAPP_VERIFY_TOKEN: 'test-verify-token-123',
      STORAGE_DRIVER: 'local',
      INLINE_WORKER: 'false',
    },
  },
});
