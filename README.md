# Tetik Meydanı

Juland'ın kutu karakterleriyle tarayıcıda hızlı arena atış oyunu (ev.io esinli). Çift zıplama, Shift ile koşu;
tüfek, keskin, pompalı, kılıç ve kalpazan evinin önündeki roketatar. Botlarla tek başına ya da çevrim içi odada oynanır.

## Çalıştırma

```
npm install
npm start          # http://127.0.0.1:5210  (Baslat.cmd tarayıcıyı da açar)
npm test           # benzetim (fizik, yol ağı, isabet, geri sarma, roket, oda, botlu maç) + çevrim içi odalar
```

`?otomatik=1` botlu oyunu hemen başlatır, `?oda=KPRT-4` o odaya kendiliğinden girer, `?cevrimdisi=1` sunucuya bağlanmayı denemez, `?sunucu=ws://…` başka sunucu.

## Düzen

| Dosya | Ne yapar |
| --- | --- |
| `src/ayar.js` | Bütün sayılar: hareket, silahlar, modlar, bot zorlukları |
| `src/harita.js` | Harita kaydı; etkin harita `H` (fizik, yol ağı, görünüm okur). Odalar işe başlarken `haritaKullan(id)` |
| `src/haritalar/` | Tek harita: Dış Mahalle (Juland'daki Tetik Meydanı haritası). Bloklar `src/mahalle.js` + `src/bloklar.js` (Juland'dan kopya), blok blok çizimi `src/mahalle-gorunum.js` |
| `src/fizik.js` | Hareket (çift zıplama, koşu, basamak, zıplatma), ışın–kutu, saçma tohumu |
| `src/yol.js` | Bot yol ağı haritadan kendiliğinden çıkar (1 blokluk hücre, zıplanır engel, düşüş, zıplatma kenarı) + A* |
| `src/mac.js` | Maç benzetimi: ateş (geri sarmalı isabet), hasar, leş, doğuş, alınanlar, roket, skor |
| `src/bot.js` | Bot: görür, tepki süresi, zorluğa göre nişan sapması, silah seçimi, yan kayma, yol ağında gezinme |
| `src/oda.js` | Maçı istemcilere bağlar; sunucuda çevrim içi oda, tarayıcıda botlu oyun aynı sınıf |
| `src/main.js` | İstemci: giriş, kendi karakterin (istemci yürütür), ara değerleme, göstergeler, menüler |
| `src/gorunum.js`, `src/karakter.js` | Three.js görünüm; karakter Juland `avatar.js` oranlarında, silah tutar |
| `src/avatar-veri.js` | Juland'dan kopya (6 hazır karakter). Juland'da değişirse buraya da kopyala |
| `server.mjs`, `server/odalar.mjs` | Statik dosyalar + WebSocket: açık oda listesi, kodlu odalar, bekleme odası, maç (30 Hz) |

Ağ: herkes kendi konumunu yollar (30 Hz), sunucu ateşi istemcinin gördüğü ana (en çok 0,3 sn) geri sararak hesaplar.
Botlar ve roketler sunucuda yürür. Oda 8 koltuk; boş koltuklarda bot oynar.

## Çevrim içi akış

Bütün josephuz oyunlarındaki oda standardına uyar (`josephuz/docs/oda-standardi.md`):

- **Ana ekran:** ADIN · karakter, MOD, BOTLAR ve **TEK BAŞINA ↗** · **ÇEVRİM İÇİ** (`● N çevrim içi`): **HIZLI KATIL →**,
  **ODA KUR**, **ODAYA KATIL** (ODA KODU + KATIL, Enter) ve **AÇIK ODALAR** listesi (kuran · mod · zorluk · n/8 oyuncu,
  LOBİDE/MAÇTA, KATIL →/DOLU). Sunucuya bağlanılamazken düğmeler kapalı ve YAKINDA, liste gizli. Listeyi sunucu,
  odada olmayan bağlantılara değişince kendisi yollar (~250 ms toplar); istemci yoklamaz.
- **Oda kodu** `KPRT-4` (4 harf ABCDEFGHJKLMNPRSTUVYZ + rakam 23456789, benzersiz); `KPRT4` yazılsa da olur.
  Davet linki `https://tetikmeydani.josephuz.com/?oda=KPRT-4`; odadayken adres çubuğu `?oda=KOD` gösterir.
- **Oda kur** odayı hemen ana ekrandaki mod ve bot zorluğuyla, herkese açık kurar. **Hızlı katıl** önce lobideki, sonra
  insanı çok olan açık odaya oturtur (maçtaki oda da olur); yoksa yeni açık oda kurar.
- **Bekleme odası:** kod, Linki kopyala, AÇIK ODA / ÖZEL ODA. Takım Çatışması'nda Mavi (koltuk 1–4) ve Kırmızı (5–8)
  sütunları, Herkes Herkese'de 8 koltuk. Boş koltuğa tıklayan oraya geçer; kuran oyuncuyu sürükler ya da tıklayıp
  koltuğa tıklar (doluysa yer değişir). Kuran MOD, BOT ZORLUĞU ve ODA (Herkese açık / Özel) seçer, **MAÇI BAŞLAT ↗**.
  Takımlar koltuklardan gelir, boş koltukları botlar doldurur; bot zorluğu odanın ayarıdır.
- **Maç sürerken** gelen (kod, link, liste, hızlı katıl) doğrudan maça girer, bir botun yerini alır.
- **Maç bitince** oda bekleme odasına döner; sonuç ekranında **LOBİYE DÖN**. Duraklat menüsünde çevrim içiyken
  **Odadan çık**, tek başınayken **Ana menü**. Tek başına oyunda maçlar eskisi gibi kendiliğinden yeniden başlar.
- **Kopma:** koltuk 60 sn saklanır (maçta yerini bot oynar); sayfa yenilenince sessionStorage'daki jetonla aynı
  koltuğa dönülür. Kuran çıkarsa kuranlık sıradaki insana geçer; kimse kalmayınca oda kapanır.

## Yayın

- İstemci: Cloudflare Worker, `tetikmeydani.josephuz.com` → `npm run deploy:web`
- Sunucu: Docker + Cloudflare Tunnel, `tetikmeydani-sunucu.josephuz.com` → `docker compose --profile tunnel up -d --build`
  (`.env` içinde `TUNNEL_TOKEN`, paneldeki rota `http://localhost:5210`).
