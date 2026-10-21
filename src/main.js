// Tetik Meydanı istemcisi: ana ekran (arkada botlar oynar), botlu oyun (tarayıcıdaki Oda) ve çevrim içi oda.
// Kendi karakterin burada yürür (anında tepki); ateş sunucuya/odaya gider, hasarı orası hesaplar.
import * as T from 'three';
import { OYUNCU, SILAHLAR, SILAH_NO, MODLAR, ZORLUK, MAC, TAKIM_RENK, TAKIM_AD } from './ayar.js';
import { hareket, hareketDurumu, bakis, isinHarita, isinKutu, vurusKutulari, tohumlu, saptir, gorur } from './fizik.js';
import { Gorunum } from './gorunum.js';
import { karakterModeli } from './karakter.js';
import { MODELLER, adDuzelt, avatarDuzelt } from './avatar-veri.js';
import { cal, calKonum, sesAcik, sesAyarla, sesBaslat } from './ses.js';
import { yerelBaglanti, sunucuBaglanti } from './ag.js';
import { kodDuzelt } from './oda.js';
import { Mac } from './mac.js';
import { HARITALAR, VARSAYILAN, haritaKullan } from './harita.js';

const $ = id => document.getElementById(id);
const sakla = { al(k, v) { try { return localStorage.getItem('tetik.' + k) ?? v; } catch { return v; } }, yaz(k, v) { try { localStorage.setItem('tetik.' + k, v); } catch { /* yok */ } } };
const simdi = () => performance.now() / 1000;
const aci = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const PARAM = new URLSearchParams(location.search);

let gor;
try { gor = new Gorunum($('sahne')); } catch (e) { $('fatal').hidden = false; $('fatal-message').textContent = 'Tarayıcın WebGL açamadı: ' + (e?.message ?? e); throw e; }
const boyutla = () => gor.boyut(innerWidth, innerHeight); addEventListener('resize', boyutla); boyutla();

// ——— Seçimler ———
const secim = {
  model: MODELLER.some(m => m.id === sakla.al('model')) ? sakla.al('model') : MODELLER[Math.floor(Math.random() * MODELLER.length)].id,
  ad: adDuzelt(sakla.al('ad', '')) || 'Oyuncu' + Math.floor(100 + Math.random() * 900),
  mod: MODLAR[sakla.al('mod')] ? sakla.al('mod') : 'herkes',
  zorluk: ZORLUK[sakla.al('zorluk')] ? sakla.al('zorluk') : 'orta',
  harita: VARSAYILAN, // tek harita: Dış Mahalle
};
let hassas = Math.max(0.3, Math.min(3, +sakla.al('hassas', '1') || 1));
const avatarim = () => { const m = MODELLER.find(m => m.id === secim.model) ?? MODELLER[0]; return { model: m.id, ...m.avatar }; };

function portreler() {
  const r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setSize(152, 192); r.outputColorSpace = T.SRGBColorSpace;
  const s = new T.Scene(); s.add(new T.HemisphereLight('#ffffff', '#776a55', 2.4)); const dl = new T.DirectionalLight('#fff4e0', 1.6); dl.position.set(-2, 3, -4); s.add(dl);
  const k = new T.PerspectiveCamera(28, 152 / 192, 0.1, 20); k.position.set(-1.2, 1.5, -3.6); k.lookAt(0, 1.02, 0);
  const l = {};
  for (const m of MODELLER) {
    const c = karakterModeli({ model: m.id, ...m.avatar }); c.guncelle(0.016, 0, false, -0.15, true); s.add(c.grup);
    r.render(s, k); l[m.id] = r.domElement.toDataURL(); s.remove(c.grup);
  }
  r.dispose(); return l;
}
function anaEkranKur() {
  let resim = {}; try { resim = portreler(); } catch { /* portre yoksa yalnız ad */ }
  const kutu = $('karakterler');
  for (const m of MODELLER) {
    const b = document.createElement('button'); b.className = 'kart'; b.setAttribute('role', 'radio'); b.dataset.v = m.id; b.title = m.ad;
    b.innerHTML = (resim[m.id] ? `<img alt="" src="${resim[m.id]}">` : '') + `<span>${m.ad}</span>`;
    b.onclick = () => { secim.model = m.id; sakla.yaz('model', m.id); kartlar(); };
    kutu.append(b);
  }
  const kartlar = () => { for (const b of kutu.children) b.setAttribute('aria-checked', b.dataset.v === secim.model ? 'true' : 'false'); };
  kartlar();
  $('ad').value = secim.ad;
  $('ad').oninput = () => { const a = adDuzelt($('ad').value); if (a) { secim.ad = a; sakla.yaz('ad', a); } };
  for (const [kap, alan] of [['mod', 'mod'], ['zorluk', 'zorluk']]) {
    const d = $(kap); const yenile = () => { for (const b of d.children) b.classList.toggle('secili', b.dataset.v === secim[alan]); };
    for (const b of d.children) b.onclick = () => { secim[alan] = b.dataset.v; sakla.yaz(alan, b.dataset.v); yenile(); };
    yenile();
  }
  if (matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches) $('dokunmatik-uyari').hidden = false;
}

// ——— Ses düğmeleri ———
function sesYaz() { for (const id of ['sound', 'pause-sound']) { $(id).textContent = 'Ses: ' + (sesAcik() ? 'açık' : 'kapalı'); $(id).classList.toggle('muted', !sesAcik()); } }
for (const id of ['sound', 'pause-sound']) $(id).onclick = () => { sesAyarla(!sesAcik()); sesYaz(); };
sesYaz();
const yardimAc = () => { if (!$('help-dialog').open) $('help-dialog').showModal(); };
$('help').onclick = yardimAc; $('pause-help').onclick = yardimAc;
for (const b of document.querySelectorAll('[data-close]')) b.onclick = () => b.closest('dialog').close();
$('brand').onclick = e => e.preventDefault();
$('hassasiyet').value = hassas; $('hassasiyet-deger').textContent = hassas.toFixed(2).replace('.', ',');
$('hassasiyet').oninput = () => { hassas = +$('hassasiyet').value; sakla.yaz('hassas', hassas); $('hassasiyet-deger').textContent = hassas.toFixed(2).replace('.', ','); };

// ——— Ana ekran arka planı: botlar kendi kendine oynar ———
let demo = null, demoBirikim = 0;
function demoBaslat() {
  gor.haritaYukle(haritaKullan(secim.harita));
  // Sağ alttaki tanıtım kutusu seçilen haritayı anlatır.
  const H = HARITALAR[secim.harita]; $('sahne-baslik').textContent = H.ad.toLocaleUpperCase('tr'); $('sahne-metin').textContent = H.slogan; $('sahne-esin').textContent = H.esin.toLocaleUpperCase('tr');
  demo = new Mac({ mod: 'herkes', zorluk: 'orta', harita: secim.harita }); demo.botlariDuzenle(); demo.olaylar.length = 0;
  for (const o of demo.oyuncular.values()) gor.oyuncuKur('d' + o.id, o.avatar, null);
}
function demoDurdur() { if (!demo) return; for (const o of demo.oyuncular.values()) gor.oyuncuSil('d' + o.id); demo = null; }
function demoAdim(dt, z) {
  demoBirikim = Math.min(demoBirikim + dt, 0.2);
  while (demoBirikim >= 1 / MAC.tik) { demoBirikim -= 1 / MAC.tik; demo.adim(1 / MAC.tik); }
  const var_ = new Set();
  for (const o of demo.oyuncular.values()) {
    const id = 'd' + o.id; var_.add(id); if (!gor.oyuncular.has(id)) gor.oyuncuKur(id, o.avatar, null);
    gor.oyuncuGuncelle(id, [o.x, o.y, o.z, o.yaw, o.pitch, (o.canli ? 1 : 0) | o.bit | (o.korumaZ > demo.z ? 16 : 0), o.silah], dt, false);
  }
  for (const id of [...gor.oyuncular.keys()]) if (String(id).startsWith('d') && !var_.has(id)) gor.oyuncuSil(id);
  for (const { m } of demo.olaylar) { if (m.t === 'ates') atesGorseli(m, 'd'); else if (m.t === 'patla') gor.patlama(new T.Vector3(m.x, m.y, m.z)); }
  demo.olaylar.length = 0;
  gor.roketGuncelle(demo.mermiler.map(r => [r.id, r.x, r.y, r.z]), dt);
  gor.alinanlar(demo.ozet().p);
  const a = z * 0.045;
  const [x0, z0, x1, z1] = demo.H.sinir, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, r = Math.max(x1 - x0, z1 - z0) * 0.47;
  gor.kamera.position.set(cx + Math.cos(a) * r, r * 0.5 + Math.sin(z * 0.11) * 2, cz + Math.sin(a) * r);
  gor.kamera.lookAt(cx, 2, cz); gor.fov = 62; gor.el.visible = false;
}

