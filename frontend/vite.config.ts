// Source - https://stackoverflow.com/a
// Posted by Rakesh
// Retrieved 2026-01-24, License - CC BY-SA 4.0

    // vite.config.js
    import { defineConfig } from 'vite';
    import react from '@vitejs/plugin-react';

    export default defineConfig({
      plugins: [react()],
      server: {
        watch: {
          usePolling: true,
        },
      },
    });
