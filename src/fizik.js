// Hareket ve ışın: istemcide kendi karakterin, benzetimde botlar aynı kodla yürür.
import { OYUNCU as O } from './ayar.js';
import { H as HARITA } from './harita.js';

const R = O.yaricap, H = O.boy, EPS = 1e-4;

/** Oyuncu kutusu (ayak noktası x,y,z) hangi kutulara giriyor. */
function carpisan(x, y, z, l = HARITA.carpanlar) {
  const s = [];
  for (const k of l) if (x + R > k.a[0] && x - R < k.b[0] && y + H > k.a[1] && y < k.b[1] && z + R > k.a[2] && z - R < k.b[2]) s.push(k);
  return s;
}
export const bosMu = (x, y, z) => carpisan(x, y, z).length === 0;

/** Yeni hareket durumu (oyuncu nesnesine katılır). */
export const hareketDurumu = () => ({ vx: 0, vy: 0, vz: 0, yerde: false, havaHak: O.havaZiplamaSayisi, padT: 0, poz: 0 });

/**
 * Bir adım: g = { ileri, sag (−1…1), zipla (bu karede basıldı mı), kos (Shift basılı mı), yaw }.
 * Dönen olaylar: 'zipla', 'cift', 'pad', 'kon'.
 */
export function hareket(o, g, dt) {
  const olay = [], hiz = g.kos ? O.kosu : O.hiz;
  const sy = Math.sin(o.yaw), cy = Math.cos(o.yaw);
  let ix = -sy * g.ileri + cy * g.sag, iz = -cy * g.ileri - sy * g.sag;
  const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
  if (o.yerde) {
    const hx = ix * hiz, hz = iz * hiz, fx = hx - o.vx, fz = hz - o.vz, f = Math.hypot(fx, fz), a = O.ivme * dt;
    if (f <= a) { o.vx = hx; o.vz = hz; } else { o.vx += fx / f * a; o.vz += fz / f * a; }
  } else if (o.padT <= 0 && il > 0.01) {
    // Havada yön değiştirme (Quake gibi): istenen yöndeki hız hiz'a varana dek eklenir, daha hızlı gidiş kısılmaz.
    const ux = ix / Math.max(il, 1e-6) * Math.min(il, 1), uz = iz / Math.max(il, 1e-6) * Math.min(il, 1);
    const simdi = o.vx * ux + o.vz * uz, ek = Math.min(hiz - simdi, O.havaIvme * dt);
    if (ek > 0) { o.vx += ux * ek; o.vz += uz * ek; }
  }
  if (o.padT > 0) o.padT -= dt;
  if (g.zipla) {
    if (o.yerde) { o.vy = O.ziplama; o.yerde = false; olay.push('zipla'); }
    else if (o.havaHak > 0) { o.havaHak--; o.vy = O.havaZiplama; o.padT = 0; o.poz = 0.45; olay.push('cift'); }
  }
  o.vy -= O.yercekimi * dt;
  if (o.poz > 0) o.poz -= dt;

  const oncekiYerde = o.yerde;
  const yol = Math.max(Math.abs(o.vx), Math.abs(o.vy), Math.abs(o.vz)) * dt, n = Math.max(1, Math.ceil(yol / 0.3)), h = dt / n;
  o.yerde = false;
  for (let i = 0; i < n; i++) {
    eksen(o, 0, o.vx * h, oncekiYerde || o.yerde);
    eksen(o, 2, o.vz * h, oncekiYerde || o.yerde);
    const ny = o.y + o.vy * h, c = carpisan(o.x, ny, o.z);
    if (c.length) {
      if (o.vy <= 0) { o.y = Math.max(...c.map(k => k.b[1])); if (!o.yerde && !oncekiYerde) olay.push('kon'); o.yerde = true; }
      else o.y = Math.min(...c.map(k => k.a[1])) - H - EPS;
      o.vy = 0;
    } else o.y = ny;
  }
  // Merdiven inişi: yerdeyken basamak kadar aşağıda zemin varsa yapış (zıplamadıysa).
  if (!o.yerde && oncekiYerde && o.vy <= 0 && !g.zipla) {
    for (let d = 0.05; d <= O.basamak + 0.01; d += 0.05) if (carpisan(o.x, o.y - d, o.z).length) { const c = carpisan(o.x, o.y - d, o.z); o.y = Math.max(...c.map(k => k.b[1])); o.yerde = true; o.vy = 0; break; }
  }
  if (o.yerde) { o.havaHak = O.havaZiplamaSayisi; o.padT = 0; }
  if (o.yerde) for (const p of HARITA.padler) if (Math.abs(o.x - p.x) < p.r && Math.abs(o.z - p.z) < p.r && Math.abs(o.y - p.y) < 0.3) { padFirlat(o, p); olay.push('pad'); break; }
  if (o.y < -30) { o.y = 1; o.vy = 0; }
  return olay;
}

