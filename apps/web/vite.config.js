import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy target is overridable so the Vite dev container can reach the API
// container by service name (docker-compose.dev.yml sets VITE_PROXY_TARGET).
const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Polling for reliable file watching inside Docker (Windows/macOS hosts)
    watch: process.env.VITE_USE_POLLING === 'true'
      ? { usePolling: true, interval: 300 }
      : undefined,
    // trycloudflare assigns a random subdomain each restart; add the current
    // host here, or set allowedHosts: true / VITE_ALLOWED_HOSTS for dev.
    allowedHosts: [
      'urgency-darn-freeway.ngrok-free.dev',
    ],
    proxy: {
      '/api': { target: proxyTarget, changeOrigin: true },
      '/uploads': { target: proxyTarget, changeOrigin: true },
    },
  },
});
