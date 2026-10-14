"""Barberologija 'bullet' reel (9:16) — generates compositions + index.html.

Run from the project root: python3 build/gen.py
"""
INK = "#1c1c1a"
SOFT = "#6d6b66"
CREAM = "#efede7"
ACC = "#4e8a0e"     # deep brand green (readable on cream)
NEON = "#8bd124"
W, H = 1080, 1920

FONTS = """
      @font-face { font-family: "Inter"; font-weight: 300; src: url("assets/fonts/inter-latin-300-normal.woff2") format("woff2"); }
      @font-face { font-family: "Inter"; font-weight: 400; src: url("assets/fonts/inter-latin-400-normal.woff2") format("woff2"); }
      @font-face { font-family: "Inter"; font-weight: 500; src: url("assets/fonts/inter-latin-500-normal.woff2") format("woff2"); }
      @font-face { font-family: "Inter"; font-weight: 600; src: url("assets/fonts/inter-latin-600-normal.woff2") format("woff2"); }
      @font-face { font-family: "Inter"; font-weight: 700; src: url("assets/fonts/inter-latin-700-normal.woff2") format("woff2"); }
      @font-face { font-family: "IBM Plex Mono"; font-weight: 500; src: url("assets/fonts/ibm-plex-mono-latin-500-normal.woff2") format("woff2"); }
"""

BULLET = """<svg viewBox="0 0 220 60" width="{w}" height="{h}">
  <defs>
    <linearGradient id="{id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a1208"/><stop offset="0.16" stop-color="#7a3a17"/><stop offset="0.30" stop-color="#d98a52"/>
      <stop offset="0.38" stop-color="#ffd2a6"/><stop offset="0.47" stop-color="#d07a42"/><stop offset="0.72" stop-color="#7c3916"/><stop offset="1" stop-color="#1e0d05"/></linearGradient>
    <linearGradient id="{id}t" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity="0.35"/><stop offset="0.12" stop-color="#000" stop-opacity="0"/>
      <stop offset="0.75" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0.18"/></linearGradient>
    <filter id="{id}b" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="1.1 0.15"/></filter>
  </defs>
  <g filter="url(#{id}b)">
    <path d="M16 16 L5 22 Q3 30 5 38 L16 44 H112 C156 44 192 37 217 30.5 Q218 30 217 29.5 C192 23 156 16 112 16 Z" fill="url(#{id})"/>
    <path d="M16 16 L5 22 Q3 30 5 38 L16 44 H112 C156 44 192 37 217 30.5 Q218 30 217 29.5 C192 23 156 16 112 16 Z" fill="url(#{id}t)"/>
    <path d="M96 16.5 V43.5" stroke="#3a1a08" stroke-width="2.2" opacity="0.55"/><path d="M99 17 V43" stroke="#ffd9b0" stroke-width="0.8" opacity="0.35"/>
    <path d="M18 24 H150" stroke="#fff3e2" stroke-width="1.6" stroke-linecap="round" opacity="0.45"/>
  </g>
</svg>"""
BULLET_WIRE = """<svg viewBox="0 0 220 60" width="{w}" height="{h}"><g fill="none" stroke="#2c2d29" stroke-width="2">
  <path d="M16 16 L5 22 Q3 30 5 38 L16 44 H112 C156 44 192 37 217 30.5 Q218 30 217 29.5 C192 23 156 16 112 16 Z"/>
  <path d="M30 16 V44 M50 16 V44 M70 16 V44 M96 16 V44 M112 16 V44 M140 18 V42 M168 23 V37 M194 26 V34"/><path d="M5 30 H217"/></g></svg>"""


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


import json
VO = {int(k): v for k, v in json.load(open("build/vo_words.json")).items()}
# VO placement (global seconds) — line index -> start
VO_AT = {1: 7.75, 2: 11.45, 3: 13.4, 4: 15.75, 5: 17.7, 6: 19.9}
WIRE_IN, WIRE_OUT = 11.35, 13.3
T_MAIN, T_PHONE, T_END = 15.6, 6.8, 2.6
TOTAL = round(T_MAIN + T_PHONE + T_END, 2)


def wt(line, word_idx, base=0.0):
    """global (or scene-local when base given) time of a VO word"""
    return round(VO_AT[line] + VO[line][word_idx][1] - base, 2)


