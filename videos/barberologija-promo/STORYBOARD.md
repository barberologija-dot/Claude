---
format: 1080x1080
duration: 20s
message: "Vse, kar prodajamo, sami uporabljamo v brivnicah – zato za kakovost stojimo in jo garantiramo."
arc: Hook → Proof → Value → Brand_Outro
audience: brivci in frizerji v Sloveniji
mode: autonomous
music: none
---

## Video direction

- palette: ground `ink-black` #0d0d0d (dark register only, every frame); display type `cream` #ffffff; the single accent is the logo's neon green (`fire-orange` key → #8bd124) — used for the key word per frame, stub rules, and as a soft neon glow (text-shadow / radial bloom). `border-dark` hairlines for chrome. No orange register, no other hues.
- type: Barlow 900 lowercase display (frame.md `display` / `fadelist-title`), IBM Plex Mono uppercase `label` for kickers and the URL. Slovenian diacritics (č š ž) must render.
- cinematic layer (video-wide): faint perspective floor grid in border-dark receding to a horizon, a low neon-green radial haze near the horizon, subtle film grain + vignette. Mono chrome corners ("BARBEROLOGIJA · 1080 · 30 FPS" top-left, frame counter top-right) like a camera viewfinder — suppressed on frame 4.
- motion grammar: long-tail power3/expo eases, smooth over bouncy; reveals paced to the on-screen words (no VO — each phrase is its own cue); hard-cut token swaps allowed in frame 1; slow continuous camera push-in on the grid floor through frames 1–3 for cinematic depth.
- rhythm: frame 1 punchy, frame 2 builds (rule of three), frame 3 is the held breather, frame 4 is the climax logo sting then held.
- negative list: no stock photos, no fake products, no purple/blue gradients, no bokeh; no slideshow (front-load then freeze); no screensaver (everything floating independently).

## Frame 1 — Hook

- scene: "prodajamo samo tisto," lands, then "kar sami uporabljamo." slams in with neon green on "sami"
- voiceover: ""
- duration: 4.5s
- poster: 3.8s
- transition_in: cut
- status: animated
- src: compositions/frames/01-hook.html
- type: hook
- persuasion: Negative contrast (most shops sell anything; we sell only what we use)
- beat: curiosity + trust
- blueprint: kinetic-type-beats (Adapt)
- asset_candidates:
- sfx: sub-impact on each line, low riser

narrativeRole: stops the scroll with the one claim that makes Barberologija different.
keyMessage: we sell only what we use ourselves.

Adapt: keep the escalation signature (statement builds across beats onto a payoff word); payoff is a neon glow bloom on "sami" instead of a spring-pop object.
Scene 1 (0.0–0.6s): black field, grid floor fades up, neon haze breathes on at the horizon; viewfinder chrome ticks on.
Scene 2 (0.6–2.0s): "prodajamo samo tisto," rises word by word from a mask, centered upper-third, display size ~80% width.
Scene 3 (2.0–3.4s): line 1 dims to cream-hint and lifts; "kar sami uporabljamo." slams in below at larger weight; "sami" in neon green with glow bloom + quick chromatic flicker.
Scene 4 (3.4–4.5s): held read; only the slow camera push on the floor continues.

## Frame 2 — Proof

- scene: kicker "VSAK DAN · V NAŠIH BRIVNICAH", then three stacked words cascade: preizkušeno. / uporabljeno. / garantirano. — last in neon
- voiceover: ""
- duration: 5.5s
- poster: 4.8s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/02-proof.html
- type: social_proof
- persuasion: Rule of three + risk reversal (garancija)
- beat: confidence
- blueprint: grid-card-assemble (Adapt)
- asset_candidates:
- sfx: tick per word, impact on garantirano

narrativeRole: proves the claim with daily professional use and a guarantee.
keyMessage: tested in our own barbershops, guaranteed.

Adapt: keep the staggered cascade into a vertical list and hold; items are words, not cards; each item gets a neon stub rule to its left.
Scene 1 (0.0–1.0s): mono kicker types on top-left "VSAK DAN · V NAŠIH BRIVNICAH" with neon stub rule; floor grid continues.
Scene 2 (1.0–2.2s): "preizkušeno." slides up from mask, left-aligned, asymmetric 70/30.
Scene 3 (2.2–3.4s): "uporabljeno." slides up below it; the previous word drops to 60% opacity.
Scene 4 (3.4–4.6s): "garantirano." slams in neon green with glow; a thin neon underline draws across.
Scene 5 (4.6–5.5s): held read.

## Frame 3 — Value

- scene: "manjša trgovina." then "večja kakovost." — the contrast lands as a held breather
- voiceover: ""
- duration: 4s
- poster: 3.4s
- transition_in: blur-crossfade
- status: animated
- src: compositions/frames/03-value.html
- type: benefits
- persuasion: Negative contrast (small shop → higher quality)
- beat: peace of mind
- blueprint: titlecard-reveal (Reproduce)
- asset_candidates:
- sfx: soft whoosh

narrativeRole: names the shop's philosophy — curated, not mass-market.
keyMessage: smaller shop, better quality — we stand behind every product.

Scene 1 (0.0–1.4s): "manjša trgovina." slides up + crossfades, centered, cream.
Scene 2 (1.4–2.6s): "večja kakovost." slides up beneath, neon green with glow; mono label below "ZA VSAKIM IZDELKOM STOJIMO".
Scene 3 (2.6–4.0s): still hold.

## Frame 4 — Brand outro

- scene: the neon outline draws on, the white brush letters wipe in, URL lockup below
- voiceover: ""
- duration: 6s
- poster: 5.2s
- transition_in: crossfade
- status: animated
- src: compositions/frames/04-outro.html
- type: brand_outro
- persuasion: Authority by association (the brand mark as signature)
- beat: triumph + trust
- blueprint: logo-assemble-lockup (Adapt)
- asset_candidates: assets/logo-outline.svg — neon green jagged outline of the logo; assets/logo-letters.svg — white brush lettering BARBEROLOGija
- focal: assets/logo-outline.svg
- roles: logo-outline = cutout · logo-letters = cutout
- sfx: electric neon buzz on outline, bass impact on letters

narrativeRole: brand sting and call to action.
keyMessage: barberologija.si — profesionalna brivska oprema.

Adapt: keep "an outline draws on" signature; letters reveal with a left-to-right brush wipe; lockup extends to URL.
Scene 1 (0.0–1.6s): black field, neon outline flickers on like a neon tube (two flicker blinks, then steady glow), centered, ~78% width, upper 60% of frame.
Scene 2 (1.6–2.8s): white letters brush-wipe in left to right; quick scale settle 1.04→1.
Scene 3 (2.8–4.0s): mono "PROFESIONALNA BRIVSKA OPREMA" and the URL "barberologija.si" in neon rise in under the logo.
Scene 4 (4.0–6.0s): held lockup; neon glow subtly hums (tiny opacity jitter).
