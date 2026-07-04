import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import compression from 'vite-plugin-compression';

export default defineConfig({
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
  ],

  server: {
    host: '0.0.0.0',
    port: 5173,
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
          if (id.includes('node_modules/@tsparticles')) return 'vendor-particles';
          if (id.includes('node_modules/@phosphor-icons') || id.includes('node_modules/phosphor-react')) return 'vendor-icons';
          if (id.includes('node_modules/react-router')) return 'vendor-router';
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'vendor-react';
          if (id.includes('node_modules/@react-google-maps/api')) return 'vendor-maps';
          if (id.includes('node_modules/@google/generative-ai')) return 'vendor-ai';
          if (id.includes('node_modules/jspdf')) return 'vendor-pdf';
          if (id.includes('node_modules/html2canvas')) return 'vendor-canvas';
          if (id.includes('node_modules/three')) return 'vendor-three';
          if (id.includes('node_modules/@react-three')) return 'vendor-three';
          if (id.includes('node_modules/recharts')) return 'vendor-charts';
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },

    esbuild: {
      drop: ['console', 'debugger'],
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
    ],
  },
});
