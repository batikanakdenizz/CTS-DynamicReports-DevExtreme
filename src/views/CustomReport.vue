<script setup>
import { ref, computed, onMounted } from 'vue'
// PrimeVue Drawer viewport üstüne açılan bir overlay'di; DxDrawer ise bir LAYOUT
// bileşeni: default slot'taki içeriği sarar, paneli 'template' prop'unda verilen
// named template'ten alır ve 'overlap' modunda içeriğin üstüne kaydırır.
import { DxDrawer } from 'devextreme-vue/drawer'
import { DxTagBox } from 'devextreme-vue/tag-box'
import { DxButtonGroup } from 'devextreme-vue/button-group'
import { DxDateBox } from 'devextreme-vue/date-box'
import { DxButton } from 'devextreme-vue/button'
import { DxDataGrid, DxColumn, DxPaging, DxPager } from 'devextreme-vue/data-grid'
import { DxSelectBox } from 'devextreme-vue/select-box'
import { DxTextBox } from 'devextreme-vue/text-box'
import notify from 'devextreme/ui/notify'
// Grafikler: Chart.js yerine DevExtreme'in SVG tabanlı viz bileşenleri.
// Chart ve PieChart AYRI bileşenler (Chart.js'te tek Chart + type prop'uydu).
// Alt-konfigürasyon bileşenlerinin adları çakıştığı için pie olanları alias'lıyoruz.
import {
  DxChart,
  DxSeries,
  DxCommonSeriesSettings,
  DxArgumentAxis,
  DxValueAxis,
  DxTitle,
  DxLegend,
  DxTooltip,
  DxZoomAndPan,
  DxPoint,
  DxConstantLine,
  DxLabel,
} from 'devextreme-vue/chart'
import {
  DxPieChart,
  DxSeries as DxPieSeries,
  DxLegend as DxPieLegend,
  DxTooltip as DxPieTooltip,
} from 'devextreme-vue/pie-chart'

import { generateRows, LINE_OPTIONS } from '../data/dummyData.js'
import {
  MEASURES,
  MEASURE_OPTIONS,
  MEASURE_MAP,
  DIMENSIONS,
  DATE_GRANULARITIES,
  CHART_TYPES,
  CHART_PALETTE,
} from '../data/reportCatalog.js'
import { runReport, formatValue } from '../lib/reportEngine.js'
import { t } from '../lib/i18n.js'
import { isDark } from '../lib/theme.js'

// Ortak veri kaynağı (shell'in generateRows'u)
const allRows = generateRows(30)

// Kriter paneli (Report Builder) drawer içinde: Show/Hide ile açılıp kapanır
const builderOpen = ref(false)

// Tarihler preset gelir: bitiş = bugün, başlangıç = 29 gün öncesi (son 30 gün).
// Dummy data da bugüne göre üretildiği için bu aralık her zaman veriyi kapsar.
const today = new Date()
today.setHours(0, 0, 0, 0)
const daysAgo = (n) => {
  const d = new Date(today)
  d.setDate(today.getDate() - n)
  return d
}

// Varsayılan filtre değerleri — hem ilk açılışta hem Reset'te kullanılır.
// Reset ekranı BOŞALTMAZ; kullanıcıyı veri gösteren bu makul duruma geri getirir.
const DEFAULT_LINE = LINE_OPTIONS[0].value // 'Link-up 38'
const makeDefaults = () => ({
  measures: ['upTime', 'unplannedDowntimeLoss', 'rateLoss', 'rejectLoss'],
  dimensions: ['line'],
  granularity: 'day',
  chartType: 'bar',
  lines: [DEFAULT_LINE],
  startDate: daysAgo(29),
  endDate: new Date(today),
})

// --- Report definition state (PrimeVue sürümüyle birebir aynı model) ---
const d0 = makeDefaults()
const selectedMeasures = ref(d0.measures)
const selectedDimensions = ref(d0.dimensions)
const dateGranularity = ref(d0.granularity)
const chartType = ref(d0.chartType)
const startDate = ref(d0.startDate)
const endDate = ref(d0.endDate)
const selectedLines = ref(d0.lines)

