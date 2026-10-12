"""Generates the 7 scene sub-compositions for the Barberologija EN promo.

Run from the project root: python3 build/gen_scenes.py
"""
import os

G = "#8bd124"        # brand neon green (logo)
W = "#f2f2ee"        # warm white
DIM = "#5d6158"      # dimmed text
BG = "#070707"

FONTS = """
      @font-face { font-family: "Anton"; font-weight: 400; src: url("assets/fonts/anton-latin-400-normal.woff2") format("woff2"); }
      @font-face { font-family: "Inter"; font-weight: 500; src: url("assets/fonts/inter-latin-500-normal.woff2") format("woff2"); }
      @font-face { font-family: "Inter"; font-weight: 700; src: url("assets/fonts/inter-latin-700-normal.woff2") format("woff2"); }
      @font-face { font-family: "Inter"; font-weight: 800; src: url("assets/fonts/inter-latin-800-normal.woff2") format("woff2"); }
      @font-face { font-family: "IBM Plex Mono"; font-weight: 500; src: url("assets/fonts/ibm-plex-mono-latin-500-normal.woff2") format("woff2"); }
"""


def base_css(p):
    return f"""
      #root {{ width: 1920px; height: 1080px; position: relative; overflow: hidden; font-family: "Inter", sans-serif; color: {W}; }}
      .clip {{ position: absolute; inset: 0; }}
      #{p}-bg {{ background: radial-gradient(ellipse 70% 60% at 50% 45%, #10130c 0%, {BG} 70%); }}
      #{p}-cam {{ position: absolute; inset: 0; transform-origin: 50% 45%; }}
      #{p}-shk {{ position: absolute; inset: 0; }}
      .{p}-disp {{ font-family: "Anton", sans-serif; font-weight: 400; text-transform: uppercase; letter-spacing: 0.01em; line-height: 0.95;
        text-shadow: 0 10px 40px rgba(0,0,0,0.75), 0 2px 6px rgba(0,0,0,0.6); }}
      .{p}-mono {{ font-family: "IBM Plex Mono", monospace; font-weight: 500; text-transform: uppercase; letter-spacing: 0.22em; }}
      .{p}-g {{ color: {G}; text-shadow: 0 0 24px rgba(139,209,36,0.55), 0 0 70px rgba(139,209,36,0.25), 0 10px 40px rgba(0,0,0,0.7); }}
      .{p}-mask {{ display: inline-block; overflow: hidden; vertical-align: bottom; padding: 0.06em 0.04em 0.02em; margin: 0 -0.04em; }}
      .{p}-w {{ display: inline-block; }}
      .{p}-shadow {{ filter: drop-shadow(0 30px 40px rgba(0,0,0,0.7)) drop-shadow(0 0 30px rgba(139,209,36,0.12)); }}
"""


SHAKE_JS = """
        function shake(t, a) {
          tl.to(SHK, { keyframes: [
            { x: a, y: -a * 0.6, duration: 0.035 }, { x: -a * 0.8, y: a * 0.5, duration: 0.045 },
            { x: a * 0.5, y: a * 0.3, duration: 0.05 }, { x: -a * 0.3, y: -a * 0.2, duration: 0.06 },
            { x: 0, y: 0, duration: 0.08 } ] }, t);
        }
        function words(sel, times, opts) {
          const els = document.querySelectorAll(sel);
          els.forEach((el, i) => {
            tl.fromTo(el, { yPercent: 105, opacity: 0, filter: "blur(10px)" },
              { yPercent: 0, opacity: 1, filter: "blur(0px)", duration: (opts && opts.d) || 0.45, ease: "power3.out" }, times[i]);
          });
        }
"""


def wrap(fid, dur, css, body, js):
    p = fid.split("-")[0]
    return f"""<template>
  <div id="root" data-composition-id="{fid}" data-start="0" data-duration="{dur}" data-width="1920" data-height="1080">
    <style>{FONTS}{base_css(p)}{css}    </style>

    <div id="{p}-bg" class="clip" data-start="0" data-duration="{dur}" data-track-index="0"></div>
    <div id="{p}-stage" class="clip" data-start="0" data-duration="{dur}" data-track-index="1">
      <div id="{p}-cam"><div id="{p}-shk">
{body}
      </div></div>
    </div>

    <script src="assets/vendor/gsap.min.js"></script>
    <script>
      (function () {{
        window.__timelines = window.__timelines || {{}};
        const tl = gsap.timeline({{ paused: true }});
        const SHK = "#{p}-shk";
{SHAKE_JS}
        // slow push-in on every shot
        tl.fromTo("#{p}-cam", {{ scale: 1.0 }}, {{ scale: 1.06, duration: {dur}, ease: "none" }}, 0);
{js}
        window.__timelines["{fid}"] = tl;
      }})();
    </script>
  </div>
</template>
"""


def mw(p, text, cls="", wid=None):
    """masked word span"""
    i = f' id="{wid}"' if wid else ""
    occ = " data-layout-allow-occlusion" if p == "s5" else ""
    return f'<span class="{p}-mask"><span class="{p}-w {cls}"{i}{occ}>{text}</span></span>'


