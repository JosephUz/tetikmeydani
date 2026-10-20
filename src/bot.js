// Bot: görür, tepki süresinden sonra nişan alır (zorluğa göre sapma ve dönüş hızı), mesafeye göre silah seçer;
// görmezken yol ağında gezer (can azsa can paketine, roket hazırsa kuleye, yoksa son bilinen düşmana ya da rastgele).
import { OYUNCU, SILAHLAR, SILAH_NO } from './ayar.js';
import { hareket, gorur, bakis } from './fizik.js';
import { yolAgi, yolBul } from './yol.js';

export function botSifirla(b) {
  b.bz = { hedef: null, gorduZ: 0, tepkiZ: 0, yol: [], yolZ: -99, amac: -1, serit: 1, seritZ: 0, sapma: [0, 0], sapmaZ: 0, bakZ: 0,
    sonPoz: [b.x, b.z], sikisZ: 0, zipla: false, sonBilinen: null, sonBilinenZ: -99, degisZ: 0, tohum: (b.id * 7919) | 0 };
}

const aci = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

export function botAdim(mac, b, dt, Z) {
  const bz = b.bz, z = mac.z, goz = [b.x, b.y + OYUNCU.goz, b.z];
  // Algı (5 Hz): görülen en yakın düşman; vurulduysa saldıranı bilir.
  if (z - bz.bakZ > 0.2) {
    bz.bakZ = z;
    let en = null, eu = Infinity;
    for (const h of mac.oyuncular.values()) {
      if (!h.canli || !mac.dusmanMi(b, h)) continue;
      const dx = h.x - b.x, dz = h.z - b.z, u = Math.hypot(dx, h.y - b.y, dz);
      if (u > 75) continue;
      const on = bakis(b.yaw, 0), gorusAci = (dx * on[0] + dz * on[2]) / Math.max(u, 1e-6);
      const biliyor = b.sonSaldiran === h.id && z - (b.sonSaldiranZ ?? -99) < 2.5;
      if (gorusAci < -0.2 && !biliyor && u > 6) continue;
      if (!gorur(goz, [h.x, h.y + 1.3, h.z]) && !gorur(goz, [h.x, h.y + 1.7, h.z])) continue;
      const puan = u - (h.can < 40 ? 6 : 0) - (biliyor ? 10 : 0) - (h.id === bz.hedef ? 8 : 0);
      if (puan < eu) { eu = puan; en = h; }
    }
    if (en && en.id !== bz.hedef) { bz.hedef = en.id; bz.tepkiZ = z + Z.tepki * (0.7 + mac.r() * 0.6); }
    if (!en) bz.hedef = null; else { bz.sonBilinen = [en.x, en.y, en.z]; bz.sonBilinenZ = z; }
  }
  const h = bz.hedef != null ? mac.oyuncular.get(bz.hedef) : null;
  // Gezerken koşar; çatışmada yana kayarken yürür (insan da nişan alırken koşmaz).
  const g = { ileri: 0, sag: 0, zipla: false, kos: false, yaw: b.yaw };
  if (h && h.canli) savas(mac, b, h, g, dt, Z);
  else { bz.hedef = null; gez(mac, b, g, dt, Z); }
  // Sıkışma: 1 sn'de 0,4 bloktan az gittiyse zıpla, sonra yolu yeniden kur.
  if (z - bz.sikisZ > 1) {
    const u = Math.hypot(b.x - bz.sonPoz[0], b.z - bz.sonPoz[1]);
    if (u < 0.4 && (g.ileri || g.sag)) { g.zipla = true; bz.yolZ = -99; if (mac.r() < 0.4) bz.serit *= -1; }
    bz.sonPoz = [b.x, b.z]; bz.sikisZ = z;
  }
  g.yaw = b.yaw;
  const olaylar = hareket(b, g, dt);
  b.bit = (b.yerde ? 2 : 0) | (b.poz > 0 ? 4 : 0);
  if (olaylar.includes('pad')) mac.olay(null, { t: 'pad', id: b.id });
}

