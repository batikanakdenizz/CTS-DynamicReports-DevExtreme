// Pivot Analysis için DETAYLI dummy veri — hat × gün × vardiya × makine granülü.
// Mevcut dummyData.js'e DOKUNMAZ; pivot ekranı kendi veri setini kullanır.
//
// Neden ayrı üreteç? Pivot'un gücü boyut sayısıyla açılır: buradaki 6 boyut
// (Line, Machine, Shift, Product, Yıl, Ay) ile satır×sütun çapraz kurgular
// kurulabilir. Ana veri seti (hat×gün) 2 boyutla pivot için fakir kalıyordu.
//
// ÖNEMLİ TASARIM NOTU (pay/payda kuralının pivot karşılığı):
// reportEngine'de Planned DT % payı satır bazında ÇARPIMDI:
//   num = plannedStopDuration × designTargetSpeed
// PivotGrid'in calculateSummaryValue'su yalnız TOPLANMIŞ hücre değerlerini
// birleştirebilir; sum(süre×hız) ≠ sum(süre)×ort(hız). Bu yüzden çarpım
// SATIR ÜRETİLİRKEN hesaplanıp kolona yazılır: plannedLossVol/unplannedLossVol.
// Pivot tarafı bu kolonların sum'ını alıp theoVolume sum'ına böler → %100
// invariant her hiyerarşi seviyesinde (ara toplam + genel toplam) korunur.

// Hat/Makine/Ürün topolojisi artık lineTopology.js'te — Custom Report'un
// cascade filtreleriyle AYNI kaynak, iki ekran arasında tutarsız hat/makine
// tanımı olmasın diye (Link-Up-37: Filler+Labeler, önceden burada yanlışlıkla
// Filler+Packer+Palletizer idi — Custom Report'tan farklıydı).
import { LINE_TOPOLOGY, MACHINE_SPEED, MACHINE_PRODUCTS } from './lineTopology.js'

const LINES = LINE_TOPOLOGY.map((t) => ({ name: t.line, machines: t.machines }))

const SHIFTS = ['Shift 1 (00-08)', 'Shift 2 (08-16)', 'Shift 3 (16-24)']

// Seed'li PRNG (dummyData ile aynı teknik) — her çağrı aynı veriyi üretir
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
let rng = mulberry32(1)
const rand = (min, max) => rng() * (max - min) + min
const randInt = (min, max) => Math.floor(rand(min, max + 1))

// Ürün artık makineye göre kısıtlı (MACHINE_PRODUCTS) — eskiden makineden
// bağımsız, düz ağırlıklı rastgele seçimdi (Machine->Product korelasyonu hiç
// yoktu). Dengesizlik artık her makinenin ürettiği SKU sayısından doğal
// olarak oluşuyor, ayrı bir ağırlık tablosuna gerek kalmadı.
function pickProduct(machine) {
  const opts = MACHINE_PRODUCTS[machine]
  return opts[randInt(0, opts.length - 1)]
}

// Bir vardiya-makine satırı: 5 kova kesri toplam 1.0 kurulur (invariant
// kaynakta garanti), sonra hacme çevrilir — dummyData.makeRow ile aynı mantık,
// 1440 dk gün yerine 480 dk vardiya ölçeğinde.
function makeShiftRow(line, machine, shift, date) {
  const scheduled = 480
  const speed = MACHINE_SPEED[machine]
  const theoVolume = Math.round(speed * scheduled * rand(0.97, 1.04))

  const uptimeFrac = rand(0.2, 0.8)
  const rejectFrac = rand(0.02, 0.06)
  const plannedFrac = rng() < 0.65 ? 0 : rand(0.0, 0.04)
  const unplannedFrac = rand(0.06, 0.2)
  const rateFrac = Math.max(0, 1 - uptimeFrac - rejectFrac - plannedFrac - unplannedFrac)

  const volume = Math.round(uptimeFrac * theoVolume)
  const reject = Math.round(rejectFrac * theoVolume)
  const plannedStopDuration = +((plannedFrac * theoVolume) / speed).toFixed(2)
  const unplannedStopDuration = +((unplannedFrac * theoVolume) / speed).toFixed(2)
  const totalRuntime = +((volume / speed) + rateFrac * scheduled).toFixed(2)
  const numberOfStops = randInt(3, 18)

  return {
    line,
    machine,
    shift,
    product: pickProduct(machine),
    date, // JS Date — PivotGrid'in dataType:'date' + groupInterval hiyerarşisi için
    scheduledTime: scheduled,
    designTargetSpeed: speed,
    theoVolume,
    volume,
    reject,
    plannedStopDuration,
    unplannedStopDuration,
    // Önceden hesaplanmış pay hacimleri (üstteki tasarım notu):
    plannedLossVol: Math.round(plannedFrac * theoVolume),
    unplannedLossVol: Math.round(unplannedFrac * theoVolume),
    totalRuntime,
    numberOfStops,
  }
}

// gün(30) × vardiya(3) × (hat başına makine sayısı, topolojiden) = 30×3×5 = 450 satır
export function generateDetailedRows(days = 30) {
  rng = mulberry32(20260713) // deterministik: her çağrı aynı set
  const rows = []
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() - i)
    for (const line of LINES) {
      for (const machine of line.machines) {
        for (const shift of SHIFTS) {
          rows.push(makeShiftRow(line.name, machine, shift, new Date(d)))
        }
      }
    }
  }
  return rows
}
