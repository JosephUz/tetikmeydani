// Meydan haritası (Tetik Meydanı'nın kendi haritası): 72×72 blok kasaba meydanı. Bir çeyrek elle yazılır, merkez çevresinde dört kez 90° döndürülür
// (her köşe eşit: aynı merdiven, köprü, zıplatma ve doğuş yerleri). Kutu: a (en küçük köşe), b (en büyük köşe).
// carp:false olanlar yalnız görünür (su). Birim blok; y yukarı, zemin y = 0.

const Y = 36; // yarı genişlik
const BINA_RENK = ['#d9c9a3', '#c9805e', '#d8b56a', '#9fb1b4'];

/** Bir çeyreğin (kuzeybatı: x < 0, z < 0) parçaları. k: çeyrek no (renk için). */
function ceyrek(k) {
  const l = [], kutu = (x0, y0, z0, x1, y1, z1, renk, ek = {}) => l.push({ a: [x0, y0, z0], b: [x1, y1, z1], renk, ...ek });
  const bina = BINA_RENK[k];
  // Köşe binası (çatı y = 7) + saçak şeridi
  kutu(-34, 0, -34, -20, 7, -20, bina);
  // Saçağın üstü çatıdan alçak: aynı yükseklikte iki yüz üst üste binince pırpırlar (z-fighting).
  kutu(-34.2, 6.6, -34.2, -19.8, 6.9, -19.8, '#7c5a44', { kenar: true });
  // Pencere ve kapı izleri (binanın içine gömülü değil, dışına 0,05 taşar: yalnız görünür)
  for (const x of [-31, -27, -23]) { kutu(x, 1.8, -20.07, x + 1.6, 3.4, -19.93, '#3a4048', { carp: false }); kutu(x, 4.4, -20.07, x + 1.6, 5.8, -19.93, '#3a4048', { carp: false }); }
  for (const z of [-31, -27, -23]) { kutu(-20.07, 4.4, z, -19.93, 5.8, z + 1.6, '#3a4048', { carp: false }); }
  kutu(-20.07, 0, -32, -19.93, 2.6, -30, '#5a3a24', { carp: false });
  // Çatıda doğu kenarı korkuluğu (köprü ağzı açık)
  kutu(-20.8, 7, -34, -20, 7.95, -24, '#a89f8c');
  // Çatı üstünde baca: siper
  kutu(-30, 7, -30, -28, 9.2, -28, '#8a7a68');
  // Merdiven: binanın güney yüzünde, iç köşeden batıya tırmanır (14 basamak, 0,5 yükseklik, 0,9 derinlik)
  for (let i = 0; i < 14; i++) { const x1 = -20.4 - i * 0.9; kutu(x1 - 0.9, 0, -20, x1, (i + 1) * 0.5, -17.6, i % 2 ? '#a89f8c' : '#b4ab97'); }
  kutu(-34, 0, -20, -33, 7, -17.6, '#a89f8c'); // merdiven başı sahanlığı
  // Kuzey köprüsü: bu binanın iç köşesinden karşı binaya (z −23,5…−20,5, üstü y 7); merdivenin alçak ucunun üstünden geçer
  kutu(-20, 6.55, -23.5, 20, 7, -20.5, '#8a6238');
  for (const x of [-20, -10, 0, 10]) { kutu(x + 0.4, 7, -23.6, x + 0.6, 7.7, -23.4, '#5a3a24'); kutu(x + 0.4, 7, -20.6, x + 0.6, 7.7, -20.4, '#5a3a24'); }
  kutu(-20, 7.6, -23.62, 20, 7.75, -23.45, '#6b4a28'); kutu(-20, 7.6, -20.55, 20, 7.75, -20.38, '#6b4a28');
  for (const x of [-6.4, 5.6]) kutu(x, 0, -22.7, x + 0.8, 6.55, -21.3, '#a89f8c'); // köprü ayakları
  // Köprünün dışında pazar tezgâhı (alçak siper)
  kutu(-15, 0, -28, -11.5, 1.15, -26.8, '#9a6b3a'); kutu(-15.1, 2.4, -28.4, -11.4, 2.55, -26.4, '#c7442f', { carp: false });
  for (const [x, z] of [[-15, -28.4], [-11.6, -28.4], [-15, -26.5], [-11.6, -26.5]]) kutu(x, 1.15, z, x + 0.12, 2.4, z + 0.12, '#5a3a24', { carp: false });
  // Çeşme ile bina arası: uzun duvar (yüksek siper), sandık yığınları (zıplanır siper), alçak duvar
  kutu(-15, 0, -12.6, -8, 3.2, -11.8, '#b9ad94');
  kutu(-12.8, 0, -7.2, -11.2, 1.25, -5.6, '#9a6b3a'); kutu(-12.6, 1.25, -7, -11.4, 2.45, -5.8, '#8a5e33');
  kutu(-7.4, 0, -16.6, -5.8, 1.25, -15, '#9a6b3a');
  kutu(-26, 0, -12.5, -22.5, 1.1, -11.9, '#a89f8c');
  // Çeşme havuzunun bu köşesi (L biçimli kenar)
  kutu(-5.2, 0, -5.2, 0, 0.5, -4.6, '#c9c2b0'); kutu(-5.2, 0, -4.6, -4.6, 0.5, 0, '#c9c2b0');
  kutu(-4.6, 0, -4.6, 0, 0.3, 0, '#4f8fb8', { carp: false, su: true });
  // Ardiye: dış duvar boyunca bina arkası geçidi zaten açık (x −36…−34). Köşe kuleciği:
  kutu(-36, 0, -36, -34, 9, -34, '#6f6a60');
  return l;
}

