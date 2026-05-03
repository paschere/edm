import { defineConfig } from 'vite'
import shopify from 'vite-plugin-shopify'

export default defineConfig({
  plugins: [
    shopify({
      themeRoot: './',
      sourceCodeDir: 'frontend',
      entrypointsDir: 'frontend/entrypoints',
    }),
  ],
  build: {
    emptyOutDir: false,
  },
  css: {
    postcss: './postcss.config.cjs',
  },
})
