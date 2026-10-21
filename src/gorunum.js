// Üç boyutlu görünüm: harita (tek birleşik ağ), gök, ışık, oyuncular, roketler, yerden alınanlar, efektler ve
// birinci şahıs silahı (ayrı sahne: duvara girmez, dünyanın üstüne çizilir).
import * as T from 'three';
import { H as ETKIN } from './harita.js';
import { OYUNCU, SILAHLAR } from './ayar.js';
import { karakterModeli, silahModeli, SILAH_SIRASI } from './karakter.js';
import { mahalleAglari } from './mahalle-gorunum.js';

export class Gorunum {
  constructor(tuval) {
    this.r = new T.WebGLRenderer({ canvas: tuval, antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
    this.r.setPixelRatio(Math.min(devicePixelRatio, 2)); this.r.autoClear = false;
    this.r.shadowMap.enabled = true; this.r.shadowMap.type = T.PCFSoftShadowMap;
    this.r.outputColorSpace = T.SRGBColorSpace;
    this.sahne = new T.Scene();
    this.sahne.fog = new T.Fog('#b9d3e0', 60, 150);
    this.kamera = new T.PerspectiveCamera(72, 1, 0.08, 400); this.fov = 72;
    this.sahne.add(new T.HemisphereLight('#dfefff', '#8a7a60', 1.5));
    const g = new T.DirectionalLight('#fff3dc', 2.4); g.position.set(30, 55, 18); g.castShadow = true;
    g.shadow.mapSize.set(2048, 2048); Object.assign(g.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 5, far: 140 }); g.shadow.bias = -0.0005; g.shadow.normalBias = 0.03;
    this.sahne.add(g, g.target); this.gunes = g;
    this.haritaYukle(ETKIN);
    this.oyuncular = new Map(); this.efektler = []; this.roketler = new Map();
    // Birinci şahıs: ayrı sahne + aynı kamera
    this.elSahne = new T.Scene();
    this.elSahne.add(new T.HemisphereLight('#ffffff', '#9a8a70', 2.6));
    const el = new T.DirectionalLight('#fff3dc', 2.2); el.position.set(-0.6, 1.2, 2); this.elSahne.add(el);
    this.elKamera = new T.PerspectiveCamera(65, 1, 0.01, 10);
    this.el = new T.Group(); this.el.scale.setScalar(0.62); this.elSahne.add(this.el);
    this.elSilahlar = SILAH_SIRASI.map(id => { const s = silahModeli(id, false); s.visible = false; this.el.add(s); return s; });
    this.elTen = '#e2b083'; this.elKur('#e2b083', '#3d8bd6');
    this.alev = new T.Mesh(new T.OctahedronGeometry(0.09, 0), new T.MeshBasicMaterial({ color: '#ffd76a', transparent: true, opacity: 0.95 })); this.alev.visible = false; this.el.add(this.alev);
    this.elDurum = { silah: -1, sallanma: 0, tepme: 0, degis: 0, doldur: 0, kilic: 0, nisan: 0, gizli: false };
    this.v = new T.Vector3();
  }

  /** Haritayı (yeniden) kur: eski harita grubu silinir; gök, sis, gölge alanı haritaya göre. */
  haritaYukle(H) {
    if (this.haritaId === H.id) return;
    // Eski haritanın geometrileri bırakılır (malzemeler karakter ve silah modelleriyle paylaşılabilir, onlara dokunulmaz).
    if (this.harita) { this.sahne.remove(this.harita); this.harita.traverse(m => { if (m.isMesh) m.geometry.dispose(); }); }
    this.haritaId = H.id; this.H = H; this.harita = new T.Group(); this.sahne.add(this.harita);
    this.sahne.fog.color.set(H.gok.sis); this.sahne.fog.far = H.gok.sisUzak ?? 150; this.sahne.fog.near = (H.gok.sisUzak ?? 150) * 0.4;
    const [x0, z0, x1, z1] = H.sinir, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, yari = Math.max(x1 - x0, z1 - z0) / 2 + 6;
    this.gunes.position.set(cx + 30, 55, cz + 18); this.gunes.target.position.set(cx, 0, cz); this.gunes.target.updateMatrixWorld();
    Object.assign(this.gunes.shadow.camera, { left: -yari, right: yari, top: yari, bottom: -yari }); this.gunes.shadow.camera.updateProjectionMatrix();
    this.gok(H); this.haritaKur(H);
  }
  gok(H) {
    // Basit gökyüzü kubbesi (dikey renk geçişi) + uzak tepeler (varsa)
    const geo = new T.SphereGeometry(300, 24, 12), renk = [], ust = new T.Color(H.gok.ust), alt = new T.Color(H.gok.alt);
    for (let i = 0; i < geo.attributes.position.count; i++) { const y = geo.attributes.position.getY(i) / 300; renk.push(...alt.clone().lerp(ust, Math.max(0, y) ** 0.6).toArray()); }
    geo.setAttribute('color', new T.Float32BufferAttribute(renk, 3));
    const gok = new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false })); gok.renderOrder = -1;
    this.harita.add(gok);
    if (!H.gok.tepe) return;
    const tepe = new T.MeshLambertMaterial({ color: H.gok.tepe });
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, u = 120 + (i % 3) * 18; const m = new T.Mesh(new T.BoxGeometry(40, 10 + (i * 7) % 14, 30), tepe); m.position.set(Math.cos(a) * u, 2, Math.sin(a) * u); m.rotation.y = -a; this.harita.add(m); }
  }

  haritaKur(H) {
    // Bütün kutular tek geometri (köşe renkleriyle); yüzler yöne göre hafifçe gölgelenir, her kutuya küçük ton farkı.
    const p = [], n = [], c = [], idx = [];
    const YUZ = [[[1, 0, 0], 0.86], [[-1, 0, 0], 0.8], [[0, 1, 0], 1.0], [[0, -1, 0], 0.6], [[0, 0, 1], 0.92], [[0, 0, -1], 0.84]];
    let h = 1;
    for (const k of H.kutular) {
      if (k.su || k.gizli || k.voksel) continue; // voksel: Dış Mahalle'nin blokları, aşağıda blok blok çizilir
      const [x0, y0, z0] = k.a, [x1, y1, z1] = k.b, renk = new T.Color(k.renk);
      h = (h * 9301 + 49297) % 233280; const ton = 0.94 + (h / 233280) * 0.1;
      for (const [[nx, ny, nz], gol] of YUZ) {
        const v = nx ? [[nx > 0 ? x1 : x0, y0, z0], [nx > 0 ? x1 : x0, y1, z0], [nx > 0 ? x1 : x0, y1, z1], [nx > 0 ? x1 : x0, y0, z1]]
          : ny ? [[x0, ny > 0 ? y1 : y0, z0], [x1, ny > 0 ? y1 : y0, z0], [x1, ny > 0 ? y1 : y0, z1], [x0, ny > 0 ? y1 : y0, z1]]
            : [[x0, y0, nz > 0 ? z1 : z0], [x1, y0, nz > 0 ? z1 : z0], [x1, y1, nz > 0 ? z1 : z0], [x0, y1, nz > 0 ? z1 : z0]];
        const b = p.length / 3;
        for (const q of v) { p.push(...q); n.push(nx, ny, nz); const cc = renk.clone().multiplyScalar(gol * ton); c.push(cc.r, cc.g, cc.b); }
        // Yüz yönü dışa baksın (saat yönü normalle uyumlu)
        const e1 = v[1].map((t, i) => t - v[0][i]), e2 = v[2].map((t, i) => t - v[0][i]);
        const cx = e1[1] * e2[2] - e1[2] * e2[1], cy = e1[2] * e2[0] - e1[0] * e2[2], cz = e1[0] * e2[1] - e1[1] * e2[0];
        if (cx * nx + cy * ny + cz * nz > 0) idx.push(b, b + 1, b + 2, b, b + 2, b + 3); else idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(p, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(n, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(c, 3)); geo.setIndex(idx);
    const m = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true })); m.castShadow = true; m.receiveShadow = true;
    this.harita.add(m);
    // Dış Mahalle: Juland'daki gibi blok blok (köşe gölgeli); çevresi uzaklara uzanan düz çim.
    if (H.id === 'mahalle') {
      for (const a of mahalleAglari()) this.harita.add(a);
      const cim = new T.Mesh(new T.PlaneGeometry(700, 700), new T.MeshLambertMaterial({ color: '#86b552' })); cim.rotation.x = -Math.PI / 2; cim.position.y = -0.02; cim.receiveShadow = true; this.harita.add(cim);
    }
    // Su (yarı saydam), zıplatma taşları, can paketleri, roketatar
    const suMat = new T.MeshLambertMaterial({ color: '#4f8fb8', transparent: true, opacity: 0.75 });
    for (const k of H.kutular.filter(k => k.su)) { const s = new T.Mesh(new T.BoxGeometry(k.b[0] - k.a[0], k.b[1] - k.a[1], k.b[2] - k.a[2]), suMat); s.position.set((k.a[0] + k.b[0]) / 2, (k.a[1] + k.b[1]) / 2, (k.a[2] + k.b[2]) / 2); this.harita.add(s); }
    this.padler = H.padler.map(pd => {
      const g = new T.Group(); g.position.set(pd.x, pd.y + 0.02, pd.z);
      const taban = new T.Mesh(new T.BoxGeometry(pd.r * 2, 0.08, pd.r * 2), new T.MeshLambertMaterial({ color: '#3a3f46' })); taban.receiveShadow = true; g.add(taban);
      const halka = new T.Mesh(new T.BoxGeometry(pd.r * 1.5, 0.1, pd.r * 1.5), new T.MeshBasicMaterial({ color: '#f2c94c' })); halka.position.y = 0.02; g.add(halka);
      const ok = new T.Mesh(new T.ConeGeometry(0.28, 0.4, 4), new T.MeshBasicMaterial({ color: '#fff1b0', transparent: true, opacity: 0.8 })); ok.position.y = 0.6; g.add(ok);
      this.harita.add(g); return { g, halka, ok };
    });
    this.canTaban = H.canlar;
    this.canlar = H.canlar.map(([x, y, z]) => {
      const g = new T.Group(); g.position.set(x, y + 0.6, z);
      g.add(new T.Mesh(new T.BoxGeometry(0.6, 0.6, 0.6), new T.MeshLambertMaterial({ color: '#f4f1ea' })));
      for (const [sx, sy, sz] of [[0.62, 0.14, 0.4], [0.62, 0.4, 0.14], [0.4, 0.14, 0.62], [0.14, 0.4, 0.62], [0.4, 0.62, 0.14], [0.14, 0.62, 0.4]]) g.add(new T.Mesh(new T.BoxGeometry(sx, sy, sz), new T.MeshBasicMaterial({ color: '#d33a2c' })));
      this.harita.add(g); return g;
    });
    const rg = new T.Group(); rg.position.set(H.roket[0], H.roket[1] + 0.9, H.roket[2]);
    const rs = silahModeli('roket'); rs.scale.setScalar(1.4); rg.add(rs);
    const parilti = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, 0.05, 20), new T.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.45 })); parilti.position.y = -0.85; rg.add(parilti);
    this.harita.add(rg); this.roketAl = rg;
  }

  boyut(w, h) { this.r.setSize(w, h, false); this.kamera.aspect = w / h; this.kamera.updateProjectionMatrix(); this.elKamera.aspect = w / h; this.elKamera.updateProjectionMatrix(); }

  // ——— Oyuncular ———
  oyuncuKur(id, avatar, takimRenk) {
    this.oyuncuSil(id);
    const k = karakterModeli(avatar, takimRenk); this.sahne.add(k.grup);
    const v = { k, x: 0, y: 0, z: 0, yaw: 0, pitch: 0, hiz: 0, gorunur: true, silah: 0 };
    this.oyuncular.set(id, v); return v;
  }
  oyuncuSil(id) { const v = this.oyuncular.get(id); if (v) { this.sahne.remove(v.k.grup); this.oyuncular.delete(id); } }
  /** p: [x, y, z, yaw, pitch, bit, silah]. */
  oyuncuGuncelle(id, p, dt, gizle) {
    const v = this.oyuncular.get(id); if (!v) return;
    const [x, y, z, yaw, pitch, bit, silah] = p, canli = !!(bit & 1);
    const hiz = Math.hypot(x - v.x, z - v.z) / Math.max(dt, 1e-3); v.hiz += (Math.min(hiz, 25) - v.hiz) * Math.min(1, dt * 10);
    v.x = x; v.y = y; v.z = z; v.yaw = yaw; v.pitch = pitch; v.canli = canli;
    v.k.grup.position.set(x, y, z); v.k.grup.rotation.y = yaw;
    // Doğuş koruması: yanıp söner
    v.k.grup.visible = !gizle && (!(bit & 16) || Math.floor(performance.now() / 90) % 2 === 0);
    if (silah !== v.silah) { v.silah = silah; v.k.silah(SILAH_SIRASI[silah] ?? 'tufek'); }
    v.k.guncelle(dt, v.hiz, !(bit & 2), pitch, canli, bit);
  }

  // ——— Efektler ———
  efekt(nesne, sure, adim) { this.sahne.add(nesne); this.efektler.push({ nesne, t: 0, sure, adim }); }
  iz(a, b, renk = '#ffe9a8', kalin = 0.025) {
    const u = a.distanceTo(b); if (u < 0.1) return;
    const m = new T.Mesh(izGeo, new T.MeshBasicMaterial({ color: renk, transparent: true, opacity: 0.85, depthWrite: false }));
    m.position.copy(a).lerp(b, 0.5); m.scale.set(kalin, kalin, u); m.lookAt(b);
    this.efekt(m, 0.16, (o, t) => { o.material.opacity = 0.6 * (1 - t); });
  }
  /**
   * Uçan mermi (görsel): namludan hedefe hiz blok/sn ile giden parlak çubuk + arkasında sönen ince iz. Vardığında
   * vardi() çağrılır (kıvılcım, kan). Hasar zaten anında hesaplanır; bu yalnız gözün izleyebileceği mermi.
   */
  mermiUcur(a, b, { renk = '#ffd27a', hiz = 170, kalin = 0.045, uzun = 1.1, iz = 0.22, vardi } = {}) {
    const u = a.distanceTo(b); if (u < 0.2) { vardi?.(); return; }
    const yon = b.clone().sub(a).normalize(), sure = u / hiz, L = Math.min(uzun, u);
    const m = new T.Mesh(izGeo, new T.MeshBasicMaterial({ color: renk, transparent: true, opacity: 1, depthWrite: false, blending: T.AdditiveBlending }));
    m.scale.set(kalin, kalin, L); m.lookAt(yon); m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), yon);
    const bas = new T.Vector3(), uc = new T.Vector3();
    let vardiMi = false;
    this.efekt(m, sure + 0.03, (o, t) => {
      const d = Math.min(u, (t * (sure + 0.03)) * hiz);
      uc.copy(a).addScaledVector(yon, d); bas.copy(a).addScaledVector(yon, Math.max(0, d - L));
      o.position.copy(bas).lerp(uc, 0.5); o.scale.z = Math.max(0.05, uc.distanceTo(bas));
      if (d >= u && !vardiMi) { vardiMi = true; o.material.opacity = 0; vardi?.(); }
    });
    if (iz) this.iz(a, b, renk, kalin * iz);
  }
  kivilcim(p, renk = '#e8dcc0', sayi = 5) {
    for (let i = 0; i < sayi; i++) {
      const m = new T.Mesh(kucukKup, new T.MeshBasicMaterial({ color: renk, transparent: true }));
      m.position.copy(p); m.scale.setScalar(0.06 + Math.random() * 0.06);
      const v = new T.Vector3((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4);
      this.efekt(m, 0.35, (o, t, dt) => { v.y -= 12 * dt; o.position.addScaledVector(v, dt); o.material.opacity = 1 - t; });
    }
  }
  kan(p) { this.kivilcim(p, '#b8322a', 6); }
  patlama(p) {
    const top = new T.Mesh(new T.IcosahedronGeometry(1, 1), new T.MeshBasicMaterial({ color: '#ffb347', transparent: true, depthWrite: false }));
    top.position.copy(p); this.efekt(top, 0.45, (o, t) => { o.scale.setScalar(0.5 + t * 4); o.material.opacity = 0.9 * (1 - t); o.material.color.setRGB(1, 0.7 - t * 0.4, 0.3 - t * 0.25); });
    const isik = new T.PointLight('#ffb060', 30, 14); isik.position.copy(p); this.efekt(isik, 0.3, (o, t) => { o.intensity = 30 * (1 - t); });
    this.kivilcim(p, '#3a3530', 10); this.kivilcim(p, '#ffcf6a', 8);
  }
  roketGuncelle(liste, dt) {
    const var_ = new Set();
    for (const [id, x, y, z] of liste) {
      var_.add(id); let r = this.roketler.get(id);
      if (!r) { r = new T.Mesh(new T.BoxGeometry(0.16, 0.16, 0.5), new T.MeshBasicMaterial({ color: '#ffcf6a' })); this.sahne.add(r); this.roketler.set(id, r); r.position.set(x, y, z); }
      const once = r.position.clone(); r.position.set(x, y, z); if (once.distanceToSquared(r.position) > 1e-4) r.lookAt(once.multiplyScalar(-1).add(r.position.clone().multiplyScalar(2)));
      if (Math.random() < 0.7) { const d = new T.Mesh(kucukKup, new T.MeshBasicMaterial({ color: '#d8d2c8', transparent: true })); d.position.set(x, y, z); d.scale.setScalar(0.25); this.efekt(d, 0.6, (o, t) => { o.scale.setScalar(0.25 + t * 0.6); o.material.opacity = 0.6 * (1 - t); }); }
    }
    for (const [id, r] of this.roketler) if (!var_.has(id)) { this.sahne.remove(r); this.roketler.delete(id); }
  }

  /** Birinci şahıs elinin ten/kol rengi. */
  elKur(ten, kol) {
    if (this.elKol) this.el.remove(this.elKol);
    const g = new T.Group(), t = new T.MeshLambertMaterial({ color: ten }), k = new T.MeshLambertMaterial({ color: kol });
    const sag = new T.Mesh(new T.BoxGeometry(0.11, 0.11, 0.42), k); sag.position.set(0.04, -0.12, 0.28); g.add(sag);
    const sagEl = new T.Mesh(new T.BoxGeometry(0.1, 0.1, 0.1), t); sagEl.position.set(0.02, -0.08, 0.06); g.add(sagEl);
    const sol = new T.Mesh(new T.BoxGeometry(0.1, 0.1, 0.36), k); sol.position.set(-0.13, -0.12, -0.12); sol.rotation.y = 0.5; g.add(sol);
    const solEl = new T.Mesh(new T.BoxGeometry(0.09, 0.09, 0.09), t); solEl.position.set(-0.03, -0.06, -0.3); g.add(solEl);
    this.elKol = g; this.el.add(g); this.solEl = [sol, solEl];
  }
  elOlay(tur) { const d = this.elDurum; if (tur === 'ates') { d.tepme = 1; if (d.silah !== 3) { this.alev.visible = true; this.alevT = 0.05; } else d.kilic = 0.3; } else if (tur === 'degis') d.degis = 1; }
  elGuncelle(dt, { silah, hiz, yerde, nisan, doldurOran, gizli, keskinNisan, surX = 0, surY = 0, havada = false, dikey = 0 }) {
    const d = this.elDurum;
    if (silah !== d.silah) { d.silah = silah; this.elSilahlar.forEach((s, i) => { s.visible = i === silah; }); d.degis = 1; const S = this.elSilahlar[silah]; this.alev.position.set(0, 0.04, S.userData.uc - 0.05); }
    for (const s of this.solEl) s.visible = silah !== 3;
    d.sallanma += dt * (yerde ? Math.min(hiz, 10) : 0) * 1.2;
    d.tepme = Math.max(0, d.tepme - dt * (silah === 1 ? 4 : 10)); d.degis = Math.max(0, d.degis - dt * 4);
    d.nisan += ((nisan ? 1 : 0) - d.nisan) * Math.min(1, dt * 14);
    const salla = Math.min(1, hiz / 8) * (1 - d.nisan * 0.8), bx = Math.sin(d.sallanma) * 0.018 * salla, by = Math.abs(Math.cos(d.sallanma)) * 0.016 * salla;
    const nx = 0.2 * (1 - d.nisan), ny = -0.19 + d.nisan * 0.105, nz = -0.36 + d.nisan * 0.05;
    this.el.position.set(nx + bx, ny - by - d.degis * 0.2 - doldurOran * 0.12 + d.tepme * 0.01, nz + d.tepme * (silah === 1 ? 0.12 : 0.06));
    // Silah bakışın gerisinden gelir (fare sürüklemesi), havadayken hafif kalkar/iner.
    const ag = 1 - d.nisan * 0.75;
    d.surX = (d.surX ?? 0) * Math.exp(-dt * 10) + Math.max(-60, Math.min(60, surX)) * 0.0011 * ag;
    d.surY = (d.surY ?? 0) * Math.exp(-dt * 10) + Math.max(-60, Math.min(60, surY)) * 0.0011 * ag;
    d.hava = (d.hava ?? 0) + ((havada ? Math.max(-1, Math.min(1, -dikey / 10)) : 0) - (d.hava ?? 0)) * Math.min(1, dt * 8);
    this.el.position.x += d.surX * 0.25; this.el.position.y += d.surY * 0.2 + d.hava * 0.025 * ag;
    this.el.rotation.set(d.tepme * (silah === 1 ? 0.35 : 0.12) + doldurOran * 0.6 + d.surY * 0.6 - d.hava * 0.05 * ag, (d.nisan ? 0 : 0.05) + d.surX * 0.8, doldurOran * 0.4 + d.surX * 0.5);
    if (silah === 3) { // kılıç: sağdan sola savrulur
      d.kilic = Math.max(0, d.kilic - dt); const t = d.kilic > 0 ? 1 - d.kilic / 0.3 : 0;
      this.el.rotation.set(-0.3 + (d.kilic > 0 ? Math.sin(t * Math.PI) * 0.6 : 0), d.kilic > 0 ? 0.9 - t * 1.8 : 0.25, d.kilic > 0 ? -0.6 + t * 0.6 : -0.3);
      this.el.position.set(0.22 + bx, -0.22 - by - d.degis * 0.2, -0.38);
    }
    if (this.alevT > 0 && (this.alevT -= dt) <= 0) this.alev.visible = false;
    this.alev.rotation.z = Math.random() * 3;
    this.el.visible = !gizli && !keskinNisan;
  }
  /** Namlu ağzının dünyadaki yeri (iz başlangıcı): el sahnesindeki konum kamera uzayından dünyaya. */
  elNamlu(v) {
    const S = this.elSilahlar[this.elDurum.silah] ?? this.elSilahlar[0]; this.el.updateMatrixWorld(true);
    v.set(0, 0.04, S.userData.uc).applyMatrix4(S.matrixWorld);
    this.elKamera.updateMatrixWorld(); v.applyMatrix4(this.elKamera.matrixWorldInverse);
    v.applyMatrix4(this.kamera.matrixWorld); return v;
  }

  cizim(dt, zaman) {
    for (let i = this.efektler.length - 1; i >= 0; i--) {
      const e = this.efektler[i]; e.t += dt; const t = Math.min(1, e.t / e.sure); e.adim?.(e.nesne, t, dt);
      if (e.t >= e.sure) { this.sahne.remove(e.nesne); e.nesne.material?.dispose?.(); this.efektler.splice(i, 1); }
    }
    for (const [i, p] of this.padler.entries()) { const t = (zaman * 1.4 + i * 0.3) % 1; p.ok.position.y = 0.3 + t * 1.2; p.ok.material.opacity = 0.8 * (1 - t); }
    for (const [i, c] of this.canlar.entries()) { c.rotation.y = zaman * 1.5 + i; c.position.y = this.canTaban[i][1] + 0.6 + Math.sin(zaman * 2 + i) * 0.1; }
    this.roketAl.rotation.y = zaman * 1.2;
    this.kamera.fov += (this.fov - this.kamera.fov) * Math.min(1, dt * 16); this.kamera.updateProjectionMatrix();
    this.elKamera.position.set(0, 0, 0); this.elKamera.quaternion.identity();
    this.r.clear(); this.r.render(this.sahne, this.kamera);
    this.r.clearDepth(); this.r.render(this.elSahne, this.elKamera);
  }
  /** Yerden alınanların görünürlüğü (bit maskesi). */
  alinanlar(maske) {
    this.canlar.forEach((c, i) => { c.visible = !!(maske & (1 << i)); });
    this.roketAl.visible = !!(maske & (1 << 8));
  }
}

const izGeo = new T.BoxGeometry(1, 1, 1), kucukKup = new T.BoxGeometry(1, 1, 1);
export { OYUNCU, SILAHLAR };