// ——— Oyun durumu ———
let bag = null, oyun = null;
const ben = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, ...hareketDurumu(), canli: false, can: 100, dg: 0, silah: 0, onceki: 1, sarjor: SILAHLAR.map(s => s.sarjor),
  sonAtis: SILAHLAR.map(() => -99), dolduruyorT: 0, doldurSilah: 0, cephane: 0, degisT: 0, tetikHazir: true, kilicDonus: null, yayilma: 0, sonGonder: 0,
  // Kamera hissi: tepme (geri gelen bakış sıçraması), adım sallanması, yana eğilme, iniş çöküşü, fare sürüklemesi (silah gecikir)
  tepmeP: 0, tepmeY: 0, adimFaz: 0, egim: 0, inis: 0, inisV: 0, fovEk: 0, surX: 0, surY: 0 };
const tus = new Set(), fare = { sol: false, sag: false };
let ziplaIstek = false, kilitli = false, menuAcik = false, skorGoster = false;

function oyunBaslat(baglanti) {
  demoDurdur();
  bag = baglanti;
  oyun = { benId: null, mod: 'herkes', takimli: false, roster: new Map(), skor: new Map(), tk: [0, 0], kalan: 0, kalanZ: simdi(), durum: 'oyun', snaps: [], fark: null, olen: null, olumZ: 0, sonBitis: 0, birikim: 0, hedef: null };
  document.body.classList.add('oyunda');
  $('ana').hidden = true; $('oyun-ui').hidden = false; $('son').hidden = true; $('olum').hidden = true;
  $('lesler').innerHTML = '';
  $('menu-ust').textContent = bag.yerel ? 'BOTLU OYUN DURAKLATILDI' : 'ÇEVRİM İÇİ · MAÇ SÜRÜYOR';
  $('back-home').textContent = bag.yerel ? 'Ana menü' : 'Odadan çık';
  gor.el.visible = true;
  sesBaslat();
  kilitle();
}
/** Maç ekranını kapatır, ana ekran (arkada botlar) ya da bekleme odası geri gelir. Çevrim içiyken oda bağlantısı açık kalır. */
function oyunKapat() {
  if (!oyun) return;
  if (bag?.yerel) bag.kapat();
  for (const id of [...gor.oyuncular.keys()]) gor.oyuncuSil(id);
  gor.roketGuncelle([], 0);
  bag = null; oyun = null; ben.canli = false;
  document.body.classList.remove('oyunda', 'kilitli', 'yarali');
  $('oyun-ui').hidden = true; $('ana').hidden = false; $('durbun').hidden = true; $('etiketler').innerHTML = '';
  if (document.pointerLockElement) document.exitPointerLock();
  $('son').hidden = true; $('kilit').hidden = true;
  menuKapat(); demoBaslat();
  beklemeYaz();
}
/** Duraklat menüsündeki çıkış: çevrim içiyken Odadan çık, tek başınayken Ana menü. */
function oyunBitir() { if (bag && !bag.yerel) odadanCik(); else oyunKapat(); }
/** Çevrim içi maç bitti: sonuç ekranında LOBİYE DÖN beklenir (fare serbest, menü açılmaz). */
const sonuctaMi = () => !!oyun && oyun.durum === 'son' && !bag?.yerel;

$('oyna').onclick = () => oyunBaslat(yerelBaglanti({ mod: secim.mod, zorluk: secim.zorluk, harita: secim.harita, ad: secim.ad, avatar: avatarim() }));

// ——— Ağdan gelenler ———
function takimRengi(id) { const r = oyun.roster.get(id); return oyun.takimli && r ? TAKIM_RENK[r.takim] : null; }
function isle(m) {
  switch (m.t) {
    case 'hosgeldin': gor.haritaYukle(haritaKullan(m.harita)); oyun.harita = m.harita; oyun.benId = m.id; oyun.mod = m.mod; oyun.takimli = MODLAR[m.mod].takimli; oyun.yerelZorluk = m.zorluk; break;
    case 'liste': {
      const yeni = new Map(m.o.map(([id, ad, avatar, takim, bot]) => [id, { ad, avatar, takim, bot }]));
      for (const id of oyun.roster.keys()) if (!yeni.has(id)) gor.oyuncuSil(id);
      for (const [id, r] of yeni) {
        const eski = oyun.roster.get(id);
        if (!eski || eski.takim !== r.takim || JSON.stringify(eski.avatar) !== JSON.stringify(r.avatar)) {
          gor.oyuncuKur(id, r.avatar, oyun.takimli ? TAKIM_RENK[r.takim] : null);
          if (id === oyun.benId) { const a = avatarDuzelt(r.avatar); gor.elKur(a.ust === 'tisort' ? a.ten : (oyun.takimli ? TAKIM_RENK[r.takim] : a.ustRenk), oyun.takimli ? TAKIM_RENK[r.takim] : a.ustRenk); }
        }
      }
      oyun.roster = yeni; break;
    }
    case 'skor': for (const [id, l, o] of m.l) oyun.skor.set(id, { les: l, olum: o }); oyun.tk = m.tk; oyun.kalan = m.kalan; oyun.kalanZ = simdi(); break;
    case 's': {
      const hedef = m.z - simdi();
      oyun.fark = oyun.fark == null || hedef > oyun.fark ? hedef : oyun.fark + (hedef - oyun.fark) * 0.03;
      oyun.snaps.push({ z: m.z, o: new Map(m.o.map(a => [a[0], a])), m: m.m, p: m.p }); if (oyun.snaps.length > 40) oyun.snaps.shift();
      const b = m.o.find(a => a[0] === oyun.benId);
      if (b) { ben.can = b[6]; const canli = !!(b[7] & 1); if (!canli && ben.canli) olunce(); ben.korumali = !!(b[7] & 16); if (!canli) ben.canli = false; }
      gor.alinanlar(m.p);
      break;
    }
    case 'dogus':
      Object.assign(ben, hareketDurumu(), { x: m.x, y: m.y, z: m.z, yaw: m.yaw, pitch: 0, dg: m.dg, canli: true, can: 100, silah: 0, onceki: 1, cephane: 0, dolduruyorT: 0, sarjor: SILAHLAR.map(s => s.sarjor), kilicDonus: null });
      ben.yerde = true; $('olum').hidden = true; oyun.olen = null; oyun.olumYazildi = false; document.body.classList.remove('yarali');
      break;
    case 'duzelt': ben.x = m.x; ben.y = m.y; ben.z = m.z; ben.vx = ben.vy = ben.vz = 0; break;
    case 'it': ben.vx += m.v[0]; ben.vy = Math.max(ben.vy, 0) + m.v[1]; ben.vz += m.v[2]; ben.yerde = false; ben.padT = 0.2; break;
    case 'isabet': {
      const i = $('isabet'); i.className = ''; void i.offsetWidth; i.className = 'vur' + (m.k ? ' kafa' : '') + (m.o ? ' olu' : '');
      cal(m.k ? 'kafa' : 'isabet', 0.9);
      const v = gor.oyuncular.get(m.h); if (v) v.k.vuruldu();
      break;
    }
    case 'yara': {
      cal('yara', 0.8); document.body.classList.add('yarali'); clearTimeout(oyun.yaraT); oyun.yaraT = setTimeout(() => document.body.classList.remove('yarali'), 220);
      if (m.x != null) { const a = Math.atan2(-(m.x - ben.x), -(m.z - ben.z)), y = $('yara-yon'); y.style.transform = `rotate(${(-aci(a - ben.yaw)) * 180 / Math.PI}deg)`; y.classList.remove('var'); void y.offsetWidth; y.classList.add('var'); setTimeout(() => y.classList.remove('var'), 60); }
      break;
    }
    case 'les': lesYaz(m); break;
    case 'ates': if (m.id !== oyun.benId) atesGorseli(m); break;
    case 'patla': { const p = new T.Vector3(m.x, m.y, m.z); gor.patlama(p); calKonum('patla', m.x, m.y, m.z, dinleyici(), 90); break; }
    case 'al':
      if (m.id === oyun.benId) {
        cal('al');
        if (m.p === 'r') { ben.cephane = m.c; silahSec(SILAH_NO.roket); mesaj('ROKETATAR', `${m.c} roket · 5`); } else mesaj('+' + MAC.canPaketi + ' CAN');
      }
      break;
    case 'pad': { const v = gor.oyuncular.get(m.id); if (v) calKonum('pad', v.x, v.y, v.z, dinleyici(), 40); break; }
    case 'son': sonGoster(m); break;
    case 'basla': $('son').hidden = true; oyun.durum = 'oyun'; mesaj('YENİ MAÇ'); break;
  }
}
const dinleyici = () => ({ x: ben.x, y: ben.y, z: ben.z, yaw: ben.yaw });

