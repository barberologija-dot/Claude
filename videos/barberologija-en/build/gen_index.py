"""Generates index.html (host): scenes, global FX overlays, word-by-word captions, audio.

Run from the project root: python3 build/gen_index.py
"""
import json

TOTAL = 52.0
SCENES = [  # id, start, duration
    ("s1-hook", 0.0, 6.0), ("s2-logo", 6.0, 5.6), ("s3-process", 11.6, 7.0), ("s4-brands", 18.6, 6.2),
    ("s5-pricing", 24.8, 12.8), ("s6-compare", 37.6, 9.0), ("s7-outro", 46.6, 5.4),
]
# cut transitions: time, kind
CUTS = [(6.0, "flash"), (11.6, "sweep"), (18.6, "flash"), (24.8, "sweep"), (37.6, "flash"), (46.6, "sweep")]
# anamorphic flares on impacts: time, x, y
FLARES = [(3.14, 1300, 600), (7.08, 960, 360), (35.3, 1420, 700), (45.5, 260, 760), (47.4, 960, 330)]

AUDIO = [  # id, src, start, duration, volume
    ("vo", "assets/voiceover-en.mp3", 0, TOTAL, 1.0),
    ("music", "assets/music-ducked.mp3", 0, TOTAL, 0.28),
    ("key", "assets/sfx/key-roll-1.1.wav", 0.8, 1.2, 0.35),
    ("hit-test", "assets/sfx/impact-soft.wav", 3.14, 1.2, 0.55),
    ("bass-logo", "assets/sfx/bass-hit.wav", 7.06, 2.6, 0.7),
    ("shim-logo", "assets/sfx/shimmer.wav", 6.75, 1.4, 0.25),
    ("chk0", "assets/sfx/tick.wav", 12.5, 0.1, 0.6),
    ("chk1", "assets/sfx/tick.wav", 14.0, 0.1, 0.6),
    ("chk2", "assets/sfx/impact-soft.wav", 16.6, 1.2, 0.4),
    ("shim-brand", "assets/sfx/shimmer.wav", 19.0, 1.4, 0.25),
    ("hit-earned", "assets/sfx/impact-soft.wav", 22.46, 1.2, 0.5),
    ("hit-pro", "assets/sfx/impact-soft.wav", 28.9, 1.2, 0.45),
    ("tick0", "assets/sfx/tick-roll-0.8.wav", 30.25, 0.85, 0.4),
    ("tick1", "assets/sfx/tick-roll-0.8.wav", 32.13, 0.85, 0.4),
    ("tick2", "assets/sfx/tick-roll-1.0.wav", 34.3, 1.05, 0.4),
    ("bass-50", "assets/sfx/bass-hit.wav", 35.28, 2.6, 0.7),
    ("riser", "assets/sfx/riser.wav", 35.2, 2.4, 0.45),
    ("hit-cc", "assets/sfx/impact-soft.wav", 40.18, 1.2, 0.45),
    ("tick3", "assets/sfx/tick-roll-1.0.wav", 44.5, 1.05, 0.35),
    ("hit-score", "assets/sfx/impact-soft.wav", 45.5, 1.2, 0.5),
    ("bass-outro", "assets/sfx/bass-hit.wav", 47.4, 2.6, 0.65),
    ("shim-outro", "assets/sfx/shimmer.wav", 47.1, 1.4, 0.25),
]
for t, _ in CUTS:
    AUDIO.append((f"wh{int(t*10)}", "assets/sfx/whoosh.wav", round(t - 0.45, 2), 0.9, 0.42))
for i, t in enumerate([42.2, 42.8, 43.4, 44.0]):
    AUDIO.append((f"win{i}", "assets/sfx/tick.wav", t, 0.1, 0.5))

# ---------- captions: group words into short phrases ----------
words = json.load(open("transcript.json"))
groups, cur = [], []
for w in words:
    cur.append(w)
    end_punct = w["text"][-1] in ".,?:!"
    nxt = words[words.index(w) + 1] if words.index(w) + 1 < len(words) else None
    gap = (nxt["start"] - w["end"]) if nxt else 9
    if end_punct or len(cur) >= 5 or gap > 0.45 or (nxt and nxt["line"] != w["line"]):
        groups.append(cur); cur = []
