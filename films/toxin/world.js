/* world.js — 全片的那一个世界：一条时间尺，今晚 0:00 → 明早 9:00 → 明天下午 15:00，一天接一天往右延伸。
 * 单位是小时：第 n 晚的零点在 h = 24(n−1)，那天下午该喝药的时刻在 +15，题里付钱的时刻在 +9。
 * 摄影机只做三件事：推、拉、沿尺子平移。缩放在对数空间里走，焦点按 1/缩放 走（同 fold_C 的 camAt）。
 *
 * 读数模型（全部是示意，见 facts.md）：每晚零点的 r 按近来兑现的情况推算，起点 0.90，每过一晚 r ← 0.96·r + 0.04·x（兑现 x = 1）。
 * 药量 d 的读数 = r^d。第 1–30 晚全部失约；第 31 晚起药量调小、全部兑现，药量按"读数保持在约 78"来定。 */
(function (G) {
'use strict';
const { W, H, clamp, lerp, seg, smooth, ss, E, fade, hash, rng, rgba, mix } = G.VK;
const X = G.TX, C = X.C;

/* ---------- 读数模型：载入时一次算完 ---------- */
const NIGHTS = 61, R = [], DOSE = [], READ = [], KEPT = [];
(() => { let r = .9; for (let n = 1; n <= NIGHTS; n++) { const kept = n >= 31 && n <= 60; const d = n >= 31 ? clamp(Math.log(.78) / Math.log(r), .2, 1) : 1; R[n] = r; DOSE[n] = n === NIGHTS ? 1 : d; READ[n] = Math.pow(r, DOSE[n]); KEPT[n] = kept; r = .96 * r + .04 * (kept ? 1 : 0); } })();
const pct = v => Math.round(v * 100);
/* 标签：前一句是语气（读数越低越软），中间是那件事，下面是量 */
const modal = n => n >= 31 ? '明天' : READ[n] >= .6 ? '明天一定' : READ[n] >= .4 ? '明天尽量' : '下次再说';
const minutes = n => Math.max(5, Math.round(30 * DOSE[n] / 5) * 5) + ' 分钟';
function labelOf(n, o = {}) {
  const m = o.modal || modal(n), late = m === '下次再说';
  return { top: m, topFont: 'serifm', topSize: 4.6, topInk: late ? '#7A1E33' : null, main: o.main || '跑步', size: o.size || 10.5, sub: o.sub || minutes(n), subFont: 'serifm', subSize: 3.6, a: o.a };
}

/* ---------- 摄影机 ---------- */
const hOf = (n, at = 0) => 24 * (n - 1) + at;                      // 第 n 晚 + at 小时
const objS = z => Math.pow(z / 75, .42);                            // 东西随缩放变小得慢一些：拉远一个月，药瓶还认得出
function cam(keys, t) {
  let i = 0; while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1] || a, k = b === a ? 0 : (b.length > 5 ? b[5] : E.io3)(seg(t, a[0], b[0]));
  const z = Math.exp(lerp(Math.log(a[2]), Math.log(b[2]), k)), ia = 1 / a[2], ib = 1 / b[2], w = Math.abs(ib - ia) < 1e-9 ? k : (1 / z - ia) / (ib - ia);
  return { hc: lerp(a[1], b[1], w), z, yr: lerp(a[3], b[3], k), S: objS(z), lift: lerp(a[4] || 0, b[4] || 0, k) };
}
const SX = (c, h) => 960 + (h - c.hc) * c.z;
const vialH = c => 320 * c.S;
const day = c => 1 - ss(c.z, 7, 40);                                 // 0 = 一天的近景，1 = 一个月的远景

/* 月亮在天上的位置：近景挂在零点刻度正上方；远景里越真心挂得越高（三十轮月亮自己连成一条线） */
function moonXY(c, n, rd) {
  const x = SX(c, hOf(n)), yd = c.yr - 250 * c.S, ym = c.yr - (110 + 330 * rd) * Math.min(1.25, .9 + .35 * c.S), k = day(c);
  return [x, lerp(yd, ym, k), Math.max(5, 60 * c.S)];
}

/* ---------- 时间尺（光层） ---------- */
function ruler(fr, c, o = {}) {
  const a = o.a == null ? 1 : o.a; if (a <= 0) return; const y = c.yr, z = c.z;
  const x0 = o.from == null ? -20 : Math.max(-20, SX(c, o.from)), x1 = o.to == null ? W + 20 : Math.min(W + 20, SX(c, o.to));
  if (x1 > x0) fr.line(x0, y, x1, y, { w: 1.3, color: C.line, a: .55 * a, cap: 'butt' });
  const h0 = c.hc - 960 / z - 1, h1 = c.hc + 960 / z + 1;
  /* 小时刻度：近景每小时一根，拉远后只剩每天零点一根 */
  const hourA = ss(z, 22, 45) * (1 - ss(z, 140, 280)), dayA = 1;
  for (let h = Math.ceil(h0); h <= h1; h++) {
    const px = SX(c, h); if (px < x0 - 1 || px > x1 + 1) continue; const hh = ((h % 24) + 24) % 24;
    if (hh === 0) { fr.line(px, y - 10, px, y + 14, { w: 1.6, color: C.line, a: .8 * a * dayA * (o.dayTicks == null ? 1 : o.dayTicks), cap: 'butt' }); continue; }
    if (hourA <= .01) continue;
    const key = hh === 9 || hh === 15; fr.line(px, y - (key ? 7 : 4), px, y + (key ? 11 : 6), { w: key ? 1.4 : 1, color: C.line, a: (key ? .75 : .38) * a * hourA, cap: 'butt' });
  }
}
/* 钟点标注：近景时贴在刻度下面 */
function tickLabel(fr, c, h, zh, time, a = 1, col) {
  if (a <= 0) return; const px = SX(c, h), y = c.yr + 36;
  const wz = fr.measure(zh, { font: 'serifr', size: 25, track: 3 }), wt = fr.measure(time, { font: 'mono', size: 21 });
  const x0 = px - (wz + 12 + wt) / 2;
  fr.text(zh, x0, y, { font: 'serifr', size: 25, track: 3, color: col || C.label, align: 'l', a });
  fr.text(time, x0 + wz + 12, y + 1, { font: 'mono', size: 21, color: col || C.dim, align: 'l', a });
}

/* ---------- 每晚的东西 ---------- */
/* 一颗小硬币：零点那笔"我要变好了"。ok = 到账（金），否则灰色带一道斜杠 */
function coin(fr, x, y, r, ok, a = 1) {
  if (a <= 0 || r < 1) return;
  if (ok) { fr.glow(x, y, r * 3.2, C.gold, .32 * a); fr.circle(x, y, r, { fill: fr.rgrad(x - r * .3, y - r * .3, 0, r, [[0, '#FFF2CC', a], [.6, '#E9C377', a], [1, '#9E7A3A', a]]) }); if (r > 7) fr.text('$', x, y + 1, { font: 'latinm', size: r * 1.2, color: '#5A3E12', a }); }
  else { fr.circle(x, y, r, { color: '#6E737A', w: Math.max(1, r * .14), a: .7 * a }); fr.line(x - r * .6, y + r * .6, x + r * .6, y - r * .6, { w: Math.max(1, r * .14), color: C.rose, a: .75 * a }); }
}

G.TW = { NIGHTS, R, DOSE, READ, KEPT, pct, modal, minutes, labelOf, hOf, objS, cam, SX, vialH, day, moonXY, ruler, tickLabel, coin };
})(window);
