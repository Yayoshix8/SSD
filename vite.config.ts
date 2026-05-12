import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      // Rewrite /register → /?register so the SPA detects the route
      name: 'register-rewrite',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/register' || req.url?.startsWith('/register?')) {
            req.url = '/?register';
          }
          next();
        });
      },
    },
  ],
});