// DxTagBox gruplu veri {key, items} bekler (PrimeVue: optionGroupLabel/Children'dı)
const measureItems = MEASURE_OPTIONS.map((g) => ({ key: g.label, items: g.items }))
const dimensionItems = DIMENSIONS.map((d) => ({ label: d.label, value: d.key }))

// DxButtonGroup item'ları: text/value (topbar'daki dil seçiciyle aynı kalıp)
const granularityItems = DATE_GRANULARITIES.map((g) => ({ text: g.label, value: g.value }))
const chartTypeItems = CHART_TYPES.map((c) => ({ text: c.label, value: c.value }))

const showGranularity = computed(() => selectedDimensions.value.includes('date'))

function onGranularityChanged(e) {
  const v = e.addedItems[0]?.value
  if (v) dateGranularity.value = v
}
function onChartTypeChanged(e) {
  const v = e.addedItems[0]?.value
  if (v) chartType.value = v
}

// --- Motor bağlantısı: definition -> runReport -> { columns, rows } ---
const definition = computed(() => ({
  measures: selectedMeasures.value,
  dimensions: selectedDimensions.value,
  dateGranularity: dateGranularity.value,
  filters: {
    dateFrom: startDate.value,
    dateTo: endDate.value,
    lines: selectedLines.value,
  },
}))

const report = computed(() => runReport(definition.value, allRows))
const hasData = computed(() => selectedMeasures.value.length > 0 && report.value.rows.length > 0)

// ============================ GRAFİK ============================
// Chart.js'te labels/datasets dizileri kuruyorduk; DxChart ise DataGrid gibi
// KAYIT dizisi + alan adlarıyla çalışır: argumentField = grup etiketi,
// her measure bir <DxSeries value-field> olur.
const groupLabel = (row) =>
  selectedDimensions.value.length
    ? selectedDimensions.value.map((d) => row[d]).join(' / ')
    : 'Total'

const chartRows = computed(() =>
  report.value.rows.map((r) => ({ ...r, __group: groupLabel(r) }))
)

// 'stacked' bizim katalog adımız; DevExtreme'de seri tipi 'stackedbar'
const dxSeriesType = computed(() =>
  chartType.value === 'stacked' ? 'stackedbar' : chartType.value === 'line' ? 'line' : 'bar'
)

// Measure'ın anlamsal rengi varsa onu, yoksa kategorik paletten sırayla renk ver.
const measureColor = (mkey, i) => MEASURE_MAP[mkey]?.color ?? CHART_PALETTE[i % CHART_PALETTE.length]

// Çift Y ekseni: yüzde ve sayı ölçümleri birlikte seçilmişse yüzdeler solda
// ('pct'), sayılar sağda ('num') ayrı eksene gider (ölçek birbirini ezmesin).
const measureFmt = (mkey) => MEASURE_MAP[mkey]?.format
const isMixedAxis = computed(() => {
  const fmts = selectedMeasures.value.map(measureFmt)
  return fmts.some((f) => f === 'pct') && fmts.some((f) => f && f !== 'pct')
})
const axisFor = (mkey) =>
  isMixedAxis.value ? (measureFmt(mkey) === 'pct' ? 'pct' : 'num') : undefined

// Hedef çizgileri: katalogda target'ı olan SEÇİLİ pct ölçüleri — yüzde
// ekseninde kesikli constantLine olarak çizilir (fabrika raporunun
// "hedefin neresindeyiz" sorusu grafikten okunur).
const targetLines = computed(() =>
  selectedMeasures.value
    .map((k) => MEASURE_MAP[k])
    .filter((m) => m?.target != null && m.format === 'pct')
    .map((m) => ({ key: m.key, value: m.target, color: m.color ?? '#64748b', text: `${m.label} hedef: ${m.target}` }))
)

// Donut tek ölçüm gösterir (eski davranışla aynı)
const donutMeasure = computed(() => selectedMeasures.value[0])
const donutNote = computed(
  () => chartType.value === 'donut' && selectedMeasures.value.length > 1
)

