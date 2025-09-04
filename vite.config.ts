import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Expose all env variables to the client
  const envWithProcessPrefix = {
    'process.env': `${JSON.stringify(env)}`,
    // Explicitly include VITE_ prefixed variables
    ...Object.entries(env).reduce((prev, [key, val]) => {
      if (key.startsWith('VITE_')) {
        return {
          ...prev,
          [`import.meta.env.${key}`]: JSON.stringify(val)
        };
      }
      return prev;
    }, {})
  };

  return {
    plugins: [react()],
    define: envWithProcessPrefix,
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
