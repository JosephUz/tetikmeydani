// Faz 65: Dış Mahalle (Tetik Meydanı'nın Juland'daki yeri). Son Plaka'nın altındaki düz alan kuzeye ve batıya büyüdü:
// 96×102 blokluk, duvarla çevrili bir mahalle. Batıda Polis'in karakolu, doğuda Kartel'in deposu, tam ortada dört kapılı
// kalpazan evi (çalınan çuvallar kalpazanın yanında); arada içine girilen, camlarından ateş edilen evler ve sokaklar.
// Tek tanım iki yere gider: dunya.js bunları Juland bloğu olarak koyar (herkes görür, çarpar), Tetik'in mahalle haritası
// (tetikmeydani/haritalar/mahalle.js) aynı kutulardan çarpışma kutusu kurar: maçtaki oyuncu, bot ve Juland'dan yürüyen aynı
// duvarlara çarpar. Cam: Juland'da geçilmez, Tetik'te mermi geçer (pencereden ateş).
// Koordinat: hücre (i, j) mahallenin merkezinden; y = 0 zeminin üstündeki ilk katman (Juland'da zemin + 1). Batı yarısı elle
// yazılır, doğu yarısı x'te aynalanır (iki taraf eşit), kuzeydeki evler z'de aynalanır.
import { B, BLOK } from './bloklar.js';

/** Hücre sınırı (dahil). Dünyada merkez dunya.js MAHALLE_MERKEZ. */
export const MAHALLE = { x0: -48, z0: -51, x1: 47, z1: 50 };

const hucre = new Map(), zemin = new Map(); // "x,y,z" → blok (0: boşalt); "x,z" → zemin katmanı bloğu
const ac = (x, y, z) => `${x},${y},${z}`;
function kutu(x0, y0, z0, x1, y1, z1, t) {
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
    if (t) hucre.set(ac(x, y, z), t); else hucre.delete(ac(x, y, z));
  }
}
function zem(x0, z0, x1, z1, t) { for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) zemin.set(`${x},${z}`, t); }

// Aynalı çizici: mx x'i (−1 − x), mz z'yi çevirir. Bütün yazım bunun üstünden.
const cizici = (mx, mz) => {
  const X = x => mx ? -1 - x : x, Zz = z => mz ? -1 - z : z;
  return {
    kutu: (x0, y0, z0, x1, y1, z1, t) => kutu(X(x0), y0, Zz(z0), X(x1), y1, Zz(z1), t),
    zem: (x0, z0, x1, z1, t) => zem(X(x0), Zz(z0), X(x1), Zz(z1), t),
    X, Z: Zz, mx, mz,
  };
};

/**
 * Ev: köşeleri kütük, camlı pencereler (zeminde 1. katman, üst katta 5.), büyük kapı (kapiEn geniş, 3 yüksek), basamaklı kırma çatı
 * (mahya x boyunca). kat 2: 3. katmanda döşeme, içeride kuzey duvarı boyunca merdiven (üç basamak, üstü boşluk).
 * kapilar: 's' 'n' 'e' 'w' (güney z1, kuzey z0, doğu x1, batı x0). Çizici c ile (aynalanmış olabilir).
 */
