// Dış Mahalle'nin görünüşü: Juland'daki gibi blok blok (juland/src/voksel.js'in sadeleşmişi). Bloklar ızgaraya yazılır,
// yalnız görünen yüzler tek geometride toplanır; köşe gölgesi (AO) köşe renklerine işlenir, her bloğa küçük ton farkı.
// Cam ayrı, yarı saydam ağda. Zemin katmanı (y = −1) sokaklar, meydan ve çim; mahallenin dışı düz çim (gorunum.js).
import * as T from 'three';
import { B, BLOK, opak } from './bloklar.js';
import { MAHALLE, MAHALLE_KUTULARI, MAHALLE_ZEMIN } from './mahalle.js';

const EKSEN = [[0, 1, 2], [1, 2, 0], [2, 0, 1]]; // normal ekseni a, yüz düzlemi b × c = a
const KOSE = { 1: [[0, 0], [1, 0], [1, 1], [0, 1]], [-1]: [[0, 0], [0, 1], [1, 1], [1, 0]] };
const AO = [.48, .66, .83, 1];
const hash = (x, z, s) => { let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(s, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** Mahallenin blok ağları: [opak, cam]. */
export function mahalleAglari() {
  const X0 = MAHALLE.x0 - 1, Z0 = MAHALLE.z0 - 1, Y0 = -1;
  const EN = MAHALLE.x1 - MAHALLE.x0 + 3, BOY = MAHALLE.z1 - MAHALLE.z0 + 3;
  const YUK = Math.max(...MAHALLE_KUTULARI.map(k => k.b[1])) + 2;
  const v = new Uint8Array(EN * BOY * YUK), ix = (x, y, z) => (x - X0) + EN * ((z - Z0) + BOY * (y - Y0));
  const icinde = (x, z) => x >= MAHALLE.x0 && x <= MAHALLE.x1 && z >= MAHALLE.z0 && z <= MAHALLE.z1;
  // Zemin katmanı: yazılmayan yer çim; sonra bloklar.
  for (let z = MAHALLE.z0; z <= MAHALLE.z1; z++) for (let x = MAHALLE.x0; x <= MAHALLE.x1; x++) v[ix(x, -1, z)] = B.CIM;
  for (const [x, z, t] of MAHALLE_ZEMIN) if (icinde(x, z)) v[ix(x, -1, z)] = t;
  for (const k of MAHALLE_KUTULARI) for (let y = k.a[1]; y < k.b[1]; y++) for (let z = k.a[2]; z < k.b[2]; z++) for (let x = k.a[0]; x < k.b[0]; x++) v[ix(x, y, z)] = k.t;
  // Izgaranın dışı: zeminin altı dolu, zemin katmanında çim sürer (kenarda yan yüz çizilmez), üstü hava.
  const al = (x, y, z) => {
    if (y < Y0) return B.TOPRAK;
    if (x < X0 || z < Z0 || x >= X0 + EN || z >= Z0 + BOY || y >= Y0 + YUK) return y === -1 ? B.CIM : B.HAVA;
    const t = v[ix(x, y, z)]; return t || (y === -1 ? B.CIM : B.HAVA);
  };
  const op = (x, y, z) => opak(al(x, y, z)) ? 1 : 0;
  const tampon = { opak: yeni(), cam: yeni() }, renk = new T.Color(), q = [0, 0, 0];
  for (let y = Y0; y < Y0 + YUK; y++) for (let z = Z0; z < Z0 + BOY; z++) for (let x = X0; x < X0 + EN; x++) {
    const t = v[ix(x, y, z)]; if (!t) continue;
    const tb = t === B.CAM ? tampon.cam : tampon.opak, saydam = BLOK[t].saydam, ton = 1 + (hash(x + y * 31, z, 3) - .5) * .07;
    for (let a = 0; a < 3; a++) for (const s of [1, -1]) {
      q[0] = x; q[1] = y; q[2] = z; q[a] += s;
      const n = al(q[0], q[1], q[2]);
      if (saydam ? (n === t || opak(n)) : opak(n)) continue;
      const [, b, c] = EKSEN[a], kose = KOSE[s], ao = [3, 3, 3, 3];
      if (!saydam) for (let i = 0; i < 4; i++) {
        const [u, w] = kose[i], db = u ? 1 : -1, dc = w ? 1 : -1;
        const k1 = q.slice(), k2 = q.slice(), k3 = q.slice(); k1[b] += db; k2[c] += dc; k3[b] += db; k3[c] += dc;
        const s1 = op(...k1), s2 = op(...k2), s3 = op(...k3);
        ao[i] = s1 && s2 ? 0 : 3 - s1 - s2 - s3;
      }
      renk.setHex(BLOK[t].renk[a === 1 ? (s > 0 ? 0 : 2) : 1]).multiplyScalar(ton * (a === 0 ? .94 : 1));
      const taban = tb.konum.length / 3;
      for (let i = 0; i < 4; i++) {
        const p = [x, y, z]; p[a] += s > 0 ? 1 : 0; p[b] += kose[i][0]; p[c] += kose[i][1];
        const g = saydam ? 1 : AO[ao[i]];
        tb.konum.push(...p); tb.normal.push(a === 0 ? s : 0, a === 1 ? s : 0, a === 2 ? s : 0); tb.renk.push(renk.r * g, renk.g * g, renk.b * g);
      }
      if (saydam || ao[0] + ao[2] >= ao[1] + ao[3]) tb.indis.push(taban, taban + 1, taban + 2, taban, taban + 2, taban + 3);
      else tb.indis.push(taban + 1, taban + 2, taban + 3, taban + 1, taban + 3, taban);
    }
  }
  const mat = {
    opak: new T.MeshLambertMaterial({ vertexColors: true }),
    cam: new T.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: .42, depthWrite: false }),
  };
  return Object.entries(tampon).filter(([, tb]) => tb.indis.length).map(([ad, tb]) => {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(tb.konum, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(tb.normal, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(tb.renk, 3));
    g.setIndex(tb.konum.length / 3 > 65535 ? new T.Uint32BufferAttribute(tb.indis, 1) : new T.Uint16BufferAttribute(tb.indis, 1));
    g.computeBoundingSphere();
    const m = new T.Mesh(g, mat[ad]);
    m.castShadow = ad === 'opak'; m.receiveShadow = true; m.renderOrder = ad === 'opak' ? 0 : 1;
    return m;
  });
}
const yeni = () => ({ konum: [], normal: [], renk: [], indis: [] });
