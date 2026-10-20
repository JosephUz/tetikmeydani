import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HARITALAR, haritaKullan } from '../src/harita.js';
import { bosMu, hareket, hareketDurumu, bakis } from '../src/fizik.js';
import { yolAgi, yolBul } from '../src/yol.js';
import { Mac } from '../src/mac.js';
import { Oda } from '../src/oda.js';
import { OYUNCU, SILAHLAR, SILAH_NO, MODLAR } from '../src/ayar.js';

const kisi = (x, y, z, yaw = 0) => ({ x, y, z, yaw, ...hareketDurumu(), yerde: true });
const yuru = (o, g, sn) => { for (let i = 0; i < sn * 60; i++) hareket(o, { ileri: 0, sag: 0, ...g, yaw: o.yaw }, 1 / 60); };

test('her haritada doğuş yerleri boş, takımların doğuşu var', () => {
  for (const id of Object.keys(HARITALAR)) {
    const H = haritaKullan(id);
    for (const d of H.doguslar) assert.ok(bosMu(d.x, d.y + 0.02, d.z), id + ' ' + JSON.stringify(d));
    for (const t of [0, 1]) assert.ok(H.doguslar.filter(d => d.takim === t).length >= 4, id + ' takım ' + t);
  }
  haritaKullan('meydan');
});

test('zıplatma taşları hedefe indirir (her harita)', () => {
  for (const p of Object.keys(HARITALAR).flatMap(id => HARITALAR[id].padler.map(p => ({ ...p, id })))) {
    haritaKullan(p.id);
    const o = kisi(p.x, 0, p.z); yuru(o, {}, 3);
    assert.ok(Math.abs(o.y - p.hedef[1]) < 0.05, `pad ${p.x},${p.z} → y ${o.y}`);
    assert.ok(Math.hypot(o.x - p.hedef[0], o.z - p.hedef[2]) < 2, `pad ${p.x},${p.z} → ${o.x},${o.z}`);
  }
  haritaKullan('meydan');
});

test('merdivenle çatıya çıkılır, çift zıplama çalışır, Shift koşusu yürüyüşten hızlı', () => {
  const o = kisi(-19.5, 0, -18.8, Math.PI / 2); // batıya bakar
  let enYuksek = 0; for (let i = 0; i < 100; i++) { hareket(o, { ileri: 1, sag: 0, kos: true, yaw: o.yaw }, 1 / 60); enYuksek = Math.max(enYuksek, o.y); }
  assert.ok(enYuksek >= 6.9, 'merdiven tepesi ' + enYuksek);
  const z = kisi(0, 0, 12); hareket(z, { ileri: 0, sag: 0, zipla: true, yaw: 0 }, 1 / 60);
  yuru(z, {}, 0.3); const once = z.y; const olay = hareket(z, { ileri: 0, sag: 0, zipla: true, yaw: 0 }, 1 / 60);
  assert.ok(olay.includes('cift'), 'çift zıplama'); yuru(z, {}, 0.2); assert.ok(z.y > once, 'ikinci zıplama yükseltir');
  const a = kisi(-10, 0, 30), b = kisi(10, 0, 30); yuru(a, { ileri: 1 }, 1); yuru(b, { ileri: 1, kos: true }, 1);
  assert.ok(30 - b.z > (30 - a.z) * 1.5, "koşu " + (30 - b.z) + " yürüyüş " + (30 - a.z));
});

test('yol ağı: her haritada doğuşlar, can paketleri ve roketatar birbirine bağlı', () => {
  for (const id of Object.keys(HARITALAR)) {
    const H = haritaKullan(id), ag = yolAgi(), n = [...H.doguslar.map(d => [d.x, d.y, d.z]), ...H.canlar, H.roket].map(p => ag.yakin(...p));
    for (const a of n) for (const b of n) assert.ok(yolBul(a, b), id + ' yol yok');
  }
  haritaKullan('meydan');
  const ag = yolAgi(), noktalar = [[-26, 0, -14], [-27, 7, -24], [0, 6, 0], [26, 7, 24], [0, 0, -22], [-35, 0, 0], [3.5, 0, 0.5]].map(p => ag.yakin(...p));
  for (const a of noktalar) for (const b of noktalar) assert.ok(yolBul(a, b), 'yol yok');
  assert.ok(ag.gezinti.length > 4000);
});

