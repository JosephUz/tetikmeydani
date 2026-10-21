// Maç benzetimi: hasar, ölüm, doğuş, yerden alınanlar, roketler, skor ve botlar. Tarayıcıda (botlu oyun) ve sunucuda
// (çevrim içi oda) aynı kod çalışır. İnsan oyuncuların konumu kendi istemcilerinden gelir (istemci yürütür); ateşi ise
// burada, ateş anında istemcinin gördüğü konumlara geri sarılarak (gecmis) hesaplanır.
import { OYUNCU, SILAHLAR, SILAH_NO, MODLAR, ZORLUK, MAC } from './ayar.js';
import { HARITALAR, VARSAYILAN, haritaKullan } from './harita.js';
import { hareketDurumu, isinHarita, isinKutu, vurusKutulari, gorur, tohumlu, saptir, bakis } from './fizik.js';
import { MODELLER } from './avatar-veri.js';
import { botAdim, botSifirla } from './bot.js';

const BOT_ADLARI = ['Çiftçi Rıza', 'Madenci Kâzım', 'Balıkçı Nuri', 'Tüccar Saadet', 'Muhafız Cevdet', 'Gezgin Leyla', 'Demirci Halil', 'Kuyumcu Nesrin', 'Değirmenci Sabri', 'Çoban Zeynep', 'Fırıncı Hamdi', 'Bostancı Gülsüm', 'Kervancı Rüstem', 'Arıcı Hatice'];
const BOT_MODEL = ['ciftci', 'madenci', 'balikci', 'tuccar', 'muhafiz', 'gezgin', 'madenci', 'tuccar', 'ciftci', 'gezgin', 'balikci', 'ciftci', 'muhafiz', 'gezgin'];
const GECMIS_SURE = 0.35;
const yuvarla = v => Math.round(v * 100) / 100;

export class Mac {
  constructor({ mod = 'herkes', zorluk = 'orta', harita = VARSAYILAN, kisi, rastgele = Math.random, tekMac = false } = {}) {
    this.tekMac = tekMac; // çevrim içi oda: maç bitince yenisi başlamaz, oda bekleme odasına döner
    this.harita = HARITALAR[harita] ? harita : VARSAYILAN; this.H = haritaKullan(this.harita);
    this.mod = MODLAR[mod] ? mod : 'herkes'; this.M = MODLAR[this.mod];
    this.zorluk = ZORLUK[zorluk] ? zorluk : 'orta';
    this.kisi = kisi ?? this.M.kisi; this.r = rastgele;
    this.z = 0; this.oyuncular = new Map(); this.sira = 1;
    this.olaylar = []; // { kime: id | null (herkes) | -id (o hariç herkes), m }
    this.mermiler = []; this.mermiNo = 1; this.gecmis = [];
    this.canlar = this.H.canlar.map(([x, y, z]) => ({ x, y, z, hazirZ: 0 }));
    this.roket = { x: this.H.roket[0], y: this.H.roket[1], z: this.H.roket[2], hazirZ: 20 };
    this.durum = 'oyun'; this.bitisZ = this.M.sure; this.sonZ = 0; this.takimLes = [0, 0]; this.kazanan = null; this.macNo = 1;
  }
  get takimli() { return this.M.takimli; }
  olay(kime, m) { this.olaylar.push({ kime, m }); }

