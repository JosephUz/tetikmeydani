// Juland kutu karakteri (avatar-veri.js tarifi, Juland avatar.js oranları), silah tutan duruşla.
// Model −z yönüne bakar, boyu ~1,85 blok. Kollar ve baş bakış eğimini (pitch) izler; ölünce yana devrilir.
import * as T from 'three';
import { avatarDuzelt } from './avatar-veri.js';

const kup = new T.BoxGeometry(1, 1, 1), malzemeler = new Map();
const mat = c => { if (!malzemeler.has(c)) malzemeler.set(c, new T.MeshLambertMaterial({ color: c })); return malzemeler.get(c); };
const kirmizilar = new Map();
const kirmiziMat = m => { if (!kirmizilar.has(m)) { const k = m.clone(); k.emissive = new T.Color(0.9, 0.1, 0.05); kirmizilar.set(m, k); } return kirmizilar.get(m); };
function kutu(g, c, x, y, z, sx, sy, sz, golge = true) { const m = new T.Mesh(kup, mat(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = golge; g.add(m); return m; }
const koyu = (hex, k) => '#' + new T.Color(hex).multiplyScalar(k).getHexString();

/** Silah modeli: namlu −z yönünde, kabza başlangıçta. Birinci şahıs görünümü de bunu kullanır. ucu: namlu ağzı. */
export function silahModeli(id, golge = true) {
  const g = new T.Group(), k = (...a) => kutu(g, ...a, golge);
  const demir = '#2e3136', koyuDemir = '#1d1f23', ahsap = '#7a5a34';
  let uc = -0.7;
  if (id === 'tufek') {
    k(demir, 0, 0.02, -0.18, 0.09, 0.13, 0.5); k(koyuDemir, 0, 0.04, -0.58, 0.045, 0.045, 0.34); k(ahsap, 0, -0.01, 0.16, 0.08, 0.12, 0.26);
    k(koyuDemir, 0, -0.12, -0.2, 0.06, 0.16, 0.08).rotation.x = 0.25; k(ahsap, 0, -0.09, 0.0, 0.06, 0.12, 0.07); k(koyuDemir, 0, 0.11, -0.12, 0.03, 0.04, 0.12);
    uc = -0.76;
  } else if (id === 'keskin') {
    k('#3d4a35', 0, 0.02, -0.22, 0.08, 0.12, 0.62); k(koyuDemir, 0, 0.03, -0.78, 0.04, 0.04, 0.55); k('#3d4a35', 0, -0.02, 0.2, 0.07, 0.14, 0.32);
    k(koyuDemir, 0, 0.14, -0.2, 0.07, 0.07, 0.34); k('#5ab0d8', 0, 0.14, -0.375, 0.05, 0.05, 0.01, false); k(koyuDemir, 0, -0.08, -0.02, 0.05, 0.1, 0.06);
    uc = -1.06;
  } else if (id === 'pompali') {
    k(demir, 0, 0.03, -0.25, 0.1, 0.11, 0.6); k(koyuDemir, 0, 0.05, -0.62, 0.075, 0.075, 0.2); k(ahsap, 0, -0.04, -0.45, 0.11, 0.08, 0.26);
    k(ahsap, 0, -0.02, 0.15, 0.09, 0.14, 0.3); k(koyuDemir, 0, -0.08, 0, 0.05, 0.1, 0.06);
    uc = -0.73;
  } else if (id === 'kilic') {
    k('#3a3330', 0, 0, 0.02, 0.05, 0.05, 0.18); k('#6b4a28', 0, 0, -0.08, 0.26, 0.05, 0.05); k('#c9ccd1', 0, 0, -0.5, 0.075, 0.025, 0.78);
    uc = -0.9;
  } else if (id === 'roket') {
    k('#4d5a33', 0, 0.06, -0.2, 0.17, 0.17, 1.0); k('#2b3220', 0, 0.06, -0.71, 0.2, 0.2, 0.06); k('#2b3220', 0, 0.06, 0.31, 0.2, 0.2, 0.06);
    k(koyuDemir, 0, -0.08, -0.05, 0.05, 0.14, 0.06); k(koyuDemir, 0.11, 0.12, -0.25, 0.04, 0.08, 0.14); k('#c7442f', 0, 0.06, -0.745, 0.12, 0.12, 0.01, false);
    uc = -0.75;
  }
  g.userData.uc = uc;
  return g;
}
export const SILAH_SIRASI = ['tufek', 'keskin', 'pompali', 'kilic', 'roket'];

/** Karakter. takimRenk verilirse üst giysi takım rengine boyanır ve kola şerit takılır. */
export function karakterModeli(tarif, takimRenk = null) {
  const a = avatarDuzelt(tarif), grup = new T.Group(), govde = new T.Group();
  grup.add(govde);
  const ten = a.ten, ustR = takimRenk ?? a.ustRenk, ust = a.ust === 'zirh' ? '#8d939a' : ustR, alt = a.altRenk, ayak = '#2a2622';
  const bacaklar = [-1, 1].map(s => {
    const b = new T.Group(); b.position.set(s * 0.13, 0.76, 0); govde.add(b);
    kutu(b, alt, 0, -0.3, 0, 0.24, 0.6, 0.26); kutu(b, ayak, 0, -0.68, -0.02, 0.26, 0.16, 0.3);
    return b;
  });
  const gov = new T.Group(); gov.position.y = 0.8; govde.add(gov); // bel: gövde öne eğilir
  kutu(gov, ust, 0, 0.3, 0, 0.52, 0.7, 0.28);
  kutu(gov, koyu(alt, 0.7), 0, 0, 0, 0.54, 0.08, 0.3);
  if (a.ust === 'ceket') kutu(gov, koyu(ustR, 0.65), 0, 0.32, -0.142, 0.07, 0.64, 0.01);
  if (a.ust === 'zirh') kutu(gov, ustR, 0, 0.38, -0.145, 0.34, 0.34, 0.02);
  if (a.ust === 'cubbe') kutu(gov, ustR, 0, -0.25, 0, 0.56, 0.52, 0.32);
  const kollar = [-1, 1].map(s => {
    const k = new T.Group(); k.position.set(s * 0.36, 0.62, 0); gov.add(k);
    const kolRengi = a.ust === 'tisort' ? ten : ust;
    kutu(k, kolRengi, 0, -0.3, 0, 0.19, 0.6, 0.22);
    if (a.ust === 'tisort') kutu(k, ustR, 0, -0.1, 0, 0.21, 0.22, 0.24);
    if (a.ust === 'zirh') kutu(k, ustR, s * 0.02, -0.03, 0, 0.26, 0.14, 0.28);
    if (takimRenk) kutu(k, takimRenk, 0, -0.22, 0, 0.215, 0.07, 0.245, false);
    kutu(k, ten, 0, -0.62, 0, 0.18, 0.12, 0.2);
    return k;
  });
  const bas = new T.Group(); bas.position.set(0, 0.66, 0); gov.add(bas);
  kutu(bas, ten, 0, 0.21, 0, 0.42, 0.42, 0.42);
  for (const s of [-1, 1]) { kutu(bas, '#24211f', s * 0.09, 0.23, -0.212, 0.07, 0.08, 0.01, false); kutu(bas, '#ffffff', s * 0.09 + s * 0.018, 0.245, -0.214, 0.025, 0.03, 0.005, false); }
  kutu(bas, koyu(ten, 0.78), 0, 0.12, -0.212, 0.1, 0.025, 0.01, false);
  const sac = a.sacRenk, sapkali = a.sapka !== 'yok';
  if (a.sac !== 'kel') {
    kutu(bas, sac, 0, 0.41, 0, 0.45, 0.08, 0.46); kutu(bas, sac, 0, 0.28, 0.2, 0.44, 0.28, 0.06);
    for (const s of [-1, 1]) kutu(bas, sac, s * 0.215, 0.3, 0.07, 0.03, 0.16, 0.3);
    if (a.sac === 'dik' && !sapkali) for (const [x, z, r] of [[-0.12, -0.1, 0.3], [0.05, -0.12, -0.2], [0.14, 0.05, 0.25], [-0.06, 0.1, -0.3]]) kutu(bas, sac, x, 0.48, z, 0.1, 0.14, 0.1).rotation.z = r;
    if (a.sac === 'uzun') { kutu(bas, sac, 0, 0.04, 0.2, 0.44, 0.44, 0.07); for (const s of [-1, 1]) kutu(bas, sac, s * 0.215, 0.1, 0.1, 0.03, 0.36, 0.22); }
    if (a.sac === 'atkuyrugu') { kutu(bas, sac, 0, 0.3, 0.26, 0.12, 0.1, 0.1); kutu(bas, sac, 0, 0.1, 0.3, 0.11, 0.32, 0.1).rotation.x = 0.25; }
  }
  const sr = a.sapkaRenk;
  if (a.sapka === 'kep') { kutu(bas, sr, 0, 0.45, 0.01, 0.46, 0.12, 0.46); kutu(bas, sr, 0, 0.41, -0.3, 0.4, 0.035, 0.2); }
  if (a.sapka === 'bere') { kutu(bas, sr, 0, 0.46, 0.01, 0.46, 0.16, 0.46); kutu(bas, koyu(sr, 1.25), 0, 0.58, 0, 0.12, 0.1, 0.12); kutu(bas, koyu(sr, 0.8), 0, 0.38, 0.01, 0.47, 0.04, 0.47); }
  if (a.sapka === 'kask') { kutu(bas, sr, 0, 0.4, 0, 0.5, 0.2, 0.5); kutu(bas, koyu(sr, 0.75), 0, 0.3, -0.02, 0.54, 0.04, 0.56); kutu(bas, '#e6e1d3', 0, 0.46, -0.252, 0.08, 0.08, 0.01); }
  if (a.sapka === 'fotr') { kutu(bas, sr, 0, 0.44, 0, 0.68, 0.04, 0.68); kutu(bas, sr, 0, 0.55, 0, 0.42, 0.2, 0.42); kutu(bas, koyu(sr, 0.55), 0, 0.48, 0, 0.43, 0.05, 0.43); }
  if (a.sapka === 'tac') {
    for (const [x, z, sx, sz] of [[0, -0.21, 0.44, 0.03], [0, 0.21, 0.44, 0.03], [-0.21, 0, 0.03, 0.44], [0.21, 0, 0.03, 0.44]]) kutu(bas, '#e8c547', x, 0.47, z, sx, 0.1, sz);
    for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2], [0, -0.21]]) kutu(bas, '#e8c547', x, 0.56, z, 0.06, 0.08, 0.06);
  }
  if (a.sapka === 'silindir') { kutu(bas, '#1f1f22', 0, 0.43, 0, 0.58, 0.03, 0.58); kutu(bas, '#1f1f22', 0, 0.63, 0, 0.38, 0.38, 0.38); kutu(bas, sr, 0, 0.49, 0, 0.39, 0.07, 0.39); }
  if (a.aksesuar === 'gozluk') { for (const s of [-1, 1]) kutu(bas, '#141414', s * 0.09, 0.235, -0.222, 0.13, 0.09, 0.02); kutu(bas, '#141414', 0, 0.25, -0.222, 0.06, 0.02, 0.02); }
  if (a.aksesuar === 'atki') { kutu(gov, sr, 0, 0.65, 0, 0.46, 0.1, 0.34); kutu(gov, sr, 0.12, 0.48, -0.16, 0.1, 0.3, 0.04); }
  if (a.aksesuar === 'pelerin') { const p = kutu(gov, sr, 0, 0.2, 0.18, 0.54, 0.92, 0.035); p.rotation.x = 0.1; }

  let silahId = null, silahG = null, faz = 0, parla = 0, tepme = 0, olu = 0, kilicVur = 0, dusYon = 1;
  const silahTak = id => {
    if (id === silahId) return; silahId = id;
    if (silahG) kollar[1].remove(silahG);
    silahG = silahModeli(id); silahG.position.set(0, -0.64, -0.04); silahG.rotation.x = -Math.PI / 2; kollar[1].add(silahG);
  };
  silahTak('tufek');
  return {
    grup, tarif: a, bas,
    silah: silahTak,
    /** Namlu ağzının dünya konumu (iz çizgisi başlangıcı). */
    namlu(v) { if (!silahG) return grup.getWorldPosition(v); v.set(0, silahG.userData.uc, 0.02).applyMatrix4(silahG.matrixWorld); return v; },
    vuruldu() { if (parla <= 0) grup.traverse(m => { if (m.isMesh && m.material?.color) { m.userData.asil = m.material; m.material = kirmiziMat(m.material); } }); parla = 0.12; },
    ates() { if (silahId === 'kilic') kilicVur = 0.3; else tepme = 1; },
    /** hiz: yatay hız; havada; pitch; canli; bit 4 çift zıplama. */
    guncelle(dt, hiz, havada, pitch, canli, bit = 0) {
      if (parla > 0 && (parla -= dt) <= 0) grup.traverse(m => { if (m.userData.asil) { m.material = m.userData.asil; delete m.userData.asil; } });
      if (!canli) {
        if (olu === 0) dusYon = Math.random() < 0.5 ? -1 : 1;
        olu = Math.min(1, olu + dt * 2.6); const e = olu * olu;
        govde.rotation.z = dusYon * e * Math.PI / 2; govde.position.y = e * 0.28; govde.position.x = -dusYon * e * 0.1;
        for (const k of kollar) k.rotation.x *= 0.9;
        return;
      }
      if (olu) { olu = 0; govde.rotation.set(0, 0, 0); govde.position.set(0, 0, 0); }
      faz += dt * Math.min(hiz, 10) * 1.7;
      const genlik = havada ? 0 : Math.min(1, hiz / 4) * 0.7, s = Math.sin(faz) * genlik;
      bacaklar[0].rotation.x = havada ? -0.5 : s; bacaklar[1].rotation.x = havada ? 0.3 : -s;
      if (bit & 4) bacaklar[0].rotation.x = bacaklar[1].rotation.x = 1.0;
      gov.rotation.x = 0;
      // Nişan duruşu: sağ kol silahla öne, sol kol desteğe; ikisi de bakışı izler. Baş da eğilir.
      const p = Math.max(-1.2, Math.min(1.2, pitch)) - gov.rotation.x;
      tepme = Math.max(0, tepme - dt * 9);
      kollar[1].rotation.set(Math.PI / 2 + p + tepme * 0.18, 0, 0);
      kollar[0].rotation.set(Math.PI / 2 + p - 0.12, 0, 0.62); kollar[0].position.z = -0.06;
      if (silahId === 'kilic') {
        kollar[0].rotation.set(-s * 0.7, 0, 0); kollar[0].position.z = 0;
        if (kilicVur > 0) { kilicVur -= dt; const t = 1 - kilicVur / 0.3; kollar[1].rotation.set(Math.PI / 2 + p + 0.9 - t * 1.8, 0, -0.4 + t * 0.8); }
        else kollar[1].rotation.set(0.9 + p * 0.5, 0, 0);
      }
      bas.rotation.x = p * 0.7;
      govde.position.y = genlik ? Math.abs(Math.cos(faz)) * 0.04 : 0;
    },
  };
}