/** Uçan mermilerin görünüşü (hız blok/sn): keskin hızlı ve mavimsi, pompalı saçmaları kısa ve yavaş. */
const MERMI_GORUNUS = { tufek: { renk: '#ffd27a', hiz: 150, kalin: 0.065, uzun: 1.8 }, keskin: { renk: '#bfe3ff', hiz: 300, kalin: 0.08, uzun: 3, iz: 0.5 }, pompali: { renk: '#ffc061', hiz: 120, kalin: 0.05, uzun: 0.9 } };
function atesGorseli(m, onEk = '') {
  const v = gor.oyuncular.get(onEk ? onEk + m.id : m.id); if (!v) return;
  v.k.ates(); const S = SILAHLAR[m.s];
  if (!onEk) calKonum(S.id, v.x, v.y + 1.5, v.z, dinleyici(), S.id === 'keskin' ? 140 : S.id === 'kilic' ? 20 : 80);
  if (!m.u?.length) return;
  v.k.grup.updateMatrixWorld(true);
  const a = v.k.namlu(new T.Vector3());
  for (const u of m.u) { const b = new T.Vector3(u[0], u[1], u[2]); gor.mermiUcur(a, b, { ...MERMI_GORUNUS[S.id], vardi: () => gor.kivilcim(b, '#d8cfbc', 3) }); }
}

function lesYaz(m) {
  const ad = id => id == null ? '' : (oyun.roster.get(id)?.ad ?? '?');
  const sinif = id => !oyun.takimli || id == null ? '' : oyun.roster.get(id)?.takim === 0 ? 'm' : 'k';
  const d = document.createElement('div'); d.className = 'les' + (m.o === oyun.benId || m.h === oyun.benId ? ' benim' : '');
  const S = SILAHLAR[m.s];
  d.innerHTML = m.o == null ? `<span class="${sinif(m.h)}"></span><span class="s">${S?.ad.toUpperCase() ?? ''}</span><span class="${sinif(m.h)}"></span>` : `<span class="${sinif(m.o)}"></span><span class="s">${S?.ad.toUpperCase() ?? ''}</span><span class="${sinif(m.h)}"></span>${m.k ? '<span class="kafa">◎</span>' : ''}`;
  const sp = d.querySelectorAll('span'); if (m.o == null) { sp[0].textContent = ad(m.h); sp[1].textContent = 'KENDİNİ VURDU'; sp[2].textContent = ''; } else { sp[0].textContent = ad(m.o); sp[2].textContent = ad(m.h); }
  $('lesler').prepend(d); while ($('lesler').children.length > 6) $('lesler').lastChild.remove(); setTimeout(() => d.remove(), 5000);
  if (m.o === oyun.benId && m.h !== oyun.benId) {
    cal('les'); const SERI = { 2: 'ÇİFTE', 3: 'ÜÇLEME', 5: 'DURDURULAMAZ', 8: 'MEYDANIN SAHİBİ' };
    if (SERI[m.seri]) { cal('seri'); mesaj(SERI[m.seri], `${m.seri} leş üst üste`); } else mesaj(m.k ? 'KAFADAN!' : 'LEŞ', ad(m.h));
  }
  if (m.h === oyun.benId) { oyun.olen = m.o; oyun.olumYazildi = true; $('olum-baslik').textContent = m.o == null ? 'Kendi roketine yakalandın.' : `${ad(m.o)} seni ${S?.ad ?? ''} ile vurdu.`; }
}
function olunce() {
  ben.canli = false; oyun.olumZ = simdi(); cal('olum', 0.8);
  $('olum').hidden = false; if (!oyun.olumYazildi) $('olum-baslik').textContent = 'Düştün.';
  $('durbun').hidden = true; fare.sag = false;
}
function sonGoster(m) {
  oyun.durum = 'son'; oyun.sonBitis = simdi() + m.bekle;
  const ad = id => oyun.roster.get(id)?.ad ?? '?';
  $('son-baslik').textContent = m.takimli ? (m.kazanan < 0 ? 'Berabere.' : `${TAKIM_AD[m.kazanan]} takım kazandı.`) : m.kazanan === oyun.benId ? 'Meydan senin!' : `${ad(m.kazanan)} kazandı.`;
  const tb = $('son-satir'); tb.innerHTML = '';
  m.l.forEach(([id, l, o], i) => { const tr = document.createElement('tr'); const r = oyun.roster.get(id); tr.className = (id === oyun.benId ? 'ben ' : '') + (oyun.takimli && r ? (r.takim === 0 ? 'mavi' : 'kirmizi') : ''); tr.innerHTML = `<td>${i + 1}</td><td></td><td>${l}</td><td>${o}</td>`; tr.children[1].textContent = ad(id); if (r?.bot) tr.children[1].insertAdjacentHTML('beforeend', '<span class="bot">BOT</span>'); tb.append(tr); });
  const lobi = !!m.lobi; $('son-lobi').hidden = !lobi; $('son-sayac').hidden = lobi;
  $('son').hidden = false;
  if (lobi) { $('kilit').hidden = true; menuKapat(); if (document.pointerLockElement) document.exitPointerLock(); }
}
let mesajT = 0;
function mesaj(baslik, alt = '') { const e = $('mesaj'); e.innerHTML = ''; e.append(baslik); if (alt) { const s = document.createElement('small'); s.textContent = alt; e.append(s); } e.className = ''; void e.offsetWidth; e.className = 'goster'; clearTimeout(mesajT); mesajT = setTimeout(() => { e.className = ''; }, 1800); }
let toastT = 0;
function toast(t) { const e = $('toast'); e.textContent = t; e.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { e.hidden = true; }, 3200); }

