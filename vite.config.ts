import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Environment variables that should be exposed to the client
  const clientEnv = {};
  
  // Only expose VITE_ prefixed variables to the client
  for (const key in env) {
    if (key.startsWith('VITE_')) {
      clientEnv[`import.meta.env.${key}`] = JSON.stringify(env[key]);
    }
  }

  return {
    plugins: [react()],
    define: {
      // Expose VITE_ prefixed environment variables to the client
      ...clientEnv,
      // Global constants
      __APP_ENV__: JSON.stringify(env.NODE_ENV || 'production')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      emptyOutDir: true,
    },
    server: {
      port: 3000,
      open: true,
    },
    preview: {
      port: 3000,
      open: true,
    },
  };
});
