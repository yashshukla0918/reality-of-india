import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {APP_NAME} from  './app.config';

export default defineConfig({
  plugins: [react()],
  base: `/${APP_NAME.name}/`,
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})