# ======================= MAIN =======================
CX, CY, CH = 575, 470, 660
CW = round(CH * 485 / 1226)
HIT_Y = CY + int(CH * 0.24)
EDGE = CX + round(CW * 0.103)          # clipper body edge at the bullet's height
BW, BH = 168, 46
TIP = 226 / 220 * BW / (230 / 220)     # tip offset inside the bullet box (px)
TIP = BW * 216 / 220
X_END1 = round(EDGE - 14 - TIP)        # tip 14px away when the counter hits 001
X_END2 = round(EDGE - 3 - TIP)         # tip 3px away by the end of the scene
CK = [(0, 185), (0.6, 162), (1.0, 165), (1.5, 128), (2.0, 100), (2.5, 78), (3.0, 61), (3.5, 48), (4.0, 37), (4.5, 29),
      (5.0, 23), (5.5, 18), (6.0, 14), (6.5, 10), (7.0, 6), (7.3, 3), (7.55, 1)]

css = f"""
      #m-bg {{ background: radial-gradient(ellipse 80% 55% at 50% 40%, #f7f6f2 0%, {CREAM} 60%, #e2dfd6 100%); }}
      #m-grid {{ opacity: 0; background-color: #f1efe9;
        background-image: linear-gradient(rgba(60,60,55,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(60,60,55,0.13) 1px, transparent 1px);
        background-size: 54px 54px; }}
      #m-floor {{ position: absolute; left: -200px; right: -200px; top: {CY + CH - 40}px; height: 900px;
        background: linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.035) 12%, rgba(0,0,0,0) 55%); }}
      #m-stage {{ position: absolute; inset: 0; transform-origin: {EDGE}px {HIT_Y}px; }}
      #m-shadow {{ position: absolute; left: {CX - 60}px; top: {CY + CH - 26}px; width: {CW + 120}px; height: 46px; border-radius: 50%;
        background: radial-gradient(closest-side, rgba(0,0,0,0.40), rgba(0,0,0,0)); filter: blur(4px); }}
      #m-clip {{ position: absolute; left: {CX}px; top: {CY}px; height: {CH}px; filter: drop-shadow(0 18px 18px rgba(0,0,0,0.22)); }}
      #m-glint {{ position: absolute; left: {EDGE - 10}px; top: {HIT_Y - 90}px; width: 70px; height: 180px; border-radius: 50%; opacity: 0;
        background: radial-gradient(closest-side, rgba(255,236,190,0.75), rgba(255,236,190,0)); mix-blend-mode: screen; }}
      #m-wire {{ position: absolute; left: {CX}px; top: {CY}px; height: {CH}px; opacity: 0; }}
      #m-mesh {{ position: absolute; left: {CX}px; top: {CY}px; width: {CW}px; height: {CH}px; opacity: 0;
        background-image: linear-gradient(rgba(40,40,36,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(40,40,36,0.35) 1px, transparent 1px);
        background-size: 22px 22px; -webkit-mask-image: url("assets/impact-mask.png"); mask-image: url("assets/impact-mask.png");
        -webkit-mask-size: 100% 100%; mask-size: 100% 100%; }}
      /* the bullet rig: trail + mach cone + floor shadow all ride WITH the bullet, never ahead of the tip */
      #m-rig, #m-rigw {{ position: absolute; left: 0; top: {HIT_Y - BH // 2}px; width: {BW}px; height: {BH}px; }}
      #m-rigw {{ opacity: 0; }}
      #m-bul {{ position: absolute; inset: 0; filter: drop-shadow(0 8px 6px rgba(0,0,0,0.22)); }}
      #m-bul svg {{ display: block; }}
      #m-wake {{ position: absolute; right: {BW - 6}px; top: {BH // 2 - 6}px; width: 420px; height: 12px; border-radius: 6px;
        background: linear-gradient(90deg, rgba(150,148,140,0), rgba(150,148,140,0.08) 60%, rgba(150,148,140,0.20)); filter: blur(4px); }}
      #m-mach {{ position: absolute; left: {round(TIP) - 120}px; top: {BH // 2 - 90}px; width: 140px; height: 180px; opacity: 0.5; transform: scale(0.72); transform-origin: 120px 90px; }}
      #m-bshadow {{ position: absolute; left: 10px; top: {CY + CH - 22 - (HIT_Y - BH // 2)}px; width: {BW - 30}px; height: 14px; border-radius: 50%;
        background: radial-gradient(closest-side, rgba(0,0,0,0.22), rgba(0,0,0,0)); filter: blur(5px); }}
      #m-sheen {{ position: absolute; inset: 12px 24px 26px 6px; border-radius: 20px; opacity: 0.35;
        background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,250,225,0.55) 50%, rgba(255,255,255,0)); mix-blend-mode: screen; }}
      .m-lab {{ position: absolute; font-size: 17px; letter-spacing: 0.06em; text-transform: none; color: #4b4b46; opacity: 0; white-space: nowrap; }}
      #m-hud {{ position: absolute; inset: 0; }}
      .m-corner {{ position: absolute; width: 46px; height: 46px; border-color: rgba(30,30,28,0.55); border-style: solid; border-width: 0; }}
      #m-rec {{ position: absolute; left: 70px; top: 96px; font-size: 22px; color: #3b3a36; }}
      #m-rec i {{ display: inline-block; width: 14px; height: 14px; border-radius: 50%; background: #d23a2a; margin-right: 12px; vertical-align: 1px; }}
      #m-fps {{ position: absolute; right: 70px; top: 96px; font-size: 22px; color: #3b3a36; }}
      #m-count {{ position: absolute; left: 0; right: 0; top: 1420px; text-align: center; z-index: 5; }}
      #m-count .mono {{ font-size: 24px; color: #55544f; }}
      #m-num {{ font-family: "Inter", sans-serif; font-weight: 300; font-size: 168px; line-height: 1.05; letter-spacing: -0.02em; color: {INK}; font-variant-numeric: tabular-nums; }}
      .m-txt {{ position: absolute; left: 60px; right: 60px; top: 1300px; text-align: center; opacity: 0; z-index: 5; }}
      .m-l1 {{ font-size: 46px; font-weight: 400; color: {SOFT}; }}
      .m-l2 {{ font-size: 78px; font-weight: 500; letter-spacing: -0.02em; margin-top: 8px; color: {INK}; }}
      .m-b {{ font-weight: 700; }}
      .m-acc {{ font-weight: 700; color: {ACC}; }}
"""
MACH = """<svg viewBox="0 0 140 180" width="140" height="180"><g fill="none" stroke="#6f6d66" stroke-width="1.4" stroke-linecap="round">
  <path d="M120 90 C 96 74, 60 46, 8 6" opacity="0.7"/><path d="M120 90 C 96 106, 60 134, 8 174" opacity="0.7"/>
  <path d="M104 90 C 84 78, 54 56, 20 30" opacity="0.35"/><path d="M104 90 C 84 102, 54 124, 20 150" opacity="0.35"/></g></svg>"""
