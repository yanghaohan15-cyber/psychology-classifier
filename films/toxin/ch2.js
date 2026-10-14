/* ch2.js — 02 真 SINCERITY（75–112s）
 * 同一条时间尺，从谜题换成生活：合同又签了一沓 → 药瓶的标签翻成"明天早起""明天一定写完""明天开始跑步" →
 * 零点那一刻，预计线落到瓶底，读数 90，奖励"我要变好了"当场到账（它就是题里那一百万）→
 * 镜头推到第二天下午：奖励早领过了，药一口没少，预计线变成玫红 → 两头都亮：两个你都是真心的。 */
(function (G) {
'use strict';
const { W, H, clamp, lerp, seg, smooth, ss, E, fade, hash, rng, rgba, mix } = G.VK;
const K = G.VKit, X = G.TX, Wd = G.TW, C = X.C, CH = G.CH;
const { hOf, SX } = Wd;

const T = { in: 75.0, card: 75.3, sign: 76.3, pile: 77.5, cardOut: 79.0, flip: [80.0, 81.3, 82.6], drop: 84.6, pop: 85.9, swap: [90.0, 92.0], pan: 94.4, done: 94.8, sun: 95.6, walk: 99.0, late: 99.9, both: 106.0, ripple: 108.8, out: 112.0 };
const LIFE = [
  { top: '明天', main: '早起', sub: '6:30' },
  { top: '明天一定', main: '写完', sub: '报告' },
  { top: '明天开始', main: '跑步', sub: '30 分钟' },
].map(o => Object.assign({ topFont: 'serifm', topSize: 4.6, size: 10.5, subFont: 'serifm', subSize: 3.6 }, o));
/* 标签翻面：第 i 次翻到一半（瓶子侧过来）时换字 */
function label1(t) {
  let L = CH.LABEL0, sx = 1;
  T.flip.forEach((at, i) => { const k = seg(t, at, at + .5); if (k > 0) { sx = Math.abs(Math.cos(Math.PI * k)); if (k >= .5) L = LIFE[i]; } });
  return Object.assign({}, L, { sx });
}
CH.LIFE = LIFE;

CH.parts.push({
  from: 74.4, to: 112.6,
  state(n, t, c, st) {
    if (n !== 1) return;
    const late = ss(t, T.late, T.late + .5) * (1 - ss(t, T.both, T.both + .6));
    st.vial = Object.assign(st.vial || {}, { label: label1(t), mark: E.io3(seg(t, T.drop, T.drop + 1.0)), markA: ss(t, T.drop - .3, T.drop) * (1 - ss(t, T.both + .2, T.both + .8)), dash: t * 6, markCol: late });
    st.moonA = 1;
    /* 合同盖上来的时候，后面的世界暗下去 */
    const dim = ss(t, T.card, T.card + .4) * (1 - ss(t, T.cardOut, T.cardOut + .5));
    st.vialA = 1 - .72 * dim; st.glowK = 1 - .72 * dim;
  },
  overlay(fr, t, c) {
    const out = 1 - ss(t, T.out - .5, T.out), dim = ss(t, T.card, T.card + .4) * (1 - ss(t, T.cardOut, T.cardOut + .5));
    /* 钟点 */
    const la = ss(t, T.in, T.in + .6) * out * (1 - .8 * dim);
    Wd.tickLabel(fr, c, 0, '今晚', '0:00', la); Wd.tickLabel(fr, c, 15, '明天下午', '15:00', la * (1 - ss(t, T.walk, T.walk + .3)) + la * ss(t, T.both, T.both + .5));
    /* 扫描仪表盘：读数在零点那一刻跳到 90 */
    const [mx, my, mr] = CH.moonPos(c, 1, t), v = CH.read1(t) * 100, ga = out * (1 - .8 * dim);
    if (ga > 0 && mx > -300) {
      X.gaugeRing(fr, mx, my, mr * 1.62, v, { a: ga, numSize: 20 });
      fr.text(String(Math.round(v)), mx, my + mr * 1.62 + 6, { font: 'latin', size: 44, color: v > 2 ? C.iceHi : '#9FB6C8', a: ga, glow: 10, glowA: .3 });
      fr.text('扫描仪 · 真心读数', mx, my - mr * 1.62 - 64, { font: 'serifr', size: 24, track: 4, color: C.label, a: ga * (1 - ss(t, T.both, T.both + .4)) });
      if (t >= T.drop && t < T.drop + .05) fr.sfx(T.drop, 'rise', { dur: 1.0, gain: .6 });
    }
    /* 第 15 镜：合同又签了一张，下面叠出一沓 */
    const ca = dim * out;
    if (ca > 0) {
      const cin = E.out3(seg(t, T.card, T.card + .6)), cout = E.in2(seg(t, T.cardOut, T.cardOut + .6)), cx = lerp(2200, 1000, cin) + 1100 * cout, cy = 480;
      const pile = seg(t, T.pile, T.pile + 1.3), N = 7;
      fr.U.push(x => {
        for (let i = N - 1; i >= 1; i--) {                          // 底下那一沓：越往下越早，每张都签了
          const k = E.out3(clamp(pile * N - (N - 1 - i) * .55)); if (k <= 0) continue;
          CH.drawContract(x, cx - 26 * i * k, cy + 18 * i * k, -.016 - .035 * i * k, ca * (1 - .08 * i), 1e3, 1, 10 + i, .82);
        }
        CH.drawContract(x, cx, cy, -.016, ca, 1e3, ss(t, T.sign, T.sign + 1.0), 4, .82);
      });
      fr.text('今晚', cx + 200, cy - 182, { font: 'serifm', size: 24, track: 4, color: C.label, a: ca * ss(t, T.card + .4, T.card + .8) });
      if (t >= T.card && t < T.card + .05) fr.sfx(T.card, 'paper', { gain: .8 });
      if (t >= T.sign && t < T.sign + .05) fr.sfx(T.sign, 'pen', { gain: .8, dur: 1.0 });
      for (let i = 1; i < 7; i++) { const at = T.pile + (i - 1) * .55 * 1.3 / 7; if (t >= at && t < at + .05) fr.sfx(at, 'paper', { gain: .35 }); }
    }
    T.flip.forEach(at => { if (t >= at + .25 && t < at + .3) fr.sfx(at + .25, 'flip', { gain: .7 }); });
    /* 第 17 镜：零点那一刻，奖励当场到账 */
    const na = ss(t, T.pop, T.pop + .2) * (1 - ss(t, 105.2, 105.9)) * out, pop = E.outBack(seg(t, T.pop, T.pop + .45), 1.6);
    if (na > 0 && mx > -400) {
      const sw = (at) => E.io3(seg(t, at, at + .45)), flip = sw(T.swap[0]) * (1 - sw(T.swap[1]));
      const squash = Math.abs(Math.cos(Math.PI * (seg(t, T.swap[0], T.swap[0] + .45) + seg(t, T.swap[1], T.swap[1] + .45))));
      const done = t > T.done;
      X.notice(fr, mx + 20, my - mr * 1.62 - 150, { a: na, s: 1.0 * pop * (.85 + .15 * squash), text: '我要变好了', amount: '$1,000,000', flip: 1 - flip, state: done ? 'done' : 'ok', title: done ? '已领取' : '到账通知', w: 430 });
      if (t >= T.pop && t < T.pop + .05) fr.sfx(T.pop, 'ding', { gain: 1 });
      T.swap.forEach(at => { if (t >= at && t < at + .05) fr.sfx(at, 'flip', { gain: .5 }); });
      fr.text('示意', mx + 270, my - mr * 1.62 - 210, { font: 'serifr', size: 18, track: 3, color: C.dim, a: na * ss(t, T.swap[0], T.swap[0] + .5) * (1 - ss(t, T.pan, T.pan + .4)) });
    }
    /* 第 19 镜：第二天下午。太阳升起来 */
    const sa = ss(t, T.sun, T.sun + .9) * out, vx = SX(c, 15), [, , vh] = CH.vialPos(c, 1, t);
    const set = ss(t, T.walk + 1.6, T.walk + 2.6) * (1 - ss(t, T.both, T.both + .6));
    if (sa > 0) {
      const sy = c.yr - vh - 150 + 120 * set;
      X.sun(fr, vx, sy, 34, sa * (1 - .75 * set), t);
      if (t >= T.sun && t < T.sun + .05) fr.sfx(T.sun, 'rise', { dur: 1.2, gain: .45 });
    }
    /* 第 20 镜：时间光标从 15:00 走到 21:00，药一口没少 */
    const wk = E.io3(seg(t, T.walk, T.walk + 2.6)), wa = ss(t, T.walk - .2, T.walk + .2) * (1 - ss(t, 104.6, 105.4)) * out;
    if (wa > 0) {
      const hh = 15 + 6 * wk, px = SX(c, hh);
      fr.line(px, c.yr - 18, px, c.yr + 18, { w: 2, color: C.ink, a: wa });
      fr.circle(px, c.yr, 5, { fill: C.ink, a: wa });
      const hm = Math.floor(hh), mm = Math.floor((hh - hm) * 60 / 10) * 10;
      fr.text(String(hm).padStart(2, '0') + ':' + String(mm).padStart(2, '0'), px, c.yr + 44, { font: 'mono', size: 24, color: C.ink, a: wa });
      for (let i = 0; i < 12; i++) { const at = T.walk + i * .22; if (t >= at && t < at + .05) fr.sfx(at, 'clock', { gain: .5 }); }
    }
    if (t >= T.late && t < T.late + .05) fr.sfx(T.late, 'tock', { pitch: -2, gain: .7 });
    /* 第 22 镜：两头都亮。零点的你真心想喝，下午的你真心不想喝 */
    const ba = ss(t, T.both + .9, T.both + 1.5) * out;
    if (ba > 0) {
      fr.glow(mx, my, 330, C.ice, .12 * ba);
      fr.glow(vx, c.yr - vh * .5, 360, C.sun, .1 * ba);
      fr.text('零点：真心想喝', mx, 176, { font: 'serifm', size: 34, track: 6, color: C.iceHi, a: ba, glow: 12, glowA: .35 });
      fr.text('下午：真心不想喝', vx, 176, { font: 'serifm', size: 34, track: 6, color: C.sun, a: ba * ss(t, T.both + 1.3, T.both + 1.9), glow: 12, glowA: .35 });
      K.ripple(fr, t, T.ripple, mx, my, { r0: 60, r1: 700, dur: 1.4, color: '#DCEBFF' });
      K.ripple(fr, t, T.ripple, vx, c.yr - vh * .5, { r0: 60, r1: 700, dur: 1.4, color: '#FFE6C4' });
      if (t >= T.ripple && t < T.ripple + .05) { fr.sfx(T.ripple, 'bloom', { gain: .7 }); fr.sfx(T.ripple + .1, 'hush', { dur: 2.0 }); }
    }
    if (t >= T.in && t < T.in + .05) fr.sfx(T.in, 'chord', { root: 3, gain: .7 });
  },
});
})(window);
