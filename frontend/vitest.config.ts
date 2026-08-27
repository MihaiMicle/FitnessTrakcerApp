import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    // `node` is right for pure logic and starts far faster than a DOM. When
    // component tests arrive, add `environment: 'happy-dom'` per-file with a
    // `// @vitest-environment happy-dom` docblock rather than globally
    environment: 'node',
    globals: false,
    include: ['**/__tests__/**/*.test.ts', '**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules/**', '.next/**'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',

      // Only the pure logic that has tests today. Components and hooks are
      // excluded on purpose: counting them would report a misleadingly low
      // number and hide whether the arithmetic itself is covered
      //
      // Widen this glob as you add tests. Leaving an untested directory in
      // here only makes the gate permanently red, which teaches people to
      // ignore it. Not yet covered: lib/images.ts, lib/progressShare.ts,
      // lib/api.ts, lib/social/api.ts, and everything under components/ and hooks/
      include: [
        'lib/nutrition/**/*.ts',
        'lib/workouts/**/*.ts',
        'lib/social/visibility.ts',
      ],
      exclude: ['**/__tests__/**', '**/*.d.ts'],

      // These are met today. Raise them as more logic moves into lib/
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