if cur: groups.append(cur)

cap_html, cap_js = [], []
for gi, g in enumerate(groups):
    start = g[0]["start"] - 0.05
    nxt_start = groups[gi + 1][0]["start"] - 0.05 if gi + 1 < len(groups) else TOTAL
    end = min(g[-1]["end"] + 0.5, nxt_start)
    spans = " ".join(f'<span class="cw" id="cw{w["id"]}">{w["text"]}</span>' for w in g)
    cap_html.append(f'        <div class="cg" id="cg{gi}">{spans}</div>')
    cap_js.append(f'        tl.fromTo("#cg{gi}", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.01 }}, {start:.3f});')
    cap_js.append(f'        tl.to("#cg{gi}", {{ opacity: 0, duration: 0.12 }}, {end - 0.12:.3f});')
    for w in g:
        cap_js.append(f'        tl.fromTo("#cw{w["id"]}", {{ opacity: 0, y: 14, scale: 0.92 }}, {{ opacity: 1, y: 0, scale: 1, duration: 0.18, ease: "power2.out" }}, {w["start"]:.3f});')

# ---------- dust particles (seeded LCG, deterministic) ----------
seed = 1234567
def rnd():
    global seed
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648
dust_html, dust_js = [], []
for i in range(46):
    # spawn inside the diagonal light beam (top-left -> center)
    u = rnd(); v = rnd()
    x = 120 + u * 1100 + v * 260
    y = 40 + u * 700 - v * 220 + 120
    s = 2 + rnd() * 4
    o = 0.25 + rnd() * 0.55
    dx = 60 + rnd() * 140; dy = -40 - rnd() * 120
    dust_html.append(f'        <div class="dust" id="d{i}" style="left:{x:.0f}px;top:{y:.0f}px;width:{s:.1f}px;height:{s:.1f}px;opacity:{o:.2f}"></div>')
    dust_js.append(f'        tl.fromTo("#d{i}", {{ x: 0, y: 0 }}, {{ x: {dx:.0f}, y: {dy:.0f}, duration: {TOTAL}, ease: "none" }}, 0);')
    tw = 2.5 + rnd() * 4
    ph = rnd() * tw
    kf = []
    t = 0.0
    hi = True
    while t < TOTAL:
        kf.append(f'{{ opacity: {o if hi else o*0.25:.2f}, duration: {tw/2:.2f} }}')
        t += tw / 2; hi = not hi
    dust_js.append(f'        tl.fromTo("#d{i}", {{ opacity: {o:.2f} }}, {{ immediateRender: false, keyframes: [{", ".join(kf)}], ease: "sine.inOut" }}, {ph:.2f});')

scene_html = "\n".join(
    f'      <div id="el-{sid}" class="scene" data-composition-id="{sid}" data-composition-src="compositions/scenes/{sid}.html" '
    f'data-start="{st}" data-duration="{du}" data-track-index="{i % 2}"></div>' for i, (sid, st, du) in enumerate(SCENES))

audio_html = "\n".join(
    f'      <audio id="a-{aid}" src="{src}" data-start="{st}" data-duration="{du}" data-track-index="{10 + i}" data-volume="{vol}"></audio>'
    for i, (aid, src, st, du, vol) in enumerate(AUDIO))

cut_js = []
first_flash = True
first_sweep = True
for t, kind in CUTS:
    if kind == "flash" or True:
        ir = "" if first_flash else "immediateRender: false, "
        first_flash = False
        peak = 1 if kind == "flash" else 0.45
        cut_js.append(f'        tl.fromTo("#fx-flash", {{ opacity: 0 }}, {{ {ir}keyframes: [ {{ opacity: {peak}, duration: 0.12, ease: "power2.in" }}, {{ opacity: 0, duration: 0.45, ease: "power2.out" }} ] }}, {t - 0.12:.2f});')
    if kind == "sweep":
        ir = "" if first_sweep else "immediateRender: false, "
        first_sweep = False
        cut_js.append(f'        tl.fromTo("#fx-sweep", {{ x: -900, opacity: 1 }}, {{ {ir}x: 2300, opacity: 1, duration: 0.7, ease: "power2.inOut" }}, {t - 0.35:.2f});')
