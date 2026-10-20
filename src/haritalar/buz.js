// Buz Dünyası: CS'teki fy_iceworld'den esinli kare buz arena (56×56). Ortada dört büyük buz bloğu, aralarında artı biçimli
// koridor; kuzey (Mavi) ve güney (Kırmızı) doğuş şeritleri, aralarında alçak siper duvarları. Harita x ve z eksenine
// göre aynalı. Blok tepelerine zıplatma taşlarıyla çıkılır; roketatar tam ortada.

const Y = 28, DUVAR = 8;
const l = [], kutu = (x0, y0, z0, x1, y1, z1, renk, ek = {}) => l.push({ a: [x0, y0, z0], b: [x1, y1, z1], renk, ...ek });

// Zemin: çarpışma tek kutu (görünmez), görünüş 8×8'lik iki tonlu buz karoları
kutu(-Y, -1, -Y, Y, 0, Y, '#d6ecf4', { gizli: true });
for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) kutu(-Y + i * 8, -1, -Y + j * 8, -Y + i * 8 + 8, 0, -Y + j * 8 + 8, (i + j) % 2 ? '#cfe6f0' : '#e2f2f8', { carp: false });
// Dış duvarlar ve üst pervaz
kutu(-Y - 1, 0, -Y - 1, Y + 1, DUVAR, -Y, '#8fbcd4'); kutu(-Y - 1, 0, Y, Y + 1, DUVAR, Y + 1, '#8fbcd4');
kutu(-Y - 1, 0, -Y, -Y, DUVAR, Y, '#9ac4da'); kutu(Y, 0, -Y, Y + 1, DUVAR, Y, '#9ac4da');
// Orta bloklar (yükseklik 3,5): koridor genişliği 6
for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
  const x0 = sx < 0 ? -12 : 3, z0 = sz < 0 ? -12 : 3;
  kutu(x0, 0, z0, x0 + 9, 3.5, z0 + 9, '#eef7fb');
  kutu(x0 + 0.3, 3.5, z0 + 0.3, x0 + 8.7, 3.6, z0 + 8.7, '#b8dcea'); // tepe buzu (ince)
  // Blok tepesinde, ortaya bakan köşede küçük siper
  const cx = sx < 0 ? x0 + 6.5 : x0 + 1, cz = sz < 0 ? z0 + 6.5 : z0 + 1;
  kutu(cx, 3.5, cz, cx + 1.5, 4.6, cz + 1.5, '#a9cfe0');
}
// Orta kavşakta alçak buz sütunu yok: açık alan (roketatar burada, yerde)
// Doğuş şeritleri ile orta arasında alçak siper duvarları (1,4) ve aralarda sandıklar
for (const sz of [-1, 1]) {
  kutu(-15, 0, sz * 17 - 0.5, -5, 1.4, sz * 17 + 0.5, '#a9cfe0'); kutu(5, 0, sz * 17 - 0.5, 15, 1.4, sz * 17 + 0.5, '#a9cfe0');
  for (const sx of [-1, 1]) {
    kutu(sx * 22 - 1.5, 0, sz * 22 - 1.5, sx * 22 + 1.5, 3, sz * 22 + 1.5, '#b8dcea'); // köşe bloğu
    kutu(sx * 6 - 1, 0, sz * 22 - 1, sx * 6 + 1, 1.8, sz * 22 + 1, '#cfe6f0'); // doğuş yerlerinin arasında sandık
  }
}
// Doğu ve batı kenarında uzun siper + iki küçük blok
for (const sx of [-1, 1]) {
  kutu(sx * 20 - 0.5, 0, -6, sx * 20 + 0.5, 2.2, 6, '#a9cfe0');
  kutu(sx * 25 - 1, 0, -11, sx * 25 + 1, 2, -9, '#cfe6f0'); kutu(sx * 25 - 1, 0, 9, sx * 25 + 1, 2, 11, '#cfe6f0');
}

const PADLER = [
  { x: 0, y: 0, z: -16, r: 0.95, hedef: [-7.5, 3.6, -7.5], sure: 1.0 },
  { x: 0, y: 0, z: 16, r: 0.95, hedef: [7.5, 3.6, 7.5], sure: 1.0 },
  { x: -16, y: 0, z: 0, r: 0.95, hedef: [-7.5, 3.6, 7.5], sure: 1.0 },
  { x: 16, y: 0, z: 0, r: 0.95, hedef: [7.5, 3.6, -7.5], sure: 1.0 },
];

const DOGUSLAR = [];
for (const x of [-15, -9, -3, 3, 9, 15]) { DOGUSLAR.push({ x, y: 0, z: -25.5, yaw: Math.PI, takim: 0 }); DOGUSLAR.push({ x, y: 0, z: 25.5, yaw: 0, takim: 1 }); }
for (const [x, z] of [[-23, 4], [23, -4], [-14, 0], [14, 0]]) DOGUSLAR.push({ x, y: 0, z, yaw: Math.atan2(x, z), takim: -1 });

export default {
  id: 'buz', ad: 'Buz Dünyası', slogan: "Dört buz blok, bir artı koridor.", esin: "CS fy_iceworld'den esinli",
  sinir: [-Y, -Y, Y, Y], kutular: l, padler: PADLER, doguslar: DOGUSLAR,
  canlar: [[-24, 0, 0], [24, 0, 0]], roket: [0, 0, 0],
  gok: { ust: '#86b8dc', alt: '#eef6fa', sis: '#dcebf3', sisUzak: 240 },
};
