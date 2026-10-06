import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// base './' so the static build works from a GitHub Pages subpath
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { environment: 'node' },
})
