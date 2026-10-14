/* ch4.js — 04 来 THE FUTURE（150–190s）+ 尾声（190–212s）
 * 只剩一个午夜 → 月亮一轮接一轮往右亮起（生活里午夜每天都来）→ 一条弧线从明天的药瓶连到后天的零点，一只虚线空瓶顺着它飞过去 →
 * 1/3 调小药量（读数 26 → 77）→ 2/3 奖励挪到喝完之后 → 3/3 喝下去，空瓶落回原处，奖励到账 →
 * 日子快进：空瓶一瓶比一瓶高，月亮盈回来 → 拉远：满瓶还在，但不再是全部 →
 * 尾声：推回第 61 晚的满瓶，回到第 1 镜的构图；身后是这六十个日子；零点，读数 78。 */
(function (G) {
'use strict';
const { W, H, clamp, lerp, seg, smooth, ss, E, fade, hash, rng, rgba, mix } = G.VK;
const K = G.VKit, X = G.TX, Wd = G.TW, C = X.C, CH = G.CH;
const { hOf, SX, READ, DOSE, pct } = Wd;

const T = { in: 150.0, focus: 150.6, future: 154.2, cite: 155.0, arc: 158.6, ghost: 163.0, step1: 167.6, shrink: 168.0, step2: 172.4, slide: 173.0, step3: 176.9,
  lift: 177.2, gulp: 177.95, down: 178.4, land: 179.0, paid: 179.3, lapse: 180.4, wide: 184.8, coda: 190.0, moon: 198.4, ripple: 200.4, card: 204.0, end: 212 };
const focusK = t => ss(t, T.focus, T.focus + 1.6) * (1 - ss(t, T.lapse, T.lapse + 2.2));
/* 第 31 晚那瓶：升出画面（你喝了），再落回来，已经空了 */
function liftDy(t) {
  if (t < T.lift || t > T.land + .3) return 0;
  if (t < T.down) return -1150 * E.in3(seg(t, T.lift, T.lift + .7));
  if (t < T.land) return -1150 * (1 - E.out3(seg(t, T.down, T.land)));
  return -10 * Math.sin(Math.PI * seg(t, T.land, T.land + .22));
}

CH.parts.push({
  from: 149.8, to: 212.1,
  state(n, t, c, st) {
    const A = CH.appear(n), fk = focusK(t);
    if (n <= 30) {                                                       // 过去：满瓶，零点的硬币照旧
      st.coinA = 1; st.coinOk = READ[n] >= .5;
      st.vialA = st.moonA = st.glowK = 1 - .8 * fk;
      if (n === 1) st.vial = { label: Wd.labelOf(1, { modal: '明天开始' }) };
      return;
    }
    if (n === 31) {
      const sub = t < T.shrink + .5 ? '30 分钟' : '5 分钟';
      st.vial = { label: Wd.labelOf(31, { modal: '明天', sub }), mark: lerp(Math.pow(Wd.R[31], 1), 1, E.io3(seg(t, T.shrink + 1.0, T.shrink + 1.8))), markA: ss(t, T.arc, T.arc + .4) * (1 - ss(t, T.lift - .3, T.lift)), dash: t * 6 };
      st.vialDy = liftDy(t);
      st.coinA = ss(t, T.lapse, T.lapse + .6); st.coinX = SX(c, hOf(31, 15)); st.coinY = c.yr - CH.vialPos(c, 31, t)[2] - 16 * Math.max(.7, c.S);
      return;
    }
    if (n <= 60) {                                                      // 将来：先是一圈没亮的月亮，到了那天才亮
      const fut = ss(t, T.future + (n - 32) * .28, T.future + (n - 32) * .28 + .4);
      if (t < A) { st.a = fut * (n <= 38 ? 1 : 0); st.vialA = 0; st.moonK = 0; st.glowK = n === 32 ? .5 * ss(t, T.ghost + .9, T.ghost + 1.5) : 0; st.moonXY = Wd.moonXY(c, n, .5); return; }
      st.a = 1; st.coinA = ss(t, A + .5, A + .7); st.coinX = SX(c, hOf(n, 15)); st.coinY = c.yr - CH.vialPos(c, n, t)[2] - 16 * Math.max(.7, c.S);
      st.vial = { label: Wd.labelOf(n), residue: .7 };
      return;
    }
    /* 第 61 晚：尾声的那一瓶 */
    st.vial = { label: Wd.labelOf(61, { modal: '明天', sub: '30 分钟' }), mark: 1, markA: ss(t, T.moon + .8, T.moon + 1.4) * (1 - ss(t, T.card, T.card + .6)), dash: t * 6, refl: .2 };
    st.vialA = 1 - .93 * ss(t, T.card, T.card + .8);
    st.moonA = 0;
  },
  overlay(fr, t, c) {
    const fk = focusK(t);
    /* 钟点 */
    const la = ss(t, 152.0, 152.8) * (1 - ss(t, 154.0, 154.6)) + ss(t, 159.2, 159.8) * (1 - ss(t, T.lapse, T.lapse + .5));
    Wd.tickLabel(fr, c, hOf(31), '第 31 晚', '0:00', la); Wd.tickLabel(fr, c, hOf(31, 15), '下午', '15:00', la); Wd.tickLabel(fr, c, hOf(32), '第 32 晚', '0:00', la);
    /* 将来的月亮：一圈细线，还没亮 */
    for (let n = 32; n <= 38; n++) {
      const a = ss(t, T.future + (n - 32) * .28, T.future + (n - 32) * .28 + .4) * (1 - ss(t, CH.appear(n) - .2, CH.appear(n))); if (a <= 0) continue;
      const [mx, my, mr] = Wd.moonXY(c, n, .5); fr.circle(mx, my, mr, { color: C.ice, w: 1.2, a: .5 * a, dash: [4, 5] });
      const at = T.future + (n - 32) * .28; if (t >= at && t < at + .05) fr.sfx(at, 'tick', { pitch: 3 + (n - 32), gain: .45 });
    }
    const ca = ss(t, T.cite, T.cite + .6) * (1 - ss(t, 162.4, 163.0));
    if (ca > 0) fr.text('每一次选择，都是下一次的先例  ——  G. AINSLIE, BREAKDOWN OF WILL, 2001', 960, 132, { font: 'serifr', size: 23, track: 3, color: C.label, a: ca });
    /* 第 31 晚的表盘：读数 26 → 77 */
    const [m31x, m31y, m31r] = CH.moonPos(c, 31, t), ga = ss(t, 159.4, 160.0) * (1 - ss(t, T.lapse, T.lapse + .4)), v31 = CH.readOf(31, t) * 100;
    if (ga > 0) {
      X.gaugeRing(fr, m31x, m31y, m31r * 1.62, v31, { a: ga, numSize: 20 });
      fr.text(String(Math.round(v31)), m31x, m31y + m31r * 1.62 + 6, { font: 'latin', size: 44, color: C.iceHi, a: ga, glow: 10, glowA: .3 });
      if (t >= T.shrink + 1.0 && t < T.shrink + 1.05) fr.sfx(T.shrink + 1.0, 'rise', { dur: 1.0, gain: .6 });
    }
    /* 第 33 镜：一条弧线从明天下午的药瓶连到后天零点的月亮 */
    const [v31x, v31y, v31h] = CH.vialPos(c, 31, t), [m32x, m32y, m32r] = Wd.moonXY(c, 32, .5);
    const arcA = ss(t, T.arc, T.arc + .3) * (1 - ss(t, T.step1 - .2, T.step1 + .3));
    const arcPts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; arcPts.push([lerp(v31x + 30, m32x - m32r - 6, u), lerp(v31y - v31h * .72, m32y, u) - Math.sin(Math.PI * u) * 170]); }
    if (arcA > 0) {
      const k = E.out3(seg(t, T.arc, T.arc + 1.1)); fr.poly(arcPts, { k, color: C.ice, w: 1.6, a: .65 * arcA, dash: [7, 7], dashOff: -t * 24 });
      if (k > .95) { const [ex, ey, ang] = fr.along(arcPts, 1); fr.poly([[ex - 14 * Math.cos(ang - .45), ey - 14 * Math.sin(ang - .45)], [ex, ey], [ex - 14 * Math.cos(ang + .45), ey - 14 * Math.sin(ang + .45)]], { color: C.iceHi, w: 2, a: .8 * arcA }); }
      if (t >= T.arc && t < T.arc + .05) fr.sfx(T.arc, 'rise', { dur: 1.1, gain: .5 });
    }
    /* 第 34 镜：一只虚线画的空瓶顺着弧线飞到后天的零点，月亮跟着亮了一圈 */
    const gk = seg(t, T.ghost, T.ghost + 1.6);
    if (gk > 0 && gk < 1) {
      const [gx, gy] = fr.along(arcPts, E.io3(gk)), sz = v31h * lerp(1, .3, E.io3(gk));
      X.ghostVial(fr.x, gx, gy + sz * .5, sz, Math.sin(Math.PI * Math.min(1, gk * 1.3)) * .9, t * 8);
      if (t >= T.ghost && t < T.ghost + .05) fr.sfx(T.ghost, 'shimmer', { gain: 1 });
    }
    const pv = ss(t, T.ghost + 1.4, T.ghost + 1.9) * (1 - ss(t, T.step1, T.step1 + .5));
    if (pv > 0) { fr.glow(m32x, m32y, m32r * 3, C.ice, .35 * pv); fr.circle(m32x, m32y, m32r * 1.25, { color: C.iceHi, w: 1.5, a: .6 * pv }); }
    /* 三步：顶上一排标签，走到哪亮到哪 */
    const steps = [['1/3', '调小药量', T.step1], ['2/3', '奖励挪后', T.step2], ['3/3', '留下空瓶', T.step3]];
    const sa = ss(t, T.step1, T.step1 + .4) * (1 - ss(t, T.lapse + .2, T.lapse + .8));
    if (sa > 0) steps.forEach(([no, zh, at], i) => {
      const on = ss(t, at, at + .3), px = 960 + (i - 1) * 330, col = on > .5 ? C.iceHi : C.label;
      fr.text(no, px - 78, 150, { font: 'mono', size: 20, color: col, a: sa * (.45 + .55 * on), align: 'l' });
      fr.text(zh, px - 26, 150, { font: 'serifm', size: 30, track: 5, color: col, a: sa * (.45 + .55 * on), align: 'l', glow: on > .5 ? 8 : 0, glowA: .3 });
      if (t >= at && t < at + .05) fr.sfx(at, 'tock', { pitch: 4 + i * 2, gain: .6 });
    });
    if (t >= T.shrink && t < T.shrink + .05) fr.sfx(T.shrink, 'shrink', { gain: .8 });
    /* 第 36 镜：零点那笔奖励，被拖着沿尺子滑到喝完之后 */
    const rk = E.io3(seg(t, T.slide, T.slide + 1.8)), ra = ss(t, T.step2 - .1, T.step2 + .3) * (1 - ss(t, T.lapse + .3, T.lapse + .8));
    if (ra > 0) {
      const x0 = m31x + 30, y0 = m31y - m31r * 1.62 - 150, x1 = v31x + 300, y1 = c.yr - 330;
      const nx = lerp(x0, x1, rk), ny = lerp(y0, y1, rk) - Math.sin(Math.PI * rk) * 60, paid = t >= T.paid, pop = paid ? E.outBack(seg(t, T.paid, T.paid + .4), 1.8) : 1;
      if (rk > 0 && rk < 1) for (let i = 1; i < 6; i++) { const q = Math.max(0, rk - i * .05), px = lerp(x0, x1, q), py = lerp(y0, y1, q) - Math.sin(Math.PI * q) * 60; fr.glow(px, py, 40, C.gold, .08 * (6 - i) / 6); }
      X.notice(fr, nx, ny, { a: ra, s: .78 * pop, text: '我要变好了', flip: 1, state: paid ? 'ok' : 'wait', w: 430 });
      if (rk >= 1) { fr.line(x1 - 168, y1 + 44, v31x + vialHalf(v31h) + 8, c.yr - v31h * .5, { w: 1.2, color: paid ? C.gold : C.goldLo, a: .5 * ra }); }
      if (t >= T.slide && t < T.slide + .05) fr.sfx(T.slide, 'slide', { dur: 1.8, gain: .6 });
      if (t >= T.paid && t < T.paid + .05) fr.sfx(T.paid, 'ding', { gain: 1 });
    }
    if (t >= T.lift && t < T.lift + .05) fr.sfx(T.lift, 'rise', { dur: .7, gain: .5 });
    if (t >= T.gulp && t < T.gulp + .05) fr.sfx(T.gulp, 'gulp', { gain: 1 });
    if (t >= T.land && t < T.land + .05) fr.sfx(T.land, 'glass', { gain: .9 });
    /* 喝下去的那半秒：整个画面一阵发绿、发晃（难受） */
    const nz = seg(t, T.gulp, T.gulp + .6);
    if (nz > 0 && nz < 1) {
      const amp = Math.sin(Math.PI * nz) * 16, ph = t * 22;
      const prev = fr.look.post;
      fr.look.post = (x, tt) => { if (prev) prev(x, tt); const tmp = CH._tmp || (CH._tmp = document.createElement('canvas')); tmp.width = W; tmp.height = H; const tx = tmp.getContext('2d'); tx.drawImage(x.canvas, 0, 0); for (let y = 0; y < H; y += 24) { const dx = amp * Math.sin(y / 70 + ph); x.drawImage(tmp, 0, y, W, 24, dx, y, W, 24); } x.globalCompositeOperation = 'lighter'; x.fillStyle = rgba('#1E8F57', .16 * Math.sin(Math.PI * nz)); x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over'; };
    }
    /* 第 38 镜：日子快进。右上角第几晚 */
    let nNow = 31; for (let n = 32; n <= 60; n++) if (t >= CH.appear(n)) nNow = n;
    const cna = ss(t, T.lapse, T.lapse + .4) * (1 - ss(t, T.coda, T.coda + .6));
    if (cna > 0) { const w = fr.measure(String(nNow), { font: 'latin', size: 92 }); fr.text(String(nNow), 1742, 150, { font: 'latin', size: 92, color: C.ink, align: 'r', a: cna, glow: 10, glowA: .25 }); fr.text('晚', 1756, 168, { font: 'serifr', size: 34, color: C.label, align: 'l', a: cna }); fr.text('第', 1742 - w - 12, 168, { font: 'serifr', size: 34, color: C.label, align: 'r', a: cna }); }
    for (let n = 32; n <= 60; n++) { const A = CH.appear(n); if (t >= A && t < A + .05) fr.sfx(A, 'tick', { pitch: Math.min(9, 2 + Math.floor((n - 31) / 4)), gain: .45 }); if (t >= A + .22 && t < A + .27 && n % 3 === 0) fr.sfx(A + .22, 'glass', { gain: .25 }); }
    /* 第 39 镜：拉远。左边三十个满瓶，右边三十个越来越高的空瓶；月亮连成一条线 */
    const wa = ss(t, T.wide - .4, T.wide + .4) * (1 - ss(t, T.coda, T.coda + .5));
    if (wa > 0) {
      const pts = []; for (let n = 1; n <= 60; n++) { const [mx, my] = CH.moonPos(c, n, t); pts.push([mx, my]); }
      fr.poly(pts, { color: C.ice, w: 1.3, a: .32 * wa, k: E.io3(seg(t, T.wide - .4, T.wide + 1.6)) });
      [[1, '90'], [30, '28'], [31, '77'], [60, '78']].forEach(([n, s]) => { const [mx, my, mr] = CH.moonPos(c, n, t); fr.text(s, mx, my + mr + 18, { font: 'latin', size: 22, color: n === 30 ? '#9AA6B0' : C.iceHi, a: wa }); });
      const mid = (a, b) => (SX(c, hOf(a, 15)) + SX(c, hOf(b, 15))) / 2;
      fr.text('第 1–30 晚 · 没喝', mid(1, 30), c.yr + 40, { font: 'serifr', size: 24, track: 4, color: C.label, a: wa });
      fr.text('第 31–60 晚 · 喝了', mid(31, 60), c.yr + 40, { font: 'serifr', size: 24, track: 4, color: C.iceHi, a: wa });
    }
    if (t >= T.in && t < T.in + .05) fr.sfx(T.in, 'chord', { root: 5, gain: .7 });
    if (t >= T.lapse && t < T.lapse + .05) fr.sfx(T.lapse, 'rise', { dur: 4.0, gain: .4 });
    CH.coda(fr, t, c);
  },
});
const vialHalf = h => X.vialHalfW(h);

/* ---------- 尾声：回到第 1 镜的构图 ---------- */
const PAST = (() => { const out = []; for (let n = 60; n >= 1; n--) { const d = 61 - n, s = 1 / (1 + .16 * d); out.push({ n, d, s }); } return out; })();
CH.coda = function (fr, t, c) {
  if (t < T.coda + 1.2) return;
  const hero = ss(c.z, 140, 300), a = hero * (1 - .95 * ss(t, T.card, T.card + .8));
  /* 身后这六十个日子：一排药瓶往左上方退进黑里，越远越小、越虚 */
  if (a > 0) {
    const vx = SX(c, hOf(61, 15)), by = c.yr;
    fr.U.push(x => {
      for (const p of PAST.slice().reverse()) {
        const k = 1 - p.s, px = vx - 230 - 980 * Math.pow(k, 1.1), py = by - 30 - 150 * k, h = 380 * p.s * Math.pow(DOSE[p.n], 1 / 3);
        if (px < -60) continue;
        x.save(); x.filter = `blur(${(1.2 + 5 * k).toFixed(1)}px)`;
        X.vialUnder(x, px, py, h, { fill: Wd.KEPT[p.n] ? 0 : 1, a: a * (.25 + .6 * p.s), floor: .5, label: Wd.labelOf(p.n), residue: .7 });
        x.restore();
      }
    });
    for (const p of PAST) { const k = 1 - p.s, px = vx - 230 - 980 * Math.pow(k, 1.1); if (px < -60 || !Wd.KEPT[p.n]) continue; const py = by - 30 - 150 * k, h = 380 * p.s * Math.pow(DOSE[p.n], 1 / 3); fr.glow(px - h * .1, py - h * .4, h * .35, '#BFE2F2', .07 * a * p.s); }
  }
  /* 第 42 镜：零点。右上方一轮月亮，表盘读数 78 */
  const ma = ss(t, T.moon, T.moon + .6) * (1 - ss(t, T.card, T.card + .7));
  if (ma > 0) {
    const mx = 1430, my = 380, mr = 70, v = 78 * E.out3(seg(t, T.moon + .3, T.moon + 1.6));
    fr.U.push(x => X.moon(x, mx, my, mr, v / 100, { a: ma, seed: 61 }));
    X.moonGlow(fr, mx, my, mr, v / 100, ma);
    X.gaugeRing(fr, mx, my, mr * 1.62, v, { a: ma, numSize: 20 });
    fr.text(String(Math.round(v)), mx, my + mr * 1.62 + 8, { font: 'latin', size: 52, color: C.iceHi, a: ma, glow: 12, glowA: .35 });
    fr.text('第 61 晚 · 0:00', mx, my - mr * 1.62 - 62, { font: 'serifr', size: 26, track: 4, color: C.label, a: ma });
    K.ripple(fr, t, T.ripple, mx, my, { r0: 80, r1: 900, dur: 1.6, color: '#DCEBFF' });
    if (t >= T.moon && t < T.moon + .05) fr.sfx(T.moon, 'clock', { gain: .8 });
    if (t >= T.moon + .3 && t < T.moon + .35) fr.sfx(T.moon + .3, 'rise', { dur: 1.3, gain: .6 });
    if (t >= T.ripple && t < T.ripple + .05) { fr.sfx(T.ripple, 'bloom', { gain: 1 }); fr.sfx(T.ripple + .15, 'hush', { dur: 2.4 }); }
  }
  /* 片尾：片名 + 文献 */
  const ea = ss(t, T.card + .4, T.card + 1.2) * (1 - ss(t, T.end - .7, T.end));
  if (ea > 0) {
    fr.text('毒药谜题', 960, 330, { font: 'serifl', size: 112, track: 34, color: C.ink, a: ea, glow: 14, glowColor: '#BFE6F2', glowA: .3 });
    fr.text('今晚的真心，明天还算数吗', 966, 432, { font: 'serifm', size: 32, track: 12, color: '#C9D3DC', a: ea * ss(t, T.card + .9, T.card + 1.6) });
    const refs = ['Gregory S. Kavka, “The Toxin Puzzle,” Analysis 43(1), 1983', 'David Gauthier, “Rethinking the Toxin Puzzle,” 1998', 'Michael E. Bratman, “Toxin, Temptation, and the Stability of Intention,” 1998', 'George Ainslie, Breakdown of Will, Cambridge University Press, 2001'];
    fr.text('文献线索', 960, 540, { font: 'serifr', size: 22, track: 8, color: C.label, a: ea * ss(t, T.card + 1.4, T.card + 2.0) });
    refs.forEach((s, i) => fr.text(s, 960, 592 + i * 40, { font: 'latini', size: 27, color: '#9AA6B0', a: ea * ss(t, T.card + 1.6 + i * .15, T.card + 2.2 + i * .15) }));
    fr.text('9:00 / 15:00 两个钟点、真心读数、月相、药量均为示意', 960, 780, { font: 'serifr', size: 20, track: 3, color: C.dim, a: ea * ss(t, T.card + 2.4, T.card + 3.0) });
    if (t >= T.card + .4 && t < T.card + .45) fr.sfx(T.card + .4, 'chord', { root: -5, gain: .7 });
  }
};
})(window);