scenes = {}

# ---------------- S1 HOOK (6.0s) ----------------
p = "s1"
lineA = "We don't sell everything."
NCH = len(lineA)
chars = '<span class="s1-c s1-c0"><i class="s1-k" id="s1-k0"></i></span>' + "".join(
    f'<span class="s1-c" id="s1-c{i+1}">{c if c != " " else "&nbsp;"}<i class="s1-k" id="s1-k{i+1}"></i></span>' for i, c in enumerate(lineA))
css = f"""
      #s1-a {{ position: absolute; left: 0; right: 0; top: 300px; text-align: center; font-size: 120px; color: {W}; white-space: nowrap; }}
      .s1-c {{ position: relative; display: inline-block; }}
      .s1-c0 {{ width: 0; height: 0.82em; }}
      .s1-k {{ position: absolute; right: -0.1em; top: 0.06em; width: 0.08em; height: 0.82em; background: {G}; box-shadow: 0 0 18px rgba(139,209,36,0.8); opacity: 0; }}
      #s1-b {{ position: absolute; left: 0; right: 0; top: 470px; text-align: center; font-size: 230px; white-space: nowrap; }}
"""
body = f"""        <div id="s1-a" class="s1-disp">{chars}</div>
        <div id="s1-b" class="s1-disp">{mw(p,"Only")} {mw(p,"what")} {mw(p,"we")} {mw(p,"test.","s1-g","s1-test")}</div>"""
js = f"""
        // build: caret blinks on black, then types (0.8-1.9); the caret rides the last typed glyph
        const N = {NCH};
        tl.fromTo("#s1-k0", {{ opacity: 0 }}, {{ keyframes: [
          {{ opacity: 1, duration: 0.01 }}, {{ opacity: 1, duration: 0.24 }}, {{ opacity: 0, duration: 0.01 }}, {{ opacity: 0, duration: 0.2 }},
          {{ opacity: 1, duration: 0.01 }}, {{ opacity: 1, duration: 0.3 }}, {{ opacity: 0, duration: 0.01 }} ] }}, 0.0);
        for (let i = 1; i <= N; i++) {{
          const t = 0.8 + (i - 1) * (1.1 / N);
          tl.fromTo("#s1-c" + i, {{ opacity: 0 }}, {{ opacity: 1, duration: 0.01 }}, t);
          tl.fromTo("#s1-k" + i, {{ opacity: 0 }}, {{ keyframes: i < N
            ? [ {{ opacity: 1, duration: 0.01 }}, {{ opacity: 1, duration: 1.1 / N - 0.02 }}, {{ opacity: 0, duration: 0.01 }} ]
            : [ {{ opacity: 1, duration: 0.01 }}, {{ opacity: 1, duration: 0.2 }}, {{ opacity: 0, duration: 0.01 }}, {{ opacity: 0, duration: 0.15 }}, {{ opacity: 1, duration: 0.01 }}, {{ opacity: 1, duration: 0.05 }}, {{ opacity: 0, duration: 0.15 }} ] }}, t);
        }}
        // impact: line A lifts + dims, line B slams word by word
        tl.to("#s1-a", {{ y: -60, scale: 0.72, opacity: 0.38, duration: 0.6, ease: "power3.out" }}, 2.05);
        words("#s1-b .s1-w", [2.22, 2.8, 2.95, 3.14], {{ d: 0.38 }});
        tl.fromTo("#s1-test", {{ scale: 1.25 }}, {{ scale: 1, duration: 0.5, ease: "expo.out", transformOrigin: "50% 80%" }}, 3.14);
        shake(3.16, 14);
        // release: glow breathes down
        tl.to("#s1-test", {{ textShadow: "0 0 40px rgba(139,209,36,0.9), 0 0 120px rgba(139,209,36,0.45), 0 10px 40px rgba(0,0,0,0.7)", duration: 0.25 }}, 3.16);
        tl.to("#s1-test", {{ textShadow: "0 0 24px rgba(139,209,36,0.55), 0 0 70px rgba(139,209,36,0.25), 0 10px 40px rgba(0,0,0,0.7)", duration: 1.6, ease: "power2.out" }}, 3.45);
"""
scenes["s1-hook"] = (6.0, css, body, js)

# ---------------- S2 LOGO (5.6s) ----------------
css = f"""
      #s2-logo {{ position: absolute; left: 510px; top: 120px; width: 900px; height: 483px; }}
      #s2-logo img {{ position: absolute; inset: 0; width: 100%; height: 100%; }}
      #s2-outline {{ filter: drop-shadow(0 0 12px rgba(139,209,36,0.9)) drop-shadow(0 0 40px rgba(139,209,36,0.45)); }}
      #s2-letters {{ filter: drop-shadow(0 8px 24px rgba(0,0,0,0.6)); }}
      #s2-sweep {{ position: absolute; top: -60px; bottom: -60px; width: 220px; left: -260px;
        background: linear-gradient(90deg, rgba(255,255,255,0), rgba(230,255,190,0.85), rgba(255,255,255,0));
        transform: skewX(-18deg); mix-blend-mode: screen; filter: blur(6px); }}
      #s2-t {{ position: absolute; left: 0; right: 0; top: 660px; text-align: center; font-size: 96px; white-space: nowrap; }}
"""
body = f"""        <div id="s2-logo">
          <img id="s2-outline" src="assets/logo-outline.svg" alt="">
          <img id="s2-letters" src="assets/logo-letters.svg" alt="Barberologija">
          <div id="s2-sweep"></div>
        </div>
        <div id="s2-t" class="s2-disp">{mw("s2","A")} {mw("s2","small")} {mw("s2","shop.")} &nbsp; {mw("s2","Run")} {mw("s2","by")} {mw("s2","barbers.","s2-g")}</div>"""
