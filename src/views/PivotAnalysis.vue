<script setup>
// PIVOT ANALYSIS — DxPivotGrid POC.
// Custom Report'un rakibi değil tamamlayıcısı: builder = grafik odaklı hazır
// rapor; pivot = serbest çok boyutlu keşif (satır × sütun çapraz matris,
// hiyerarşi aç/kapa, ara/genel toplamlar, alanları sürükleyerek yeniden kurgu).
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { DxPivotGrid } from 'devextreme-vue/pivot-grid'
// bindChart entegrasyonu: grafik pivot state'inden beslenir (satır=seri,
// sütun=argüman). Seri/eksen tanımını BİZ yazmayız — pivot üretir.
import { DxChart, DxCommonSeriesSettings, DxSize, DxTooltip, DxLegend } from 'devextreme-vue/chart'
import { DxButtonGroup } from 'devextreme-vue/button-group'
// DataSource ayrı bir sınıf: alan tanımları + veri deposu + pivot durumu
// (hangi alan hangi bölgede) hep bu nesnede yaşar. Grid sadece çizer.
import PivotGridDataSource from 'devextreme/ui/pivot_grid/data_source'
import { generateDetailedRows } from '../data/detailedData.js'
import { loadRealKpiRows } from '../data/realKpiData.js'

// İki veri kaynağı: demo (vardiya×makine×ürün granülü, üretilmiş) ve gerçek
// sistem export'u (line×gün granülü, gitignore'lu dosyadan; yoksa boş).
// 730 gün = 2 tam yıl: Year/Quarter/Month hiyerarşisi gerçekten dallansın
// (30 günde sadece 2 ay görünüyordu). 2 hat × 730 gün × 3 vardiya × 3 makine
// = 13.140 satır — virtual scrolling ile sorunsuz.
const demoRows = generateDetailedRows(730)
const realRows = loadRealKpiRows()

// --- KPI yardımcıları -------------------------------------------------------
// Kural: yüzdeler ORTALANMAZ. Gizli 'sum' alanları (visible:false) her hücrede
// pay/paydayı toplar; calculateSummaryValue toplamlar üstünden oranı kurar.
// Böylece %100 invariant'ı ara toplamda da genel toplamda da tutar.
// isMeasure:true KRİTİK: hesaplanmış alanların satır/sütunda grup anahtarı
// olacak ham değeri yok — sürüklenirse başlıklar "[object Object]" olur.
// isMeasure alanı yalnız DATA bölgesine kilitler (chooser/panel reddeder).
const hiddenSum = (name) => ({
  name,
  dataField: name,
  summaryType: 'sum',
  area: 'data',
  visible: false,
  isMeasure: true,
})

const pct = { type: 'fixedPoint', precision: 2 }
const ratioKpi = (caption, num) => ({
  caption,
  area: 'data',
  format: pct,
  isMeasure: true,
  calculateSummaryValue: (cell) => {
    const den = cell.value('theoVolume')
    return den ? (cell.value(num) / den) * 100 : null
  },
})

// --- Boyutlar (kaynağa göre değişir) ----------------------------------------
// bindChart notu: her görünür satır yaprağı × KPI bir SERİ olur; hiyerarşi
// açık başlarsa legend patlar → boyutlar kapalı (expanded yok) başlar.
const DEMO_DIMENSIONS = [
  // SATIR: Line > Machine hiyerarşisi (dizideki sıra = iç içe seviye).
  // width şart: pivot tam genişliğe yayılır, veri sütunu azken artan boşluk
  // satır kolonlarına dağılıp onları devasa yapıyor — sabit genişlikle artık
  // veri sütunlarına gider.
  { caption: 'Line', dataField: 'line', area: 'row', width: 180 },
  { caption: 'Machine', dataField: 'machine', area: 'row', width: 150 },
  // SÜTUN: tarih hiyerarşisi — aynı dataField, farklı groupInterval.
  // (Not: ISO hafta yok; istenirse selector ile custom alan yazılır.)
  { caption: 'Year', dataField: 'date', dataType: 'date', groupInterval: 'year', area: 'column' },
  { caption: 'Quarter', dataField: 'date', dataType: 'date', groupInterval: 'quarter', area: 'column' },
  { caption: 'Month', dataField: 'date', dataType: 'date', groupInterval: 'month', area: 'column' },
  // FİLTRE: kullanıcı isterse satıra/sütuna sürükler (fieldPanel)
  { caption: 'Shift', dataField: 'shift', area: 'filter' },
  { caption: 'Product', dataField: 'product', area: 'filter' },
]

