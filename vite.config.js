import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // GitHub Pages alt yolu — repo adıyla BİREBİR aynı olmalı, yoksa tüm
  // asset'ler 404 olur ve sayfa beyaz kalır (dev'de de bu alt yoldan servis edilir)
  base: '/CTS-DynamicReports-DevExtreme/',
})