js = """
        // build: neon tube flicker
        tl.fromTo("#s2-outline", { opacity: 0 }, { keyframes: [
          { opacity: 0.9, duration: 0.05 }, { opacity: 0.05, duration: 0.1 }, { opacity: 0.8, duration: 0.05 },
          { opacity: 0.1, duration: 0.18 }, { opacity: 1, duration: 0.06 }, { opacity: 0.55, duration: 0.05 }, { opacity: 1, duration: 0.2 } ] }, 0.15);
        // impact: letters revealed by light sweep on "Barberologija" (1.08)
        tl.fromTo("#s2-letters", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.55, ease: "power2.inOut" }, 0.85);
        tl.fromTo("#s2-sweep", { x: 0, opacity: 1 }, { x: 1250, opacity: 0, duration: 0.8, ease: "power2.inOut" }, 0.8);
        tl.fromTo("#s2-logo", { scale: 0.94 }, { scale: 1, duration: 0.6, ease: "expo.out" }, 1.08);
        shake(1.1, 12);
        // release: tagline word by word
        words("#s2-t .s2-w", [2.41, 2.45, 2.83, 3.36, 3.61, 3.78]);
"""
scenes["s2-logo"] = (5.6, css, body, js)

# ---------------- S3 PROCESS (7.0s) ----------------
def check_svg(i):
    return f"""<svg class="s3-chk" id="s3-chk{i}" width="92" height="92" viewBox="0 0 92 92">
            <circle class="s3-ring" cx="46" cy="46" r="40" fill="none" stroke="{G}" stroke-width="5" pathLength="1" />
            <path class="s3-tick" d="M27 47 L41 61 L66 33" fill="none" stroke="{G}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" pathLength="1" />
          </svg>"""

css = f"""
      #s3-steps {{ position: absolute; left: 150px; top: 200px; width: 1000px; }}
      .s3-row {{ position: relative; height: 190px; display: flex; align-items: center; }}
      .s3-chk {{ flex: 0 0 92px; margin-right: 40px; filter: drop-shadow(0 0 14px rgba(139,209,36,0.6)); }}
      .s3-ring, .s3-tick {{ stroke-dasharray: 1; stroke-dashoffset: 1; }}
      .s3-num {{ position: absolute; left: 132px; top: 22px; font-size: 20px; color: {G}; }}
      .s3-txt {{ font-size: 84px; white-space: nowrap; }}
      #s3-prod {{ position: absolute; left: 1220px; top: 130px; width: 560px; height: 680px; }}
      #s3-prod img {{ position: absolute; left: 50%; bottom: 0; height: 640px; transform: translateX(-50%); }}
      #s3-glow {{ position: absolute; left: 1150px; top: 220px; width: 700px; height: 600px; border-radius: 50%;
        background: radial-gradient(closest-side, rgba(139,209,36,0.28), rgba(139,209,36,0) 100%); filter: blur(20px); }}
"""
rows = [("01", "We test"), ("02", "We use it behind the chair"), ("03", "Only then it's for sale")]
rows_html = "\n".join(
    f"""          <div class="s3-row" id="s3-r{i}">
          {check_svg(i)}
            <div class="s3-num s3-mono">Step {n}</div>
            <div class="s3-txt s3-disp">{mw("s3", t)}</div>
          </div>""" for i, (n, t) in enumerate(rows))
prods = ["rovra-impact-zelena", "rovra-super-cut-crna", "rovra-x-shave-v2", "rovra-pulse-zelena"]
prod_html = "\n".join(f'          <img class="s3-shadow" id="s3-p{i}" src="assets/products/{n}.png" alt="">' for i, n in enumerate(prods))
body = f"""        <div id="s3-glow"></div>
        <div id="s3-steps">
{rows_html}
        </div>
        <div id="s3-prod">
{prod_html}
        </div>"""
