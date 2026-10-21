// Oda: bir maçı (Mac) istemcilere bağlar. Sunucuda her çevrim içi oda bir Oda; botlu oyunda tarayıcı kendi içinde bir
// Oda kurar ve tek istemcisi olur (aynı mesajlar, gecikmesiz). İstemci: gonder(mesaj) işlevi.
import { Mac } from './mac.js';
import { avatarDuzelt, adDuzelt } from './avatar-veri.js';

export class Oda {
  constructor({ id = 0, ad = 'Oda', mod = 'herkes', zorluk = 'orta', harita = 'mahalle', kisi, rastgele } = {}) {
    this.id = id; this.ad = ad;
    this.mac = new Mac({ mod, zorluk, harita, kisi, rastgele });
    this.mac.botlariDuzenle(); this.mac.olaylar.length = 0;
    this.istemciler = new Map();
  }
  get insanSayisi() { return this.istemciler.size; }
  katil(gonder, ad, avatar) {
    const o = this.mac.insanEkle(adDuzelt(ad) || 'Oyuncu', avatarDuzelt(avatar));
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