flare_html, flare_js = [], []
for i, (t, x, y) in enumerate(FLARES):
    flare_html.append(f'      <div class="flare" data-layout-ignore id="fl{i}" style="left:{x - 700}px;top:{y - 6}px"><div class="flare-core"></div></div>')
    flare_js.append(f'        tl.fromTo("#fl{i}", {{ opacity: 0, scaleX: 0.3 }}, {{ keyframes: [ {{ opacity: 1, scaleX: 1, duration: 0.12, ease: "power2.out" }}, {{ opacity: 0, scaleX: 1.3, duration: 0.9, ease: "power2.in" }} ] }}, {t:.2f});')

steps = int(TOTAL * 15)
T = f"{TOTAL:g}"

def sub(cid, css, body, js, track_note=""):
    return f"""<template>
  <div id="root" data-composition-id="{cid}" data-start="0" data-duration="{T}" data-width="1920" data-height="1080">
    <style>
      @font-face {{ font-family: "Inter"; font-weight: 800; src: url("assets/fonts/inter-latin-800-normal.woff2") format("woff2"); }}
      #root {{ width: 1920px; height: 1080px; position: relative; overflow: hidden; pointer-events: none; }}
      .clip {{ position: absolute; inset: 0; }}
      .fx {{ position: absolute; inset: 0; }}
{css}    </style>
    <div id="{cid}-layer" class="clip" data-start="0" data-duration="{T}" data-track-index="0" data-layout-allow-overflow>
{body}
    </div>
    <script src="assets/vendor/gsap.min.js"></script>
    <script>
      (function () {{
        window.__timelines = window.__timelines || {{}};
        const tl = gsap.timeline({{ paused: true }});
{js}
        tl.to({{}}, {{ duration: {T} }}, 0);
        window.__timelines["{cid}"] = tl;
      }})();
    </script>
  </div>
</template>
"""

light_css = """      #fx-beam { background: linear-gradient(122deg, rgba(190,240,120,0.10) 0%, rgba(139,209,36,0.05) 22%, rgba(0,0,0,0) 46%); mix-blend-mode: screen; }
      .leak { position: absolute; border-radius: 50%; mix-blend-mode: screen; filter: blur(80px); }
      #leak1 { width: 900px; height: 700px; left: -300px; top: -250px; background: radial-gradient(closest-side, rgba(139,209,36,0.38), rgba(139,209,36,0)); }
      #leak2 { width: 800px; height: 600px; left: 1350px; top: 650px; background: radial-gradient(closest-side, rgba(220,255,170,0.22), rgba(139,209,36,0)); }
      .dust { position: absolute; border-radius: 50%; background: #e9ffc9; box-shadow: 0 0 8px rgba(190,255,120,0.9); }
"""
light_body = f"""      <div id="fx-beam" class="fx"></div>
      <div class="leak" id="leak1"></div>
      <div class="leak" id="leak2"></div>
{chr(10).join(d.replace('        <div', '      <div') for d in dust_html)}"""
light_js = f"""        tl.fromTo("#leak1", {{ x: 0, y: 0, opacity: 0.45 }}, {{ x: 520, y: 160, opacity: 1, duration: {T}, ease: "sine.inOut" }}, 0);
        tl.fromTo("#leak2", {{ x: 0, y: 0, opacity: 0.3 }}, {{ x: -680, y: -260, opacity: 0.9, duration: {T}, ease: "sine.inOut" }}, 0);
        tl.fromTo("#fx-beam", {{ opacity: 0.5 }}, {{ keyframes: [ {{ opacity: 1, duration: 9 }}, {{ opacity: 0.6, duration: 8 }}, {{ opacity: 1, duration: 12 }}, {{ opacity: 0.7, duration: 9 }}, {{ opacity: 1, duration: 14 }} ], ease: "sine.inOut" }}, 0);
{chr(10).join(dust_js)}"""
open("compositions/fx-light.html", "w").write(sub("fx-light", light_css, light_body, light_js))

