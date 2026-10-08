import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// أثناء التطوير: الواجهة على 5173 وتمرّر /api و /uploads إلى السيرفر على 3000
// (هنا مكان "ربط الواجهة بالباك اند" — لو غيّرت منفذ السيرفر غيّره هنا)
const BACKEND = process.env.BACKEND ?? 'http://127.0.0.1:3000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: false },
      '/uploads': { target: BACKEND, changeOrigin: false },
    },
  },
  build: { chunkSizeWarningLimit: 900 },
});