function ev(c, { x0, z0, x1, z1, kat = 1, duvar = B.SIVA, kapilar = ['s'], bant = null, ici = null, kapiEn = 3 }) {
  const k = c.kutu, ust = kat === 2 ? 6 : 3;
  k(x0, 0, z0, x1, ust, z1, duvar);
  k(x0 + 1, 0, z0 + 1, x1 - 1, ust, z1 - 1, 0);
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) k(x, 0, z, x, ust, z, B.KUTUK);
  if (bant) { k(x0, 2, z0, x1, 2, z0, bant); k(x0, 2, z1, x1, 2, z1, bant); k(x0, 2, z0, x0, 2, z1, bant); k(x1, 2, z0, x1, 2, z1, bant); }
  c.zem(x0 + 1, z0 + 1, x1 - 1, z1 - 1, B.TAHTA);
  // Kapılar: duvarın ortasında kapiEn hücre, üç katman yüksek (üstünde lento ya da döşeme kalır).
  const kapiHucre = {}, ka = Math.floor((kapiEn - 1) / 2), kb = kapiEn - 1 - ka;
  for (const y of kapilar) {
    if (y === 's' || y === 'n') { const z = y === 's' ? z1 : z0, m = Math.floor((x0 + x1) / 2); k(m - ka, 0, z, m + kb, 2, z, 0); kapiHucre[y] = m; }
    else { const x = y === 'e' ? x1 : x0, m = Math.floor((z0 + z1) / 2); k(x, 0, m - ka, x, 2, m + kb, 0); kapiHucre[y] = m; }
  }
  // Pencereler: köşeden bir boşluk, iki geniş, aralarında iki dolu; kapının çevresi boş kalır.
  const katmanlar = kat === 2 ? [1, 5] : [1];
  const sira = (a, b, kapi, koy) => { for (let u = a + 2; u + 1 <= b - 2; u += 4) for (const y of katmanlar) { if (y === 1 && kapi != null && u + 1 >= kapi - ka - 1 && u <= kapi + kb + 1) continue; koy(u, y); } };
  sira(x0, x1, kapiHucre.s, (u, y) => k(u, y, z1, u + 1, y, z1, B.CAM));
  sira(x0, x1, kapiHucre.n, (u, y) => k(u, y, z0, u + 1, y, z0, B.CAM));
  sira(z0, z1, kapiHucre.e, (u, y) => k(x1, y, u, x1, y, u + 1, B.CAM));
  sira(z0, z1, kapiHucre.w, (u, y) => k(x0, y, u, x0, y, u + 1, B.CAM));
  if (kat === 2) {
    // Döşeme ve merdiven: kuzey iç duvarı boyunca (z0+1, z0+2), batıdan doğuya yükselir; üstündeki döşeme açık.
    k(x0 + 1, 3, z0 + 1, x1 - 1, 3, z1 - 1, B.TAHTA);
    for (let i = 0; i < 3; i++) k(x0 + 1 + i, 0, z0 + 1, x0 + 1 + i, i, z0 + 2, B.TAHTA);
    k(x0 + 1, 3, z0 + 1, x0 + 3, 3, z0 + 2, 0);
    k(x0 + 1, 4, z0 + 3, x0 + 3, 4, z0 + 3, B.KUTUK); // merdiven boşluğunun korkuluğu (düşmesin, siper)
  }
  // Çatı: her basamak bir katman yukarı, iki yandan içeri; uçlar duvar renginde.
  for (let i = 0; z0 - 1 + i <= z1 + 1 - i; i++) {
    const y = ust + 1 + i;
    k(x0 - 1, y, z0 - 1 + i, x1 + 1, y, z0 - 1 + i, B.KIREMIT); k(x0 - 1, y, z1 + 1 - i, x1 + 1, y, z1 + 1 - i, B.KIREMIT);
    if (z0 + i <= z1 - i) { k(x0, y, z0 + i, x0, y, z1 - i, duvar); k(x1, y, z0 + i, x1, y, z1 - i, duvar); }
  }
  ici?.(k);
}

// Ağaç: kütük ve yaprak (yaprak Juland'da da Tetik'te de geçilir, görüşü kesmez).
function agac(c, x, z) { c.kutu(x, 0, z, x, 3, z, B.KUTUK); c.kutu(x - 1, 3, z - 1, x + 1, 4, z + 1, B.YAPRAK); c.kutu(x, 5, z, x, 5, z, B.YAPRAK); c.kutu(x, 3, z, x, 4, z, B.KUTUK); }
// Araba: dört hücre boyunda, iki geniş; gövde takım renginde, üstte camlı kabin (siper).
function araba(c, x, z, renk) { c.kutu(x, 0, z, x + 3, 0, z + 1, renk); c.kutu(x + 1, 1, z, x + 2, 1, z + 1, B.CAM); c.kutu(x, 0, z, x, 0, z, B.KAYA); c.kutu(x + 3, 0, z + 1, x + 3, 0, z + 1, B.KAYA); }

// ——— Çizim ———
const { x0: MX0, z0: MZ0, x1: MX1, z1: MZ1 } = MAHALLE;
// Zemin: çim (Juland'ın kendi zemini), sokaklar kaldırım, meydan taş.
zem(-32, -2, 31, 1, B.YOL); // ana cadde (karakoldan depoya)
for (const z of [-27, 24]) zem(MX0 + 1, z, MX1 - 1, z + 2, B.YOL); // yan caddeler
for (const x of [-28, 25]) zem(x, MZ0 + 1, x + 2, MZ1 - 1, B.YOL); // kuzey–güney sokakları
zem(-2, MZ0 + 1, 1, MZ1 - 1, B.YOL); // orta sokak
zem(-7, -7, 6, 6, B.TAS);