corners = "".join(
    f'<div class="m-corner" style="{pos}"></div>' for pos in [
        "left:40px;top:150px;border-left-width:2px;border-top-width:2px", "right:40px;top:150px;border-right-width:2px;border-top-width:2px",
        "left:40px;bottom:140px;border-left-width:2px;border-bottom-width:2px", "right:40px;bottom:140px;border-right-width:2px;border-bottom-width:2px"])
body = f"""    <div id="m-bg" class="clip" data-start="0" data-duration="{T_MAIN}" data-track-index="0"></div>
    <div id="m-grid" class="clip" data-start="0" data-duration="{T_MAIN}" data-track-index="1"></div>
    <div id="m-world" class="clip" data-start="0" data-duration="{T_MAIN}" data-track-index="2" data-layout-allow-overflow>
      <div id="m-stage" data-layout-allow-overflow>
        <div id="m-floor"></div>
        <div id="m-shadow"></div>
        <img id="m-clip" src="assets/rovra-impact-zelena.png" alt="ROVRA Impact">
        <div id="m-glint"></div>
        <img id="m-wire" src="assets/impact-wire.png" alt="">
        <div id="m-mesh"></div>
        <div id="m-rig" data-layout-allow-overflow>
          <div id="m-bshadow"></div>
          <div id="m-wake"></div>
          <div id="m-mach">{MACH}</div>
          <div id="m-bul">{BULLET.format(w=BW, h=BH, id="brass")}<div id="m-sheen"></div></div>
        </div>
        <div id="m-rigw">{BULLET_WIRE.format(w=BW, h=BH)}</div>
        <div class="m-lab mono" id="m-lab1" style="left:120px;top:{CY - 120}px">clipper.obj &nbsp;|&nbsp; 0 polygons wasted</div>
        <div class="m-lab mono" id="m-lab2" style="left:{CX - 330}px;top:{HIT_Y - 62}px">projectile.obj</div>
        <div class="m-lab mono" id="m-lab3" style="left:120px;top:{CY - 84}px">velocity = 0.00001x &nbsp;|&nbsp; impact = never</div>
      </div>
    </div>
    <div id="m-ui" class="clip" data-start="0" data-duration="{T_MAIN}" data-track-index="3">
      <div id="m-hud">{corners}
        <div id="m-rec" class="mono"><i></i>REC &nbsp;00:00:00:<span id="m-tc">06</span></div>
        <div id="m-fps" class="mono">100,000 FPS</div>
      </div>
      <div id="m-count"><div class="mono">Frames to impact</div><div id="m-num">185</div></div>
      <div class="m-txt" id="m-t1"><div class="m-l1">{ws("You just watched a bullet")}</div><div class="m-l2">{ws("fly toward")} {ws("Impact", "m-acc")} {ws("for")} {ws("7 seconds.", "m-b")}</div></div>
      <div class="m-txt" id="m-t2"><div class="m-l1">{ws("A bullet")}</div><div class="m-l2">{ws("that")} {ws("doesn't even exist.", "m-b")}</div></div>
      <div class="m-txt" id="m-t3"><div class="m-l1">{ws("And you're still here,")}</div><div class="m-l2">{ws("waiting for it to")} {ws("hit.", "m-b")}</div></div>
    </div>"""
