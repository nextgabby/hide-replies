import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    // Disable lightningcss to avoid native binary issues on Render
    transformer: 'postcss',
  },
  build: {
    cssMinify: 'esbuild',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