// Çevre duvarı: dört yüksek taş, üstü tuğla; kapılar yalnız batı yarısında (doğu Kartel'in arkası: çuvalı getiren polisin
// tarafından girer). Batıda iki, kuzeyde ve güneyde birer kapı (yan cadde ve sokak duvara vardığı yerde).
kutu(MX0, 0, MZ0, MX1, 3, MZ0, B.TAS); kutu(MX0, 0, MZ1, MX1, 3, MZ1, B.TAS); kutu(MX0, 0, MZ0, MX0, 3, MZ1, B.TAS); kutu(MX1, 0, MZ0, MX1, 3, MZ1, B.TAS);
kutu(MX0, 3, MZ0, MX1, 3, MZ0, B.TUGLA); kutu(MX0, 3, MZ1, MX1, 3, MZ1, B.TUGLA); kutu(MX0, 3, MZ0, MX0, 3, MZ1, B.TUGLA); kutu(MX1, 3, MZ0, MX1, 3, MZ1, B.TUGLA);
for (let x = MX0; x <= MX1; x += 8) { kutu(x, 0, MZ0, x, 4, MZ0, B.KUTUK); kutu(x, 0, MZ1, x, 4, MZ1, B.KUTUK); }
for (let z = MZ0; z <= MZ1; z += 8) { kutu(MX0, 0, z, MX0, 4, z, B.KUTUK); kutu(MX1, 0, z, MX1, 4, z, B.KUTUK); }
export const MAHALLE_KAPILARI = [[MX0, -27, 'x'], [MX0, 24, 'x'], [-28, MZ0, 'z'], [-28, MZ1, 'z']]; // [x, z, eksen boyunca açılan]
for (const [x, z, e] of MAHALLE_KAPILARI) { if (e === 'x') kutu(x, 0, z, x, 4, z + 2, 0); else kutu(x, 0, z, x + 2, 4, z, 0); zem(e === 'x' ? x : x, e === 'x' ? z : z, e === 'x' ? x : x + 2, e === 'x' ? z + 2 : z, B.YOL); }

// Kalpazan evi: tam ortada, dört yana dört geniş kapı (her yandan girilir); içeride köşelerde hazine sandıkları (siper),
// kalpazan ortada, çuvallar yanında. İki tarafın tam arasında: çuvalı getiren çatışmanın göbeğine girer.
ev(cizici(false, false), { x0: -5, z0: -5, x1: 4, z1: 4, duvar: B.TUGLA, kapilar: ['n', 's', 'e', 'w'], kapiEn: 4, bant: B.SARI,
  ici: k => { for (const [x, z] of [[-4, -4], [3, -4], [-4, 3], [3, 3]]) k(x, 0, z, x, 1, z, B.HAZINE); } });
kutu(-1, 9, -1, 0, 9, 0, B.FENER); // mahyada fener: uzaktan seçilir

// Bir taraf (Polis batı, Kartel doğu: x aynası). Karakol / depo ve iki yarıdaki (kuzey, güney: z aynası) evler.
function taraf(mx) {
  const t = cizici(mx, false), polis = !mx, renk = polis ? B.MAVI : B.KIRMIZI;
  // Merkez yapı: iki katlı, orta caddeye (merkeze) ve arka avluya kapılı. Polis'te sıva + mavi bant (karakol), Kartel'de
  // tahta + kırmızı bant (depo).
  ev(t, { x0: -42, z0: -8, x1: -33, z1: 7, kat: 2, duvar: polis ? B.SIVA : B.TAHTA, kapilar: ['e', 'w'], bant: renk });
  t.kutu(-38, 16, -1, -37, 16, 0, renk); // çatının mahyasında tepe lambası (polis mavi, kartel kırmızı)
  if (polis) { t.kutu(-36, 0, 4, -35, 0, 5, B.MASA); t.kutu(-41, 4, 4, -40, 4, 5, B.KITAPLIK); }
  else { t.kutu(-41, 0, -4, -40, 0, -3, B.HAZINE); t.kutu(-41, 0, 5, -41, 1, 6, B.HAZINE); t.kutu(-36, 4, 4, -35, 4, 5, B.HAZINE); }
  // Arka avlu: alçak duvar ve yığılmış sandıklar.
  t.kutu(-46, 0, -12, -46, 0, -9, B.TAS); t.kutu(-46, 0, 8, -46, 0, 11, B.TAS);
  t.kutu(-45, 0, 0, -45, 1, 0, B.TAHTA);
  araba(t, -36, -13, renk); araba(t, -36, 11, renk);
  for (const mz of [false, true]) yarim(cizici(mx, mz));
}
// Bir çeyrek (batı yarısının kuzeyi; güneyi z aynası): dört ev, ağaç, kuyu, siperler.
function yarim(c) {
  ev(c, { x0: -23, z0: -14, x1: -14, z1: -6, kat: 2, duvar: B.TUGLA, kapilar: ['s', 'e'], ici: k => { k(-21, 4, -9, -20, 4, -8, B.YATAK); k(-16, 0, -10, -16, 0, -9, B.MASA); } });
  ev(c, { x0: -10, z0: -22, x1: -4, z1: -16, duvar: B.SIVA, kapilar: ['e', 's'], ici: k => k(-9, 0, -21, -8, 1, -21, B.KITAPLIK) });
  ev(c, { x0: -22, z0: -45, x1: -13, z1: -37, kat: 2, duvar: B.SIVA, kapilar: ['s'], ici: k => k(-15, 4, -42, -14, 4, -41, B.YATAK) });
  ev(c, { x0: -10, z0: -48, x1: -4, z1: -42, duvar: B.TUGLA, kapilar: ['e', 's'] });
  ev(c, { x0: -44, z0: -23, x1: -37, z1: -17, duvar: B.TAHTA, kapilar: ['s', 'e'] });
  ev(c, { x0: -45, z0: -47, x1: -36, z1: -39, kat: 2, duvar: B.TUGLA, kapilar: ['e', 's'] });
  // Bahçe duvarları, sandıklar, el arabası: açık alanda siper.
  c.kutu(-12, 0, -9, -6, 0, -9, B.TAS); c.kutu(-19, 0, -20, -19, 1, -20, B.TAHTA); c.kutu(-18, 0, -20, -18, 0, -20, B.TAHTA);
  c.kutu(-24, 0, -33, -20, 0, -33, B.TAS); c.kutu(-33, 0, -21, -33, 0, -17, B.TAS);
  c.kutu(-11, 0, -31, -10, 0, -30, B.TAHTA); c.kutu(-11, 1, -31, -11, 1, -31, B.TAHTA);
  agac(c, -8, -34); agac(c, -31, -45); agac(c, -17, -30); agac(c, -46, -30);
  // Kuyu: taş halka, ortası boş.
  c.kutu(-33, 0, -35, -31, 0, -33, B.TAS); c.kutu(-32, 0, -34, -32, 0, -34, 0);
}
taraf(false); taraf(true);