js = """
        const rowT = [0.4, 1.9, 4.4], chkT = [0.9, 2.4, 4.9];
        rowT.forEach((t, i) => {
          tl.fromTo("#s3-r" + i + " .s3-w", { yPercent: 105, opacity: 0 }, { yPercent: 0, opacity: 0.45, duration: 0.5, ease: "power3.out" }, t);
          tl.fromTo("#s3-r" + i + " .s3-num", { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.4, ease: "power3.out" }, t);
          tl.fromTo("#s3-chk" + i + " .s3-ring", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.45, ease: "power2.inOut" }, chkT[i] - 0.3);
          tl.fromTo("#s3-chk" + i + " .s3-tick", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.25, ease: "power2.out" }, chkT[i] + 0.1);
          tl.to("#s3-r" + i + " .s3-w", { opacity: 1, duration: 0.3 }, chkT[i] + 0.1);
          tl.fromTo("#s3-chk" + i, { scale: 0.8 }, { scale: 1, duration: 0.4, ease: "back.out(2.2)" }, chkT[i] + 0.1);
        });
        tl.to("#s3-r2 .s3-w", { color: "#8bd124", textShadow: "0 0 24px rgba(139,209,36,0.55), 0 10px 40px rgba(0,0,0,0.7)", duration: 0.3 }, 5.0);
        shake(5.0, 8);
        // products cycle on the right: in with push + slight rotation; out with blur
        const pin = [0.3, 1.9, 3.4, 4.9], pout = [1.9, 3.4, 4.9];
        pin.forEach((t, i) => {
          tl.fromTo("#s3-p" + i, { opacity: 0, y: 40, scale: 0.92, rotation: i % 2 ? 4 : -4, filter: "blur(12px)" },
            { opacity: 1, y: 0, scale: 1, rotation: 0, filter: "blur(0px)", duration: 0.55, ease: "power3.out" }, t);
          if (i < 3) tl.to("#s3-p" + i, { opacity: 0, scale: 1.06, filter: "blur(14px)", duration: 0.35, ease: "power2.in" }, pout[i] - 0.1);
        });
        tl.fromTo("#s3-glow", { opacity: 0.4 }, { opacity: 1, duration: 1.2, ease: "power2.out" }, 0.3);
"""
scenes["s3-process"] = (7.0, css, body, js)

# ---------------- S4 BRANDS (6.2s) ----------------
css = f"""
      #s4-rovra {{ position: absolute; left: 610px; top: 300px; width: 700px; height: 125px; }}
      #s4-rcut {{ position: absolute; left: 800px; top: 297px; width: 320px; height: 131px; }}
      .s4-logo {{ filter: drop-shadow(0 12px 30px rgba(0,0,0,0.8)) drop-shadow(0 0 22px rgba(255,255,255,0.12)); }}
      #s4-sweep {{ position: absolute; top: 200px; height: 340px; width: 180px; left: -200px;
        background: linear-gradient(90deg, rgba(255,255,255,0), rgba(230,255,190,0.55), rgba(255,255,255,0)); transform: skewX(-18deg); mix-blend-mode: screen; filter: blur(8px); }}
      #s4-t1 {{ position: absolute; left: 0; right: 0; top: 560px; text-align: center; font-size: 104px; white-space: nowrap; }}
      #s4-t2 {{ position: absolute; left: 0; right: 0; top: 690px; text-align: center; font-size: 104px; white-space: nowrap; }}
"""
body = f"""        <img id="s4-rovra" class="s4-logo" src="assets/brands/rovra-white.svg" alt="ROVRA">
        <img id="s4-rcut" class="s4-logo" src="assets/brands/rcutone-white.png" alt="RcuT ONE">
        <div id="s4-sweep"></div>
        <div id="s4-t1" class="s4-disp">{mw("s4","Few")} {mw("s4","brands.")}</div>
        <div id="s4-t2" class="s4-disp">{mw("s4","Every")} {mw("s4","one")} {mw("s4","earned.","s4-g","s4-earned")}</div>"""
js = """
        // brand 1 alone in the center
        tl.fromTo("#s4-rovra", { opacity: 0, scale: 1.12, filter: "blur(16px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.8, ease: "power3.out" }, 0.25);
        tl.fromTo("#s4-sweep", { x: 0 }, { x: 2300, duration: 1.0, ease: "power2.inOut" }, 0.45);
        // brand 1 slides left, brand 2 arrives in the center then settles right
        tl.to("#s4-rovra", { x: -400, scale: 0.78, duration: 0.6, ease: "power3.inOut" }, 1.1);
        tl.fromTo("#s4-rcut", { opacity: 0, x: 330, scale: 1.15, filter: "blur(16px)" }, { opacity: 1, x: 330, scale: 1, filter: "blur(0px)", duration: 0.7, ease: "power3.out" }, 1.7);
        words("#s4-t1 .s4-w", [1.61, 1.84]);
        words("#s4-t2 .s4-w", [3.15, 3.39, 3.86]);
        tl.fromTo("#s4-earned", { scale: 1.2 }, { scale: 1, duration: 0.45, ease: "expo.out", transformOrigin: "50% 80%" }, 3.86);
        shake(3.88, 10);
"""
scenes["s4-brands"] = (6.2, css, body, js)