ck_js = ",".join(f"[{t},{v}]" for t, v in CK)
v1 = [wt(1, i) for i in range(11)]   # you just watched a bullet fly toward impact for seven seconds
v2 = [wt(2, i) for i in range(6)]
v3 = [wt(3, i) for i in range(9)]
blink = ",".join("{ opacity: %s, duration: 0.5 }" % ("0.15" if k % 2 == 0 else "1") for k in range(int(T_MAIN * 2)))
js = f"""
        const CK = [{ck_js}];
        const numEl = document.getElementById("m-num");
        const P = {{ t: 0 }};
        function countAt(t) {{
          for (let i = 1; i < CK.length; i++) if (t <= CK[i][0]) {{
            const a = CK[i - 1], b = CK[i], u = (t - a[0]) / (b[0] - a[0]); return Math.round(a[1] + (b[1] - a[1]) * u); }}
          return CK[CK.length - 1][1];
        }}
        tl.fromTo(P, {{ t: 0 }}, {{ t: 7.6, duration: 7.6, ease: "none", onUpdate: () => {{
          const v = countAt(P.t); numEl.textContent = String(v).padStart(3, "0"); numEl.style.color = v < 30 ? "{ACC}" : "{INK}"; }} }}, 0);
        tl.fromTo("#m-count", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.3 }}, 0.1);
        tl.to("#m-count", {{ opacity: 0, duration: 0.2 }}, 7.7);
        tl.fromTo("#m-tc", {{ opacity: 1 }}, {{ opacity: 1, duration: 0.01, onComplete: () => {{ document.getElementById("m-tc").textContent = "07"; }},
          onReverseComplete: () => {{ document.getElementById("m-tc").textContent = "06"; }} }}, 9.0);
        tl.fromTo("#m-rec i", {{ opacity: 1 }}, {{ keyframes: [{blink}] }}, 0);

        // ---- shot 1: the bullet crawls all the way in (decelerating), camera pushes to the contact point ----
        tl.fromTo("#m-rig", {{ x: -80 }}, {{ x: {X_END1}, duration: 7.6, ease: "power1.out" }}, 0);
        tl.fromTo("#m-stage", {{ scale: 1 }}, {{ scale: 1.5, duration: 7.6, ease: "power1.in" }}, 0);
        tl.fromTo("#m-sheen", {{ x: -40 }}, {{ x: 40, duration: 7.6, ease: "none" }}, 0);
        tl.fromTo("#m-glint", {{ opacity: 0 }}, {{ opacity: 0.8, duration: 4.0, ease: "power2.in" }}, 3.6);
        // ---- cut to wide: tip a breath away, still creeping, never touching ----
        tl.to("#m-stage", {{ scale: 1.08, duration: 0.01 }}, 7.6);
        tl.to("#m-stage", {{ scale: 1.18, duration: {T_MAIN - 7.61:.2f}, ease: "none" }}, 7.61);
        tl.to("#m-rig", {{ x: {X_END2}, duration: {T_MAIN - 7.6:.2f}, ease: "power2.out" }}, 7.6);
        // text 1 on the VO
        tl.fromTo("#m-t1", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.01 }}, {v1[0]});
        words("#m-t1 .m-l1 .wd", {v1[0:5]});
        words("#m-t1 .m-l2 .wd", [{v1[5]}, {v1[6]}, {v1[7]}, {v1[8]}, {v1[9]}, {v1[10]}]);
        tl.to("#m-t1", {{ opacity: 0, duration: 0.2 }}, {WIRE_IN - 0.15:.2f});
        // ---- wireframe ----
        tl.to("#m-grid", {{ opacity: 1, duration: 0.08 }}, {WIRE_IN});
        tl.to(["#m-clip", "#m-rig", "#m-shadow", "#m-floor", "#m-glint"], {{ opacity: 0, duration: 0.08 }}, {WIRE_IN});
        tl.to(["#m-wire", "#m-mesh", "#m-rigw"], {{ opacity: 1, duration: 0.08 }}, {WIRE_IN});
        tl.fromTo("#m-rigw", {{ x: {X_END2 - 6} }}, {{ x: {X_END2 - 3}, duration: {WIRE_OUT - WIRE_IN:.2f}, ease: "none" }}, {WIRE_IN});
        tl.to("#m-hud", {{ opacity: 0.35, duration: 0.1 }}, {WIRE_IN});
        ["#m-lab1", "#m-lab2", "#m-lab3"].forEach((s, i) => tl.fromTo(s, {{ opacity: 0 }}, {{ opacity: 1, duration: 0.25 }}, {WIRE_IN + 0.12:.2f} + i * 0.15));
        tl.fromTo("#m-t2", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.01 }}, {v2[0]});
        words("#m-t2 .m-l1 .wd", [{v2[0]}, {v2[1]}]);
        words("#m-t2 .m-l2 .wd", [{v2[2]}, {v2[3]}, {v2[4]}, {v2[5]}]);
        tl.to("#m-grid", {{ keyframes: [ {{ opacity: 0.2, duration: 0.04 }}, {{ opacity: 1, duration: 0.04 }}, {{ opacity: 0, duration: 0.05 }} ] }}, {WIRE_OUT - 0.1:.2f});
        tl.to(["#m-wire", "#m-mesh", "#m-rigw", "#m-lab1", "#m-lab2", "#m-lab3", "#m-t2"], {{ opacity: 0, duration: 0.05 }}, {WIRE_OUT});
        tl.to(["#m-clip", "#m-rig", "#m-shadow", "#m-floor", "#m-glint"], {{ opacity: 1, duration: 0.05 }}, {WIRE_OUT});
        tl.to("#m-hud", {{ opacity: 1, duration: 0.1 }}, {WIRE_OUT});
        tl.fromTo("#m-t3", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.01 }}, {v3[0]});
        words("#m-t3 .m-l1 .wd", [{v3[0]}, {v3[1]}, {v3[2]}, {v3[3]}]);
        words("#m-t3 .m-l2 .wd", [{v3[4]}, {v3[5]}, {v3[6]}, {v3[7]}, {v3[8]}]);
"""
main_html = wrap("main-shot", T_MAIN, css, body, js)

