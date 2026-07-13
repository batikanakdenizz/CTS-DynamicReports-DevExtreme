import { createApp } from 'vue'
// DevExtreme temaları artık index.html'deki rel="dx-theme" linklerinden gelir
// (light + dark birlikte); themes modülü aktif olanı yönetir. Renk override'ları
// style.css'te (--dx-color-*).
import themes from 'devextreme/ui/themes'
import './style.css'
import App from './App.vue'
import { initTheme } from './lib/theme.js'
import { initI18n } from './lib/i18n.js'
import { initDxLocale } from './lib/dxLocale.js'

// Kayıtlı tema / dil tercihini mount'tan önce uygula (flash olmasın)
initTheme()
initI18n()
initDxLocale() // initI18n'den SONRA: kayıtlı dili DevExtreme'e de uygular

// Tema stylesheet'i hazır olmadan mount etme (stilsiz içerik parlaması olmasın).
// EMNİYET: tema CSS'i yüklenemezse themes.initialized HİÇ ateşlenmez ve sayfa
// sonsuza dek beyaz kalır — 3 sn sonra her koşulda mount eden fallback şart.
let mounted = false
function mountApp() {
  if (mounted) return
  mounted = true
  createApp(App).mount('#app')
}
themes.initialized(mountApp)
setTimeout(mountApp, 3000)