// Çizgi grafiği trend içindir; tek argüman varsa çizgi çizilemez. O durumda
// noktaları gösterip kullanıcıyı Date kırılımına yönlendiririz; çok noktada
// noktalar gizlenir (temiz çizgi).
const lineSingleNote = computed(
  () => chartType.value === 'line' && report.value.rows.length < 2
)

// Tooltip: motorun formatValue'su ile biçimli değer. Measure, serinin
// valueField'ından bulunur (etiket eşleşmesi değil — etiketler ileride
// i18n'e bağlanırsa kırılmasın); ada dayalı arama yalnızca yedek.
function chartTooltip(info) {
  const vf = info.point?.series?.getValueFields?.()[0]
  const m = MEASURE_MAP[vf] ?? MEASURES.find((x) => x.label === info.seriesName)
  return { text: `${info.argumentText}\n${info.seriesName}: ${formatValue(info.value, m?.format)}` }
}
function pieTooltip(info) {
  const fmt = MEASURE_MAP[donutMeasure.value]?.format
  return { text: `${info.argumentText}: ${formatValue(info.value, fmt)}` }
}

// Zoom sıfırlama — instance API (Chart.js'te plugin'in resetZoom'u vardı;
// DevExtreme'de zoom/pan YERLEŞİK: DxZoomAndPan + resetVisualRange()).
const chartRef = ref(null)
function resetZoom() {
  chartRef.value?.instance?.resetVisualRange()
}

// --- Drill-down: bir noktaya tıkla → detaya in ---
// Hat kırılımı varsa o hatta odaklanır; yalnızca hat kırılımındaysak o hattın
// günlük trendine (date/day) ineriz. Her drill öncesi önceki durum yığına atılır;
// "Geri" ile adım adım geri dönülür.
const drillStack = ref([])

const toISO = (d) => (d instanceof Date ? d.toISOString() : null)
const fromISO = (s) => (s ? new Date(s) : null)

function currentDef() {
  return {
    measures: [...selectedMeasures.value],
    dimensions: [...selectedDimensions.value],
    granularity: dateGranularity.value,
    chartType: chartType.value,
    lines: [...selectedLines.value],
    startDate: toISO(startDate.value),
    endDate: toISO(endDate.value),
  }
}

function applyDef(def) {
  selectedMeasures.value = [...(def.measures ?? [])]
  selectedDimensions.value = [...(def.dimensions ?? [])]
  dateGranularity.value = def.granularity ?? 'day'
  chartType.value = def.chartType ?? 'bar'
  selectedLines.value = [...(def.lines ?? [])]
  startDate.value = fromISO(def.startDate)
  endDate.value = fromISO(def.endDate)
}

// Chart.js onClick elements[0].index veriyordu; DevExtreme pointClick'te
// e.target.originalArgument = grup etiketi. Satırı etiketten geri buluruz.
function onPointClick(e) {
  const arg = e.target?.originalArgument
  if (arg == null) return
  const row = report.value.rows.find((r) => groupLabel(r) === String(arg))
  if (!row) return
  const dims = selectedDimensions.value
  if (!dims.includes('line') || row.line == null) return
  drillStack.value.push(currentDef()) // geri dönebilmek için önceki durumu sakla
  selectedLines.value = [row.line]
  if (dims.length === 1 && dims[0] === 'line') {
    selectedDimensions.value = ['date']
    dateGranularity.value = 'day'
  }
}

function drillBack() {
  const prev = drillStack.value.pop()
  if (prev) applyDef(prev)
}