// ——— Silahlar ———
function silahSec(i) {
  if (!SILAHLAR[i] || (i === SILAH_NO.roket && ben.cephane <= 0) || i === ben.silah) return;
  ben.onceki = ben.silah; ben.silah = i; ben.dolduruyorT = 0; ben.degisT = 0.28; ben.kilicDonus = null; fare.sag = false;
  gor.elOlay('degis');
}
function doldur() {
  const S = SILAHLAR[ben.silah];
  if (!ben.canli || !S.doldur || ben.sarjor[ben.silah] >= S.sarjor || ben.dolduruyorT > 0) return;
  ben.dolduruyorT = S.doldur; ben.doldurSilah = ben.silah; bag.gonder({ t: 'doldur' }); cal('doldur', 0.7);
}
function atesDene(zaman) {
  const s = ben.silah, S = SILAHLAR[s];
  if (!fare.sol || !ben.canli || menuAcik || !kilitli || oyun.durum !== 'oyun' || ben.degisT > 0 || ben.dolduruyorT > 0) return;
  if (!S.otomatik && !ben.tetikHazir) return;
  if (zaman - ben.sonAtis[s] < S.aralik) return;
  if (S.sarjor && s !== SILAH_NO.roket && ben.sarjor[s] <= 0) { if (ben.tetikHazir) cal('bos', 0.6); ben.tetikHazir = false; doldur(); return; }
  ben.tetikHazir = false; ben.sonAtis[s] = zaman;
  if (s === SILAH_NO.roket) ben.cephane--; else if (S.sarjor) ben.sarjor[s]--;
  const d = bakis(ben.yaw + ben.tepmeY, ben.pitch + ben.tepmeP), goz = [ben.x, ben.y + OYUNCU.goz, ben.z], tohum = (Math.random() * 2 ** 31) | 0, nisan = fare.sag && !S.yakin;
  bag.gonder({ t: 'ates', s, d, b: goz, r: tohum, n: nisan, zt: cizimZamani() });
  gor.elOlay('ates'); cal(S.id, 0.75);
  if (!S.yakin && !S.mermi) {
    const r = tohumlu(tohum), sac = nisan ? S.nisanSacilma : S.sacilma, bas = gor.elNamlu(new T.Vector3());
    for (let i = 0; i < (S.sacma || 1); i++) {
      const y = saptir(d, sac, r); let en = isinHarita(goz[0], goz[1], goz[2], y[0], y[1], y[2], S.menzil), vurdu = false;
      for (const [id, v] of gor.oyuncular) {
        if (id === oyun.benId || !v.canli || (oyun.takimli && oyun.roster.get(id)?.takim === oyun.roster.get(oyun.benId)?.takim)) continue;
        const k = vurusKutulari(v.x, v.y, v.z), t = Math.min(isinKutu(goz[0], goz[1], goz[2], y[0], y[1], y[2], k.govde[0], k.govde[1], en), isinKutu(goz[0], goz[1], goz[2], y[0], y[1], y[2], k.kafa[0], k.kafa[1], en));
        if (t < en) { en = t; vurdu = true; }
      }
      const uc = new T.Vector3(goz[0] + y[0] * en, goz[1] + y[1] * en, goz[2] + y[2] * en);
      gor.mermiUcur(bas, uc, { ...MERMI_GORUNUS[S.id], kalin: MERMI_GORUNUS[S.id].kalin * 0.8, vardi: en < S.menzil - 0.01 ? () => (vurdu ? gor.kan(uc) : gor.kivilcim(uc, '#d8cfbc', 4)) : null });
    }
  }
  // Tepme ve yayılma
  // Tepme: bakış sıçrar ve kendiliğinden geri gelir (kalıcı kayma yok; tüfekte seri atışta azıcık tırmanır).
  const tepme = { tufek: 0.012, keskin: 0.07, pompali: 0.06, kilic: 0, roket: 0.045 }[S.id] * (nisan ? 0.6 : 1);
  ben.tepmeP += tepme; ben.tepmeY += (Math.random() - 0.5) * tepme * 0.6;
  if (S.id === 'tufek') ben.pitch = Math.min(1.5, ben.pitch + tepme * 0.15);
  ben.yayilma = Math.min(1, ben.yayilma + (S.otomatik ? 0.18 : 0.6));
  if (s === SILAH_NO.roket && ben.cephane <= 0) setTimeout(() => { if (ben.silah === SILAH_NO.roket) silahSec(ben.onceki === SILAH_NO.roket ? 0 : ben.onceki); }, 450);
  if (S.sarjor && s !== SILAH_NO.roket && ben.sarjor[s] <= 0) setTimeout(doldur, 200);
}
const cizimZamani = () => oyun?.fark == null ? 0 : simdi() + oyun.fark - (bag?.yerel ? 1 / MAC.tik : 0.1);

// ——— Giriş ———
const tuval = $('sahne');
function kilitle() { if (!oyun || sonuctaMi()) return; try { const p = tuval.requestPointerLock(); p?.catch?.(() => { try { tuval.requestPointerLock(); } catch { /* yok */ } }); } catch { try { tuval.requestPointerLock(); } catch { /* yok */ } } }
document.addEventListener('pointerlockchange', () => {
  kilitli = document.pointerLockElement === tuval;
  document.body.classList.toggle('kilitli', kilitli);
  if (kilitli) { menuKapat(); $('kilit').hidden = true; }
  else if (oyun) { tus.clear(); fare.sol = fare.sag = false; if (!$('help-dialog').open && !sonuctaMi()) menuAc(); }
});
document.addEventListener('pointerlockerror', () => { if (oyun && !sonuctaMi()) $('kilit').hidden = false; });
$('kilit').onclick = () => kilitle();
tuval.addEventListener('click', () => { if (oyun && !kilitli && !menuAcik) kilitle(); });
function menuAc() { if (!oyun || menuAcik || sonuctaMi()) return; menuAcik = true; if (!$('menu-dialog').open) $('menu-dialog').showModal(); }
function menuKapat() { menuAcik = false; if ($('menu-dialog').open) $('menu-dialog').close(); }
$('menu-dialog').addEventListener('cancel', e => { e.preventDefault(); devam(); });
function devam() { menuKapat(); $('kilit').hidden = true; kilitle(); setTimeout(() => { if (oyun && !kilitli && !menuAcik) $('kilit').hidden = false; }, 400); }
$('resume').onclick = devam;
$('back-home').onclick = () => oyunBitir();
$('help-dialog').addEventListener('close', () => { if (oyun && !kilitli && !menuAcik && !sonuctaMi()) menuAc(); });

addEventListener('keydown', e => {
  if (e.code === 'F1') { e.preventDefault(); yardimAc(); return; }
  if (!oyun || e.target.tagName === 'INPUT') return;
  if (e.code === 'Tab') { e.preventDefault(); skorGoster = true; return; }
  if (!kilitli) return;
  if (e.repeat && e.code === 'Space') return;
  tus.add(e.code);
  if (e.code === 'Space') { ziplaIstek = true; e.preventDefault(); }
  const d = /^Digit([1-5])$/.exec(e.code); if (d) silahSec(+d[1] - 1);
  if (e.code === 'KeyQ') silahSec(ben.onceki);
  if (e.code === 'KeyR') doldur();
  if (e.code === 'KeyV' && ben.silah !== SILAH_NO.kilic && ben.canli) { const geri = ben.silah; silahSec(SILAH_NO.kilic); ben.degisT = 0.05; fare.sol = true; ben.tetikHazir = true; atesDene(simdi() + 1); fare.sol = false; ben.kilicDonus = { silah: geri, t: 0.55 }; }
});
addEventListener('keyup', e => { tus.delete(e.code); if (e.code === 'Tab') skorGoster = false; });
addEventListener('blur', () => { tus.clear(); fare.sol = fare.sag = false; skorGoster = false; });
// Sağ tık nişanı aç/kapa (basılı tutmak gerekmez); silah değişince, ölünce ya da menü açılınca kapanır.
addEventListener('mousedown', e => { if (!kilitli) return; if (e.button === 0) fare.sol = true; if (e.button === 2 && ben.canli && !SILAHLAR[ben.silah].yakin) fare.sag = !fare.sag; });
addEventListener('mouseup', e => { if (e.button === 0) { fare.sol = false; ben.tetikHazir = true; } });
addEventListener('contextmenu', e => { if (oyun) e.preventDefault(); });
addEventListener('mousemove', e => {
  if (!kilitli || !ben.canli) return;
  const k = 0.0022 * hassas * (gor.kamera.fov / 80);
  ben.yaw = aci(ben.yaw - e.movementX * k); ben.pitch = Math.max(-1.52, Math.min(1.52, ben.pitch - e.movementY * k));
  ben.surX += e.movementX; ben.surY += e.movementY;
});
addEventListener('wheel', e => {
  if (!kilitli) return;
  const l = [0, 1, 2, 3, 4].filter(i => i !== SILAH_NO.roket || ben.cephane > 0), i = l.indexOf(ben.silah);
  silahSec(l[(i + (e.deltaY > 0 ? 1 : -1) + l.length) % l.length]);
}, { passive: true });

