// Dış Mahalle: Juland'daki Tetik Meydanı haritası (Juland'ın Son Plaka altındaki mahallesi). Bloklar src/mahalle.js'den
// (Juland'dan kopya; orada değişirse buraya da kopyalanır), görünüşü Juland'daki gibi blok blok çizilir (mahalle-gorunum.js);
// kutular burada çarpışma, görüş ve yol ağı için. Batı yarısı Mavi'nin karakolu, doğu yarısı Kırmızı'nın deposu, ortada
// dört kapılı kalpazan evi. Cam: oyuncu ve mermi geçer (pencereden ateş). Zıplatma taşı yok. Mahalle duvarının kapılarının
// dışı görünmez sınır.
import { MAHALLE, MAHALLE_KUTULARI, mahalleCarpar } from '../mahalle.js';
import { BLOK } from '../bloklar.js';

const { x0, z0 } = MAHALLE, x1 = MAHALLE.x1 + 1, z1 = MAHALLE.z1 + 1;
const hex = n => '#' + n.toString(16).padStart(6, '0');
const KUTULAR = [
  { a: [x0 - 40, -1, z0 - 40], b: [x1 + 40, 0, z1 + 40], renk: '#86b552', zemin: true, gizli: true },
  { a: [x0 - 2, 0, z0 - 2], b: [x1 + 2, 16, z0 - 1], renk: '#8a8f86', gizli: true }, { a: [x0 - 2, 0, z1 + 1], b: [x1 + 2, 16, z1 + 2], renk: '#8a8f86', gizli: true },
  { a: [x0 - 2, 0, z0 - 1], b: [x0 - 1, 16, z1 + 1], renk: '#8a8f86', gizli: true }, { a: [x1 + 1, 0, z0 - 1], b: [x1 + 2, 16, z1 + 1], renk: '#8a8f86', gizli: true },
  ...MAHALLE_KUTULARI.map(k => ({ a: k.a, b: k.b, renk: hex(BLOK[k.t].renk[1]), carp: mahalleCarpar(k.t), voksel: true })),
];

// Doğuşlar (Mavi; Kırmızı'nınkiler x aynası): karakolun önü (cadde başı), içi ve iki yanındaki arabaların arkası; hepsi merkeze bakar.
const MAVI = [[-31.5, -5.5], [-31.5, 4.5], [-37.5, -3.5], [-37.5, 2.5], [-38.5, -13.5], [-38.5, 13.5]];
const DOGUSLAR = [
  ...MAVI.map(([x, z]) => ({ x, y: 0, z, yaw: -Math.PI / 2, takim: 0 })),
  ...MAVI.map(([x, z]) => ({ x: -x, y: 0, z, yaw: Math.PI / 2, takim: 1 })),
];
// Can paketleri: dört çeyrekteki iki katlı evlerin zemin katında (aynalı).
const CANLAR = [[-18.5, 0, -9.5], [18.5, 0, -9.5], [-18.5, 0, 9.5], [18.5, 0, 9.5]];

export default {
  id: 'mahalle', ad: 'Dış Mahalle', esin: 'Juland',
  sinir: [x0, z0, x1, z1], kutular: KUTULAR, padler: [], canlar: CANLAR, roket: [0, 0, -8.5],
  doguslar: DOGUSLAR,
  gok: { ust: '#5d9fd0', alt: '#d8e6ea', sis: '#b9d3e0', sisUzak: 180, tepe: '#7d9a6a' },
};
