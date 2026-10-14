/* props.js —《毒药谜题》的道具：药瓶、月亮表盘、太阳、到账通知、合同、时间尺。
 * 所有道具都拿一个原生 2D 上下文来画，所以既能画进 fr.look.under（不吃辉光的实物），也能画在光层（发光的高光、线、字）。
 * 药瓶分两遍画：vialUnder（药液、软木塞、标签这些实心的东西）和 vialLight（玻璃的高光、药液的辉光、预计线）。 */
(function (G) {
'use strict';
const { W, H, clamp, lerp, seg, smooth, ss, E, fade, hash, rng, rgba, mix } = G.VK;
const fontOf = G.VK.fontOf;

/* 颜色：每种只有一个意思（见 storyboard.md） */
const C = {
  ink: '#F2F4F3', sub: '#D9D9D8', label: '#8C98A3', dim: '#5E6B77', line: '#7F9DB4',
  ice: '#64E3F6', iceHi: '#A8FBFF', iceLo: '#508FA6', moon: '#E4F3FF',          // 真心
  gold: '#F8D893', goldHi: '#FFEBC0', goldLo: '#B09973',                        // 奖励
  rose: '#E84B75', roseLo: '#9E3550',                                           // 失约
  tox: '#38C47E', toxHi: '#A4F7C8', toxMid: '#1E8F57', toxLo: '#0A3A26', toxDeep: '#04180F',   // 药液
  sun: '#F2C98E',
  paper: '#BDB39C', paperHi: '#D3C9B1', paperLo: '#857B65', inkDark: '#251E16',
};

/* ---------- 药瓶的形状（单位：瓶高 = 100，原点在瓶底中心，y 向上为负） ---------- */
const VB = { hw: 21, iw: 19.5, top: -60, neck: 9.4, ineck: 7.4, neckTop: -79, lipTop: -83.2, lipHw: 11.2, corkTop: -98.5, bottom: 3.4, ry: .17 };
function bodyPath(x, inner) {
  const hw = inner ? VB.iw : VB.hw, nk = inner ? VB.ineck : VB.neck, by = inner ? -VB.bottom : 0, top = inner ? VB.top + 1.2 : VB.top;
  const r = inner ? 4.5 : 6;
  x.beginPath();
  x.moveTo(-hw, top);
  x.lineTo(-hw, by - r);
  x.quadraticCurveTo(-hw, by, -hw + r, by + (inner ? 0 : .6));
  x.lineTo(hw - r, by + (inner ? 0 : .6));
  x.quadraticCurveTo(hw, by, hw, by - r);
  x.lineTo(hw, top);
  x.quadraticCurveTo(hw, top - 8.5, nk, top - 10.5);
  x.lineTo(nk, VB.neckTop); x.lineTo(-nk, VB.neckTop);
  x.lineTo(-nk, top - 10.5);
  x.quadraticCurveTo(-hw, top - 8.5, -hw, top);
  x.closePath();
}
/* 液面高度：f = 0 空，1 满（满的时候液面在肩下面一点） */
const levelOf = f => -(VB.bottom + .2 + clamp(f) * 54.6);

/* 在 (cx, by) 摆一个高 h 像素的瓶子，tilt 绕瓶底转。fn(x, u) 在瓶子的本地坐标里画（线宽要除以 u） */
function inVial(x, cx, by, h, tilt, fn) { const u = h / 100; x.save(); x.translate(cx, by); if (tilt) x.rotate(tilt); x.scale(u, u); fn(x, u); x.restore(); }

/* 标签上的字：贴在圆柱上，离中线越远越窄 */
function cylText(x, str, cy, size, font, color, a, track = 0) {
  if (!str || a <= 0) return;
  x.save(); x.font = fontOf(font, size); x.textBaseline = 'middle'; x.textAlign = 'center';
  const cs = Array.from(str), ws = cs.map(c => x.measureText(c).width), total = ws.reduce((p, q) => p + q, 0) + track * (cs.length - 1);
  let s = -total / 2; const R = 20.8;
  cs.forEach((c, i) => {
    const mid = s + ws[i] / 2, ang = clamp(mid / R, -1.3, 1.3), px = R * Math.sin(ang), k = Math.cos(ang);
    x.save(); x.translate(px, cy + (1 - Math.cos(ang)) * 1.1); x.scale(k, 1); x.globalAlpha *= a * (.55 + .45 * k); x.fillStyle = color; x.fillText(c, 0, 0); x.restore();
    s += ws[i] + track;
  });
  x.restore();
}

/* o: { fill 0..1, tilt, slosh（液面倾角，弧度）, label: { top, main, sub, a, ink }, empty 残液, a, cork(0..1 在不在), floor: 地面阴影, glass 玻璃亮度 } */
function vialUnder(x, cx, by, h, o = {}) {
  const a = o.a == null ? 1 : o.a; if (a <= 0 || h < 2) return;
  const f = o.fill == null ? 1 : o.fill, tilt = o.tilt || 0, sl = o.slosh || 0;
  /* 地上的影子和透过药液投下的绿光（影子不跟着瓶子转） */
  if (o.floor !== 0) {
    const fl = (o.floor == null ? 1 : o.floor) * a, u = h / 100;
    x.save(); x.globalAlpha = fl;
    let g = x.createRadialGradient(cx, by + u, 0, cx, by + u, 30 * u); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.save(); x.translate(cx, by + u); x.scale(1, .16); x.beginPath(); x.arc(0, 0, 30 * u, 0, 6.2832); x.fill(); x.restore();
    x.restore();
  }
  inVial(x, cx, by, h, tilt, (x, u) => {
    x.globalAlpha = a;
    /* 玻璃本身：一层极淡的灰蓝，让空瓶也是"一个东西" */
    const gk = o.glass == null ? 1 : o.glass;
    bodyPath(x, false); x.fillStyle = rgba('#9FB8C8', .06 * gk); x.fill();
    { const sg = x.createLinearGradient(-VB.hw, 0, VB.hw, 0); sg.addColorStop(0, rgba('#CFE3F0', .16 * gk)); sg.addColorStop(.3, rgba('#CFE3F0', .03 * gk)); sg.addColorStop(.75, rgba('#CFE3F0', .02 * gk)); sg.addColorStop(1, rgba('#CFE3F0', .1 * gk));
      x.fillStyle = sg; x.fill(); }
    bodyPath(x, true); x.lineWidth = .45; x.strokeStyle = rgba('#BFD6E4', .1 * gk); x.stroke();
    /* 药液 */
    const ys = levelOf(f);
    if (f > .004) {
      x.save(); bodyPath(x, true); x.clip();
      x.save(); x.rotate(-tilt + sl);                                  // 液面在屏幕上保持水平（再加上晃动的倾角）
      const hg = x.createLinearGradient(-VB.iw, 0, VB.iw, 0);
      hg.addColorStop(0, '#02100A'); hg.addColorStop(.1, '#073222'); hg.addColorStop(.28, '#126645'); hg.addColorStop(.44, '#219A62'); hg.addColorStop(.54, '#26A86B'); hg.addColorStop(.7, '#16774D'); hg.addColorStop(.88, '#083826'); hg.addColorStop(1, '#02100A');
      x.fillStyle = hg; x.fillRect(-40, ys, 80, 120);
      const vg = x.createLinearGradient(0, ys, 0, 4); vg.addColorStop(0, 'rgba(150,255,200,.12)'); vg.addColorStop(.25, 'rgba(0,20,10,0)'); vg.addColorStop(1, 'rgba(0,10,5,.6)');
      x.fillStyle = vg; x.fillRect(-40, ys, 80, 120);
      /* 背面的玻璃把光聚成一道亮带，瓶底右侧有一小块焦散 */
      const bg = x.createLinearGradient(4, 0, 15, 0); bg.addColorStop(0, 'rgba(150,255,200,0)'); bg.addColorStop(.5, 'rgba(150,255,200,.16)'); bg.addColorStop(1, 'rgba(150,255,200,0)');
      x.fillStyle = bg; x.fillRect(4, ys + 2, 11, -ys - 4);
      /* 液面：从上往下看是一个椭圆 */
      const ry = VB.iw * VB.ry;
      const sg = x.createLinearGradient(0, ys - ry, 0, ys + ry); sg.addColorStop(0, '#0F4A30'); sg.addColorStop(.55, '#1E7E52'); sg.addColorStop(1, '#3DB57A');
      x.fillStyle = sg; x.beginPath(); x.ellipse(0, ys, VB.iw + 2, ry, 0, 0, 6.2832); x.fill();
      x.fillStyle = 'rgba(210,255,230,.22)'; x.beginPath(); x.ellipse(-8, ys - ry * .25, 6.5, ry * .32, -.05, 0, 6.2832); x.fill();   // 液面上映着的一块光
      x.restore(); x.restore();
    } else if (o.residue !== 0) {                                       // 空瓶：瓶底一薄层残液
      x.save(); bodyPath(x, true); x.clip(); x.fillStyle = rgba('#1E7A4C', .5 * (o.residue == null ? 1 : o.residue)); x.beginPath(); x.ellipse(0, -VB.bottom - .4, VB.iw - 1.5, 2.2, 0, 0, 6.2832); x.fill(); x.restore();
    }
    /* 软木塞 */
    if (o.cork !== 0) {
      const ca = o.cork == null ? 1 : o.cork; x.save(); x.globalAlpha *= ca;
      const t0 = VB.corkTop, b0 = VB.neckTop - 1.5, tw = 10.2, bw = 9.2;
      const cg = x.createLinearGradient(-tw, 0, tw, 0); cg.addColorStop(0, '#4A3220'); cg.addColorStop(.25, '#9A7650'); cg.addColorStop(.42, '#B89064'); cg.addColorStop(.75, '#7D5C3B'); cg.addColorStop(1, '#3B2817');
      x.fillStyle = cg; x.beginPath(); x.moveTo(-bw, b0); x.lineTo(-tw, t0 + 1.4); x.quadraticCurveTo(-tw, t0, -tw + 1.4, t0); x.lineTo(tw - 1.4, t0); x.quadraticCurveTo(tw, t0, tw, t0 + 1.4); x.lineTo(bw, b0); x.closePath(); x.fill();
      x.fillStyle = '#B79168'; x.beginPath(); x.ellipse(0, t0 + .2, tw - .6, 1.5, 0, 0, 6.2832); x.fill();
      const r = rng(77); if (h >= 90) for (let i = 0; i < 70; i++) { const px = (r() * 2 - 1) * 8.8, py = lerp(t0 + 2, b0 - 1, r()), s = .12 + r() * r() * .6, dark = r() > .22; x.fillStyle = rgba(dark ? '#2E1D0E' : '#E0C79F', dark ? .5 : .35); x.beginPath(); x.ellipse(px, py, s * 1.5, s, 0, 0, 6.2832); x.fill(); }
      x.fillStyle = 'rgba(30,18,8,.35)'; x.fillRect(-bw, b0 - 2.2, bw * 2, 2.2);
      for (let i = 0; i < 14; i++) { const px = (r() * 2 - 1) * 8, s = .2 + r() * .4; x.fillStyle = rgba('#6B4B2C', .6); x.beginPath(); x.ellipse(px, t0 + (r() - .5) * 1.6, s * 1.4, s * .5, 0, 0, 6.2832); x.fill(); }
      x.restore();
    }
    /* 瓶口的玻璃圈 */
    x.fillStyle = rgba('#B7CFD9', .09 * gk); x.beginPath(); x.roundRect(-VB.lipHw, VB.lipTop, VB.lipHw * 2, VB.neckTop - VB.lipTop + 1.2, 1.8); x.fill();
    /* 标签 */
    const L = o.label; if (L && (L.a == null || L.a > 0)) {
      const la = L.a == null ? 1 : L.a, y0 = -45.5, y1 = -14.5, hw = 20.7, bow = 1.5;
      x.save(); x.globalAlpha *= la; if (L.sx != null) x.scale(Math.max(.02, L.sx), 1);
      x.beginPath(); x.moveTo(-hw, y0); x.quadraticCurveTo(0, y0 + bow * 2, hw, y0); x.lineTo(hw, y1); x.quadraticCurveTo(0, y1 + bow * 2, -hw, y1); x.closePath();
      const pg = x.createLinearGradient(-hw, 0, hw, 0), pc = L.paper || C.paper;
      pg.addColorStop(0, mix(pc, '#000000', .62)); pg.addColorStop(.12, mix(pc, '#000000', .3)); pg.addColorStop(.33, mix(pc, '#FFFFFF', .12)); pg.addColorStop(.55, pc); pg.addColorStop(.85, mix(pc, '#000000', .35)); pg.addColorStop(1, mix(pc, '#000000', .7));
      x.fillStyle = pg; x.fill(); x.save(); x.clip();
      const r = rng(5); if (h >= 90) for (let i = 0; i < 60; i++) { x.fillStyle = rgba(r() > .5 ? '#000000' : '#FFFFFF', .035); x.fillRect(-hw + r() * hw * 2, y0 + r() * (y1 - y0 + 3), .5 + r() * 2, .3); }   // 纸纹
      x.lineWidth = .32; x.strokeStyle = rgba(C.inkDark, .55);
      [[1.5, 1.5], [2.3, 2.3]].forEach(([dx, dy]) => { x.beginPath(); x.moveTo(-hw + dx + 3, y0 + dy + 1.3); x.quadraticCurveTo(0, y0 + dy + bow * 2 + 1.1, hw - dx - 3, y0 + dy + 1.3); x.stroke(); x.beginPath(); x.moveTo(-hw + dx + 3, y1 - dy + 1.3); x.quadraticCurveTo(0, y1 - dy + bow * 2 + 1.1, hw - dx - 3, y1 - dy + 1.3); x.stroke(); });
      const ink = L.ink || C.inkDark;
      if (h < 64) { x.fillStyle = rgba(ink, .35); x.fillRect(-9, -30.5, 18, 4); x.fillRect(-6, -38.5, 12, 1.6); }
      else if (L.top) cylText(x, L.top, -38.2, L.topSize || 3.3, L.topFont || 'mono', rgba(L.topInk || ink, .85), L.topA == null ? 1 : L.topA, .35);
      if (h >= 64 && L.main) cylText(x, L.main, L.mainY || -28.6, L.size || 10, L.font || 'serifh', ink, L.mainA == null ? 1 : L.mainA, L.track || .6);
      if (h >= 64 && L.sub) cylText(x, L.sub, -19.6, L.subSize || 2.7, L.subFont || 'mono', rgba(ink, .75), L.subA == null ? 1 : L.subA, .3);
      if (L.strike) { x.strokeStyle = rgba(C.rose, .9); x.lineWidth = .9; x.beginPath(); x.moveTo(-12 * L.strike, -28.6); x.lineTo(12 * L.strike, -28.6); x.stroke(); }
      x.restore(); x.restore();
    }
  });
}

/* 光层：玻璃边缘、高光、药液的辉光、液面的亮边、预计线 */
function vialLight(x, cx, by, h, o = {}) {
  const a = o.a == null ? 1 : o.a; if (a <= 0 || h < 2) return;
  const f = o.fill == null ? 1 : o.fill, tilt = o.tilt || 0, sl = o.slosh || 0, gl = o.glass == null ? 1 : o.glass;
  inVial(x, cx, by, h, tilt, (x, u) => {
    x.globalAlpha = a; x.globalCompositeOperation = 'lighter'; const px = 1 / u;
    const ys = levelOf(f), ry = VB.iw * VB.ry;
    /* 药液自己的一点光：从里面透出来 */
    if (f > .004) {
      x.save(); bodyPath(x, true);
      if (o.label && (o.label.a == null || o.label.a > .02)) { x.moveTo(-21, -46); x.lineTo(-21, -13); x.lineTo(21, -13); x.lineTo(21, -46); x.closePath(); x.clip('evenodd'); } else x.clip();
      x.rotate(-tilt + sl);
      const gg = x.createRadialGradient(-5, (ys - VB.bottom) / 2 - 4, 0, -5, (ys - VB.bottom) / 2, 26); gg.addColorStop(0, rgba(C.tox, .24 * (o.glow == null ? 1 : o.glow))); gg.addColorStop(1, rgba(C.tox, 0));
      x.fillStyle = gg; x.fillRect(-30, ys - 4, 60, 70);
      /* 液面前沿的亮边 + 贴着玻璃往上翻的弯月面 */
      x.lineWidth = Math.max(.35, 1.3 * px); x.strokeStyle = rgba(C.toxHi, .55); x.beginPath(); x.ellipse(0, ys, VB.iw - .2, ry, 0, .15, Math.PI - .15); x.stroke();
      x.lineWidth = Math.max(.25, .8 * px); x.strokeStyle = rgba(C.toxHi, .22); x.beginPath(); x.ellipse(0, ys, VB.iw - .2, ry, 0, Math.PI + .2, Math.PI * 2 - .2); x.stroke();
      const cg = x.createRadialGradient(9, -VB.bottom - 5, 0, 9, -VB.bottom - 5, 9); cg.addColorStop(0, 'rgba(190,255,220,.35)'); cg.addColorStop(1, 'rgba(190,255,220,0)');
      x.fillStyle = cg; x.fillRect(0, -VB.bottom - 14, 18, 14);
      /* 几颗贴在瓶壁上的小气泡 */
      const r = rng(9); if (h >= 90) for (let i = 0; i < 7; i++) { const bx = (r() * 2 - 1) * 15, byy = lerp(-VB.bottom - 3, ys + 3, r()), br = .35 + r() * .55; if (byy < ys + 1) continue; x.lineWidth = .22; x.strokeStyle = rgba('#CFFFE6', .35); x.beginPath(); x.arc(bx, byy, br, 0, 6.2832); x.stroke(); x.fillStyle = rgba('#FFFFFF', .3); x.beginPath(); x.arc(bx - br * .35, byy - br * .35, br * .3, 0, 6.2832); x.fill(); }
      x.restore();
    }
    /* 玻璃：左边是主光，边缘亮；右边一道轮廓光 */
    const edge = (xx, y0, y1, w, al) => { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, 'rgba(220,240,255,0)'); g.addColorStop(.3, rgba('#DCF0FF', al)); g.addColorStop(.75, rgba('#DCF0FF', al * .8)); g.addColorStop(1, 'rgba(220,240,255,0)'); x.strokeStyle = g; x.lineWidth = w; x.beginPath(); x.moveTo(xx, y0); x.lineTo(xx, y1); x.stroke(); };
    const L = o.label && (o.label.a == null || o.label.a > .02);
    const ly0 = L ? -45.5 : 0, ly1 = L ? -14.5 : 0;
    const streak = (xx, w, al) => { if (L) { edge(xx, -58, ly0 - .5, w, al); edge(xx, ly1 + 1, -4, w, al * .8); } else edge(xx, -58, -4, w, al); };
    edge(-VB.hw + .5, -59, -3, Math.max(.5, 1.6 * px), .75 * gl);
    edge(VB.hw - .5, -59, -3, Math.max(.4, 1.1 * px), .38 * gl);
    streak(-14.5, 3.2, .16 * gl); streak(-12, .55, .6 * gl); streak(15.5, 1.6, .1 * gl);
    /* 肩、瓶颈、瓶口 */
    x.lineWidth = Math.max(.4, 1.2 * px); x.strokeStyle = rgba('#DCF0FF', .5 * gl); x.beginPath(); x.moveTo(-VB.hw + .4, VB.top); x.quadraticCurveTo(-VB.hw + .4, VB.top - 8.3, -VB.neck + .3, VB.top - 10.3); x.stroke();
    x.strokeStyle = rgba('#DCF0FF', .25 * gl); x.beginPath(); x.moveTo(VB.hw - .4, VB.top); x.quadraticCurveTo(VB.hw - .4, VB.top - 8.3, VB.neck - .3, VB.top - 10.3); x.stroke();
    edge(-VB.neck + .45, VB.top - 10.2, VB.neckTop, Math.max(.4, 1.1 * px), .55 * gl); edge(-6, VB.top - 10, VB.neckTop + .5, .5, .3 * gl);
    x.lineWidth = Math.max(.3, .8 * px); x.strokeStyle = rgba('#DCF0FF', .26 * gl); x.beginPath(); x.roundRect(-VB.lipHw, VB.lipTop, VB.lipHw * 2, VB.neckTop - VB.lipTop + 1.2, 1.8); x.stroke();
    edge(-VB.lipHw + .6, VB.lipTop + .3, VB.neckTop + .9, Math.max(.4, 1.2 * px), .7 * gl);
    x.fillStyle = rgba('#FFFFFF', .6 * gl); x.beginPath(); x.ellipse(-VB.lipHw + 2.4, VB.lipTop + 1.1, 1.3, .55, 0, 0, 6.2832); x.fill();
    /* 瓶底：厚玻璃的前沿 */
    x.lineWidth = Math.max(.4, 1.2 * px); x.strokeStyle = rgba('#DCF0FF', .35 * gl); x.beginPath(); x.ellipse(0, -2.4, VB.hw - 3.5, 2.4, 0, .25, Math.PI - .25); x.stroke();
    x.strokeStyle = rgba('#DCF0FF', .12 * gl); x.beginPath(); x.ellipse(0, -VB.bottom - .2, VB.iw - 1, 2.6, 0, Math.PI + .3, Math.PI * 2 - .3); x.stroke();
    /* 空瓶的玻璃会多亮几道 */
    if (f <= .004) { streak(-8, .45, .35 * gl); streak(10, .4, .22 * gl); }
    /* 预计线：冰蓝虚线，标出"你预见自己会喝到哪"。mark: 0 = 一口不喝（停在液面），1 = 喝光（瓶底） */
    if (o.mark != null && (o.markA == null || o.markA > 0)) {
      const ma = o.markA == null ? 1 : o.markA, my = lerp(levelOf(f) - .5, -VB.bottom - 1, clamp(o.mark));
      x.save(); x.rotate(-tilt); x.setLineDash([2.2, 1.6]); x.lineDashOffset = -(o.dash || 0);
      const mc = mix(C.iceHi, C.rose, clamp(o.markCol || 0)), mg = mix(C.ice, C.rose, clamp(o.markCol || 0));
      x.lineWidth = Math.max(.6, 2.2 * px); x.strokeStyle = rgba(mc, .95 * ma); x.shadowColor = rgba(mg, .9); x.shadowBlur = 10;
      x.beginPath(); x.ellipse(0, my, VB.hw + 3.5, (VB.hw + 3.5) * VB.ry, 0, .02, Math.PI - .02); x.stroke();
      x.setLineDash([]); x.lineWidth = Math.max(.5, 1.6 * px);
      x.beginPath(); x.moveTo(VB.hw + 3.5, my); x.lineTo(VB.hw + 9, my); x.stroke();
      x.fillStyle = rgba(mc, ma); x.beginPath(); x.moveTo(VB.hw + 3.6, my); x.lineTo(VB.hw + 6.2, my - 1.6); x.lineTo(VB.hw + 6.2, my + 1.6); x.closePath(); x.fill();
      x.restore();
    }
  });
}
/* 虚线画的空瓶：预见里的那只空瓶（光层） */
function ghostVial(x, cx, by, h, a = 1, dash = 0) {
  if (a <= 0 || h < 4) return;
  inVial(x, cx, by, h, 0, (x, u) => {
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = a; x.setLineDash([3, 2.4]); x.lineDashOffset = -dash;
    x.lineWidth = Math.max(.5, 1.8 / u); x.strokeStyle = rgba(C.iceHi, .9); x.shadowColor = rgba(C.ice, .9); x.shadowBlur = 10;
    bodyPath(x, false); x.stroke();
    x.beginPath(); x.roundRect(-10, VB.corkTop, 20, VB.neckTop - VB.corkTop - 1, 1.6); x.stroke();
    x.setLineDash([]); x.fillStyle = rgba(C.ice, .06); bodyPath(x, false); x.fill();
  });
}
/* 一次画完两遍（只在同一层里画的时候用，比如小图标） */
function vial(x, cx, by, h, o) { vialUnder(x, cx, by, h, o); vialLight(x, cx, by, h, o); }
/* 预计线在屏幕上的位置（给标注用） */
function markPos(cx, by, h, o) { const u = h / 100, f = o.fill == null ? 1 : o.fill, my = lerp(levelOf(f) - .5, -VB.bottom - 1, clamp(o.mark || 0)); return [cx + (VB.hw + 9) * u, by + my * u]; }
const vialTop = (by, h) => by + VB.corkTop * h / 100;
const vialHalfW = h => VB.hw * h / 100;

/* ---------- 月亮：亮面比例 = 真心读数 ----------
 * k 0..1 是亮面占的比例；从右边亮起（盈），细的时候是一弯。o: { a, glow, earth 暗面的地照, seed } */
function moon(x, cx, cy, r, k, o = {}) {
  const a = o.a == null ? 1 : o.a; if (a <= 0 || r < .5) return; k = clamp(k);
  x.save(); x.globalAlpha = a;
  /* 暗面：一点点地照 */
  const eg = x.createRadialGradient(cx - r * .3, cy - r * .3, 0, cx, cy, r); eg.addColorStop(0, rgba('#2A3648', .55 * (o.earth == null ? 1 : o.earth))); eg.addColorStop(1, rgba('#121A26', .5 * (o.earth == null ? 1 : o.earth)));
  x.fillStyle = eg; x.beginPath(); x.arc(cx, cy, r, 0, 6.2832); x.fill();
  if (k > .002) {
    x.save(); x.beginPath();
    const tx = r * Math.abs(1 - 2 * k);                              // 明暗交界线是一个半椭圆
    x.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
    if (k < .5) x.ellipse(cx, cy, tx, r, 0, Math.PI / 2, -Math.PI / 2, true);
    else x.ellipse(cx, cy, tx, r, 0, Math.PI / 2, Math.PI * 1.5, false);
    x.closePath(); x.clip();
    const mg = x.createRadialGradient(cx + r * .25, cy - r * .3, r * .1, cx, cy, r * 1.05); mg.addColorStop(0, '#DCE9F4'); mg.addColorStop(.55, '#B3C8DA'); mg.addColorStop(1, '#7590AA');
    x.fillStyle = mg; x.fillRect(cx - r, cy - r, r * 2, r * 2);
    if (r > 7) { const rr = rng(o.seed || 3); for (let i = 0; i < 18; i++) { const ang = rr() * 6.2832, d = Math.sqrt(rr()) * r * .84, s = r * (.04 + rr() * .14); x.fillStyle = rgba('#5F7A95', .3 + rr() * .25); x.beginPath(); x.ellipse(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, s, s * .85, 0, 0, 6.2832); x.fill(); x.fillStyle = rgba('#E8F2FA', .25); x.beginPath(); x.ellipse(cx + Math.cos(ang) * d + s * .25, cy + Math.sin(ang) * d + s * .3, s * .7, s * .35, 0, 0, 3.1416); x.fill(); } }
    x.restore();
  }
  x.restore();
}
/* 月光（光层用）：亮面越大越亮 */
function moonGlow(fr, cx, cy, r, k, a = 1) { if (a <= 0) return; fr.glow(cx + r * (1 - k) * .5, cy, r * 3.2, C.ice, (.08 + .32 * k) * a); fr.glow(cx, cy, r * 1.6, C.moon, .12 * k * a); }

/* 扫描仪表盘：围着月亮的一圈刻度，0 在左下，100 在右下（扫过 240°） */
const G0 = Math.PI * .8333, G1 = Math.PI * 2.1667;
function gaugeRing(fr, cx, cy, R, v, o = {}) {
  const a = o.a == null ? 1 : o.a; if (a <= 0) return; const k = clamp(v / 100), ang = q => lerp(G0, G1, q), grow = o.grow == null ? 1 : o.grow;
  fr.arc(cx, cy, R, G0, lerp(G0, G1, grow), { color: C.line, w: 1.2, a: .45 * a, cap: 'butt' });
  for (let i = 0; i <= 20; i++) {
    const q = i / 20; if (q > grow + .001) break; const an = ang(q), big = i % 5 === 0, r0 = R + (big ? 4 : 3), r1 = R + (big ? 16 : 9);
    fr.line(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0, cx + Math.cos(an) * r1, cy + Math.sin(an) * r1, { w: big ? 1.6 : 1, color: C.line, a: (big ? .75 : .45) * a, cap: 'butt' });
    if (big && o.nums !== false) fr.text(String(i * 5), cx + Math.cos(an) * (R + 34), cy + Math.sin(an) * (R + 34), { font: 'latin', size: o.numSize || 24, color: C.label, a: .8 * a });
  }
  if (k > .002) fr.arc(cx, cy, R, G0, ang(k), { color: C.iceHi, w: 3.2, a: .95 * a, glow: 14, glowColor: C.ice, cap: 'round', add: true });
  const an = ang(k); fr.line(cx + Math.cos(an) * (R - 9), cy + Math.sin(an) * (R - 9), cx + Math.cos(an) * (R + 20), cy + Math.sin(an) * (R + 20), { w: 3, color: C.iceHi, a, glow: 12, glowColor: C.ice });
  fr.spark(cx + Math.cos(an) * R, cy + Math.sin(an) * R, 5, C.ice, .9 * a);
}

/* ---------- 太阳（下午的刻度上） ---------- */
function sun(fr, cx, cy, r, a = 1, t = 0) {
  if (a <= 0) return;
  fr.glow(cx, cy, r * 5, C.sun, .16 * a); fr.glow(cx, cy, r * 2, '#FFE2B0', .3 * a);
  fr.circle(cx, cy, r, { fill: fr.rgrad(cx - r * .3, cy - r * .3, 0, r, [[0, '#FFF6E2', a], [.7, '#F7D9A6', a], [1, '#E9B676', a]]) });
  for (let i = 0; i < 16; i++) { const an = i / 16 * 6.2832 + t * .03, r0 = r * 1.4, r1 = r * (i % 2 ? 1.75 : 2.05); fr.line(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0, cx + Math.cos(an) * r1, cy + Math.sin(an) * r1, { w: Math.max(.8, r * .05), color: C.sun, a: .4 * a }); }
}

/* ---------- 到账通知：一张深色玻璃卡片 ----------
 * o: { a, s 缩放, title, amount（金额字符串）, text（替代金额的一行字）, state: 'ok' | 'fail' | 'done'（已领取）, flip 0..1（金额和字互换）} */
function notice(fr, cx, cy, o = {}) {
  const a = o.a == null ? 1 : o.a; if (a <= 0) return; const s = o.s == null ? 1 : o.s, w = (o.w || 430), h = 112;
  const st = o.state || 'ok', fail = st === 'fail', wait = st === 'wait', done = st === 'done' || wait, col = fail ? C.rose : wait ? C.goldLo : done ? '#8E8A80' : C.gold;
  fr.g({ at: [cx, cy], s, a }, () => {
    if (!fail && !done) fr.glow(0, 0, w * .75, C.gold, .1);
    fr.rect(-w / 2, -h / 2, w, h, { r: 24, fill: fr.grad(0, -h / 2, 0, h / 2, [[0, '#1A1E27', .92], [1, '#0B0E14', .92]]) });
    fr.rect(-w / 2, -h / 2, w, h, { r: 24, color: fail ? C.roseLo : done ? '#5A5850' : '#8C7A52', w: 1.4, a: .8 });
    /* 左边的图标：一枚硬币 */
    const ix = -w / 2 + 56; fr.circle(ix, 0, 28, { fill: fr.rgrad(ix - 8, -8, 2, 30, [[0, fail || done ? '#A5A39C' : '#FFF0C8'], [.6, fail || done ? '#6E6C66' : '#E8C277'], [1, fail || done ? '#4A4844' : '#9C7838']]) });
    fr.text(fail ? '!' : '$', ix, 1, { font: 'latinm', size: 34, color: fail || done ? '#2A2926' : '#5A3E12' });
    fr.text(o.title || (fail ? '到账失败' : wait ? '喝完再领' : done ? '已领取' : '到账通知'), ix + 48, -24, { font: 'sansm', size: 22, color: fail ? C.rose : '#9AA3AD', align: 'l' });
    const k = clamp(o.flip || 0), body = (str, al) => { if (al <= .01 || !str) return; const isNum = /^[$\d,.+]+$/.test(str); fr.text(str, ix + 48, 16, { font: isNum ? 'latinm' : 'serifm', size: isNum ? 44 : 34, color: col, align: 'l', a: al, glow: fail || done ? 0 : 10, glowA: .35 }); };
    body(o.amount, (1 - k) * (o.amountA == null ? 1 : o.amountA)); body(o.text, k);
    if (o.time) fr.text(o.time, w / 2 - 26, -24, { font: 'mono', size: 18, color: '#6C7680', align: 'r' });
  });
}

/* ---------- 合同（纸面，画进 under 层） ----------
 * lines: [{ str, at（开始打字的时刻）, cps（每秒几个字）, y, size, hl: [[from, to, color]] 高亮的字段 }]，t 是当前时刻 */
function paperCard(x, cx, cy, w, h, o = {}) {
  const a = o.a == null ? 1 : o.a; if (a <= 0) return;
  x.save(); x.globalAlpha = a; x.translate(cx, cy); x.rotate(o.rot || 0);
  x.fillStyle = 'rgba(0,0,0,.45)'; x.filter = 'blur(18px)'; x.fillRect(-w / 2 + 14, -h / 2 + 22, w, h); x.filter = 'none';
  const g = x.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); g.addColorStop(0, '#ADA48F'); g.addColorStop(.45, '#958C78'); g.addColorStop(1, '#6E6656');
  x.fillStyle = g; x.fillRect(-w / 2, -h / 2, w, h);
  const r = rng(o.seed || 11); for (let i = 0; i < 260; i++) { x.fillStyle = rgba(r() > .5 ? '#000000' : '#FFFFFF', .03); x.fillRect(-w / 2 + r() * w, -h / 2 + r() * h, 1 + r() * 6, .8); }
  x.strokeStyle = rgba('#3A3024', .55); x.lineWidth = 1.2; x.strokeRect(-w / 2 + 22, -h / 2 + 22, w - 44, h - 44); x.lineWidth = .6; x.strokeRect(-w / 2 + 28, -h / 2 + 28, w - 56, h - 56);
  x.restore();
}
/* 打字：返回已经打出的字数 */
function typed(x, str, px, py, t, at, cps, o = {}) {
  const cs = Array.from(str), n = clamp(Math.floor((t - at) * cps), 0, cs.length); if (t < at) return 0;
  x.save(); x.textBaseline = 'middle'; x.textAlign = 'left'; let cx = px;
  for (let i = 0; i < n; i++) {
    const c = cs[i], isLat = /[\x20-\x7E]/.test(c), font = isLat ? (o.latFont || 'type') : (o.font || 'serifm'), size = (o.size || 28) * (isLat ? 1.04 : 1);
    x.font = fontOf(font, size); const w = x.measureText(c).width;
    let col = o.color || C.inkDark; (o.hl || []).forEach(([p, q, cc]) => { if (i >= p && i < q) col = cc; });
    const age = t - at - i / cps; x.globalAlpha = (o.a == null ? 1 : o.a) * (.35 + .65 * clamp(age / .08));
    x.fillStyle = col; x.fillText(c, cx, py + (isLat ? 1 : 0)); cx += w + (o.track || 0);
  }
  if (n < cs.length && n > 0 && o.cursor !== false) { x.globalAlpha = (o.a == null ? 1 : o.a) * .8; x.fillStyle = C.inkDark; x.fillRect(cx + 2, py - (o.size || 28) * .45, 2, (o.size || 28) * .9); }
  x.restore(); return n;
}
/* 签名：一笔写出来（k 0..1） */
function signature(x, px, py, s, k, a = 1, seed = 1) {
  if (k <= 0) return; const r = rng(seed), pts = [];
  const loops = [[34, 30], [16, 22], [21, 19], [13, 18], [17, 17], [11, 16]];    // [高, 前进]
  let cx = 0; pts.push([0, 6]);
  loops.forEach(([amp, adv], j) => { for (let i = 1; i <= 26; i++) { const q = i / 26 * 6.2832, lean = .32; const yy = -amp * (1 - Math.cos(q)) / 2 + (j ? 0 : 4 * (1 - q / 6.2832)); pts.push([cx + adv * i / 26 - 9 * Math.sin(q) + lean * -yy, yy + 6]); } cx += adv; });
  const ex = cx, n0 = pts.length; for (let i = 1; i <= 36; i++) { const u = i / 36; pts.push([lerp(ex, -24, u), 6 + 18 * Math.sin(u * Math.PI) * .6 + u * 10]); }
  const n = Math.max(2, Math.floor(pts.length * clamp(k)));
  x.save(); x.globalAlpha = a; x.strokeStyle = '#18264A'; x.lineCap = 'round'; x.lineJoin = 'round';
  for (let i = 1; i < n; i++) { const w = (i < n0 ? 2.6 : 2.2) * s * (.75 + .5 * Math.abs(Math.sin(i * .37))); x.lineWidth = w; x.beginPath(); x.moveTo(px + pts[i - 1][0] * s, py + pts[i - 1][1] * s); x.lineTo(px + pts[i][0] * s, py + pts[i][1] * s); x.stroke(); }
  x.restore();
}