// ——— Her kare ———
const v3 = new T.Vector3();
function kendiAdim(dt, zaman) {
  ben.degisT = Math.max(0, ben.degisT - dt);
  ben.yayilma = Math.max(0, ben.yayilma - dt * 2.2);
  if (ben.kilicDonus && (ben.kilicDonus.t -= dt) <= 0) { const s = ben.kilicDonus.silah; ben.kilicDonus = null; if (ben.silah === SILAH_NO.kilic) silahSec(s); }
  if (ben.dolduruyorT > 0 && (ben.dolduruyorT -= dt) <= 0) { ben.dolduruyorT = 0; ben.sarjor[ben.doldurSilah] = SILAHLAR[ben.doldurSilah].sarjor; }
  if (!ben.canli) { ziplaIstek = false; return; }
  const aktif = kilitli && !menuAcik;
  const g = { ileri: aktif ? (tus.has('KeyW') ? 1 : 0) - (tus.has('KeyS') ? 1 : 0) : 0, sag: aktif ? (tus.has('KeyD') ? 1 : 0) - (tus.has('KeyA') ? 1 : 0) : 0, zipla: aktif && ziplaIstek, kos: aktif && (tus.has('ShiftLeft') || tus.has('ShiftRight')), yaw: ben.yaw };
  ziplaIstek = false;
  let kalan = dt;
  while (kalan > 1e-5) {
    const h = Math.min(kalan, 1 / 60); kalan -= h;
    const dusus = ben.vy;
    for (const o of hareket(ben, g, h)) { cal(o, o === 'kon' ? Math.min(0.8, 0.25 - dusus * 0.03) : 0.6); if (o === 'kon') ben.inisV -= Math.min(2.2, -dusus * 0.11); }
    g.zipla = false;
  }
  atesDene(zaman);
  if (zaman - ben.sonGonder >= 1 / MAC.tik) {
    ben.sonGonder = zaman;
    bag.gonder({ t: 'k', x: +ben.x.toFixed(3), y: +ben.y.toFixed(3), z: +ben.z.toFixed(3), yaw: +ben.yaw.toFixed(3), pitch: +ben.pitch.toFixed(3), b: (ben.yerde ? 2 : 0) | (ben.poz > 0 ? 4 : 0), s: ben.silah, dg: ben.dg });
  }
}

function digerleriniCiz(dt) {
  const s = oyun.snaps; if (!s.length) return;
  const z = cizimZamani();
  let a = s[0], b = s[s.length - 1];
  for (let i = s.length - 1; i > 0; i--) if (s[i - 1].z <= z) { a = s[i - 1]; b = s[i]; break; }
  const t = b.z > a.z ? Math.max(0, Math.min(1.2, (z - a.z) / (b.z - a.z))) : 1;
  for (const [id, v] of gor.oyuncular) {
    if (id === oyun.benId) continue;
    const p = b.o.get(id), q = a.o.get(id) ?? p; if (!p) continue;
    const ayn = Math.hypot(p[1] - q[1], p[3] - q[3]) > 6; // ışınlandı (doğuş): ara değer yok
    const k = ayn ? 1 : t;
    gor.oyuncuGuncelle(id, [q[1] + (p[1] - q[1]) * k, q[2] + (p[2] - q[2]) * k, q[3] + (p[3] - q[3]) * k, q[4] + aci(p[4] - q[4]) * k, q[5] + (p[5] - q[5]) * k, p[7], p[8]], dt, false);
  }
  // Kendi modelim yalnız ölüyken görünür (yere düşen beden)
  if (gor.oyuncular.has(oyun.benId)) gor.oyuncuGuncelle(oyun.benId, [ben.x, ben.y, ben.z, ben.yaw, ben.pitch, ben.canli ? 1 : 0, ben.silah], dt, ben.canli);
  gor.roketGuncelle(b.m, dt);
}

const TEMEL_FOV = 72;
function kamera(dt) {
  const k = gor.kamera;
  if (ben.canli) {
    // Tepme geri gelir; adım sallanması yerde hızla, yana kayınca hafif eğilme; inişte yay gibi çöküp kalkma.
    const geri = Math.exp(-dt * 11); ben.tepmeP *= geri; ben.tepmeY *= geri;
    const hiz = Math.hypot(ben.vx, ben.vz), yerde = ben.yerde && hiz > 1.5, onceFaz = ben.adimFaz;
    ben.adimFaz += yerde ? dt * hiz * 1.15 : 0;
    if (Math.floor(onceFaz / Math.PI) !== Math.floor(ben.adimFaz / Math.PI)) cal('adim', 0.18 + Math.min(0.2, hiz * 0.02));
    const salla = yerde ? Math.min(1, hiz / OYUNCU.kosu) : 0;
    const sagHiz = Math.cos(ben.yaw) * ben.vx - Math.sin(ben.yaw) * ben.vz;
    ben.egim += (-sagHiz / OYUNCU.kosu * 0.022 - ben.egim) * Math.min(1, dt * 9);
    ben.inisV += (-ben.inis * 160 - ben.inisV * 16) * dt; ben.inis += ben.inisV * dt;
    const S = SILAHLAR[ben.silah], nisan = fare.sag && !S.yakin && kilitli, sakin = nisan ? 0.25 : 1;
    k.position.set(ben.x + Math.cos(ben.yaw) * Math.cos(ben.adimFaz) * 0.025 * salla * sakin, ben.y + OYUNCU.goz + Math.abs(Math.sin(ben.adimFaz)) * 0.05 * salla * sakin + ben.inis * 0.12, ben.z - Math.sin(ben.yaw) * Math.cos(ben.adimFaz) * 0.025 * salla * sakin);
    k.rotation.set(ben.pitch + ben.tepmeP, ben.yaw + ben.tepmeY, ben.egim * sakin, 'YXZ');
    // Görüş: dikey 72° (16:9'da yatay ≈ 104°); koşarken azıcık açılır (hız hissi).
    ben.fovEk += (Math.max(0, hiz - OYUNCU.hiz) * 0.9 - ben.fovEk) * Math.min(1, dt * 10);
    gor.fov = nisan ? S.nisanFov : TEMEL_FOV + ben.fovEk;
    $('durbun').hidden = !(nisan && ben.silah === SILAH_NO.keskin);
  } else {
    // Ölüm kamerası: bedenin üstünden geriye çekilir, vurana bakar.
    const ge = Math.min(1, (simdi() - oyun.olumZ) / 1.2), katil = oyun.olen != null ? gor.oyuncular.get(oyun.olen) : null;
    // Kamera bedenden geriye ve yukarı çekilir; arada duvar varsa önünde durur.
    const ox = ben.x, oy = ben.y + 1.2, oz = ben.z, hx = Math.sin(ben.yaw) * 3 * ge, hy = 0.4 + ge * 2.2, hz = Math.cos(ben.yaw) * 3 * ge, u = Math.hypot(hx, hy, hz);
    const t = Math.max(0, Math.min(u, isinHarita(ox, oy, oz, hx / u, hy / u, hz / u, u) - 0.35)) / u;
    k.position.set(ox + hx * t, oy + hy * t, oz + hz * t);
    if (katil) { v3.set(katil.x, katil.y + 1.2, katil.z); k.lookAt(v3); } else k.lookAt(ben.x, ben.y + 0.5, ben.z);
    gor.fov = 70; $('durbun').hidden = true;
  }
}

