import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import compression from 'vite-plugin-compression';
import crmProxyPlugin from './scripts/vite-crm-proxy-plugin.js';

export default defineConfig({
  define: {
    'process.env.FRAMER_MOTION_API_KEY': JSON.stringify('fr_4pr81nbwcb8p1baxsxxkwjw3gr'),
  },
  plugins: [
    react(),

    // Gzip compression — compress files > 10kb
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240,
    }),

    // Brotli compression (smaller than gzip)
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
    }),

    crmProxyPlugin(),
  ],

  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // Generate property PDFs through the deployed serverless function
      // so local dev behaves exactly like production.
      '/api/property-pdf': {
        target: 'https://www.vjrestate.com',
        changeOrigin: true,
      },
    },
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: true,
    sourcemap: false,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 500,

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase')) return 'vendor-firebase';
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/motion/')) return 'vendor-motion';
          // NOTE: tsparticles must NOT get a manual chunk — forcing one made
          // Rollup colocate a shared fetch helper (used by supabase-js in the
          // entry) into the particles chunk, eagerly loading ~63KB of the
          // particles engine on every page.
          // Phosphor icons tree-shake with @phosphor-icons/react — no manual
          // vendor chunk; unused icons get dropped per-page automatically.
          if (id.includes('node_modules/react-router')) return 'vendor-router';
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'vendor-react';
          // NOTE: never bucket lazily-loaded libs (jspdf, html2canvas, three,
          // generative-ai, tsparticles). A manual chunk for a lazy lib makes
          // Rollup colocate shared helpers (e.g. supabase's fetch polyfill)
          // INTO that bucket — which then gets statically imported by the
          // entry, eagerly loading hundreds of KB. Rollup's automatic
          // code-splitting places lazy libs in their own chunks safely.
          // recharts intentionally kept in main bundle to avoid forwardRef/React context issues

        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },

    esbuild: {
      drop: ['debugger'],
    },
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'firebase/app',
      'firebase/firestore',
      'firebase/auth',
      'framer-motion',
      '@tsparticles/react',
      '@tsparticles/engine',
      '@tsparticles/slim',
      'cobe',
      'recharts',
    ],
  },
});
