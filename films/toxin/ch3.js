/* ch3.js — 03 往 THE PAST（112–150s）
 * 下一个晚上 → 日子越走越快，镜头拉成一个月：三十瓶都没喝，三十轮月亮一轮比一轮细、一轮比一轮低 →
 * 第 31 晚的扫描光先往左扫过这一排满瓶，再落回明天的瓶子 → 每轮月亮底下亮出读数，连成一条往下走的线 →
 * 拎出三瓶并排："明天一定""明天尽量""下次再说" → 第 31 晚零点，到账失败 → 你成了题里的那个人。 */
(function (G) {
'use strict';
const { W, H, clamp, lerp, seg, smooth, ss, E, fade, hash, rng, rgba, mix } = G.VK;
const K = G.VKit, X = G.TX, Wd = G.TW, C = X.C, CH = G.CH;
const { hOf, SX, READ, pct } = Wd;

const T = { in: 112.4, n2: 113.4, lapse: 116.6, scan: 124.6, back: 126.2, nums: 129.2, trio: 133.8, trioOut: 138.4, pop: 139.6, fail: 140.4, hush: 145.4, out: 149.6 };
const TRIO = [3, 15, 29];
const trioK = t => E.io3(seg(t, T.trio, T.trio + .8)) * (1 - E.io3(seg(t, T.trioOut, T.trioOut + .6)));

CH.parts.push({
  from: 112.0, to: 150.2,
  state(n, t, c, st) {
    if (n > 31) { st.skip = true; return; }
    const A = CH.appear(n), dim = 1 - .82 * trioK(t);
    /* 零点那笔奖励：远景里是月亮上方一枚小硬币。第 16 晚起读数跌破 50，不再到账 */
    st.coinA = n === 1 ? ss(t, T.lapse, T.lapse + .8) : n <= 30 ? ss(t, A + .1, A + .35) : 0;
    st.coinOk = CH.readOf(n, t) >= .5;
    st.vialA = dim; st.moonA = dim; st.glowK = dim;
    if (n === 1) st.vial = { label: Wd.labelOf(1, { modal: '明天开始' }) };
    if (n === 31) st.vial = { label: Wd.labelOf(31, { modal: '明天' }), mark: READ[31], markA: ss(t, T.back + .5, T.back + .9), dash: t * 6 };
    if (TRIO.includes(n)) st.vialA = dim * (1 - .9 * trioK(t));            // 被拎出来的那三瓶，原位先空着
  },
  overlay(fr, t, c) {
    const out = 1 - ss(t, T.out - .5, T.out), zoomed = Wd.day(c);
    /* 第 23 镜：第 2 晚的钟点 */
    const la = ss(t, T.n2 - .3, T.n2 + .3) * (1 - ss(t, T.lapse, T.lapse + .6));
    Wd.tickLabel(fr, c, 24, '第 2 晚', '0:00', la); Wd.tickLabel(fr, c, 39, '下午', '15:00', la);
    if (la > 0) { const [mx, my, mr] = CH.moonPos(c, 2, t); fr.text(String(pct(READ[2])), mx, my + mr + 34, { font: 'latin', size: 40, color: C.iceHi, a: la * ss(t, T.n2, T.n2 + .4), glow: 10, glowA: .3 }); }
    /* 右上角：第几晚 */
    let nNow = 1; for (let n = 2; n <= 31; n++) if (t >= CH.appear(n)) nNow = n;
    const ca = ss(t, T.n2 - .2, T.n2 + .3) * out * (1 - .8 * trioK(t));
    if (ca > 0) { fr.text(String(nNow), 1742, 150, { font: 'latin', size: 92, color: C.ink, align: 'r', a: ca, glow: 10, glowA: .25 }); fr.text('晚', 1756, 168, { font: 'serifr', size: 34, color: C.label, align: 'l', a: ca }); fr.text('第', 1742 - fr.measure(String(nNow), { font: 'latin', size: 92 }) - 12, 168, { font: 'serifr', size: 34, color: C.label, align: 'r', a: ca }); }
    for (let n = 2; n <= 31; n++) { const A = CH.appear(n); if (t >= A && t < A + .05) fr.sfx(A, 'tick', { pitch: Math.max(0, 9 - Math.floor(n / 4)), gain: .45 }); }
    /* 第 26 镜：扫描光往左扫过这一排满瓶，再折回来落到明天的瓶子上 */
    const [m31x, m31y] = CH.moonPos(c, 31, t), [v31x, v31y, v31h] = CH.vialPos(c, 31, t);
    const sk = seg(t, T.scan, T.back), bk = seg(t, T.back, T.back + .8);
    if (sk > 0 && sk < 1) {
      const px = lerp(m31x, SX(c, 0) - 30, E.io3(sk)), a = Math.sin(Math.PI * sk) * out;
      fr.rect(px, c.yr - 470, 150, 480, { fill: fr.grad(px, 0, px + 150, 0, [[0, C.iceHi, .3 * a], [.2, C.ice, .12 * a], [1, C.ice, 0]]), add: true });
      fr.line(px, c.yr - 470, px, c.yr, { w: 2, color: C.iceHi, a: .55 * a, add: true });
      if (t >= T.scan && t < T.scan + .05) fr.sfx(T.scan, 'scan', { dur: 1.6, gain: .7 });
    }
    if (bk > 0 && bk < 1) {                                          // 一道光从这一排汇到明天的瓶子上
      const a = Math.sin(Math.PI * bk) * out, pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([lerp(SX(c, 15), v31x, u), lerp(c.yr - 120, v31y - v31h * .6, u) - Math.sin(Math.PI * u) * 120]); }
      fr.poly(pts, { k: E.out3(bk), color: C.iceHi, w: 2, a: .7 * a, glow: 12, add: true });
    }
    /* 第 27 镜：每轮月亮底下亮出读数，连成一条往下走的线 */
    const na = ss(t, T.nums - .2, T.nums + .3) * out * (1 - .85 * trioK(t)) * zoomed;
    if (na > 0) {
      const pts = [];
      for (let n = 1; n <= 31; n++) {
        const [mx, my, mr] = CH.moonPos(c, n, t), k = ss(t, T.nums + (n - 1) * .07, T.nums + (n - 1) * .07 + .3); pts.push([mx, my]);
        const rd = CH.readOf(n, t); fr.text(String(pct(rd)), mx, my + mr + 17, { font: 'latin', size: 19, color: rd < .5 ? '#9AA6B0' : C.iceHi, a: na * k });
        const at = T.nums + (n - 1) * .07; if (t >= at && t < at + .05 && n % 2) fr.sfx(at, 'tick', { pitch: Math.max(0, 9 - Math.floor(n / 3)), gain: .3 });
      }
      fr.poly(pts, { k: E.io3(seg(t, T.nums, T.nums + 2.4)), color: C.ice, w: 1.3, a: .35 * na });
      fr.text('读数为示意：按近来兑现的情况推算，越近的夜晚算得越重', 960, 128, { font: 'serifr', size: 22, track: 3, color: C.dim, a: na * (1 - ss(t, T.trio, T.trio + .4)) });
    }
    /* 第 28 镜：拎出三瓶并排放大 */
    const tk = trioK(t);
    if (tk > 0) {
      TRIO.forEach((n, i) => {
        const k = E.io3(seg(t, T.trio + i * .12, T.trio + .7 + i * .12)) * (1 - E.io3(seg(t, T.trioOut, T.trioOut + .6)));
        const [x0, y0, h0] = CH.vialPos(c, n, t), x1 = 560 + i * 400, y1 = 700, h1 = 390;
        const cx = lerp(x0, x1, k), by = lerp(y0, y1, k), hh = lerp(h0, h1, k), md = Wd.modal(n);
        const o = { fill: 1, a: 1, label: { top: '跑步 · 30 分钟', topFont: 'serifm', topSize: 3.9, main: md, size: 7.2, track: .3, font: 'serifh', ink: md === '下次再说' ? '#6E1028' : null, sub: '第 ' + n + ' 晚', subFont: 'serifm', subSize: 3.2 } };
        fr.U.push(x => X.vialUnder(x, cx, by, hh, o)); X.vialLight(fr.x, cx, by, hh, o); X.caustic(fr, cx, by, hh, k);
        const ra = ss(k, .6, 1);
        if (ra > 0) {
          fr.U.push(x => X.moon(x, cx - 36, by + 66, 19, READ[n], { a: ra, seed: n }));
          fr.text(String(pct(READ[n])), cx + 8, by + 68, { font: 'latin', size: 46, color: READ[n] < .4 ? C.rose : C.iceHi, align: 'l', a: ra, glow: 8, glowA: .3 });
        }
        const at = T.trio + .55 + i * .45; if (t >= at && t < at + .05) fr.sfx(at, 'tock', { pitch: 3 - i * 3, gain: .7 });
      });
    }
    /* 第 29 镜：第 31 晚零点，"我要变好了"弹出一半，变灰：到账失败 */
    const pa = ss(t, T.pop, T.pop + .2) * out;
    if (pa > 0) {
      const fail = t >= T.fail, shake = fail ? 7 * Math.exp(-(t - T.fail) * 5) * Math.sin((t - T.fail) * 50) : 0;
      const pop = E.outBack(seg(t, T.pop, T.pop + .4), 1.4) * (fail ? 1 : .92 + .08 * Math.sin((t - T.pop) * 14));
      const nx = m31x - 250 + shake, ny = m31y - 120;
      X.notice(fr, nx, ny, { a: pa, s: .82 * pop, text: '我要变好了', flip: 1, state: fail ? 'fail' : 'ok', w: 430 });
      fr.line(nx + 150, ny + 40, m31x - 16, m31y - 12, { w: 1.2, color: fail ? C.rose : C.gold, a: .5 * pa });
      if (t >= T.pop && t < T.pop + .05) fr.sfx(T.pop, 'ding', { gain: .5 });
      if (t >= T.fail && t < T.fail + .05) { fr.sfx(T.fail, 'fail', { gain: 1 }); fr.sfx(T.fail, 'thud', { gain: .5 }); }
      fr.text('读数低于 50，不再到账 · 示意', nx, ny + 84, { font: 'serifr', size: 20, track: 2, color: C.dim, a: pa * ss(t, T.fail + .3, T.fail + .8) });
    }
    if (t >= T.hush && t < T.hush + .05) fr.sfx(T.hush, 'hush', { dur: 2.2 });
    if (t >= T.in && t < T.in + .05) fr.sfx(T.in, 'chord', { root: -2, gain: .7 });
    if (t >= T.lapse && t < T.lapse + .05) fr.sfx(T.lapse, 'rise', { dur: 3.6, gain: .4 });
  },
});
})(window);