  /** takim: 0/1 verilirse (çevrim içi odada seçilen koltuk) o takım, yoksa az olan takım. */
  yeniOyuncu(ad, avatar, bot, takim) {
    const id = this.sira++;
    const o = { id, ad, avatar, bot, takim: -1, x: 0, y: 0, z: 0, yaw: 0, pitch: 0, ...hareketDurumu(),
      can: OYUNCU.can, canli: false, olumZ: -99, korumaZ: 0, dogusNo: 0, silah: 0, sarjor: SILAHLAR.map(s => s.sarjor), sonAtis: SILAHLAR.map(() => -99),
      dolduruyorZ: 0, cephane: 0, les: 0, olum: 0, seri: 0, sonHasarZ: -99, sonSaldiran: null, bit: 0, katilZ: this.z };
    if (this.takimli && (takim === 0 || takim === 1)) o.takim = takim;
    else if (this.takimli) { const say = [0, 0]; for (const p of this.oyuncular.values()) if (p.takim >= 0) say[p.takim]++; o.takim = say[0] <= say[1] ? 0 : 1; }
    this.oyuncular.set(id, o);
    if (bot) botSifirla(o);
    this.dogur(o);
    this.listeYolla();
    return o;
  }
  insanEkle(ad, avatar, takim) { const o = this.yeniOyuncu(ad, avatar, false, takim); this.botlariDuzenle(); return o; }
  botEkle() {
    const kullanilan = new Set([...this.oyuncular.values()].map(o => o.ad));
    const i = BOT_ADLARI.findIndex(a => !kullanilan.has(a)), k = i < 0 ? Math.floor(this.r() * BOT_ADLARI.length) : i;
    const m = MODELLER.find(m => m.id === BOT_MODEL[k]) ?? MODELLER[0];
    return this.yeniOyuncu(i < 0 ? BOT_ADLARI[k] + ' ' + this.sira : BOT_ADLARI[k], { model: m.id, ...m.avatar }, true);
  }
  cikar(id) {
    const o = this.oyuncular.get(id); if (!o) return;
    this.oyuncular.delete(id); this.listeYolla(); this.botlariDuzenle();
  }
  /** Koltuk sayısı sabit: insan gelince bir bot çıkar, insan gidince bot gelir. Takımlı modda takımlar dengelenir. */
  botlariDuzenle() {
    const l = [...this.oyuncular.values()], botlar = l.filter(o => o.bot);
    while (l.length > this.kisi && botlar.length) {
      let b = botlar[botlar.length - 1];
      if (this.takimli) { const say = [0, 0]; for (const o of l) say[o.takim]++; const fazla = say[0] > say[1] ? 0 : 1; b = botlar.filter(o => o.takim === fazla).pop() ?? b; }
      botlar.splice(botlar.indexOf(b), 1); l.splice(l.indexOf(b), 1); this.oyuncular.delete(b.id);
    }
    while (l.length < this.kisi) l.push(this.botEkle());
    if (this.takimli) {
      // İnsan geldiyse ya da gittiyse takımlar dengelensin: fazla taraftaki bir botu öbür tarafa al.
      for (let i = 0; i < 4; i++) {
        const say = [0, 0]; for (const o of this.oyuncular.values()) say[o.takim]++;
        if (Math.abs(say[0] - say[1]) < 2) break;
        const fazla = say[0] > say[1] ? 0 : 1, b = [...this.oyuncular.values()].find(o => o.bot && o.takim === fazla); if (!b) break;
        b.takim = 1 - fazla; this.dogur(b);
      }
    }
    this.listeYolla();
  }
  listeYolla() { this.olay(null, { t: 'liste', o: [...this.oyuncular.values()].map(o => [o.id, o.ad, o.avatar, o.takim, o.bot ? 1 : 0]) }); }
  dusmanMi(a, b) { return a !== b && (!this.takimli || a.takim !== b.takim); }

  dogur(o) {
    haritaKullan(this.harita);
    const dusmanlar = [...this.oyuncular.values()].filter(p => p.canli && this.dusmanMi(o, p));
    let en = null, eu = -Infinity;
    // Takımlı modda yalnız kendi takımının doğuş yerleri; herkes herkese modunda hepsi.
    for (const d of this.H.doguslar) {
      if (this.takimli && d.takim !== o.takim) continue;
      let u = 60; for (const p of dusmanlar) { const m = Math.hypot(p.x - d.x, p.y - d.y, p.z - d.z); u = Math.min(u, m - (gorur([d.x, d.y + 1.6, d.z], [p.x, p.y + 1.4, p.z]) ? 12 : 0)); }
      u += this.r() * 8; if (u > eu) { eu = u; en = d; }
    }
    en ??= this.H.doguslar[0];
    Object.assign(o, hareketDurumu(), { x: en.x, y: en.y, z: en.z, yaw: en.yaw, pitch: 0, can: OYUNCU.can, canli: true, korumaZ: this.z + OYUNCU.dogusKoruma, silah: 0,
      sarjor: SILAHLAR.map(s => s.sarjor), dolduruyorZ: 0, cephane: 0, sonHasarZ: -99, dogusNo: o.dogusNo + 1 });
    o.yerde = true;
    if (o.bot) botSifirla(o); else this.olay(o.id, { t: 'dogus', x: en.x, y: en.y, z: en.z, yaw: en.yaw, dg: o.dogusNo });
  }

