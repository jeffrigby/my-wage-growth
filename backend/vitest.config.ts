import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      APPCONFIG_APP_ID: 'test-app-id',
      APPCONFIG_ENV_ID: 'test-env-id',
      APPCONFIG_PROFILE_ID: 'test-profile-id',
      WAGE_GROWTH_BUCKET: 'test-bucket',
      AWS_REGION: 'us-east-1',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/handlers': path.resolve(__dirname, './src/handlers'),
    },
  },
}); 