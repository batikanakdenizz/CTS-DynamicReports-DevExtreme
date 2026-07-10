import { createApp } from 'vue'
// DevExtreme temaları artık index.html'deki rel="dx-theme" linklerinden gelir
// (light + dark birlikte); themes modülü aktif olanı yönetir. Renk override'ları
// style.css'te (--dx-color-*).
import themes from 'devextreme/ui/themes'
import './style.css'
import App from './App.vue'
import { initTheme } from './lib/theme.js'
import { initI18n } from './lib/i18n.js'

// Kayıtlı tema / dil tercihini mount'tan önce uygula (flash olmasın)
initTheme()
initI18n()

// Tema stylesheet'i hazır olmadan mount etme (stilsiz içerik parlaması olmasın)
themes.initialized(() => {
  createApp(App).mount('#app')
})
