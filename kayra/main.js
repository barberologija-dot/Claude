// Kayra — a 15 s ink-wash film, 1080×1920.
// Shot 1: an ink drop blooms into a sleeping newborn. Bloom transition. Shot 2: she crawls (handscroll track).
// Shot 3: a red ball rolls in, she stops, reaches, touches it; her name is written and sealed.
import { makeComp, layerSet } from './comp.js';
import { mk, draw, blot, mass, TONE } from './ink.js';
import { clamp, lerp, seg, ss, eo, eio, vnoise } from '/core/lib.js';

const W = innerWidth || 1080, H = innerHeight || 1920;
const cv = document.getElementById('c'); cv.width = W; cv.height = H;
const comp = makeComp(cv);
const A = layerSet(W, H), B = layerSet(W, H);
await document.fonts.load('italic 500 40px Cormorant', 'Rođena');

export const VERM = [176, 46, 34];
const DUR = 15.0;
const TW = t => Math.floor(t * 12 + 1e-6) / 12;            // figures on twos

// ————— timeline —————
const T = {
  dropA: .35, land: .7, revA: .72, revB: 2.3,
  bloomA: 4.4, bloomB: 5.4,
  stopA: 9.3, stopB: 10.0,
  ballA: 8.7, ballB: 10.0,
  reachA: 10.25, touch: 10.9, rollB: 12.1, handDown: [11.7, 12.3],
  nameA: 11.6, nameB: 12.8, seal: 13.1,
};
const SUBS = [
  { id: 's1', text: 'Rođena 29. marta 2026.', a: 1.25, b: 4.7, x: 110, y: 760 },
  { id: 's2', text: 'Sada puzi…', a: 6.0, b: 9.6, x: 110, y: 700 },
  { id: 's3', text: '…i igra se.', a: 11.4, b: 15.0, x: 330, y: 1560 },
];