/* ---------- 桌面：一块很暗的反光平面，药瓶在上面有倒影 ---------- */
function floorPlane(x, y, o = {}) {
  const a = o.a == null ? 1 : o.a; if (a <= 0) return;
  x.save(); x.globalAlpha = a;
  const g = x.createLinearGradient(0, y, 0, H); g.addColorStop(0, '#0A0E16'); g.addColorStop(.25, '#05070C'); g.addColorStop(1, '#020305'); x.fillStyle = g; x.fillRect(0, y, W, H - y);
  if (o.pool) { const [px, pw, pa] = o.pool; const pg = x.createRadialGradient(px, y + 30, 0, px, y + 30, pw); pg.addColorStop(0, rgba('#22303F', .55 * pa)); pg.addColorStop(1, rgba('#22303F', 0)); x.save(); x.translate(px, y + 30); x.scale(1, .22); x.translate(-px, -(y + 30)); x.fillStyle = pg; x.fillRect(px - pw, y + 30 - pw, pw * 2, pw * 2); x.restore(); }
  if (o.line !== 0) { x.fillStyle = rgba('#9DB4C8', .16 * (o.line == null ? 1 : o.line)); x.fillRect(0, y, W, 1.2); }
  x.restore();
}
/* 倒影：把药瓶上下翻过来画进一张小画布，用渐变从上往下抹淡，再贴到桌面上 */
let RC = null;
function vialReflection(x, cx, by, h, o = {}) {
  const a = (o.a == null ? 1 : o.a) * (o.refl == null ? .2 : o.refl); if (a <= .002 || h < 8) return;
  const rw = Math.ceil(h * .64), rh = Math.ceil(h * .6);
  if (!RC) RC = document.createElement('canvas');
  if (RC.width < rw || RC.height < rh) { RC.width = Math.max(RC.width, rw); RC.height = Math.max(RC.height, rh); }
  const r = RC.getContext('2d'); r.setTransform(1, 0, 0, 1, 0, 0); r.globalCompositeOperation = 'source-over'; r.globalAlpha = 1; r.clearRect(0, 0, rw, rh);
  r.setTransform(1, 0, 0, -1, rw / 2 - cx, by);
  vialUnder(r, cx, by, h, Object.assign({}, o, { a: 1, floor: 0 }));
  r.setTransform(1, 0, 0, 1, 0, 0); r.globalCompositeOperation = 'destination-in';
  const g = r.createLinearGradient(0, 0, 0, rh); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.12, 'rgba(0,0,0,.45)'); g.addColorStop(.26, 'rgba(0,0,0,.08)'); g.addColorStop(.4, 'rgba(0,0,0,0)');
  r.fillStyle = g; r.fillRect(0, 0, rw, rh); r.globalCompositeOperation = 'source-over';
  x.save(); x.globalAlpha = a; x.drawImage(RC, 0, 0, rw, rh, cx - rw / 2, by + 1, rw, rh); x.restore();
}
/* 透过药液照到桌上的一小片绿光（光层） */
function caustic(fr, cx, by, h, k = 1) { if (k <= 0) return; const u = h / 100; fr.g({ at: [cx + 6 * u, by + 3 * u], s: [1, .2] }, () => fr.glow(0, 0, 34 * u, C.tox, .22 * k)); }

G.TX = { C, VB, ghostVial, floorPlane, vialReflection, caustic, vialUnder, vialLight, vial, markPos, vialTop, vialHalfW, levelOf, moon, moonGlow, gaugeRing, sun, notice, paperCard, typed, signature, inVial };
})(window);
