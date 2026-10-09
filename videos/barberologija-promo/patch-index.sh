#!/bin/sh
# Post-assembly fixes: dark ground (assembler maps broadside canvas to cream) + local GSAP (CDN blocked here).
cd "$(dirname "$0")"
sed -i 's|<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"[^>]*></script>|<script src="assets/vendor/gsap.min.js"></script>|' index.html
python3 - <<'PY'
import re
s=open('index.html').read()
s=re.sub(r'(#root \{[^}]*?background: )#ffffff;', r'\1#0d0d0d;', s, count=1)
open('index.html','w').write(s)
PY
