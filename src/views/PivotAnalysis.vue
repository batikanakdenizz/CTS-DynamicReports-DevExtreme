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
import { DxButton } from 'devextreme-vue/button'
// Drill-down popup'ı: pivot hücresinin ARKASINDAKİ ham satırlar
import { DxPopup } from 'devextreme-vue/popup'
import { DxDataGrid } from 'devextreme-vue/data-grid'
import notify from 'devextreme/ui/notify'
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
    {
      // summaryDisplayMode vitrini: aynı sum'ı PivotGrid kendisi genel toplama
      // oranlar — "toplam hacmin yüzde kaçı bu hücrede?" Detaylı veride anlam
      // kazanan hazır özelleştirmelerden (percentOfRow/ColumnGrandTotal da var).
      caption: 'Volume %GT',
      dataField: 'volume',
      summaryType: 'sum',
      summaryDisplayMode: 'percentOfGrandTotal',
      isMeasure: true,
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
  //
  // GİZLİ ÖLÇÜ FİLTRESİ: alanlardaki visible:false yalnız PİVOT hücrelerini
  // gizler; bindChart TÜM data alanlarını seriye çevirir. Yardımcı sum'lar
  // (Theo Volume, Planned Loss Vol...) milyarlık ölçekleriyle yüzde KPI'larını
  // ezer ve legend'ı doldurur. Beyaz liste dışındaki seriler grafikten ve
  // legend'dan düşürülür (pivot hücre hesabı etkilenmez).
  customizeSeries: (seriesName, seriesOptions) => {
    const name = String(seriesName)
    const kpi = name.split(' | ').pop()
    const CHART_KPIS = [
      'Up Time %', 'Reject Loss %', 'Planned DT %', 'Unplanned DT %', 'Rate Loss %',
      'Volume (sum)', 'Stops (sum)', 'MTBF (dk)', 'Volume %GT',
    ]
    if (!CHART_KPIS.includes(kpi)) {
      seriesOptions.visible = false
      seriesOptions.showInLegend = false
      return
    }
    const parts = name.split(' | ')
    seriesOptions.stack = parts.slice(0, -1).join(' | ') || name
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

// --- Excel export (exportPivotGrid) -----------------------------------------
// Grid'dekiyle aynı kalıp, farklı fonksiyon: exportPivotGrid pivot GÖRÜNÜMÜNÜ
// (hiyerarşi girintileri, ara/genel toplamlar dahil) çalışma sayfasına döker.
async function exportExcel() {
  try {
    const [{ exportPivotGrid }, ExcelJSmod, fsMod] = await Promise.all([
      import('devextreme/excel_exporter'),
      import('exceljs'),
      import('file-saver'),
    ])
    const Workbook = ExcelJSmod.Workbook ?? ExcelJSmod.default.Workbook
    const saveAs = fsMod.saveAs ?? fsMod.default
    const workbook = new Workbook()
    const worksheet = workbook.addWorksheet('Pivot')
    await exportPivotGrid({ component: pivotRef.value.instance, worksheet })
    const buffer = await workbook.xlsx.writeBuffer()
    const d = new Date()
    const p = (n) => String(n).padStart(2, '0')
    saveAs(
      new Blob([buffer], { type: 'application/octet-stream' }),
      `pivot-analysis-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.xlsx`
    )
  } catch (err) {
    console.error('[export]', err)
    notify('Export failed — see console for details', 'error', 3000)
  }
}

// --- Pivot düzenini kaydet/yükle (PivotGridDataSource.state) -----------------
// Widget'ın hazır stateStoring'i tek storageKey ile çalışır; bizde İKİ kaynak
// (demo/real, farklı alan setleri) arasında geçiş var — yanlış kaynağın state'i
// diğerine uygulanırdı. Aynı API'nin (state get/set) elle kullanımı hem çakışmayı
// çözer hem mekanizmayı öğretir: state = alanların bölge/expand/filtre/sıralama
// durumu (VERİ DEĞİL) — saved reports'un pivot karşılığı.
const stateKey = () => `pv-pivot-state-${activeSource.value}`

function saveLayout() {
  try {
    const state = pivotRef.value.instance.getDataSource().state()
    localStorage.setItem(stateKey(), JSON.stringify(state))
    notify('Düzen kaydedildi', 'success', 1500)
  } catch (err) {
    console.error('[layout]', err)
    notify('Düzen kaydedilemedi', 'error', 2500)
  }
}

function loadLayout() {
  try {
    const raw = localStorage.getItem(stateKey())
    if (!raw) {
      notify('Bu kaynak için kayıtlı düzen yok', 'warning', 2000)
      return
    }
    pivotRef.value.instance.getDataSource().state(JSON.parse(raw))
    notify('Düzen yüklendi', 'success', 1500)
  } catch (err) {
    console.error('[layout]', err)
    notify('Düzen yüklenemedi', 'error', 2500)
  }
}

// --- Hücre drill-down (createDrillDownDataSource) ----------------------------
// Data hücresine tıkla → o hücreyi oluşturan HAM satırlar popup'ta. Pivot'un
// "bu sayı nereden geldi?" cevabı; denetim/şüphe anlarının özelliği.
const drillVisible = ref(false)
const drillDataSource = ref(null)
const drillTitle = ref('')

function onPivotCellClick(e) {
  if (e.area !== 'data' || !e.cell) return
  const ds = pivotRef.value.instance.getDataSource()
  drillDataSource.value = ds.createDrillDownDataSource(e.cell)
  const path = [...(e.cell.rowPath ?? []), ...(e.cell.columnPath ?? [])]
    .map((v) => (v instanceof Date ? v.toLocaleDateString() : v))
    .join(' · ')
  drillTitle.value = path ? `Ham kayıtlar — ${path}` : 'Ham kayıtlar'
  drillVisible.value = true
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

// NOT: Eskiden burada ölçü çiplerini veri sütunlarıyla hizalayan bir CSS
// transform hilesi vardı. Kaldırıldı — kök nedeni çözmüyordu: çipler DOM'da
// sol üst köşe hücresinde (.dx-data-header) kaldığı için tablo layout'u
// genişliği ORADAN ölçüyor; çok ölçü eklenince (9 KPI ≈ 1000px şerit) satır
// başlık kolonu ekranın yarısını yutuyordu. Çözüm: ölçü çipleri panelde hiç
// gösterilmiyor (fieldPanel.showDataFields:false) — ölçüler Field Chooser'ın
// checkbox'larından yönetiliyor; satır başlıkları da rowHeaderLayout:'tree'
// ile tek kolona indirildi.
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
        <div class="pv-actions">
          <DxButton icon="save" styling-mode="outlined" hint="Pivot düzenini kaydet" @click="saveLayout" />
          <DxButton icon="folder" styling-mode="outlined" hint="Kayıtlı düzeni yükle" @click="loadLayout" />
          <DxButton icon="exportxlsx" type="success" styling-mode="outlined" hint="Excel'e aktar" @click="exportExcel" />
        </div>
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
        @cell-click="onPivotCellClick"
        :scrolling="{ mode: 'virtual' }"
        row-header-layout="tree"
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
          // Ölçü çipleri panelde YOK (bilinçli): DOM'da sol köşe hücresinde
          // yaşıyorlar ve çok ölçüde satır başlık kolonunu şişiriyorlardı.
          // Ölçü ekle/çıkar = Field Chooser checkbox'ları.
          showDataFields: false,
          showFilterFields: true,
        }"
        :field-chooser="{ enabled: true, height: 520 }"
        height="640"
      />

      <!-- Drill-down: hücrenin ham kayıtları. Kolon tanımı YOK — grid satır
           nesnelerinden türetir (iki kaynağın alan setleri farklı, ikisinde de
           çalışsın). -->
      <DxPopup
        v-model:visible="drillVisible"
        :title="drillTitle"
        :width="960"
        :height="560"
        :show-close-button="true"
        :drag-enabled="true"
      >
        <DxDataGrid
          :data-source="drillDataSource"
          :column-auto-width="true"
          :show-borders="true"
          :paging="{ pageSize: 10 }"
          :pager="{ showInfo: true }"
          height="100%"
        />
      </DxPopup>
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
.pv-actions {
  display: flex;
  gap: 0.4rem;
}
.pv-card :deep(.dx-pivotgrid) {
  font-size: 0.82rem;
}
</style>
