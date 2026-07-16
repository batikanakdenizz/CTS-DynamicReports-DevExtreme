# LinePulse · Custom Report Builder — DevExtreme

A dynamic report engine that lets users **design their own reports without
developer involvement**. Existing LinePulse report screens are static — users
can only change filters. This project removes that limit: the user picks the
measures (KPIs), the dimensions to break them down by, and the chart type;
the system generates the **chart + data set** live from that selection.

This is the **DevExpress/DevExtreme implementation** of the report builder.
A functionally identical [PrimeVue implementation](https://github.com/batikanakdenizz/CTS_DynamicReports)
exists; both share the same framework-independent report engine and the same
serializable report-definition model — saved reports are interchangeable
between the two.

**🔗 Live demo:** https://batikanakdenizz.github.io/CTS-DynamicReports-DevExtreme/

> Data is **dummy** by default (deterministic seeded generator). The repo ships
> no real data: a real LinePulse export can optionally be dropped in locally as
> `src/data/lineDailyKpiReport.json` (gitignored), and the Pivot Analysis
> screen then offers it as a second data source — if the file is absent the
> loader returns empty and the build is unaffected. When the real API is
> connected, only the data-source layer changes; the report engine and the UI
> stay the same.

## Features

- **Report Builder panel** (`DxDrawer`) — measures (grouped `DxTagBox` with
  search), dimensions, date granularity (day / ISO week / month / quarter /
  year), chart type and filters (date range, line) in one panel; the result
  updates instantly.
- **4 chart types** — Bar, Stacked Bar, Line (`DxChart`), Donut (`DxPieChart`).
  When percentage and count measures are selected together, a **dual Y axis**
  is applied automatically (% on the left, counts on the right).
- **Zoom & pan** — built into `DxChart` (`DxZoomAndPan`): mouse-wheel zoom,
  drag to pan, one-click reset via `resetVisualRange()`.
- **Drill-down** — click a line's bar/point in the chart to drill into that
  line's daily trend; step back with the "Back" button.
- **Data set** — `DxDataGrid` below the chart with sorting, pagination and
  engine-formatted numbers.
- **Saved reports** — a configured report definition can be saved under a name
  (localStorage), reloaded with one click, or deleted.
- **Export** — Excel via DevExtreme's `excel_exporter` (+ ExcelJS, raw numeric
  values), PDF (chart image + formatted table via jsPDF/autotable), chart PNG
  download / copy to clipboard (SVG rasterized to a theme-backed canvas).
  Export libraries are **lazy-loaded** on click. Failures surface as a toast
  (`notify`) instead of failing silently.
- **TR / EN localization** and **dark mode** — preferences persist in
  localStorage; the OS theme is detected on first load. Dark mode switches the
  DevExtreme theme (`themes.current`) *and* the shell palette together; charts
  follow automatically.
- **Line Daily KPI** — a reference shell of the real LinePulse 28-column table
  report: per-column filter row, header filters, global search, resizable
  columns and one-click Excel export — all `DxDataGrid` built-ins.
- **Pivot Analysis** — free-form multi-dimensional exploration with
  `DxPivotGrid`: row × column cross-tabs, drag-and-drop field re-arrangement
  (field chooser + field panel), a date hierarchy (year / quarter / month), a
  pivot-driven chart (`bindChart` — the pivot state defines the series) and
  cell drill-down to the underlying raw rows in a popup. Derived KPIs follow
  the same num/den rule via hidden sum fields, so the 100% invariant holds at
  every subtotal and grand-total level. See
  `docs/devextreme-pivotgrid-documentation.md` for the full field guide.

## Architecture

A report is represented by a serializable **report definition** model:

```js
{ measures: [], dimensions: [], dateGranularity: 'day',
  chartType: 'bar', filters: { dateFrom, dateTo, lines } }
```

`reportEngine.runReport(definition, records)` takes this definition: it
filters the records, groups them by the selected dimensions, computes the
measures and returns `{ columns, rows }`. The engine is a pure function,
independent of both the UI and the data source — saving, restoring, drill-down
and (eventually) sending the definition to a backend as a query all work
through this single model.

### Derived KPIs and correct aggregation