  /** İnsan istemcisinden konum. dg: istemcinin bildiği doğuş sayısı (eskisi yok sayılır). */
  konum(o, m) {
    if (!o.canli || m.dg !== o.dogusNo) return;
    const x = +m.x, y = +m.y, z = +m.z; if (![x, y, z].every(Number.isFinite)) return;
    if (Math.hypot(x - o.x, y - o.y, z - o.z) > 16) { this.olay(o.id, { t: 'duzelt', x: o.x, y: o.y, z: o.z }); return; }
    o.vx = (x - o.x) * MAC.tik; o.vz = (z - o.z) * MAC.tik;
    o.x = x; o.y = y; o.z = z; o.yaw = +m.yaw || 0; o.pitch = Math.max(-1.55, Math.min(1.55, +m.pitch || 0));
    o.bit = m.b & 0b1110;
    const s = m.s | 0; if (s !== o.silah && SILAHLAR[s] && (s !== SILAH_NO.roket || o.cephane > 0)) { o.silah = s; o.dolduruyorZ = 0; }
  }

  doldur(o) {
    const S = SILAHLAR[o.silah];
    if (!o.canli || !S.doldur || o.sarjor[o.silah] >= S.sarjor || o.dolduruyorZ) return;
    o.dolduruyorZ = this.z + S.doldur; o.doldurSilah = o.silah;
  }

  /**
   * Ateş: s silah, d bakış (birim), b başlangıç (göz), r tohum (saçma; t mesaj türüdür), n nişan alıyor mu, zt istemcinin gördüğü an.
   * Dönen: uç noktaları (iz çizgileri) ya da null (reddedildi).
   */
  ates(o, { s, d, b, r: tohum = 0, n = false, zt }) {
    const S = SILAHLAR[s]; if (!o.canli || !S || this.durum !== 'oyun') return null;
    haritaKullan(this.harita);
    if (s === SILAH_NO.roket && o.cephane <= 0) return null;
    if (this.z - o.sonAtis[s] < S.aralik * (o.bot ? ZORLUK[this.zorluk].ates : 0.8)) return null;
    if (o.dolduruyorZ) { if (o.doldurSilah === s && this.z >= o.dolduruyorZ - 0.3) this.doldurBitir(o); else return null; }
    if (S.sarjor && s !== SILAH_NO.roket && o.sarjor[s] <= 0) return null;
    if (!Array.isArray(d) || d.length !== 3 || !d.every(Number.isFinite)) return null;
    const dl = Math.hypot(...d); if (dl < 0.5) return null; d = d.map(v => v / dl);
    const goz = [o.x, o.y + OYUNCU.goz, o.z];
    if (!Array.isArray(b) || !b.every(Number.isFinite) || Math.hypot(b[0] - goz[0], b[1] - goz[1], b[2] - goz[2]) > 2.5) b = goz;
    o.sonAtis[s] = this.z; o.silah = s; o.korumaZ = 0;
    if (s === SILAH_NO.roket) { if (--o.cephane <= 0) o.silah = 0; }
    else if (S.sarjor) o.sarjor[s]--;
    const geri = Math.max(this.z - 0.3, Math.min(this.z, Number.isFinite(zt) ? zt : this.z));
    const poz = this.geriSar(geri);
    if (S.yakin) { this.kilic(o, d, poz); this.olay(-o.id, { t: 'ates', id: o.id, s, u: [] }); return []; }
    if (S.mermi) {
      const m = { id: this.mermiNo++, sahip: o.id, x: b[0] + d[0] * 0.6, y: b[1] + d[1] * 0.6 - 0.15, z: b[2] + d[2] * 0.6, vx: d[0] * S.mermi.hiz, vy: d[1] * S.mermi.hiz, vz: d[2] * S.mermi.hiz, yas: 0 };
      this.mermiler.push(m); this.olay(-o.id, { t: 'ates', id: o.id, s, u: [] }); return [];
    }
    const r = tohumlu(tohum | 0), sac = n ? S.nisanSacilma : S.sacilma, toplam = new Map(), uclar = [];
    for (let i = 0; i < (S.sacma || 1); i++) {
      const y = saptir(d, sac, r);
      let en = isinHarita(b[0], b[1], b[2], y[0], y[1], y[2], S.menzil), vurulan = null, kafa = false;
      for (const h of this.oyuncular.values()) {
        if (h === o || !h.canli || !this.dusmanMi(o, h)) continue;
        const p = poz.get(h.id) ?? [h.x, h.y, h.z], k = vurusKutulari(p[0], p[1], p[2]);
        const tk = isinKutu(b[0], b[1], b[2], y[0], y[1], y[2], k.kafa[0], k.kafa[1], en);
        if (tk < en) { en = tk; vurulan = h; kafa = true; }
        const tg = isinKutu(b[0], b[1], b[2], y[0], y[1], y[2], k.govde[0], k.govde[1], en);
        if (tg < en) { en = tg; vurulan = h; kafa = false; }
      }
      uclar.push([yuvarla(b[0] + y[0] * en), yuvarla(b[1] + y[1] * en), yuvarla(b[2] + y[2] * en)]);
      if (vurulan) {
        let h = S.hasar * (kafa ? S.kafa : 1);
        if (S.dusus) { const [a, z, en2] = S.dusus; h *= en <= a ? 1 : en >= z ? en2 : 1 - (1 - en2) * (en - a) / (z - a); }
        const t0 = toplam.get(vurulan) ?? { h: 0, kafa: false }; t0.h += h; t0.kafa ||= kafa; toplam.set(vurulan, t0);
      }
    }
    for (const [h, v] of toplam) this.hasarVer(h, v.h, o, s, v.kafa);
    this.olay(-o.id, { t: 'ates', id: o.id, s, b: b.map(yuvarla), u: uclar });
    return uclar;
  }
  kilic(o, d, poz) {
    const S = SILAHLAR[SILAH_NO.kilic], gx = o.x, gy = o.y + 1.1, gz = o.z;
    let en = null, eu = Infinity;
    for (const h of this.oyuncular.values()) {
      if (h === o || !h.canli || !this.dusmanMi(o, h)) continue;
      const p = poz.get(h.id) ?? [h.x, h.y, h.z], dx = p[0] - gx, dy = p[1] + 0.9 - gy, dz = p[2] - gz, u = Math.hypot(dx, dy, dz);
      if (u > S.menzil + 0.4) continue;
      const cos = (dx * d[0] + dy * d[1] + dz * d[2]) / Math.max(u, 1e-6);
      if (cos < Math.cos(S.aci) && u > 1.1) continue;
      if (u < eu) { eu = u; en = h; }
    }
    if (en) {
      // Arkadan vuruş (kurbanın bakışıyla aynı yönde) iki kat.
      const bk = bakis(en.yaw, 0), arka = bk[0] * d[0] + bk[2] * d[2] > 0.5;
      this.hasarVer(en, S.hasar * (arka ? 2 : 1), o, SILAH_NO.kilic, false);
    }
  }
  doldurBitir(o) { const S = SILAHLAR[o.doldurSilah]; o.sarjor[o.doldurSilah] = S.sarjor; o.dolduruyorZ = 0; }

