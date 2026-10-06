import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative URLs: extension/panel.ts rewrites them to webview URIs.
  base: './',
  build: { outDir: 'dist/webview' },
})
