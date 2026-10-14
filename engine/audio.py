# -*- coding: utf-8 -*-
"""按画面事件表合成配乐和音效，再和画面合成成片。
  python audio.py <工程目录>                       # 读 audio/events.json → audio/score.wav → renders/final.mp4
  python audio.py <工程目录> --bgm 曲子.mp3 [-8]   # 用现成配乐垫底（默认 -8 dB），事件音照样叠上去
  python audio.py <工程目录> --wav-only            # 只出 wav，不合成

事件表由 render.py --events 导出：film.js 里每个 fr.sfx(时刻, 名字, 参数) 就是一条。
声音的写法学自参考片（C 家族）：
  低频长音垫底 · 每章开头一记带泛音的钟/垫和弦（约 8 秒衰减）· 屏幕上每打一个字一声"嗒" ·
  提问处一个上滑音 · 说到噪声就真的铺噪声 · 定理落地的那一下之后留 2–3 秒彻底静音（hush）。
事件名：tick / soft / chord / bloom / rise / thud / tock / stamp / shimmer / hush（参数 dur，秒）
META（film.js 的 meta）：{ root: 半音偏移, noise: [[起,止,强度0..1],...], silence: [[起,止],...], drone: 0..1 }
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np
from scipy.signal import fftconvolve, lfilter, butter

SR = 48000
D3 = 146.83
PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]           # 大调五声，嗒声从这里取音高
CHORD = [0, 7, 12, 14, 19, 24, 26]                   # 根音、五度、八度、九度…… 叠成"开阔"的和弦

def hz(semi, base=D3): return base * 2 ** (semi / 12)
def env_exp(n, tau, attack=0.004):
    t = np.arange(n) / SR
    return np.minimum(1, t / attack) * np.exp(-t / tau)
def lowpass(x, fc, order=2):
    b, a = butter(order, fc / (SR / 2), "low"); return lfilter(b, a, x, axis=0)
def highpass(x, fc, order=2):
    b, a = butter(order, fc / (SR / 2), "high"); return lfilter(b, a, x, axis=0)
def pan(x, p):                                        # p: -1 左 … 1 右
    l, r = np.cos((p + 1) * np.pi / 4), np.sin((p + 1) * np.pi / 4); return np.stack([x * l, x * r], 1)
def add(buf, x, t):
    i = int(t * SR)
    if i >= len(buf) or i < 0: return
    n = min(len(x), len(buf) - i); buf[i:i + n] += x[:n]

def tone(f, dur, tau, partials=((1, 1.0),), attack=0.004, vib=0.0):
    n = int(dur * SR); t = np.arange(n) / SR; out = np.zeros(n)
    for mult, amp in partials:
        ph = 2 * np.pi * f * mult * t + (vib * np.sin(2 * np.pi * 4.3 * t) if vib else 0)
        out += amp * np.sin(ph) * np.exp(-t / (tau / (1 + 0.35 * (mult - 1))))   # 高次泛音衰减更快
    return out * np.minimum(1, t / attack)

def ev_tick(rng, p):
    f = hz(PENTA[int(p.get("pitch", 0)) % len(PENTA)] + 24)
    x = tone(f, .5, .09, ((1, 1), (2.01, .28), (3.02, .1)), attack=.002)
    click = highpass(rng.standard_normal(int(.012 * SR)) * env_exp(int(.012 * SR), .003), 3000) * .25
    x[:len(click)] += click
    return pan(x * .16 * p.get("gain", 1), rng.uniform(-.35, .35))
def ev_soft(rng, p):
    return pan(tone(hz(12 + 7), 2.2, .7, ((1, 1), (2, .2)), attack=.03) * .12 * p.get("gain", 1), 0)
def ev_chord(rng, p):
    root = p.get("root", 0); n = int(9 * SR); out = np.zeros((n, 2))
    for k, semi in enumerate(CHORD):
        f = hz(root + semi); x = tone(f, 9, 2.6 - k * .12, ((1, 1), (2.003, .32), (3.01, .14), (4.02, .06)), attack=.012, vib=.6)
        out += pan(x * (.11 / (1 + k * .22)), (k % 3 - 1) * .5)
    sub = tone(hz(root - 12), 6, 2.2, ((1, 1),), attack=.02)
    out[:len(sub)] += pan(sub * .16, 0)
    return out * p.get("gain", 1)
def ev_bloom(rng, p):                                 # 闪白：和弦 + 一口气的噪声扫过
    out = ev_chord(rng, {"root": p.get("root", 0), "gain": 1.15 * p.get("gain", 1)})
    n = int(1.6 * SR); ns = rng.standard_normal((n, 2)) * env_exp(n, .35, .01)[:, None]
    out[:n] += lowpass(highpass(ns, 500), 7000) * .12
    return out
def ev_rise(rng, p):                                  # 上滑音：提问、蓄势
    dur = p.get("dur", 1.0); n = int(dur * SR); t = np.arange(n) / SR
    f = hz(7) * 2 ** (t / dur * 1.0); ph = 2 * np.pi * np.cumsum(f) / SR
    e = np.sin(np.pi * np.minimum(1, t / dur) ** 1.6) ** 1.2
    ns = lowpass(rng.standard_normal(n), 2500) * (t / dur) ** 2 * .22
    return pan((np.sin(ph) * .1 + ns * .1) * e * p.get("gain", 1), 0)
def ev_thud(rng, p):
    n = int(.6 * SR); t = np.arange(n) / SR; f = 95 * np.exp(-t * 9) + 48
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, .13, .002) + lowpass(rng.standard_normal(n), 600) * env_exp(n, .04) * .5
    return pan(x * .42 * p.get("gain", 1), 0)
def ev_tock(rng, p):
    f = 520 * 2 ** (int(p.get("pitch", 0)) * 2 / 12); n = int(.25 * SR)
    x = tone(f, .25, .04, ((1, 1), (2.7, .4), (5.1, .15)), attack=.001) + highpass(rng.standard_normal(n), 2500) * env_exp(n, .006) * .3
    return pan(x * .2 * p.get("gain", 1), rng.uniform(-.5, .5))
def ev_stamp(rng, p):
    n = int(.5 * SR); x = ev_thud(rng, {"gain": 1.1})[:n, 0] + highpass(rng.standard_normal(n), 1800) * env_exp(n, .02) * .35
    return pan(x * p.get("gain", 1), 0)
def ev_shimmer(rng, p):
    n = int(2.4 * SR); t = np.arange(n) / SR; out = np.zeros(n)
    for k in range(7): out += np.sin(2 * np.pi * hz(24 + PENTA[k + 2]) * t + rng.uniform(0, 6)) * np.exp(-((t - .25 - k * .06) / .5) ** 2)
    return pan(out * .035 * p.get("gain", 1), 0)
# ---------- 《毒药谜题》加的音效：都是合成的，不用采样 ----------
def addat(buf, x, i):                                 # 把 x 叠进 buf 的第 i 个采样起，长短不一时自动截断
    n = min(len(x), len(buf) - i)
    if n > 0: buf[i:i + n] += x[:n]
def bandpass(x, lo, hi, order=2):
    b, a = butter(order, [lo / (SR / 2), hi / (SR / 2)], "band"); return lfilter(b, a, x, axis=0)
def glide(f0, f1, dur, curve=1.0):                    # 频率从 f0 滑到 f1（指数），返回相位已积分的正弦
    n = int(dur * SR); u = (np.arange(n) / n) ** curve; f = f0 * (f1 / f0) ** u
    return np.sin(2 * np.pi * np.cumsum(f) / SR)
def ev_glass(rng, p):                                 # 玻璃瓶磕在桌上：一记不和谐的小钟声 + 一下更轻的回弹
    out = np.zeros(int(.9 * SR))
    for k, (delay, g) in enumerate([(0, 1.0), (.065, .45)]):
        f0 = 2150 * (1 + .03 * k); x = tone(f0, .8, .22, ((1, 1), (2.32, .5), (4.25, .28), (6.0, .12)), attack=.0008)
        cl = highpass(rng.standard_normal(int(.006 * SR)), 3500) * env_exp(int(.006 * SR), .0015) * .6; x[:len(cl)] += cl
        addat(out, x * g, int(delay * SR))
    addat(out, tone(140, .25, .05, ((1, 1),), attack=.001) * .25, 0)
    return pan(out * .2 * p.get("gain", 1), -.1)
def ev_paper(rng, p):                                 # 纸滑过桌面
    n = int(.45 * SR); t = np.arange(n) / SR; e = np.sin(np.pi * np.minimum(1, t / .45)) ** 1.5
    x = bandpass(rng.standard_normal(n), 700, 5200) * e * (.7 + .3 * np.abs(np.sin(t * 70)))
    return pan(x * .1 * p.get("gain", 1), rng.uniform(-.3, .3))
def ev_type(rng, p):                                  # 打字机的一个字
    n = int(.09 * SR); x = highpass(rng.standard_normal(n), 2000) * env_exp(n, .004, .0005) * .5
    x += tone(170 + 12 * (int(p.get("pitch", 0)) % 5), .09, .02, ((1, 1),), attack=.0005)[:n] * .8
    x += tone(3100, .09, .01, ((1, 1),), attack=.0003)[:n] * .25
    return pan(x * .1 * p.get("gain", 1), rng.uniform(-.25, .25))
def ev_pen(rng, p):                                   # 笔尖划纸：一段一段的沙沙声
    dur = p.get("dur", 1.0); n = int(dur * SR); t = np.arange(n) / SR
    strokes = np.abs(np.sin(2 * np.pi * (9 + 3 * np.sin(t * 2.3)) * t)) ** 2 * (.6 + .4 * rng.random(n) ** 4)
    x = bandpass(rng.standard_normal(n), 1600, 6500) * strokes * np.minimum(1, t / .05) * np.minimum(1, (dur - t) / .08)
    return pan(x * .07 * p.get("gain", 1), .15)
def ev_ding(rng, p):                                  # 到账提示音：两声清脆的小铃
    out = np.zeros(int(1.4 * SR))
    for delay, f0 in [(0, 1318.5), (.095, 1975.5)]:
        addat(out, tone(f0, 1.2, .42, ((1, 1), (2.0, .12), (3.01, .06)), attack=.003), int(delay * SR))
    return pan(out * .2 * p.get("gain", 1), .1)
def ev_scan(rng, p):                                  # 扫描：一道从低到高的气流 + 一根很细的滑音
    dur = p.get("dur", 1.5); n = int(dur * SR); t = np.arange(n) / SR; e = np.sin(np.pi * np.minimum(1, t / dur)) ** 1.3
    ns = rng.standard_normal(n); out = np.zeros(n); seg_n = 8
    for k in range(seg_n):                            # 分段带通，中心频率一路往上走
        a, b = k * n // seg_n, (k + 1) * n // seg_n; fc = 400 * (3000 / 400) ** (k / (seg_n - 1))
        out[a:b] = bandpass(ns, fc * .7, fc * 1.4)[a:b]
    x = out * e * .5 + glide(300, 900, dur)[:n] * e * .08
    return pan(x * .25 * p.get("gain", 1), 0)
def ev_strain(rng, p):                                # 往下拽：两根很近的低音拍出"绷紧"的感觉，越拽越紧
    dur = p.get("dur", 2.4); n = int(dur * SR); t = np.arange(n) / SR; u = t / dur
    x = glide(110, 130, dur) + glide(116, 141, dur) * .8
    trem = .7 + .3 * np.sin(2 * np.pi * (4 + 10 * u) * t); e = np.minimum(1, t / .2) * np.minimum(1, (dur - t) / .15)
    creak = bandpass(rng.standard_normal(n), 300, 900) * (rng.random(n) > .996) * 3
    return pan((x * trem * .12 + lowpass(creak, 1200) * .05) * e * p.get("gain", 1), 0)
def ev_snap(rng, p):                                  # 弹回去：一声向下滑的"嘣"
    x = glide(950, 230, .16, .6) * env_exp(int(.16 * SR), .08, .001)
    cl = highpass(rng.standard_normal(int(.008 * SR)), 2500) * env_exp(int(.008 * SR), .002) * .5; x[:len(cl)] += cl
    return pan(x * .28 * p.get("gain", 1), 0)
def ev_flip(rng, p):                                  # 翻一张卡片
    n = int(.08 * SR); x = np.zeros(n)
    for d in (0, .012): addat(x, bandpass(rng.standard_normal(int(.03 * SR)), 1000, 4500) * env_exp(int(.03 * SR), .006, .001), int(d * SR))
    return pan(x * .2 * p.get("gain", 1), rng.uniform(-.2, .2))
def ev_clock(rng, p):                                 # 钟摆的一声嘀嗒（木头）
    n = int(.12 * SR); x = tone(1800, .12, .008, ((1, 1),), attack=.0003)[:n] + tone(900, .12, .018, ((1, 1), (2.6, .3)), attack=.0005)[:n] * .7
    x += highpass(rng.standard_normal(n), 3000) * env_exp(n, .002) * .3
    return pan(x * .16 * p.get("gain", 1), .2)
def ev_fail(rng, p):                                  # 到账失败：两声往下走的闷音
    out = np.zeros(int(.5 * SR))
    for delay, f0 in [(0, 220), (.14, 174.6)]:
        n = int(.16 * SR); t = np.arange(n) / SR; x = (np.sin(2 * np.pi * f0 * t) + .35 * np.sin(2 * np.pi * 3 * f0 * t)) * np.minimum(1, t / .004) * np.exp(-t / .07)
        addat(out, lowpass(x, 1400), int(delay * SR))
    return pan(out * .3 * p.get("gain", 1), 0)
def ev_shrink(rng, p):                                # 缩小：一口往下走的风声 + 下滑音
    dur = .7; n = int(dur * SR); t = np.arange(n) / SR; e = np.sin(np.pi * np.minimum(1, t / dur)) ** 1.2
    ns = rng.standard_normal(n); out = np.zeros(n)
    for k in range(6): a, b = k * n // 6, (k + 1) * n // 6; fc = 5000 * (400 / 5000) ** (k / 5); out[a:b] = lowpass(ns, fc)[a:b]
    return pan((out * .5 + glide(800, 200, dur) * .1) * e * .25 * p.get("gain", 1), 0)
def ev_slide(rng, p):                                 # 沿尺子滑过去
    dur = p.get("dur", 1.8); n = int(dur * SR); t = np.arange(n) / SR; e = np.sin(np.pi * np.minimum(1, t / dur)) ** 1.6
    ns = rng.standard_normal(n); out = np.zeros(n)
    for k in range(8): a, b = k * n // 8, (k + 1) * n // 8; fc = 300 * 4 ** (k / 7); out[a:b] = bandpass(ns, fc * .6, fc * 1.6)[a:b]
    return pan(out * e * .18 * p.get("gain", 1), lerp_pan(t, dur))
def lerp_pan(t, dur): return 0
def ev_gulp(rng, p):                                  # 咕咚：两下往下沉的水声
    out = np.zeros(int(.6 * SR))
    for delay in (0, .17):
        n = int(.11 * SR); x = glide(320, 110, .11, .7)[:n] * env_exp(n, .05, .004); w = lowpass(rng.standard_normal(n), 900) * env_exp(n, .03) * .4
        addat(out, x + w, int(delay * SR))
    return pan(out * .45 * p.get("gain", 1), 0)

EV = dict(tick=ev_tick, soft=ev_soft, chord=ev_chord, bloom=ev_bloom, rise=ev_rise, thud=ev_thud, tock=ev_tock, stamp=ev_stamp, shimmer=ev_shimmer,
          glass=ev_glass, paper=ev_paper, type=ev_type, pen=ev_pen, ding=ev_ding, scan=ev_scan, strain=ev_strain, snap=ev_snap, flip=ev_flip,
          clock=ev_clock, fail=ev_fail, shrink=ev_shrink, slide=ev_slide, gulp=ev_gulp)

def reverb(x, rng, t60=3.6, wet=.42):
    n = int(t60 * SR); t = np.arange(n) / SR
    ir = lowpass(rng.standard_normal((n, 2)) * np.exp(-6.9 * t / t60)[:, None], 5200); ir[:int(.012 * SR)] *= np.linspace(0, 1, int(.012 * SR))[:, None]
    ir /= np.sqrt((ir ** 2).sum(0)).max()
    wetsig = np.stack([fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in (0, 1)], 1)
    return x + wetsig * wet

def synth(spec, bgm=False):
    end = spec["end"]; meta = spec.get("meta") or {}; n = int((end + .05) * SR); rng = np.random.default_rng(20261006)
    dry = np.zeros((n, 2)); t = np.arange(n) / SR; root = meta.get("root", 0)
    hush = [(when, when + p.get("dur", 2.5)) for when, name, p in spec["events"] if name == "hush"]
    for when, name, p in spec["events"]:
        if name in EV: add(dry, EV[name](rng, dict(p, root=p.get("root", 0) + root) if name in ("chord", "bloom") else p), when)
    out = reverb(dry, rng)
    if not bgm:                                       # 低频长音垫底：两个略微失谐的正弦 + 很慢的呼吸
        lv = .05 * meta.get("drone", 1)
        d = (np.sin(2 * np.pi * hz(root - 24) * t) + .6 * np.sin(2 * np.pi * hz(root - 24 + .08) * 2 * t) + .25 * np.sin(2 * np.pi * hz(root - 12 + 7) * t)) * (.75 + .25 * np.sin(2 * np.pi * t / 11))
        air = lowpass(highpass(rng.standard_normal(n), 300), 1800) * .012 * (.6 + .4 * np.sin(2 * np.pi * t / 17))
        out += np.stack([d * lv + air, d * lv + np.roll(air, 4000)], 1)
    for a, b, k in meta.get("noise", []):             # 文案说到噪声，配乐里就真的有噪声
        g = np.clip((t - a) / max(.01, b - a), 0, 1) ** 1.5 * (t <= b) * k
        out += lowpass(highpass(rng.standard_normal((n, 2)), 200), 6000) * (g * .12)[:, None]
    g = np.ones(n)
    for a, b in list(meta.get("silence", [])) + hush:  # 彻底静音：0.15s 收掉，0.4s 回来
        g *= 1 - np.clip((t - a) / .15, 0, 1) * (1 - np.clip((t - b) / .4, 0, 1))
    g *= np.clip(t / .6, 0, 1) * np.clip((end - t) / 1.2, 0, 1)
    out *= g[:, None]
    return out

def write_wav(path, x):
    import wave
    x = np.clip(x, -1, 1); pcm = (x * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

if __name__ == "__main__":
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    proj = Path(a[0]).resolve(); spec = json.load(open(proj / "audio/events.json", encoding="utf-8"))
    bgm = a[a.index("--bgm") + 1] if "--bgm" in a else None
    bgm_db = float(a[a.index("--bgm") + 2]) if bgm and len(a) > a.index("--bgm") + 2 and a[a.index("--bgm") + 2].lstrip("-").replace(".", "").isdigit() else -8
    x = synth(spec, bgm=bool(bgm)); pk = np.abs(x).max() or 1; x = x / pk * 10 ** (-3 / 20)
    wav = proj / "audio/score.wav"; write_wav(wav, x); print("score:", wav, f"{len(x) / SR:.1f}s", len(spec["events"]), "events")
    if "--wav-only" in a: sys.exit()
    raw, out, end = proj / "renders/raw.mp4", proj / "renders/final.mp4", spec["end"]
    if bgm:   # 现成配乐：垫底 + 事件音；整体到 -14 LUFS
        fc = f"[2:a]atrim=0:{end},volume={bgm_db}dB,afade=t=in:d=0.4,afade=t=out:st={end - 1.5}:d=1.5[b];[1:a][b]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]"
        cmd = ["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-i", str(wav), "-stream_loop", "-1", "-i", bgm, "-filter_complex", fc]
    else:     # 合成配乐本来就安静、动态大：只到 -18 LUFS，别压扁
        cmd = ["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-i", str(wav), "-filter_complex", "[1:a]loudnorm=I=-18:TP=-1.5:LRA=14[a]"]
    subprocess.run(cmd + ["-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", str(out)], check=True)
    print("done", out)
