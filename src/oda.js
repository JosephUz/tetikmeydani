// Oda: bir maçı (Mac) istemcilere bağlar. Sunucuda her çevrim içi oda bir Oda; botlu oyunda tarayıcı kendi içinde bir
// Oda kurar ve tek istemcisi olur (aynı mesajlar, gecikmesiz). İstemci: gonder(mesaj) işlevi.
import { Mac } from './mac.js';
import { avatarDuzelt, adDuzelt } from './avatar-veri.js';

/** Oda kodu: 4 harf + '-' + 1 rakam (ör. KPRT-4). Karışan harf/rakam (I, O, Q, W, X, 0, 1) yok. */
export const KOD_HARF = 'ABCDEFGHJKLMNPRSTUVYZ', KOD_RAKAM = '23456789';
/** Yazılan kodu düzeltir: büyük harf, tiresiz yazıldıysa tire eklenir (KPRT4 → KPRT-4). Biçime uymazsa null. */
export function kodDuzelt(s) {
  const k = String(s ?? '').toLocaleUpperCase('tr').replace(/İ/g, 'I').replace(/[^A-Z0-9]/g, '');
  return /^[A-Z]{4}[0-9]$/.test(k) ? k.slice(0, 4) + '-' + k[4] : null;
}

export class Oda {
  constructor({ id = 0, ad = 'Oda', mod = 'herkes', zorluk = 'orta', harita = 'mahalle', kisi, rastgele, tekMac = false } = {}) {
    this.id = id; this.ad = ad;
    this.mac = new Mac({ mod, zorluk, harita, kisi, rastgele, tekMac });
    this.mac.botlariDuzenle(); this.mac.olaylar.length = 0;
    this.istemciler = new Map();
  }
  get insanSayisi() { return this.istemciler.size; }
  /** takim: çevrim içi odada koltuğun takımı (0 Mavi, 1 Kırmızı); verilmezse az olan takım. */
  katil(gonder, ad, avatar, takim) {
    const o = this.mac.insanEkle(adDuzelt(ad) || 'Oyuncu', avatarDuzelt(avatar), takim);
    this.istemciler.set(o.id, gonder);
    gonder({ t: 'hosgeldin', id: o.id, mod: this.mac.mod, zorluk: this.mac.zorluk, harita: this.mac.harita, oda: this.ad, z: this.mac.z, kisi: this.mac.kisi });
    this.mac.listeYolla(); this.mac.skorYolla();
    this.dagit();
    return o.id;
  }
  ayril(id) { if (!this.istemciler.delete(id)) return; this.mac.cikar(id); this.dagit(); }
  mesaj(id, m) {
    const o = this.mac.oyuncular.get(id); if (!o || !m || typeof m !== 'object') return;
    if (m.t === 'k') this.mac.konum(o, m);
    else if (m.t === 'ates') this.mac.ates(o, m);
    else if (m.t === 'doldur') this.mac.doldur(o);
  }
  adim(dt) {
    this.mac.adim(dt);
    this.dagit();
    const s = this.mac.ozet();
    for (const g of this.istemciler.values()) g(s);
  }
  dagit() {
    for (const { kime, m } of this.mac.olaylar) {
      if (kime == null) for (const g of this.istemciler.values()) g(m);
      else if (kime > 0) this.istemciler.get(kime)?.(m);
      else for (const [id, g] of this.istemciler) if (id !== -kime) g(m);
    }
    this.mac.olaylar.length = 0;
  }
}