// ————— shot 1: the newborn (world = screen at scale 1) —————
const NB = { cx: 520, cy: 1232 };
const nbStrokes = [
  // [t0, t1, stroke]
  [.95, 1.45, mk([[440, 1126], [560, 1116], [680, 1138], [764, 1198], [792, 1262], [764, 1324]], { w: 34, tone: TONE.nong, dry: .3, wet: .45, darkDir: [.5, -.85], side: .7, prof: 'brush', seed: 11 })],
  [1.4, 1.75, mk([[290, 1128], [318, 1104], [356, 1096], [402, 1104], [430, 1134]], { w: 24, tone: TONE.nong, dry: .38, wet: .35, darkDir: [0, -1], side: .8, prof: 'tip', seed: 12 })],
  [1.62, 1.74, mk([[338, 1102], [326, 1086], [338, 1076], [350, 1084]], { w: 6, tone: TONE.jiao, dry: .2, prof: 'tip', seed: 13 })],
  [1.75, 1.95, mk([[266, 1186], [276, 1232], [312, 1262], [350, 1270]], { w: 8, tone: TONE.zhong, dry: .3, wet: .3, prof: 'tip', seed: 14 })],
  [1.97, 2.1, mk([[294, 1190], [309, 1198], [325, 1192]], { w: 5.5, tone: TONE.nong, dry: .12, prof: 'tip', seed: 15 })],
  [2.12, 2.26, mk([[382, 1182], [394, 1172], [402, 1190], [390, 1206]], { w: 6, tone: TONE.zhong, dry: .2, prof: 'tip', seed: 16 })],
  [2.26, 2.4, mk([[344, 1258], [364, 1250], [380, 1266]], { w: 7, tone: TONE.jiao, dry: .2, prof: 'tip', seed: 17 })],
  [2.4, 2.66, mk([[470, 1160], [548, 1222], [604, 1318]], { w: 16, tone: TONE.zhong, dry: .45, wet: .2, prof: 'lens', seed: 18 })],
  [2.6, 2.86, mk([[430, 1330], [560, 1350], [700, 1340]], { w: 13, tone: TONE.zhong, dry: .4, wet: .2, prof: 'lens', seed: 19 })],
  [2.8, 3.25, mk([[120, 1372], [420, 1366], [760, 1374], [980, 1370]], { w: 11, tone: TONE.dan, dry: .7, prof: 'even', rough: .2, seed: 20 })],
];
function circle(cx, cy, r, n = 28, sx = 1, sy = 1) { const P = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; P.push([cx + Math.cos(a) * r * sx, cy + Math.sin(a) * r * sy]); } return P; }
function shot1(L, t) {
  const tf = TW(t);
  const s = 1 + .06 * ss(seg(t, .8, 5.4)) + .1 * ss(seg(t, 4.4, 5.4));
  const tx = NB.cx - s * NB.cx, ty = NB.cy - s * NB.cy;
  L.xf(s, tx, ty);
  // the drop
  if (t >= T.dropA && t < T.land) {
    const u = seg(t, T.dropA, T.land), y = lerp(-60, NB.cy, u * u);
    blot(L.cd, NB.cx, y, 13, .95, 0, 1.7, 3);
  }
  if (t >= T.land) {
    const u = seg(t, T.land, T.land + .3);
    blot(L.cw, NB.cx, NB.cy, 16 + 44 * eo(u), .38 * (1 - seg(t, T.land + .2, 1.6)), .3, .8, 5);   // the landing splash, absorbed into the body
    // masses (revealed by the bloom mask in the compositor)
    const br = 1 + .012 * Math.sin(tf * Math.PI * 2 / 1.7);
    const body = [[420, 1130], [520, 1118], [640, 1134], [742, 1180], [792, 1250], [772, 1322], [680, 1348], [540, 1348], [420, 1322], [362, 1280], [398, 1228]]
      .map(([x, y]) => [x, NB.cy + (y - NB.cy) * br]);
    mass(L.cw, body, .24, 5, 2, [540, 1120, 540, 1350, 1, .55]);
    mass(L.cw, circle(350, 1186, 86, 30, 1, .98), .2, 4, 3, [350, 1100, 350, 1270, .9, .6]);
    blot(L.cw, 362, 1264, 17, .22, 0, .9, 4);
  }
  for (const [a, b, st] of nbStrokes) if (t >= a) draw(L.ink, st, seg(t, a, b));
  if (t >= 2.0) blot(L.cd, 302, 1236, 2.6, .7 * seg(t, 2.0, 2.1), 0, .7, 9);   // mouth
  const R = 1400 * ss(seg(t, T.revA, T.revB));
  return { rev: [NB.cx * s + tx, NB.cy * s + ty, R, t < T.revB ? 1 : 0], paper: [-tx, -ty, s] };
}