// ——— Çıktı: aynı türden bitişik hücreler büyük kutulara birleşir (önce x, sonra z, sonra y) ———
function birlestir() {
  const l = [], al = (x, y, z) => hucre.get(ac(x, y, z)) ?? 0, bitti = new Set();
  const anahtarlar = [...hucre.keys()].map(s => s.split(',').map(Number)).sort((a, b) => a[1] - b[1] || a[2] - b[2] || a[0] - b[0]);
  for (const [x, y, z] of anahtarlar) {
    if (bitti.has(ac(x, y, z))) continue;
    const t = al(x, y, z), uygun = (a, b, c) => al(a, b, c) === t && !bitti.has(ac(a, b, c));
    let x1 = x; while (uygun(x1 + 1, y, z)) x1++;
    let z1 = z; for (;;) { let tam = true; for (let i = x; i <= x1; i++) if (!uygun(i, y, z1 + 1)) { tam = false; break; } if (!tam) break; z1++; }
    let y1 = y; for (;;) { let tam = true; for (let k = z; k <= z1 && tam; k++) for (let i = x; i <= x1; i++) if (!uygun(i, y1 + 1, k)) { tam = false; break; } if (!tam) break; y1++; }
    for (let a = y; a <= y1; a++) for (let b = z; b <= z1; b++) for (let i = x; i <= x1; i++) bitti.add(ac(i, a, b));
    l.push({ a: [x, y, z], b: [x1 + 1, y1 + 1, z1 + 1], t });
  }
  return l;
}
/** Mahallenin blokları: { a, b (hariç uç), t (blok) }; y = 0 zeminin üstündeki ilk katman. */
export const MAHALLE_KUTULARI = birlestir();
/** Zemin katmanı (Juland'da zemin bloğunun kendisi): [x, z, blok]. */
export const MAHALLE_ZEMIN = [...zemin].map(([k, t]) => { const [x, z] = k.split(',').map(Number); return [x, z, t]; });
// Haritada (M) sütunun en üstteki bloğu ve yüksekliği (y katmanı; yoksa zemin katmanı, h −1).
const UST = new Map();
for (const [k, t] of hucre) { const [x, y, z] = k.split(',').map(Number), a = `${x},${z}`, u = UST.get(a); if (!u || y > u.h) UST.set(a, { t, h: y }); }
export const mahalleUst = (x, z) => UST.get(`${x},${z}`) ?? (zemin.has(`${x},${z}`) ? { t: zemin.get(`${x},${z}`), h: -1 } : null);
/** Tetik'te çarpar mı: katı bloklar; cam mermiyi geçirir. */
export const mahalleCarpar = t => BLOK[t].kati && t !== B.CAM;

// Yerler (mahalle koordinatı): kalpazan ortadaki evin ortasında, batıya (Polis'in tarafına, çuvalın geldiği yöne) bakar;
// çuvallar yanında.
export const MAHALLE_YERLER = {
  kalpazan: { x: 0, z: 0, yaw: Math.PI / 2 }, // yaw: modelin dönüşü (π/2: batıya bakar)
  cuvallar: { x: 1.8, z: 1.8 },
  karakol: { x: -37.5, z: -0.5 }, depo: { x: 37, z: -0.5 }, kalpazanEvi: { x: 0, z: 0 },
};
