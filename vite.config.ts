import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        // Mantém o Host original para a checagem de origem da API funcionar igual à produção.
        configure: (proxy) => proxy.on('proxyReq', (req, incoming) => incoming.headers.host && req.setHeader('host', incoming.headers.host)),
      },
    },
  },
})
