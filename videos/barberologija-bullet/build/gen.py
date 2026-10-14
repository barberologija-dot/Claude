"""Barberologija 'bullet' reel (9:16) — generates compositions + index.html.

Run from the project root: python3 build/gen.py
"""
INK = "#1c1c1a"
SOFT = "#6d6b66"
CREAM = "#efede7"
ACC = "#4e8a0e"     # deep brand green (readable on cream)
NEON = "#8bd124"
W, H = 1080, 1920
T_MAIN, T_PHONE, T_END = 17.0, 4.4, 2.4
TOTAL = round(T_MAIN + T_PHONE + T_END, 2)

FONTS = """
      @font-face { font-family: "Inter"; font-weight: 300; src: url("assets/fonts/inter-latin-300-normal.woff2") format("woff2"); }
      @font-face { font-family: "Inter"; font-weight: 400; src: url("assets/fonts/inter-latin-400-normal.woff2") format("woff2"); }
      @font-face { font-family: "Inter"; font-weight: 500; src: url("assets/fonts/inter-latin-500-normal.woff2") format("woff2"); }
      @font-face { font-family: "Inter"; font-weight: 600; src: url("assets/fonts/inter-latin-600-normal.woff2") format("woff2"); }
      @font-face { font-family: "Inter"; font-weight: 700; src: url("assets/fonts/inter-latin-700-normal.woff2") format("woff2"); }
      @font-face { font-family: "IBM Plex Mono"; font-weight: 500; src: url("assets/fonts/ibm-plex-mono-latin-500-normal.woff2") format("woff2"); }
"""

BULLET = """<svg viewBox="0 0 220 60" width="{w}" height="{h}">
  <defs><linearGradient id="{id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#4a3210"/><stop offset="0.22" stop-color="#c9963e"/><stop offset="0.38" stop-color="#f4d58c"/>
    <stop offset="0.55" stop-color="#b98a37"/><stop offset="0.85" stop-color="#6b4a17"/><stop offset="1" stop-color="#2e1f08"/></linearGradient></defs>
  <path d="M4 8 H112 C160 8 196 20 216 30 C196 40 160 52 112 52 H4 Z" fill="url(#{id})"/>
  <rect x="2" y="9" width="10" height="42" rx="2" fill="#5b3f14" opacity="0.8"/>
  <path d="M112 10 V50" stroke="#3b2909" stroke-width="2" opacity="0.35"/>
</svg>"""
BULLET_WIRE = """<svg viewBox="0 0 220 60" width="{w}" height="{h}"><g fill="none" stroke="#2c2d29" stroke-width="2">
  <path d="M4 8 H112 C160 8 196 20 216 30 C196 40 160 52 112 52 H4 Z"/>
  <path d="M26 8 V52 M48 8 V52 M70 8 V52 M92 8 V52 M112 8 V52 M140 11 V49 M168 17 V43 M194 24 V36"/><path d="M4 30 H216"/></g></svg>"""


def wrap(cid, dur, css, body, js):
    return f"""<template>
  <div id="root" data-composition-id="{cid}" data-start="0" data-duration="{dur}" data-width="{W}" data-height="{H}">
    <style>{FONTS}
      #root {{ width: {W}px; height: {H}px; position: relative; overflow: hidden; font-family: "Inter", sans-serif; color: {INK}; }}
      .clip {{ position: absolute; inset: 0; }}
      .mono {{ font-family: "IBM Plex Mono", monospace; font-weight: 500; text-transform: uppercase; letter-spacing: 0.16em; }}
      .wd {{ display: inline-block; }}
{css}    </style>
{body}
    <script src="assets/vendor/gsap.min.js"></script>
    <script>
      (function () {{
        window.__timelines = window.__timelines || {{}};
        const tl = gsap.timeline({{ paused: true }});
        function words(sel, times) {{
          document.querySelectorAll(sel).forEach((el, i) => tl.fromTo(el, {{ opacity: 0, y: 14, filter: "blur(6px)" }},
            {{ opacity: 1, y: 0, filter: "blur(0px)", duration: 0.35, ease: "power2.out" }}, times[i]));
        }}
{js}
        tl.to({{}}, {{ duration: {dur} }}, 0);
        window.__timelines["{cid}"] = tl;
      }})();
    </script>
  </div>
</template>
"""


