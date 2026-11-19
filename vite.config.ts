import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'chrome70',
    cssTarget: 'chrome70',
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
  },
});
