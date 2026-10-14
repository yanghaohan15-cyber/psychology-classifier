/* ch1.js — 01 欲 DESIRE（35–75s）
 * 镜头从药瓶拉远成一条时间尺：0:00 月亮、9:00 到账通知、15:00 药瓶。
 * 观众的计划（打算 ✓ 拿钱 ✓ 不喝 ✓）→ 月亮外面长出扫描仪的表盘 → 药瓶上的冰蓝虚线"预见的明天"停在瓶口 →
 * 往下拽它，它弹回来 → 钱加到一个亿，指针纹丝不动 → Kavka 的结论。 */
(function (G) {
'use strict';
const { W, H, clamp, lerp, seg, smooth, ss, E, fade, hash, rng, rgba, mix } = G.VK;
const K = G.VKit, X = G.TX, Wd = G.TW, C = X.C, CH = G.CH;
const { hOf, SX } = Wd;

const T = { in: 35.2, labels: 36.6, card: 37.0, plan: 38.0, ring: 42.4, sweep: 44.0, mark: 47.4, pull: 51.8, snap: 56.3, roll1: 60.5, roll2: 62.0, cite: 69.3, out: 74.6 };

/* 预计线的位置：0 = 停在液面（一口不喝），1 = 瓶底（喝光） */
function mark1(t) {
  if (t < T.pull) return 0;
  const pull = .42 * E.io3(seg(t, T.pull, T.pull + 2.4)) + .03 * Math.sin(t * 31) * ss(t, T.pull, T.pull + .3) * (1 - ss(t, T.snap - .3, T.snap));   // 一抖一抖往下拽
  if (t < T.snap) return pull;
  const k = seg(t, T.snap, T.snap + .55);                                 // 弹回瓶口，带一点回弹
  return Math.max(0, .42 * (1 - k) * Math.cos(k * 9) * (1 - k) * (1 - k));
}
CH.mark1 = mark1;
/* 第 1 晚的读数：第 01 章里是这条线拽下去多少；第 02 章"话一出口"那一刻跳到 90 */
CH.read1 = t => t < 84.0 ? mark1(t) * .82 : lerp(0, Wd.READ[1], E.io3(seg(t, 84.6, 85.8)));
/* 钱：1,000,000 → 10,000,000 → 100,000,000，每一位滚过去 */
function money(t) {
  const e1 = E.out3(seg(t, T.roll1, T.roll1 + .9)), e2 = E.out3(seg(t, T.roll2, T.roll2 + 1.0));
  const v = 1e6 * Math.pow(10, e1) * Math.pow(10, e2);
  return '$' + Math.round(v).toLocaleString('en-US');
}

CH.parts.push({
  from: 35.0, to: 75.2,
  state(n, t, c, st) {
    if (n !== 1) return;
    st.vial = Object.assign(st.vial || {}, { label: CH.LABEL0, mark: mark1(t), markA: ss(t, T.mark, T.mark + .5) * (1 - ss(t, T.out - .4, T.out)), dash: t * 6 });
    st.moonA = ss(t, 36.4, 37.2);
  },
  overlay(fr, t, c) {
    const lt = t - T.in, out = 1 - ss(t, T.out - .5, T.out);
    /* 刻度下面的钟点 */
    const la = ss(t, T.labels, T.labels + .8) * out;
    Wd.tickLabel(fr, c, 0, '今晚', '0:00', la); Wd.tickLabel(fr, c, 9, '明早', '9:00', la); Wd.tickLabel(fr, c, 15, '明天下午', '15:00', la);
    /* 9:00 的到账通知 */
    const nx = SX(c, 9), ny = c.yr - 236, pop = E.outBack(seg(t, T.card, T.card + .45), 1.6), pulse = Math.exp(-Math.pow((t - 55.75) / .25, 2));
    const roll = ss(t, T.roll1, T.roll1 + .3), big = ss(t, T.roll1, T.roll2 + 1.2);
    if (t > T.card) {
      X.notice(fr, nx, ny, { amount: money(t), a: ss(t, T.card, T.card + .2) * out, s: 1.02 * pop * (1 + .05 * pulse + .07 * big), w: lerp(430, 520, ss(t, T.roll2, T.roll2 + .6)) });
      if (pulse > .01) fr.glow(nx, ny, 420, C.gold, .3 * pulse * out);
      if (t >= 55.6 && t < 55.65) fr.sfx(55.6, 'ding', { gain: .4 });
      if (big > 0) fr.glow(nx, ny, 520, C.gold, .12 * big * out * (1 + .2 * Math.sin(t * 3)));
      if (t >= T.card && t < T.card + .05) fr.sfx(T.card, 'ding', { gain: .9 });
      [T.roll1, T.roll2].forEach(r => { for (let i = 0; i < 8; i++) { const at = r + i * .1; if (t >= at && t < at + .05) fr.sfx(at, 'tick', { pitch: 3 + i % 5, gain: .35 }); } });
    }
    /* 第 7 镜：你的计划。一个光点沿尺子走，三个钟点各打一个勾 */
    const pa = ss(t, T.plan - .2, T.plan + .2) * (1 - ss(t, 46.8, 47.4)) * out;
    if (pa > 0) {
      const stops = [[0, '打算', C.iceHi, T.plan + .1], [9, '拿钱', C.gold, T.plan + 1.1], [15, '不喝', C.ink, T.plan + 2.3]];
      const k = clamp((t - T.plan) / 2.3), hh = k < .44 ? lerp(0, 9, E.io3(k / .44)) : lerp(9, 15, E.io3((k - .44) / .56));
      if (t > T.plan && t < T.plan + 2.6) fr.comet(SX(c, hh), c.yr, 160, 10, C.iceHi, pa * (1 - ss(t, T.plan + 2.3, T.plan + 2.6)), 0);
      stops.forEach(([h, zh, col, at]) => {
        const a = ss(t, at, at + .25) * pa; if (a <= 0) return; const px = SX(c, h), y = c.yr + 80;
        fr.text(zh + ' ✓', px, y, { font: 'serifm', size: 30, track: 4, color: col, a, glow: 8, glowA: .3 });
        if (t >= at && t < at + .05) fr.sfx(at, 'tock', { pitch: 2 + h / 5, gain: .7 });
      });
    }
    /* 第 8 镜起：月亮外面的扫描仪表盘 */
    const [mx, my, mr] = CH.moonPos(c, 1, t), ga = ss(t, T.ring, T.ring + .4) * out, read = CH.read1(t);
    if (ga > 0) {
      const jitter = t > T.roll1 && t < 69 ? .9 * Math.abs(Math.sin(t * 17) * Math.sin(t * 5.3)) : 0;
      const v = read * 100 + jitter;
      X.gaugeRing(fr, mx, my, mr * 1.62, v, { a: ga, grow: E.out3(seg(t, T.ring, T.ring + 1.0)), numSize: 20 });
      fr.text('扫描仪 · 真心读数', mx, my - mr * 1.62 - 64, { font: 'serifr', size: 24, track: 4, color: C.label, a: ga * ss(t, T.ring + .5, T.ring + 1.1) });
      fr.text(String(Math.round(v)), mx, my + mr * 1.62 + 6, { font: 'latin', size: 44, color: v > 2 ? C.iceHi : '#9FB6C8', a: ga, glow: 10, glowA: .3 });
      if (t >= T.ring && t < T.ring + .05) fr.sfx(T.ring, 'rise', { dur: 1.0, gain: .5 });
    }
    /* 扫描光：从零点扫到明天下午的瓶子上 */
    const sk = seg(t, T.sweep, T.sweep + 1.5);
    if (sk > 0 && sk < 1) {
      const px = lerp(SX(c, 0), SX(c, 15), E.io3(sk)), a = Math.sin(Math.PI * sk) * out;
      const g = fr.grad(px - 160, 0, px, 0, [[0, C.ice, 0], [.8, C.ice, .1 * a], [1, C.iceHi, .26 * a]]);
      fr.rect(px - 160, c.yr - 400, 160, 400, { fill: g, add: true });
      fr.line(px, c.yr - 400, px, c.yr, { w: 2, color: C.iceHi, a: .55 * a, add: true, glow: 12, glowColor: C.ice });
      if (t >= T.sweep && t < T.sweep + .05) fr.sfx(T.sweep, 'scan', { dur: 1.5, gain: .7 });
    }
    /* 第 9 镜：预见的明天。虚线停在瓶口，一根细线从表盘连过去 */
    const [vx, vy, vh] = CH.vialPos(c, 1, t), ma = ss(t, T.mark, T.mark + .5) * out;
    if (ma > 0) {
      const mp = X.markPos(vx, vy, vh, { fill: 1, mark: mark1(t) });
      fr.text('预见的明天', mp[0] + 16, mp[1] - 2, { font: 'serifr', size: 26, track: 3, color: C.iceHi, align: 'l', a: ma * (1 - ss(t, 59.6, 60.2)), glow: 8, glowA: .3 });
      /* 表盘到虚线：一条弧形的虚线，表示"读的是它" */
      const lk = E.out3(seg(t, T.mark + .2, T.mark + 1.2)), x0 = mx + mr * 1.62 + 46, y0 = my - 4, x1 = mp[0] - vh * .3, y1 = mp[1];
      const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([lerp(x0, x1, u), lerp(y0, y1, u) - Math.sin(Math.PI * u) * 250]); }
      fr.poly(pts, { k: lk, color: C.ice, w: 1.4, a: .45 * ma, dash: [6, 7], dashOff: -t * 20 });
      if (t >= T.mark && t < T.mark + .05) fr.sfx(T.mark, 'tick', { pitch: 7, gain: .6 });
    }
    /* 第 10 镜：往下拽——瓶口上方几道往下压的小箭头 */
    const pk = ss(t, T.pull, T.pull + .3) * (1 - ss(t, T.snap - .2, T.snap)) * out;
    if (pk > 0) {
      const mp = X.markPos(vx, vy, vh, { fill: 1, mark: mark1(t) });
      for (let i = 0; i < 3; i++) { const ph = ((t * 1.4 + i / 3) % 1), y = mp[1] - 64 + ph * 52, x = vx - vh * .34; fr.poly([[x - 11, y - 8], [x, y + 3], [x + 11, y - 8]], { color: C.iceHi, w: 2.4, a: pk * Math.sin(Math.PI * ph) * .85, glow: 8 }); }
      if (t >= T.pull && t < T.pull + .05) fr.sfx(T.pull, 'strain', { dur: 2.4, gain: .6 });
    }
    if (t >= T.snap && t < T.snap + .05) fr.sfx(T.snap, 'snap', { gain: .9 });
    /* 第 14 镜：出处 */
    const ca = ss(t, T.cite, T.cite + .6) * out;
    if (ca > 0) {
      fr.text('GREGORY S. KAVKA  ·  “THE TOXIN PUZZLE”  ·  ANALYSIS 43(1), 1983', 960, 132, { font: 'latin', size: 24, track: 5, color: C.label, a: ca });
      if (t >= T.cite && t < T.cite + .05) fr.sfx(T.cite, 'chord', { root: -5, gain: .55 });
    }
    if (t >= T.in && t < T.in + .05) fr.sfx(T.in, 'chord', { root: 0, gain: .7 });
    if (t >= T.in + .3 && t < T.in + .35) fr.sfx(T.in + .3, 'rise', { dur: 2.0, gain: .45 });
  },
});
})(window);
