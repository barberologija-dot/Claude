import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The proxy is only used for local testing with dev/server.mjs (see README).
const local = 'http://localhost:54321';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    proxy: { '/auth/v1': local, '/rest/v1': local, '/storage/v1': local, '/dev': local },
  },
});
