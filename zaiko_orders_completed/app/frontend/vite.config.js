import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Django(8000) へ API をプロキシ。Cookie も同一オリジン扱いになるので CSRF も楽です。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/admin': 'http://127.0.0.1:8000'
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Django 側のテンプレートが固定パスで参照できるようにしておく
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/chunk-[hash].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})