  hasarVer(h, miktar, saldiran, s, kafa) {
    if (!h.canli || this.durum !== 'oyun') return;
    if (h.korumaZ > this.z) return;
    if (saldiran && saldiran !== h && !this.dusmanMi(saldiran, h)) return;
    miktar = Math.round(miktar); if (miktar <= 0) return;
    h.can -= miktar; h.sonHasarZ = this.z;
    if (saldiran && saldiran !== h) { h.sonSaldiran = saldiran.id; h.sonSaldiranZ = this.z; }
    const oldu = h.can <= 0;
    if (saldiran && saldiran !== h && !saldiran.bot) this.olay(saldiran.id, { t: 'isabet', h: h.id, m: miktar, k: kafa ? 1 : 0, o: oldu ? 1 : 0 });
    if (!h.bot) this.olay(h.id, { t: 'yara', m: miktar, x: saldiran ? yuvarla(saldiran.x) : null, z: saldiran ? yuvarla(saldiran.z) : null });
    if (oldu) this.olum(h, saldiran, s, kafa);
  }
  olum(h, saldiran, s, kafa) {
    h.canli = false; h.can = 0; h.olumZ = this.z; h.olum++; h.seri = 0; h.dolduruyorZ = 0;
    // Kendini vuran (roket) ya da son 4 sn'de hasar veren biri varsa leş onun.
    if ((!saldiran || saldiran === h) && h.sonSaldiran && this.z - h.sonSaldiranZ < 4) saldiran = this.oyuncular.get(h.sonSaldiran) ?? saldiran;
    if (saldiran && saldiran !== h) {
      saldiran.les++; saldiran.seri++;
      if (this.takimli) this.takimLes[saldiran.takim]++;
    } else h.les = Math.max(0, h.les - 1);
    this.olay(null, { t: 'les', o: saldiran && saldiran !== h ? saldiran.id : null, h: h.id, s, k: kafa ? 1 : 0, seri: saldiran && saldiran !== h ? saldiran.seri : 0 });
    this.skorYolla();
    const hedef = this.M.hedef;
    if (this.takimli ? this.takimLes.some(l => l >= hedef) : [...this.oyuncular.values()].some(o => o.les >= hedef)) this.bitir();
  }
  skorYolla() { this.olay(null, { t: 'skor', l: [...this.oyuncular.values()].map(o => [o.id, o.les, o.olum]), tk: this.takimLes, kalan: Math.max(0, Math.round(this.bitisZ - this.z)) }); }
  bitir() {
    if (this.durum !== 'oyun') return;
    this.durum = 'son'; this.sonZ = this.z + MAC.sonBekle;
    const l = [...this.oyuncular.values()].sort((a, b) => b.les - a.les || a.olum - b.olum);
    this.kazanan = this.takimli ? (this.takimLes[0] === this.takimLes[1] ? -1 : this.takimLes[0] > this.takimLes[1] ? 0 : 1) : l[0]?.id ?? null;
    this.olay(null, { t: 'son', kazanan: this.kazanan, takimli: this.takimli, tk: this.takimLes, l: l.map(o => [o.id, o.les, o.olum]), bekle: this.tekMac ? 0 : MAC.sonBekle, lobi: this.tekMac ? 1 : 0 });
  }
  yeniMac() {
    this.durum = 'oyun'; this.bitisZ = this.z + this.M.sure; this.takimLes = [0, 0]; this.kazanan = null; this.macNo++; this.mermiler = [];
    for (const c of this.canlar) c.hazirZ = 0; this.roket.hazirZ = this.z + 20;
    for (const o of this.oyuncular.values()) { o.les = 0; o.olum = 0; o.seri = 0; this.dogur(o); }
    this.olay(null, { t: 'basla', mac: this.macNo });
    this.skorYolla();
  }