def ws(text, cls=""):
    return " ".join(f'<span class="wd {cls}">{w}</span>' for w in text.split())


# ======================= MAIN (bullet, counter, wireframe, text) =======================
# geometry: clipper box, contact point
CX, CY, CH = 575, 470, 660          # clipper left/top/height (img 485x1226 -> width ~261)
CW = round(CH * 485 / 1226)
HIT_Y = CY + int(CH * 0.24)        # bullet path height (upper body)
BW, BH = 230, 63                   # bullet size
# counter keyframes (time, value) — mirrors the reference pacing incl. the early hiccup
CK = [(0, 185), (0.6, 162), (1.0, 165), (1.5, 128), (2.0, 100), (2.5, 78), (3.0, 61), (3.5, 48), (4.0, 37), (4.5, 29),
      (5.0, 23), (5.5, 18), (6.0, 14), (6.5, 11), (7.0, 9), (7.5, 7)]

css = f"""
      #m-bg {{ background: radial-gradient(ellipse 80% 55% at 50% 40%, #f7f6f2 0%, {CREAM} 60%, #e4e1d9 100%); }}
      #m-grid {{ opacity: 0; background-color: #f1efe9;
        background-image: linear-gradient(rgba(60,60,55,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(60,60,55,0.13) 1px, transparent 1px);
        background-size: 54px 54px; }}
      #m-streaks {{ position: absolute; inset: 0; }}
      .m-streak {{ position: absolute; height: 1px; background: linear-gradient(90deg, rgba(0,0,0,0), rgba(60,58,52,0.22)); transform-origin: 100% 50%; }}
      #m-stage {{ position: absolute; inset: 0; transform-origin: {CX - 10}px {HIT_Y}px; }}
      #m-shadow {{ position: absolute; left: {CX - 60}px; top: {CY + CH - 26}px; width: {CW + 120}px; height: 46px; border-radius: 50%;
        background: radial-gradient(closest-side, rgba(0,0,0,0.38), rgba(0,0,0,0)); filter: blur(4px); }}
      #m-clip {{ position: absolute; left: {CX}px; top: {CY}px; height: {CH}px; filter: drop-shadow(0 18px 18px rgba(0,0,0,0.22)); }}
      #m-wire {{ position: absolute; left: {CX}px; top: {CY}px; height: {CH}px; opacity: 0; }}
      #m-mesh {{ position: absolute; left: {CX}px; top: {CY}px; width: {CW}px; height: {CH}px; opacity: 0;
        background-image: linear-gradient(rgba(40,40,36,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(40,40,36,0.35) 1px, transparent 1px);
        background-size: 22px 22px; -webkit-mask-image: url("assets/impact-mask.png"); mask-image: url("assets/impact-mask.png");
        -webkit-mask-size: 100% 100%; mask-size: 100% 100%; }}
      #m-bullet, #m-bulletw {{ position: absolute; left: 0; top: {HIT_Y - BH // 2}px; width: {BW}px; height: {BH}px; }}
      #m-bullet svg, #m-bulletw svg {{ display: block; filter: drop-shadow(0 10px 8px rgba(0,0,0,0.25)); }}
      #m-bulletw {{ opacity: 0; }}
      #m-trail {{ position: absolute; left: -200px; top: {HIT_Y - 1}px; height: 3px; width: 400px; transform-origin: 0% 50%;
        background: linear-gradient(90deg, rgba(120,118,110,0), rgba(120,118,110,0.45)); filter: blur(0.6px); }}
      .m-lab {{ position: absolute; font-size: 17px; letter-spacing: 0.06em; text-transform: none; color: #4b4b46; opacity: 0; white-space: nowrap; }}
      #m-hud {{ position: absolute; inset: 0; }}
      .m-corner {{ position: absolute; width: 46px; height: 46px; border-color: rgba(30,30,28,0.55); border-style: solid; border-width: 0; }}
      #m-rec {{ position: absolute; left: 70px; top: 96px; font-size: 22px; color: #3b3a36; }}
      #m-rec i {{ display: inline-block; width: 14px; height: 14px; border-radius: 50%; background: #d23a2a; margin-right: 12px; vertical-align: 1px; }}
      #m-fps {{ position: absolute; right: 70px; top: 96px; font-size: 22px; color: #3b3a36; }}
      #m-count {{ position: absolute; left: 0; right: 0; top: 1250px; text-align: center; }}
      #m-count .mono {{ font-size: 24px; color: #55544f; }}
      #m-num {{ font-family: "Inter", sans-serif; font-weight: 300; font-size: 168px; line-height: 1.05; letter-spacing: -0.02em; color: {INK}; font-variant-numeric: tabular-nums; }}
      .m-txt {{ position: absolute; left: 60px; right: 60px; top: 1240px; text-align: center; opacity: 0; }}
      .m-l1 {{ font-size: 46px; font-weight: 400; color: {SOFT}; }}
      .m-l2 {{ font-size: 82px; font-weight: 500; letter-spacing: -0.02em; margin-top: 8px; color: {INK}; }}
      .m-b {{ font-weight: 700; }}
"""
streaks = "\n".join(
    f'        <div class="m-streak" style="left:{x}px;top:{y}px;width:{w}px;transform:rotate({r}deg)"></div>'
    for x, y, w, r in [(-80, 380, 640, 14), (-40, 760, 620, -9), (60, 300, 520, 24), (-60, 880, 560, -17)])
