import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRooms, KOLTUK, KOPMA_SURE } from '../server/odalar.mjs';
import { kodDuzelt, KOD_HARF, KOD_RAKAM } from '../src/oda.js';

/** Sahte WebSocket: gönderilenler gelen[]'de, yolla(m) sunucuya mesaj. */
class SahteWs extends EventEmitter {
  constructor() { super(); this.readyState = 1; this.bufferedAmount = 0; this.gelen = []; }
  send(s) { this.gelen.push(JSON.parse(s)); }
  yolla(m) { this.emit('message', JSON.stringify(m)); }
  son(t) { for (let i = this.gelen.length - 1; i >= 0; i--) if (this.gelen[i].t === t) return this.gelen[i]; return null; }
  kapat() { this.readyState = 3; this.emit('close'); }
}
function kurulum() {
  let t = 1_000_000;
  const r = createRooms({ zamanlayici: false, lobiGecikme: 0, saat: () => t });
  const yeni = () => { const ws = new SahteWs(); r.attach(ws); return ws; };
  return { r, yeni, ilerle: ms => { t += ms; } };
}
const AV = { model: 'madenci' };

test('oda kodu biçimi KPRT-4, düzeltme, benzersiz', () => {
  const { r, yeni } = kurulum();
  const desen = new RegExp(`^[${KOD_HARF}]{4}-[${KOD_RAKAM}]$`), kodlar = new Set();
  for (let i = 0; i < 60; i++) { const ws = yeni(); ws.yolla({ t: 'kur', ad: 'K' + i, avatar: AV, mod: 'herkes', zorluk: 'orta' }); const k = ws.son('odada').kod; assert.match(k, desen); kodlar.add(k); }
  assert.equal(kodlar.size, 60);
  assert.equal(kodDuzelt('kprt4'), 'KPRT-4'); assert.equal(kodDuzelt(' KPRT-4 '), 'KPRT-4'); assert.equal(kodDuzelt('KPR'), null);
  r.kapat();
});

test('oda kur: kuran bekleme odasında, ayarlar ana ekrandan; kodla katılma (tiresiz de); yanlış kod', () => {
  const { r, yeni } = kurulum();
  const a = yeni(); a.yolla({ t: 'kur', ad: 'Ayşe', avatar: AV, mod: 'takim', zorluk: 'zor' });
  const { kod } = a.son('odada'), d = a.son('oda');
  assert.equal(d.durum, 'lobi'); assert.equal(d.mod, 'takim'); assert.equal(d.zorluk, 'zor'); assert.equal(d.ozel, 0);
  assert.equal(d.kuran, d.sen); assert.equal(d.koltuklar.filter(Boolean).length, 1);
  const b = yeni(); b.yolla({ t: 'katil', kod: kod.replace('-', '').toLowerCase(), ad: 'Bora', avatar: AV });
  assert.equal(b.son('odada').kod, kod);
  const db = b.son('oda'); assert.notEqual(db.sen, db.kuran); assert.equal(db.koltuklar[db.sen].ad, 'Bora');
  // takımlıda ikinci insan öbür takıma oturur
  assert.ok((d.sen < 4) !== (db.sen < 4));
  const c = yeni(); c.yolla({ t: 'katil', kod: 'ZZZZ-9', ad: 'C' }); assert.equal(c.son('hata').m, 'Böyle bir oda yok');
  r.kapat();
});

test('özel oda listede görünmez; liste lobidekileri öne alır ve değişince kendiliğinden gelir', () => {
  const { r, yeni } = kurulum();
  const izleyen = yeni();
  const a = yeni(); a.yolla({ t: 'kur', ad: 'Ayşe', avatar: AV });
  let l = izleyen.son('lobi'); assert.equal(l.odalar.length, 1); assert.equal(l.odalar[0].kuran, 'Ayşe'); assert.equal(l.odalar[0].durum, 'lobi');
  a.yolla({ t: 'ayar', ozel: 1 });
  l = izleyen.son('lobi'); assert.equal(l.odalar.length, 0, 'özel oda listede yok');
  const b = yeni(); b.yolla({ t: 'kur', ad: 'Bora', avatar: AV }); b.yolla({ t: 'basla' });
  const c = yeni(); c.yolla({ t: 'kur', ad: 'Cem', avatar: AV });
  l = izleyen.son('lobi'); assert.deepEqual(l.odalar.map(o => o.durum), ['lobi', 'mac']);
  assert.equal(l.odalar[1].kuran, 'Bora'); assert.equal(l.odalar[0].insan, 1); assert.equal(l.odalar[0].kisi, KOLTUK);
  r.kapat();
});

