import { Oda } from '../src/oda.js';
import { MODLAR, MAC } from '../src/ayar.js';
import { yolAgi } from '../src/yol.js';

/**
 * Çevrim içi odalar: lobi (oda listesi, hızlı katıl, oda kur, katıl) ve her oda için 30 Hz benzetim.
 * Oda 8 koltukludur; boş koltuklarda botlar oynar. İçinde insan kalmayan oda kapanır.
 */
export function createRooms({ log = () => {} } = {}) {
  yolAgi(); // bot yol ağı ilk odadan önce kurulsun (≈0,2 sn)
  const odalar = new Map(), baglar = new Set();
  let odaNo = 1, simdi = performance.now();
  const ADLAR = ['Çeşme Başı', 'Köprü Altı', 'Kule Dibi', 'Pazar Yeri', 'Değirmen Önü', 'Han Avlusu', 'Bedesten', 'Saat Kulesi'];

  const ozet = () => ({ t: 'lobi', cevrimici: baglar.size, oyunda: [...odalar.values()].reduce((a, o) => a + o.insanSayisi, 0), odalar: [...odalar.values()].map(o => ({ id: o.id, ad: o.ad, mod: o.mac.mod, harita: o.mac.harita, insan: o.insanSayisi, kisi: o.mac.kisi })) });
  const lobiyeYay = () => { const m = JSON.stringify(ozet()); for (const b of baglar) if (!b.oda) b.yolla(m); };

  function odaKur(mod, harita) {
    const kullanilan = new Set([...odalar.values()].map(o => o.ad));
    const ad = ADLAR.find(a => !kullanilan.has(a)) ?? 'Meydan ' + odaNo;
    const oda = new Oda({ id: odaNo++, ad, mod: MODLAR[mod] ? mod : 'herkes', harita, zorluk: 'orta' });
    odalar.set(oda.id, oda); log('oda açıldı', oda.id, oda.ad, oda.mac.mod, oda.mac.harita);
    return oda;
  }
  function gir(b, oda, m) {
    if (oda.insanSayisi >= oda.mac.kisi) { b.yolla(JSON.stringify({ t: 'hata', m: 'Oda dolu.' })); return; }
    cik(b);
    b.oda = oda; b.id = oda.katil(mesaj => b.yolla(JSON.stringify(mesaj)), m.ad, m.avatar);
    log('katıldı', oda.ad, b.id, String(m.ad ?? '').slice(0, 16));
    lobiyeYay();
  }
  function cik(b) {
    if (!b.oda) return;
    const oda = b.oda; oda.ayril(b.id); b.oda = null; b.id = null;
    if (!oda.insanSayisi) { odalar.delete(oda.id); log('oda kapandı', oda.id, oda.ad); }
    lobiyeYay();
  }

  setInterval(() => {
    const t = performance.now(), dt = Math.min(0.1, (t - simdi) / 1000); simdi = t;
    for (const oda of odalar.values()) oda.adim(dt);
  }, 1000 / MAC.tik);
  setInterval(lobiyeYay, 5000);

  return {
    stats: () => ({ cevrimici: baglar.size, odalar: odalar.size, oyunda: [...odalar.values()].reduce((a, o) => a + o.insanSayisi, 0) }),
    attach(ws) {
      const b = {
        oda: null, id: null,
        yolla(veri) { if (ws.readyState === 1 && ws.bufferedAmount < 256 * 1024) ws.send(veri); },
      };
      baglar.add(b); lobiyeYay();
      let sayac = 0, pencere = Date.now();
      ws.on('message', veri => {
        // Taşkın koruması: saniyede 120 mesajdan fazlası düşer (30 Hz konum + ateş + doldurma yeter).
        const t = Date.now(); if (t - pencere > 1000) { pencere = t; sayac = 0; } if (++sayac > 120) return;
        let m; try { m = JSON.parse(veri); } catch { return; }
        if (!m || typeof m !== 'object') return;
        if (b.oda) { if (m.t === 'cik') cik(b); else b.oda.mesaj(b.id, m); return; }
        if (m.t === 'lobi') b.yolla(JSON.stringify(ozet()));
        else if (m.t === 'kur') gir(b, odaKur(m.mod, m.harita), m);
        else if (m.t === 'katil') { const oda = odalar.get(m.oda); if (oda) gir(b, oda, m); else b.yolla(JSON.stringify({ t: 'hata', m: 'Oda kapanmış.' })); }
        else if (m.t === 'hizli') {
          const uygun = [...odalar.values()].filter(o => o.mac.mod === m.mod && o.mac.harita === m.harita && o.insanSayisi < o.mac.kisi).sort((a, c) => c.insanSayisi - a.insanSayisi)[0];
          gir(b, uygun ?? odaKur(m.mod, m.harita), m);
        }
      });
      ws.on('close', () => { cik(b); baglar.delete(b); lobiyeYay(); });
      ws.on('error', () => {});
    },
  };
}