// ——— Göstergeler ———
const hudOnce = {};
const yaz = (id, v) => { if (hudOnce[id] !== v) { hudOnce[id] = v; $(id).textContent = v; } };
function gostergeler(zaman) {
  const S = SILAHLAR[ben.silah];
  yaz('can', String(Math.max(0, Math.ceil(ben.can))));
  $('can-bar').style.width = Math.max(0, ben.can) + '%'; $('can-kutu').classList.toggle('dusuk', ben.can < 35);
  $('y-cift').classList.toggle('bekle', !ben.yerde && ben.havaHak <= 0);
  yaz('silah-ad', S.ad.toLocaleUpperCase('tr'));
  yaz('cephane', S.yakin ? '—' : ben.silah === SILAH_NO.roket ? String(ben.cephane) : String(ben.sarjor[ben.silah]));
  yaz('cephane-yedek', S.yakin ? '' : ben.silah === SILAH_NO.roket ? 'roket' : '/ ' + S.sarjor);
  $('doldur-bar').style.width = ben.dolduruyorT > 0 ? (100 * (1 - ben.dolduruyorT / SILAHLAR[ben.doldurSilah].doldur)) + '%' : '0%';
  const sl = $('silahlar'); if (!sl.children.length) for (const s of SILAHLAR) { const e = document.createElement('span'); e.textContent = s.tus + ' ' + s.ad; sl.append(e); }
  [...sl.children].forEach((e, i) => { e.classList.toggle('secili', i === ben.silah); e.classList.toggle('yok', i === SILAH_NO.roket && ben.cephane <= 0); });
  // Nişangâh açıklığı: silahın saçılması + ateşten sonra yayılma + hava/koşu
  const nisan = fare.sag && !S.yakin, sac = (nisan ? S.nisanSacilma : S.sacilma ?? 0) + ben.yayilma * 0.03 + (ben.yerde ? 0 : 0.015);
  const px = Math.max(5, sac * innerHeight / 2 / Math.tan(gor.kamera.fov * Math.PI / 360)) + 3;
  const i = $('nisangah').children; i[0].style.transform = `translateY(${-px - 8}px)`; i[1].style.transform = `translateY(${px}px)`; i[2].style.transform = `translateX(${-px - 8}px)`; i[3].style.transform = `translateX(${px}px)`;
  $('nisangah').classList.toggle('gizli', !ben.canli || (nisan && ben.silah === SILAH_NO.keskin));
  // Süre ve skor
  const kalan = Math.max(0, oyun.kalan - (oyun.durum === 'oyun' ? simdi() - oyun.kalanZ : 0)), dk = Math.floor(kalan / 60), sn = Math.floor(kalan % 60);
  yaz('sure', `${dk}:${String(sn).padStart(2, '0')}`);
  const M = MODLAR[oyun.mod];
  let sk;
  if (oyun.takimli) { const t = oyun.roster.get(oyun.benId)?.takim ?? 0; sk = `<span class="mavi${t === 0 ? ' ben' : ''}">Mavi ${oyun.tk[0]}</span><span class="kirmizi${t === 1 ? ' ben' : ''}">Kırmızı ${oyun.tk[1]}</span><span>${M.hedef} leşte biter</span>`; }
  else { const l = [...oyun.skor.entries()].sort((a, b) => b[1].les - a[1].les), benim = oyun.skor.get(oyun.benId)?.les ?? 0, lider = l.find(([id]) => id !== oyun.benId); sk = `<span class="ben">Sen ${benim}</span><span>${lider ? (oyun.roster.get(lider[0])?.ad ?? '') + ' ' + lider[1].les : ''}</span><span>${M.hedef} leşte biter</span>`; }
  if (hudOnce.sk !== sk) { hudOnce.sk = sk; $('skorlar').innerHTML = sk; }
  if (!ben.canli && oyun.durum === 'oyun') yaz('olum-sayac', `Yeniden doğuş ${Math.max(0, Math.ceil(OYUNCU.dogusBekle - (simdi() - oyun.olumZ)))}`);
  if (oyun.durum === 'son' && bag?.yerel) yaz('son-sayac', `Yeni maç ${Math.max(0, Math.ceil(oyun.sonBitis - simdi()))} saniye sonra`);
  $('skor-tablo').hidden = !skorGoster || oyun.durum === 'son';
  if (skorGoster) skorTablo();
  etiketler();
}
function skorTablo() {
  const l = [...oyun.roster.entries()].map(([id, r]) => ({ id, r, s: oyun.skor.get(id) ?? { les: 0, olum: 0 } })).sort((a, b) => (oyun.takimli ? a.r.takim - b.r.takim : 0) || b.s.les - a.s.les || a.s.olum - b.s.olum);
  const html = l.map(({ id, r, s }) => `<tr class="${id === oyun.benId ? 'ben ' : ''}${oyun.takimli ? (r.takim === 0 ? 'mavi' : 'kirmizi') : ''}"><td>${kacis(r.ad)}${r.bot ? '<span class="bot">BOT</span>' : ''}</td><td>${s.les}</td><td>${s.olum}</td></tr>`).join('');
  if (hudOnce.tablo !== html) { hudOnce.tablo = html; $('skor-satir').innerHTML = html; }
  yaz('skor-baslik', `${MODLAR[oyun.mod].ad.toLocaleUpperCase('tr')} · ${bag?.yerel ? 'BOTLAR ' + ZORLUK[oyun.yerelZorluk]?.ad.toLocaleUpperCase('tr') : 'ÇEVRİM İÇİ'}`);
}
const kacis = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const etiketDiv = new Map();
function etiketler() {
  // Takım arkadaşlarının adı hep, düşmanınki yalnız nişangâhtayken görünür.
  const goz = [ben.x, ben.y + OYUNCU.goz, ben.z], d = bakis(ben.yaw, ben.pitch), benT = oyun.roster.get(oyun.benId)?.takim;
  let hedef = null, en = ben.canli ? isinHarita(goz[0], goz[1], goz[2], d[0], d[1], d[2], 120) : 0;
  for (const [id, v] of gor.oyuncular) {
    if (id === oyun.benId || !v.canli) continue;
    const k = vurusKutulari(v.x, v.y, v.z), t = Math.min(isinKutu(goz[0], goz[1], goz[2], d[0], d[1], d[2], k.govde[0], k.govde[1], en), isinKutu(goz[0], goz[1], goz[2], d[0], d[1], d[2], k.kafa[0], k.kafa[1], en));
    if (t < en) { en = t; hedef = id; }
  }
  const gorunen = new Set();
  for (const [id, v] of gor.oyuncular) {
    if (id === oyun.benId || !v.canli) continue;
    const dost = oyun.takimli && oyun.roster.get(id)?.takim === benT;
    if (!dost && id !== hedef) continue;
    v3.set(v.x, v.y + 2.15, v.z).project(gor.kamera); if (v3.z > 1 || Math.abs(v3.x) > 1.1 || Math.abs(v3.y) > 1.1) continue;
    gorunen.add(id);
    let e = etiketDiv.get(id); if (!e) { e = document.createElement('div'); e.innerHTML = '<span></span><i><b></b></i>'; $('etiketler').append(e); etiketDiv.set(id, e); }
    e.className = 'etiket ' + (dost ? 'dost' : 'dusman'); e.firstChild.textContent = oyun.roster.get(id)?.ad ?? '';
    const sn = oyun.snaps[oyun.snaps.length - 1]?.o.get(id); e.querySelector('b').style.width = (sn ? sn[6] : 100) + '%';
    e.style.left = ((v3.x + 1) / 2 * innerWidth) + 'px'; e.style.top = ((1 - v3.y) / 2 * innerHeight) + 'px';
  }
  for (const [id, e] of etiketDiv) if (!gorunen.has(id)) { e.remove(); etiketDiv.delete(id); }
}

