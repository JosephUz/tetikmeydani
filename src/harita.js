// Harita kaydı. Etkin harita H canlı bir bağdır: fizik, yol ağı ve görünüm onu okur. Sunucuda birden çok oda farklı
// haritalarda çalışır; her oda kendi işine başlarken haritaKullan(id) çağırır (tek iş parçacığı: araya kimse girmez).
import meydan from './haritalar/meydan.js';
import buz from './haritalar/buz.js';
import col from './haritalar/col.js';

function hazirla(h) {
  const kutular = h.kutular.map((k, i) => ({ carp: true, ...k, no: i }));
  return { ...h, kutular, carpanlar: kutular.filter(k => k.carp) };
}
export const HARITALAR = Object.fromEntries([meydan, buz, col].map(h => [h.id, hazirla(h)]));
export const HARITA_SIRASI = ['meydan', 'buz', 'col'];

export let H = HARITALAR.meydan;
export function haritaKullan(id) { H = HARITALAR[id] ?? HARITALAR.meydan; return H; }