corners = "".join(
    f'<div class="m-corner" style="{pos}"></div>' for pos in [
        "left:40px;top:150px;border-left-width:2px;border-top-width:2px", "right:40px;top:150px;border-right-width:2px;border-top-width:2px",
        "left:40px;bottom:140px;border-left-width:2px;border-bottom-width:2px", "right:40px;bottom:140px;border-right-width:2px;border-bottom-width:2px"])
body = f"""    <div id="m-bg" class="clip" data-start="0" data-duration="{T_MAIN}" data-track-index="0"></div>
    <div id="m-grid" class="clip" data-start="0" data-duration="{T_MAIN}" data-track-index="1"></div>
    <div id="m-world" class="clip" data-start="0" data-duration="{T_MAIN}" data-track-index="2" data-layout-allow-overflow>
      <div id="m-streaks">
{streaks}
      </div>
      <div id="m-stage" data-layout-allow-overflow>
        <div id="m-shadow"></div>
        <img id="m-clip" src="assets/rovra-impact-zelena.png" alt="ROVRA Impact">
        <img id="m-wire" src="assets/impact-wire.png" alt="">
        <div id="m-mesh"></div>
        <div id="m-trail"></div>
        <div id="m-bullet">{BULLET.format(w=BW, h=BH, id="brass")}</div>
        <div id="m-bulletw">{BULLET_WIRE.format(w=BW, h=BH)}</div>
        <div class="m-lab mono" id="m-lab1" style="left:{CX + CW - 60}px;top:{CY - 50}px">clipper.obj &nbsp;|&nbsp; 0 polygons wasted</div>
        <div class="m-lab mono" id="m-lab2" style="left:{CX - 330}px;top:{HIT_Y - 62}px">projectile.obj</div>
        <div class="m-lab mono" id="m-lab3" style="left:{CX - 250}px;top:{CY + CH + 40}px">velocity = 0.00001x &nbsp;|&nbsp; impact = never</div>
      </div>
    </div>
    <div id="m-ui" class="clip" data-start="0" data-duration="{T_MAIN}" data-track-index="3">
      <div id="m-hud">{corners}
        <div id="m-rec" class="mono"><i></i>REC &nbsp;00:00:00:<span id="m-tc">06</span></div>
        <div id="m-fps" class="mono">100,000 FPS</div>
      </div>
      <div id="m-count"><div class="mono">Frames to impact</div><div id="m-num">185</div></div>
      <div class="m-txt" id="m-t1"><div class="m-l1">{ws("You just watched a bullet")}</div><div class="m-l2">{ws("for")} {ws("7 seconds.", "m-b")}</div></div>
      <div class="m-txt" id="m-t2"><div class="m-l1">{ws("A bullet")}</div><div class="m-l2">{ws("that")} {ws("doesn't exist.", "m-b")}</div></div>
      <div class="m-txt" id="m-t3"><div class="m-l1">{ws("And you're still here,")}</div><div class="m-l2">{ws("waiting for it to")} {ws("hit.", "m-b")}</div></div>
    </div>"""