function savas(mac, b, h, g, dt, Z) {
  const bz = b.bz, z = mac.z;
  const dx = h.x - b.x, dz = h.z - b.z, yatay = Math.hypot(dx, dz), u = Math.hypot(dx, h.y - b.y, dz);
  // Silah: yakında pompalı (çok yakında bazen kılıç), ortada tüfek, uzakta keskin; roket varsa orta mesafede roket.
  let s = u < 2.2 && mac.r() < 0.02 ? SILAH_NO.kilic : u < 8 ? SILAH_NO.pompali : u < 34 || Z.ad === 'Kolay' ? SILAH_NO.tufek : SILAH_NO.keskin;
  if (b.cephane > 0 && u > 7 && u < 45) s = SILAH_NO.roket;
  if (bz.silahIstek !== s && z - bz.degisZ > 0.8) { bz.silahIstek = s; bz.degisZ = z; }
  s = bz.silahIstek ?? s;
  if (b.silah !== s && !(b.dolduruyorZ && b.doldurSilah === b.silah && s === b.silah)) {
    if (s === SILAH_NO.roket && b.cephane <= 0) s = SILAH_NO.tufek;
    if (b.dolduruyorZ) b.dolduruyorZ = 0;
    b.silah = s; b.sonAtis[s] = Math.max(b.sonAtis[s], z - SILAHLAR[s].aralik + 0.25);
  }
  const S = SILAHLAR[b.silah];
  // Nişan: gövde ortası (zorda bazen kafa), hareket eden hedefe biraz önden; sapma 0,4 sn'de bir yenilenir.
  if (z - bz.sapmaZ > 0.4) { bz.sapmaZ = z; const m = Z.sapma * (1 + Math.min(1.5, Math.hypot(h.vx || 0, h.vz || 0) / 8)); bz.sapma = [(mac.r() - 0.5) * 2 * m, (mac.r() - 0.5) * 2 * m]; bz.kafa = Z.ad === 'Zor' && mac.r() < 0.35; }
  const on = S.mermi ? u / S.mermi.hiz : S.yakin ? 0 : 0.06;
  const hx = h.x + (h.vx || 0) * on, hz = h.z + (h.vz || 0) * on, hy = h.y + (bz.kafa ? 1.62 : 1.05) - (S.mermi ? 0.8 : 0);
  const ix = hx - b.x, iy = hy - (b.y + OYUNCU.goz), iz = hz - b.z;
  const isteYaw = Math.atan2(-ix, -iz) + bz.sapma[0], istePitch = Math.atan2(iy, Math.hypot(ix, iz)) + bz.sapma[1];
  const dy = aci(isteYaw - b.yaw), dp = istePitch - b.pitch, adim = Z.donus * dt;
  b.yaw = aci(b.yaw + Math.max(-adim, Math.min(adim, dy)));
  b.pitch += Math.max(-adim, Math.min(adim, dp));
  const hata = Math.hypot(aci(isteYaw - b.yaw), istePitch - b.pitch);
  // Ateş
  if (z >= bz.tepkiZ && mac.durum === 'oyun') {
    const esik = Z.esik + Math.min(0.25, 1.2 / Math.max(u, 1)) + (S.sacma ? 0.05 : 0);
    const menzilde = S.yakin ? u < S.menzil + 0.3 : u < S.menzil;
    if (S.sarjor && b.silah !== SILAH_NO.roket && b.sarjor[b.silah] <= 0) mac.doldur(b);
    else if (hata < esik && menzilde) {
      // Her atışta küçük titreme: bot sabit bir sapmayla mermi dizisini hep aynı yere koymasın.
      const tt = Z.sapma * Z.titreme, d = bakis(b.yaw + (mac.r() - 0.5) * 2 * tt, b.pitch + (mac.r() - 0.5) * 2 * tt);
      bz.tohum = (bz.tohum * 1103515245 + 12345) | 0;
      mac.ates(b, { s: b.silah, d, b: [b.x, b.y + OYUNCU.goz, b.z], r: bz.tohum, n: b.silah === SILAH_NO.keskin || (b.silah === SILAH_NO.tufek && u > 20), zt: mac.z });
    }
  }
  // Hareket: yana kay (yön ara ara değişir), menzile göre yaklaş / uzaklaş; arada zıpla.
  if (z > bz.seritZ) { bz.serit = mac.r() < 0.5 ? -1 : 1; bz.seritZ = z + 0.5 + mac.r() * 1.1; }
  const ideal = S.yakin ? 0.8 : b.silah === SILAH_NO.pompali ? 4 : b.silah === SILAH_NO.keskin ? 40 : b.silah === SILAH_NO.roket ? 18 : 16;
  g.sag = bz.serit * Z.hareket;
  g.ileri = yatay > ideal + 4 ? 1 : yatay < ideal - 4 ? -0.7 : 0;
  if (b.yerde && mac.r() < 0.012 * Z.hareket) g.zipla = true;
  if (!b.yerde && b.vy < 0 && b.havaHak > 0 && mac.r() < 0.02 * Z.hareket) g.zipla = true;
}

