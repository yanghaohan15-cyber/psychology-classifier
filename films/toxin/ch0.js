/* ch0.js — 00 序 + 片名。
 * 一瓶毒药落进光里；右边滑进一张合同，三条一条条打出来，最后签上名。药液里升起一片绿色光点，聚成片名。 */
(function (G) {
'use strict';
const { W, H, clamp, lerp, seg, smooth, ss, E, fade, hash, rng, rgba, mix } = G.VK;
const K = G.VKit, X = G.TX, Wd = G.TW, C = X.C, CH = G.CH;
CH.parts = CH.parts || [];

const T = { drop: .6, land: 1.35, card: 4.6, sign: 20.9, out: 22.5, rise: 22.75, title: 23.6, tEnd: 34.8 };
const LABEL0 = { top: 'N° 1983 · TOXIN', main: '毒药', sub: '饮后难受一日', size: 10.5 };
CH.LABEL0 = LABEL0;

/* 合同：一行一句，开始打字的时刻和字速（字/秒） */
const CARD = { x: 1384, y: 520, w: 640, h: 520 };
const LINES = [
  { str: '一、此瓶毒药，饮下后难受一日；', at: 5.1, cps: 13 },
  { str: '　　不致命，无后遗症。', at: 6.45, cps: 13 },
  { str: '二、酬金 $1,000,000。', at: 9.75, cps: 12, hl: ['$1,000,000'] },
  { str: '　　条件：今晚 0:00 打算明天 15:00 饮下。', at: 13.95, cps: 16, hl: ['0:00', '15:00'] },
  { str: '三、明早 9:00 付款；', at: 18.4, cps: 14, hl: ['9:00'] },
  { str: '　　付款后，饮或不饮，悉听尊便。', at: 19.35, cps: 15 },
  { str: '立约人：', at: 20.55, cps: 14 },
];
const spans = (str, keys) => (keys || []).map(k => { const cs = Array.from(str), ks = Array.from(k); for (let i = 0; i + ks.length <= cs.length; i++) if (cs.slice(i, i + ks.length).join('') === k) return [i, i + ks.length, '#4A3206']; return null; }).filter(Boolean);

/* 一张合同：tt 是"打字时钟"（传一个很大的数就是全部打完），signK 是签名写到哪 */
CH.drawContract = function (x, cx, cy, rot, a, tt, signK, seed, s = 1) {
  if (a <= 0) return;
  x.save(); x.translate(cx, cy); x.scale(s, s); x.translate(-cx, -cy);
  X.paperCard(x, cx, cy, CARD.w, CARD.h, { a, rot, seed: 3 + seed });
  x.globalAlpha = a; x.translate(cx, cy); x.rotate(rot);
  x.font = G.VK.fontOf('serif', 36); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = rgba(C.inkDark, .9); x.letterSpacing = '18px'; x.fillText('合同', 9, -CARD.h / 2 + 78);
  x.font = G.VK.fontOf('mono', 13); x.letterSpacing = '6px'; x.fillStyle = rgba(C.inkDark, .55); x.fillText('CONTRACT', 3, -CARD.h / 2 + 112); x.letterSpacing = '0px';
  LINES.forEach((L, i) => X.typed(x, L.str, -CARD.w / 2 + 52, -CARD.h / 2 + 168 + i * 47, tt, L.at, L.cps, { size: 24, hl: spans(L.str, L.hl), a: 1, cursor: tt < 999 }));
  X.signature(x, -CARD.w / 2 + 178, -CARD.h / 2 + 168 + 6 * 47 + 2, .95, signK, 1, seed);
  x.restore();
};

CH.parts.push({
  from: 0, to: 37.8,
  state(n, t, c, st) {
    if (n !== 1) return;
    /* 落下：自由落体，落地弹两下 */
    let dy = 0; if (t < T.land) dy = -1150 * (1 - Math.pow(seg(t, T.drop, T.land), 2));
    else if (t < T.land + .2) dy = -11 * Math.sin(Math.PI * seg(t, T.land, T.land + .2));
    else if (t < T.land + .33) dy = -3 * Math.sin(Math.PI * seg(t, T.land + .2, T.land + .33));
    st.vialDy = dy * c.S / 2.4;
    st.a = ss(t, T.drop - .05, T.drop + .1);
    const sl = t > T.land ? .1 * Math.exp(-(t - T.land) / .55) * Math.sin(13 * (t - T.land)) : 0;
    st.vialA = 1 - ss(t, T.rise + .2, T.title + .5) + ss(t, T.tEnd - .3, T.tEnd + .7);
    st.vial = Object.assign(st.vial || {}, { slosh: sl, label: LABEL0, glow: 1 + .8 * ss(t, T.rise - .4, T.rise + .3) * (1 - ss(t, T.title, T.title + 1)) });
    st.moonA = 0;
  },
  overlay(fr, t, c) {
    if (t > 24) return;
    /* 头顶一盏灯：药瓶周围一团很淡的冷光 */
    const lamp = ss(t, .1, 1.0) * (1 - ss(t, T.rise, T.title));
    if (lamp > 0) { fr.glow(760, 560, 720, '#35587A', .1 * lamp); fr.glow(760, 300, 380, '#5A86AE', .05 * lamp); }
    if (t > T.land && t < T.land + .1) fr.sfx(T.land, 'glass', { gain: 1 });
    /* 合同：滑进来，三条一条条打出来，签名 */
    const cin = E.out3(seg(t, T.card, T.card + .7)), cout = E.in2(seg(t, T.out, T.out + .8));
    const ca = ss(t, T.card, T.card + .3) * (1 - ss(t, T.out + .2, T.out + .8));
    if (ca <= 0) return;
    const cx = lerp(2300, CARD.x, cin) + 700 * cout, cy = CARD.y, rot = lerp(.06, -.016, cin);
    if (t >= T.card && t < T.card + .05) fr.sfx(T.card, 'paper', { gain: .8 });
    fr.U.push(x => CH.drawContract(x, cx, cy, rot, ca, t, ss(t, T.sign, T.sign + 1.1), 4, 1));
    /* 金额打出来的那一下，纸上透一点金光；签名的笔尖 */
    const mk = ss(t, 10.4, 10.9) * (1 - ss(t, 13.0, 14.0)) * ca;
    if (mk > 0) fr.glow(cx - 40, cy - CARD.h / 2 + 168 + 2 * 47, 160, C.gold, .16 * mk);
    LINES.forEach(L => { const n = Array.from(L.str).length; for (let i = 0; i < n; i += 2) { const at = L.at + i / L.cps; if (t >= at && t < at + .05) fr.sfx(at, 'type', { gain: .5, pitch: i % 5 }); } });
    if (t >= T.sign && t < T.sign + .05) fr.sfx(T.sign, 'pen', { gain: .9, dur: 1.0 });
  },
});

/* ---------- 片名：药液里升起的光点聚成"毒药谜题" ---------- */
const TITLE = { str: '毒药谜题', cx: 960, cy: 430, font: 'serifl', size: 170, track: 54 };
let PTS = null;
function titlePoints() {
  if (PTS) return PTS;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d', { willReadFrequently: true });
  x.font = G.VK.fontOf(TITLE.font, TITLE.size); x.letterSpacing = TITLE.track + 'px'; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillStyle = '#fff';
  const w = x.measureText(TITLE.str).width - TITLE.track; x.fillText(TITLE.str, TITLE.cx - w / 2, TITLE.cy);
  const x0 = Math.floor(TITLE.cx - w / 2 - 10), y0 = Math.floor(TITLE.cy - TITLE.size * .75), ww = Math.ceil(w + 20), hh = Math.ceil(TITLE.size * 1.5);
  const d = x.getImageData(x0, y0, ww, hh).data, pts = [];
  for (let yy = 0; yy < hh; yy += 2) for (let xx = 0; xx < ww; xx += 2) if (d[(yy * ww + xx) * 4 + 3] > 110) pts.push([x0 + xx, y0 + yy]);
  const r = rng(1983); for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
  /* 起点在药液里：特写时瓶子站在 (760, 900)，高 600 */
  PTS = pts.slice(0, 3200).map(p => {
    const u = (r() * 2 - 1) * 18, v = -6 - r() * 50, sx = 760 + u * 6, sy = CH.HERO_Y + v * 6;
    return { x: p[0], y: p[1], sx, sy, mx: lerp(sx, p[0], .35) + (r() - .5) * 260, my: Math.min(sy, p[1]) - 140 - r() * 220, d: r(), tw: r() };
  });
  return PTS;
}
CH.title = function (fr, t) {
  if (t < T.rise - .1 || t > T.tEnd + .1) return;
  const a = 1 - ss(t, T.tEnd - .8, T.tEnd), x = fr.x, pts = titlePoints();
  const solid = ss(t, 26.0, 26.9);
  /* 光点：先从药液里升起，闪过以后聚成字 */
  x.save(); x.globalCompositeOperation = 'lighter';
  for (const p of pts) {
    const k = E.io3(seg(t, T.rise + p.d * .9, T.rise + p.d * .9 + 2.7)); if (k <= 0) continue;
    const q = 1 - k, px = q * q * p.sx + 2 * q * k * p.mx + k * k * p.x + Math.sin(t * 2.2 + p.tw * 9) * 5 * q, py = q * q * p.sy + 2 * q * k * p.my + k * k * p.y + Math.cos(t * 1.7 + p.tw * 7) * 5 * q;
    const al = (.4 + .45 * k) * ss(k, 0, .08) * (1 - solid * .9) * a * (.7 + .3 * Math.sin(t * 6 + p.tw * 20));
    const col = k < .5 ? mix('#5CE6A0', '#CFE9F5', k * 2) : '#CFE9F5';
    x.fillStyle = rgba(col, al); x.fillRect(px - 1.1, py - 1.1, 2.2, 2.2);
  }
  x.restore();
  if (solid > 0) fr.text(TITLE.str, TITLE.cx, TITLE.cy, { font: TITLE.font, size: TITLE.size, track: TITLE.track, color: C.ink, a: solid * a, glow: 16, glowColor: '#BFE6F2', glowA: .35 });
  /* 母题：一条尺子，左端一轮月亮（今晚），右端一个太阳（明天下午），一个光点从月亮跑向太阳 */
  const la = ss(t, 24.3, 25.3) * a, ly = 604, lx0 = 610, lx1 = 1310, grow = E.out3(seg(t, 24.3, 25.5));
  if (la > 0) {
    fr.line(lx0, ly, lerp(lx0, lx1, grow), ly, { w: 1.2, color: C.line, a: .5 * la, cap: 'butt' });
    for (let i = 0; i <= 15; i++) { const tx = lerp(lx0, lx1, i / 15); if (tx > lerp(lx0, lx1, grow)) break; fr.line(tx, ly - (i % 5 ? 4 : 8), tx, ly + (i % 5 ? 4 : 8), { w: 1, color: C.line, a: .4 * la, cap: 'butt' }); }
    fr.U.push(xx => X.moon(xx, lx0, ly - 46, 17, .92, { a: la, seed: 5 })); X.moonGlow(fr, lx0, ly - 46, 17, .92, la);
    X.sun(fr, lx1, ly - 46, 12, la * ss(t, 25.0, 25.6), t);
    const per = 2.6, ph = ((t - 25.4) % per + per) % per / per;
    if (t > 25.4) { const k = E.io3(clamp(ph / .8)), px = lerp(lx0, lx1, k); fr.comet(px, ly, 150, 9, C.iceHi, la * Math.sin(Math.PI * clamp(ph / .8)), 0); }
    fr.text('今晚', lx0, ly + 34, { font: 'serifr', size: 20, track: 3, color: C.label, a: la * .9 }); fr.text('明天下午', lx1, ly + 34, { font: 'serifr', size: 20, track: 3, color: C.label, a: la * .9 });
  }
  fr.text('今晚的真心，明天还算数吗', 966, 700, { font: 'serifm', size: 40, track: 16, color: '#C9D3DC', a: ss(t, 27.4, 28.3) * a, glow: 8, glowA: .25 });
  fr.text('THE TOXIN PUZZLE   ·   GREGORY S. KAVKA, 1983', 960, 758, { font: 'mono', size: 15, track: 5.5, color: C.label, a: ss(t, 28.0, 28.9) * a });
  if (t >= T.rise && t < T.rise + .05) fr.sfx(T.rise, 'rise', { dur: .9, gain: .7 });
  if (t >= T.title && t < T.title + .05) { fr.sfx(T.title, 'bloom', { gain: .9 }); fr.sfx(T.title + .02, 'shimmer', { gain: 1.2 }); }
};
})(window);
