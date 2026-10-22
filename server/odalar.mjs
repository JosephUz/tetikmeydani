import { randomBytes } from 'node:crypto';
import { Oda, KOD_HARF, KOD_RAKAM, kodDuzelt } from '../src/oda.js';
import { MODLAR, ZORLUK, MAC } from '../src/ayar.js';
import { yolAgi } from '../src/yol.js';
import { adDuzelt, avatarDuzelt } from '../src/avatar-veri.js';

/**
 * Çevrim içi odalar (josephuz oda standardı, C:\ju\josephuz\docs\oda-standardi.md):
 * - Oda kodla tanınır (KPRT-4), herkese açık ya da özel; 8 koltuk, boş koltuklarda botlar oynar.
 * - Oda önce bekleme odasıdır (durum 'lobi'): koltuk seçilir, kuran ayarları değiştirir ve maçı başlatır.
 *   Takım Çatışması'nda koltuk 0–3 Mavi, 4–7 Kırmızı.
 * - Maç sürerken gelen oyuncu doğrudan maça girer, bir botun koltuğunu devralır. Maç bitince oda bekleme odasına döner.
 * - Kopan oyuncunun koltuğu ~60 sn saklanır (maçta yerini bot oynar); jetonla dönen koltuğunu geri alır.
 * - Odada olmayan bağlantılara açık oda listesi, liste değişince gönderilir (~250 ms toplanır).
 *
 * Testler için: zamanlayici: false (adım elle: adim(dt), temizle()), lobiGecikme: 0 (liste hemen), saat (ms).
 */
export const KOLTUK = 8, KOPMA_SURE = 60_000, LISTE_EN_COK = 20;

