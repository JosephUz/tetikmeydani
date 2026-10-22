// Bütün ayar sayıları tek yerde. Birim: 1 = bir blok (≈1 m), hız blok/sn, süre saniye.

export const OYUNCU = {
  yaricap: 0.38, boy: 1.8, goz: 1.58, kafa: 1.42, // kafa kutusu boy ile kafa arası
  hiz: 4.8, kosu: 8.6, ivme: 90, havaIvme: 34, // hiz: yürüyüş, kosu: Shift basılıyken
  yercekimi: 24, ziplama: 8.4, havaZiplama: 7.6, havaZiplamaSayisi: 1,
  basamak: 0.55,
  can: 100, yenilenmeBekle: 4.5, yenilenme: 14,
  dogusBekle: 3, dogusKoruma: 1.5,
};

/** Silahlar: sıra = tuş (1–4); roketatar yerden alınır (5). Hasar tek mermi; pompalıda saçma başına. */
export const SILAHLAR = [
  { id: 'tufek', tus: '1', hasar: 12, kafa: 2, aralik: 0.095, sarjor: 30, doldur: 1.5, sacilma: 0.012, nisanSacilma: 0.004, nisanFov: 55, menzil: 180, otomatik: true, dusus: [40, 90, 0.6] },
  { id: 'keskin', tus: '2', hasar: 80, kafa: 2.5, aralik: 1.05, sarjor: 5, doldur: 2.1, sacilma: 0.07, nisanSacilma: 0, nisanFov: 22, menzil: 400, otomatik: false },
  { id: 'pompali', tus: '3', hasar: 9, kafa: 1.5, sacma: 8, aralik: 0.85, sarjor: 6, doldur: 1.9, sacilma: 0.075, nisanSacilma: 0.055, nisanFov: 65, menzil: 60, otomatik: false, dusus: [9, 26, 0.25] },
  { id: 'kilic', tus: '4', hasar: 65, kafa: 1, aralik: 0.55, sarjor: 0, menzil: 2.9, aci: 0.8, otomatik: true, yakin: true },
  { id: 'roket', tus: '5', hasar: 115, kafa: 1, aralik: 0.9, sarjor: 1, doldur: 0, sacilma: 0, nisanSacilma: 0, nisanFov: 65, menzil: 300, otomatik: false, mermi: { hiz: 34, alan: 4.2, itme: 15, kendi: 0.35 }, cephane: 3 },
];
export const SILAH_NO = Object.fromEntries(SILAHLAR.map((s, i) => [s.id, i]));

export const MODLAR = {
  herkes: { kisa: 'HERKES', takimli: false, hedef: 25, sure: 360, kisi: 8 },
  takim: { kisa: 'TAKIM', takimli: true, hedef: 40, sure: 480, kisi: 8 },
};

/**
 * Bot zorlukları: tepki (hedefi görünce ateşe kadar), dönüş hızı (rad/sn), nişan sapması (rad), ateş eşiği,
 * ates: silah aralığının katı (botlar insandan yavaş tetik çeker), titreme: her atışta sapmanın bu katı kadar rastgele kayma.
 */
export const ZORLUK = {
  kolay: { id: 'kolay', tepki: 0.8, donus: 3.2, sapma: 0.08, esik: 0.09, hareket: 0.55, ates: 2.4, titreme: 0.9 },
  orta: { id: 'orta', tepki: 0.5, donus: 5.5, sapma: 0.05, esik: 0.06, hareket: 0.8, ates: 1.8, titreme: 0.8 },
  zor: { id: 'zor', tepki: 0.28, donus: 9, sapma: 0.028, esik: 0.04, hareket: 1, ates: 1.3, titreme: 0.7 },
};

export const MAC = { tik: 30, sonBekle: 10, canPaketi: 50, canDogus: 18, roketDogus: 35 };
export const TAKIM_RENK = ['#3d8bd6', '#c7442f'];
