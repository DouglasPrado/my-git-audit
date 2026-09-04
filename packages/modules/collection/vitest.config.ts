import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export default defineConfig({
  resolve: { alias: { '@audit/kernel': r('../../shared/kernel/src/index.ts'), '@audit/contracts': r('../../shared/contracts/src/index.ts') } },
  test: { globals: false, environment: 'node', include: ['src/**/*.test.ts'] },
});
