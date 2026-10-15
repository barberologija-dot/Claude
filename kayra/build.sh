#!/bin/sh
# Rebuild "Kayra" from source: sh build.sh
set -e
LIB=${LIB:-/root/lemo-opuscar}
HERE=$(cd "$(dirname "$0")" && pwd)
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the Lemo-Opuscar library folder"; exit 1; }
cd "$LIB"
SZ="--size 1080x1920"
node core/render/events.mjs "$HERE" $SZ
"$LIB/.venv/bin/python" "$HERE/mix.py"
node core/render/video.mjs "$HERE" $SZ --fps 24 --workers 4 --out "$HERE/out/video.mp4"
# master: two-pass loudnorm to -14 LUFS / -1.2 dBTP, then mux (done here rather than with core/render/mux.sh,
# whose decoded-length check misfires on ffmpeg 6.1 because loudnorm holds back ~3 s of lookahead)
J=$(ffmpeg -hide_banner -nostats -i "$HERE/out/mix.wav" -af loudnorm=I=-14:TP=-1.2:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$J" | grep "\"$1\"" | sed 's/.*: *"\(.*\)".*/\1/'; }
ffmpeg -v error -y -i "$HERE/out/video.mp4" -i "$HERE/out/mix.wav" \
  -af "loudnorm=I=-14:TP=-1.2:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000" \
  -map 0:v -map 1:a -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -r 24 -c:a aac -b:a 192k -shortest -movflags +faststart "$HERE/kayra.mp4"
ffmpeg -hide_banner -nostats -i "$HERE/kayra.mp4" -af ebur128=peak=true -f null - 2>&1 | grep -E '^ +(I|Peak):' | tr -s ' '
node core/render/still.mjs "$HERE" 14.5 $SZ --out "$HERE/out" --prefix poster_ && cp "$HERE/out/poster_14.5.jpg" "$HERE/poster.jpg"
echo done
