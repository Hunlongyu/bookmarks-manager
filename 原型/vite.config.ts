import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const dependencies = resolve(root, '../frontend/node_modules');
const frontendRequire = createRequire(new URL('../frontend/package.json', import.meta.url));

export default async () => {
  const { default: react } = await import(pathToFileURL(frontendRequire.resolve('@vitejs/plugin-react')).href);
  return {
  root,
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      react: resolve(dependencies, 'react'),
      'react-dom': resolve(dependencies, 'react-dom'),
      '@radix-ui/themes': resolve(dependencies, '@radix-ui/themes'),
      '@radix-ui/react-icons': resolve(dependencies, '@radix-ui/react-icons'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: '127.0.0.1',
    port: 5178,
    strictPort: true,
    fs: { allow: [resolve(root, '..')] },
  },
  build: {
    outDir: resolve(root, '.build'),
    emptyOutDir: true,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 700,
    target: 'es2022',
    rollupOptions: {
      input: resolve(root, 'app.html'),
    },
  },
  };
};
