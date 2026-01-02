import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp|avif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'react-vendor'
          }
          
          // Firebase - separar por módulo para mejor tree shaking
          if (id.includes('firebase')) {
            if (id.includes('auth')) return 'firebase-auth'
            if (id.includes('firestore')) return 'firebase-firestore'
            return 'firebase-core'
          }
          
          // Radix UI - separar por componente para tree shaking
          if (id.includes('@radix-ui')) {
            if (id.includes('dialog')) return 'radix-dialog'
            if (id.includes('select')) return 'radix-select'
            if (id.includes('tabs')) return 'radix-tabs'
            if (id.includes('dropdown')) return 'radix-dropdown'
            return 'radix-ui'
          }
          
          // Chart libraries - mantener separado
          if (id.includes('recharts')) {
            return 'charts-vendor'
          }
          
          // Form libraries
          if (id.includes('react-hook-form') || id.includes('@hookform/resolvers') || id.includes('zod')) {
            return 'form-vendor'
          }
          
          // Date utilities
          if (id.includes('date-fns') || id.includes('react-day-picker')) {
            return 'date-vendor'
          }
          
          // PDF generation - lazy load
          if (id.includes('pdf-lib')) {
            return 'pdf-vendor'
          }
          
          // Icons
          if (id.includes('lucide-react')) {
            return 'icons-vendor'
          }
          
          // UI components shadcn
          if (id.includes('class-variance-authority') || id.includes('clsx') || id.includes('tailwind-merge')) {
            return 'ui-utils'
          }
        },
      },
    },
    chunkSizeWarningLimit: 800,
    cssCodeSplit: true,
    minify: 'esbuild',
    target: 'es2020',
  },
  css: {
    devSourcemap: false,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'firebase/auth',
      'firebase/firestore',
    ],
  },
  server: {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  },
})
