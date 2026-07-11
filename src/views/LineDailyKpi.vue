<script setup>
import { ref } from 'vue'
// DxDataGrid: PrimeVue DataTable'ın karşılığı — ama filtre satırı, header filter,
// arama paneli, sayfalama gibi özellikler ayrı alt-bileşen etiketleriyle AÇILIR
// (PrimeVue'da prop'tu: paginator, filterDisplay...; burada <DxPaging/> gibi).
import {
  DxDataGrid,
  DxColumn,
  DxFilterRow,
  DxHeaderFilter,
  DxSearchPanel,
  DxPaging,
  DxPager,
} from 'devextreme-vue/data-grid'
// Editör bileşenleri: DatePicker -> DxDateBox, MultiSelect -> DxTagBox.
// Bunlar v-model:value destekler (ButtonGroup'un aksine).
import { DxDateBox } from 'devextreme-vue/date-box'
import { DxTagBox } from 'devextreme-vue/tag-box'
import { DxButton } from 'devextreme-vue/button'
import notify from 'devextreme/ui/notify'
import { generateRows, COLUMNS, LINE_OPTIONS } from '../data/dummyData.js'
import { parseDate } from '../lib/reportEngine.js'

// Tarihler: dummy data bugüne göre üretildiği için son 30 gün preset gelir
// (eski projede sabit tarihti; veriyi her zaman kapsasın diye göreli yaptık).
const today = new Date()
today.setHours(0, 0, 0, 0)
const daysAgo = (n) => {
  const d = new Date(today)
  d.setDate(today.getDate() - n)
  return d
}
const startDate = ref(daysAgo(29))
const endDate = ref(new Date(today))
const selectedLines = ref(LINE_OPTIONS.map((o) => o.value))

const allRows = ref(generateRows(30))
const rows = ref([])

function generate() {
  const lines = selectedLines.value
  // Tarih aralığı da uygulanır (gün başı/sonu dahil) — kutular süs değil
  const fromT = startDate.value ? new Date(startDate.value).setHours(0, 0, 0, 0) : null
  const toT = endDate.value ? new Date(endDate.value).setHours(23, 59, 59, 999) : null
  rows.value = allRows.value.filter((r) => {
    if (!lines.includes(r.line)) return false
    const t = parseDate(r.date).getTime()
    if (fromT != null && t < fromT) return false
    if (toT != null && t > toT) return false
    return true
  })
}
generate() // ilk yüklemede dolu gelsin

// Kolon tipinden DataGrid dataType/format türet:
// pct -> 2 ondalık; num -> binlik ayraç + en çok 2 ondalık (LDML format string).
const colDataType = (c) => (c.type === 'text' ? 'string' : 'number')
const colFormat = (c) =>
  c.type === 'pct' ? '#0.00' : c.type === 'num' ? '#,##0.##' : undefined

// Grid instance'ına ref üzerinden erişim (PrimeVue'da gerek olmazdı;
// DevExtreme'de imperative API'ler instance üzerinden çağrılır).
const gridRef = ref(null)
function clearFilters() {
  gridRef.value?.instance?.clearFilter()
}

// Excel: grid'in O ANKİ görünümünü (filtre + sıralama uygulanmış) ExcelJS'e döker.
// Kütüphaneler tıklanınca lazy-load edilir (CustomReport'takiyle aynı kalıp).
async function exportExcel() {
  try {
    const grid = gridRef.value?.instance
    if (!grid) return
    const [{ exportDataGrid }, ExcelJSmod, fsMod] = await Promise.all([
      import('devextreme/excel_exporter'),
      import('exceljs'),
      import('file-saver'),
    ])
    const Workbook = ExcelJSmod.Workbook ?? ExcelJSmod.default.Workbook
    const saveAs = fsMod.saveAs ?? fsMod.default
    const workbook = new Workbook()
    const worksheet = workbook.addWorksheet('Line Daily KPI')
    await exportDataGrid({ component: grid, worksheet })
    const buffer = await workbook.xlsx.writeBuffer()
    const d = new Date()
    const p = (n) => String(n).padStart(2, '0')
    saveAs(
      new Blob([buffer], { type: 'application/octet-stream' }),
      `line-daily-kpi-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.xlsx`
    )
  } catch (err) {
    console.error('[export]', err)
    notify('Export failed — see console for details', 'error', 3000)
  }
}
</script>

<template>
  <div>
    <div class="lp-page-head">
      <div>
        <h1 class="lp-page-title">Line Daily KPI</h1>
        <div class="lp-breadcrumb">Reports · General Reports · Line Daily KPI</div>
      </div>
    </div>

    <!-- Filtre çubuğu -->
    <div class="lp-filter-bar">
      <div class="lp-field">
        <label>Start Date</label>
        <DxDateBox v-model:value="startDate" display-format="dd.MM.yyyy" :width="170" />
      </div>
      <div class="lp-field">
        <label>End Date</label>
        <DxDateBox v-model:value="endDate" display-format="dd.MM.yyyy" :width="170" />
      </div>
      <div class="lp-field">
        <label>Line</label>
        <DxTagBox
          v-model:value="selectedLines"
          :items="LINE_OPTIONS"
          display-expr="label"
          value-expr="value"
          :show-selection-controls="true"
          :max-displayed-tags="2"
          placeholder="Select lines"
          :width="240"
        />
      </div>
      <div class="lp-filter-actions">
        <DxButton text="Generate Report" type="default" @click="generate" />
        <DxButton
          icon="exportxlsx"
          type="success"
          styling-mode="outlined"
          hint="Export Excel"
          @click="exportExcel"
        />
        <DxButton
          icon="clear"
          styling-mode="outlined"
          hint="Clear column filters"
          @click="clearFilters"
        />
      </div>
    </div>

    <!-- Tablo -->
    <div class="lp-card">
      <div class="lp-table-toolbar">
        <h3>{{ rows.length }} records</h3>
      </div>

      <DxDataGrid
        ref="gridRef"
        :data-source="rows"
        :show-borders="false"
        :show-row-lines="true"
        :show-column-lines="true"
        :column-auto-width="true"
        :column-min-width="110"
        :allow-column-resizing="true"
        width="100%"
      >
        <!-- Kolon başına arama kutusu (gerçek LinePulse davranışı) -->
        <DxFilterRow :visible="true" />
        <!-- Kolon başlığındaki huni menüsü (değer listesinden seçim) -->
        <DxHeaderFilter :visible="true" />
        <!-- Global arama — eski projedeki 'Search all...' InputText'in yerleşik hâli -->
        <DxSearchPanel :visible="true" :width="220" placeholder="Search all..." />
        <DxPaging :page-size="15" />
        <DxPager
          :show-page-size-selector="true"
          :allowed-page-sizes="[10, 15, 25, 50]"
          :show-info="true"
        />

        <DxColumn
          v-for="col in COLUMNS"
          :key="col.field"
          :data-field="col.field"
          :caption="col.header"
          :data-type="colDataType(col)"
          :format="colFormat(col)"
        />
      </DxDataGrid>
    </div>
  </div>
</template>

<style scoped>
/* Eski projedeki fontSize: 0.82rem karşılığı — grid yoğun veri için sıkılaştı */
.lp-card :deep(.dx-datagrid) {
  font-size: 0.82rem;
}
/* Sayısal kolonlar hizalı okunabilsin */
.lp-card :deep(.dx-datagrid) td {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
