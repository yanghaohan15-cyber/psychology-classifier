/* ★《毒药谜题》· C 夜曲 · 约 3 分 32 秒。分镜表见 storyboard.md，事实和出处见 facts.md。
 *
 * 一个世界：一条时间尺（world.js）。药瓶立在每天下午的刻度上，月亮挂在每个零点上。
 * 一把尺子：扫描仪的"真心读数"——零点读一次，读的是药瓶上那条冰蓝色的"预计线"；读数同时画成月亮的亮面。
 * 颜色：毒绿 = 药液（明天要付出的苦）· 冰蓝 = 真心 · 金 = 奖励 · 玫红 = 失约。
 * 事实：Kavka, "The Toxin Puzzle", Analysis 43(1), 1983。9:00 / 15:00 两个钟点、读数模型、月相、药量都是示意（片中写明）。
 *
 * 文件：props.js 道具 · world.js 时间尺、摄影机、读数模型 · ch0.js 序和片名 · ch1–ch4.js 四章 + 尾声 · 本文件只放字幕、章节和调度。 */
(function () {
'use strict';
const { W, H, clamp, lerp, seg, smooth, ss, E, fade, hash, rng, rgba, mix } = VK;
const K = VKit, X = TX, Wd = TW, C = X.C, CH = window.CH;

const SUBS = [
  { a: .6,    b: 4.4,   zh: '有人在你面前，放下一瓶毒药。', en: 'Someone sets a vial of poison in front of you.' },
  { a: 4.8,   b: 9.0,   zh: '喝下去，难受一整天；不会死，也不留后遗症。', en: 'Drink it and you’ll be sick for a day. It won’t kill you, and it leaves no trace.' },
  { a: 9.4,   b: 13.2,  zh: '他出一百万美元，不是让你喝——', en: 'He’ll pay you a million dollars. Not for drinking it —' },
  { a: 13.6,  b: 17.8,  zh: '只要今晚零点，你{打算}明天下午喝下它。', en: 'only for intending, at midnight tonight, to drink it tomorrow afternoon.' },
  { a: 18.2,  b: 22.4,  zh: '钱明早到账。到了下午，喝不喝，随你。', en: 'The money arrives in the morning. Come the afternoon, drink it or don’t.' },
  /* 01 欲 */
  { a: 37.6,  b: 41.8,  zh: '你心想：今晚打算一下，明天不喝就是了。', en: 'You think: intend it tonight, skip it tomorrow.' },
  { a: 42.2,  b: 46.4,  zh: '可零点那一刻，有台扫描仪，读你是不是真打算。', en: 'But at midnight, a scanner reads whether you truly intend it.' },
  { a: 46.8,  b: 51.0,  zh: '它不听你说什么，只看你预见的明天。', en: 'It ignores what you say. It reads the tomorrow you foresee.' },
  { a: 51.4,  b: 54.8,  zh: '那就逼自己，真心想喝？', en: 'Then force yourself to mean it?' },
  { a: 55.2,  b: 59.6,  zh: '可你清楚：钱一到账，喝下去只剩难受。', en: 'But you know: once the money is in, drinking buys you nothing but pain.' },
  { a: 60.0,  b: 64.6,  zh: '钱加到一千万、一个亿——指针纹丝不动。', en: 'Make it ten million. A hundred million. The needle doesn’t move.' },
  { a: 65.0,  b: 68.6,  zh: '你想要的是{钱}，不是那瓶药。', en: 'What you want is the money, not the vial.' },
  { a: 69.0,  b: 73.8,  zh: '哲学家 Kavka 的结论：理性的人，拿不到这一百万。', en: 'Kavka’s verdict: a rational person cannot win this million.' },
  /* 02 真 */
  { a: 75.2,  b: 79.2,  zh: '可这份合同，你几乎每晚都在签。', en: 'Yet you sign this contract almost every night.' },
  { a: 79.6,  b: 84.0,  zh: '明天早起。明天一定写完。明天开始跑步。', en: 'Up early tomorrow. Finish it tomorrow, for sure. Start running tomorrow.' },
  { a: 84.4,  b: 88.6,  zh: '话一出口，奖励当场{到账}。', en: 'The moment you say it, the reward lands.' },
  { a: 89.0,  b: 93.8,  zh: '那种“我要变好了”的感觉，就是零点的一百万。', en: 'That “I’m turning it around” feeling — that is the midnight million.' },
  { a: 94.2,  b: 98.4,  zh: '到了第二天下午，奖励早就领过了。', en: 'By the next afternoon, the reward has long been collected.' },
  { a: 98.8,  b: 102.2, zh: '剩下的，只有那瓶药。于是，你没喝。', en: 'All that’s left is the vial. So you don’t drink.' },
  { a: 102.6, b: 105.6, zh: '你没有撒谎。', en: 'You didn’t lie.' },
  { a: 106.0, b: 111.2, zh: '两个你都是真心的——只是不在同一个钟点。', en: 'Both of you meant it. Just not at the same hour.' },
  /* 03 往 */
  { a: 112.6, b: 116.2, zh: '然后，是下一个晚上。', en: 'Then comes the next night.' },
  { a: 116.6, b: 120.4, zh: '一瓶，又一瓶，都没喝。', en: 'Another vial. And another. None of them touched.' },
  { a: 124.0, b: 128.6, zh: '扫描仪预见你的明天，靠的是你的过去。', en: 'To foresee your tomorrow, the scanner reads your past.' },
  { a: 129.0, b: 133.2, zh: '每失约一次，下一晚的真心，就少一点。', en: 'Every broken promise leaves the next night a little less sincere.' },
  { a: 133.6, b: 138.0, zh: '明天一定。明天尽量。{!下次再说}。', en: '“Tomorrow, for sure.” “Tomorrow, I’ll try.” “Next time.”' },
  { a: 138.4, b: 143.0, zh: '到最后，连零点那一百万，也不再到账了。', en: 'In the end, even the midnight million stops arriving.' },
  { a: 143.4, b: 148.6, zh: '你成了题里的那个人：清醒，理性，拿不到钱。', en: 'You’ve become the person in the puzzle: clear-eyed, rational, unpaid.' },
  /* 04 来 */
  { a: 150.2, b: 153.6, zh: '可题里，只有一个午夜。', en: 'But the puzzle has only one midnight.' },
  { a: 154.0, b: 157.6, zh: '生活里，午夜每天都来。', en: 'In life, midnight comes every day.' },
  { a: 158.0, b: 162.4, zh: '所以明天喝下去，有了一个真理由——', en: 'So drinking tomorrow has a real reason —' },
  { a: 162.8, b: 167.2, zh: '下一个午夜，扫描仪会看见这只空瓶。', en: 'next midnight, the scanner will see this empty vial.' },
  { a: 167.6, b: 172.0, zh: '前提是，明天的你喝得下：先把药量调小。', en: 'As long as tomorrow’s you can drink it: shrink the dose.' },
  { a: 172.4, b: 176.8, zh: '奖励也别零点就领，挪到喝完之后。', en: 'And don’t collect at midnight. Move the reward to after you drink.' },
  { a: 180.2, b: 184.6, zh: '一个空瓶，明天就能多喝一口。', en: 'Each empty vial buys one more sip tomorrow.' },
  { a: 185.0, b: 189.6, zh: '满瓶还在，但它们不再是全部。', en: 'The full vials are still there. They’re just no longer all there is.' },
  /* 尾声 */
  { a: 193.4, b: 197.8, zh: '明天下午喝下它，不是为了昨天那一百万。', en: 'Drink it tomorrow afternoon — not for yesterday’s million,' },
  { a: 198.2, b: 203.4, zh: '是为了下一个午夜，你说的话，还{算数}。', en: 'but so that next midnight, your word still counts.' },
];
const MARKS = [{ t: .4, no: '00', zh: '序', en: 'PROLOGUE' }, { t: 35.2, no: '01', zh: '欲', en: 'DESIRE' }, { t: 75.0, no: '02', zh: '真', en: 'SINCERITY' },
  { t: 112.4, no: '03', zh: '往', en: 'THE PAST' }, { t: 150.0, no: '04', zh: '来', en: 'THE FUTURE' }];
const DIPS = [34.9, 74.6, 112.0, 149.6];
const END = 212;                                                      // 故事时间的长度

/* 时间变速：在两句字幕之间多留一口气，让画面自己停一停。这一段里故事时间只走两成，成片因此多出几秒。
 * 各章的时刻都写在"故事时间"里；成片时间 t 先换算成故事时间 τ，音效登记时再换回成片时间。 */
const HOLDS = [[64.64, 3.0, .1], [102.24, 3.0, .1]];                  // [故事时刻, 在成片里占几秒, 这段里故事时间走多快]：都落在两句字幕之间的空当里
const KNOTS = (() => { const k = [[0, 0]]; let shift = 0; HOLDS.forEach(([s, L, v]) => { k.push([s + shift, s]); k.push([s + shift + L, s + L * v]); shift += L * (1 - v); }); k.push([END + shift, END]); return k; })();
const lin = (k, x, i, j) => { for (let n = 0; n < k.length - 1; n++) { const a = k[n], b = k[n + 1]; if (x <= b[i] || n === k.length - 2) return a[j] + (b[j] - a[j]) * (x - a[i]) / (b[i] - a[i]); } };
const warp = t => lin(KNOTS, t, 0, 1), unwarp = tau => lin(KNOTS, tau, 1, 0);
const DUR = KNOTS[KNOTS.length - 1][0];

VK.film({
  dur: DUR, theme: 'night', meta: { title: '毒药谜题', root: -3, drone: .9 },
  draw(fr, filmT) {
    if (!fr._sfxRaw) { fr._sfxRaw = fr.sfx; fr.sfx = (tt, name, p) => fr._sfxRaw(+unwarp(tt).toFixed(3), name, p); }
    const t = warp(filmT);
    const U = []; fr.U = U;                                           // 本帧要画进底层（不吃辉光）的东西
    fr.look.bloom = .6;
    const dip = K.dips(t, DIPS, .5);
    fr.look.bgo = { stars: .45 * dip, core: .8 * dip };
    fr.g({ a: dip }, () => {
      CH.world(fr, t);                                               // 序、四章和尾声共用的世界
      CH.title(fr, t);
    });
    fr.look.under = x => { x.save(); x.globalAlpha = dip; U.forEach(f => f(x)); x.restore(); };
    K.chapterMark(fr, t, MARKS, 190.2);
    K.flash(fr, t, 23.6, { fall: .4, color: '#9FC9B8', edge: '#4E6A60', peak: .8 });
    K.subs(fr, t, SUBS, 'night');
  },
});
})();