# ---------------- S5 PRO PRICING (12.8s) ----------------
ICON = {
 "salon": """<svg viewBox="0 0 120 120" width="150" height="150"><g fill="none" stroke="#f2f2ee" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
   <circle cx="34" cy="88" r="14"/><circle cx="86" cy="88" r="14"/><path d="M44 78 L92 18"/><path d="M76 78 L28 18"/></g></svg>""",
 "barbershop": """<svg viewBox="0 0 120 120" width="150" height="150"><g fill="none" stroke="#f2f2ee" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
   <rect x="42" y="22" width="36" height="76" rx="8"/><path d="M42 40 L78 28 M42 58 L78 46 M42 76 L78 64 M42 94 L78 82" stroke="#8bd124"/>
   <path d="M36 22 H84 M36 98 H84"/><circle cx="60" cy="12" r="6"/></g></svg>""",
 "student": """<svg viewBox="0 0 120 120" width="150" height="150"><g fill="none" stroke="#f2f2ee" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
   <path d="M10 46 L60 24 L110 46 L60 68 Z"/><path d="M30 56 V82 C30 92 90 92 90 82 V56"/><path d="M104 49 V78"/><circle cx="104" cy="82" r="4" fill="#8bd124" stroke="#8bd124"/></g></svg>""",
 "comb": """<svg viewBox="0 0 120 120" width="110" height="110"><g fill="none" stroke="#f2f2ee" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
   <rect x="14" y="38" width="92" height="18" rx="4"/><path d="M22 56 V84 M32 56 V84 M42 56 V84 M52 56 V84 M62 56 V84 M72 56 V84 M82 56 V84 M92 56 V84"/></g></svg>""",
}
css = f"""
      #s5-icons {{ position: absolute; left: 0; right: 0; top: 280px; display: flex; justify-content: center; gap: 190px; }}
      .s5-ic {{ display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 12px 24px rgba(0,0,0,0.7)); }}
      .s5-ic .s5-mono {{ margin-top: 26px; font-size: 26px; color: {W}; }}
      #s5-title {{ position: absolute; left: 0; right: 0; top: 150px; text-align: center; font-size: 150px; white-space: nowrap; }}
      #s5-kicker {{ position: absolute; left: 0; right: 0; top: 112px; text-align: center; font-size: 22px; color: {G}; }}
      .s5-row {{ position: absolute; left: 220px; height: 120px; width: 1500px; }}
      .s5-thumb {{ position: absolute; left: 0; top: 50%; height: 118px; width: 118px; display: flex; align-items: center; justify-content: center; transform: translateY(-50%); }}
      .s5-thumb img {{ max-height: 118px; max-width: 118px; filter: drop-shadow(0 10px 18px rgba(0,0,0,0.75)); }}
      .s5-lab {{ position: absolute; left: 160px; top: 50%; margin-top: -32px; font-size: 62px; }}
      .s5-bar {{ position: absolute; left: 560px; top: 50%; margin-top: -20px; height: 40px; border-radius: 3px; background: {W};
        transform-origin: 0% 50%; box-shadow: 0 10px 24px rgba(0,0,0,0.65); }}
      #s5-bar2 {{ background: linear-gradient(90deg, #6fae14, {G}); box-shadow: 0 0 30px rgba(139,209,36,0.55), 0 10px 24px rgba(0,0,0,0.65); }}
      .s5-val {{ position: absolute; top: 50%; margin-top: -48px; font-size: 92px; }}
"""
bars = [("Clippers", 30, '<img src="assets/products/rovra-impact-zelena.png" alt="">'),
        ("Scissors", 25, '<img src="assets/products/rcut-hi-14se-skarje.png" alt="">'),
        ("Accessories", 50, ICON["comb"])]