  /** Ateş anına geri sar: o andaki konumlar (son GECMIS_SURE saniye). */
  geriSar(z) {
    const g = this.gecmis; if (!g.length || z >= this.z - 1e-3) return new Map();
    let i = g.length - 1; while (i > 0 && g[i].z > z) i--;
    const a = g[i], b = g[Math.min(i + 1, g.length - 1)], t = b.z > a.z ? Math.max(0, Math.min(1, (z - a.z) / (b.z - a.z))) : 0, m = new Map();
    for (const [id, p] of a.p) { const q = b.p.get(id) ?? p; m.set(id, [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t]); }
    return m;
  }

  adim(dt) {
    haritaKullan(this.harita);
    this.z += dt;
    if (this.durum === 'son') { if (!this.tekMac && this.z >= this.sonZ) this.yeniMac(); return; }
    if (this.z >= this.bitisZ) { this.bitir(); return; }
    for (const o of this.oyuncular.values()) {
      if (!o.canli) { if (this.z - o.olumZ >= OYUNCU.dogusBekle) this.dogur(o); continue; }
      if (o.dolduruyorZ && this.z >= o.dolduruyorZ) this.doldurBitir(o);
      if (this.z - o.sonHasarZ > OYUNCU.yenilenmeBekle && o.can < OYUNCU.can) o.can = Math.min(OYUNCU.can, o.can + OYUNCU.yenilenme * dt);
      if (o.bot) botAdim(this, o, dt, ZORLUK[this.zorluk]);
      this.alinanlar(o);
    }
    this.mermiAdim(dt);
    const p = new Map(); for (const o of this.oyuncular.values()) if (o.canli) p.set(o.id, [o.x, o.y, o.z]);
    this.gecmis.push({ z: this.z, p }); while (this.gecmis.length && this.gecmis[0].z < this.z - GECMIS_SURE) this.gecmis.shift();
    if (Math.floor(this.z) !== Math.floor(this.z - dt)) this.skorYolla();
  }
  alinanlar(o) {
    for (const [i, c] of this.canlar.entries()) {
      if (c.hazirZ > this.z || o.can >= OYUNCU.can) continue;
      if (Math.hypot(o.x - c.x, o.z - c.z) < 1.2 && Math.abs(o.y - c.y) < 1.5) {
        o.can = Math.min(OYUNCU.can, o.can + MAC.canPaketi); c.hazirZ = this.z + MAC.canDogus;
        this.olay(null, { t: 'al', p: i, id: o.id });
      }
    }
    const r = this.roket;
    if (r.hazirZ <= this.z && Math.hypot(o.x - r.x, o.z - r.z) < 1.4 && Math.abs(o.y - r.y) < 1.5) {
      r.hazirZ = this.z + MAC.roketDogus; o.cephane = SILAHLAR[SILAH_NO.roket].cephane;
      this.olay(null, { t: 'al', p: 'r', id: o.id, c: o.cephane });
    }
  }
  mermiAdim(dt) {
    const S = SILAHLAR[SILAH_NO.roket];
    for (let i = this.mermiler.length - 1; i >= 0; i--) {
      const m = this.mermiler[i], hiz = Math.hypot(m.vx, m.vy, m.vz), yol = hiz * dt, dx = m.vx / hiz, dy = m.vy / hiz, dz = m.vz / hiz;
      m.yas += dt;
      let en = isinHarita(m.x, m.y, m.z, dx, dy, dz, yol), carpti = en < yol;
      for (const h of this.oyuncular.values()) {
        if (!h.canli || (h.id === m.sahip && m.yas < 0.2)) continue;
        const k = vurusKutulari(h.x, h.y, h.z), t = Math.min(isinKutu(m.x, m.y, m.z, dx, dy, dz, k.govde[0], k.govde[1], en), isinKutu(m.x, m.y, m.z, dx, dy, dz, k.kafa[0], k.kafa[1], en));
        if (t < en) { en = t; carpti = true; }
      }
      if (carpti || m.yas > 6) {
        const x = m.x + dx * Math.max(0, en - 0.1), y = m.y + dy * Math.max(0, en - 0.1), z = m.z + dz * Math.max(0, en - 0.1);
        this.mermiler.splice(i, 1); this.patla(x, y, z, this.oyuncular.get(m.sahip), S);
      } else { m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt; }
    }
  }
  patla(x, y, z, sahip, S) {
    const { alan, itme, kendi } = S.mermi;
    this.olay(null, { t: 'patla', x: yuvarla(x), y: yuvarla(y), z: yuvarla(z) });
    for (const h of [...this.oyuncular.values()]) {
      if (!h.canli) continue;
      const cx = h.x, cy = h.y + 0.9, cz = h.z, u = Math.max(0, Math.hypot(cx - x, cy - y, cz - z) - 0.4);
      if (u > alan || !gorur([x, y, z], [cx, cy, cz])) continue;
      const k = 1 - u / alan, d = Math.hypot(cx - x, cy - y, cz - z) || 1;
      const v = [(cx - x) / d * itme * k, Math.max(0.35, (cy - y) / d + 0.45) * itme * k, (cz - z) / d * itme * k];
      const kendisi = h === sahip;
      if (kendisi || !sahip || this.dusmanMi(sahip, h)) {
        if (h.bot) { h.vx += v[0]; h.vy = Math.max(h.vy, 0) + v[1]; h.vz += v[2]; h.yerde = false; h.padT = 0.25; }
        else this.olay(h.id, { t: 'it', v: v.map(yuvarla) });
      }
      this.hasarVer(h, S.hasar * k * (kendisi ? kendi : 1), sahip, SILAH_NO.roket, false);
    }
  }

  /** Herkese giden anlık durum. */
  ozet() {
    return {
      t: 's', z: yuvarla(this.z), d: this.durum === 'oyun' ? 0 : 1,
      o: [...this.oyuncular.values()].map(o => [o.id, yuvarla(o.x), yuvarla(o.y), yuvarla(o.z), yuvarla(o.yaw), yuvarla(o.pitch), Math.ceil(o.can),
        (o.canli ? 1 : 0) | (o.bot ? o.bit : o.bit & 0b1110) | (o.korumaZ > this.z ? 16 : 0) | (o.dolduruyorZ ? 32 : 0), o.silah]),
      m: this.mermiler.map(m => [m.id, yuvarla(m.x), yuvarla(m.y), yuvarla(m.z)]),
      p: this.canlar.reduce((a, c, i) => a | (c.hazirZ <= this.z ? 1 << i : 0), 0) | (this.roket.hazirZ <= this.z ? 1 << 8 : 0),
    };
  }
}