test('hızlı katıl: açık odaya oturur, yoksa yeni açık oda kurar; dolu odaya girilmez', () => {
  const { r, yeni } = kurulum();
  const a = yeni(); a.yolla({ t: 'hizli', ad: 'A', avatar: AV, mod: 'herkes', zorluk: 'kolay' });
  const kod = a.son('odada').kod; assert.equal(a.son('oda').kuran, a.son('oda').sen, 'yeni oda kurdu, kuran oldu');
  const ws = [a]; for (let i = 1; i < KOLTUK; i++) { const w = yeni(); w.yolla({ t: 'hizli', ad: 'O' + i, avatar: AV }); assert.equal(w.son('odada').kod, kod); ws.push(w); }
  const dolu = yeni(); dolu.yolla({ t: 'katil', kod, ad: 'X' }); assert.equal(dolu.son('hata').m, 'Oda dolu');
  dolu.yolla({ t: 'hizli', ad: 'X', avatar: AV }); assert.notEqual(dolu.son('odada').kod, kod, 'dolu odaya değil yenisine');
  // özel odaya hızlı katılla girilmez
  const { r: r2, yeni: yeni2 } = kurulum();
  const p = yeni2(); p.yolla({ t: 'kur', ad: 'P' }); p.yolla({ t: 'ayar', ozel: true });
  const q = yeni2(); q.yolla({ t: 'hizli', ad: 'Q' }); assert.notEqual(q.son('odada').kod, p.son('odada').kod);
  r.kapat(); r2.kapat();
});

test('bekleme odası: koltuğa geçme, kuran taşır/yer değiştirir, ayarları yalnız kuran değiştirir', () => {
  const { r, yeni } = kurulum();
  const a = yeni(); a.yolla({ t: 'kur', ad: 'A', avatar: AV, mod: 'takim' });
  const kod = a.son('odada').kod, b = yeni(); b.yolla({ t: 'katil', kod, ad: 'B' });
  const ka = a.son('oda').sen;
  b.yolla({ t: 'otur', koltuk: 7 }); assert.equal(b.son('oda').sen, 7);
  b.yolla({ t: 'otur', koltuk: ka }); assert.equal(b.son('oda').sen, 7, 'dolu koltuğa kendi geçemez');
  b.yolla({ t: 'tasi', kimden: ka, koltuk: 6 }); assert.equal(a.son('oda').sen, ka, 'kuran olmayan taşıyamaz');
  a.yolla({ t: 'tasi', kimden: 7, koltuk: 2 }); assert.equal(b.son('oda').sen, 2, 'kuran boş koltuğa taşır');
  a.yolla({ t: 'tasi', kimden: 2, koltuk: ka }); assert.equal(b.son('oda').sen, ka); assert.equal(a.son('oda').sen, 2, 'dolu koltuğa bırakınca yer değişir');
  assert.equal(a.son('oda').kuran, 2, 'kuranlık koltukla taşınır');
  b.yolla({ t: 'ayar', mod: 'herkes' }); assert.equal(a.son('oda').mod, 'takim');
  a.yolla({ t: 'ayar', mod: 'herkes', zorluk: 'zor', ozel: 1 });
  const d = b.son('oda'); assert.equal(d.mod, 'herkes'); assert.equal(d.zorluk, 'zor'); assert.equal(d.ozel, 1);
  r.kapat();
});