PX = 15.5  # px per percent
rows_html = ""
for i, (lab, pct, thumb) in enumerate(bars):
    top = 400 + i * 150
    vx = 560 + pct * PX + 36
    g = " s5-g" if i == 2 else ""
    rows_html += f"""          <div class="s5-row" data-layout-allow-occlusion id="s5-row{i}" style="top:{top}px">
            <div class="s5-thumb">{thumb}</div>
            <div class="s5-lab s5-disp" data-layout-allow-occlusion>{lab}</div>
            <div class="s5-bar" id="s5-bar{i}" style="width:{pct*PX:.0f}px"></div>
            <div class="s5-val s5-disp{g}" data-layout-allow-occlusion id="s5-val{i}" style="left:{vx:.0f}px">-<span id="s5-n{i}" data-layout-allow-occlusion>0</span>%</div>
          </div>
"""
body = f"""        <div id="s5-icons">
          <div class="s5-ic" id="s5-ic0">{ICON["salon"]}<div class="s5-mono">Salon</div></div>
          <div class="s5-ic" id="s5-ic1">{ICON["barbershop"]}<div class="s5-mono">Barbershop</div></div>
          <div class="s5-ic" id="s5-ic2">{ICON["student"]}<div class="s5-mono">Student</div></div>
        </div>
        <div id="s5-kicker" class="s5-mono" data-layout-allow-occlusion>Up to</div>
        <div id="s5-title" class="s5-disp" data-layout-allow-occlusion>{mw("s5","Pro")} {mw("s5","Pricing","s5-g")}</div>
{rows_html}"""
js = """
        // phase A: audience icons
        [0.82, 1.53, 2.76].forEach((t, i) => {
          tl.fromTo("#s5-ic" + i, { opacity: 0, y: 40, scale: 0.85, filter: "blur(10px)" }, { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 0.55, ease: "power3.out" }, t - 0.15);
        });
        // phase B: icons release, title slams
        tl.to("#s5-icons", { opacity: 0, y: -60, scale: 0.8, filter: "blur(8px)", duration: 0.5, ease: "power2.in" }, 3.45);
        words("#s5-title .s5-w", [3.82, 4.1], { d: 0.4 });
        shake(4.12, 9);
        tl.to("#s5-title", { y: -40, scale: 0.62, duration: 0.7, ease: "power3.inOut" }, 4.9);
        tl.fromTo("#s5-kicker", { opacity: 0 }, { opacity: 1, duration: 0.4 }, 5.2);
        // phase C: bars grow one by one, numbers count up
        const grow = [5.45, 7.33, 9.5], cnt = [0.8, 0.8, 1.0], pct = [30, 25, 50];
        grow.forEach((t, i) => {
          tl.fromTo("#s5-row" + i + " .s5-thumb", { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out" }, t - 0.35);
          tl.fromTo("#s5-row" + i + " .s5-lab", { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out" }, t - 0.3);
          tl.fromTo("#s5-bar" + i, { scaleX: 0 }, { scaleX: 1, duration: cnt[i], ease: "power2.out" }, t);
          tl.fromTo("#s5-val" + i, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.3 }, t);
          const o = { v: 0 };
          tl.fromTo(o, { v: 0 }, { v: pct[i], duration: cnt[i], ease: "power2.out",
            onUpdate: () => { document.getElementById("s5-n" + i).textContent = Math.round(o.v); } }, t);
          // glow when the counter lands
          tl.fromTo("#s5-val" + i, { textShadow: "0 0 0px rgba(139,209,36,0), 0 10px 40px rgba(0,0,0,0.7)" },
            { textShadow: "0 0 34px rgba(139,209,36,0.95), 0 10px 40px rgba(0,0,0,0.7)", duration: 0.2, immediateRender: false }, t + cnt[i]);
          tl.to("#s5-val" + i, { textShadow: i === 2 ? "0 0 26px rgba(139,209,36,0.7), 0 0 80px rgba(139,209,36,0.35), 0 10px 40px rgba(0,0,0,0.7)" : "0 0 0px rgba(139,209,36,0), 0 10px 40px rgba(0,0,0,0.7)", duration: 1.0 }, t + cnt[i] + 0.2);
        });
        // biggest: -50% punches
        tl.fromTo("#s5-val2", { scale: 1 }, { keyframes: [ { scale: 1.28, duration: 0.12 }, { scale: 1.12, duration: 0.5, ease: "power3.out" } ], transformOrigin: "0% 50%", immediateRender: false }, 10.5);
        shake(10.5, 16);
        tl.to(["#s5-row0", "#s5-row1"], { opacity: 0.55, duration: 0.6 }, 10.6);
"""
scenes["s5-pricing"] = (12.8, css, body, js)

# ---------------- S6 CLIPPER COMPARE (9.0s) ----------------
rows6 = [  # label, left text, right text, left frac, right frac, winner side
    ("Motor speed · RPM", "9,000", "8,000", 0.90, 0.80, "L"),
    ("Battery · min", "240", "150", 0.96, 0.60, "L"),
    ("Blade heat · lower wins", "Low", "High", 0.28, 0.85, "L"),
    ("Noise over time · lower wins", "Low", "Not tested", 0.30, 0.0, "L"),
]
BW = 330
css = f"""
      #s6-kick {{ position: absolute; left: 0; right: 0; top: 330px; text-align: center; font-size: 30px; color: {G}; }}
      #s6-title {{ position: absolute; left: 0; right: 0; top: 390px; text-align: center; font-size: 190px; white-space: nowrap; }}
      .s6-side {{ position: absolute; top: 250px; width: 380px; text-align: center; }}
      #s6-L {{ left: 70px; }} #s6-R {{ left: 1470px; }}
      .s6-pimg {{ height: 380px; display: block; margin: 0 auto; filter: drop-shadow(0 26px 30px rgba(0,0,0,0.8)); }}
      .s6-brand {{ margin-top: 18px; font-size: 20px; color: {DIM}; }}
      .s6-name {{ font-size: 56px; margin-top: 4px; }}
      .s6-score {{ margin-top: 10px; font-size: 104px; line-height: 1; }}
      .s6-score small {{ font-family: "IBM Plex Mono", monospace; font-size: 24px; color: {DIM}; letter-spacing: 0.1em; }}
      #s6-rows {{ position: absolute; left: 520px; top: 250px; width: 880px; }}
      .s6-row {{ position: relative; height: 128px; }}
      .s6-lab {{ position: absolute; left: 0; right: 0; top: 0; text-align: center; font-size: 19px; color: #a7aa9f; }}
      .s6-bl, .s6-br {{ position: absolute; top: 40px; height: 26px; border-radius: 3px; background: #4a4d46; box-shadow: 0 8px 18px rgba(0,0,0,0.6); }}
      .s6-bl {{ right: 450px; transform-origin: 100% 50%; }}
      .s6-br {{ left: 450px; transform-origin: 0% 50%; }}
      .s6-vl, .s6-vr {{ position: absolute; top: 76px; font-size: 40px; color: #8d9087; }}
      .s6-vl {{ right: 450px; }} .s6-vr {{ left: 450px; }}
      .s6-mid {{ position: absolute; left: 439px; top: 34px; width: 2px; height: 38px; background: #2c2e29; }}
      #s6-vs {{ position: absolute; left: 0; right: 0; top: 200px; text-align: center; font-size: 30px; color: {DIM}; }}
      #s6-note {{ position: absolute; left: 0; right: 0; top: 840px; text-align: center; font-size: 15px; color: #6c6f66; letter-spacing: 0.14em; }}
      #s6-wahl {{ display: block; margin: 0 auto; }}
"""
WAHL = """<svg id="s6-wahl" width="200" height="380" viewBox="0 0 200 380"><g fill="none" stroke="#5d6158" stroke-width="5" stroke-linejoin="round">
  <path d="M50 30 H150 V60 H50 Z"/><path d="M58 30 V12 M72 30 V12 M86 30 V12 M100 30 V12 M114 30 V12 M128 30 V12 M142 30 V12"/>
  <path d="M46 60 C40 140 52 240 62 330 C66 362 134 362 138 330 C148 240 160 140 154 60 Z"/><rect x="84" y="160" width="32" height="54" rx="8"/></g></svg>"""
