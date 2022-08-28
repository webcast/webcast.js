#!/bin/env liquidsoap

set("log.level", 5)
set("frame.video.width", 640)
set("frame.video.height", 360)

s = input.harbor(buffer=2., "mount", port=8000)
s = fallback(track_sensitive=false, [s, video.color(0x0000ff)])

output.graphics(s)
