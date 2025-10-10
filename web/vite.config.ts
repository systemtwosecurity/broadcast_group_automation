import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use port from environment or default to 4500
const API_PORT = process.env.API_PORT || '4501';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4500,
    strictPort: false, // Allow auto-increment if 4500 is taken
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
});

