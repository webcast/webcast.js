.PHONY: all clean

all: lib/webcast.js

SOURCES := src/webcast.coffee $(wildcard src/components/*.coffee)

lib/webcast.js: $(SOURCES)
	cat $^ | coffee --compile --stdio > $@
