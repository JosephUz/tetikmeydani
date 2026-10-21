// Harita kaydı. Etkin harita H canlı bir bağdır: fizik, yol ağı ve görünüm onu okur. Tek harita: Dış Mahalle (Juland'ın
// Tetik Meydanı haritası). Eski haritalar (Meydan, Buz Dünyası, Çöl Kasabası) kalktı.
// Çarpan kutular IZ×IZ'lik sütunlara dizinlenir (mahallede iki bine yakın kutu var): çarpışma ve ışın yalnız yakındaki
// kutulara bakar; çok büyük kutular (zemin, sınır) her sorguda.
import mahalle from './haritalar/mahalle.js';

export const IZ = 4;
export const izAnahtar = (i, j) => (i + 1000) * 2000 + (j + 1000);
function izgaraKur(carpanlar) {
  const buyuk = [], hucre = new Map();
  for (const k of carpanlar) {
    const i0 = Math.floor(k.a[0] / IZ), i1 = Math.floor((k.b[0] - 1e-6) / IZ), j0 = Math.floor(k.a[2] / IZ), j1 = Math.floor((k.b[2] - 1e-6) / IZ);
    if ((i1 - i0 + 1) * (j1 - j0 + 1) > 48) { buyuk.push(k); continue; }
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const a = izAnahtar(i, j); (hucre.get(a) ?? hucre.set(a, []).get(a)).push(k); }
  }
  return { buyuk, hucre, damga: 0 };
}
function hazirla(h) {
  const kutular = h.kutular.map((k, i) => ({ carp: true, ...k, no: i })), carpanlar = kutular.filter(k => k.carp), izgara = izgaraKur(carpanlar);
  /** x0..x1, z0..z1 dikdörtgenine değebilecek çarpan kutular (fazlası olabilir, eksiği olmaz). */
  const sorgu = (x0, z0, x1, z1) => {
    const d = ++izgara.damga, l = [...izgara.buyuk];
    for (let i = Math.floor(x0 / IZ); i <= Math.floor(x1 / IZ); i++) for (let j = Math.floor(z0 / IZ); j <= Math.floor(z1 / IZ); j++) {
      const h = izgara.hucre.get(izAnahtar(i, j)); if (h) for (const k of h) if (k._d !== d) { k._d = d; l.push(k); }
    }
    return l;
  };
  return { ...h, kutular, carpanlar, izgara, sorgu };
}
export const HARITALAR = Object.fromEntries([mahalle].map(h => [h.id, hazirla(h)]));
export const HARITA_SIRASI = ['mahalle'];
export const VARSAYILAN = 'mahalle';

export let H = HARITALAR[VARSAYILAN];
export function haritaKullan(id) { H = HARITALAR[id] ?? HARITALAR[VARSAYILAN]; return H; }
