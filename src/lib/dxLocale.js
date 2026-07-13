// DevExtreme widget İÇ metinlerinin dili (pager "Sayfa 1/4", "No data",
// Field Chooser başlıkları, filtre menüleri...). Bizim i18n.js yalnız KENDİ
// yazdığımız metinleri çevirir; widget'ların gömülü metinleri DevExtreme'in
// localization modülünden gelir — resmî tr.json paketle geliyor.
//
// Ayrı dosya bilinçli: i18n.js framework'süz kalsın (engine katmanı gibi),
// DevExtreme bağımlılığı burada yaşasın.
//
// NOT: locale() çağrısı YENİ kurulan widget'ları etkiler; ekrandakiler eski
// dilde kalır. Bu yüzden App.vue kök elementi :key="locale" ile locale
// değişince ağacı yeniden kurar (dil değişiminde görünüm state'inin
// sıfırlanması kabul edilen bedel).
import { watch } from 'vue'
import { locale as dxLocale, loadMessages } from 'devextreme/localization'
import trMessages from 'devextreme/localization/messages/tr.json'
import { locale } from './i18n.js'

export function initDxLocale() {
  loadMessages(trMessages) // en gömülü varsayılan; tr sözlüğünü kaydet
  dxLocale(locale.value)
  watch(locale, (l) => dxLocale(l))
}