# ======================= PHONE (feed -> barberologija.si home -> search "impact" -> product) =======================
PW, PH = 600, 1230
PX, PY = (W - PW) // 2, 600
SW, SH = PW - 28, PH - 28            # inner screen
SB = 44                              # status bar
SITE_H = round(SW * 2210 / 1206)     # screenshot height at screen width
BB = SH - SB - SITE_H                # bottom browser bar height
B = T_MAIN
v4 = [wt(4, i, B) for i in range(5)]   # now imagine impact does exist
v5 = [wt(5, i, B) for i in range(7)]   # it's real and it can be yours
v6 = [wt(6, i, B) for i in range(7)]   # visit our shop and order it now
HOME_IN = round(v5[0] - 0.25, 2)
SEARCH_TAP = round(HOME_IN + 0.45, 2)
TYPE_AT = round(SEARCH_TAP + 0.4, 2)
QUERY = "impact"
RESULT_AT = round(TYPE_AT + len(QUERY) * 0.09 + 0.12, 2)
RESULT_TAP = round(v6[0] - 0.3, 2)
PROD_IN = round(RESULT_TAP + 0.15, 2)
ORDER_TAP = round(v6[6] + 0.05, 2)
TAP = RESULT_TAP
k = SW / 1206                        # screenshot px -> screen px
SEARCH_X, SEARCH_Y = round(197 * k), SB + round(103 * k)