// Gerçek export line×gün granülünde — makine/vardiya/ürün boyutu YOK. Pivot
// ancak verinin granülü kadar detay sunar; daha zengin boyut istenirse
// sistemden vardiya/duruş granüllü export gerekir (şirkete iletilecek not).
// Gün seviyesi eklendi: tek yıl/ay olsa da satır sayısı gün bazında.
const REAL_DIMENSIONS = [
  { caption: 'Line', dataField: 'line', area: 'row', width: 180 },
  { caption: 'Year', dataField: 'date', dataType: 'date', groupInterval: 'year', area: 'column' },
  { caption: 'Month', dataField: 'date', dataType: 'date', groupInterval: 'month', area: 'column' },
  { caption: 'Day', dataField: 'date', dataType: 'date', groupInterval: 'day', area: 'column' },
]

// --- Ortak ölçüler ------------------------------------------------------------
// realKpiData loader alan adlarını detailedData ile hizalar (theoVolume, volume,
// reject, plannedLossVol, unplannedLossVol...) → tek ölçü seti iki kaynakta da
// değişmeden çalışır. Fonksiyon (paylaşılan sabit değil): her PivotGridDataSource
// kendi field nesnelerini alsın, state sızmasın.
function measureFields() {
  return [
    // Gizli paydalar/paylar — hücre başına sum
    hiddenSum('theoVolume'),
    hiddenSum('volume'),
    hiddenSum('reject'),
    hiddenSum('plannedLossVol'),
    hiddenSum('unplannedLossVol'),
    hiddenSum('numberOfStops'),
    hiddenSum('totalRuntime'),

    // Görünür KPI'lar — 5 kova (toplamları her hücre kümesinde ~%100;
    // gerçek veride Rate Loss negatif olabilir: hat teorik hızın üstünde koşmuş)
    ratioKpi('Up Time %', 'volume'),
    ratioKpi('Reject Loss %', 'reject'),
    ratioKpi('Planned DT %', 'plannedLossVol'),
    ratioKpi('Unplanned DT %', 'unplannedLossVol'),
    {
      caption: 'Rate Loss %',
      area: 'data',
      format: pct,
      isMeasure: true,
      calculateSummaryValue: (cell) => {
        const t = cell.value('theoVolume')
        if (!t) return null
        const rest =
          t - cell.value('volume') - cell.value('reject') -
          cell.value('plannedLossVol') - cell.value('unplannedLossVol')
        return (rest / t) * 100
      },
    },

    // Chooser'da bekleyen ek ölçüler (varsayılan görünmez; kullanıcı data
    // bölgesine sürükler)
    { caption: 'Volume (sum)', dataField: 'volume', summaryType: 'sum', isMeasure: true, format: { type: 'fixedPoint', precision: 0 } },
    { caption: 'Stops (sum)', dataField: 'numberOfStops', summaryType: 'sum', isMeasure: true, format: { type: 'fixedPoint', precision: 0 } },
    {
      // MTBF de pay/payda kuralına örnek: ORTALANMAZ, toplamlardan kurulur —
      // sum(çalışma süresi) / sum(duruş sayısı). Raporun satır MTBF'iyle satır
      // seviyesinde birebir, üst seviyelerde doğru ağırlıklı birleşim.
      caption: 'MTBF (dk)',
      format: { type: 'fixedPoint', precision: 1 },
      isMeasure: true,
      calculateSummaryValue: (cell) => {
        const stops = cell.value('numberOfStops')
        return stops ? cell.value('totalRuntime') / stops : null
      },
    },
  ]
}

function makeDataSource(sourceKey) {
  return new PivotGridDataSource({
    // retrieveFields kapalı: alanları veriden otomatik türetmesin, katalog gibi
    // biz tanımlayalım (tip/alan kontrolü bizde kalır)
    retrieveFields: false,
    store: sourceKey === 'real' ? realRows : demoRows,
    fields: [...(sourceKey === 'real' ? REAL_DIMENSIONS : DEMO_DIMENSIONS), ...measureFields()],
  })
}

// Template'e verilen İLK kaynak; sonraki geçişler instance option'ıyla yapılır
// (onSourceChanged) — template prop'u sabit kalır, çakışma olmaz.
const dataSource = makeDataSource('demo')

// --- Chart entegrasyonu (bindChart) ----------------------------------------
// bindChart instance API'sidir, prop değil: iki bileşen de mount olduktan
// sonra bir kez bağlanır; sonrası otomatik (expand/filtre/sürükleme grafiğe
// anında yansır). Dönen fonksiyon bağı çözer — view değişince sızıntı olmasın.
const pivotRef = ref(null)
const chartRef = ref(null)
let unbindChart = null

