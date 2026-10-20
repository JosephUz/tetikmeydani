// Çöl Kasabası: CS'teki de_dust2'nin yerleşiminden esinli (kendi kutu ölçeğimizde, birebir kopya değil).
// Güneyde T doğuşu (Mavi), kuzeyde CT doğuşu (Kırmızı). Doğuda uzun A yolu ve A bölgesi (yükseltilmiş platform),
// ortada orta yol ve kısa yol, batıda üstü kapalı B tünelleri ve B bölgesi. Yürünen alanlar dikdörtgenlerle
// yazılır; geri kalan her hücre duvar olur (açgözlü birleştirmeyle az sayıda kutu). x doğu, z güney (kuzey = −z).

const X0 = -40, X1 = 40, Z0 = -46, Z1 = 46, DUVAR = 9, TAVAN = 3.4;

/** Yürünen alanlar [x0, z0, x1, z1]. */
const ALAN = [
  [-14, 30, 16, 44], // T doğuşu
  [16, 32, 24, 40], // T'den uzun A'ya geçit
  [24, 6, 34, 40], // uzun A koridoru
  [26, 1, 30, 6], // uzun kapılar (dar)
  [22, -18, 38, 1], // uzun A açıklığı
  [10, -40, 38, -18], // A bölgesi
  [-12, -44, 10, -32], // CT doğuşu
  [6, -40, 10, -32], // CT → A
  [-4, 6, 4, 30], // orta yol
  [-3, -4, 3, 6], // orta kapılar (dar)
  [-6, -32, 4, -4], // CT orta
  [3, -2, 10, 4], // ortadan kısa yola
  [6, -18, 12, -2], // kısa yol (kedi yolu)
  [-26, 34, -14, 40], // üst tünel girişi (T'den)
  [-30, 8, -22, 40], // üst tünel
  [-22, 16, -4, 20], // alt tünel (ortaya)
  [-30, -4, -24, 8], // B girişi
  [-40, -40, -18, -4], // B bölgesi
  [-18, -26, -6, -20], // B kapıları (CT ortadan)
  [-18, -40, -12, -32], // CT doğuşu → B
];
/** Üstü kapalı alanlar (tünel tavanı): [x0, z0, x1, z1]. */
const KAPALI = [[-30, 10, -22, 40], [-26, 34, -22, 40], [-22, 16, -6, 20]];

const l = [], kutu = (x0, y0, z0, x1, y1, z1, renk, ek = {}) => l.push({ a: [x0, y0, z0], b: [x1, y1, z1], renk, ...ek });

