import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-dropdown-menu',
            'lucide-react'
          ],
          // Chart libraries (heavy)
          'charts-vendor': ['recharts'],
          // Form libraries
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Date utilities
          'date-vendor': ['date-fns', 'react-day-picker'],
          // PDF generation
          'pdf-vendor': ['pdf-lib'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase warning limit temporarily
    cssCodeSplit: true, // Enable CSS code splitting
  },
  css: {
    devSourcemap: false, // Disable CSS sourcemaps in production
    preprocessorOptions: {
      scss: {
        additionalData: `@import "tailwindcss";`,
      },
    },
  },
})
