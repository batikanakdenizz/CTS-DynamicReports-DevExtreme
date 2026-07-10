import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // GitHub Pages alt yolu (repo adı) — site kökte değil /CustomReport-DevExtreme/ altında yayınlanır
  base: '/CustomReport-DevExtreme/',
})