const BIND_OPTIONS = {
  // 5 görünür KPI da yüzde → tek eksen yeter. Kullanıcı chooser'dan
  // Volume (adet) eklerse ölçekler çakışır; o senaryoda 'splitPanes'
  // (ölçü başına ayrı pane — demodaki Total/Count görünümü) tercih edilir.
  dataFieldsDisplayMode: 'singleAxis',
  // Ölçüler seri olarak kalsın (argüman eksenine taşınmasın)
  putDataFieldsInto: 'series',
  alternateDataFields: false,
  // Stacked tipler için yığın anahtarı. Seri adı 'satır yolu | KPI'
  // biçiminde ("Link-up 38 | Up Time %" veya makine açıkken
  // "Link-up 38 | Filler | Up Time %"). Son parça (KPI) atılır, kalan
  // satır yolu stack olur → her satır grubu KENDİ yığınında %100'e
  // tamamlanır. Bunsuz tüm seriler tek yığına biner (%200 kule).
  // stack özelliği stacked olmayan tiplerde yok sayılır — hep set etmek zararsız.
  customizeSeries: (seriesName, seriesOptions) => {
    const parts = String(seriesName).split(' | ')
    seriesOptions.stack = parts.slice(0, -1).join(' | ') || String(seriesName)
  },
}

onMounted(() => {
  unbindChart = pivotRef.value.instance.bindChart(chartRef.value.instance, BIND_OPTIONS)
})

// --- Veri kaynağı seçici -----------------------------------------------------
// bindChart bağı kurulduğu ANDAKİ dataSource'a abone olur; kaynak değişince
// eski bağ çözülüp yeni dataSource set edildikten SONRA yeniden bağlanır.
const DATA_SOURCES = [
  { value: 'demo', text: 'Demo ' },
  // Gerçek export dosyası gitignore'lu — bu makinede yoksa buton pasif
  { value: 'real', text: '', disabled: realRows.length === 0 },
]
const activeSource = ref('demo')
const selectedSourceKeys = computed(() => [activeSource.value])
function onSourceChanged(e) {
  const val = e.addedItems[0]?.value
  if (!val || val === activeSource.value) return
  activeSource.value = val
  const pivot = pivotRef.value.instance
  if (unbindChart) unbindChart()
  pivot.option('dataSource', makeDataSource(val))
  unbindChart = pivot.bindChart(chartRef.value.instance, BIND_OPTIONS)
}

// --- Grafik tipi seçici ------------------------------------------------------
// bindChart tipe karışmaz; tip commonSeriesSettings'ten gelir ve reaktif
// değişebilir. Pie YOK: bindChart yalnız DxChart'a bağlanır (matris veri).
const CHART_TYPES = [
  { value: 'bar', text: 'Bar' },
  { value: 'stackedbar', text: 'Stacked' },
  { value: 'fullstackedbar', text: '%100' },
  { value: 'line', text: 'Line' },
  { value: 'spline', text: 'Spline' },
  { value: 'area', text: 'Area' },
]
const chartType = ref('bar')
const selectedTypeKeys = computed(() => [chartType.value])
function onTypeChanged(e) {
  const val = e.addedItems[0]?.value
  if (val) chartType.value = val
}

// CustomReport dersi: çizgi tiplerinde tek argümanlı seri (tek yıl kapalı
// görünüm) nokta görünmezse boş sanılır — çizgi ailesinde noktaları aç.
const pointSettings = computed(() => ({
  visible: ['line', 'spline', 'area'].includes(chartType.value),
  size: 7,
}))

onBeforeUnmount(() => {
  if (unbindChart) unbindChart()
})

// Pivot hücre formatı grafiğe otomatik taşınmaz; tooltip'i elle kuruyoruz.
const customizeChartTooltip = ({ seriesName, value }) => ({
  text: `${seriesName}: ${Number.isFinite(value) ? value.toFixed(2) : '—'}`,
})

// --- Ölçü çiplerini veri sütunlarıyla hizala ----------------------------------
// İstek: üst şeritteki ÖLÇÜ çipleri (Up Time %, Reject Loss %...) widget'ın
// sol kenarından değil, veri sütunlarının (2026 başlığının) başladığı hizadan
// başlasın; sığmazsa sola taşsın. DOM'da ölçü çipleri sol üst köşe hücresinde
// (.dx-data-header), kolon çipleri (Year/Month/Day) o hizada başlayan
// .dx-column-header hücresinde.
// YÖNTEM: CSS transform ile GÖRSEL kaydırma. Çip gruplarını başka hücreye
// TAŞIMAK yasak — DevExtreme'in sürükleme motoru grup elemanlarının DOM
// konumuna göre drop hedefi çözüyor, taşınan grup sürükle-bırakı bozuyor
// (yaşandı: çip kaldırılıp geri eklenemedi). transform DOM'a dokunmaz ama
// hit-testing'i görüntüyle birlikte taşır — bırakma noktaları tutarlı kalır.
// Hesap: ölçü grubu hedefte descW'ye (sol kolon genişliği) kayar; kolon grubu
// onun bittiği yere. Toplam şerit sığmıyorsa kayma kısılır → sola taşma.
// contentReady her yeniden çizimde tetiklenir — hiza güncel kalır.
function chipsWidth(area) {
  // .dx-area-fields tablosu hücreyi doldurabilir; gerçek içerik genişliği =
  // son çipin sağ kenarı - alanın sol kenarı. Alan BOŞKEN tablo hücrenin
  // tamamına yayılır — genişliğini olduğu gibi almak "şerit sığmıyor" yanılgısı
  // yaratıp kaydırmayı sıfırlıyordu; boşta placeholder metni ölçülür.
  const chips = area.querySelectorAll('.dx-area-field')
  if (chips.length) {
    return chips[chips.length - 1].getBoundingClientRect().right - area.getBoundingClientRect().left
  }
  const empty = area.querySelector('.dx-empty-area-text')
  return empty ? empty.getBoundingClientRect().width : 0
}