// ——— Çevrim içi (josephuz oda standardı): ana ekranda HIZLI KATIL / ODA KUR / ODAYA KATIL + AÇIK ODALAR, bekleme odası ———
// Tek WebSocket (lobiBag): odada değilken açık oda listesini sunucu kendisi gönderir; odadayken bekleme odası durumu ('oda')
// ve maç mesajları da buradan gelir. Odadayken adres ?oda=KOD; sessionStorage'daki jetonla yenilenen sayfa koltuğuna döner.
let lobiBag = null, lobiAcik = false, lobiDeneme = 0, lobiListe = { odalar: [], cevrimici: 0, toplam: 0 };
let odaDurum = null, seciliKoltuk = null, surukle = null;
const oturum = {
  al() { try { return { oda: sessionStorage.getItem('tetik.oda'), jeton: sessionStorage.getItem('tetik.jeton') }; } catch { return {}; } },
  yaz(oda, jeton) { try { sessionStorage.setItem('tetik.oda', oda); sessionStorage.setItem('tetik.jeton', jeton); } catch { /* yok */ } },
  sil() { try { sessionStorage.removeItem('tetik.oda'); sessionStorage.removeItem('tetik.jeton'); } catch { /* yok */ } },
};
function adresOda(kod) {
  const u = new URL(location.href);
  if (kod) u.searchParams.set('oda', kod); else u.searchParams.delete('oda');
  try { history.replaceState(null, '', u.pathname + u.search + u.hash); } catch { /* yok */ }
}
const kimlik = () => ({ ad: secim.ad, avatar: avatarim() });
function durumYaz(t, hata = false) { const e = $('cevrimici-durum'); e.textContent = t; e.classList.toggle('hata', hata); }

function lobiBaglan() {
  if (lobiBag || PARAM.has('cevrimdisi')) return;
  const b = lobiBag = sunucuBaglanti(d => {
    if (lobiBag !== b) return;
    if (d === 'acik') { lobiAcik = true; lobiYaz(); kendiliginden(); return; }
    const odadaydi = !!odaDurum || (oyun && bag === b);
    lobiAcik = false; lobiBag = null;
    if (oyun && bag === b) oyunKapat();
    if (odadaydi) { odaDurum = null; beklemeYaz(); toast('Sunucu bağlantısı koptu.'); durumYaz('Bağlantı koptu, yeniden deneniyor…', true); }
    lobiYaz();
    setTimeout(lobiBaglan, odadaydi && lobiDeneme === 0 ? 1000 : Math.min(30000, 5000 * ++lobiDeneme));
  });
}
/** Bağlanınca: link ?oda=KOD ya da yenilenen sayfanın oturumu varsa odaya kendiliğinden girer. */
function kendiliginden() {
  const kod = kodDuzelt(new URLSearchParams(location.search).get('oda')), o = oturum.al();
  const hedef = kod ?? (o.oda && o.jeton ? o.oda : null); if (!hedef) return;
  const geri = o.oda === hedef && o.jeton;
  durumYaz(geri ? 'Odaya geri bağlanıyor…' : 'Odaya bağlanıyor…');
  lobiBag.gonder({ t: 'katil', kod: hedef, jeton: geri ? o.jeton : undefined, ...kimlik() });
}
function lobiIsle(m) { lobiDeneme = 0; lobiListe = m; lobiYaz(); }
function lobiYaz() {
  $('cevrimici').classList.toggle('kapali', !lobiAcik);
  for (const id of ['hizli', 'oda-kur', 'odaya-katil']) $(id).disabled = !lobiAcik;
  if (!lobiAcik) { $('kod-satir').hidden = true; $('odaya-katil').setAttribute('aria-expanded', 'false'); }
  $('cevrimici-sayi').hidden = !lobiAcik; $('cevrimici-sayi').textContent = `● ${lobiListe.cevrimici ?? 0} çevrim içi`;
  $('acik-odalar').hidden = !lobiAcik;
  const l = lobiListe.odalar ?? [];
  $('oda-sayi').textContent = String(lobiListe.toplam ?? l.length);
  const k = $('odalar'); k.innerHTML = '';
  if (!l.length) { k.innerHTML = '<div class="bos">Şu an açık oda yok. Hızlı katıl yeni bir oda kurar.</div>'; return; }
  for (const o of l) {
    const dolu = o.insan >= o.kisi, e = document.createElement('button'); e.className = 'oda'; e.disabled = dolu;
    e.innerHTML = `<span><b></b><br><small>${MODLAR[o.mod]?.ad ?? ''} · ${ZORLUK[o.zorluk]?.ad ?? ''} botlar · ${o.insan}/${o.kisi} oyuncu</small></span><span class="sag"><i class="durum${o.durum === 'mac' ? ' mac' : ''}">${o.durum === 'mac' ? 'MAÇTA' : 'LOBİDE'}</i><em>${dolu ? 'DOLU' : 'KATIL →'}</em></span>`;
    e.querySelector('b').textContent = o.kuran;
    e.onclick = () => koduylaKatil(o.kod);
    k.append(e);
  }
}
function koduylaKatil(kod) { if (!lobiAcik) return; durumYaz('Odaya bağlanıyor…'); lobiBag.gonder({ t: 'katil', kod, ...kimlik() }); }
$('hizli').onclick = () => { if (!lobiAcik) return; durumYaz('Oda aranıyor…'); lobiBag.gonder({ t: 'hizli', mod: secim.mod, zorluk: secim.zorluk, ...kimlik() }); };
$('oda-kur').onclick = () => { if (!lobiAcik) return; durumYaz('Oda kuruluyor…'); lobiBag.gonder({ t: 'kur', mod: secim.mod, zorluk: secim.zorluk, ...kimlik() }); };
$('odaya-katil').onclick = () => { const s = $('kod-satir'); s.hidden = !s.hidden; $('odaya-katil').setAttribute('aria-expanded', String(!s.hidden)); if (!s.hidden) $('kod').focus(); };
function kodKatil() {
  const kod = kodDuzelt($('kod').value.trim());
  if (!kod) { durumYaz('Oda kodunu yaz', true); $('kod').focus(); return; }
  $('kod').value = kod; koduylaKatil(kod);
}
$('kod-katil').onclick = kodKatil;
$('kod').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); kodKatil(); } });
$('kod').addEventListener('input', () => { const e = $('kod'), p = e.selectionStart; e.value = e.value.toLocaleUpperCase('tr').replace(/İ/g, 'I'); try { e.setSelectionRange(p, p); } catch { /* yok */ } });

