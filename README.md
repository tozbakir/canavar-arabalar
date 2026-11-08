# 🏁 Canavar Arabalar: #75 & #18 Mavi Rampa Macerası

iPadOS (Safari / WebKit) için özel olarak 60 FPS optimize edilmiş, sonsuz döngüye (Endless Sandbox) sahip 2D fizik tabanlı **Canavar Arabalar Mavi Rampadan Atlama Oyunu**.

## 🚙 Araçlar (Referans Oyuncak Tasarımları)
1. **#75 Flame Crusher (Yeşil Canavar Araba):**
   - Metalik fıstık/zümrüt yeşili Baja spor kamyonet gövdesi, kaput ve yanlarda turuncu-sarı alev (flame) desenleri, kapıda **75** numarası, arka kasada eğimli yedek lastik/türbin modülü.
   - Yüksek gri mekanik kafes şasi, gerçek zamanlı esneyen helezon yaylar, dev dişli siyah lastikler ve **KIRMIZI** iç jantlar.
2. **#18 Game Racing (Kırmızı Canavar Araba):**
   - Parlak kırmızı pickup kamyonet gövde, beyaz diyagonal yarış şeritleri, kaputta daire içinde **18** numarası, yan gövdede **GAME RACING** yazısı.
   - Yüksek gri mekanik kafes şasi, gerçek zamanlı esneyen helezon yaylar, dev dişli siyah lastikler ve **MAVİ** iç jantlar.

## 🎮 Özellikler
- **Sonsuz Döngü (Asla Game Over Olmaz):** Araç ters dönerse **Otomatik Yaylanma (Auto-Flip)** mekanizmasıyla saniyeler içinde zıplayarak düzeltilir.
- **Prosedürel Mavi Rampalar:** Küçük, orta, turbo hızlandırıcılı ve devasa **Mega Mavi Rampalar** sonsuz olarak üretilir.
- **Tek Dokunuşla Araç Değiştirme & 2 Araba Yarış Modu:** Üst menüden anında `#75 Yeşil` ile `#18 Kırmızı` araba arasında geçiş yapılabilir veya iki arabanın birlikte mavi rampalardan atlaması sağlanabilir.
- **Sıfır Harici Ses Bağımlılığı:** Web Audio API ile gerçek zamanlı sentezlenen V8 motor sesi, havalı korna, rampa fırlatma, yıldız toplama ve takla fanfar sesleri.

---

## 🚀 Yerel Önizleme (Local Test)

Proje %100 statik HTML/CSS/JS dosyalarından oluşur. Yerel olarak test etmek için:

```bash
python3 -m http.server 8080
```

Ardından tarayıcıda `http://localhost:8080` adresini açabilirsiniz. Aynı Wi-Fi ağındaki iPad'den test etmek için bilgisayarınızın yerel IP adresini (`http://192.168.x.x:8080`) iPad Safari'de açabilirsiniz.

---

## 🌐 GitHub Pages (`github.io`) Üzerinden Yayına Alma Rehberi

1. **GitHub'da Yeni Bir Repo Oluşturun:**
   - [github.com/new](https://github.com/new) adresine gidin.
   - Repository adına örneğin `canavar-arabalar` yazın ve **Public** seçerek **Create repository** butonuna basın.

2. **Proje Dosyalarını GitHub'a Yükleyin:**
   Terminalde aşağıdaki komutları çalıştırın (`KULLANICI_ADINIZ` kısmını kendi GitHub kullanıcı adınızla değiştirin):

   ```bash
   git init
   git branch -M main
   git add index.html style.css game.js manifest.json icon.svg apple-touch-icon.png README.md
   git commit -m "feat: Canavar Arabalar #75 ve #18 Mavi Rampa Oyunu"
   git remote add origin https://github.com/KULLANICI_ADINIZ/canavar-arabalar.git
   git push -u origin main
   ```

3. **GitHub Pages'i Aktif Edin:**
   - GitHub reponuzda **Settings** -> sol menüden **Pages** sekmesine tıklayın.
   - **Build and deployment** altında **Source** olarak `Deploy from a branch` seçin.
   - **Branch** olarak `main` ve klasör olarak `/ (root)` seçip **Save** butonuna basın.
   - 1 dakika içinde oyununuz şu adreste yayında olacaktır:
     `https://KULLANICI_ADINIZ.github.io/canavar-arabalar/`

---

## 📱 iPad'de Tam Ekran Uygulama Olarak Ekleme (Add to Home Screen)

1. iPad'de **Safari** uygulamasını açın ve `https://KULLANICI_ADINIZ.github.io/canavar-arabalar/` adresine gidin.
2. Sağ üstteki **Paylaş (Share)** ikonuna (yukarı ok içeren kare) dokunun.
3. Menüden **Ana Ekrana Ekle (Add to Home Screen)** seçeneğine dokunun ve **Ekle** deyin.
4. Artık oyun iPad ana ekranında kendi Canavar Araba ikonuyla yer alacak ve tıklandığında adres çubuğu olmadan **%100 Tam Ekran (Fullscreen Native App gibi)** çalışacaktır!