function onPivotContentReady(e) {
  const root = e.element
  const dataHeaderCell = root.querySelector('.dx-data-header')
  const dataFields = dataHeaderCell?.querySelector('.dx-area-fields')
  const columnFields = root.querySelector('.dx-column-header .dx-area-fields')
  if (!dataHeaderCell || !dataFields) return
  // Önce sıfırla ki ölçümler doğal konumdan yapılsın
  dataFields.style.transform = ''
  if (columnFields) columnFields.style.transform = ''
  const descW = dataHeaderCell.getBoundingClientRect().width
  const totalW = dataHeaderCell.parentElement.getBoundingClientRect().width
  const dataW = chipsWidth(dataFields)
  const colW = columnFields ? chipsWidth(columnFields) : 0
  // Hedef: descW'den başla; şerit (dataW+colW) toplam genişliğe sığmıyorsa
  // başlangıcı sola çek (min 0 — widget dışına çıkma)
  const startX = Math.max(0, Math.min(descW, totalW - (dataW + colW)))
  dataFields.style.transform = `translateX(${startX}px)`
  if (columnFields) {
    // Kolon grubu doğal olarak descW'de; ölçülerin bittiği noktaya götür
    columnFields.style.transform = `translateX(${startX + dataW - descW}px)`
  }
}
</script>

<template>
  <div>
    <div class="lp-page-head">
      <div>
        <h1 class="lp-page-title">Pivot Analysis</h1>
        <div class="lp-breadcrumb">Reports · General Reports · Pivot Analysis (POC)</div>
      </div>
    </div>

    <div class="lp-card pv-card">
      <!-- Grafik pivotun ÜSTÜNDE (demo düzeni): kendi data-source'u YOK,
           bindChart pivottan besler. Seri/eksen tanımı da yok — pivot üretir. -->
      <div class="pv-chart-toolbar">
        <DxButtonGroup
          :items="DATA_SOURCES"
          key-expr="value"
          :selected-item-keys="selectedSourceKeys"
          selection-mode="single"
          styling-mode="outlined"
          @selection-changed="onSourceChanged"
        />
        <DxButtonGroup
          :items="CHART_TYPES"
          key-expr="value"
          :selected-item-keys="selectedTypeKeys"
          selection-mode="single"
          styling-mode="outlined"
          @selection-changed="onTypeChanged"
        />
      </div>
      <DxChart ref="chartRef">
        <DxSize :height="320" />
        <DxCommonSeriesSettings :type="chartType" :point="pointSettings" />
        <DxTooltip :enabled="true" :customize-tooltip="customizeChartTooltip" />
        <DxLegend vertical-alignment="top" horizontal-alignment="right" />
      </DxChart>

      <!-- fieldPanel: grid üstünde sürükle-bırak bölgeleri (satır/sütun/veri/filtre)
           fieldChooser: sağ tık / ikon ile açılan popup alan seçici -->
      <DxPivotGrid
        ref="pivotRef"
        :data-source="dataSource"
        @content-ready="onPivotContentReady"
        :allow-sorting-by-summary="true"
        :allow-sorting="true"
        :allow-filtering="true"
        :allow-expand-all="true"
        :show-borders="true"
        :field-panel="{
          visible: true,
          allowFieldDragging: true,
          showRowFields: true,
          showColumnFields: true,
          showDataFields: true,
          showFilterFields: true,
        }"
        :field-chooser="{ enabled: true, height: 520 }"
        height="640"
      />
    </div>
  </div>
</template>

<style scoped>
.pv-card {
  padding: 1rem 1.1rem;
}
.pv-chart-toolbar {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.pv-card :deep(.dx-pivotgrid) {
  font-size: 0.82rem;
}
</style>
