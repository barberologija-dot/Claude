"""Kayra: guqin score + foley from events.json → out/mix.wav (48 kHz stereo).
Run with the library's Python, with LIB set: $LIB/.venv/bin/python mix.py"""
import json, os, sys
import numpy as np
import soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.environ['LIB'], 'core', 'audio'))
import sfx as X
from sfx import SR, add, noise, bp, lp, hp, env_exp, t_, norm
import pluck as P

ev = json.load(open(os.path.join(HERE, 'events.json')))
DUR = ev['dur']; EV = ev['ev']
N = int((DUR + .5) * SR)
mus, fol, amb = (np.zeros((N, 2), np.float32) for _ in range(3))
rng = np.random.default_rng(29)
at = lambda typ: [e for e in EV if e['type'] == typ]

# ——— score: guqin, D shang mode (D F G A C) ———
def q(pitch, t, vel=.6, pan=0., dur=None, g=1., **kw):
    add(mus, P.pluck('guqin', pitch, dur, vel, **kw), t, g, pan)

# newborn: unmetred harmonics, one on each main stroke, over a soft open string
for e, n in zip(at('harm'), ['A4', 'D5', 'C5', 'A4', 'G4']):
    q(n, e['t'], .55, pan=rng.uniform(-.3, .3), harmonic=True, g=.9)
q('D3', .95, .45, pan=-.1, g=.7)
q('F4', 3.4, .4, pan=.2, harmonic=True, g=.6)
# xiao breath under the held newborn (2.9 → 4.4)
def xiao(f, d, v=.12):
    tt = t_(d); vib = 1 + .004 * np.sin(2 * np.pi * 5 * tt) * np.clip(tt - .4, 0, 1)
    tone = np.sin(2 * np.pi * f * np.cumsum(vib) / SR) + .25 * np.sin(4 * np.pi * f * np.cumsum(vib) / SR)
    breath = bp(noise(d), f * .8, f * 3.5) * .35
    envl = np.minimum(1, tt / .5) * np.minimum(1, (d - tt) / .6)
    return (tone + breath) * envl * v
add(mus, xiao(293.66, 1.55), 2.85, .8, .15)
# the bloom: near silence with one ring
q('D6', 4.55, .35, pan=.25, harmonic=True, g=.6)
# crawling: open-string pulse on each hand landing, a small melody between
hands = sorted(at('handN') + at('handF'), key=lambda e: e['t'])
bass = ['D3', 'A2']
mel = ['A4', 'C5', 'D5', 'C5', 'A4', 'G4', 'A4']
for i, e in enumerate(hands):
    if e['t'] > 9.8: break
    q(bass[i % 2], e['t'], .5, pan=-.15, g=.75)
    if i < len(mel): q(mel[i], e['t'] + .357, .42, pan=.2, g=.55, vib=(5, .12, .25) if i % 3 == 2 else None)
# ball rolls in: a slide upward, a question
q('A4', 8.75, .45, pan=-.3, g=.6, bend=[(0, 0), (.25, 0), (.6, 2)])
# touch: four ascending plucks
for k, n in enumerate(['D4', 'F4', 'G4', 'A4']): q(n, 10.9 + k * .12, .55 + k * .05, pan=-.2 + k * .13, g=.85)
# the name: a stopped phrase with a slide
for t, n, kw in [(11.55, 'C5', {}), (11.95, 'A4', {'bend': [(0, 0), (.15, 0), (.4, -2)]}), (12.45, 'G4', {}), (12.8, 'A4', {'vib': (5, .15, .2)})]:
    q(n, t, .45, pan=.1, g=.65, **kw)
# the seal: low open D + harmonic, ringing out
q('D2', 13.1, .7, g=.95); q('D5', 13.1, .5, harmonic=True, g=.7, pan=.15)

# ——— foley ———
def tink(): d = .4; tt = t_(d); return norm(np.sin(2 * np.pi * 2650 * tt) * env_exp(d, .05) + .4 * np.sin(2 * np.pi * 3980 * tt) * env_exp(d, .03))
def wet_thud(): d = .3; return norm(lp(noise(d), 260) * env_exp(d, .05))
def brush(d=.35):
    tt = t_(d); envl = np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 1.5
    air = bp(noise(d), 1400, 5200) * envl
    grains = np.zeros(len(tt)); idx = rng.integers(0, len(tt), 40); grains[idx] = rng.uniform(-1, 1, 40)
    return norm(air + hp(grains, 3000) * .8 * envl)
def drum(v=1.):   # soft frame drum (palm on a blanket)
    d = .25; tt = t_(d)
    return norm(np.sin(2 * np.pi * 120 * tt * (1 - .25 * tt)) * env_exp(d, .045) + bp(noise(d), 300, 1400) * env_exp(d, .012) * .35) * v
def roll(d, v=1.):
    tt = t_(d); envl = np.minimum(1, tt / .15) * (1 - tt / d) ** 1.4
    return norm(lp(noise(d), 380) * (1 + .3 * np.sin(2 * np.pi * 7 * tt))) * envl * v
def knock():
    th = X.thump(.8, 210); c = np.zeros_like(th); k = X.click(.42); c[:len(k)] = k
    return norm(c * .6 + th * .7)
def crackle(d=.35):
    s = np.zeros(int(d * SR)); idx = rng.integers(0, len(s), 70); s[idx] = rng.uniform(-1, 1, 70) * np.exp(-idx / (d * SR) * 3)
    return norm(hp(s, 2500))

for e in EV:
    t, ty = e['t'], e['type']
    if ty == 'drop': add(fol, tink(), t - .01, .22, .05); add(fol, wet_thud(), t, .3)
    elif ty == 'brush': add(fol, brush(), t, .06 * e.get('v', .5) / .5, rng.uniform(-.4, .4))
    elif ty == 'handN' and t < 10.05: add(fol, drum(), t, .2, -.1)
    elif ty == 'handF' and t < 10.05: add(fol, drum(.7), t, .13, .15)
    elif ty == 'roll': add(fol, roll(e['d']), t, .11 * e.get('v', 1), -.3)
    elif ty == 'touch': add(fol, knock(), t, .2, -.2)
    elif ty == 'seal': add(fol, X.thump(1, 85), t, .4); add(fol, crackle(), t + .02, .07)

# ——— room tone, out in the silences ———
amb[:, 0] = lp(noise(N / SR), 700)[:N] * .006; amb[:, 1] = lp(noise(N / SR), 700)[:N] * .006
def gate(buf, a, b, f=.08):   # zero [a, b] with short fades
    tt = np.arange(N) / SR
    g = np.clip(np.maximum((a - tt) / f, (tt - b) / f), 0, 1)
    buf *= g[:, None].astype(np.float32)
gate(amb, 4.4, 5.25); gate(amb, 10.0, 10.88)
gate(mus, 10.0, 10.88, .12)   # the held breath before the touch: digital silence (the ring at 4.55 stays)

mix = mus * 1.0 + fol + amb
gate(mix, 10.02, 10.88, .1)
tail = np.clip((DUR + .3 - np.arange(N) / SR) / .9, 0, 1)[:, None]
mix *= tail
mix = mix / max(1e-6, np.abs(mix).max()) * .89
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix[:int(DUR * SR)], SR, subtype='PCM_24')
print('mix', DUR, 's', 'peak', float(np.abs(mix).max()))