css = f"""
      #p-bg {{ background: radial-gradient(ellipse 80% 55% at 50% 45%, #f7f6f2 0%, {CREAM} 60%, #e2dfd6 100%); }}
      #p-phone {{ position: absolute; left: {PX}px; top: {PY}px; width: {PW}px; height: {PH}px; border-radius: 74px; background: #111;
        padding: 14px; box-shadow: 0 40px 70px rgba(0,0,0,0.28), 0 10px 20px rgba(0,0,0,0.18); transform-origin: 50% 40%; }}
      #p-screen {{ position: relative; width: 100%; height: 100%; border-radius: 60px; overflow: hidden; background: #f3f1ec; }}
      #p-feed {{ position: absolute; inset: 0; }}
      #p-feed .p-top {{ position: absolute; left: 0; right: 0; top: 44px; text-align: center; font-size: 22px; font-weight: 600; }}
      #p-feed .p-time {{ position: absolute; left: 44px; top: 22px; font-size: 18px; font-weight: 600; }}
      #p-fclip {{ position: absolute; left: 290px; top: 360px; height: 340px; filter: drop-shadow(0 10px 10px rgba(0,0,0,0.22)); }}
      #p-fbul {{ position: absolute; left: {290 + round(340 * 485 / 1226 * 0.103) - 2 - round(86 * 216 / 220)}px; top: {360 + int(340 * 0.24) - 12}px; width: 86px; height: 24px; }}
      #p-fwake {{ position: absolute; right: 80px; top: 6px; width: 240px; height: 12px; border-radius: 6px;
        background: linear-gradient(90deg, rgba(150,148,140,0), rgba(150,148,140,0.22)); filter: blur(4px); }}
      .p-ic {{ position: absolute; right: 30px; width: 30px; height: 30px; border: 2.5px solid {INK}; border-radius: 50%; }}
      #p-handle {{ position: absolute; left: 34px; bottom: 120px; font-size: 22px; font-weight: 600; display: flex; align-items: center; gap: 12px; }}
      #p-handle i {{ width: 36px; height: 36px; border-radius: 50%; background: #0d0d0d; display: inline-block; box-shadow: inset 0 0 0 3px {NEON}; }}
      #p-bar {{ position: absolute; left: 34px; right: 34px; bottom: 96px; height: 3px; background: {INK}; border-radius: 2px; }}
      /* browser */
      #p-browser {{ position: absolute; inset: 0; background: #ffffff; overflow: hidden; }}
      #p-sb {{ position: absolute; left: 0; right: 0; top: 0; height: {SB}px; z-index: 5; background: #1d1d1b; color: #fff; font-size: 17px; font-weight: 600; }}
      #p-sb span {{ position: absolute; left: 46px; top: 13px; color: #ffffff; }}
      .p-shot {{ position: absolute; left: 0; top: {SB}px; width: {SW}px; height: {SITE_H}px; display: block; }}
      #p-prod {{ opacity: 0; }}
      #p-bbar {{ position: absolute; left: 0; right: 0; bottom: 0; height: {BB}px; background: #f2f2f0; border-top: 1px solid #dcdcd8; }}
      #p-url {{ position: absolute; left: 50%; top: 18px; transform: translateX(-50%); padding: 12px 34px; border-radius: 30px; background: #ffffff;
        font-size: 22px; font-weight: 600; box-shadow: 0 3px 10px rgba(0,0,0,0.10); white-space: nowrap; }}
      #p-url i {{ display: inline-block; width: 10px; height: 13px; border: 2px solid #555; border-radius: 3px; margin-right: 10px; vertical-align: -1px; }}
      /* search overlay */
      #p-search {{ position: absolute; left: 0; right: 0; top: {SB}px; height: 330px; background: #ffffff; box-shadow: 0 16px 30px rgba(0,0,0,0.18); }}
      #p-field {{ position: absolute; left: 22px; right: 22px; top: 22px; height: 64px; border-radius: 14px; background: #f0f0ee; display: flex; align-items: center;
        padding-left: 18px; font-size: 26px; font-weight: 500; color: {INK}; }}
      #p-field svg {{ margin-right: 12px; flex: 0 0 auto; }}
      .p-ch {{ opacity: 0; }}
      #p-caret {{ display: inline-block; width: 2px; height: 30px; background: {ACC}; margin-left: 2px; }}
      #p-result {{ position: absolute; left: 22px; right: 22px; top: 110px; height: 190px; display: flex; align-items: center; gap: 20px; border-bottom: 1px solid #ececea; opacity: 0; }}
      #p-result img {{ height: 170px; flex: 0 0 auto; }}
      #p-rname {{ font-size: 24px; font-weight: 800; line-height: 1.2; color: {INK}; }}
      #p-rsub {{ font-size: 18px; color: {SOFT}; margin-top: 6px; }}
      #p-rprice {{ font-size: 24px; font-weight: 700; color: {INK}; margin-top: 10px; }}
      #p-rprice s {{ color: #9a9a95; font-weight: 500; font-size: 19px; margin-left: 8px; }}
      /* sticky buy bar on the product page */
      #p-sticky {{ position: absolute; left: 0; right: 0; top: {SB + SITE_H - 40}px; height: {BB + 40}px; background: #ffffff; z-index: 3; border-top: 1px solid #e6e6e2;
        box-shadow: 0 -10px 24px rgba(0,0,0,0.08); opacity: 0; }}
      #p-price {{ position: absolute; left: 26px; top: 26px; font-size: 32px; font-weight: 800; color: {INK}; }}
      #p-price s {{ display: block; font-size: 20px; font-weight: 500; color: #9a9a95; margin-top: 2px; }}
      #p-cart {{ position: absolute; right: 24px; top: 34px; padding: 22px 34px; border-radius: 12px; background: {INK}; color: #fff;
        font-size: 24px; font-weight: 800; letter-spacing: 0.05em; white-space: nowrap; }}
      .p-tap {{ position: absolute; z-index: 6; width: 84px; height: 84px; margin: -42px 0 0 -42px; border-radius: 50%; border: 4px solid rgba(78,138,14,0.95);
        background: rgba(139,209,36,0.18); opacity: 0; }}
      .p-txt {{ position: absolute; left: 40px; right: 40px; top: 250px; text-align: center; opacity: 0; }}
      .p-l1 {{ font-size: 46px; font-weight: 400; color: {SOFT}; }}
      .p-l2 {{ font-size: 76px; font-weight: 600; letter-spacing: -0.02em; margin-top: 6px; }}
      .p-g {{ color: {ACC}; }}
"""
MAG = '<svg width="26" height="26" viewBox="0 0 26 26"><g fill="none" stroke="#555" stroke-width="3" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M17 17 L24 24"/></g></svg>'
chars = "".join(f'<span class="p-ch" id="p-ch{i}">{c}</span>' for i, c in enumerate(QUERY))
body = f"""    <div id="p-bg" class="clip" data-start="0" data-duration="{T_PHONE}" data-track-index="0"></div>
    <div id="p-layer" class="clip" data-start="0" data-duration="{T_PHONE}" data-track-index="1" data-layout-allow-overflow>
      <div class="p-txt" id="p-t1"><div class="p-l1">{ws("Now imagine")}</div><div class="p-l2"><span class="wd p-g">Impact</span> {ws("does exist.")}</div></div>
      <div class="p-txt" id="p-t2"><div class="p-l1">{ws("It's real.")}</div><div class="p-l2">{ws("And it can be")} <span class="wd p-g">yours.</span></div></div>
      <div class="p-txt" id="p-t3"><div class="p-l1">{ws("Visit our shop")}</div><div class="p-l2">{ws("and order it")} <span class="wd p-g">now.</span></div></div>
      <div id="p-phone" data-layout-allow-overflow><div id="p-screen">
        <div id="p-feed">
          <div class="p-time">9:41</div><div class="p-top">For you</div>
          <div id="p-fbul"><div id="p-fwake"></div>{BULLET.format(w=86, h=24, id="brass2")}</div>
          <img id="p-fclip" src="assets/rovra-impact-zelena.png" alt="">
          <div class="p-ic" style="top:760px"></div><div class="p-ic" style="top:820px"></div><div class="p-ic" style="top:880px"></div>
          <div id="p-handle"><i></i>barberologija</div>
          <div id="p-bar"></div>
        </div>
        <div id="p-browser">
          <div id="p-sb"><span>9:41</span></div>
          <img class="p-shot" id="p-home" src="assets/site-home.png" alt="barberologija.si">
          <img class="p-shot" id="p-prod" src="assets/site-impact.png" alt="ROVRA Impact – barberologija.si">
          <div id="p-sticky"><div id="p-price">150,00 €<s>210,00 €</s></div><div id="p-cart">ORDER NOW</div></div>
          <div id="p-search">
            <div id="p-field">{MAG}{chars}<span id="p-caret"></span></div>
            <div id="p-result">
              <img src="assets/rovra-impact-thumb.png" alt="">
              <div><div id="p-rname">ROVRA IMPACT</div><div id="p-rsub">Brezžična mašinica · 9.000 obr/min</div><div id="p-rprice">150,00 €<s>210,00 €</s></div></div>
            </div>
          </div>
          <div id="p-bbar"><div id="p-url"><i></i>barberologija.si</div></div>
          <div class="p-tap" id="p-tap1" style="left:{SEARCH_X}px;top:{SEARCH_Y}px"></div>
          <div class="p-tap" id="p-tap2" style="left:{SW // 2}px;top:{SB + 205}px"></div>
          <div class="p-tap" id="p-tap3" style="left:{SW - 110}px;top:{SB + SITE_H - 40 + 75}px"></div>
        </div>
      </div></div>
    </div>"""