test('insan ateşi: gövde ve kafa isabeti, takım arkadaşına hasar yok', () => {
  const m = new Mac({ mod: 'takim', kisi: 0 });
  const a = m.insanEkle('A', {}), b = m.insanEkle('B', {}), c = m.insanEkle('C', {});
  m.olaylar.length = 0;
  for (const [o, x, z] of [[a, 0, 10], [b, 0, 0], [c, 0, 0]]) Object.assign(o, { x, y: 20, z, korumaZ: 0 });
  // a: takım 0, b: takım 1, c: takım 0. a b'ye bakar (−z yönü).
  assert.notEqual(a.takim, b.takim); assert.equal(a.takim, c.takim);
  m.oyuncular.delete(c.id);
  m.z = 5; m.ates(a, { s: SILAH_NO.tufek, d: bakis(0, Math.atan2(1.0 - OYUNCU.goz, 10)), b: [0, 20 + OYUNCU.goz, 10] });
  assert.equal(b.can, 100 - SILAHLAR[SILAH_NO.tufek].hasar);
  m.z = 6; m.ates(a, { s: SILAH_NO.tufek, d: bakis(0, Math.atan2(1.62 - OYUNCU.goz, 10)), b: [0, 20 + OYUNCU.goz, 10] });
  assert.equal(b.can, 100 - SILAHLAR[SILAH_NO.tufek].hasar * 3, 'kafa 2×');
  m.oyuncular.set(c.id, c); Object.assign(c, { x: 0, y: 20, z: 0, can: 100, korumaZ: 0 }); m.oyuncular.delete(b.id);
  m.z = 7; m.ates(a, { s: SILAH_NO.tufek, d: bakis(0, 0), b: [0, 20 + OYUNCU.goz, 10] });
  assert.equal(c.can, 100, 'takım arkadaşı');
});

test('keskin kafaya tek atış, leş sayılır; atış hızı sınırı', () => {
  const m = new Mac({ mod: 'herkes', kisi: 0 });
  const a = m.insanEkle('A', {}), b = m.insanEkle('B', {});
  Object.assign(a, { x: 0, y: 20, z: 30 }); Object.assign(b, { x: 0, y: 20, z: 0, korumaZ: 0 });
  m.z = 5; const d = bakis(0, Math.atan2(1.62 - OYUNCU.goz, 30));
  assert.ok(m.ates(a, { s: SILAH_NO.keskin, d, b: [0, 20 + OYUNCU.goz, 30], n: true }));
  assert.equal(b.canli, false); assert.equal(a.les, 1); assert.equal(b.olum, 1);
  assert.equal(m.ates(a, { s: SILAH_NO.keskin, d, b: [0, 20 + OYUNCU.goz, 30] }), null, 'aralık dolmadan ikinci atış yok');
  m.adim(OYUNCU.dogusBekle + 0.1); assert.equal(b.canli, true, 'yeniden doğar');
});

test('geri sarma: istemcinin gördüğü eski konuma ateş isabet eder', () => {
  const m = new Mac({ mod: 'herkes', kisi: 0 });
  const a = m.insanEkle('A', {}), b = m.insanEkle('B', {});
  Object.assign(a, { x: 0, y: 20, z: 20 }); Object.assign(b, { x: 0, y: 20, z: 0, korumaZ: 0 });
  m.z = 4; for (let i = 0; i < 6; i++) { m.adim(1 / 30); }
  const eski = m.z; b.x = 3; m.adim(1 / 30); b.x = 6; m.adim(1 / 30); // b sağa kaçtı
  m.ates(a, { s: SILAH_NO.tufek, d: bakis(0, Math.atan2(1.0 - OYUNCU.goz, 20)), b: [0, 20 + OYUNCU.goz, 20], zt: eski });
  assert.ok(b.can < 100, 'geri sarılmış isabet');
});

