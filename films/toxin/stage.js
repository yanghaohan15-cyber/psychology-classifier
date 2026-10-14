/* stage.js — 整片共用的那一个世界：摄影机 + 时间尺 + 每一晚的月亮、药瓶、硬币。
 * 各章只在上面叠自己的东西（ch0–ch4.js），每晚的状态（亮不亮、满不满、药量、标签）都在这里按时间算。 */
(function (G) {
'use strict';
const { W, H, clamp, lerp, seg, smooth, ss, E, fade, hash, rng, rgba, mix } = G.VK;
const K = G.VKit, X = G.TX, Wd = G.TW, C = X.C;
const CH = (G.CH = G.CH || {});
const { hOf, SX, READ, DOSE, R } = Wd;

/* ---------- 摄影机关键帧：[时刻, 焦点(小时), 缩放(像素/小时), 尺子的 y] ---------- */
const HERO = 15 + 200 / 334, HERO_Y = 832;                           // 特写：第 1 晚的药瓶站在 (760, 832)，瓶高 600
CH.HERO_Y = HERO_Y; CH.HERO_Z = 334;
const CAM = [
  [0, HERO, 334, HERO_Y], [35.2, HERO, 334, HERO_Y], [37.6, 7.5, 75, 724],
  [94.4, 7.5, 75, 724], [96.6, 13.0, 95, 724], [106.0, 13.0, 95, 724], [107.4, 7.5, 75, 724],
  [112.6, 7.5, 75, 724], [114.6, 31.5, 75, 724], [116.6, 31.5, 75, 724], [120.4, 400, 2.15, 800],
  [150.2, 400, 2.15, 800], [152.6, 731, 52, 724], [154.0, 731, 52, 724], [156.8, 790, 11, 750], [158.0, 790, 11, 750], [159.6, 731, 58, 724],
  [180.4, 731, 58, 724], [184.6, 732, 1.2, 805], [190.0, 732, 1.2, 805], [193.4, 1440 + HERO, 334, HERO_Y], [212, 1440 + HERO, 334, HERO_Y]];
CH.CAM = CAM;

/* ---------- 每一晚什么时候出场 ---------- */
function appear(n) {
  if (n === 1) return 0;
  if (n === 2) return 113.4;
  if (n <= 30) return 116.7 + 3.5 * Math.sqrt((n - 2) / 28);
  if (n === 31) return 124.2;
  if (n <= 60) return 180.5 + 3.8 * Math.sqrt((n - 31) / 29);
  return 189.6;
}
CH.appear = appear;
/* 第 31 晚的药量：在第 35 镜里从一瓶缩成 0.2 瓶 */
const dose31 = t => lerp(1, DOSE[31], E.io3(seg(t, 168.0, 169.0)));
function doseOf(n, t) { return n === 31 ? dose31(t) : DOSE[n]; }
/* 那一晚的读数（月亮亮面）：第 1 晚和第 31 晚由章节控制 */
function readOf(n, t) {
  if (n === 1) return CH.read1 ? CH.read1(t) : READ[1];
  if (n === 31) return Math.pow(R[31], dose31(t));
  return READ[n];
}
CH.readOf = readOf; CH.doseOf = doseOf;
/* 药液还剩多少：第 31–60 晚在当天下午被喝光 */
function fillOf(n, t) {
  if (n < 31 || n > 60) return 1;
  if (n === 31) return t < 178.2 ? 1 : 0;
  const a = appear(n) + .22; return 1 - E.io3(seg(t, a, a + .3));
}
CH.fillOf = fillOf;
/* 屏幕上的位置 */
const vialSize = (c, n, t) => Wd.vialH(c) * Math.pow(doseOf(n, t), 1 / 3);
CH.vialPos = (c, n, t) => [SX(c, hOf(n, 15)), c.yr, vialSize(c, n, t)];
CH.moonPos = (c, n, t) => Wd.moonXY(c, n, readOf(n, t));

/* 下午的光：第 02 章推到 15:00 时底色转暖（只是光线，不表意） */
const warmAt = t => ss(t, 94.6, 96.6) * (1 - ss(t, 106.0, 107.6));
CH.warmAt = warmAt;

/* 各章往 CH.parts 里登记自己：{ from, to, state(n, t, c, st) 改某一晚的样子, overlay(fr, t, c) 叠自己的东西 } */
CH.parts = CH.parts || [];
CH.state = (n, t, c) => { const st = {}; CH.parts.forEach(p => { if (t >= p.from && t < p.to && p.state) p.state(n, t, c, st); }); return st; };
CH.overlay = (fr, t, c) => CH.parts.forEach(p => { if (t >= p.from && t < p.to && p.overlay) p.overlay(fr, t, c); });

CH.world = function (fr, t) {
  const c = Wd.cam(CAM, t); CH.c = c;
  const U = fr.U, zoomed = Wd.day(c), hero = ss(c.z, 140, 300);    // hero：特写（序和尾声）
  const warm = warmAt(t);
  fr.look.bgo.tint = mix('#0B1830', '#2A1C10', warm);
  /* 桌面：特写时是一块反光的桌面，拉远以后是尺子下面的暗处 */
  U.push(x => X.floorPlane(x, c.yr, { line: 0, pool: hero > 0 ? [SX(c, hOf(1, 15)), 560, hero] : null, a: .9 }));
  /* 每一晚 */
  const span = 960 / c.z + 30, h0 = c.hc - span, h1 = c.hc + span;
  const nLo = Math.max(1, Math.floor(h0 / 24)), nHi = Math.min(Wd.NIGHTS, Math.ceil(h1 / 24) + 1);
  const LV = [];
  for (let n = nLo; n <= nHi; n++) {
    const st = CH.state ? CH.state(n, t, c) : {}; if (st.skip) continue;
    const a0 = st.a == null ? ss(t, appear(n), appear(n) + .35) : st.a; if (a0 <= .003) continue;
    /* 药瓶 */
    const [vx, vy, vh] = CH.vialPos(c, n, t), va = a0 * (st.vialA == null ? 1 : st.vialA);
    if (va > .003 && vx > -200 && vx < W + 200) {
      const o = Object.assign({ fill: fillOf(n, t), label: Wd.labelOf(n), glass: 1, refl: .14 * (1 - .7 * zoomed) }, st.vial || {});
      const by = vy + (st.vialDy || 0), cx = vx + (st.vialDx || 0), hh = vh * (st.vialS || 1);
      const refl = hh >= 90 && o.refl * va > .03;
      U.push(x => { if (refl) X.vialReflection(x, cx, by, hh, Object.assign({}, o, { a: va })); X.vialUnder(x, cx, by, hh, Object.assign({}, o, { a: va })); });
      LV.push(() => { X.vialLight(fr.x, cx, by, hh, Object.assign({}, o, { a: va })); X.caustic(fr, cx, by, hh, va * (o.fill > .05 ? 1 : 0)); });
    }
    /* 月亮 */
    const ma = a0 * (st.moonA == null ? (n === 1 ? ss(t, 36.4, 37.2) : 1) : st.moonA);
    if (ma > .003) {
      const [mx, my, mr] = st.moonXY || CH.moonPos(c, n, t), k = st.moonK == null ? readOf(n, t) : st.moonK;
      if (mx > -100 && mx < W + 100) {
        U.push(x => X.moon(x, mx, my, mr, k, { a: ma, seed: n * 7 + 1 }));
        LV.push(() => X.moonGlow(fr, mx, my, mr, k, ma * (st.glowK == null ? 1 : st.glowK)));
        /* 零点那笔奖励：远景里是月亮上方一枚小硬币 */
        const ca = ma * (st.coinA == null ? 0 : st.coinA);
        if (ca > .003) LV.push(() => Wd.coin(fr, st.coinX == null ? mx : st.coinX, st.coinY == null ? my - mr - 15 * Math.max(.6, c.S) : st.coinY, Math.max(4, 11 * c.S), st.coinOk !== false, ca));
      }
    }
  }
  /* 时间尺在药瓶后面 */
  Wd.ruler(fr, c, { a: CH.rulerA ? CH.rulerA(t) : 1 });
  LV.forEach(f => f());
  if (CH.overlay) CH.overlay(fr, t, c);
};
})(window);
