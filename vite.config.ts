import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'lucide': ['lucide-react'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://api.pawatasty.com',
        changeOrigin: true,
        secure: true,
      },
      '/uploads': {
        target: 'https://api.pawatasty.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
