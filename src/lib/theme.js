// Basit dark-mode durumu (reactive). İki şeyi birden yapar:
// 1) <html>'e .dark-mode sınıfı → style.css'teki lp-* kabuk değişkenleri değişir
//    (PrimeVue'daki darkModeSelector'ın karşılığı).
// 2) themes.current(...) → DevExtreme bileşenleri index.html'deki dx-theme
//    linkleri arasından koyu/açık stylesheet'e geçer.
// Tercih localStorage'da tutulur.
import { ref } from 'vue'
import themes from 'devextreme/ui/themes'

const KEY = 'cr-dark'
export const isDark = ref(false)

export function applyDark(v) {
  isDark.value = v
  document.documentElement.classList.toggle('dark-mode', v)
  themes.current(v ? 'fluent.blue.dark' : 'fluent.blue.light')
  try {
    localStorage.setItem(KEY, v ? '1' : '0')
  } catch { /* gizli mod / kota — sessiz geç */ }
}

export function toggleDark() {
  applyDark(!isDark.value)
}

// İlk açılış: kayıtlı tercih varsa onu, yoksa işletim sistemi tercihini uygula.
export function initTheme() {
  let v = false
  try {
    const s = localStorage.getItem(KEY)
    if (s === '1') v = true
    else if (s === null) v = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  } catch { /* yok say */ }
  applyDark(v)
}
