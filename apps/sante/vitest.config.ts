import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    exclude: ['**/node_modules/**'],
  },
  resolve: {
    alias: {
      '@':                    path.resolve(__dirname, '.'),
      '@app-store/core-auth': path.resolve(__dirname, '../../packages/core-auth/src/index.ts'),
      '@app-store/core-ui':   path.resolve(__dirname, '../../packages/core-ui/src/index.ts'),
      '@app-store/core-db':   path.resolve(__dirname, '../../packages/core-db/src/index.ts'),
    },
  },
})
