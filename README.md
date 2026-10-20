# Tetik Meydanı

Juland'ın kutu karakterleriyle tarayıcıda hızlı arena atış oyunu (ev.io esinli). Çift zıplama, Shift ile koşu, zıplatma taşları;
tüfek, keskin, pompalı, kılıç ve kulenin tepesindeki roketatar. Botlarla tek başına ya da çevrim içi odada oynanır.

## Çalıştırma

```
npm install
npm start          # http://127.0.0.1:5210  (Baslat.cmd tarayıcıyı da açar)
npm test           # benzetim testleri (fizik, yol ağı, isabet, geri sarma, roket, oda, botlu maç)
```

`?otomatik=1` botlu oyunu hemen başlatır, `?cevrimdisi=1` sunucuya bağlanmayı denemez, `?sunucu=ws://…` başka sunucu.

## Düzen

| Dosya | Ne yapar |
| --- | --- |
| `src/ayar.js` | Bütün sayılar: hareket, silahlar, modlar, bot zorlukları |
| `src/harita.js` | Harita kaydı; etkin harita `H` (fizik, yol ağı, görünüm okur). Odalar işe başlarken `haritaKullan(id)` |
| `src/haritalar/` | Meydan (kendi haritamız), Buz Dünyası (fy_iceworld esinli), Çöl Kasabası (de_dust2 esinli: yürünen alanlar dikdörtgen, kalanı duvar) |
| `src/fizik.js` | Hareket (çift zıplama, koşu, basamak, zıplatma), ışın–kutu, saçma tohumu |
| `src/yol.js` | Bot yol ağı haritadan kendiliğinden çıkar (1 blokluk hücre, zıplanır engel, düşüş, zıplatma kenarı) + A* |
| `src/mac.js` | Maç benzetimi: ateş (geri sarmalı isabet), hasar, leş, doğuş, alınanlar, roket, skor |
| `src/bot.js` | Bot: görür, tepki süresi, zorluğa göre nişan sapması, silah seçimi, yan kayma, yol ağında gezinme |
| `src/oda.js` | Maçı istemcilere bağlar; sunucuda çevrim içi oda, tarayıcıda botlu oyun aynı sınıf |
| `src/main.js` | İstemci: giriş, kendi karakterin (istemci yürütür), ara değerleme, göstergeler, menüler |
| `src/gorunum.js`, `src/karakter.js` | Three.js görünüm; karakter Juland `avatar.js` oranlarında, silah tutar |
| `src/avatar-veri.js` | Juland'dan kopya (6 hazır karakter). Juland'da değişirse buraya da kopyala |
| `server.mjs`, `server/odalar.mjs` | Statik dosyalar + WebSocket lobisi ve odalar (30 Hz) |

Ağ: herkes kendi konumunu yollar (30 Hz), sunucu ateşi istemcinin gördüğü ana (en çok 0,3 sn) geri sararak hesaplar.
Botlar ve roketler sunucuda yürür. Oda 8 koltuk; boş koltuklarda bot oynar.

## Yayın

- İstemci: Cloudflare Worker, `tetikmeydani.josephuz.com` → `npm run deploy:web`
- Sunucu: Docker + Cloudflare Tunnel, `tetikmeydani-sunucu.josephuz.com` → `docker compose --profile tunnel up -d --build`
  (`.env` içinde `TUNNEL_TOKEN`, paneldeki rota `http://localhost:5210`).
