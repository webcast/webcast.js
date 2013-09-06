OPTIONS:=-c -j lib/webcast.js src/webcast.coffee src/components/*.coffee

all:
	coffee $(OPTIONS)

watch:
	coffee -w $(OPTIONS)
