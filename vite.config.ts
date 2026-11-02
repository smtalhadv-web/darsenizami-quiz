import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project sites are served from /<repo>/, so BASE_URL must match.
// Override with BASE_PATH when the repo name differs.
const base = process.env.BASE_PATH ?? '/darsenizami-quiz/';

export default defineConfig({
  base,
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: false },
});
