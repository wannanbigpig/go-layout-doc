import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'static',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        docs: resolve(__dirname, 'docs/index.html'),
        api: resolve(__dirname, 'api/index.html')
      },
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/vue')) {
            return 'vue'
          }
        }
      }
    }
  }
})
