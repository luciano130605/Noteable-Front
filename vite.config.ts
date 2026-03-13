import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    origin: "https://tzppvmk1-5173.brs.devtunnels.ms",
    headers: {
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': "frame-ancestors *",
    },
    hmr: {
      host: "tzppvmk1-5173.brs.devtunnels.ms",
      protocol: "wss",
      clientPort: 443
    }
  }
})