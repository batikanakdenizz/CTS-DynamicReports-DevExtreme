# Bağlı (Cascading) Filtreler — Yapılan İş

## İstek

Şirket geri bildirimi: dinamik raporlarda birbirine bağlı filtreler olmalı — bir filtrede seçim yapınca diğerinin seçenekleri daralmalı (örnek: Şehir → İlçe). Örnek sadece anlatım içindi; gerçek bağlantı mevcut KPI verisine bakılarak kurulacaktı, uydurma/kopuk bir hiyerarşi değil.

**Kapsam:** sadece DevExtreme projesi, sadece Custom Report ekranı. Pivot Analysis ve PrimeVue projesi bu geçişte kapsam dışı bırakıldı (kullanıcı onayıyla).

## Seçilen hiyerarşi: Hat (Line) → Makine (Machine) → Ürün (Product)

Gerçek, kod tabanında zaten örtük olan ilişki kullanıldı: her Hat sabit bir Makine setine sahip, her Makine sadece belirli SKU'ları üretebiliyor. 3 zincirli filtre (mevcut Line + yeni Machine + yeni Product) — seçimler **gerçekten** rapor verisini filtreliyor (sadece UI değil), çünkü Machine/Product satırlarda gerçek alanlar ve `DIMENSIONS`'a da eklendi (bonus: rapor artık Machine/Product'a göre de kırılabiliyor).

## Değişen dosyalar

- **`src/data/dummyData.js`** — yeni `generateCascadeRows()` üreteci eklendi (mevcut `generateRows`/`COLUMNS`/`LINES`'a dokunulmadı — Line Daily KPI ekranı hâlâ eskisini kullanıyor). Yeni topoloji: `LINE_TOPOLOGY`, `MACHINE_SPEED`, `MACHINE_PRODUCTS`, artı `machinesForLines()`/`productsForMachines()` yardımcıları.
- **`src/data/reportCatalog.js`** — `DIMENSIONS`'a `machine` ve `product` eklendi.
- **`src/lib/reportEngine.js`** — `runReport`'un filtre adımına `machines`/`products` predicate'leri eklendi (mevcut `lines.includes(...)` deseniyle birebir).
- **`src/views/CustomReport.vue`** — Machine/Product için yeni `DxTagBox` filtreleri, cascade daraltma mantığı (`machineOptions`/`productOptions` computed + üst filtre değişince alttakini temizleyen `watch`), `definition`/`currentDef`/`applyDef`/`resetAll`'a yeni alanlar (kaydet/yükle otomatik kapsıyor).
- **`src/lib/i18n.js`** — TR/EN etiketler.

## Geliştirme sırasında bulunan ve düzeltilen gerçek bug

Dimension sayısı değişince (Machine/Product eklenince) DevExtreme'in `DxDataGrid`'i içeride kolon↔hücre eşleşmesini bozuyordu: bir ölçüm kolonunun `customizeText`'i başka kolonun hücresine uygulanıp `formatValue`'da `value.toFixed is not a function` hatası fırlatıyordu; sonuç olarak tablo eski/yarım veri gösteriyordu. **Kök neden bulundu, kozmetik değil.** Çözüm: `DxDataGrid`'e kolon setine bağlı bir `:key` eklendi — kolon seti değiştiğinde grid'i tamamen yeniden mount ediyor. Fix sonrası tüm dimension kombinasyonları (2, 3 seviye, ekleme/çıkarma her iki yönde) tarayıcıda test edildi, konsol hatasız.

## Test edilenler (tarayıcı, DOM seviyesinde doğrulandı)

- Line → Machine cascade: Line değişince Machine seçenekleri doğru daralıyor.
- Machine → Product cascade: Machine değişince Product seçenekleri doğru daralıyor.
- Üst filtre daraldığında geçersiz alt seçim otomatik temizleniyor (örn. Line değişince artık geçersiz Machine seçimi kalkıyor).
- Filtreler rapor tablosunu/grafiğini gerçekten değiştiriyor (satır sayısı, değerler).
- Machine/Product Dimensions'a eklenince doğru gruplama yapıyor (7 satır, MACHINE_PRODUCTS eşleşmesiyle birebir).
- Kaydet/yükle: Machine/Product filtreleri dahil rapor tanımı kaydediliyor ve doğru geri yükleniyor.
- Mixed-axis grafik (% + sayısal ölçüm karışık) dual-axis doğru render ediyor.
- **Line Daily KPI ekranı etkilenmedi** — hâlâ 60 kayıt, eski `generateRows` kaynağını kullanıyor.
- **Pivot Analysis / `detailedData.js`'e dokunulmadı.**
- `npm run build` — 0 hata.

## Review sonucu (istenen mi yapıldı / bir şey bozuldu mu)

İstenen özellik (gerçek KPI verisine dayalı, 3 seviyeli, çalışan bağlı filtre + kaydet/yükle) doğru şekilde eklendi ve mevcut proje üzerine additive olarak oturdu; Line Daily KPI ve Pivot Analysis ekranları bozulmadı. Çok açılı bir kod incelemesinden (correctness, reuse, simplification, efficiency, altitude) geçirildi; 7 bulgu doğrulandı, hiçbiri kritik/blocking değil:

1. **Veri tutarsızlığı (dikkat edilmeli):** yeni `LINE_TOPOLOGY`'de "Link-Up-37" hattının makine seti (`Filler, Labeler`) Pivot Analysis'in kullandığı `detailedData.js`'teki aynı hat için tanımlanan setten (`Filler, Packer, Palletizer`) farklı — iki ekran karşılaştırılırsa aynı hat için çelişkili görünür. Bilinçli izolasyon kararının (Pivot'a dokunmama) yan etkisi.
2. **Design Target Speed artık ortalama:** Machine kırılımı seçilmeden Line'a göre gruplanınca bu ölçüm farklı makine hızlarının blend'i oluyor (eskiden sabitti) — yanıltıcı olabilir.
3. **Grid remount maliyeti:** `:key` fix'i her dimension/measure değişiminde grid'i tamamen yeniden kuruyor, sayfa/sıralama durumunu sıfırlıyor — gerçek bug'ı çözmek için bilinçli tercih edilen tradeoff.
4. **Drill-down boşlukta:** Dimensions sadece `machine` veya `product` iken grafik noktasına tıklamak sessizce hiçbir şey yapmıyor (Line kırılımı yoksa drill-down zaten hep böyleydi, yeni dimension'larla daha erişilebilir hale geldi).
5-7. Kod tekrarı/refactor fırsatları (`makeCascadeRow` ~ `makeRow`, ayrı SKU kataloğu, iki benzer `watch` bloğu) — kozmetik, davranışı etkilemiyor.

Hiçbiri acil müdahale gerektirmiyor; kullanıcı isterse ayrı bir iterasyonda ele alınabilir.
