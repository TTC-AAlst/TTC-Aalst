import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Group the eager-graph libs into ONE long-cached vendor chunk so an app-code change no
        // longer busts them (the win is post-deploy: returning users re-download only the app chunk).
        // Lazy-only deps (quill, react-select, react-avatar-editor, …) are deliberately excluded —
        // naming them here would pull them into the initial load instead of their route chunks.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (
            /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|@reduxjs|react-redux|redux|immer|reselect|react-bootstrap|@restart|@microsoft[\\/]signalr)[\\/]/.test(
              id,
            )
          ) {
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['**/spec/**/*Spec.ts', '**/spec/**/*Spec.tsx'],
    exclude: ['e2e/**', 'node_modules/**'],
    setupFiles: ['./src/utils/test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/spec/**', 'src/utils/test-setup.ts', 'src/utils/test-utils.tsx'],
      thresholds: {
        lines: 26.01,
        branches: 19.35,
        functions: 17.25,
        statements: 24.84,
        autoUpdate: true,
      },
    },
  },
});