test('maçı yalnız kuran başlatır; takımlar koltuktan, zorluk odadan; boş koltuklarda botlar', () => {
  const { r, yeni } = kurulum();
  const a = yeni(); a.yolla({ t: 'kur', ad: 'A', avatar: AV, mod: 'takim', zorluk: 'kolay' });
  const kod = a.son('odada').kod, b = yeni(); b.yolla({ t: 'katil', kod, ad: 'B' });
  a.yolla({ t: 'tasi', kimden: b.son('oda').sen, koltuk: a.son('oda').sen < 4 ? 1 : 5 }); // ikisi aynı takımda
  b.yolla({ t: 'basla' }); assert.equal(a.son('oda').durum, 'lobi');
  a.yolla({ t: 'basla' });
  assert.equal(a.son('oda').durum, 'mac'); assert.ok(a.son('hosgeldin')); assert.ok(b.son('hosgeldin'));
  const oda = r.odalar.get(kod).oda; assert.equal(oda.mac.zorluk, 'kolay'); assert.equal(oda.mac.oyuncular.size, KOLTUK);
  const insanlar = [...oda.mac.oyuncular.values()].filter(o => !o.bot);
  assert.equal(insanlar.length, 2); assert.equal(insanlar[0].takim, insanlar[1].takim, 'aynı takım');
  const say = [0, 0]; for (const o of oda.mac.oyuncular.values()) say[o.takim]++; assert.deepEqual(say, [4, 4]);
  r.kapat();
});

test('maç sürerken gelen doğrudan maça girer (bir botun yerine); maç bitince oda bekleme odasına döner', () => {
  const { r, yeni } = kurulum();
  const a = yeni(); a.yolla({ t: 'kur', ad: 'A', avatar: AV, mod: 'herkes' }); a.yolla({ t: 'basla' });
  const kod = a.son('odada').kod, oda = r.odalar.get(kod);
  const b = yeni(); b.yolla({ t: 'katil', kod, ad: 'B', avatar: AV });
  assert.ok(b.son('hosgeldin'), 'doğrudan maça');
  assert.equal(oda.oda.mac.oyuncular.size, KOLTUK); assert.equal([...oda.oda.mac.oyuncular.values()].filter(o => !o.bot).length, 2);
  // maçı bitir
  oda.oda.mac.bitir(); r.adim(1 / 30);
  assert.ok(a.son('son')?.lobi, 'sonuç: lobiye dön'); assert.equal(a.son('oda').durum, 'lobi'); assert.equal(oda.oda, null);
  r.adim(20); assert.equal(oda.durum, 'lobi', 'kendiliğinden yeni maç yok');
  a.yolla({ t: 'basla' }); assert.equal(oda.durum, 'mac');
  r.kapat();
});

test('kuran çıkınca kuranlık geçer; herkes çıkınca oda kapanır', () => {
  const { r, yeni } = kurulum();
  const a = yeni(); a.yolla({ t: 'kur', ad: 'A' });
  const kod = a.son('odada').kod, b = yeni(); b.yolla({ t: 'katil', kod, ad: 'B' });
  a.yolla({ t: 'cik' });
  const d = b.son('oda'); assert.equal(d.kuran, d.sen); assert.equal(d.koltuklar.filter(Boolean).length, 1);
  b.yolla({ t: 'cik' }); assert.equal(r.odalar.has(kod), false);
  r.kapat();
});

test('kopan oyuncu: koltuğu saklanır (maçta bot oynar), jetonla dönünce geri alır; süre dolunca boşalır', () => {
  const { r, yeni, ilerle } = kurulum();
  const a = yeni(); a.yolla({ t: 'kur', ad: 'A', avatar: AV, mod: 'takim' });
  const kod = a.son('odada').kod, b = yeni(); b.yolla({ t: 'katil', kod, ad: 'B', avatar: AV });
  const { jeton } = b.son('odada'), koltuk = b.son('oda').sen;
  a.yolla({ t: 'basla' });
  const oda = r.odalar.get(kod);
  b.kapat();
  assert.equal(a.son('oda').koltuklar[koltuk].koptu, 1);
  assert.equal([...oda.oda.mac.oyuncular.values()].filter(o => !o.bot).length, 1); assert.equal(oda.oda.mac.oyuncular.size, KOLTUK);
  const b2 = yeni(); b2.yolla({ t: 'katil', kod, jeton, ad: 'B' });
  assert.equal(b2.son('odada').geri, 1); assert.equal(b2.son('oda').sen, koltuk); assert.ok(b2.son('hosgeldin'), 'maça geri');
  // kuran koparsa ve dönmezse kuranlık geçer, koltuğu süre dolunca boşalır
  a.kapat(); assert.equal(b2.son('oda').kuran, koltuk);
  ilerle(KOPMA_SURE + 1000); r.temizle();
  assert.equal(b2.son('oda').koltuklar.filter(Boolean).length, 1);
  b2.kapat(); ilerle(KOPMA_SURE + 1000); r.temizle(); assert.equal(r.odalar.has(kod), false);
  r.kapat();
});