ck_js = ",".join(f"[{t},{v}]" for t, v in CK)
js = f"""
        // ---- counter: one progress tween, piecewise-mapped to the frame count (seek-safe) ----
        const CK = [{ck_js}];
        const numEl = document.getElementById("m-num");
        const P = {{ t: 0 }};
        function countAt(t) {{
          for (let i = 1; i < CK.length; i++) if (t <= CK[i][0]) {{
            const a = CK[i - 1], b = CK[i], u = (t - a[0]) / (b[0] - a[0]); return Math.round(a[1] + (b[1] - a[1]) * u); }}
          return CK[CK.length - 1][1];
        }}
        tl.fromTo(P, {{ t: 0 }}, {{ t: 7.5, duration: 7.5, ease: "none", onUpdate: () => {{
          const v = countAt(P.t); numEl.textContent = String(v).padStart(3, "0"); numEl.style.color = v < 30 ? "{ACC}" : "{INK}"; }} }}, 0);
        tl.fromTo("#m-count", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.3 }}, 0.1);
        tl.to("#m-count", {{ opacity: 0, duration: 0.2 }}, 7.6);
        // timecode creeps one frame
        tl.fromTo("#m-tc", {{ opacity: 1 }}, {{ opacity: 1, duration: 0.01, onComplete: () => {{ document.getElementById("m-tc").textContent = "07"; }},
          onReverseComplete: () => {{ document.getElementById("m-tc").textContent = "06"; }} }}, 9.0);
        // REC dot blink (explicit keyframes, no repeat)
        tl.fromTo("#m-rec i", {{ opacity: 1 }}, {{ keyframes: [{",".join("{ opacity: %s, duration: 0.5 }" % ("0.15" if k % 2 == 0 else "1") for k in range(int(T_MAIN * 2)))}] }}, 0);

        // ---- shot 1 (0-7.6): bullet crawls in, camera pushes toward the contact point ----
        tl.fromTo("#m-bullet", {{ x: -60 }}, {{ x: {CX - BW - 70}, duration: 7.6, ease: "none" }}, 0);
        tl.fromTo("#m-trail", {{ scaleX: 0.6 }}, {{ scaleX: 2.6, duration: 7.6, ease: "none" }}, 0);
        tl.fromTo("#m-stage", {{ scale: 1 }}, {{ scale: 1.7, duration: 7.6, ease: "power1.in" }}, 0);
        tl.fromTo("#m-streaks", {{ opacity: 0.5, x: 0 }}, {{ opacity: 1, x: 40, duration: 7.6, ease: "none" }}, 0);
        // ---- cut to wide (7.6): bullet nearly touching, still creeping ----
        tl.to("#m-stage", {{ scale: 1.08, duration: 0.01 }}, 7.6);
        tl.to("#m-stage", {{ scale: 1.16, duration: 9.39, ease: "none" }}, 7.61);
        tl.to("#m-bullet", {{ x: {CX - BW - 22}, duration: 9.4, ease: "none" }}, 7.6);
        tl.to("#m-trail", {{ scaleX: 3.0, duration: 9.4, ease: "none" }}, 7.6);
        // text 1
        tl.fromTo("#m-t1", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.01 }}, 7.85);
        words("#m-t1 .m-l1 .wd", [7.85, 7.95, 8.15, 8.45, 8.6]);
        words("#m-t1 .m-l2 .wd", [9.05, 9.35, 9.6]);
        tl.to("#m-t1", {{ opacity: 0, duration: 0.2 }}, 11.75);
        // ---- wireframe (12.0-14.0) ----
        tl.to("#m-grid", {{ opacity: 1, duration: 0.08 }}, 12.0);
        tl.to(["#m-clip", "#m-bullet", "#m-shadow", "#m-streaks", "#m-trail"], {{ opacity: 0, duration: 0.08 }}, 12.0);
        tl.to(["#m-wire", "#m-mesh", "#m-bulletw"], {{ opacity: 1, duration: 0.08 }}, 12.0);
        tl.fromTo("#m-bulletw", {{ x: {CX - BW - 30} }}, {{ x: {CX - BW - 26}, duration: 2.0, ease: "none" }}, 12.0);
        tl.to("#m-hud", {{ opacity: 0.35, duration: 0.1 }}, 12.0);
        ["#m-lab1", "#m-lab2", "#m-lab3"].forEach((s, i) => tl.fromTo(s, {{ opacity: 0 }}, {{ opacity: 1, duration: 0.25 }}, 12.15 + i * 0.18));
        tl.fromTo("#m-t2", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.01 }}, 12.2);
        words("#m-t2 .m-l1 .wd", [12.2, 12.35]);
        words("#m-t2 .m-l2 .wd", [12.75, 13.0, 13.2]);
        // glitch flicker back to the render (14.0)
        tl.to("#m-grid", {{ keyframes: [ {{ opacity: 0.2, duration: 0.04 }}, {{ opacity: 1, duration: 0.04 }}, {{ opacity: 0, duration: 0.05 }} ] }}, 13.9);
        tl.to(["#m-wire", "#m-mesh", "#m-bulletw", "#m-lab1", "#m-lab2", "#m-lab3", "#m-t2"], {{ opacity: 0, duration: 0.05 }}, 14.0);
        tl.to(["#m-clip", "#m-bullet", "#m-shadow", "#m-streaks", "#m-trail"], {{ opacity: 1, duration: 0.05 }}, 14.0);
        tl.to("#m-hud", {{ opacity: 1, duration: 0.1 }}, 14.0);
        // text 3
        tl.fromTo("#m-t3", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.01 }}, 14.15);
        words("#m-t3 .m-l1 .wd", [14.15, 14.35, 14.55, 14.75]);
        words("#m-t3 .m-l2 .wd", [15.1, 15.25, 15.4, 15.5, 15.85]);
"""
main_html = wrap("main-shot", T_MAIN, css, body, js)

