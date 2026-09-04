import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export default defineConfig({
  resolve: {
    alias: {
      '@audit/kernel': r('./src/index.ts'),
      '@audit/contracts': r('../contracts/src/index.ts'),
      '@audit/scoring': r('../../modules/scoring/src/index.ts'),
    },
  },
  test: { globals: false, environment: 'node', include: ['src/**/*.test.ts'] },
});
