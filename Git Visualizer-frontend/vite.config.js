import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Port 5173 is one of the origins allowed by the backend's CORS config.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
});
