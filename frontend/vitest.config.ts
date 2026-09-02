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
      // lib/offline/manager.ts and workoutSender.ts are left out for the same
      // reason as lib/api.ts: they are browser and network glue, and every
      // decision they make lives in queue.ts, sync.ts, draft.ts and storage.ts
      // lib/health/bridge.ts is left out on the same grounds: it is plugin and
      // platform detection, and its decisions live in metrics, normalize and sync
      // lib/copilot/api.ts and types.ts are left out for the same reason as
      // lib/api.ts: one is network glue, the other is types with no behaviour
      include: [
        'lib/apiError.ts',
        'lib/copilot/position.ts',
        'lib/copilot/routine.ts',
        'lib/copilot/meals.ts',
        'lib/copilot/attachments.ts',
        'lib/copilot/events.ts',
        'lib/nutrition/**/*.ts',
        'lib/workouts/**/*.ts',
        'lib/social/visibility.ts',
        'lib/offline/queue.ts',
        'lib/offline/sync.ts',
        'lib/offline/draft.ts',
        'lib/offline/storage.ts',
        'lib/offline/ids.ts',
        'lib/health/metrics.ts',
        'lib/health/normalize.ts',
        'lib/health/sync.ts',
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