/** Sunucudan gelen her mesaj (odada değilken de, çevrim içi maçta da) buradan geçer. */
function agMesaji(m) {
  switch (m.t) {
    case 'lobi': lobiIsle(m); return;
    case 'odada': durumYaz(''); oturum.yaz(m.kod, m.jeton); adresOda(m.kod); return;
    case 'oda': odaIsle(m); return;
    case 'hata':
      durumYaz(m.m, true); toast(m.m);
      if (!odaDurum) { adresOda(null); oturum.sil(); }
      return;
    case 'hosgeldin':
      // Maç başladı (ya da maç sürerken katıldın / döndün): bekleme odasından maça.
      if (oyun && bag === lobiBag) oyunKapat();
      if (!oyun) { $('bekleme').hidden = true; oyunBaslat(lobiBag); }
      break;
  }
  if (oyun && bag === lobiBag) isle(m);
}
function odaIsle(m) {
  odaDurum = m;
  if (m.kuran !== m.sen || (seciliKoltuk != null && !m.koltuklar[seciliKoltuk])) seciliKoltuk = null;
  beklemeYaz();
}
function odadanCik() {
  if (lobiAcik) { lobiBag.gonder({ t: 'cik' }); lobiBag.gonder({ t: 'lobi' }); }
  odaDurum = null; seciliKoltuk = null; oturum.sil(); adresOda(null);
  if (oyun) oyunKapat();
  beklemeYaz(); lobiYaz(); durumYaz('');
}
$('bk-cik').onclick = odadanCik;
$('bk-basla').onclick = () => { if (odaDurum && odaDurum.kuran === odaDurum.sen) lobiBag?.gonder({ t: 'basla' }); };
$('son-lobi').onclick = () => oyunKapat();
$('bk-kopyala').onclick = async () => {
  if (!odaDurum) return;
  const link = location.origin + location.pathname + '?oda=' + odaDurum.kod, b = $('bk-kopyala');
  try { await navigator.clipboard.writeText(link); b.textContent = 'Link kopyalandı'; setTimeout(() => { b.textContent = 'Linki kopyala'; }, 2000); }
  catch { $('bk-link-yazi').textContent = link; $('bk-link-yazi').hidden = false; }
};
for (const [kap, alan] of [['bk-mod', 'mod'], ['bk-zorluk', 'zorluk'], ['bk-ozel', 'ozel']]) {
  for (const b of $(kap).children) b.onclick = () => { if (odaDurum && odaDurum.kuran === odaDurum.sen) lobiBag?.gonder({ t: 'ayar', [alan]: alan === 'ozel' ? +b.dataset.v : b.dataset.v }); };
}
function koltukTasi(kimden, kime) { seciliKoltuk = null; lobiBag?.gonder({ t: 'tasi', kimden, koltuk: kime }); beklemeYaz(); }
function koltukTikla(i) {
  const d = odaDurum; if (!d) return;
  const kuranim = d.kuran === d.sen, dolu = !!d.koltuklar[i];
  if (kuranim && seciliKoltuk != null) { if (seciliKoltuk !== i) return koltukTasi(seciliKoltuk, i); seciliKoltuk = null; }
  else if (kuranim && dolu) seciliKoltuk = i;
  else if (!dolu) { lobiBag?.gonder({ t: 'otur', koltuk: i }); return; }
  beklemeYaz();
}
/** Bekleme odası: odadayken ve maç ekranı kapalıyken görünür. Esc kapatmaz. */
function beklemeYaz() {
  const d = odaDurum, goster = !!d && !oyun;
  $('bekleme').hidden = !goster; $('ana').hidden = goster || !!oyun;
  if (!goster) return;
  const M = MODLAR[d.mod], Z = ZORLUK[d.zorluk], kuranim = d.kuran === d.sen;
  $('bk-goz').textContent = `ODA · ${M.ad.toLocaleUpperCase('tr')} · ${Z.ad.toLocaleUpperCase('tr')} BOTLAR`;
  $('bk-kod').textContent = d.kod;
  $('bk-gorunur').textContent = d.ozel ? 'ÖZEL ODA · yalnız kodla' : 'AÇIK ODA · listede görünür';
  const kap = $('bk-koltuklar'); kap.innerHTML = ''; kap.classList.toggle('tek', !M.takimli);
  const sutunlar = M.takimli ? [0, 1].map(t => ({ ad: TAKIM_AD[t].toLocaleUpperCase('tr'), cls: t ? 'kirmizi' : 'mavi', l: [0, 1, 2, 3].map(i => i + t * 4) })) : [{ ad: 'KOLTUKLAR', cls: '', l: [0, 1, 2, 3, 4, 5, 6, 7] }];
  for (const s of sutunlar) {
    const sut = document.createElement('div'); sut.className = 'bk-sutun ' + s.cls; sut.innerHTML = `<span class="eyebrow">${s.ad}</span>`;
    for (const i of s.l) {
      const k = d.koltuklar[i], e = document.createElement('button');
      e.className = 'koltuk ' + (k ? 'dolu' : 'bos otur') + (i === d.sen ? ' sen' : '') + (i === seciliKoltuk ? ' secili' : '');
      if (k) {
        e.innerHTML = '<span class="ad"></span><span class="etiketler"></span>'; e.querySelector('.ad').textContent = k.ad;
        const et = e.querySelector('.etiketler');
        for (const [var_, ad] of [[i === d.kuran, 'kuran'], [i === d.sen, 'sen'], [!!k.koptu, 'koptu']]) if (var_) { const t = document.createElement('i'); t.className = 'etiket-k ' + ad; t.textContent = ad; et.append(t); }
        if (kuranim) {
          e.draggable = true; e.title = 'Sürükle ya da tıkla, sonra koltuğa tıkla';
          e.addEventListener('dragstart', ev => { surukle = i; ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', String(i)); } catch { /* yok */ } });
        } else e.tabIndex = -1;
      } else e.innerHTML = '<span class="b1">Bot · boş koltuk</span><span class="b2">Buraya otur</span>';
      e.onclick = () => koltukTikla(i);
      if (kuranim) {
        e.addEventListener('dragover', ev => { if (surukle != null) { ev.preventDefault(); e.classList.add('uzerinde'); } });
        e.addEventListener('dragleave', () => e.classList.remove('uzerinde'));
        e.addEventListener('drop', ev => { ev.preventDefault(); e.classList.remove('uzerinde'); const k0 = surukle; surukle = null; if (k0 != null && k0 !== i) koltukTasi(k0, i); });
        e.addEventListener('dragend', () => { surukle = null; });
      }
      sut.append(e);
    }
    kap.append(sut);
  }
  $('bk-ipucu').textContent = kuranim && seciliKoltuk != null ? 'Taşınacak koltuğa tıkla' : '';
  for (const [kp, v] of [['bk-mod', d.mod], ['bk-zorluk', d.zorluk], ['bk-ozel', String(d.ozel ? 1 : 0)]]) for (const b of $(kp).children) { b.classList.toggle('secili', b.dataset.v === v); b.disabled = !kuranim; }
  const insan = d.koltuklar.filter(Boolean).length;
  $('bk-bilgi').textContent = `${insan} insan · ${d.koltuklar.length - insan} bot · ${M.takimli ? 'Mavi–Kırmızı, ' : ''}${M.hedef} leşte biter`;
  const bs = $('bk-basla'); bs.disabled = !kuranim;
  bs.innerHTML = kuranim ? 'MAÇI BAŞLAT <span>↗</span>' : 'Kuranın başlatması bekleniyor';
}

// ——— Döngü ———
let onceki = simdi();
function dongu() {
  requestAnimationFrame(dongu);
  const zaman = simdi(), dt = Math.min(0.05, zaman - onceki); onceki = zaman;
  if (lobiBag) for (const m of lobiBag.al()) agMesaji(m);
  if (!oyun) { if (demo) demoAdim(dt, zaman); gor.cizim(dt, zaman); return; }
  if (bag.yerel && !menuAcik && !$('help-dialog').open) {
    oyun.birikim = Math.min(oyun.birikim + dt, 0.2);
    while (oyun.birikim >= 1 / MAC.tik) { oyun.birikim -= 1 / MAC.tik; bag.adim(1 / MAC.tik); }
  }
  if (bag.yerel) for (const m of bag.al()) { isle(m); if (!oyun) break; }
  if (!oyun) return;
  const durdu = bag.yerel && (menuAcik || $('help-dialog').open);
  if (!durdu) kendiAdim(dt, zaman);
  digerleriniCiz(dt);
  kamera(dt);
  const S = SILAHLAR[ben.silah];
  gor.elGuncelle(dt, { silah: ben.silah, hiz: Math.hypot(ben.vx, ben.vz), yerde: ben.yerde, nisan: fare.sag && !S.yakin && kilitli, doldurOran: ben.dolduruyorT > 0 ? Math.sin(Math.PI * (1 - ben.dolduruyorT / SILAHLAR[ben.doldurSilah].doldur)) : 0, gizli: !ben.canli, keskinNisan: fare.sag && ben.silah === SILAH_NO.keskin && kilitli, surX: ben.surX, surY: ben.surY, havada: !ben.yerde, dikey: ben.vy });
  ben.surX = ben.surY = 0;
  gostergeler(zaman);
  gor.cizim(dt, zaman);
}

anaEkranKur();
demoBaslat();
lobiBaglan();
lobiYaz();
if (PARAM.has('oda') && !PARAM.has('cevrimdisi')) durumYaz('Odaya bağlanıyor…');
requestAnimationFrame(dongu);
// Test ve otomatik oynatma için: ?otomatik=1 botlu oyunu hemen başlatır.
if (PARAM.has('otomatik')) oyunBaslat(yerelBaglanti({ mod: PARAM.get('mod') ?? secim.mod, zorluk: secim.zorluk, harita: PARAM.get('harita') ?? secim.harita, ad: secim.ad, avatar: avatarim() }));
window.__tetik = { ben, get oyun() { return oyun; }, get bag() { return bag; }, gor };