def tap(sel, t):
    return f'        tl.fromTo("{sel}", {{ opacity: 0, scale: 0.4 }}, {{ keyframes: [ {{ opacity: 1, scale: 1, duration: 0.14 }}, {{ opacity: 0, scale: 1.5, duration: 0.3 }} ] }}, {t});'


typing = "\n".join(f'        tl.fromTo("#p-ch{i}", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.01 }}, {TYPE_AT + i * 0.09:.2f});' for i in range(len(QUERY)))
js = f"""
        tl.fromTo("#p-phone", {{ scale: 1.75 }}, {{ scale: 1, duration: 0.7, ease: "power3.inOut" }}, 0);
        tl.fromTo("#p-t1", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.01 }}, {v4[0]});
        words("#p-t1 .p-l1 .wd", [{v4[0]}, {v4[1]}]);
        words("#p-t1 .p-l2 .wd", [{v4[2]}, {v4[3]}, {v4[4]}]);
        // the shop opens: homepage
        tl.fromTo("#p-browser", {{ yPercent: 100 }}, {{ yPercent: 0, duration: 0.45, ease: "power3.out" }}, {HOME_IN});
        tl.to("#p-feed", {{ opacity: 0, duration: 0.05 }}, {HOME_IN + 0.45:.2f});
        tl.to("#p-t1", {{ opacity: 0, duration: 0.15 }}, {v5[0] - 0.18:.2f});
        tl.fromTo("#p-t2", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.01 }}, {v5[0]});
        words("#p-t2 .p-l1 .wd", [{v5[0]}, {v5[1]}]);
        words("#p-t2 .p-l2 .wd", [{v5[2]}, {v5[3]}, {v5[4]}, {v5[5]}, {v5[6]}]);
        // search: tap the magnifier, type "impact", result appears
{tap("#p-tap1", SEARCH_TAP)}
        tl.fromTo("#p-search", {{ yPercent: -110 }}, {{ yPercent: 0, duration: 0.28, ease: "power3.out" }}, {SEARCH_TAP + 0.1:.2f});
{typing}
        tl.fromTo("#p-caret", {{ opacity: 1 }}, {{ keyframes: [ {{ opacity: 0, duration: 0.2 }}, {{ opacity: 1, duration: 0.2 }}, {{ opacity: 0, duration: 0.2 }}, {{ opacity: 1, duration: 0.2 }}, {{ opacity: 0, duration: 0.2 }}, {{ opacity: 1, duration: 0.2 }} ] }}, {RESULT_AT});
        tl.fromTo("#p-result", {{ opacity: 0, y: 14 }}, {{ opacity: 1, y: 0, duration: 0.25, ease: "power2.out" }}, {RESULT_AT});
        // open the product
{tap("#p-tap2", RESULT_TAP)}
        tl.to("#p-search", {{ opacity: 0, duration: 0.15 }}, {PROD_IN});
        tl.fromTo("#p-prod", {{ opacity: 0, x: 60 }}, {{ opacity: 1, x: 0, duration: 0.3, ease: "power3.out" }}, {PROD_IN});
        tl.fromTo("#p-sticky", {{ opacity: 0, y: 40 }}, {{ opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }}, {PROD_IN + 0.15:.2f});
        tl.to("#p-t2", {{ opacity: 0, duration: 0.15 }}, {v6[0] - 0.18:.2f});
        tl.fromTo("#p-t3", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.01 }}, {v6[0]});
        words("#p-t3 .p-l1 .wd", [{v6[0]}, {v6[1]}, {v6[2]}]);
        words("#p-t3 .p-l2 .wd", [{v6[3]}, {v6[4]}, {v6[5]}, {v6[6]}]);
        // order now
{tap("#p-tap3", ORDER_TAP)}
        tl.fromTo("#p-cart", {{ scale: 1 }}, {{ keyframes: [ {{ scale: 0.93, duration: 0.08 }}, {{ scale: 1.04, duration: 0.15 }}, {{ scale: 1, duration: 0.2 }} ] }}, {ORDER_TAP});
        tl.to("#p-cart", {{ backgroundColor: "{ACC}", duration: 0.2 }}, {ORDER_TAP + 0.1:.2f});
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
      <div id="e-sub" class="mono">ROVRA Impact · order now</div>
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
      <div id="el-end" class="scene" data-composition-id="endcard" data-composition-src="compositions/endcard.html" data-start="{round(T_MAIN + T_PHONE, 2)}" data-duration="{T_END}" data-track-index="0"></div>
      <audio id="a-vo" src="assets/voiceover-en.mp3" data-start="0" data-duration="{TOTAL}" data-track-index="10" data-volume="1"></audio>
      <audio id="a-sound" src="assets/sound-design.mp3" data-start="0" data-duration="{TOTAL}" data-track-index="11" data-volume="0.55"></audio>
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
json.dump({"VO_AT": VO_AT, "TOTAL": TOTAL, "T_MAIN": T_MAIN, "WIRE_IN": WIRE_IN, "WIRE_OUT": WIRE_OUT, "TAP": round(B + RESULT_TAP, 2), "HOME_IN": round(B + HOME_IN, 2), "SEARCH_TAP": round(B + SEARCH_TAP, 2), "TYPE_AT": round(B + TYPE_AT, 2), "ORDER_TAP": round(B + ORDER_TAP, 2), "END": round(T_MAIN + T_PHONE, 2)}, open("build/timing.json", "w"))
print("ok total", TOTAL, "edge", EDGE, "x_end", X_END1, X_END2, "tap", round(T_MAIN + TAP, 2))