# ======================= PHONE (feed -> barberologija.si) =======================
PW, PH = 600, 1230
PX, PY = (W - PW) // 2, 560
css = f"""
      #p-bg {{ background: radial-gradient(ellipse 80% 55% at 50% 45%, #f7f6f2 0%, {CREAM} 60%, #e4e1d9 100%); }}
      #p-phone {{ position: absolute; left: {PX}px; top: {PY}px; width: {PW}px; height: {PH}px; border-radius: 74px; background: #111;
        padding: 14px; box-shadow: 0 40px 70px rgba(0,0,0,0.28), 0 10px 20px rgba(0,0,0,0.18); transform-origin: 50% 40%; }}
      #p-screen {{ position: relative; width: 100%; height: 100%; border-radius: 60px; overflow: hidden; background: #f3f1ec; }}
      #p-feed {{ position: absolute; inset: 0; }}
      #p-feed .p-top {{ position: absolute; left: 0; right: 0; top: 44px; text-align: center; font-size: 22px; font-weight: 600; }}
      #p-feed .p-time {{ position: absolute; left: 44px; top: 22px; font-size: 18px; font-weight: 600; }}
      #p-fclip {{ position: absolute; left: 290px; top: 360px; height: 340px; filter: drop-shadow(0 10px 10px rgba(0,0,0,0.22)); }}
      #p-fbul {{ position: absolute; left: 150px; top: {360 + int(340 * 0.24) - 16}px; width: 115px; height: 32px; }}
      #p-ftrail {{ position: absolute; left: 0; top: {360 + int(340 * 0.24) - 1}px; width: 160px; height: 2px; background: linear-gradient(90deg, rgba(120,118,110,0), rgba(120,118,110,0.5)); }}
      .p-ic {{ position: absolute; right: 30px; width: 30px; height: 30px; border: 2.5px solid {INK}; border-radius: 50%; }}
      #p-handle {{ position: absolute; left: 34px; bottom: 120px; font-size: 22px; font-weight: 600; display: flex; align-items: center; gap: 12px; }}
      #p-handle i {{ width: 36px; height: 36px; border-radius: 50%; background: #0d0d0d; display: inline-block; box-shadow: inset 0 0 0 3px {NEON}; }}
      #p-bar {{ position: absolute; left: 34px; right: 34px; bottom: 96px; height: 3px; background: {INK}; border-radius: 2px; }}
      #p-site {{ position: absolute; left: 0; top: 0; width: 100%; }}
      #p-site img {{ display: block; width: 100%; }}
      #p-sitewrap {{ position: absolute; inset: 0; overflow: hidden; }}
      #p-url {{ position: absolute; left: 50%; bottom: 26px; transform: translateX(-50%); padding: 12px 28px; border-radius: 40px; background: rgba(255,255,255,0.94);
        font-size: 24px; font-weight: 600; box-shadow: 0 6px 18px rgba(0,0,0,0.18); white-space: nowrap; }}
      #p-tap {{ position: absolute; left: 240px; top: 470px; width: 90px; height: 90px; border-radius: 50%; border: 4px solid rgba(78,138,14,0.9); opacity: 0; }}
      .p-txt {{ position: absolute; left: 40px; right: 40px; top: 250px; text-align: center; opacity: 0; }}
      .p-l1 {{ font-size: 44px; font-weight: 400; color: {SOFT}; }}
      .p-l2 {{ font-size: 72px; font-weight: 600; letter-spacing: -0.02em; margin-top: 6px; }}
      .p-g {{ color: {ACC}; }}
"""
body = f"""    <div id="p-bg" class="clip" data-start="0" data-duration="{T_PHONE}" data-track-index="0"></div>
    <div id="p-layer" class="clip" data-start="0" data-duration="{T_PHONE}" data-track-index="1" data-layout-allow-overflow>
      <div class="p-txt" id="p-t1"><div class="p-l1">{ws("Now imagine")}</div><div class="p-l2">{ws("it's your next clipper.")}</div></div>
      <div class="p-txt" id="p-t2"><div class="p-l1">{ws("Find it at")}</div><div class="p-l2 p-g">{ws("barberologija.si")}</div></div>
      <div id="p-phone" data-layout-allow-overflow><div id="p-screen">
        <div id="p-feed">
          <div class="p-time">9:41</div><div class="p-top">For you</div>
          <div id="p-ftrail"></div>
          <div id="p-fbul">{BULLET.format(w=115, h=32, id="brass2")}</div>
          <img id="p-fclip" src="assets/rovra-impact-zelena.png" alt="">
          <div class="p-ic" style="top:760px"></div><div class="p-ic" style="top:820px"></div><div class="p-ic" style="top:880px"></div>
          <div id="p-handle"><i></i>barberologija</div>
          <div id="p-bar"></div>
          <div id="p-tap"></div>
        </div>
        <div id="p-sitewrap"><div id="p-site"><img src="assets/site-impact.png" alt="barberologija.si – ROVRA Impact"></div></div>
        <div id="p-url">barberologija.si</div>
      </div></div>
    </div>"""
