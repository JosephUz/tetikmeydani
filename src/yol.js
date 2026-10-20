// Botlar için yol ağı: haritadan kendiliğinden çıkar (1 blokluk hücreler, her hücrede basılabilir her yükseklik bir düğüm).
// Kenarlar: komşu hücreye yürüme (en çok iki basamak yukarı, aşağısı serbest: düşer), zıplatma taşından hedefine.
import { H } from './harita.js';
import { bosMu } from './fizik.js';

const AGLAR = new Map(); // harita kimliği → yol ağı

export function yolAgi() {
  if (AGLAR.has(H.id)) return AGLAR.get(H.id);
  const [sx0, sz0, sx1, sz1] = H.sinir;
  const dugum = [], hucre = new Map(); // "i,j" → düğüm no listesi
  for (let i = Math.floor(sx0); i < sx1; i++) for (let j = Math.floor(sz0); j < sz1; j++) {
    const x = i + 0.5, z = j + 0.5, ustler = new Set();
    for (const k of H.carpanlar) if (x + 0.38 > k.a[0] && x - 0.38 < k.b[0] && z + 0.38 > k.a[2] && z - 0.38 < k.b[2]) ustler.add(+k.b[1].toFixed(3));
    const l = [];
    for (const y of ustler) if (y >= 0 && y < 13 && bosMu(x, y + 0.02, z)) { l.push(dugum.length); dugum.push({ x, y, z, i, j, k: [] }); }
    if (l.length) hucre.set(i + ',' + j, l);
  }
  for (const d of dugum) for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) {
    if (!di && !dj) continue;
    const uzak = Math.abs(di) === 2 || Math.abs(dj) === 2; // iki hücre öteye yalnız düşülür (platform kenarı)
    const l = hucre.get((d.i + di) + ',' + (d.j + dj)); if (!l) continue;
    for (const n of l) {
      const e = dugum[n], fark = e.y - d.y;
      if (fark > 1.3 || fark < -9 || (uzak && fark > -1)) continue; // 0,6 üstü zıplanarak çıkılır (bot zıplar)
      const ust = Math.max(d.y, e.y) + 0.02;
      if (!bosMu((d.x + e.x) / 2, ust, (d.z + e.z) / 2)) continue;
      if (uzak ? !bosMu(d.x + di / 4, ust, d.z + dj / 4) || !bosMu(d.x + di * 0.75, ust, d.z + dj * 0.75) : di && dj && (!bosMu(d.x + di, ust, d.z) || !bosMu(d.x, ust, d.z + dj))) continue;
      // Düşüş: hedef sütunu yukarıdan aşağı boş olmalı (platformun altındaki zemine "içinden" inilmez).
      let dolu = false; for (let y = e.y + 0.5; y < d.y; y += 0.5) if (!bosMu(e.x, y, e.z)) { dolu = true; break; }
      if (dolu) continue;
      d.k.push([n, Math.hypot(di, dj, Math.max(0, fark)) + (fark < -1 ? 1 : 0)]);
    }
  }
  const yakin = (x, y, z) => {
    let en = -1, eu = Infinity;
    for (let r = 0; r <= 3 && en < 0; r++) for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) {
      const l = hucre.get((Math.floor(x) + di) + ',' + (Math.floor(z) + dj)); if (!l) continue;
      for (const n of l) { const d = dugum[n], u = Math.hypot(d.x - x, (d.y - y) * 3, d.z - z) + (d.y > y + 1.1 ? 20 : 0); if (u < eu) { eu = u; en = n; } }
    }
    return en;
  };
  for (const p of H.padler) {
    const a = yakin(p.x, p.y, p.z), b = yakin(p.hedef[0], p.hedef[1], p.hedef[2]);
    if (a >= 0 && b >= 0) { dugum[a].pad = p; dugum[a].k.push([b, 3]); }
  }
  // Ulaşılabilir düğümler (bir doğuş yerinden): botlar gezinti hedefini bunlardan seçer (baca tepesi gibi yerler dışarıda).
  const ulas = new Set(), kuyruk = [yakin(H.doguslar[0].x, H.doguslar[0].y, H.doguslar[0].z)];
  while (kuyruk.length) { const n = kuyruk.pop(); if (n < 0 || ulas.has(n)) continue; ulas.add(n); for (const [m] of dugum[n].k) if (!ulas.has(m)) kuyruk.push(m); }
  const ag = { dugum, yakin, gezinti: [...ulas] };
  AGLAR.set(H.id, ag);
  return ag;
}

/** A*: düğüm no listesi (başlangıç hariç) ya da null. */
export function yolBul(bas, son) {
  const { dugum } = yolAgi(); if (bas < 0 || son < 0) return null;
  if (bas === son) return [];
  const g = new Map([[bas, 0]]), once = new Map(), acik = [[0, bas]], kapali = new Set(), H = n => Math.hypot(dugum[n].x - dugum[son].x, dugum[n].y - dugum[son].y, dugum[n].z - dugum[son].z);
  let say = 0;
  while (acik.length && say++ < 12000) {
    const [, n] = yigindanAl(acik);
    if (n === son) { const l = []; let c = n; while (c !== bas) { l.push(c); c = once.get(c); } return l.reverse(); }
    if (kapali.has(n)) continue; kapali.add(n);
    for (const [m, c] of dugum[n].k) {
      const ng = g.get(n) + c;
      if (ng < (g.get(m) ?? Infinity)) { g.set(m, ng); once.set(m, n); yiginaKoy(acik, [ng + H(m), m]); }
    }
  }
  return null;
}
function yiginaKoy(h, v) { h.push(v); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } }
function yigindanAl(h) {
  const ust = h[0], son = h.pop();
  if (h.length) { h[0] = son; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } }
  return ust;
}