// ————— shot 2/3: crawling —————
const FLOOR = 1330, X0 = 900, STRIDE = 120, PERIOD = 60 / 84 * 2;
const V = STRIDE / PERIOD;
function dist(t) {
  if (t <= T.bloomA) return 0;
  if (t <= T.stopA) return V * (t - T.bloomA);
  const d = T.stopB - T.stopA, u = Math.min(t - T.stopA, d);
  return V * ((T.stopA - T.bloomA) + u - u * u / (2 * d));
}
const DEND = dist(99);
const PH0 = .5 - ((DEND / STRIDE) % 1);
const phase = t => PH0 + dist(t) / STRIDE;
const hipX = t => X0 - dist(t);
const AMP = STRIDE / 4;
function limb(ph) {   // relative x offset (+ = behind) and lift
  const f = ((ph % 1) + 1) % 1;
  if (f < .5) { const u = ss(f / .5); return [lerp(AMP, -AMP, u), Math.sin(Math.PI * f / .5)]; }
  return [lerp(-AMP, AMP, (f - .5) / .5), 0];
}
// ball
const BALL_R = 40;
const handEnd = (() => { const ph = phase(99); return hipX(99) - 175 + limb(ph)[0]; })();
const BALL_STOP = handEnd - 120;
function ball(t) {
  let x, rot;
  const u = seg(t, T.ballA, T.ballB), x0 = BALL_STOP - 620;
  x = lerp(x0, BALL_STOP, eo(u));
  const u2 = seg(t, T.touch, T.rollB);
  x -= 75 * eo(u2);
  const rock = t > T.rollB ? 3 * Math.sin((t - T.rollB) * 7) * Math.exp(-(t - T.rollB) * 2.5) : 0;
  x += rock;
  rot = (x - x0) / BALL_R;
  return { x, y: FLOOR - BALL_R, rot };
}
function pose(t) {
  const ph = phase(t), hx = hipX(t);
  const bob = 5 * Math.sin(ph * Math.PI * 4);
  const reach = ss(seg(t, T.reachA, T.touch)), back = ss(seg(t, T.handDown[0], T.handDown[1]));
  const lean = reach * (1 - back * .6);
  const H = [hx, FLOOR - 150 + bob], S = [hx - 175 - 14 * lean, FLOOR - 138 + bob * .6 + 6 * lean];
  const look = ss(seg(t, 9.5, 10.2));
  const C = [S[0] - 62 - 6 * lean, S[1] - 64 + 10 * look];
  const hn = limb(ph), hf = limb(ph + .5), kf = limb(ph), kn = limb(ph + .5);
  let handN = [S[0] + 14 * lean + hn[0], FLOOR - 24 * hn[1]];
  const handF = [S[0] + hf[0] + 8, FLOOR - 24 * hf[1]];
  // reach to the ball, then back down a little further on
  const b = ball(t);
  if (t > T.reachA) {
    const target = [b.x + BALL_R * .9, b.y - 6];
    const arc = Math.sin(Math.PI * reach) * 40;
    const r = [lerp(handN[0], target[0], reach), lerp(handN[1], target[1], reach) - arc];
    const touchHold = t > T.touch ? [BALL_STOP + BALL_R * .9 - 20, b.y - 6] : r;
    const rest = [S[0] - 40, FLOOR];
    const k = t > T.touch ? 1 : 0;
    const hr = k ? touchHold : r;
    handN = [lerp(hr[0], rest[0], back), lerp(hr[1], rest[1], back) - Math.sin(Math.PI * back) * 20];
  }
  const kneeN = [H[0] + 10 + kn[0], FLOOR - 16 * kn[1]], kneeF = [H[0] + 20 + kf[0], FLOOR - 16 * kf[1]];
  const foot = k => [k[0] + 98, k[1] - 26];
  return { H, S, C, handN, handF, kneeN, kneeF, footN: foot(kneeN), footF: foot(kneeF), look };
}
function elbow(S, h, side = 1) { const m = [(S[0] + h[0]) / 2, (S[1] + h[1]) / 2]; return [m[0] + 10 * side, m[1] - 2]; }
function capsule(pts, rs, n = 8) {   // a soft limb outline around a polyline, radius per point
  const L = [], R = [], N = pts.length;
  for (let i = 0; i < N; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    L.push([pts[i][0] + nx * rs[i], pts[i][1] + ny * rs[i]]); R.push([pts[i][0] - nx * rs[i], pts[i][1] - ny * rs[i]]);
  }
  const cap = (c, r, a0) => { const o = []; for (let k = 1; k < n; k++) { const q = a0 + Math.PI * k / n; o.push([c[0] + Math.cos(q) * r, c[1] + Math.sin(q) * r]); } return o; };
  const e = pts[N - 1], e0 = pts[N - 2], s0 = pts[0], s1 = pts[1];
  const ae = Math.atan2(e[1] - e0[1], e[0] - e0[0]) - Math.PI / 2, as = Math.atan2(s0[1] - s1[1], s0[0] - s1[0]) - Math.PI / 2;
  return [...L, ...cap(e, rs[N - 1], ae + Math.PI), ...R.reverse(), ...cap(s0, rs[0], as + Math.PI)];
}
function side(pts, rs, k) {   // a contour line along one side of a limb
  const N = pts.length; return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [p[0] - dy / l * rs[i] * k, p[1] + dx / l * rs[i] * k]; });
}
function drawBaby(L, t) {
  const tf = TW(t), P = pose(tf), id = Math.floor(tf * 12) % 5;   // boil on a 5-drawing cycle
  const { H, S, C } = P;
  const o = (n, x) => Object.assign({ seed: 100 + n, boil: id, gapLen: 260 }, x);
  const arm = h => { const e = elbow(S, h, 1); return [[S[0] - 6, S[1] + 14], e, [h[0] + 2, h[1] - 12]]; };
  const leg = (k, f) => [[H[0] + 4, H[1] + 18], [lerp(H[0], k[0], .55) + 2, lerp(H[1], k[1], .55)], k, [lerp(k[0], f[0], .55), lerp(k[1], f[1], .55) + 6], f];
  const AR = [24, 20, 16], LR = [36, 32, 22, 18, 14];
  // far limbs, behind the body (pale masses, a clear-ink contour)
  const aF = arm(P.handF), lF = leg(P.kneeF, P.footF);
  mass(L.cw, capsule(lF, LR), .15, 3, 21); draw(L.ink, mk(side(lF, LR, .9).slice(1), o(3, { w: 5, tone: TONE.dan, dry: .3, prof: 'tip' })));
  mass(L.cw, capsule(aF, AR), .15, 3, 22); draw(L.ink, mk(side(aF, AR, .9), o(1, { w: 5, tone: TONE.dan, dry: .3, prof: 'tip' })));
  blot(L.cw, P.handF[0] - 6, P.handF[1] - 8, 14, .16, 0, .7, 1);
  // body: one pale mass + two loaded strokes
  const M = [(S[0] + H[0]) / 2, (S[1] + H[1]) / 2], ang = Math.atan2(H[1] - S[1], H[0] - S[0]), a = Math.hypot(H[0] - S[0], H[1] - S[1]) / 2 + 66;
  const body = []; for (let i = 0; i < 30; i++) { const th = i / 30 * Math.PI * 2, c = Math.cos(th), b = 64 * (1 + .18 * c); const u = c * a, v = Math.sin(th) * b; body.push([M[0] + u * Math.cos(ang) - v * Math.sin(ang), M[1] + u * Math.sin(ang) + v * Math.cos(ang)]); }
  mass(L.cw, body, .22, 4, 7, [M[0], M[1] - 70, M[0], M[1] + 70, 1, .5]);
  draw(L.ink, mk([[S[0] + 8, S[1] - 56], [M[0], M[1] - 68], [H[0] + 12, H[1] - 72], [H[0] + 74, H[1] - 26], [H[0] + 62, H[1] + 34]], o(4, { w: 30, tone: TONE.nong, dry: .3, wet: .45, darkDir: [0, -1], side: .7, prof: 'brush' })));
  draw(L.ink, mk([[S[0] + 30, S[1] + 56], [M[0], M[1] + 64], [H[0] - 30, H[1] + 58]], o(5, { w: 8, tone: TONE.zhong, dry: .35, wet: .2, prof: 'tip' })));
  // head: big, round, a wisp of hair
  const HR = 74;
  mass(L.cw, circle(C[0], C[1], HR, 28), .17, 3, 8, [C[0], C[1] - HR, C[0], C[1] + HR, .95, .55]);
  const arc = (a0, a1, r, n = 6) => { const out = []; for (let i = 0; i <= n; i++) { const q = (a0 + (a1 - a0) * i / n) * Math.PI / 180; out.push([C[0] + Math.cos(q) * r, C[1] + Math.sin(q) * r]); } return out; };
  draw(L.ink, mk(arc(-120, 30, HR), o(6, { w: 18, tone: TONE.nong, dry: .4, wet: .35, darkDir: [.3, -1], side: .8, prof: 'tip' })));
  draw(L.ink, mk([[C[0] - 6, C[1] - HR + 2], [C[0] - 16, C[1] - HR - 16], [C[0] - 4, C[1] - HR - 24], [C[0] + 6, C[1] - HR - 14]], o(14, { w: 5, tone: TONE.jiao, dry: .2, prof: 'tip' })));
  draw(L.ink, mk(arc(140, 205, HR + 1, 4), o(7, { w: 6, tone: TONE.zhong, dry: .3, prof: 'tip' })));
  draw(L.ink, mk([[C[0] + 16, C[1] - 6], [C[0] + 28, C[1] - 14], [C[0] + 32, C[1] + 4], [C[0] + 20, C[1] + 14]], o(8, { w: 5, tone: TONE.zhong, dry: .2, prof: 'tip' })));
  const ex = C[0] - 36 - 5 * P.look, ey = C[1] - 2 - 6 * P.look;
  blot(L.cd, ex, ey, 6, .92, 0, 1.2, 2);
  draw(L.ink, mk([[C[0] - 62, C[1] + 26], [C[0] - 54, C[1] + 34], [C[0] - 44, C[1] + 31]], o(9, { w: 4.5, tone: TONE.nong, dry: .15, prof: 'tip' })));   // a smile
  blot(L.cw, C[0] - 34, C[1] + 26, 13, .06, 0, .7, 3);                                                                                               // cheek
  // near limbs, over the body: pale masses, a thick-ink contour, small hands and feet
  const lN = leg(P.kneeN, P.footN), aN = arm(P.handN);
  mass(L.cw, capsule(lN, LR), .2, 3, 23);
  draw(L.ink, mk(side(lN, LR, .92).slice(1), o(10, { w: 9, tone: TONE.nong, dry: .3, wet: .3, prof: 'tip' })));
  blot(L.cw, P.footN[0] + 6, P.footN[1] - 2, 15, .2, -.3, .7, 4);
  mass(L.cw, capsule(aN, AR), .2, 3, 24);
  draw(L.ink, mk(side(aN, AR, .92), o(12, { w: 8, tone: TONE.nong, dry: .3, wet: .3, prof: 'tip' })));
  blot(L.cw, P.handN[0] - 6, P.handN[1] - 9, 15, .24, 0, .75, 6);
  draw(L.ink, mk([[P.handN[0] + 4, P.handN[1] - 18], [P.handN[0] - 12, P.handN[1] - 6], [P.handN[0] - 22, P.handN[1] - 8]], o(13, { w: 5, tone: TONE.jiao, dry: .2, prof: 'tip' })));
}
const floorStrokes = [
  mk([[-1400, FLOOR + 14], [-200, FLOOR + 8], [900, FLOOR + 16], [1900, FLOOR + 10]], { w: 12, tone: TONE.dan, dry: .72, prof: 'even', rough: .2, seed: 41 }),
  mk([[-900, FLOOR + 46], [300, FLOOR + 52], [1500, FLOOR + 44]], { w: 7, tone: TONE.qing, dry: .6, prof: 'lens', seed: 42 }),
];
const trail = mk([[X0 + 40, FLOOR + 26], [X0 - 200, FLOOR + 30], [hipX(99) + 60, FLOOR + 27]], { w: 10, tone: TONE.qing * 1.4, dry: .78, prof: 'even', rough: .25, seed: 43 });
const farWash = mk([[-1200, FLOOR - 330], [400, FLOOR - 340], [1900, FLOOR - 326]], { w: 90, tone: TONE.qing * .3, dry: .1, wet: 1, prof: 'lens', seed: 44 });
function cam2(t) {
  const z = eio(seg(t, 9.2, 10.6));
  const s = lerp(1.4, 1.58, z), cx = hipX(t) - lerp(190, 168, z), fy = lerp(1260, 1290, z);
  return { s, tx: W / 2 - s * cx, ty: fy - s * FLOOR };
}
const CAMEND = cam2(DUR);
const toWorld = (x, y) => [(x - CAMEND.tx) / CAMEND.s, (y - CAMEND.ty) / CAMEND.s];
// the name: a brush italic, centrelines in a 100-unit cap box, sheared
const NAME = (() => {
  const L = [
    { adv: 70, s: [[[14, 2, .7], [10, 40, 1], [4, 76, .95], [0, 100, .6]], [[56, 6, .5], [36, 30, .9], [12, 54, 1.05]], [[16, 50, .7], [30, 70, .9], [44, 90, 1.05], [58, 100, .4]]] },
    { adv: 60, s: [[[48, 52, .6], [36, 45, .8], [22, 50, 1], [14, 72, 1], [18, 97, .9], [32, 98, .8], [46, 78, .9], [52, 54, .8]], [[54, 46, .8], [50, 74, 1], [48, 94, .9], [58, 100, .5], [64, 96, .3]]] },
    { adv: 58, s: [[[6, 52, .6], [14, 46, .9], [18, 64, 1], [22, 88, .9], [32, 98, .8], [44, 92, .9], [52, 70, 1], [56, 46, .8]], [[56, 46, .9], [50, 96, 1.05], [40, 136, .9], [26, 154, .6], [10, 148, .3]]] },
    { adv: 46, s: [[[6, 50, .6], [12, 46, .9], [10, 74, 1], [6, 100, .8]], [[9, 64, .6], [18, 50, .9], [30, 45, .9], [42, 50, .5]]] },
    { adv: 64, s: [[[48, 52, .6], [36, 45, .8], [22, 50, 1], [14, 72, 1], [18, 97, .9], [32, 98, .8], [46, 78, .9], [52, 54, .8]], [[54, 46, .8], [50, 74, 1], [48, 94, .9], [58, 100, .5], [70, 92, .25]]] },
  ];
  const sc = 2.3 / CAMEND.s, cap = 100 * sc;
  const total = L.reduce((a, l) => a + l.adv, 0) * sc;
  const [ox, oy] = toWorld(W / 2 - total * CAMEND.s / 2 - 50, 330);
  const out = []; let x = 0, i = 0;
  for (const l of L) {
    for (const st of l.s) {
      const pts = st.map(([px, py, pr]) => [ox + (x + px + (100 - py) * .2) * sc, oy + py * sc, pr]);
      out.push(mk(pts, { w: 10.5 * sc, tone: TONE.jiao, dry: .22, wet: .3, prof: 'even', rough: .07, nb: 40, solid: true, seed: 300 + i++ }));
    }
    x += l.adv;
  }
  const box = [ox, oy, ox + (total + 20 * sc), oy + 155 * sc];
  return { strokes: out, box, sealAt: [box[2] + 14 * sc, oy + 40 * sc], sealS: 78 / CAMEND.s };
})();
const nameTimes = (() => { const n = NAME.strokes.length, tot = NAME.strokes.reduce((a, s) => a + s.len + 30, 0); let acc = 0; return NAME.strokes.map(s => { const a = T.nameA + (T.nameB - T.nameA) * acc / tot; acc += s.len + 30; return [a, T.nameA + (T.nameB - T.nameA) * acc / tot]; }); })();
function seal(c, x, y, S, am) {
  if (am <= 0) return;
  c.save(); c.translate(x, y);
  c.beginPath();
  for (let i = 0; i < 28; i++) {
    const q = i / 28 * 4, sd = Math.floor(q), u = q - sd; let px, py;
    if (sd === 0) { px = u * S; py = 0; } else if (sd === 1) { px = S; py = u * S; } else if (sd === 2) { px = S - u * S; py = S; } else { px = 0; py = S - u * S; }
    px += (vnoise(8 + i * 1.3) - .5) * S * .036; py += (vnoise(48 + i * 1.3) - .5) * S * .036;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath(); c.fillStyle = `rgba(${VERM.join(',')},${clamp(am)})`; c.fill();
  c.globalCompositeOperation = 'destination-out'; c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = S * .1;
  const P = pts => { c.beginPath(); pts.forEach(([a, b], i) => { const X = a * S + (vnoise(3 + i * 2.1 + a * 9) - .5) * S * .02, Y = b * S + (vnoise(9 + i * 2.1 + b * 9) - .5) * S * .02; i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.stroke(); };
  P([[.3, .18], [.3, .82]]); P([[.72, .2], [.32, .52]]); P([[.42, .46], [.74, .82]]);   // a seal-script K
  c.lineWidth = S * .05; P([[.14, .12], [.14, .88]]); P([[.86, .12], [.86, .88]]);
  for (let i = 0; i < 60; i++) { c.globalAlpha = .5 + .5 * vnoise(i * 1.1); c.beginPath(); c.arc(vnoise(5 + i * 3.7) * S, vnoise(96 + i * 2.9) * S, S * (.004 + .012 * vnoise(i * 5.3)), 0, 7); c.fill(); }
  c.restore();
}
function shot2(L, t) {
  const { s, tx, ty } = cam2(t);
  L.xf(s, tx, ty);
  for (const f of floorStrokes) draw(L.ink, f);
  draw(L.ink, trail, clamp(dist(t) / DEND), .55 + .45 * (1 - seg(t, 10, 13)));
  // ball: vermilion body + an open ink ring + two stripes that turn with it
  if (t > T.ballA) {
    const b = ball(t);
    const c = L.cc; c.save(); c.translate(b.x, b.y); c.fillStyle = `rgba(${VERM.join(',')},.9)`; c.beginPath();
    for (let i = 0; i < 24; i++) { const q = i / 24 * Math.PI * 2, r = BALL_R * (.95 + .07 * vnoise(i * 1.7)); i ? c.lineTo(Math.cos(q) * r, Math.sin(q) * r) : c.moveTo(Math.cos(q) * r, Math.sin(q) * r); }
    c.closePath(); c.fill(); c.restore();
    const ring = []; for (let i = 0; i <= 14; i++) { const q = -2.2 + i / 14 * Math.PI * 1.82; ring.push([b.x + Math.cos(q) * BALL_R, b.y + Math.sin(q) * BALL_R]); }
    draw(L.ink, mk(ring, { w: 7, tone: TONE.nong, dry: .3, wet: .3, prof: 'tip', seed: 61 }));
    for (const k of [0, 1]) {
      const q = b.rot + k * Math.PI, st = [];
      for (let i = 0; i <= 6; i++) { const v = -1 + i / 3; const yy = v * BALL_R * .8; const xx = Math.cos(q) * Math.sqrt(Math.max(0, 1 - v * v * .64)) * BALL_R * .85; st.push([b.x + xx * Math.cos(.3) - yy * Math.sin(.3) * .2, b.y + yy]); }
      if (Math.cos(q) > -.2) draw(L.ink, mk(st, { w: 4, tone: TONE.zhong, dry: .3, prof: 'tip', seed: 62 + k }), 1, clamp(Math.cos(q) + .2));
    }
    blot(L.cw, b.x + 4, FLOOR + 4, BALL_R * .9, .12, 0, .18, 7);
  }
  drawBaby(L, t);
  // the name, then the seal
  NAME.strokes.forEach((st, i) => { const [a, b] = nameTimes[i]; if (t >= a) draw(L.ink, st, seg(t, a, b)); });
  if (t >= T.seal) {
    const u = seg(t, T.seal, T.seal + .1), S = NAME.sealS * lerp(1.12, 1, u);
    seal(L.cc, NAME.sealAt[0] - (S - NAME.sealS) / 2, NAME.sealAt[1] - (S - NAME.sealS) / 2, S, .5 + .45 * u);
  }
  return { paper: [-tx, -ty, s] };
}

// ————— inscriptions (screen space) —————
function subtitle(L, text, x, y, a, size = 60) {
  if (a <= 0) return;
  const wetK = clamp(1 - a) * .8;
  for (const [ctx, k] of [[L.cw, wetK], [L.cd, 1 - wetK * .6]]) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = clamp(a * k * .9); ctx.fillStyle = '#000';
    ctx.font = `italic 500 ${size}px Cormorant`; ctx.letterSpacing = '1px'; ctx.fillText(text, x + size * .62, y); ctx.restore();
  }
  const s = size * .3, c = L.cc; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = clamp(a * .92); c.fillStyle = `rgb(${VERM.join(',')})`;
  c.fillRect(x, y - size * .34 - s / 2, s, s); c.restore();
}
const subK = (v, t) => Math.min(clamp((t - v.a) / .3), clamp((v.b - t) / .35));

// ————— frame —————
window.render = t => {
  A.clear(); B.clear();
  let o;
  if (t < T.bloomB) {
    o = shot1(A, t);
    if (t >= T.bloomA) {
      const ob = shot2(B, t), u = seg(t, T.bloomA, T.bloomB);
      o.trans = [W / 2, NB.cy, 2900 * Math.pow(u, 1.35), 1]; o.paperB = ob.paper; o.bleedB = 6;
    }
  } else o = shot2(A, t);
  for (const v of SUBS) if (t >= v.a && t <= v.b) subtitle(t >= T.bloomA && t < T.bloomB && v.id === 's2' ? B : A, v.text, v.x, v.y, subK(v, t));
  o.bleed = 6; o.vig = .2;
  comp(A, B, o);
};
window.TEXTS = t => {
  const out = [], c = A.cd;
  for (const v of SUBS) if (t >= v.a + .3 && t <= v.b - .35) { c.save(); c.font = 'italic 500 60px Cormorant'; const w = c.measureText(v.text).width; c.restore(); out.push({ id: v.id, text: v.text, x0: v.x, y0: v.y - 50, x1: v.x + 40 + w, y1: v.y + 16 }); }
  if (t >= T.nameB) { const [x0, y0] = [NAME.box[0] * CAMEND.s + CAMEND.tx, NAME.box[1] * CAMEND.s + CAMEND.ty], [x1, y1] = [NAME.box[2] * CAMEND.s + CAMEND.tx, NAME.box[3] * CAMEND.s + CAMEND.ty]; out.push({ id: 'name', text: 'Kayra', x0, y0, x1, y1 }); }
  return out;
};

// ————— sound events —————
const EV = [{ t: T.land, type: 'drop' }];
for (const [a] of nbStrokes.slice(0, 2)) EV.push({ t: a, type: 'harm', n: EV.length });
EV.push({ t: 1.97, type: 'harm', n: 3 }, { t: 2.4, type: 'harm', n: 4 }, { t: 2.8, type: 'harm', n: 5 });
for (const v of SUBS) EV.push({ t: v.a, type: 'brush', v: .5 });
EV.push({ t: T.bloomA, type: 'bloom' });
{ // hand and knee landings: a phase crossing a half-integer (near hand) or an integer (far hand)
  let prev = phase(T.bloomA);
  for (let t = T.bloomA + 1 / 240; t < T.stopB + .05; t += 1 / 240) {
    const p = phase(t);
    for (const [off, type] of [[.5, 'handN'], [0, 'handF']]) if (Math.floor(prev - off) !== Math.floor(p - off) && t > T.bloomB - .2) EV.push({ t: +t.toFixed(3), type });
    prev = p;
  }
}
EV.push({ t: T.ballA, type: 'roll', d: T.ballB - T.ballA }, { t: T.touch, type: 'touch' }, { t: T.touch + .02, type: 'roll', d: 1.0, v: .5 });
nameTimes.forEach(([a], i) => { if (i === 0 || a - nameTimes[i - 1][0] > .12) EV.push({ t: a, type: 'brush', v: .35 }); });
EV.push({ t: T.seal, type: 'seal' });
EV.sort((a, b) => a.t - b.t);
window.EV = EV;
window.DUR = DUR;
window.READY = true;