export function createRooms({ log = () => {}, zamanlayici = true, lobiGecikme = 250, saat = () => Date.now() } = {}) {
  yolAgi(); // bot yol ağı ilk odadan önce kurulsun (≈0,2 sn)
  const odalar = new Map(), baglar = new Set();
  let simdi = performance.now(), lobiT = null;

  const takimOf = (oda, i) => MODLAR[oda.mod].takimli ? (i < KOLTUK / 2 ? 0 : 1) : undefined;
  const doluSayi = oda => oda.koltuklar.filter(Boolean).length;
  const bagliSayi = oda => oda.koltuklar.filter(s => s?.bag).length;
  const bosVar = oda => oda.koltuklar.some(s => !s);

  function yeniKod() {
    for (;;) {
      const b = randomBytes(5);
      const k = [0, 1, 2, 3].map(i => KOD_HARF[b[i] % KOD_HARF.length]).join('') + '-' + KOD_RAKAM[b[4] % KOD_RAKAM.length];
      if (!odalar.has(k)) return k;
    }
  }

  function ozet() {
    const l = [...odalar.values()].filter(o => !o.ozel)
      .sort((a, b) => (a.durum === 'lobi' ? 0 : 1) - (b.durum === 'lobi' ? 0 : 1) || doluSayi(b) - doluSayi(a));
    return {
      t: 'lobi', cevrimici: baglar.size, oyunda: [...odalar.values()].reduce((a, o) => a + bagliSayi(o), 0), toplam: l.length,
      odalar: l.slice(0, LISTE_EN_COK).map(o => ({ kod: o.kod, kuran: o.koltuklar[o.kuran]?.ad ?? '', mod: o.mod, zorluk: o.zorluk, insan: doluSayi(o), kisi: KOLTUK, durum: o.durum })),
    };
  }
  function lobiyeYay() { lobiT = null; const m = JSON.stringify(ozet()); for (const b of baglar) if (!b.oda) b.yolla(m); }
  function lobiDegisti() { if (!lobiGecikme) lobiyeYay(); else lobiT ??= setTimeout(lobiyeYay, lobiGecikme); }

  /** Odadaki herkese bekleme odası durumu (sen: alıcının koltuğu). */
  function odaYay(oda) {
    const koltuklar = oda.koltuklar.map(s => s && { ad: s.ad, koptu: s.koptu ? 1 : 0 });
    for (const [i, s] of oda.koltuklar.entries()) if (s?.bag) s.bag.yolla(JSON.stringify({ t: 'oda', kod: oda.kod, durum: oda.durum, mod: oda.mod, zorluk: oda.zorluk, ozel: oda.ozel ? 1 : 0, kuran: oda.kuran, sen: i, koltuklar }));
  }

  function odaKur(m) {
    const oda = { kod: yeniKod(), ozel: false, mod: MODLAR[m.mod] ? m.mod : 'herkes', zorluk: ZORLUK[m.zorluk] ? m.zorluk : 'orta', durum: 'lobi', kuran: null, koltuklar: Array(KOLTUK).fill(null), oda: null };
    odalar.set(oda.kod, oda); log('oda açıldı', oda.kod, oda.mod, oda.zorluk);
    return oda;
  }
  function odaKapat(oda) { odalar.delete(oda.kod); oda.oda = null; log('oda kapandı', oda.kod); }

  /** Boş koltuk: takımlıda insanı az olan takımın ilk boşu. */
  function bosKoltuk(oda) {
    const bos = oda.koltuklar.map((s, i) => s ? -1 : i).filter(i => i >= 0); if (!bos.length) return -1;
    if (!MODLAR[oda.mod].takimli) return bos[0];
    const say = [0, 0]; oda.koltuklar.forEach((s, i) => { if (s) say[takimOf(oda, i)]++; });
    const az = say[0] <= say[1] ? 0 : 1;
    return bos.find(i => takimOf(oda, i) === az) ?? bos[0];
  }

  function macaSok(oda, i) {
    const s = oda.koltuklar[i]; if (!s?.bag || !oda.oda || s.id != null) return;
    s.id = oda.oda.katil(mesaj => s.bag?.yolla(JSON.stringify(mesaj)), s.ad, s.avatar, takimOf(oda, i));
  }
  function mactanCikar(oda, s) { if (s.id != null && oda.oda) oda.oda.ayril(s.id); s.id = null; }

  /** Kuran koptuysa ya da çıktıysa kuranlık bağlı ilk insana geçer. */
  function kuranDevir(oda) {
    const k = oda.koltuklar[oda.kuran];
    if (k?.bag) return;
    const bagli = oda.koltuklar.findIndex(s => s?.bag);
    if (bagli >= 0) oda.kuran = bagli;
    else if (!k) oda.kuran = oda.koltuklar.findIndex(Boolean);
  }

  function gir(b, oda, m) {
    if (b.oda) cik(b);
    let i = typeof m.jeton === 'string' && m.jeton ? oda.koltuklar.findIndex(s => s && s.jeton === m.jeton) : -1;
    const geri = i >= 0;
    if (geri && oda.koltuklar[i].bag) {
      // Eski bağlantı henüz kapanmadı (sayfa yenilendi): koltuk yeni bağlantıya geçer.
      const eski = oda.koltuklar[i].bag; mactanCikar(oda, oda.koltuklar[i]); eski.oda = null; oda.koltuklar[i].bag = null;
    }
    if (!geri) {
      i = bosKoltuk(oda);
      if (i < 0) { b.yolla(JSON.stringify({ t: 'hata', kod: 'oda.dolu', m: 'Oda dolu' })); return false; }
      oda.koltuklar[i] = { ad: adDuzelt(m.ad) || 'Oyuncu-' + Math.floor(1000 + Math.random() * 9000), avatar: avatarDuzelt(m.avatar), jeton: randomBytes(12).toString('hex'), bag: null, koptu: false, kopZ: 0, id: null };
    }
    const s = oda.koltuklar[i];
    s.bag = b; s.koptu = false;
    if (oda.kuran == null || oda.kuran < 0) oda.kuran = i;
    b.oda = oda;
    kuranDevir(oda);
    b.yolla(JSON.stringify({ t: 'odada', kod: oda.kod, jeton: s.jeton, geri: geri ? 1 : 0 }));
    log(geri ? 'geri döndü' : 'katıldı', oda.kod, i, s.ad);
    odaYay(oda);
    if (oda.durum === 'mac') macaSok(oda, i);
    lobiDegisti();
    return true;
  }
  const koltugum = b => b.oda ? b.oda.koltuklar.findIndex(s => s?.bag === b) : -1;

  /** kopma: bağlantı koptu (koltuk ~60 sn saklanır); yoksa oyuncu kendi çıktı. */
  function cik(b, kopma = false) {
    const oda = b.oda; if (!oda) return;
    const i = koltugum(b); b.oda = null;
    if (i >= 0) {
      const s = oda.koltuklar[i];
      mactanCikar(oda, s); s.bag = null;
      if (kopma) { s.koptu = true; s.kopZ = saat(); } else oda.koltuklar[i] = null;
    }
    if (!oda.koltuklar.some(Boolean)) odaKapat(oda);
    else { kuranDevir(oda); odaYay(oda); }
    lobiDegisti();
  }

  /** Koltuk değişimi (bekleme odasında): boşsa taşınır, doluysa ikisi yer değiştirir. */
  function tasi(oda, kimden, kime) {
    if (oda.durum !== 'lobi' || kimden === kime || !oda.koltuklar[kimden] || !(kime >= 0 && kime < KOLTUK)) return false;
    const a = oda.koltuklar[kimden], c = oda.koltuklar[kime];
    oda.koltuklar[kime] = a; oda.koltuklar[kimden] = c;
    if (oda.kuran === kimden) oda.kuran = kime; else if (oda.kuran === kime) oda.kuran = kimden;
    odaYay(oda);
    return true;
  }

  function basla(oda) {
    if (oda.durum !== 'lobi') return;
    oda.durum = 'mac';
    oda.oda = new Oda({ ad: oda.kod, mod: oda.mod, zorluk: oda.zorluk, tekMac: true });
    log('maç başladı', oda.kod, oda.mod, oda.zorluk, bagliSayi(oda) + ' insan');
    odaYay(oda);
    for (let i = 0; i < KOLTUK; i++) macaSok(oda, i);
    lobiDegisti();
  }
  function lobiyeDon(oda) {
    oda.durum = 'lobi'; oda.oda = null;
    for (const s of oda.koltuklar) if (s) s.id = null;
    log('maç bitti', oda.kod);
    odaYay(oda); lobiDegisti();
  }

  function odaMesaji(b, m) {
    const oda = b.oda, i = koltugum(b); if (i < 0) return;
    const kuran = oda.kuran === i, s = oda.koltuklar[i];
    switch (m.t) {
      case 'cik': cik(b); break;
      case 'otur': if (!oda.koltuklar[m.koltuk]) tasi(oda, i, m.koltuk | 0); break;
      case 'tasi': if (kuran) tasi(oda, m.kimden | 0, m.koltuk | 0); break;
      case 'ayar':
        if (!kuran || oda.durum !== 'lobi') break;
        if (MODLAR[m.mod]) oda.mod = m.mod;
        if (ZORLUK[m.zorluk]) oda.zorluk = m.zorluk;
        if (m.ozel != null) oda.ozel = !!m.ozel;
        odaYay(oda); lobiDegisti(); break;
      case 'basla': if (kuran) basla(oda); break;
      default: if (oda.oda && s.id != null) oda.oda.mesaj(s.id, m);
    }
  }

  function adim(dt) {
    for (const oda of odalar.values()) {
      if (!oda.oda) continue;
      oda.oda.adim(dt);
      if (oda.oda.mac.durum === 'son') lobiyeDon(oda);
    }
  }
  /** Süresi dolan kopuk koltuklar boşalır; kimse kalmayan oda kapanır. */
  function temizle() {
    const t = saat();
    for (const oda of [...odalar.values()]) {
      let degisti = false;
      oda.koltuklar.forEach((s, i) => { if (s && !s.bag && t - s.kopZ >= KOPMA_SURE) { oda.koltuklar[i] = null; degisti = true; } });
      if (!degisti) continue;
      if (!oda.koltuklar.some(Boolean)) odaKapat(oda); else { kuranDevir(oda); odaYay(oda); }
      lobiDegisti();
    }
  }

  const zamanlar = [];
  if (zamanlayici) {
    zamanlar.push(setInterval(() => { const t = performance.now(), dt = Math.min(0.1, (t - simdi) / 1000); simdi = t; adim(dt); }, 1000 / MAC.tik));
    zamanlar.push(setInterval(temizle, 1000));
  }

  return {
    odalar, adim, temizle, ozet,
    kapat() { for (const z of zamanlar) clearInterval(z); clearTimeout(lobiT); },
    stats: () => ({ cevrimici: baglar.size, odalar: odalar.size, oyunda: [...odalar.values()].reduce((a, o) => a + bagliSayi(o), 0) }),
    attach(ws) {
      const b = { oda: null, yolla(veri) { if (ws.readyState === 1 && ws.bufferedAmount < 256 * 1024) ws.send(veri); } };
      baglar.add(b); b.yolla(JSON.stringify(ozet())); lobiDegisti();
      let sayac = 0, pencere = Date.now();
      ws.on('message', veri => {
        // Taşkın koruması: saniyede 120 mesajdan fazlası düşer (30 Hz konum + ateş + doldurma yeter).
        const t = Date.now(); if (t - pencere > 1000) { pencere = t; sayac = 0; } if (++sayac > 120) return;
        let m; try { m = JSON.parse(veri); } catch { return; }
        if (!m || typeof m !== 'object') return;
        if (b.oda) { odaMesaji(b, m); return; }
        if (m.t === 'lobi') b.yolla(JSON.stringify(ozet()));
        else if (m.t === 'kur') gir(b, odaKur(m), m);
        else if (m.t === 'katil') {
          const kod = kodDuzelt(m.kod), oda = kod && odalar.get(kod);
          if (oda) gir(b, oda, m); else b.yolla(JSON.stringify({ t: 'hata', kod: 'oda.yok', m: 'Böyle bir oda yok' }));
        } else if (m.t === 'hizli') {
          const uygun = [...odalar.values()].filter(o => !o.ozel && bosVar(o))
            .sort((a, c) => (a.durum === 'lobi' ? 0 : 1) - (c.durum === 'lobi' ? 0 : 1) || doluSayi(c) - doluSayi(a))[0];
          gir(b, uygun ?? odaKur(m), m);
        }
      });
      ws.on('close', () => { cik(b, true); baglar.delete(b); lobiDegisti(); });
      ws.on('error', () => {});
    },
  };
}