rows_html = ""
for i, (lab, lt, rt, lf, rf, win) in enumerate(rows6):
    rows_html += f"""          <div class="s6-row" id="s6-row{i}">
            <div class="s6-lab s6-mono">{lab}</div>
            <div class="s6-mid"></div>
            <div class="s6-bl" id="s6-bl{i}" style="width:{lf*BW:.0f}px"></div>
            <div class="s6-br" id="s6-br{i}" style="width:{max(rf,0.001)*BW:.0f}px"></div>
            <div class="s6-vl s6-disp" id="s6-vl{i}" style="margin-right:0">{lt}</div>
            <div class="s6-vr s6-disp" id="s6-vr{i}">{rt}</div>
          </div>
"""
body = f"""        <div id="s6-kick" class="s6-mono">Coming soon</div>
        <div id="s6-title" class="s6-disp">{mw("s6","Clipper")} {mw("s6","Compare","s6-g")}</div>
        <div class="s6-side" id="s6-L">
          <img class="s6-pimg" src="assets/products/rovra-impact-zelena.png" alt="ROVRA Impact">
          <div class="s6-brand s6-mono">ROVRA</div>
          <div class="s6-name s6-disp">Impact</div>
          <div class="s6-score s6-disp s6-g" id="s6-sl"><span id="s6-nl">0</span><small> /100</small></div>
        </div>
        <div class="s6-side" id="s6-R">
          {WAHL}
          <div class="s6-brand s6-mono">Wahl</div>
          <div class="s6-name s6-disp">Vapor</div>
          <div class="s6-score s6-disp" id="s6-sr" style="color:#8d9087"><span id="s6-nr">0</span><small> /100</small></div>
        </div>
        <div id="s6-rows">
{rows_html}        </div>
        <div id="s6-note" class="s6-mono">Specs & scores: barberologija.si · Blade heat & noise: tested by Barberologija</div>"""