// Zemin (çarpışma tek kutu), görünüşte yürünen alanlar kum, kalanı duvar altında kalır
kutu(X0, -1, Z0, X1, 0, Z1, '#d8b77e');
// Duvarlar: yürünmeyen hücreler açgözlü dikdörtgenlere birleşir
{
  const W = X1 - X0, D = Z1 - Z0, dolu = new Uint8Array(W * D);
  for (let i = 0; i < W; i++) for (let j = 0; j < D; j++) {
    const x = X0 + i + 0.5, z = Z0 + j + 0.5;
    dolu[i + j * W] = ALAN.some(([a, b, c, d]) => x > a && x < c && z > b && z < d) ? 0 : 1;
  }
  const RENK = ['#c9a066', '#c29a60', '#cfa86e', '#bd955b'];
  for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) {
    if (dolu[i + j * W] !== 1) continue;
    let w = 1; while (i + w < W && dolu[i + w + j * W] === 1) w++;
    let d = 1; satir: while (j + d < D) { for (let k = 0; k < w; k++) if (dolu[i + k + (j + d) * W] !== 1) break satir; d++; }
    for (let b = 0; b < d; b++) for (let k = 0; k < w; k++) dolu[i + k + (j + b) * W] = 2;
    kutu(X0 + i, 0, Z0 + j, X0 + i + w, DUVAR, Z0 + j + d, RENK[(i * 7 + j * 3) % RENK.length]);
  }
}
for (const [a, b, c, d] of KAPALI) kutu(a, TAVAN, b, c, DUVAR, d, '#a8834f');
// Duvar diplerine koyu süpürgelik hissi yok; yerine kapı kemerleri: dar geçitlerin üstünde lento
kutu(26, 4.2, 1, 30, DUVAR, 6, '#a8834f'); // uzun kapılar
kutu(-3, 4.2, -4, 3, DUVAR, 6, '#a8834f'); // orta kapılar
kutu(-18, 4.2, -26, -12, DUVAR, -20, '#a8834f'); // B kapıları
// A bölgesi: yükseltilmiş platform (1,2) ve basamakları
kutu(16, 0, -36, 32, 1.2, -24, '#cfae78');
for (const [k, y] of [[0, 0.4], [1, 0.8]]) {
  kutu(20, 0, -24 + (1 - k), 28, y, -23 + (1 - k), '#c4a26c'); // güneyden (uzun A'dan)
  kutu(16 - (2 - k), 0, -32, 16 - (1 - k), y, -26, '#c4a26c'); // batıdan (kısa yoldan)
}
kutu(25, 1.2, -32, 28, 3.4, -29, '#8a6a3a'); kutu(25.5, 3.4, -31.5, 27.5, 4.4, -29.5, '#7a5c32'); // platformdaki büyük sandık
kutu(12, 0, -40, 14, 2, -38, '#8a6a3a'); kutu(34, 0, -24, 36.5, 1.8, -21.5, '#8a6a3a'); kutu(30, 0, -12, 32, 1.6, -10, '#8a6a3a');
// Uzun A: kapıların ardında sandık, köşede araba gibi alçak kutu
kutu(31, 0, 14, 33, 1.8, 16, '#8a6a3a'); kutu(24.5, 0, -4, 28.5, 1.3, -1.5, '#6f7a80');
// Orta: "xbox" sandığı ve kısa yolun sonu
kutu(-1, 0, 8, 1, 1.4, 10, '#8a6a3a'); kutu(8, 0, -16, 10, 1.6, -14, '#8a6a3a');
// CT orta: alçak duvar
kutu(-6, 0, -12, -3, 1.2, -11, '#b9915a');
// B bölgesi: kutular ve "araba"
kutu(-34, 0, -34, -31, 2.2, -31, '#8a6a3a'); kutu(-33.5, 2.2, -33.5, -31.5, 3.2, -31.5, '#7a5c32');
kutu(-24, 0, -14, -22, 1.6, -12, '#8a6a3a'); kutu(-38, 0, -14, -34, 1.3, -9, '#6f7a80'); kutu(-22, 0, -36, -20, 1.8, -34, '#8a6a3a');
// T doğuşu: sandıklar
kutu(-10, 0, 34, -8, 1.6, 36, '#8a6a3a'); kutu(12, 0, 34, 14, 1.6, 36, '#8a6a3a');
// Tünel içi: yarım duvar
kutu(-26, 0, 22, -23, 1.1, 23, '#b9915a');

const DOGUSLAR = [
  ...[[-8, 40], [-2, 42], [4, 40], [10, 42], [0, 34], [8, 36]].map(([x, z]) => ({ x, y: 0, z, yaw: 0, takim: 0 })),
  ...[[-8, -40], [-2, -36], [4, -42], [-6, -34], [2, -38], [8, -42]].map(([x, z]) => ({ x, y: 0, z, yaw: Math.PI, takim: 1 })),
  ...[[30, -8], [-30, -28], [0, -14], [-26, 26], [32, 24], [12, -22]].map(([x, z]) => ({ x, y: 0, z, yaw: Math.atan2(x, z), takim: -1 })),
];

export default {
  id: 'col', ad: 'Çöl Kasabası', slogan: "Uzun A, orta yol, B tünelleri.", esin: "CS de_dust2'den esinli",
  sinir: [X0, Z0, X1, Z1], kutular: l, padler: [], doguslar: DOGUSLAR,
  canlar: [[-36, 0, -22], [35, 0, -8], [0, 0, 14], [-26, 0, 30]], roket: [24, 1.2, -27],
  gok: { ust: '#79aedb', alt: '#f1dfbd', sis: '#ecd9b5', sisUzak: 260 },
};