// ==================== EXPORT (PNG / Excel / PDF) ====================
function exportFileName() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `custom-report-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// DxChart SVG çizer (Chart.js canvas'tı). PNG/PDF/pano için SVG'yi kendimiz
// canvas'a rasterize ediyoruz: svg -> blob URL -> <img> -> canvas. Tema zeminli
// doldururuz ki dark mode'da metinler okunur kalsın (eski composite'in karşılığı).
const pieRef = ref(null)
async function chartCanvas() {
  const inst = chartType.value === 'donut' ? pieRef.value?.instance : chartRef.value?.instance
  if (!inst?.svg) return null
  const svgText = inst.svg()
  const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = new Image()
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url })
    const scale = 2 // retina netliği
    const c = document.createElement('canvas')
    c.width = (img.naturalWidth || 800) * scale
    c.height = (img.naturalHeight || 480) * scale
    const ctx = c.getContext('2d')
    ctx.fillStyle = isDark.value ? '#131c2e' : '#ffffff'
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.scale(scale, scale)
    ctx.drawImage(img, 0, 0)
    return c
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Export akışları lazy import + canvas/dosya işlemleri içerir; herhangi biri
// patlarsa (offline, izin, API uyumsuzluğu) kullanıcı sessiz kalmasın diye
// hepsi aynı kalıpla sarılır: console'a ayrıntı, ekrana notify.
function reportExportError(err) {
  console.error('[export]', err)
  notify(t('export.failed'), 'error', 3000)
}

async function downloadPng() {
  try {
    const c = await chartCanvas()
    if (!c) return
    const a = document.createElement('a')
    a.href = c.toDataURL('image/png')
    a.download = `${exportFileName()}.png`
    a.click()
  } catch (err) {
    reportExportError(err)
  }
}

const copied = ref(false)
async function copyPng() {
  try {
    const c = await chartCanvas()
    if (!c || !navigator.clipboard || !window.ClipboardItem) return
    c.toBlob(async (blob) => {
      if (!blob) return
      try {
        await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })])
        copied.value = true
        setTimeout(() => { copied.value = false }, 1500)
      } catch { /* pano izni yok — sessiz geç */ }
    })
  } catch (err) {
    reportExportError(err)
  }
}

// Excel: DevExtreme'in excel_exporter'ı grid'i olduğu gibi (HAM sayısal
// değerlerle) ExcelJS çalışma kitabına döker — eski projede elle aoa kuruyorduk.
// Ağır kütüphaneler tıklanınca lazy-load edilir (ilk sayfa yükü şişmesin).
const dsGridRef = ref(null)
async function exportExcel() {
  try {
    const grid = dsGridRef.value?.instance
    if (!grid) return
    const [{ exportDataGrid }, ExcelJSmod, fsMod] = await Promise.all([
      import('devextreme/excel_exporter'),
      import('exceljs'),
      import('file-saver'),
    ])
    const Workbook = ExcelJSmod.Workbook ?? ExcelJSmod.default.Workbook
    const saveAs = fsMod.saveAs ?? fsMod.default
    const workbook = new Workbook()
    const worksheet = workbook.addWorksheet('Report')
    await exportDataGrid({ component: grid, worksheet })
    const buffer = await workbook.xlsx.writeBuffer()
    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `${exportFileName()}.xlsx`)
  } catch (err) {
    reportExportError(err)
  }
}

// PDF: önce grafik görseli (rasterize edilmiş SVG), altına biçimli veri tablosu.
// Motorun columns/rows'u framework'süz olduğu için eski jspdf kodu birebir taşındı.
async function exportPdf() {
  try {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const { columns, rows } = report.value
    const doc = new jsPDF({ orientation: 'landscape' })
    const pageW = doc.internal.pageSize.getWidth()
    const margin = 14

    doc.setFontSize(14)
    doc.text('Custom Report', margin, 14)
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(new Date().toLocaleString(), margin, 20)
    doc.setTextColor(0)

    let tableY = 26

    const c = await chartCanvas()
    if (c) {
      const availW = pageW - margin * 2
      const ratio = c.height / c.width || 0.4
      const imgH = Math.min(availW * ratio, 95) // sayfada tabloya da yer kalsın
      doc.addImage(c.toDataURL('image/png'), 'PNG', margin, tableY, availW, imgH)
      tableY += imgH + 6
    }

    autoTable(doc, {
      startY: tableY,
      head: [columns.map((col) => col.label)],
      body: rows.map((r) =>
        columns.map((col) => (col.isDimension ? r[col.key] : formatValue(r[col.key], col.format)))
      ),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
    })
    doc.save(`${exportFileName()}.pdf`)
  } catch (err) {
    reportExportError(err)
  }
}

// ==================== KAYDEDİLMİŞ RAPORLAR (localStorage) ====================
// Seçili measure + dimension + granularity + chart tipi + filtreler bir "rapor
// tanımı" olarak isimle saklanır; tek tıkla geri yüklenir. currentDef/applyDef
// drill-down ile ortak — tek serileştirilebilir model her şeye yetiyor.
const SAVED_KEY = 'cr-saved-reports'
const savedReports = ref([])
const newReportName = ref('')
const savedSelection = ref(null)

const savedOptions = computed(() =>
  savedReports.value.map((r) => ({ label: r.name, value: r.name }))
)

function persistSaved() {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(savedReports.value))
  } catch { /* kota/gizli mod — sessiz geç */ }
}

function saveCurrentReport() {
  const name = newReportName.value.trim()
  if (!name) return
  const entry = { name, def: currentDef() }
  const idx = savedReports.value.findIndex((r) => r.name === name)
  if (idx >= 0) savedReports.value[idx] = entry // aynı isim → üzerine yaz
  else savedReports.value.push(entry)
  persistSaved()
  savedSelection.value = name
  newReportName.value = ''
}

function onSavedPicked(e) {
  const entry = savedReports.value.find((r) => r.name === e.value)
  if (entry) applyDef(entry.def)
}

function deleteSavedReport() {
  if (!savedSelection.value) return
  savedReports.value = savedReports.value.filter((r) => r.name !== savedSelection.value)
  persistSaved()
  savedSelection.value = null
}

onMounted(() => {
  try {
    const raw = localStorage.getItem(SAVED_KEY)
    if (raw) savedReports.value = JSON.parse(raw)
  } catch { /* bozuk veri — yok say */ }
})

// Measure kolonları için hücre metni: motorun formatValue'su aynen kullanılır.
// (DxColumn.customizeText — PrimeVue'daki #body template'inin karşılığı.)
const cellText = (col) =>
  col.isDimension ? undefined : (cellInfo) => formatValue(cellInfo.value, col.format)

function resetAll() {
  // Ekranı boşaltmaz — makul varsayılanlara döner (Line: Link-up 38, son 30 gün).
  const d = makeDefaults()
  selectedMeasures.value = d.measures
  selectedDimensions.value = d.dimensions
  dateGranularity.value = d.granularity
  chartType.value = d.chartType
  selectedLines.value = d.lines
  startDate.value = d.startDate
  endDate.value = d.endDate
  drillStack.value = []
}
</script>

<template>
  <div>
    <div class="lp-page-head">
      <div>
        <h1 class="lp-page-title">{{ t('page.title') }}</h1>
        <div class="lp-breadcrumb">{{ t('page.breadcrumb') }}</div>
      </div>
      <DxButton
        :text="builderOpen ? t('builder.hide') : t('builder.open')"
        icon="preferences"
        type="default"
        @click="builderOpen = !builderOpen"
      />
    </div>

    <!-- Drawer içeriği sarar; panel sağdan içeriğin ÜSTÜNE kayar (overlap).
         v-model:opened şart: dışarı tıklayınca drawer KENDİSİ kapanır, state'in
         geri senkronlanması gerekir (yoksa toggle butonu şaşırır). -->
    <DxDrawer
      v-model:opened="builderOpen"
      position="right"
      opened-state-mode="overlap"
      reveal-mode="slide"
      :shading="true"
      :close-on-outside-click="true"
      template="builderPanel"
    >
      <!-- Kriter paneli -->
      <template #builderPanel>
        <div class="cr-panel">
          <div class="cr-panel-head">
            <span>{{ t('builder.open') }}</span>
            <DxButton icon="close" styling-mode="text" @click="builderOpen = false" />
          </div>

          <div class="cr-field">
            <label>{{ t('field.measures') }}</label>
            <DxTagBox
              v-model:value="selectedMeasures"
              :items="measureItems"
              :grouped="true"
              display-expr="label"
              value-expr="value"
              :search-enabled="true"
              :show-selection-controls="true"
              :max-displayed-tags="1"
              :placeholder="t('ph.measures')"
              class="cr-w"
            />
          </div>

          <div class="cr-field">
            <label>{{ t('field.dimensions') }}</label>
            <DxTagBox
              v-model:value="selectedDimensions"
              :items="dimensionItems"
              display-expr="label"
              value-expr="value"
              :show-selection-controls="true"
              :max-displayed-tags="2"
              :placeholder="t('ph.dimensions')"
              class="cr-w"
            />
          </div>

          <div v-if="showGranularity" class="cr-field">
            <label>{{ t('field.granularity') }}</label>
            <DxButtonGroup
              :items="granularityItems"
              key-expr="value"
              :selected-item-keys="[dateGranularity]"
              selection-mode="single"
              styling-mode="outlined"
              @selection-changed="onGranularityChanged"
            />
          </div>

          <div class="cr-field">
            <label>{{ t('field.chartType') }}</label>
            <DxButtonGroup
              :items="chartTypeItems"
              key-expr="value"
              :selected-item-keys="[chartType]"
              selection-mode="single"
              styling-mode="outlined"
              @selection-changed="onChartTypeChanged"
            />
          </div>

          <div class="cr-divider"></div>

          <div class="cr-field">
            <label>{{ t('field.startDate') }}</label>
            <DxDateBox v-model:value="startDate" display-format="dd.MM.yyyy" class="cr-w" />
          </div>
          <div class="cr-field">
            <label>{{ t('field.endDate') }}</label>
            <DxDateBox v-model:value="endDate" display-format="dd.MM.yyyy" class="cr-w" />
          </div>
          <div class="cr-field">
            <label>{{ t('field.line') }}</label>
            <DxTagBox
              v-model:value="selectedLines"
              :items="LINE_OPTIONS"
              display-expr="label"
              value-expr="value"
              :show-selection-controls="true"
              :max-displayed-tags="2"
              :placeholder="t('ph.line')"
              class="cr-w"
            />
          </div>

          <DxButton
            :text="t('btn.reset')"
            icon="refresh"
            styling-mode="outlined"
            @click="resetAll"
          />

          <div class="cr-divider"></div>

          <!-- Kaydedilmiş raporlar -->
          <div class="cr-field">
            <label>{{ t('saved.title') }}</label>
            <div class="cr-saved-row">
              <DxSelectBox
                v-model:value="savedSelection"
                :items="savedOptions"
                display-expr="label"
                value-expr="value"
                :placeholder="savedReports.length ? t('saved.pick') : t('saved.none')"
                :disabled="!savedReports.length"
                class="cr-w"
                @value-changed="onSavedPicked"
              />
              <DxButton
                icon="trash"
                type="danger"
                styling-mode="text"
                :disabled="!savedSelection"
                :hint="t('saved.delete')"
                @click="deleteSavedReport"
              />
            </div>
            <div class="cr-saved-row">
              <DxTextBox
                v-model:value="newReportName"
                :placeholder="t('saved.name')"
                class="cr-w"
                @enter-key="saveCurrentReport"
              />
              <DxButton
                icon="save"
                :disabled="!newReportName.trim()"
                :hint="t('saved.save')"
                @click="saveCurrentReport"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- Ana içerik: grafik + veri seti -->
      <div class="cr-content">
        <!-- Boş durum 1: hiç measure seçilmemiş -->
        <div v-if="selectedMeasures.length === 0" class="cr-empty lp-card">
          <i class="dx-icon-preferences"></i>
          <p>{{ t('empty.noMeasure') }}</p>
          <DxButton :text="t('empty.openBuilder')" type="default" @click="builderOpen = true" />
        </div>

        <!-- Boş durum 2: measure var ama bu filtrelerle sonuç yok -->
        <div v-else-if="report.rows.length === 0" class="cr-empty lp-card">
          <i class="dx-icon-clearsquare"></i>
          <p>{{ t('empty.noResult') }}</p>
          <DxButton
            :text="t('empty.resetFilters')"
            icon="refresh"
            styling-mode="outlined"
            @click="resetAll"
          />
        </div>

        <template v-else>
          <!-- Grafik -->
          <div class="lp-card cr-card">
            <div class="cr-card-head">
              <h3>{{ t('chart.title') }}</h3>
              <div class="cr-chart-actions">
                <DxButton
                  v-if="drillStack.length"
                  :text="t('chart.drillBack')"
                  icon="arrowback"
                  styling-mode="outlined"
                  @click="drillBack"
                />
                <small v-if="donutNote" class="cr-warn">
                  {{ t('donut.note') }} — "{{ MEASURE_MAP[donutMeasure]?.label }}"
                </small>
                <small v-else-if="lineSingleNote" class="cr-warn">
                  {{ t('line.singleNote') }}
                </small>
                <small v-else-if="!drillStack.length && chartType !== 'donut'" class="cr-hint">
                  {{ t('chart.drillHint') }}
                </small>
                <DxButton
                  icon="image"
                  styling-mode="text"
                  :hint="t('chart.png')"
                  @click="downloadPng"
                />
                <DxButton
                  :icon="copied ? 'check' : 'copy'"
                  styling-mode="text"
                  :hint="copied ? t('chart.copied') : t('chart.copy')"
                  @click="copyPng"
                />
                <DxButton
                  v-if="chartType !== 'donut'"
                  icon="refresh"
                  styling-mode="text"
                  :hint="t('chart.zoomReset')"
                  @click="resetZoom"
                />
              </div>
            </div>

            <div class="cr-chart">
              <!-- Donut ayrı bileşen: DxPieChart (Chart.js'te type='doughnut' idi) -->
              <DxPieChart
                v-if="chartType === 'donut'"
                ref="pieRef"
                :data-source="chartRows"
                type="doughnut"
                :palette="CHART_PALETTE"
                @point-click="onPointClick"
              >
                <DxPieSeries argument-field="__group" :value-field="donutMeasure" />
                <DxPieLegend horizontal-alignment="right" vertical-alignment="top" />
                <DxPieTooltip :enabled="true" :customize-tooltip="pieTooltip" />
              </DxPieChart>

              <DxChart
                v-else
                ref="chartRef"
                :data-source="chartRows"
                @point-click="onPointClick"
              >
                <DxCommonSeriesSettings argument-field="__group" :type="dxSeriesType" />
                <DxSeries
                  v-for="(mkey, i) in selectedMeasures"
                  :key="mkey"
                  :value-field="mkey"
                  :name="MEASURE_MAP[mkey]?.label ?? mkey"
                  :color="measureColor(mkey, i)"
                  :axis="axisFor(mkey)"
                >
                  <!-- Noktalar yalnızca tek argümanlı line'da görünür (yoksa grafik
                       boş kalırdı); trend görünümünde çizgi noktasız ve temizdir. -->
                  <DxPoint :visible="lineSingleNote" :size="8" />
                </DxSeries>

                <DxArgumentAxis :discrete-axis-division-mode="'crossLabels'" />
                <!-- Çift eksen yalnızca % + sayı karışıksa; hedef çizgileri
                     her iki düzende de YÜZDE ekseninde durur -->
                <template v-if="isMixedAxis">
                  <DxValueAxis name="pct" position="left">
                    <DxTitle text="%" />
                    <DxConstantLine
                      v-for="cl in targetLines"
                      :key="cl.key"
                      :value="cl.value"
                      :color="cl.color"
                      dash-style="dash"
                      :width="2"
                    >
                      <DxLabel :text="cl.text" />
                    </DxConstantLine>
                  </DxValueAxis>
                  <DxValueAxis name="num" position="right">
                    <DxTitle text="#" />
                  </DxValueAxis>
                </template>
                <DxValueAxis v-else>
                  <DxConstantLine
                    v-for="cl in targetLines"
                    :key="cl.key"
                    :value="cl.value"
                    :color="cl.color"
                    dash-style="dash"
                    :width="2"
                  >
                    <DxLabel :text="cl.text" />
                  </DxConstantLine>
                </DxValueAxis>

                <DxLegend
                  vertical-alignment="top"
                  horizontal-alignment="left"
                  item-text-position="right"
                />
                <DxTooltip :enabled="true" :customize-tooltip="chartTooltip" />
                <!-- Zoom & pan yerleşik: tekerlekle zoom, sürükleyerek pan -->
                <DxZoomAndPan
                  argument-axis="both"
                  value-axis="both"
                  :allow-mouse-wheel="true"
                  :drag-to-zoom="false"
                />
              </DxChart>
            </div>
          </div>

          <!-- Veri seti -->
          <div class="lp-card cr-card cr-dataset">
            <div class="cr-card-head">
              <h3>{{ t('data.title') }}</h3>
              <div class="cr-ds-actions">
                <small>{{ report.rows.length }} {{ t('data.rows') }}</small>
                <DxButton
                  :text="t('btn.excel')"
                  icon="exportxlsx"
                  type="success"
                  styling-mode="outlined"
                  @click="exportExcel"
                />
                <DxButton
                  :text="t('btn.pdf')"
                  icon="exportpdf"
                  type="danger"
                  styling-mode="outlined"
                  @click="exportPdf"
                />
              </div>
            </div>
            <DxDataGrid
              ref="dsGridRef"
              :data-source="report.rows"
              :show-row-lines="true"
              :show-column-lines="true"
              :column-auto-width="true"
              :column-min-width="120"
              width="100%"
            >
              <DxPaging :page-size="10" />
              <DxPager
                :show-page-size-selector="true"
                :allowed-page-sizes="[10, 25, 50]"
                :show-info="true"
              />
              <DxColumn
                v-for="col in report.columns"
                :key="col.key"
                :data-field="col.key"
                :caption="col.label"
                :customize-text="cellText(col)"
              />
            </DxDataGrid>
          </div>
        </template>
      </div>
    </DxDrawer>
  </div>
</template>

<style scoped>
/* KRİTİK: overlap modunda Drawer, paneli bir overlay olarak kurar ve boyutunu
   şablonu ÖLÇEREK inline style yazar. Şablon lazy mount edildiği için ölçüm
   0 gelebiliyor → panel görünmez ama shader tıklamaları yutar (ekran "donar").
   İnline width:0'ı ancak !important ezer; hem sarmalayıcıyı hem overlay
   içeriğini sabitliyoruz. */
:deep(.dx-drawer-panel-content),
:deep(.dx-drawer-panel-content .dx-overlay-content) {
  width: min(340px, 90vw) !important; /* dar ekranda viewport'u taşmasın */
}

/* Drawer paneli — PrimeVue Drawer'ın gövdesinin karşılığı.
   Genişlik yukarıdaki sarmalayıcıdan gelir; panel onu doldurur. */
.cr-panel {
  width: 100%;
  height: 100%;
  background: var(--lp-surface);
  border-left: 1px solid var(--lp-border);
  padding: 1rem 1.1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.cr-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  font-size: 1rem;
}
/* 4-5 seçenekli ButtonGroup'lar 340px paneli taşırmasın */
.cr-panel :deep(.dx-buttongroup-wrapper) {
  flex-wrap: wrap;
}

.cr-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.cr-field > label {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--lp-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.cr-w {
  width: 100%;
}
.cr-divider {
  border-top: 1px solid var(--lp-border);
  margin: 0.1rem 0;
}
.cr-saved-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.cr-saved-row .cr-w {
  min-width: 0;
}

.cr-content {
  min-height: 480px;
}
.cr-card {
  padding: 1rem 1.1rem;
}
.cr-card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}
.cr-card-head h3 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 600;
}
.cr-card-head small {
  color: var(--lp-text-muted);
}
.cr-ds-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.cr-chart-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.cr-hint {
  color: var(--lp-text-muted);
  font-size: 0.75rem;
  white-space: nowrap;
}
.cr-warn {
  color: #d97706;
}

/* Grafik kabı: DxChart konteyner boyutuna uyar (redrawOnResize varsayılan açık) */
.cr-chart {
  height: 480px;
}
.cr-chart > * {
  height: 100%;
}

.cr-dataset {
  margin-top: 1.25rem;
}
.cr-dataset :deep(.dx-datagrid) {
  font-size: 0.82rem;
}
.cr-dataset :deep(.dx-datagrid) td {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.cr-empty {
  min-height: 480px;
  padding: 3rem 1rem;
  text-align: center;
  color: var(--lp-text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}
.cr-empty [class^='dx-icon-'] {
  font-size: 2rem;
}
</style>
