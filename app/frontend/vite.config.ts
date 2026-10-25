import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Gọi /api/* từ FE => Vite chuyển sang BE, cookie refresh cùng origin nên không cần CORS khi dev.
      // Đổi cổng cho đúng với launchSettings.json của backend.
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
})