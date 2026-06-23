import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase')) return 'firebase';
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/motion/')) return 'motion';
          if (id.includes('node_modules/@tsparticles')) return 'particles';
          if (id.includes('node_modules/@phosphor-icons') || id.includes('node_modules/phosphor-react')) return 'icons';
          if (id.includes('node_modules/react-router')) return 'router';
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react-vendor';
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react-router-dom',
      'framer-motion',
      '@tsparticles/react',
      '@tsparticles/engine',
      '@tsparticles/slim',
      'cobe',
    ],
  },
});
