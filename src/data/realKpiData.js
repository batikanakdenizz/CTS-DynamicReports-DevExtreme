// GERÇEK sistem verisi loader'ı — LineDailyKpi export'u (src/data/lineDailyKpiReport.json).
// Dosya GİTİGNORE'lu (gerçek üretim verisi repoya girmez). import.meta.glob ile
// opsiyonel yüklenir: dosya yoksa build KIRILMAZ, loadRealKpiRows() [] döner ve
// ekran "Gerçek" kaynağını devre dışı bırakır.
//
// Export'un ham hâlindeki pürüzler burada temizlenir:
// - "Line" değerlerinde kaçak "\n" var → trim.
// - "Date" DD.MM.YYYY formatında → JS Date'e elle parse (Date.parse güvenilmez).
// - Alan adları boşluklu/noktalı ("Theo. volume") → pivot alanlarıyla eşleşsin
//   diye detailedData ile AYNI camelCase adlara çevrilir; böylece PivotAnalysis
//   ölçü tanımları (theoVolume/volume/reject/plannedLossVol/unplannedLossVol)
//   iki kaynakta da değişmeden çalışır.
//
// KRİTİK DÖNÜŞÜM (pay/payda kuralının gerçek veri hali):
// Rapordaki yüzdeler karışık tabanlı: Up Time %, Reject Loss % HACİM tabanlı
// (volume/theoVolume), Planned/Unplanned DT % ZAMAN tabanlı (süre/scheduledTime).
// Duruş sürelerini satırın TEORİK hızıyla (theoVolume/scheduledTime — design
// speed DEĞİL, veri bunu doğruluyor: 8800/dk > 8400 design) hacme çevirince:
//   plannedLossVol/theoVolume = süre/scheduledTime  → raporun yüzdesi birebir
// ve beş kova (volume+reject+planned+unplanned+rate) tam theoVolume'a tamamlanır
// → %100 invariant her toplama seviyesinde korunur. Rate kalan olarak hesaplanır
// ve gerçek veride NEGATİF olabilir (hat teorik hızın üstünde koşmuş, ör. -1.32).

const files = import.meta.glob('./lineDailyKpiReport.json', {
  eager: true,
  import: 'default',
})

// "13.06.2026" → Date(2026, 5, 13)
function parseDmy(s) {
  const [d, m, y] = String(s).split('.').map(Number)
  return new Date(y, m - 1, d)
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

export function loadRealKpiRows() {
  const raw = Object.values(files)[0]
  if (!Array.isArray(raw)) return []

  return raw.map((r) => {
    const scheduledTime = num(r['Scheduled Time'])
    const theoVolume = num(r['Theo. volume'])
    const volume = num(r['Volume'])
    const reject = num(r['Reject'])
    // Satır teorik hızı — duruş sürelerini hacme çevirme katsayısı
    const theoSpeed = scheduledTime > 0 ? theoVolume / scheduledTime : 0
    const plannedLossVol = Math.round(num(r['Planned Stop Duration']) * theoSpeed)
    const unplannedLossVol = Math.round(num(r['Unplanned Stop Duration']) * theoSpeed)

    return {
      line: String(r['Line'] ?? '').trim(),
      date: parseDmy(r['Date']),
      scheduledTime,
      theoVolume,
      volume,
      reject,
      plannedLossVol,
      unplannedLossVol,
      // Ek ölçüler (chooser'da bekleyen): MTBF = sum(totalRuntime)/sum(stops)
      // oranı için ham toplamlar + duruş tipi sayıları
      numberOfStops: num(r['Number of Stops']),
      shortStops: num(r['Number of Short Stops']),
      breakdowns: num(r['Breakdown']),
      processStops: num(r['Process Stops']),
      plannedStops: num(r['Planned Stops']),
      noCodeStops: num(r['No Definition Stoppage Code']),
      totalRuntime: num(r['Total Runtime']),
    }
  })
}