js = f"""
        // phone frame closes in around the shot (zoom out)
        tl.fromTo("#p-phone", {{ scale: 1.75 }}, {{ scale: 1, duration: 0.8, ease: "power3.inOut" }}, 0);
        tl.fromTo("#p-fbul", {{ x: 0 }}, {{ x: 20, duration: 2.0, ease: "none" }}, 0);
        tl.fromTo("#p-t1", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.01 }}, 0.45);
        words("#p-t1 .p-l1 .wd", [0.45, 0.6]);
        words("#p-t1 .p-l2 .wd", [0.9, 1.05, 1.2, 1.4]);
        // tap -> the shop opens on the clipper's product page
        tl.fromTo("#p-tap", {{ opacity: 0, scale: 0.4 }}, {{ keyframes: [ {{ opacity: 1, scale: 1, duration: 0.18 }}, {{ opacity: 0, scale: 1.4, duration: 0.3 }} ] }}, 1.95);
        tl.fromTo("#p-sitewrap", {{ yPercent: 100 }}, {{ yPercent: 0, duration: 0.55, ease: "power3.out" }}, 2.15);
        tl.fromTo("#p-site", {{ y: 0 }}, {{ y: -110, duration: 1.9, ease: "power1.inOut" }}, 2.5);
        tl.fromTo("#p-url", {{ opacity: 0, y: 20 }}, {{ opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }}, 2.5);
        tl.to("#p-t1", {{ opacity: 0, duration: 0.2 }}, 2.15);
        tl.fromTo("#p-t2", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.01 }}, 2.35);
        words("#p-t2 .p-l1 .wd", [2.35, 2.5]);
        words("#p-t2 .p-l2 .wd", [2.8]);
        tl.fromTo("#p-phone", {{ y: 0 }}, {{ y: -16, duration: 2.0, ease: "sine.inOut" }}, 2.4);
"""
phone_html = wrap("phone", T_PHONE, css, body, js)

