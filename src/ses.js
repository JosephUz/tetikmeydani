// Ses efektleri: hepsi WebAudio ile üretilir (dosya yok). Uzaktaki sesler mesafeyle kısılır, sağ/sol kulağa ayrılır.
let ctx = null, ana = null, acik = true, gurultu = null;
try { acik = localStorage.getItem('tetik.ses') !== '0'; } catch { /* yok */ }

function hazirla() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return !!ctx; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
  ctx = new AC(); ana = ctx.createGain(); ana.gain.value = 0.55; ana.connect(ctx.destination);
  const n = ctx.sampleRate * 1.5; gurultu = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = gurultu.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return true;
}
export const sesAcik = () => acik;
export function sesAyarla(v) { acik = v; try { localStorage.setItem('tetik.ses', v ? '1' : '0'); } catch { /* yok */ } if (v) hazirla(); }
export function sesBaslat() { if (acik) hazirla(); }

/** Çıkış düğümü: düzey + sağ/sol (pan −1…1). */
function cikis(duzey, pan = 0) {
  const g = ctx.createGain(); g.gain.value = duzey;
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); p.connect(ana); } else g.connect(ana);
  return g;
}
function patlama(hedef, { sure = 0.15, frek = 1800, q = 0.8, tur = 'lowpass', bas = 1, gecikme = 0 }) {
  const t = ctx.currentTime + gecikme, s = ctx.createBufferSource(); s.buffer = gurultu;
  const f = ctx.createBiquadFilter(); f.type = tur; f.frequency.value = frek; f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(bas, t); g.gain.exponentialRampToValueAtTime(0.001, t + sure);
  s.connect(f); f.connect(g); g.connect(hedef); s.start(t, Math.random()); s.stop(t + sure + 0.02);
}
function ton(hedef, { frek = 440, son = frek, sure = 0.12, tur = 'sine', bas = 0.5, gecikme = 0 }) {
  const t = ctx.currentTime + gecikme, o = ctx.createOscillator(); o.type = tur;
  o.frequency.setValueAtTime(frek, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, son), t + sure);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(bas, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
  o.connect(g); g.connect(hedef); o.start(t); o.stop(t + sure + 0.02);
}

const TARIF = {
  tufek: h => { patlama(h, { sure: 0.09, frek: 2400, bas: 0.9 }); ton(h, { frek: 160, son: 60, sure: 0.08, bas: 0.6 }); },
  keskin: h => { patlama(h, { sure: 0.5, frek: 1400, bas: 1.2 }); ton(h, { frek: 120, son: 35, sure: 0.35, bas: 0.9 }); patlama(h, { sure: 0.9, frek: 500, bas: 0.25, gecikme: 0.06 }); },
  pompali: h => { patlama(h, { sure: 0.28, frek: 900, bas: 1.3 }); ton(h, { frek: 90, son: 40, sure: 0.22, bas: 0.9 }); patlama(h, { sure: 0.06, frek: 3000, tur: 'highpass', bas: 0.25, gecikme: 0.45 }); patlama(h, { sure: 0.06, frek: 2500, tur: 'highpass', bas: 0.25, gecikme: 0.56 }); },
  kilic: h => { patlama(h, { sure: 0.18, frek: 3200, q: 4, tur: 'bandpass', bas: 0.5 }); },
  roket: h => { patlama(h, { sure: 0.45, frek: 700, bas: 0.8 }); ton(h, { frek: 300, son: 120, sure: 0.4, tur: 'sawtooth', bas: 0.12 }); },
  patla: h => { patlama(h, { sure: 1.1, frek: 600, bas: 1.6 }); ton(h, { frek: 80, son: 25, sure: 0.8, bas: 1 }); },
  isabet: h => ton(h, { frek: 1500, son: 1400, sure: 0.05, tur: 'square', bas: 0.08 }),
  kafa: h => { ton(h, { frek: 2200, son: 2100, sure: 0.12, tur: 'triangle', bas: 0.25 }); ton(h, { frek: 3300, sure: 0.1, bas: 0.1, gecikme: 0.02 }); },
  les: h => { ton(h, { frek: 660, sure: 0.1, tur: 'triangle', bas: 0.3 }); ton(h, { frek: 990, sure: 0.18, tur: 'triangle', bas: 0.3, gecikme: 0.08 }); },
  yara: h => { ton(h, { frek: 140, son: 70, sure: 0.12, bas: 0.5 }); patlama(h, { sure: 0.08, frek: 600, bas: 0.4 }); },
  zipla: h => patlama(h, { sure: 0.08, frek: 500, bas: 0.25 }),
  cift: h => { patlama(h, { sure: 0.2, frek: 1200, q: 2, tur: 'bandpass', bas: 0.4 }); ton(h, { frek: 300, son: 600, sure: 0.15, bas: 0.08 }); },
  pad: h => { ton(h, { frek: 180, son: 720, sure: 0.35, tur: 'triangle', bas: 0.35 }); },
  kon: h => patlama(h, { sure: 0.07, frek: 300, bas: 0.35 }),
  adim: h => { patlama(h, { sure: 0.05, frek: 380 + Math.random() * 120, q: 1.2, bas: 0.3 }); patlama(h, { sure: 0.03, frek: 2400, tur: 'highpass', bas: 0.05 }); },
  al: h => { ton(h, { frek: 520, sure: 0.09, tur: 'triangle', bas: 0.25 }); ton(h, { frek: 780, sure: 0.09, tur: 'triangle', bas: 0.25, gecikme: 0.07 }); ton(h, { frek: 1040, sure: 0.14, tur: 'triangle', bas: 0.25, gecikme: 0.14 }); },
  doldur: h => { patlama(h, { sure: 0.04, frek: 2600, tur: 'highpass', bas: 0.3 }); patlama(h, { sure: 0.05, frek: 2000, tur: 'highpass', bas: 0.35, gecikme: 0.35 }); },
  bos: h => patlama(h, { sure: 0.03, frek: 3500, tur: 'highpass', bas: 0.3 }),
  olum: h => { ton(h, { frek: 300, son: 80, sure: 0.6, tur: 'sawtooth', bas: 0.12 }); },
  seri: h => { for (let i = 0; i < 3; i++) ton(h, { frek: 520 * (1 + i * 0.26), sure: 0.12, tur: 'square', bas: 0.08, gecikme: i * 0.08 }); },
};

/** Çal: ad, düzey (0–1), pan (−1 sol, 1 sağ). */
export function cal(ad, duzey = 1, pan = 0) {
  if (!acik || duzey < 0.02 || !hazirla() || !TARIF[ad]) return;
  TARIF[ad](cikis(duzey, pan));
}
/** Dünyadaki bir sesi dinleyiciye göre çal: uzaklık kısar, yan açı pan verir. */
export function calKonum(ad, x, y, z, dinleyici, menzil = 60) {
  const dx = x - dinleyici.x, dz = z - dinleyici.z, u = Math.hypot(dx, y - dinleyici.y, dz);
  const duzey = Math.max(0, 1 - u / menzil) ** 1.5;
  const sag = Math.cos(dinleyici.yaw) * dx - Math.sin(dinleyici.yaw) * dz;
  cal(ad, duzey, u > 0.5 ? sag / u * 0.8 : 0);
}