function gez(mac, b, g, dt, Z) {
  const bz = b.bz, z = mac.z, ag = yolAgi();
  const amacSec = () => {
    if (b.can < 60) {
      let en = -1, eu = Infinity; for (const c of mac.canlar) if (c.hazirZ <= z + 3) { const u = Math.hypot(c.x - b.x, c.z - b.z); if (u < eu) { eu = u; en = ag.yakin(c.x, c.y, c.z); } }
      if (en >= 0) return en;
    }
    const r = mac.roket;
    if (r.hazirZ <= z + 2 && b.cephane <= 0 && mac.r() < 0.45) return ag.yakin(r.x, r.y, r.z);
    if (bz.sonBilinen && z - bz.sonBilinenZ < 6 && mac.r() < 0.7) return ag.yakin(...bz.sonBilinen);
    // Rastgele bir düşmanın yakınına (kovala) ya da haritada rastgele bir yere.
    const dusman = [...mac.oyuncular.values()].filter(h => h.canli && mac.dusmanMi(b, h));
    if (dusman.length && mac.r() < 0.5) { const h = dusman[Math.floor(mac.r() * dusman.length)]; return ag.yakin(h.x, h.y, h.z); }
    return ag.gezinti[Math.floor(mac.r() * ag.gezinti.length)];
  };
  if (!bz.yol.length || z - bz.yolZ > 5) {
    bz.amac = amacSec(); bz.yolZ = z;
    bz.yol = yolBul(ag.yakin(b.x, b.y, b.z), bz.amac) ?? [];
  }
  const n = bz.yol[0];
  if (n == null) { g.ileri = 0; return; }
  const d = ag.dugum[n], dx = d.x - b.x, dz = d.z - b.z, u = Math.hypot(dx, dz);
  if (u < 0.55 && Math.abs(d.y - b.y) < 1.4) { bz.yol.shift(); return; }
  if (u > 9 && b.yerde) { bz.yolZ = -99; } // yoldan çıktı (düştü, itildi): yeniden kur
  if (b.padT > 0) { g.ileri = 0; return; }
  const yaw = Math.atan2(-dx, -dz), fark = aci(yaw - b.yaw), adim = Math.max(Z.donus, 5) * dt;
  b.yaw = aci(b.yaw + Math.max(-adim, Math.min(adim, fark)));
  b.pitch += (0 - b.pitch) * Math.min(1, dt * 4);
  g.ileri = Math.abs(fark) < 1.2 ? 1 : 0.3; g.sag = 0; g.kos = true;
  if (d.y > b.y + 0.6 && u < 1.8 && b.yerde) g.zipla = true;
}