const don = ([x, y, z]) => [-z, y, x]; // merkez çevresinde 90°
function kutuDon(k) {
  const p = don(k.a), q = don(k.b);
  return { ...k, a: [Math.min(p[0], q[0]), p[1], Math.min(p[2], q[2])], b: [Math.max(p[0], q[0]), q[1], Math.max(p[2], q[2])] };
}
function dortKez(liste, donustur) { const l = []; let cur = liste; for (let i = 0; i < 4; i++) { l.push(...cur.map(c => Array.isArray(c) ? c : { ...c, ceyrek: i })); cur = cur.map(donustur); } return l; }

const ceyrekler = [];
{ let p = ceyrek(0); for (let i = 0; i < 4; i++) { const renkli = ceyrek(i); ceyrekler.push(...renkli.map((k, j) => ({ ...p[j], renk: k.renk }))); p = p.map(kutuDon); } }

const KUTULAR = [
  // Zemin: çarpışma için tek kutu (görünmez); görünüşü üst üste binmeyen parçalar (iç meydan taşı + dört kenar şeridi).
  { a: [-Y, -1, -Y], b: [Y, 0, Y], renk: '#9b9486', zemin: true, gizli: true },
  { a: [-Y, -1, -Y], b: [Y, 0, -16], renk: '#9b9486', carp: false }, { a: [-Y, -1, 16], b: [Y, 0, Y], renk: '#9b9486', carp: false },
  { a: [-Y, -1, -16], b: [-16, 0, 16], renk: '#9b9486', carp: false }, { a: [16, -1, -16], b: [Y, 0, 16], renk: '#9b9486', carp: false },
  { a: [-16, -1, -16], b: [16, 0, 16], renk: '#b5ab95', carp: false },
  { a: [-Y - 1, 0, -Y - 1], b: [Y + 1, 14, -Y], renk: '#6f6a60' }, { a: [-Y - 1, 0, Y], b: [Y + 1, 14, Y + 1], renk: '#6f6a60' },
  { a: [-Y - 1, 0, -Y], b: [-Y, 14, Y], renk: '#6f6a60' }, { a: [Y, 0, -Y], b: [Y + 1, 14, Y], renk: '#6f6a60' },
  ...ceyrekler,
  // Orta kule: ayak ve tepe platformu (roketatar burada)
  { a: [-0.8, 0, -0.8], b: [0.8, 5.5, 0.8], renk: '#c9c2b0' },
  { a: [-2.2, 5.5, -2.2], b: [2.2, 6, 2.2], renk: '#a89f8c' },
];

/** Zıplatma taşları: üstüne basan `sure` saniyede hedefe uçar. */
const PADLER = dortKez([
  { x: 0, y: 0, z: -9, r: 0.95, hedef: [0, 6, -0.6], sure: 0.95 },
  { x: -16, y: 0, z: -16, r: 0.95, hedef: [-25, 7, -25], sure: 1.3 },
], p => { const [x, , z] = don([p.x, 0, p.z]); return { ...p, x, z, hedef: don(p.hedef) }; });

/** Doğuş yerleri (yaw: merkeze bakış). */
const DOGUSLAR = dortKez([
  { x: -26, y: 0, z: -14 }, { x: -15, y: 0, z: -31 }, { x: -27, y: 7, z: -24 }, { x: -9, y: 0, z: -20 },
], d => { const [x, y, z] = don([d.x, d.y, d.z]); return { x, y, z }; }).map(d => ({ x: d.x, y: d.y, z: d.z, yaw: Math.atan2(d.x, d.z) }));

const CAN_PAKETLERI = dortKez([[0, 0, -22]], don);

export default {
  id: 'meydan', ad: 'Meydan', slogan: "Dört bina, dört köprü, bir kule.", esin: "Tetik Meydanı'nın kendi haritası",
  sinir: [-Y, -Y, Y, Y], kutular: KUTULAR, padler: PADLER, canlar: CAN_PAKETLERI, roket: [0, 6, 0],
  // Takımlı modda batı yarısı Mavi, doğu yarısı Kırmızı doğar.
  doguslar: DOGUSLAR.map(d => ({ ...d, takim: d.x < -4 ? 0 : d.x > 4 ? 1 : -1 })),
  gok: { ust: '#5d9fd0', alt: '#d8e6ea', sis: '#b9d3e0', sisUzak: 150, tepe: '#7d9a6a' },
};