# ======================= END CARD =======================
css = f"""
      #e-bg {{ background: radial-gradient(ellipse 70% 50% at 50% 42%, #14180e 0%, #0b0b0b 70%); }}
      #e-logo {{ position: absolute; left: 140px; top: 560px; width: 800px; height: 429px; }}
      #e-logo img {{ position: absolute; inset: 0; width: 100%; height: 100%; }}
      #e-outline {{ filter: drop-shadow(0 0 12px rgba(139,209,36,0.9)) drop-shadow(0 0 40px rgba(139,209,36,0.45)); }}
      #e-sub {{ position: absolute; left: 0; right: 0; top: 1080px; text-align: center; font-size: 26px; color: #e9e9e4; letter-spacing: 0.24em; }}
      #e-url {{ position: absolute; left: 0; right: 0; top: 1140px; text-align: center; font-size: 66px; font-weight: 700; color: {NEON};
        text-shadow: 0 0 22px rgba(139,209,36,0.6); }}
"""
body = f"""    <div id="e-bg" class="clip" data-start="0" data-duration="{T_END}" data-track-index="0"></div>
    <div id="e-layer" class="clip" data-start="0" data-duration="{T_END}" data-track-index="1">
      <div id="e-logo"><img id="e-outline" src="assets/logo-outline.svg" alt=""><img id="e-letters" src="assets/logo-letters.svg" alt="Barberologija"></div>
      <div id="e-sub" class="mono">ROVRA Impact · tested behind the chair</div>
      <div id="e-url">barberologija.si</div>
    </div>"""
js = """
        tl.fromTo("#e-outline", { opacity: 0 }, { keyframes: [ { opacity: 0.9, duration: 0.05 }, { opacity: 0.1, duration: 0.1 }, { opacity: 1, duration: 0.06 }, { opacity: 0.6, duration: 0.05 }, { opacity: 1, duration: 0.2 } ] }, 0.05);
        tl.fromTo("#e-letters", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.45, ease: "power2.inOut" }, 0.35);
        tl.fromTo("#e-logo", { scale: 0.94 }, { scale: 1, duration: 0.6, ease: "expo.out" }, 0.6);
        tl.fromTo("#e-sub", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4 }, 0.9);
        tl.fromTo("#e-url", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, 1.1);
"""
end_html = wrap("endcard", T_END, css, body, js)

for name, html in [("main-shot", main_html), ("phone", phone_html), ("endcard", end_html)]:
    open(f"compositions/{name}.html", "w").write(html)

index = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width={W}, height={H}" />
    <script src="assets/vendor/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: {W}px; height: {H}px; overflow: hidden; background: #000; }}
      #root {{ position: relative; width: {W}px; height: {H}px; overflow: hidden; background: {CREAM}; }}
      .scene {{ position: absolute; inset: 0; width: 100%; height: 100%; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL}" data-width="{W}" data-height="{H}">
      <div id="el-main" class="scene" data-composition-id="main-shot" data-composition-src="compositions/main-shot.html" data-start="0" data-duration="{T_MAIN}" data-track-index="0"></div>
      <div id="el-phone" class="scene" data-composition-id="phone" data-composition-src="compositions/phone.html" data-start="{T_MAIN}" data-duration="{T_PHONE}" data-track-index="1"></div>
      <div id="el-end" class="scene" data-composition-id="endcard" data-composition-src="compositions/endcard.html" data-start="{T_MAIN + T_PHONE}" data-duration="{T_END}" data-track-index="0"></div>
      <audio id="a-sound" src="assets/sound-design.mp3" data-start="0" data-duration="{TOTAL}" data-track-index="10" data-volume="1"></audio>
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      const tl = gsap.timeline({{ paused: true }});
      tl.to({{}}, {{ duration: {TOTAL} }}, 0);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""
open("index.html", "w").write(index)
print("ok total", TOTAL)
