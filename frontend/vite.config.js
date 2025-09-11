import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Handle Leaflet CSS properly
      'leaflet.css': resolve(__dirname, 'node_modules/leaflet/dist/leaflet.css'),
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "src/styles/globals.scss";`
      }
    }
  },
  server: {
    host: true,
    port: 5174,
    fs: {
      strict: false
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        secure: false,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      },
      '/health': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          leaflet: ['leaflet', 'react-leaflet']
        },
        // Copy Leaflet assets to build output
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'leaflet.css') {
            return 'assets/leaflet.css';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    // Ensure Leaflet CSS is processed correctly
    cssCodeSplit: true,
    minify: 'esbuild',
    target: 'esnext'
  }
});