post_css = """      #fx-vignette { background: radial-gradient(ellipse 90% 85% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.72) 100%); }
      #fx-grain { opacity: 0.11; mix-blend-mode: screen; }
      #fx-flash { background: radial-gradient(ellipse at 50% 50%, #ffffff 0%, #f4ffe6 45%, #d9f5b0 100%); opacity: 0; }
      #fx-sweep { position: absolute; top: -200px; height: 1480px; width: 520px; left: 0; opacity: 0; transform: rotate(18deg);
        background: linear-gradient(90deg, rgba(255,255,255,0), rgba(210,255,150,0.55) 50%, rgba(255,255,255,0)); mix-blend-mode: screen; filter: blur(30px); }
      .flare { position: absolute; width: 1400px; height: 12px; opacity: 0; mix-blend-mode: screen; transform-origin: 50% 50%;
        background: linear-gradient(90deg, rgba(139,209,36,0), rgba(170,240,90,0.9) 45%, #ffffff 50%, rgba(170,240,90,0.9) 55%, rgba(139,209,36,0)); filter: blur(2px); }
      .flare-core { position: absolute; left: 640px; top: -54px; width: 120px; height: 120px; border-radius: 50%;
        background: radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(170,240,90,0.5) 40%, rgba(139,209,36,0)); }
"""
post_body = f"""{chr(10).join(flare_html)}
      <div id="fx-vignette" class="fx" data-layout-ignore data-layout-allow-occlusion></div>
      <svg id="fx-grain" class="fx" data-layout-ignore width="1920" height="1080" viewBox="0 0 960 540" preserveAspectRatio="none">
        <filter id="grainf"><feTurbulence id="grain-turb" type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="1" /></filter>
        <rect width="960" height="540" filter="url(#grainf)" />
      </svg>
      <div id="fx-sweep" data-layout-ignore></div>
      <div id="fx-flash" class="fx" data-layout-ignore data-layout-allow-occlusion></div>"""
post_js = f"""        // film grain: re-seed the noise every 2 frames (deterministic)
        tl.fromTo("#grain-turb", {{ attr: {{ seed: 1 }} }}, {{ attr: {{ seed: {steps} }}, duration: {T}, ease: "steps({steps})" }}, 0);
        // cut transitions: flash-through-white / light sweep
{chr(10).join(cut_js)}
        // anamorphic lens flares on impacts
{chr(10).join(flare_js)}"""
open("compositions/fx-post.html", "w").write(sub("fx-post", post_css, post_body, post_js))

cap_css = """      .cg { position: absolute; left: 160px; right: 160px; bottom: 64px; text-align: center; opacity: 0;
        font-family: "Inter", sans-serif; font-weight: 800; font-size: 46px; line-height: 1.2; color: #ffffff;
        text-shadow: 0 3px 12px rgba(0,0,0,0.95), 0 0 30px rgba(0,0,0,0.8); }
      .cw { display: inline-block; opacity: 0; }
"""
open("compositions/captions.html", "w").write(sub("captions", cap_css, "\n".join(c.replace('        <div', '      <div') for c in cap_html), "\n".join(cap_js)))

html = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="assets/vendor/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: 1920px; height: 1080px; overflow: hidden; background: #000; }}
      #root {{ position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #070707; }}
      .scene {{ position: absolute; inset: 0; width: 100%; height: 100%; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{T}" data-width="1920" data-height="1080">
{scene_html}
      <div id="el-fx-light" class="scene" data-composition-id="fx-light" data-composition-src="compositions/fx-light.html" data-start="0" data-duration="{T}" data-track-index="2"></div>
      <div id="el-fx-post" class="scene" data-composition-id="fx-post" data-composition-src="compositions/fx-post.html" data-start="0" data-duration="{T}" data-track-index="3"></div>
      <div id="el-captions" class="scene" data-composition-id="captions" data-track-kind="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="{T}" data-track-index="4"></div>
{audio_html}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      const tl = gsap.timeline({{ paused: true }});
      tl.to({{}}, {{ duration: {T} }}, 0);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""
open("index.html", "w").write(html)
print("index.html written:", len(groups), "caption groups,", len(AUDIO), "audio clips")
