import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: '/teamRandomTool/',
  // base: '/productPlan/tools/teamRandomTool/',   // 測試機 234 : npm run build
  plugins: [
    vue(),
  ],
})