js = """
        // build: label + title
        tl.fromTo("#s6-kick", { opacity: 0, scale: 1.25, filter: "blur(8px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.0, ease: "power3.out" }, 0.35);
        words("#s6-title .s6-w", [2.23, 2.58], { d: 0.42 });
        shake(2.6, 10);
        // release title to the top, the duel arrives
        tl.to("#s6-title", { y: -330, scale: 0.42, duration: 0.8, ease: "power3.inOut" }, 3.3);
        tl.to("#s6-kick", { y: -270, scale: 0.8, duration: 0.8, ease: "power3.inOut" }, 3.3);
        tl.fromTo("#s6-L", { opacity: 0, x: -120 }, { opacity: 1, x: 0, duration: 0.7, ease: "power3.out" }, 3.55);
        tl.fromTo("#s6-R", { opacity: 0, x: 120 }, { opacity: 1, x: 0, duration: 0.7, ease: "power3.out" }, 3.65);
        // category rows: bars grow, winner lights up
        const rt = [4.0, 4.6, 5.2, 5.8];
        rt.forEach((t, i) => {
          tl.fromTo("#s6-row" + i + " .s6-lab", { opacity: 0 }, { opacity: 1, duration: 0.3 }, t);
          tl.fromTo("#s6-bl" + i, { scaleX: 0 }, { scaleX: 1, duration: 0.55, ease: "power2.out" }, t + 0.05);
          tl.fromTo("#s6-br" + i, { scaleX: 0 }, { scaleX: 1, duration: 0.55, ease: "power2.out" }, t + 0.05);
          tl.fromTo(["#s6-vl" + i, "#s6-vr" + i], { opacity: 0 }, { opacity: 1, duration: 0.3 }, t + 0.25);
          tl.to("#s6-bl" + i, { backgroundColor: "#8bd124", boxShadow: "0 0 26px rgba(139,209,36,0.75), 0 8px 18px rgba(0,0,0,0.6)", duration: 0.25 }, t + 0.6);
          tl.to("#s6-vl" + i, { color: "#8bd124", textShadow: "0 0 22px rgba(139,209,36,0.8)", duration: 0.25 }, t + 0.6);
        });
        // overall score counts up
        const SC = { l: 0, r: 0 };
        tl.fromTo("#s6-sl, #s6-sr", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3 }, 6.8);
        tl.fromTo(SC, { l: 0, r: 0 }, { l: 67, r: 46, duration: 1.0, ease: "power2.out", onUpdate: () => {
          document.getElementById("s6-nl").textContent = Math.round(SC.l); document.getElementById("s6-nr").textContent = Math.round(SC.r); } }, 6.9);
        tl.fromTo("#s6-sl", { scale: 1 }, { keyframes: [ { scale: 1.22, duration: 0.1 }, { scale: 1, duration: 0.5, ease: "power3.out" } ], immediateRender: false }, 7.9);
        tl.to("#s6-sl", { textShadow: "0 0 40px rgba(139,209,36,1), 0 0 110px rgba(139,209,36,0.5)", duration: 0.2 }, 7.9);
        tl.to("#s6-sl", { textShadow: "0 0 24px rgba(139,209,36,0.6), 0 0 70px rgba(139,209,36,0.25)", duration: 0.9 }, 8.1);
        shake(7.92, 12);
        tl.fromTo("#s6-note", { opacity: 0 }, { opacity: 1, duration: 0.6 }, 4.4);
"""
scenes["s6-compare"] = (9.0, css, body, js)

# ---------------- S7 OUTRO (5.4s) ----------------
css = f"""
      #s7-logo {{ position: absolute; left: 550px; top: 110px; width: 820px; height: 440px; }}
      #s7-logo img {{ position: absolute; inset: 0; width: 100%; height: 100%; }}
      #s7-outline {{ filter: drop-shadow(0 0 12px rgba(139,209,36,0.9)) drop-shadow(0 0 40px rgba(139,209,36,0.45)); }}
      #s7-sweep {{ position: absolute; top: -60px; bottom: -60px; width: 220px; left: -260px;
        background: linear-gradient(90deg, rgba(255,255,255,0), rgba(230,255,190,0.85), rgba(255,255,255,0)); transform: skewX(-18deg); mix-blend-mode: screen; filter: blur(6px); }}
      #s7-t {{ position: absolute; left: 0; right: 0; top: 610px; text-align: center; font-size: 104px; white-space: nowrap; }}
      #s7-url {{ position: absolute; left: 0; right: 0; top: 760px; text-align: center; font-family: "Inter", sans-serif; font-weight: 800; font-size: 46px; color: {G};
        letter-spacing: 0.02em; text-shadow: 0 0 20px rgba(139,209,36,0.6), 0 8px 24px rgba(0,0,0,0.7); }}
      #s7-black {{ position: absolute; inset: -100px; background: #000; opacity: 0; }}
"""
body = f"""        <div id="s7-logo">
          <img id="s7-outline" src="assets/logo-outline.svg" alt="">
          <img id="s7-letters" src="assets/logo-letters.svg" alt="Barberologija">
          <div id="s7-sweep"></div>
        </div>
        <div id="s7-t" class="s7-disp">{mw("s7","Tested")} {mw("s7","behind")} {mw("s7","the")} {mw("s7","chair.","s7-g")}</div>
        <div id="s7-url">barberologija.si</div>
        <div id="s7-black"></div>"""
js = """
        tl.fromTo("#s7-outline", { opacity: 0 }, { keyframes: [
          { opacity: 0.9, duration: 0.05 }, { opacity: 0.1, duration: 0.1 }, { opacity: 1, duration: 0.06 }, { opacity: 0.6, duration: 0.05 }, { opacity: 1, duration: 0.2 } ] }, 0.1);
        tl.fromTo("#s7-letters", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.5, ease: "power2.inOut" }, 0.55);
        tl.fromTo("#s7-sweep", { x: 0, opacity: 1 }, { x: 1150, opacity: 0, duration: 0.8, ease: "power2.inOut" }, 0.5);
        tl.fromTo("#s7-logo", { scale: 0.93 }, { scale: 1, duration: 0.7, ease: "expo.out" }, 0.8);
        shake(0.82, 12);
        words("#s7-t .s7-w", [1.68, 2.46, 2.93, 3.0]);
        tl.fromTo("#s7-url", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, 3.4);
        // final frame: fade to black
        tl.fromTo("#s7-black", { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.in" }, 4.9);
"""
scenes["s7-outro"] = (5.4, css, body, js)

os.makedirs("compositions/scenes", exist_ok=True)
for fid, (dur, css, body, js) in scenes.items():
    with open(f"compositions/scenes/{fid}.html", "w") as f:
        f.write(wrap(fid, dur, css, body, js))
    print("wrote", fid, dur)
