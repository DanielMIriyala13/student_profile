import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/student_profile/',
  build: {
    sourcemap: false,
  },
  server: {
    proxy: {
      '/student_profile/mad': {
        target: 'http://localhost:6002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/student_profile\/mad/, '/mad'),
      },
      '/student_profile/uploads': {
        target: 'http://localhost:6002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/student_profile\/uploads/, '/uploads'),
      },
    },
  },
})
