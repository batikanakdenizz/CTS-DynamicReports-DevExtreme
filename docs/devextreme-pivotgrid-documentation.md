# DevExtreme PivotGrid — Dökümantasyon

| | |
|---|---|
| **Sürüm referansı** | DevExtreme 26.x (Vue, React, Angular ve jQuery için geçerlidir) |
| **Tarih** | 16.07.2026 |
| **Hazırlayan** | Batıkan Akdeniz |
---

## İçindekiler

1. [Tanım](#1-tanım)
2. [Temel Yetenekler](#2-temel-yetenekler)
3. [Kullanım Senaryoları](#3-kullanım-senaryoları)
4. [Avantajlar](#4-avantajlar)
5. [Dezavantajlar ve Riskler](#5-dezavantajlar-ve-riskler)
6. [Veri Ölçeği ve İşleme Modları](#6-veri-ölçeği-ve-i̇şleme-modları)
7. [Performans Önerileri](#7-performans-önerileri)
8. [Güvenlik ve Veri Gizliliği](#8-güvenlik-ve-veri-gizliliği)
9. [Karar Özeti](#9-karar-özeti)
10. [Terimler Sözlüğü](#10-terimler-sözlüğü)
11. [Kaynaklar](#11-kaynaklar)

---

## 1. Tanım

**PivotGrid**, DevExpress firmasının DevExtreme kütüphanesinde yer alan, tarayıcı üzerinde çalışan bir **pivot tablo** bileşenidir. En özlü ifadeyle, Microsoft Excel'deki PivotTable işlevselliğinin web uygulamasına gömülebilen ve programlanabilen karşılığıdır.

Pivot tablo, ham veri satırlarını **satır × sütun kesişimli bir özet matrise** dönüştürür. Örneğin binlerce satırlık bir satış kaydı; satırlarda bölge, sütunlarda yıl ve ay, hücrelerde toplam ciro olacak biçimde tek bakışta okunabilir bir çapraz tabloya indirgenir. Hangi alanın satıra, hangisinin sütuna, hangisinin ölçü veya filtre bölgesine yerleşeceğini kullanıcı **sürükle-bırak yöntemiyle kendisi belirler**; böylece rapor tasarımı geliştiriciden son kullanıcıya devredilmiş olur.

Bileşen dört bölgeden oluşur:

| Bölge | Görevi | Örnek |
|---|---|---|
| **Row (Satır)** | Dikey kırılım boyutları | Bölge → Şehir hiyerarşisi |
| **Column (Sütun)** | Yatay kırılım boyutları | Yıl → Çeyrek → Ay hiyerarşisi |
| **Data (Ölçü)** | Hücrelerde özetlenen sayısal değerler | Toplam ciro, adet, ortalama |
| **Filter (Filtre)** | Görünüme dahil olmadan filtreleme yapan alanlar | Ürün grubu, vardiya |

## 2. Temel Yetenekler

- **Sürükle-bırak alan yönetimi:** Kullanıcı, *field chooser* (alan seçici pencere) veya *field panel* (grid üzerindeki alan şeridi) aracılığıyla alanları bölgeler arasında taşıyarak raporu anında yeniden düzenler; kod değişikliği gerekmez.
- **Hiyerarşi ve drill-down:** Satır ve sütun boyutları iç içe hiyerarşiler oluşturur (örn. Yıl → Çeyrek → Ay). Kullanıcı seviyeleri açıp kapatarak özetten detaya iner.
- **Ara ve genel toplamlar:** Her hiyerarşi seviyesi için ara toplam, tablonun tamamı için genel toplam otomatik olarak hesaplanır; gerektiğinde devre dışı bırakılabilir.
- **Özet fonksiyonları:** `sum`, `count`, `avg`, `min`, `max` fonksiyonları hazır olarak sunulur; `calculateSummaryValue` ile oran, ağırlıklı ortalama, KPI gibi tümüyle özel hesaplamalar tanımlanabilir.
- **Drill-through (hücre detayı):** Hücre tıklama olayı üzerinden, seçilen özet hücresini oluşturan **ham veri satırlarına** erişilebilir (`createDrillDownDataSource`) ve bu satırlar ayrı bir tabloda sunulabilir. Herhangi bir toplamın hangi kayıtlardan oluştuğu bu yolla doğrulanır.
- **Grafik entegrasyonu:** `bindChart` yöntemiyle pivot, bir DevExtreme Chart bileşenine bağlanır; kullanıcı pivotu yeniden düzenledikçe grafik otomatik olarak güncellenir.
- **Filtreleme ve sıralama:** Alan bazında değer filtresi; başlığa veya özet değere göre sıralama.
- **Excel dışa aktarımı:** Görünümdeki pivot, biçimlendirmesiyle birlikte resmî `exportPivotGrid` fonksiyonu aracılığıyla Excel formatına aktarılabilir (ExcelJS ve FileSaver kütüphaneleri gerekir). PDF için resmî destek bulunmaz: DevExtreme'in `pdfExporter` modülü yalnızca DataGrid ve Gantt bileşenlerini kapsar; PivotGrid'den PDF üretimi jsPDF gibi kütüphanelerle özel geliştirme gerektirir.
- **Durum saklama (state persistence):** Kullanıcının oluşturduğu görünüm (alan yerleşimi, açık/kapalı düğümler, filtreler) kaydedilir ve sonraki oturumda geri yüklenir.
- **Tema ve yerelleştirme:** DevExtreme tema altyapısını kullanır (açık/koyu tema dahil); arayüz metinleri yerelleştirilebilir.

## 3. Kullanım Senaryoları

### 3.1 Uygun senaryolar

- **Çok boyutlu keşif analizi:** Veriye hangi açıdan bakılacağının önceden belirli olmadığı, kullanıcının bölge/ürün/zaman gibi eksenleri kendisinin denemek istediği durumlar.
- **KPI kırılım raporları:** Üretim, satış, finans gibi alanlarda aynı ölçünün farklı boyut kombinasyonlarında (hat × vardiya × ay vb.) izlenmesi.
- **Self-servis raporlama ihtiyacı:** Her yeni rapor talebinin geliştirme eforuna dönüşmesi yerine, son kullanıcıya kendi raporunu kurabileceği bir analiz aracı sunulması.
- **Excel bağımlılığının azaltılması:** Kullanıcıların veriyi indirip Excel üzerinde pivot kurduğu iş akışlarının, güncel veriyle uygulama içine taşınması.
- **OLAP / veri ambarı üzerine istemci katmanı:** Mevcut bir Microsoft Analysis Services (SSAS) küpünün bulunduğu ortamlarda, bu altyapıya doğrudan bağlanan hazır bir ön yüz ihtiyacı (`XmlaStore` resmî olarak yalnızca SSAS'ı destekler; farklı OLAP sunucuları için `CustomStore` ile özel entegrasyon gerekir).

### 3.2 Uygun olmayan senaryolar

- **Sabit formatlı, değişmeyen raporlar:** Rapor tasarımı sabitse pivotun esnekliği gereksiz karmaşıklık üretir; standart bir DataGrid daha basit ve hızlı bir çözümdür.
- **Kayıt listeleme ve işlem ekranları:** Satır düzeyinde görüntüleme, düzenleme veya seçim gerektiren ekranlar pivotun kapsamı dışındadır; pivot kayıt yönetmez, **özetler**.
- **Ham veri taraması:** Milyonlarca satırın satır satır incelenmesi bileşenin amacına uygun değildir.
- **Dar ekran / mobil ağırlıklı kullanım:** Çapraz matris yapısı geniş ekran gerektirir; mobil cihazlarda kullanım deneyimi zayıftır.
- **Piksel hassasiyetinde özel tasarım:** Hücre yapısı büyük ölçüde bileşenin kontrolündedir; serbest görsel tasarım gereksinimlerinde uygun araç değildir.

## 4. Avantajlar

- **Olgun ve hazır bileşen:** Alan seçici, hiyerarşi yönetimi, toplamlar, dışa aktarım ve tema desteği hazır olarak sunulur. Eşdeğer işlevselliğin sıfırdan geliştirilmesi aylar ölçeğinde efor gerektirir.
- **Self-servis analiz:** Rapor değişiklik taleplerinin önemli bölümü geliştirme kuyruğundan çıkar; görünümü kullanıcı kendisi oluşturur.
- **Ek altyapı gerektirmeyen başlangıç:** Küçük ve orta ölçekli veri setlerinde tüm pivot hesaplaması tarayıcıda gerçekleştirilir; ek sunucu bileşeni veya servis gerekmez.
- **Tanımlı büyüme yolu:** Veri hacmi arttığında aynı bileşen sunucu taraflı işlemeye (`remoteOperations`) veya OLAP küpüne (`XmlaStore`) geçirilebilir; ön yüz kodu büyük ölçüde korunur.
- **Framework desteği:** Vue, React, Angular ve jQuery için resmî sarmalayıcılar tek lisans kapsamında sunulur.
- **Ekosistem bütünlüğü:** DevExtreme'in Chart, DataGrid, Form gibi bileşenleriyle ortak tema ve API yaklaşımını paylaşır; pivot, grafik ve drill-down tablosu uyumlu tek bir ekranda birleştirilebilir.
- **Aktif ürün yaşam döngüsü:** DevExpress düzenli sürüm yayınlar; kapsamlı dokümantasyon ve resmî destek kanalı mevcuttur.

## 5. Dezavantajlar ve Riskler

- **Ticari lisans:** DevExtreme ücretli bir üründür; geliştirici başına 12 aylık abonelik gerektirir (makine veya sunucu başına lisanslama ve çalışma zamanı ücreti yoktur; yenileme bedeli ilk satın almanın yaklaşık %50'sidir). Bütçe planlamasında dikkate alınmalıdır; güncel fiyatlandırma için [resmî satın alma sayfası](https://js.devexpress.com/Buy/) esas alınmalıdır.
- **Öğrenme eğrisi:** Bileşenin merkezinde `PivotGridDataSource` nesnesi yer alır (alan tanımları, bölgeler, özet fonksiyonları, görünüm durumu). Bu model kavranmadan yapılan uygulamalar yanıltıcı sonuç üretebilir; ekip için bir öğrenme yatırımı planlanmalıdır.
- **Client-side modda kaynak sınırı:** Tüm veri tarayıcıya indirilir ve bellekte işlenir. Veri hacmi büyüdükçe ilk yükleme süresi, bellek kullanımı ve etkileşim gecikmesi artar (ayrıntı için bkz. [Bölüm 6](#6-veri-ölçeği-ve-i̇şleme-modları)).
- **Sunucu taraflı modun maliyeti:** Büyük veri için `remoteOperations` veya OLAP'a geçiş, arka uçta ek geliştirme ya da altyapı (örn. SSAS) gerektirir; yalnızca bileşen yapılandırmasıyla tamamlanacak bir geçiş değildir.
- **Mobil deneyim kısıtı:** Çapraz tablo dar ekranda okunabilirliğini yitirir; mobil öncelikli ürünlerde farklı bir sunum katmanı gerekir.
- **Özelleştirme sınırları:** Hücre bazında renk ve biçimlendirme (`customizeCell` benzeri noktalar) mümkündür; ancak bileşenin genel yerleşim ve davranışının dışına çıkmak güçtür.
- **Tedarikçi bağımlılığı:** Raporlama katmanı tek bir ticari tedarikçiye bağlanır; uzun vadeli ürün planlamasında değerlendirilmelidir.

## 6. Veri Ölçeği ve İşleme Modları

Tek bir üst sınır değeri yoktur; kapasite, **seçilen işleme moduna** bağlıdır. PivotGrid üç modda çalışır:

| Mod | Veri nerede işlenir? | Pratik ölçek | Gereksinim |
|---|---|---|---|
| **Client-side** (yerel dizi, ODataStore, CustomStore) | Tarayıcıda | On binlerce satırda sorunsuz; resmî dokümantasyona göre 1 milyon kayda *yaklaşan* setler "kabul edilebilir sürede" işlenebilir, ancak bu banda yaklaştıkça yavaşlama belirginleşir | Ek altyapı gerektirmez |
| **Server-side** (`remoteOperations: true` + CustomStore/XmlaStore) | Sunucuda (özetleme, filtreleme, gruplama) | Milyonlarca satır; DevExpress'in yayımladığı ölçümde 3 milyon kayıtta akıcı çalışır | Arka uçta özetleme yapabilen bir servis (örn. DevExtreme.AspNet.Data) |
| **OLAP** (`XmlaStore`) | OLAP küpünde | En büyük ölçek: birkaç milyon ve üzeri kayıt, gecikmesiz | Kurulu bir Microsoft Analysis Services (SSAS) altyapısı — `XmlaStore` resmî olarak yalnızca SSAS'ı destekler |

Değerlendirmede dikkate alınması gereken noktalar:

- **Satır sayısı tek başına yeterli bir metrik değildir.** Asıl yükü, görünümde oluşan **hücre sayısı** belirler: (görünür satır yaprağı) × (görünür sütun yaprağı) × (ölçü sayısı). Elli bin satırlık ancak üç boyutlu sade bir pivot; on bin satırlık ancak sekiz boyutlu, yüksek kardinaliteli (çok sayıda farklı değer içeren) bir pivottan belirgin biçimde hızlı olabilir.
- **Client-side modda veri bir kez indirilir**; sonraki her yeniden düzenleme tarayıcıda anında gerçekleşir. Küçük ve orta ölçekli veri için bu model, sunucu moduna kıyasla daha akıcı bir deneyim sunar.
- **Server-side modda veri transferi sabit kalır:** Kullanıcının açtığı detay seviyesinden bağımsız olarak sunucudan yalnızca görünen özet hücreleri iletilir. Veri hacmi büyüdükçe bu model zorunlu hâle gelir.
- **Pratik değerlendirme eşiği:** Yaklaşık 100 bin satıra kadar client-side işleme genellikle sorunsuzdur; 100 bin – 1 milyon aralığı ölçüm ve doğrulama gerektiren geçiş bölgesidir; 1 milyon ve üzeri için sunucu taraflı işleme planlanmalıdır.

## 7. Performans Önerileri

Aşağıdaki kontrol listesinin ilk üç maddesi, DevExpress'in resmî "Enhance Performance on Large Datasets" rehberinin ana önerileridir:

1. **Doğru işleme modunu seçin.** Büyük veri setlerinde `remoteOperations: true` ile özetlemeyi sunucuya taşıyın; OLAP altyapısı mevcutsa `XmlaStore` kullanın. En yüksek etkiye sahip karar budur; diğer tüm ayarlar bu kararın yanında ikincil kalır.
2. **Virtual scrolling'i etkinleştirin.** `scrolling: { mode: 'virtual' }` yapılandırmasıyla yalnızca görünür hücreler render edilir; büyük özet tablolarında DOM yükünü önemli ölçüde azaltır.
3. **OLAP kullanımında sayfalamayı etkinleştirin.** `XmlaStore` ile çalışırken `PivotGridDataSource.paginate: true`, veriyi görünüme girdikçe parça parça yükler (remote virtual scrolling).
4. **Büyük veride "Expand All" düğmesini devre dışı bırakın.** `allowExpandAll: false` — tüm hiyerarşinin tek adımda açılması, sunucudan veya bellekten çok büyük hacimde veri talep edilmesine yol açar.
5. **Alanları elle tanımlayın.** `retrieveFields: false` ayarıyla birlikte `fields` dizisini açıkça tanımlayın. Otomatik alan keşfi hem başlangıç maliyeti getirir hem de kullanıcıya gereksiz alanlar sunar.
6. **Hiyerarşileri kapalı başlatın.** Düğümler başlangıçta kapalı (collapsed) olmalıdır; kullanıcı yalnızca ihtiyaç duyduğu dalı açar. Açık başlayan derin hiyerarşi, ilk render'da hücre sayısını önemli ölçüde artırır.
7. **Görünür ölçü sayısını sınırlayın.** Her ek ölçü, her hücre kesişiminde ek bir hesaplama ve render maliyeti oluşturur. Nadiren kullanılan ölçüleri `visible: false` olarak başlatıp kullanıcı seçimine bırakın.
8. **Tarih alanlarında `groupInterval` kullanın.** Ham tarih değerini doğrudan boyut yapmak yerine `year` / `quarter` / `month` aralıklarıyla gruplayın; kardinalite düşer, pivot küçülür.
9. **Hücre başına ağır işlemlerden kaçının.** `customizeCell` benzeri hücre bazlı geri çağrılar her hücre için çalışır; içlerinde maliyetli hesaplama veya DOM işlemi bulunmamalıdır. Özel KPI hesaplamaları mümkün olduğunca özet seviyesinde (`calculateSummaryValue`) tutulmalıdır.
10. **Görünüm durumunu saklayın.** `stateStoring` ile kullanıcının oluşturduğu görünüm kaydedilmelidir; aynı görünümün her oturumda elle yeniden kurulması hem kullanıcı zamanı hem de tekrarlanan hesaplama maliyetidir.
11. **Büyük veride dışa aktarımı sunucuya taşıyın.** On binlerce hücrelik dosya üretimi tarayıcıyı kilitleyebilir; büyük çıktılar sunucu tarafında üretilip indirilmelidir.
12. **Varsaymak yerine ölçün.** Gerçekçi hacimde veriyle ilk yükleme, yeniden düzenleme ve genişletme süreleri tarayıcı profiler'ında ölçülmelidir; sınıra yaklaşılıyorsa bir üst işleme moduna geçilmelidir.

Fikir vermesi açısından tipik bir alan tanımı şu sadeliktedir:

```js
const dataSource = new PivotGridDataSource({
  store: rows, // yerel dizi — veya remoteOperations ile CustomStore / XmlaStore
  retrieveFields: false,
  fields: [
    { caption: 'Bölge', dataField: 'region', area: 'row' },
    { caption: 'Yıl', dataField: 'date', dataType: 'date', groupInterval: 'year', area: 'column' },
    { caption: 'Ciro', dataField: 'amount', summaryType: 'sum', format: 'currency', area: 'data' },
  ],
})
```

## 8. Güvenlik ve Veri Gizliliği

PivotGrid bir sunum bileşenidir; veri güvenliği bileşenin değil, veriyi sağlayan katmanın sorumluluğudur. Değerlendirmede aşağıdaki noktalar dikkate alınmalıdır:

- **Client-side modda tüm ham veri tarayıcıya indirilir.** Kullanıcı, geliştirici araçları üzerinden ekranda görünmeyen kayıtlar dahil veri setinin tamamına erişebilir. Bu nedenle **yetkilendirme sunucu tarafında uygulanmalıdır**: kullanıcının görmeye yetkili olmadığı veri istemciye hiç gönderilmemelidir. Arayüzde alan veya satır gizlemek bir güvenlik önlemi değildir.
- **Drill-through ham kayıtları açığa çıkarır.** Özet değeri görme yetkisi ile o özeti oluşturan ham kayıtları görme yetkisi aynı şey olmayabilir (örn. toplam maliyeti görebilen ancak kalem bazında fiyat göremeyecek kullanıcı). Alan ve kayıt düzeyindeki kısıtlar sunucu tarafında tanımlanmalıdır.
- **Dışa aktarım veri sızıntısı yüzeyi oluşturur.** Excel/PDF çıktıları kurum dışına taşınabilir; dışa aktarım yetkisi, kurumun veri sınıflandırma ve DLP politikalarıyla uyumlu biçimde sınırlandırılmalıdır.
- **OLAP bağlantısı doğrudan açılmamalıdır.** `XmlaStore`, tarayıcıdan OLAP sunucusuna HTTP erişimi gerektirir; bu erişim kimlik doğrulama ve yetkilendirme uygulayan bir ara katman (proxy/gateway) üzerinden sağlanmalıdır.
- **Görünüm durumu (state) filtre değerleri içerebilir.** `stateStoring` ile saklanan görünüm durumunda müşteri adı, ürün kodu gibi filtre değerleri yer alabilir; saklama ortamı buna göre seçilmelidir.

## 9. Karar Özeti

**PivotGrid, uygulama içine gömülü, self-servis bir pivot tablo çözümüdür.**

| Soru | Değerlendirme |
|---|---|
| Ne zaman kullanılmalı? | Kullanıcının veriyi kendi kurgusuyla, çok boyutlu olarak keşfetmesi gerekiyorsa |
| Ne zaman kullanılmamalı? | Rapor formatı sabitse (DataGrid yeterlidir) veya hedef ortam mobil/dar ekransa |
| Veri sınırı nedir? | Client-side: ~100 bin satıra kadar sorunsuz, 1 milyona doğru ölçüm gerekli; üzeri için sunucu taraflı mod zorunlu |
| En kritik performans kararı? | İşleme modu seçimi (client-side / `remoteOperations` / OLAP) — diğer tüm ayarlar ince ayar niteliğindedir |
| Maliyet kalemleri? | Geliştirici başına yıllık ticari lisans; büyük veri hedefleniyorsa arka uç özetleme servisi geliştirme eforu |
| En büyük risk? | Küçük veriyle doğrulanıp büyük veriyle canlıya çıkılması — işleme modu kararı gerçekçi hacimle test edilmeden verilmemelidir |

## 10. Terimler Sözlüğü

| Terim | Açıklama |
|---|---|
| **Pivot tablo** | Ham veri satırlarını satır × sütun kesişimli özet matrise dönüştüren tablo türü; Excel PivotTable bunun en bilinen örneğidir |
| **Boyut (dimension)** | Verinin kırılım eksenlerinden biri: bölge, ürün, tarih, vardiya gibi kategorik alanlar |
| **Ölçü (measure)** | Hücrelerde özetlenen sayısal değer: toplam ciro, adet, ortalama süre gibi |
| **Alan (field)** | Pivot yapılandırmasındaki temel birim; her alan bir bölgeye (satır, sütun, ölçü, filtre) atanır |
| **Hiyerarşi** | Boyutların iç içe sıralanması: Yıl → Çeyrek → Ay veya Bölge → Şehir gibi |
| **Kardinalite** | Bir alanın aldığı benzersiz değer sayısı; yüksek kardinalite (örn. müşteri numarası) pivotu büyütür ve yavaşlatır |
| **Drill-down** | Hiyerarşide bir seviye derine inme: yıl toplamından çeyrek kırılımına geçmek |
| **Drill-through** | Bir özet hücresini oluşturan ham veri kayıtlarına erişme |
| **Ara toplam / Genel toplam** | Hiyerarşinin her seviyesi için hesaplanan kısmi toplam / tablonun tamamı için hesaplanan toplam |
| **Client-side işleme** | Özetleme hesaplarının kullanıcının tarayıcısında yapılması; veri seti tarayıcıya indirilir |
| **Server-side işleme** | Özetleme hesaplarının sunucuda yapılması; tarayıcıya yalnızca görünen özet hücreleri gönderilir |
| **OLAP** | Çok boyutlu analitik sorgulama için tasarlanmış veri işleme yaklaşımı (Online Analytical Processing) |
| **OLAP küpü / SSAS** | Boyut ve ölçüleri önceden hesaplanmış biçimde saklayan veri yapısı; Microsoft SQL Server Analysis Services yaygın bir uygulamasıdır |
| **XMLA** | OLAP sunucularıyla konuşmak için kullanılan standart protokol; PivotGrid `XmlaStore` ile bu protokolü kullanır |
| **Virtual scrolling** | Tablonun tamamı yerine yalnızca ekranda görünen hücrelerin çizilmesi; büyük tablolarda performansı korur |
| **State (görünüm durumu)** | Kullanıcının kurduğu pivot düzeninin (alan yerleşimi, filtreler, açık düğümler) kaydedilebilir hâli |
| **Self-servis raporlama** | Rapor tasarımının geliştirici yerine son kullanıcı tarafından, hazır araçlarla yapılması yaklaşımı |

## 11. Kaynaklar

- [PivotGrid — Data Binding (resmî dokümantasyon)](https://js.devexpress.com/Vue/Documentation/Guide/UI_Components/PivotGrid/Data_Binding/)
- [PivotGrid — Enhance Performance on Large Datasets (resmî rehber)](https://js.devexpress.com/Vue/Documentation/Guide/UI_Components/PivotGrid/Enhance_Performance_on_Large_Datasets/)
- [DevExtreme HTML5 Pivot Grid — Remote Data Processing (DevExpress blog; 1M/3M kayıt ölçümleri)](https://community.devexpress.com/blogs/oliver/archive/2017/11/02/devextreme-html5-pivot-grid-remote-data-processing.aspx)
- [PivotGrid — Virtual Scrolling demo](https://js.devexpress.com/Demos/WidgetsGallery/Demo/PivotGrid/VirtualScrolling/)
- [PivotGridDataSource API (retrieveFields, remoteOperations, paginate, fields)](https://js.devexpress.com/Vue/Documentation/ApiReference/Data_Layer/PivotGridDataSource/Configuration/)
- [XmlaStore API — yalnızca Microsoft Analysis Services desteği](https://js.devexpress.com/Vue/Documentation/ApiReference/Data_Layer/XmlaStore/)
- [PivotGrid — Excel Export rehberi (ExcelJS + FileSaver)](https://js.devexpress.com/Vue/Documentation/Guide/UI_Components/PivotGrid/Export/)
- [pdfExporter API — PDF desteği yalnızca DataGrid ve Gantt](https://js.devexpress.com/Vue/Documentation/ApiReference/Common/Utils/pdfExporter/)
- [DevExtreme Lisanslama SSS](https://js.devexpress.com/Licensing/) · [Satın alma / fiyatlandırma](https://js.devexpress.com/Buy/)