test('roket: alan hasarı ve kendini itme', () => {
  const m = new Mac({ mod: 'herkes', kisi: 0 });
  const a = m.insanEkle('A', {}), b = m.insanEkle('B', {});
  Object.assign(a, { x: 0, y: 20, z: 10, cephane: 3, korumaZ: 0 }); Object.assign(b, { x: 1.5, y: 20, z: 0, korumaZ: 0 });
  m.olaylar.length = 0; m.z = 5;
  m.ates(a, { s: SILAH_NO.roket, d: bakis(Math.atan2(-1.5, 10), Math.atan2(0.9 - OYUNCU.goz, Math.hypot(1.5, 10))), b: [0, 20 + OYUNCU.goz, 10] });
  for (let i = 0; i < 30 && m.mermiler.length; i++) m.mermiAdim(1 / 30);
  assert.ok(b.can < 100, 'alan hasarı'); assert.equal(a.cephane, 2);
  assert.ok(m.olaylar.some(o => o.m.t === 'patla'));
});

test('oda: katılan insan bir botun yerini alır, ayrılınca bot döner; mesajlar gelir', () => {
  const oda = new Oda({ mod: 'takim' }), gelen = [];
  assert.equal(oda.mac.oyuncular.size, MODLAR.takim.kisi);
  const id = oda.katil(m => gelen.push(m), 'Deneme', { model: 'madenci' });
  assert.equal(oda.mac.oyuncular.size, MODLAR.takim.kisi);
  const say = [0, 0]; for (const o of oda.mac.oyuncular.values()) say[o.takim]++; assert.deepEqual(say, [4, 4]);
  assert.equal(gelen[0].t, 'hosgeldin'); assert.ok(gelen.some(m => m.t === 'dogus')); assert.ok(gelen.some(m => m.t === 'liste'));
  oda.adim(1 / 30); assert.ok(gelen.some(m => m.t === 's'));
  oda.ayril(id); assert.equal([...oda.mac.oyuncular.values()].filter(o => !o.bot).length, 0); assert.equal(oda.mac.oyuncular.size, MODLAR.takim.kisi);
});

test('botlu maç akar ve hedefte biter, yenisi başlar', () => {
  let tohum = 7; const r = () => ((tohum = (tohum * 16807) % 2147483647) / 2147483647);
  const m = new Mac({ mod: 'herkes', zorluk: 'zor', rastgele: r }); m.botlariDuzenle();
  let son = false, les = 0;
  for (let i = 0; i < 30 * 400 && !son; i++) { m.adim(1 / 30); for (const { m: e } of m.olaylar) { if (e.t === 'son') son = true; if (e.t === 'les') les++; } m.olaylar.length = 0; }
  assert.ok(son, 'maç bitti'); assert.ok(les >= 20, 'leş ' + les);
  m.adim(11); assert.equal(m.durum, 'oyun'); assert.equal(m.macNo, 2);
});

test('oda: istemcinin ateş mesajı (t: ates, r: tohum) isabet eder', () => {
  const oda = new Oda({ mod: 'herkes', kisi: 0 }), gelen = [];
  oda.mac.kisi = 1; oda.mac.botlariDuzenle(); oda.mac.kisi = 2;
  const id = oda.katil(m => gelen.push(m), 'A', {});
  const a = oda.mac.oyuncular.get(id), b = [...oda.mac.oyuncular.values()].find(o => o.bot);
  Object.assign(a, { x: 0, y: 20, z: 10 }); Object.assign(b, { x: 0, y: 20, z: 0, korumaZ: 0 }); b.bz.bakZ = 1e9; b.bz.hedef = null;
  oda.mac.z = 5;
  oda.mesaj(id, { t: 'ates', s: SILAH_NO.tufek, d: bakis(0, Math.atan2(1.0 - OYUNCU.goz, 10)), b: [0, 20 + OYUNCU.goz, 10], r: 1234, n: false, zt: 5 });
  assert.ok(b.can < 100, 'bot vuruldu');
  oda.dagit(); assert.ok(gelen.some(m => m.t === 'isabet'));
});

test('her haritada botlu takım maçı akar; oda haritayı istemciye bildirir', () => {
  for (const id of Object.keys(HARITALAR)) {
    let tohum = 11; const r = () => ((tohum = (tohum * 16807) % 2147483647) / 2147483647);
    const oda = new Oda({ mod: 'takim', zorluk: 'zor', harita: id, rastgele: r }), gelen = [];
    oda.katil(m => gelen.push(m), 'A', {});
    assert.equal(gelen[0].harita, id);
    let les = 0; for (let i = 0; i < 30 * 120; i++) { oda.adim(1 / 30); for (const m of gelen.splice(1)) if (m.t === 'les') les++; }
    assert.ok(les >= 10, id + ' leş ' + les);
  }
});