export function padFirlat(o, p) {
  const T = p.sure, [hx, hy, hz] = p.hedef;
  o.vx = (hx - o.x) / T; o.vz = (hz - o.z) / T; o.vy = (hy - o.y + 0.5 * O.yercekimi * T * T) / T + 0.6;
  o.yerde = false; o.padT = T * 0.85;
}

/** Tek eksende kayma; yerdeyken basamağa çıkar. e: 0 x, 2 z. */
function eksen(o, e, d, yerde) {
  if (!d) return;
  const p = [o.x, o.y, o.z]; p[e] += d;
  const c = carpisan(p[0], p[1], p[2]);
  if (!c.length) { o.x = p[0]; o.z = p[2]; return; }
  if (yerde) {
    const ust = Math.max(...c.map(k => k.b[1]));
    if (ust - o.y <= O.basamak + EPS && !carpisan(p[0], ust + EPS, p[2]).length) { o.x = p[0]; o.z = p[2]; o.y = ust; return; }
  }
  // Yüzeye yasla
  if (d > 0) p[e] = Math.min(...c.map(k => k.a[e])) - R - EPS; else p[e] = Math.max(...c.map(k => k.b[e])) + R + EPS;
  if (!carpisan(p[0], p[1], p[2]).length) { o.x = p[0]; o.z = p[2]; }
  if (e === 0) o.vx = 0; else o.vz = 0;
}

/** Işın–kutu (slab). Dönen: giriş mesafesi ya da Infinity. */
export function isinKutu(ox, oy, oz, dx, dy, dz, a, b, enCok = Infinity) {
  let t0 = 0, t1 = enCok;
  const o = [ox, oy, oz], d = [dx, dy, dz];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) { if (o[i] < a[i] || o[i] > b[i]) return Infinity; continue; }
    let ta = (a[i] - o[i]) / d[i], tb = (b[i] - o[i]) / d[i]; if (ta > tb) [ta, tb] = [tb, ta];
    if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) return Infinity;
  }
  return t0;
}
/** Haritaya ilk çarpma mesafesi (yön birim vektör). */
export function isinHarita(ox, oy, oz, dx, dy, dz, enCok = 500) {
  let en = enCok;
  for (const k of HARITA.carpanlar) { const t = isinKutu(ox, oy, oz, dx, dy, dz, k.a, k.b, en); if (t < en) en = t; }
  return en;
}
/** Oyuncu vuruş kutuları: gövde ve kafa (ayak noktasından). */
export function vurusKutulari(x, y, z) {
  return {
    govde: [[x - 0.34, y, z - 0.34], [x + 0.34, y + O.kafa, z + 0.34]],
    kafa: [[x - 0.25, y + O.kafa, z - 0.25], [x + 0.25, y + O.boy + 0.05, z + 0.25]],
  };
}
/** a'dan b'ye görüş var mı (iki göz/hedef noktası). */
export function gorur(a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], d = Math.hypot(dx, dy, dz);
  if (d < 1e-6) return true;
  return isinHarita(a[0], a[1], a[2], dx / d, dy / d, dz / d, d) >= d - 0.05;
}
/** Bakış yönü (yaw, pitch → birim vektör). Kamera −z'ye bakar. */
export function bakis(yaw, pitch) { const c = Math.cos(pitch); return [-Math.sin(yaw) * c, Math.sin(pitch), -Math.cos(yaw) * c]; }

/** Tohumlu rastgele (pompalı saçmaları istemcide ve sunucuda aynı çıksın). */
export function tohumlu(t) { return () => { t |= 0; t = t + 0x6D2B79F5 | 0; let r = Math.imul(t ^ t >>> 15, 1 | t); r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r; return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }
/** Yönü koni içinde saptır (sacilma radyan). */
export function saptir(d, sacilma, r) {
  if (!sacilma) return d;
  const [dx, dy, dz] = d, ux = Math.abs(dy) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let px = dy * ux[2] - dz * ux[1], py = dz * ux[0] - dx * ux[2], pz = dx * ux[1] - dy * ux[0]; const pl = Math.hypot(px, py, pz); px /= pl; py /= pl; pz /= pl;
  const qx = dy * pz - dz * py, qy = dz * px - dx * pz, qz = dx * py - dy * px;
  const a = r() * Math.PI * 2, m = Math.sqrt(r()) * sacilma, ca = Math.cos(a) * m, sa = Math.sin(a) * m;
  const x = dx + px * ca + qx * sa, y = dy + py * ca + qy * sa, z = dz + pz * ca + qz * sa, l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}
