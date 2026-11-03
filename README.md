# 🕌 Ezan Vakitleri ve Namaz Takibi

Telefonuma hiçbir uygulama indirmeden, sadece bir GitHub bağlantısıyla açılan basit bir ezan vakitleri sitesi. Seçtiğim şehrin namaz vakitlerini gösteriyor ve kıldığım namazları günlük olarak takip etmemi sağlıyor.

## Neden yaptım?

- Ezan vakitleri için ayrı bir uygulama indirmek istemedim.
- Reklamsız, sade ve yumuşak görünümlü bir ekran istedim.
- İnternete her açışta bağlanmasın, günde bir kere veriyi çekip sonra internetsiz de çalışsın istedim.
- Beş vakit namazı kılıp kılmadığımı gün gün işaretleyip geriye dönüp bakabileyim istedim.

## Neler yapıyor?

**Vakitler sayfası**
- Sayfanın başında o günün tarihi (ve hicri tarih) yazıyor.
- İmsak, Güneş, Öğle, İkindi, Akşam ve Yatsı vakitlerini gösteriyor.
- Sıradaki vakte ne kadar kaldığını canlı sayıyor.
- Kerahat vakitlerini gösteriyor (güneş doğarken, istiva ve güneş batarken). Şu an kerahat vaktindeysem o satır vurgulanıyor.
- İstediğim şehri ekleyebiliyorum, birden fazla şehir arasında geçiş yapabiliyorum, şehri silebiliyorum.

**Namaz Takibi sayfası**
- Bugünün 5 vaktini (Sabah, Öğle, İkindi, Akşam, Yatsı) dokunarak işaretliyorum.
- Geçmiş günler kayıtlı kalıyor, istersem geçmiş bir günü sonradan düzeltebiliyorum.
- Son 7 gün, tam gün serisi ve toplam kılınan vakit sayısı görünüyor.
- Yedeği kopyala / yedeği yükle düğmeleriyle kayıtlarımı yedekleyebiliyorum.

## Nasıl çalışıyor?

- **Vakit verisi:** [Aladhan API](https://aladhan.com/prayer-times-api) üzerinden, Diyanet İşleri Başkanlığı hesaplama yöntemiyle çekiliyor. Bir kere bağlanınca o ayın tamamı telefona kaydediliyor, sonra internet gerekmiyor. Kayıtlı veri bitince (ya da yeni ay gelince) internet varken kendiliğinden yenileniyor.
- **Çevrimdışı çalışma:** Sayfa bir PWA (ana ekrana eklenebilen web uygulaması). Service worker dosyaları telefona önbelleğe alıyor.
- **Kayıtlar:** Şehirler ve namaz takibi sadece kendi telefonumda, tarayıcının `localStorage` alanında tutuluyor. Hiçbir sunucuya gönderilmiyor.

## Kurulum (telefondan)

1. Tüm dosyaları bir GitHub reposuna yükle (repo **Public** olmalı).
2. Repo'da **Settings → Pages → Deploy from a branch → `main` / root** seç, kaydet.
3. Birkaç dakika sonra `https://kullaniciadin.github.io/repoadi/` adresi açılır.
4. Bu adresi iPhone'da **Safari** ile aç, **Paylaş → Ana Ekrana Ekle** de.
5. İlk açılışta internet açıkken **＋ Şehir** düğmesiyle şehri ekle (örn. `Istanbul`, ülke `Turkey`).

## Dosyalar

| Dosya | Görevi |
|---|---|
| `index.html` | Ezan vakitleri sayfası |
| `takip.html` | Namaz takibi sayfası |
| `style.css` | Yumuşak renkli, açık/koyu moda uyumlu tasarım |
| `app.js` | Tüm mantık: veri çekme, kaydetme, geri sayım, takip |
| `sw.js` | Çevrimdışı çalışmayı sağlayan service worker |
| `manifest.webmanifest` | Ana ekrana eklenebilir uygulama ayarları |
| `icon-180.png`, `icon-512.png` | Uygulama ikonları |

## Bilmem gerekenler

- Şehir adını İngilizce/ASCII yazmak gerekiyor (`Istanbul`, `Izmir`).
- Kerahat süreleri yaklaşık 45 dakika olarak ayarlı. Farklı olması gerekirse `app.js` dosyasının başındaki `KERAHAT` satırından değiştirilebilir.
- Tarayıcıdaki sürüm ile ana ekrandaki uygulamanın kayıtları ayrı tutulur. Şehir ve takip için ana ekrandaki uygulamayı kullanmak gerekiyor.
- Uygulama silinirse takip kayıtları da gider, bu yüzden ara sıra yedek almak iyi olur.
- Saatler Diyanet yöntemiyle hesaplanıyor ama kesin ibadet vakitleri için yerel müftülük takvimine de bakılabilir.

## Güncelleme geçmişi

- **v1:** Ezan ve kerahat vakitleri, şehir ekleme, çevrimdışı çalışma, günlük tarih, namaz takibi sayfası, yedekleme.