Derived KPIs (Up Time %, Rate/Reject/Downtime Loss %, Availability, MTBF) are
defined in `reportCatalog.js` as **numerator/denominator (num/den)** functions.
Percentages are **never averaged** when grouping: numerators and denominators
are summed row by row first, then the ratio is computed. As a result, the five
loss buckets (Up Time + Rate + Reject + Planned + Unplanned) always add up to
**100%** in every group and at every granularity — matching the real LinePulse
exactly. The formulas were extracted from live LinePulse screens and verified
against real data.

## Tech Stack

Vue 3 (Composition API) · DevExtreme 26.1 (`devextreme-vue`, Fluent theme) ·
ExcelJS + file-saver · jsPDF + jspdf-autotable · Vite

## Theming

- Both Fluent themes (light + dark) are declared in `index.html` as
  `rel="dx-theme"` links; `themes.current()` switches between them at runtime.
- The LinePulse palette is applied by overriding the Fluent CSS custom
  properties (`--dx-color-*`) in `src/style.css` — `html:root` for light,
  `html:root.dark-mode` for dark.
- Theme CSS files are **not vendored**: `scripts/copy-dx-themes.mjs` copies
  them from `node_modules/devextreme` into `public/dx/` on every
  `npm run dev` / `npm run build` (predev/prebuild hooks), so the CSS always
  matches the installed DevExtreme version.

## Getting Started

```bash
npm install
npm run dev        # http://localhost:5173/CTS-DynamicReports-DevExtreme/
npm run build      # production build -> dist/
npm run preview    # preview the build locally
```

> Note the dev URL includes the GitHub Pages base path (`vite.config.js`).

## Project Structure

```
.
├── .github/workflows/deploy.yml   # automatic GitHub Pages deploy (CI/CD)
├── docs/
│   └── devextreme-pivotgrid-documentation.md  # DxPivotGrid field guide
├── index.html                     # dx-theme links (light/dark), Inter font
├── vite.config.js                 # base: /CTS-DynamicReports-DevExtreme/
├── scripts/
│   └── copy-dx-themes.mjs         # node_modules -> public/dx theme sync
└── src/
    ├── main.js                    # theme-gated mount (themes.initialized + fallback)
    ├── App.vue                    # simple view routing
    ├── layout/
    │   ├── AppSidebar.vue         # LinePulse side menu (dx-icon font)
    │   └── AppTopbar.vue          # title + language (DxButtonGroup) / theme switches
    ├── views/
    │   ├── CustomReport.vue       # report builder (the main screen)
    │   ├── LineDailyKpi.vue       # 28-column table report (DxDataGrid reference)
    │   └── PivotAnalysis.vue      # free-form pivot exploration (DxPivotGrid)
    ├── data/
    │   ├── dummyData.js           # deterministic dummy records (line × day)
    │   ├── detailedData.js        # richer dummy set for the pivot (shift × machine × product)
    │   ├── realKpiData.js         # optional loader for a gitignored real export
    │   └── reportCatalog.js       # MEASURES (raw + derived) & DIMENSIONS catalog
    └── lib/
        ├── reportEngine.js        # definition -> { columns, rows } (pure function)
        ├── i18n.js                # lightweight TR/EN translation layer
        ├── dxLocale.js            # DevExtreme widget-internal texts (TR/EN)
        └── theme.js               # dark-mode state (shell CSS + themes.current)
```

## Deployment

Every push to `main` is built and published to GitHub Pages via GitHub Actions
(`.github/workflows/deploy.yml`): `npm install` → `vite build` → Pages
artifact. `npm ci` is deliberately not used: a lockfile generated on Windows
cannot record the Linux/WASM optional dependency tree, so `npm ci` fails on
the Ubuntu runner (details in the workflow comment). No manual deploy is
needed; run status is on the repo's **Actions** tab.

## Switching to Real Data

1. Replace `generateRows()` in `src/data/dummyData.js` with the real API call
   (field names must match `reportCatalog.js`).
2. If needed, update measure keys/labels and num/den functions in
   `reportCatalog.js`.
3. `reportEngine.js` and the entire UI remain unchanged. The definition model
   is serializable, so aggregation can later move server-side by posting the
   definition to a backend.

## Licensing

The code in this repository is released under the [MIT License](LICENSE).

DevExtreme is a commercial DevExpress product. The public demo runs under an
evaluation license (hence the banner); registering a license key removes it.


